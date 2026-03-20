//! PackageCollector — queries installed packages via `pm list packages` and
//! optionally enriches them with `dumpsys package <pkg>` details.

use async_trait::async_trait;
use phonescope_events::{Confidence, DeviceEvent, EventMeta, EventSource, PackageEvent, PackageEventType};
use tracing::{debug, warn};

use crate::{
    traits::{CapabilitySet, Collector, CollectorContext},
    Result,
};

/// Collects installed package information from the device using ADB shell commands.
///
/// Phase 1 — `pm list packages -f`:
/// Lists all installed packages with their APK paths.
///
/// Phase 2 (optional enrichment) — `dumpsys package <pkg>`:
/// Extracts version name/code, SDK levels, permissions, and installer.
pub struct PackageCollector {
    /// When true, run `dumpsys package` for each package to gather extra detail.
    pub enrich: bool,
}

impl PackageCollector {
    /// Create a new collector that only reads basic package list data.
    pub fn basic() -> Self {
        Self { enrich: false }
    }

    /// Create a new collector that also enriches packages with `dumpsys package`.
    pub fn with_enrichment() -> Self {
        Self { enrich: true }
    }
}

#[async_trait]
impl Collector for PackageCollector {
    fn name(&self) -> &str {
        "packages"
    }

    fn required_capabilities(&self) -> CapabilitySet {
        CapabilitySet::new()
    }

    /// Run a full package scan. Each installed package becomes a `PackageEvent`.
    async fn collect_once(&self, ctx: &CollectorContext) -> Result<Vec<DeviceEvent>> {
        debug!(collector = "packages", session_id = ctx.session_id, "starting package scan");

        // --- Step 1: list packages ---
        let pm_output = ctx
            .shell
            .exec("pm list packages -f")
            .await
            .map_err(|e| crate::Error::Adb(e.to_string()))?;

        let mut entries = parse_pm_list_packages(&pm_output);
        debug!(collector = "packages", count = entries.len(), "pm list packages parsed");

        // --- Step 2 (optional): enrich from dumpsys ---
        if self.enrich {
            for entry in &mut entries {
                match ctx.shell.exec(&format!("dumpsys package {}", entry.package_name)).await {
                    Ok(ds_output) => enrich_from_dumpsys(entry, &ds_output),
                    Err(e) => {
                        warn!(collector = "packages", pkg = %entry.package_name, error = %e, "dumpsys failed");
                    }
                }
            }
        }

        let session_id = ctx.session_id;
        let events: Vec<DeviceEvent> = entries
            .into_iter()
            .map(|entry| {
                DeviceEvent::Package(PackageEvent {
                    meta: EventMeta {
                        session_id,
                        timestamp: chrono::Utc::now(),
                        source: EventSource::Adb,
                    },
                    event_type: PackageEventType::Installed,
                    package_name: entry.package_name,
                    app_label: entry.app_label,
                    version_name: entry.version_name,
                    version_code: entry.version_code,
                    is_system: entry.is_system,
                    is_enabled: true,
                    apk_path: entry.apk_path,
                    installer: entry.installer,
                    target_sdk: entry.target_sdk,
                    min_sdk: entry.min_sdk,
                    permissions: entry.permissions,
                    confidence: if entry.enriched {
                        Confidence::Exact
                    } else {
                        Confidence::Approximate
                    },
                })
            })
            .collect();

        Ok(events)
    }

    fn default_interval_ms(&self) -> u64 {
        // Re-scan packages every 30 seconds.
        30_000
    }
}

// ---------------------------------------------------------------------------
// Intermediate struct used during parsing
// ---------------------------------------------------------------------------

#[derive(Debug, Default)]
pub(crate) struct PackageEntry {
    pub package_name: String,
    pub apk_path: Option<String>,
    pub is_system: bool,
    pub app_label: Option<String>,
    pub version_name: Option<String>,
    pub version_code: Option<i64>,
    pub installer: Option<String>,
    pub target_sdk: Option<i32>,
    pub min_sdk: Option<i32>,
    pub permissions: Vec<String>,
    pub enriched: bool,
}

// ---------------------------------------------------------------------------
// pm list packages -f parser
// ---------------------------------------------------------------------------

