use serde::{Deserialize, Serialize};
use tauri::State;
use crate::state::AppState;
use phonescope_adb::AdbManager;
use phonescope_core::{Config, PhoneScope};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub adb_path: Option<String>,
    pub log_retention_days: u32,
    pub battery_retention_days: u32,
    pub network_retention_days: u32,
}

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> AppSettings {
    AppSettings {
        adb_path: Some(state.adb_path.lock().unwrap().clone()),
        log_retention_days: 7,
        battery_retention_days: 30,
        network_retention_days: 30,
    }
}

#[tauri::command]
pub fn get_adb_path(state: State<'_, AppState>) -> Option<String> {
    Some(state.adb_path.lock().unwrap().clone())
}

#[tauri::command]
pub fn set_adb_path(path: String, state: State<'_, AppState>) -> Result<(), String> {
    let ok = std::process::Command::new(&path)
        .arg("version")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false);

    if !ok {
        return Err(format!("'{}' is not a working adb binary", path));
    }

    *state.adb_path.lock().unwrap() = path.clone();
    *state.core.lock().unwrap() = PhoneScope::new(
        Config { adb_path: Some(path.clone()), ..Config::default() },
        Some(AdbManager::with_path(&path)),
    );
    Ok(())
}

#[tauri::command]
pub fn update_settings(settings: serde_json::Value, state: State<'_, AppState>) -> Result<(), String> {
    if let Some(path) = settings.get("adb_path").and_then(|v| v.as_str()) {
        set_adb_path(path.to_string(), state)?;
    }
    Ok(())
}
