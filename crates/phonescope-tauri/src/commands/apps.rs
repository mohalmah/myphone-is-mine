use serde::{Deserialize, Serialize};
use tauri::State;
use crate::state::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageDto {
    pub id: i64,
    pub package_name: String,
    pub app_label: Option<String>,
    pub version_name: Option<String>,
    pub version_code: Option<i64>,
    pub is_system: bool,
    pub is_enabled: bool,
    pub installer: Option<String>,
    pub target_sdk: Option<i64>,
    pub min_sdk: Option<i64>,
    pub apk_size_bytes: Option<i64>,
    pub first_install_time: Option<String>,
    pub last_update_time: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppPermissionDto {
    pub id: i64,
    pub permission: String,
    pub is_granted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageDetailDto {
    #[serde(flatten)]
    pub package: PackageDto,
    pub permissions: Vec<AppPermissionDto>,
    pub data_size_bytes: Option<i64>,
    pub cache_size_bytes: Option<i64>,
    pub code_path: Option<String>,
    pub activities: Vec<String>,
    pub services: Vec<String>,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/// Parse the output of `dumpsys package packages` into a list of PackageDtos.
fn parse_dumpsys_packages(text: &str) -> Vec<PackageDto> {
    let mut packages: Vec<PackageDto> = Vec::new();
    let mut current: Option<PackageDto> = None;
    let mut in_packages_section = false;

    for line in text.lines() {
        let trimmed = line.trim();

        // The packages block starts after "Packages:"
        if trimmed == "Packages:" {
            in_packages_section = true;
            continue;
        }
        // Another top-level section ends the packages block
        if in_packages_section && !line.starts_with(' ') && !line.starts_with('\t') && !line.is_empty() {
            if let Some(pkg) = current.take() {
                packages.push(pkg);
            }
            in_packages_section = false;
            continue;
        }
        if !in_packages_section {
            continue;
        }

        // New package entry: "  Package [com.example.app] (deadbeef):"
        if let Some(rest) = trimmed.strip_prefix("Package [") {
            if let Some(pkg) = current.take() {
                packages.push(pkg);
            }
            if let Some(end) = rest.find(']') {
                let name = rest[..end].to_string();
                current = Some(PackageDto {
                    id: 0,
                    package_name: name,
                    app_label: None,
                    version_name: None,
                    version_code: None,
                    is_system: false,
                    is_enabled: true,
                    installer: None,
                    target_sdk: None,
                    min_sdk: None,
                    apk_size_bytes: None,
                    first_install_time: None,
                    last_update_time: None,
                });
            }
            continue;
        }

        let Some(pkg) = current.as_mut() else { continue };

        if let Some(v) = trimmed.strip_prefix("versionName=") {
            pkg.version_name = Some(v.to_string());
        } else if trimmed.starts_with("versionCode=") {
            // "versionCode=123 minSdk=21 targetSdk=33"
            for part in trimmed.split_whitespace() {
                if let Some(v) = part.strip_prefix("versionCode=") {
                    pkg.version_code = v.split_once(' ').map(|(n,_)| n).unwrap_or(v).parse().ok();
                } else if let Some(v) = part.strip_prefix("minSdk=") {
                    pkg.min_sdk = v.split_once(' ').map(|(n,_)| n).unwrap_or(v).parse().ok();
                } else if let Some(v) = part.strip_prefix("targetSdk=") {
                    pkg.target_sdk = v.split_once(' ').map(|(n,_)| n).unwrap_or(v).parse().ok();
                }
            }
        } else if let Some(v) = trimmed.strip_prefix("installerPackageName=") {
            pkg.installer = Some(v.to_string());
        } else if let Some(rest) = trimmed.strip_prefix("pkgFlags=") {
            // "pkgFlags=[ SYSTEM PRIVILEGED ]" or "pkgFlags=[ FULL_DATA ]"
            pkg.is_system = rest.contains("SYSTEM") || rest.contains("PRIVILEGED");
        } else if trimmed.starts_with("User 0: ") {
            // "User 0: ceDataInode=... installed=true hidden=false stopped=false ..."
            let installed = trimmed.contains("installed=true");
            let hidden = trimmed.contains("hidden=true");
            let stopped = trimmed.contains("stopped=true");
            pkg.is_enabled = installed && !hidden && !stopped;
        } else if let Some(v) = trimmed.strip_prefix("firstInstallTime=") {
            pkg.first_install_time = Some(v.to_string());
        } else if let Some(v) = trimmed.strip_prefix("lastUpdateTime=") {
            pkg.last_update_time = Some(v.to_string());
        }
    }

    if let Some(pkg) = current.take() {
        packages.push(pkg);
    }

    packages.sort_by(|a, b| a.package_name.cmp(&b.package_name));
    packages
}

/// Parse permissions from `pm dump <pkg>` output.
fn parse_pm_dump_permissions(text: &str) -> Vec<AppPermissionDto> {
    let mut perms: Vec<AppPermissionDto> = Vec::new();
    let mut in_install_permissions = false;
    let mut in_runtime_permissions = false;
    let mut perm_id = 0i64;

    for line in text.lines() {
        let trimmed = line.trim();

        if trimmed.starts_with("install permissions:") {
            in_install_permissions = true;
            in_runtime_permissions = false;
            continue;
        }
        if trimmed.starts_with("runtime permissions:") {
            in_install_permissions = false;
            in_runtime_permissions = true;
            continue;
        }
        // Leave permission sections when we hit another top-level key
        if (in_install_permissions || in_runtime_permissions)
            && !line.starts_with("      ")
            && !line.starts_with("    ")
            && !trimmed.is_empty()
        {
            in_install_permissions = false;
            in_runtime_permissions = false;
        }

        if in_install_permissions {
            // "      android.permission.INTERNET: granted=true"
            if let Some((perm, rest)) = trimmed.split_once(':') {
                let is_granted = rest.contains("granted=true");
                perm_id += 1;
                perms.push(AppPermissionDto {
                    id: perm_id,
                    permission: perm.trim().to_string(),
                    is_granted,
                });
            }
        } else if in_runtime_permissions {
            // "      android.permission.READ_CONTACTS: granted=true, flags=[ USER_SET]"
            if let Some((perm, rest)) = trimmed.split_once(':') {
                let is_granted = rest.contains("granted=true");
                perm_id += 1;
                perms.push(AppPermissionDto {
                    id: perm_id,
                    permission: perm.trim().to_string(),
                    is_granted,
                });
            }
        }
    }

    perms.dedup_by_key(|p| p.permission.clone());
    perms
}

/// Parse component names from pm dump (activities / services).
fn parse_pm_dump_components(text: &str, section_prefix: &str) -> Vec<String> {
    let mut components = Vec::new();
    let mut in_section = false;

    for line in text.lines() {
        let trimmed = line.trim();
        // Section header (unindented line with section name)
        if !line.starts_with(' ') && !line.starts_with('\t') && trimmed.starts_with(section_prefix) {
            in_section = true;
            continue;
        }
        // Another unindented non-empty line ends the section
        if in_section && !line.starts_with(' ') && !line.starts_with('\t') && !line.is_empty() {
            in_section = false;
            continue;
        }
        if !in_section { continue; }

        // Component line: "      <pkg>/<component> filter <hex>" or "    <pkg>/<component>"
        if let Some(name) = trimmed.split_whitespace().next() {
            if name.contains('/') && !name.starts_with('#') {
                components.push(name.to_string());
            }
        }
    }

    components
}

// ─── Commands ─────────────────────────────────────────────────────────────────

/// List all installed packages with enriched metadata from dumpsys.
#[tauri::command]
pub async fn list_packages(
    serial: String,
    state: State<'_, AppState>,
) -> Result<Vec<PackageDto>, String> {
    let adb_path = state.adb_path.lock().unwrap().clone();

    let output = tokio::process::Command::new(&adb_path)
        .args(["-s", &serial, "shell", "dumpsys", "package", "packages"])
        .output()
        .await
        .map_err(|e| format!("adb exec failed: {e}"))?;

    let text = String::from_utf8_lossy(&output.stdout);
    Ok(parse_dumpsys_packages(&text))
}

/// Get detailed info for a single package including permissions, sizes, and components.
#[tauri::command]
pub async fn get_package_detail(
    serial: String,
    package_name: String,
    state: State<'_, AppState>,
) -> Result<PackageDetailDto, String> {
    let adb_path = state.adb_path.lock().unwrap().clone();

    // Run pm dump for full package info + permissions
    let dump_out = tokio::process::Command::new(&adb_path)
        .args(["-s", &serial, "shell", "pm", "dump", &package_name])
        .output()
        .await
        .map_err(|e| format!("pm dump failed: {e}"))?;
    let dump_text = String::from_utf8_lossy(&dump_out.stdout);

    // Also get dumpsys package <pkg> for version/sdk info
    let dumpsys_out = tokio::process::Command::new(&adb_path)
        .args(["-s", &serial, "shell", "dumpsys", "package", &package_name])
        .output()
        .await
        .map_err(|e| format!("dumpsys package failed: {e}"))?;
    let dumpsys_text = String::from_utf8_lossy(&dumpsys_out.stdout);

    // Parse base package info from dumpsys package output (already has "Packages:" header)
    let pkgs = parse_dumpsys_packages(&dumpsys_text);
    let mut pkg = pkgs.into_iter()
        .find(|p| p.package_name == package_name)
        .unwrap_or_else(|| PackageDto {
            id: 0,
            package_name: package_name.clone(),
            app_label: None,
            version_name: None,
            version_code: None,
            is_system: false,
            is_enabled: true,
            installer: None,
            target_sdk: None,
            min_sdk: None,
            apk_size_bytes: None,
            first_install_time: None,
            last_update_time: None,
        });

    // Get APK code path from dumpsys_text
    let mut code_path: Option<String> = None;
    for line in dumpsys_text.lines() {
        let t = line.trim();
        if let Some(v) = t.strip_prefix("codePath=") {
            code_path = Some(v.to_string());
            break;
        }
    }

    // Get APK size via du -sk <codePath>
    if let Some(ref path) = code_path {
        let du_out = tokio::process::Command::new(&adb_path)
            .args(["-s", &serial, "shell", "du", "-sk", path])
            .output()
            .await;
        if let Ok(out) = du_out {
            let du_text = String::from_utf8_lossy(&out.stdout);
            if let Some(kb_str) = du_text.split_whitespace().next() {
                if let Ok(kb) = kb_str.parse::<i64>() {
                    pkg.apk_size_bytes = Some(kb * 1024);
                }
            }
        }
    }

    // Parse permissions
    let permissions = parse_pm_dump_permissions(&dump_text);

    // Parse activities and services
    let activities = parse_pm_dump_components(&dump_text, "Activity Resolver Table");
    let services = parse_pm_dump_components(&dump_text, "Service Resolver Table");

    // Parse data/cache sizes from dumpsys diskstats if available
    let (data_size_bytes, cache_size_bytes) = parse_diskstats_for_package(
        &adb_path, &serial, &package_name,
    ).await;

    Ok(PackageDetailDto {
        package: pkg,
        permissions,
        data_size_bytes,
        cache_size_bytes,
        code_path,
        activities,
        services,
    })
}

/// Try to get data/cache sizes from dumpsys diskstats (works on Android 8+).
async fn parse_diskstats_for_package(
    adb_path: &str,
    serial: &str,
    package_name: &str,
) -> (Option<i64>, Option<i64>) {
    let out = tokio::process::Command::new(adb_path)
        .args(["-s", serial, "shell", "dumpsys", "diskstats"])
        .output()
        .await;
    let Ok(out) = out else { return (None, None) };
    let text = String::from_utf8_lossy(&out.stdout);

    // Diskstats format (App N): "App N: PKG data=X cache=Y code=Z"
    for line in text.lines() {
        if line.contains(package_name) {
            let mut data = None;
            let mut cache = None;
            for part in line.split_whitespace() {
                if let Some(v) = part.strip_prefix("data=") {
                    data = v.trim_end_matches(',').parse::<i64>().ok();
                } else if let Some(v) = part.strip_prefix("cache=") {
                    cache = v.trim_end_matches(',').parse::<i64>().ok();
                }
            }
            if data.is_some() || cache.is_some() {
                return (data, cache);
            }
        }
    }
    (None, None)
}

/// Force-stop an app on the device.
#[tauri::command]
pub async fn force_stop(
    serial: String,
    package_name: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let adb_path = state.adb_path.lock().unwrap().clone();
    tokio::process::Command::new(&adb_path)
        .args(["-s", &serial, "shell", "am", "force-stop", &package_name])
        .output()
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Clear app data on the device.
#[tauri::command]
pub async fn clear_data(
    serial: String,
    package_name: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let adb_path = state.adb_path.lock().unwrap().clone();
    let out = tokio::process::Command::new(&adb_path)
        .args(["-s", &serial, "shell", "pm", "clear", &package_name])
        .output()
        .await
        .map_err(|e| e.to_string())?;
    let text = String::from_utf8_lossy(&out.stdout);
    if text.contains("Success") {
        Ok(())
    } else {
        Err(format!("clear failed: {text}"))
    }
}

/// Disable an app on the device (requires sufficient permissions).
#[tauri::command]
pub async fn disable_app(
    serial: String,
    package_name: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let adb_path = state.adb_path.lock().unwrap().clone();
    tokio::process::Command::new(&adb_path)
        .args(["-s", &serial, "shell", "pm", "disable-user", "--user", "0", &package_name])
        .output()
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Uninstall an app from the device.
#[tauri::command]
pub async fn uninstall_app(
    serial: String,
    package_name: String,
    keep_data: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let adb_path = state.adb_path.lock().unwrap().clone();
    let mut args = vec!["-s", &serial, "uninstall"];
    if keep_data { args.push("-k"); }
    let pkg_ref: &str = &package_name;
    args.push(pkg_ref);
    let out = tokio::process::Command::new(&adb_path)
        .args(&args)
        .output()
        .await
        .map_err(|e| e.to_string())?;
    let text = String::from_utf8_lossy(&out.stdout);
    if text.contains("Success") {
        Ok(())
    } else {
        Err(format!("uninstall failed: {text}"))
    }
}

/// Revoke a runtime permission from an app.
#[tauri::command]
pub async fn revoke_permission(
    serial: String,
    package_name: String,
    permission: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let adb_path = state.adb_path.lock().unwrap().clone();
    let out = tokio::process::Command::new(&adb_path)
        .args(["-s", &serial, "shell", "pm", "revoke", &package_name, &permission])
        .output()
        .await
        .map_err(|e| e.to_string())?;
    let text = String::from_utf8_lossy(&out.stderr);
    if text.contains("Exception") || text.contains("Error") {
        Err(format!("revoke failed: {text}"))
    } else {
        Ok(())
    }
}

/// Grant a runtime permission to an app.
#[tauri::command]
pub async fn grant_permission(
    serial: String,
    package_name: String,
    permission: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let adb_path = state.adb_path.lock().unwrap().clone();
    let out = tokio::process::Command::new(&adb_path)
        .args(["-s", &serial, "shell", "pm", "grant", &package_name, &permission])
        .output()
        .await
        .map_err(|e| e.to_string())?;
    let text = String::from_utf8_lossy(&out.stderr);
    if text.contains("Exception") || text.contains("Error") {
        Err(format!("grant failed: {text}"))
    } else {
        Ok(())
    }
}