/// Parse the output of `adb shell pm list packages -f`.
///
/// Each line has the form:
/// ```text
/// package:/data/app/~~XYZ/com.example.app-1/base.apk=com.example.app
/// ```
/// System packages typically have paths under `/system/`.
pub fn parse_pm_list_packages(output: &str) -> Vec<PackageEntry> {
    output
        .lines()
        .filter_map(|line| {
            let line = line.trim();
            if !line.starts_with("package:") {
                return None;
            }
            let rest = &line["package:".len()..];
            // Split on the last '=' to separate apk_path from package_name.
            let eq_pos = rest.rfind('=')?;
            let apk_path = rest[..eq_pos].trim().to_string();
            let package_name = rest[eq_pos + 1..].trim().to_string();

            if package_name.is_empty() {
                return None;
            }

            let is_system = apk_path.starts_with("/system/")
                || apk_path.starts_with("/vendor/")
                || apk_path.starts_with("/product/")
                || apk_path.starts_with("/apex/");

            Some(PackageEntry {
                package_name,
                apk_path: Some(apk_path),
                is_system,
                ..Default::default()
            })
        })
        .collect()
}

// ---------------------------------------------------------------------------
// dumpsys package <pkg> enrichment parser
// ---------------------------------------------------------------------------

/// Enrich a `PackageEntry` with fields parsed from `dumpsys package <pkg>` output.
///
/// The dumpsys output is semi-structured text. We parse line-by-line looking for
/// known field patterns. Missing fields are left as `None`.
pub fn enrich_from_dumpsys(entry: &mut PackageEntry, dumpsys: &str) {
    let mut in_requested_permissions = false;
    let mut in_install_permissions = false;

    for line in dumpsys.lines() {
        let trimmed = line.trim();

        // Version info: "versionName=1.2.3"
        if let Some(val) = extract_field(trimmed, "versionName=") {
            entry.version_name = Some(val.to_string());
        }
        // Version code: "versionCode=123 "
        if let Some(val) = extract_field(trimmed, "versionCode=") {
            // versionCode may be followed by a space and more text
            let code_str = val.split_whitespace().next().unwrap_or(val);
            entry.version_code = code_str.parse().ok();
        }
        // Target SDK: "targetSdk=34"
        if let Some(val) = extract_field(trimmed, "targetSdk=") {
            entry.target_sdk = val.split_whitespace().next().unwrap_or(val).parse().ok();
        }
        // Min SDK: "minSdk=26"
        if let Some(val) = extract_field(trimmed, "minSdk=") {
            entry.min_sdk = val.split_whitespace().next().unwrap_or(val).parse().ok();
        }
        // Installer: "installerPackageName=com.android.vending"
        if let Some(val) = extract_field(trimmed, "installerPackageName=") {
            if val != "null" && !val.is_empty() {
                entry.installer = Some(val.to_string());
            }
        }
        // Application label: "applicationInfo=ApplicationInfo{...} com.example.app"
        // or "label=MyApp"
        if let Some(val) = extract_field(trimmed, "label=") {
            entry.app_label = Some(val.to_string());
        }

        // Permission sections
        if trimmed == "requested permissions:" {
            in_requested_permissions = true;
            in_install_permissions = false;
            continue;
        }
        if trimmed == "install permissions:" || trimmed == "runtime permissions:" {
            in_install_permissions = true;
            in_requested_permissions = false;
            continue;
        }
        // End of a permissions section (next top-level field)
        if !trimmed.starts_with("android.") && !trimmed.starts_with("com.") && !trimmed.is_empty()
            && (in_requested_permissions || in_install_permissions)
        {
            in_requested_permissions = false;
            in_install_permissions = false;
        }

        if in_requested_permissions && trimmed.starts_with("android.permission.") {
            let perm = trimmed.split(':').next().unwrap_or(trimmed).trim();
            if !perm.is_empty() && !entry.permissions.contains(&perm.to_string()) {
                entry.permissions.push(perm.to_string());
            }
        }
    }

    entry.enriched = true;
}

