use serde::Serialize;
use tauri::State;
use crate::state::AppState;

/// Rich device info returned to the frontend.
#[derive(Debug, Clone, Serialize)]
pub struct RichDeviceInfo {
    pub serial: String,
    pub model: Option<String>,
    pub manufacturer: Option<String>,
    pub android_version: Option<String>,
    pub sdk_level: Option<u32>,
    pub is_rooted: bool,
    pub has_helper: bool,
}

/// Capability profile returned to the frontend.
#[derive(Debug, Clone, Serialize)]
pub struct CapabilityProfileDto {
    pub has_adb: bool,
    pub has_root: bool,
    pub has_helper_app: bool,
    pub has_proxy: bool,
    pub can_logcat: bool,
    pub can_dumpsys: bool,
    pub can_netstats: bool,
    pub can_tcpdump: bool,
    pub can_vpn_capture: bool,
}

/// List all connected ADB devices with basic enrichment.
#[tauri::command]
pub async fn list_devices(state: State<'_, AppState>) -> Result<Vec<RichDeviceInfo>, String> {
    let adb_path = state.adb_path.lock().unwrap().clone();

    let output = tokio::process::Command::new(&adb_path)
        .args(["devices", "-l"])
        .output()
        .await
        .map_err(|e| format!("adb exec failed: {e}"))?;

    let text = String::from_utf8_lossy(&output.stdout);
    let mut devices: Vec<RichDeviceInfo> = Vec::new();

    for line in text.lines().skip(1) {
        let line = line.trim();
        if line.is_empty() { continue; }

        let mut parts = line.splitn(2, char::is_whitespace);
        let serial = match parts.next() {
            Some(s) => s.trim().to_string(),
            None => continue,
        };
        let rest = parts.next().unwrap_or("").trim();
        let state_str = rest.split_whitespace().next().unwrap_or("unknown");

        if state_str != "device" {
            devices.push(RichDeviceInfo {
                serial,
                model: None,
                manufacturer: None,
                android_version: None,
                sdk_level: None,
                is_rooted: false,
                has_helper: false,
            });
            continue;
        }

        let model = getprop(&adb_path, &serial, "ro.product.model").await;
        let manufacturer = getprop(&adb_path, &serial, "ro.product.manufacturer").await;
        let android_version = getprop(&adb_path, &serial, "ro.build.version.release").await;
        let sdk_level = getprop(&adb_path, &serial, "ro.build.version.sdk")
            .await
            .and_then(|v| v.trim().parse::<u32>().ok());

        devices.push(RichDeviceInfo {
            serial,
            model,
            manufacturer,
            android_version,
            sdk_level,
            is_rooted: false,
            has_helper: false,
        });
    }

    Ok(devices)
}

/// Disconnect a device (session cleanup).
#[tauri::command]
pub async fn disconnect_device(
    serial: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let core = state.core.lock().unwrap();
    let _ = core.stop_session(&serial).await;
    Ok(())
}

/// Return the capability profile for a connected device.
#[tauri::command]
pub async fn get_capabilities(
    serial: String,
    state: State<'_, AppState>,
) -> Result<CapabilityProfileDto, String> {
    let adb_path = state.adb_path.lock().unwrap().clone();
    let adb = phonescope_adb::AdbManager::with_path(&adb_path);
    let shell = adb.shell(&serial);

    let is_rooted = shell.is_rooted().await.unwrap_or(false);

    let can_netstats = shell
        .exec("dumpsys netstats 2>/dev/null | head -1")
        .await
        .map(|o| !o.trim().is_empty())
        .unwrap_or(false);

    let has_helper = shell
        .exec("pm list packages com.phonescope.helper")
        .await
        .map(|o| o.contains("com.phonescope.helper"))
        .unwrap_or(false);

    Ok(CapabilityProfileDto {
        has_adb: true,
        has_root: is_rooted,
        has_helper_app: has_helper,
        has_proxy: false,
        can_logcat: true,
        can_dumpsys: true,
        can_netstats,
        can_tcpdump: false,
        can_vpn_capture: has_helper,
    })
}

/// Run `adb -s SERIAL shell getprop KEY` and return trimmed output or None.
async fn getprop(adb_path: &str, serial: &str, key: &str) -> Option<String> {
    let out = tokio::process::Command::new(adb_path)
        .args(["-s", serial, "shell", "getprop", key])
        .output()
        .await
        .ok()?;
    let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if s.is_empty() { None } else { Some(s) }
}
