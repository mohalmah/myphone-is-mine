use serde::{Deserialize, Serialize};
use tauri::State;
use crate::state::AppState;
use phonescope_storage::models::PackageRow;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageDto {
    pub id: i64,
    pub package_name: String,
    pub app_label: Option<String>,
    pub version_name: Option<String>,
    pub version_code: Option<i64>,
    pub is_system: bool,
    pub is_enabled: bool,
}

impl From<PackageRow> for PackageDto {
    fn from(r: PackageRow) -> Self {
        Self {
            id: r.id,
            package_name: r.package_name,
            app_label: r.app_label,
            version_name: r.version_name,
            version_code: r.version_code,
            is_system: r.is_system,
            is_enabled: r.is_enabled,
        }
    }
}

/// List all packages for the device owning this session.
#[tauri::command]
pub async fn list_packages(
    serial: String,
    state: State<'_, AppState>,
) -> Result<Vec<PackageDto>, String> {
    let adb_path = state.adb_path.lock().unwrap().clone();

    // Run pm list packages -f
    let output = tokio::process::Command::new(&adb_path)
        .args(["-s", &serial, "shell", "pm", "list", "packages", "-f", "-3"])
        .output()
        .await
        .map_err(|e| format!("adb exec failed: {e}"))?;

    // Also fetch system packages
    let sys_output = tokio::process::Command::new(&adb_path)
        .args(["-s", &serial, "shell", "pm", "list", "packages", "-f", "-s"])
        .output()
        .await
        .map_err(|e| format!("adb exec failed: {e}"))?;

    let user_text = String::from_utf8_lossy(&output.stdout);
    let sys_text = String::from_utf8_lossy(&sys_output.stdout);

    let mut packages: Vec<PackageDto> = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for (text, is_system) in [(&user_text, false), (&sys_text, true)] {
        for line in text.lines() {
            let line = line.trim();
            if !line.starts_with("package:") { continue; }
            let rest = line.trim_start_matches("package:");
            if let Some((_, pkg)) = rest.split_once('=') {
                let pkg = pkg.trim().to_string();
                if seen.insert(pkg.clone()) {
                    packages.push(PackageDto {
                        id: 0,
                        package_name: pkg,
                        app_label: None,
                        version_name: None,
                        version_code: None,
                        is_system,
                        is_enabled: true,
                    });
                }
            }
        }
    }

    packages.sort_by(|a, b| a.package_name.cmp(&b.package_name));
    Ok(packages)
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