/// Extract the value after `key` in `line`, if `line` starts with (or contains) `key`.
fn extract_field<'a>(line: &'a str, key: &str) -> Option<&'a str> {
    // Find key anywhere in the trimmed line (handles indented lines like "  versionName=...")
    let pos = line.find(key)?;
    let val = &line[pos + key.len()..];
    // Trim trailing whitespace and any surrounding quotes.
    let val = val.trim().trim_matches('"');
    if val.is_empty() {
        None
    } else {
        Some(val)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const BASIC_PM_OUTPUT: &str = "\
package:/data/app/~~abc/com.example.myapp-1/base.apk=com.example.myapp\n\
package:/system/framework/framework-res.apk=android\n\
package:/data/app/~~def/com.google.android.gms-2/base.apk=com.google.android.gms\n\
package:/vendor/app/SomeVendorApp/SomeVendorApp.apk=com.vendor.someapp\n\
";

    #[test]
    fn parse_pm_basic_count() {
        let entries = parse_pm_list_packages(BASIC_PM_OUTPUT);
        assert_eq!(entries.len(), 4);
    }

    #[test]
    fn parse_pm_user_app() {
        let entries = parse_pm_list_packages(BASIC_PM_OUTPUT);
        let app = entries.iter().find(|e| e.package_name == "com.example.myapp").unwrap();
        assert!(!app.is_system);
        assert_eq!(app.apk_path.as_deref(), Some("/data/app/~~abc/com.example.myapp-1/base.apk"));
    }

    #[test]
    fn parse_pm_system_app() {
        let entries = parse_pm_list_packages(BASIC_PM_OUTPUT);
        let app = entries.iter().find(|e| e.package_name == "android").unwrap();
        assert!(app.is_system);
    }

    #[test]
    fn parse_pm_vendor_app_is_system() {
        let entries = parse_pm_list_packages(BASIC_PM_OUTPUT);
        let app = entries.iter().find(|e| e.package_name == "com.vendor.someapp").unwrap();
        assert!(app.is_system);
    }

    #[test]
    fn parse_pm_ignores_non_package_lines() {
        let output = "WARNING: linker: something\npackage:/data/app/com.test-1/base.apk=com.test\n";
        let entries = parse_pm_list_packages(output);
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].package_name, "com.test");
    }

    const DUMPSYS_OUTPUT: &str = r#"
  Packages:
    Package [com.example.myapp] (deadbeef):
      userId=10123
      pkg=Package{1234 com.example.myapp}
      codePath=/data/app/~~abc/com.example.myapp-1
      resourcePath=/data/app/~~abc/com.example.myapp-1
      legacyNativeLibraryDir=/data/app/~~abc/com.example.myapp-1/lib
      primaryCpuAbi=arm64-v8a
      versionCode=42 minSdk=26 targetSdk=34
      versionName=2.1.0
      label=My Example App
      installerPackageName=com.android.vending
    requested permissions:
      android.permission.INTERNET
      android.permission.ACCESS_NETWORK_STATE
      android.permission.CAMERA
"#;

    #[test]
    fn enrich_version_name() {
        let mut entry = PackageEntry {
            package_name: "com.example.myapp".to_string(),
            ..Default::default()
        };
        enrich_from_dumpsys(&mut entry, DUMPSYS_OUTPUT);
        assert_eq!(entry.version_name.as_deref(), Some("2.1.0"));
    }

    #[test]
    fn enrich_version_code() {
        let mut entry = PackageEntry { package_name: "com.example.myapp".to_string(), ..Default::default() };
        enrich_from_dumpsys(&mut entry, DUMPSYS_OUTPUT);
        assert_eq!(entry.version_code, Some(42));
    }

    #[test]
    fn enrich_sdk_levels() {
        let mut entry = PackageEntry { package_name: "com.example.myapp".to_string(), ..Default::default() };
        enrich_from_dumpsys(&mut entry, DUMPSYS_OUTPUT);
        assert_eq!(entry.min_sdk, Some(26));
        assert_eq!(entry.target_sdk, Some(34));
    }

    #[test]
    fn enrich_installer() {
        let mut entry = PackageEntry { package_name: "com.example.myapp".to_string(), ..Default::default() };
        enrich_from_dumpsys(&mut entry, DUMPSYS_OUTPUT);
        assert_eq!(entry.installer.as_deref(), Some("com.android.vending"));
    }

    #[test]
    fn enrich_label() {
        let mut entry = PackageEntry { package_name: "com.example.myapp".to_string(), ..Default::default() };
        enrich_from_dumpsys(&mut entry, DUMPSYS_OUTPUT);
        assert_eq!(entry.app_label.as_deref(), Some("My Example App"));
    }

    #[test]
    fn enrich_permissions() {
        let mut entry = PackageEntry { package_name: "com.example.myapp".to_string(), ..Default::default() };
        enrich_from_dumpsys(&mut entry, DUMPSYS_OUTPUT);
        assert!(entry.permissions.contains(&"android.permission.INTERNET".to_string()));
        assert!(entry.permissions.contains(&"android.permission.CAMERA".to_string()));
    }

    #[test]
    fn enrich_marks_enriched() {
        let mut entry = PackageEntry { package_name: "com.test".to_string(), ..Default::default() };
        enrich_from_dumpsys(&mut entry, DUMPSYS_OUTPUT);
        assert!(entry.enriched);
    }
}
