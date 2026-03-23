//! Application state shared across Tauri commands.
use phonescope_adb::AdbManager;
use phonescope_core::{Config, PhoneScope};
use phonescope_storage::Database;
use std::sync::Mutex;
use tracing::{info, warn};

/// Global application state managed by Tauri.
///
/// `core` uses `tokio::sync::Mutex` because its methods are async.
/// Other fields use `std::sync::Mutex` (sync access only).
pub struct AppState {
    /// Resolved path to the adb binary.
    pub adb_path: Mutex<String>,
    /// Core orchestrator (sessions, event bus, capability detection).
    pub core: tokio::sync::Mutex<PhoneScope>,
    /// SQLite database handle.
    pub db: Mutex<Database>,
    /// Active logcat streaming tasks keyed by device serial.
    pub logcat_tasks: Mutex<std::collections::HashMap<String, tokio::task::AbortHandle>>,
}

impl AppState {
    /// Initialise application state.
    pub fn new() -> Self {
        let adb_path = detect_adb_sync().unwrap_or_else(|| "adb".to_string());
        info!(adb_path = %adb_path, "ADB detected");

        let mut cfg = Config::default();
        cfg.adb_path = Some(adb_path.clone());

        let core = PhoneScope::new(cfg, Some(AdbManager::with_path(&adb_path)));
        let db = Database::open_in_memory().expect("failed to open in-memory DB");

        Self {
            adb_path: Mutex::new(adb_path),
            core: tokio::sync::Mutex::new(core),
            db: Mutex::new(db),
            logcat_tasks: Mutex::new(std::collections::HashMap::new()),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

/// Probe candidate paths synchronously and return the first working `adb` binary.
fn detect_adb_sync() -> Option<String> {
    let mut candidates = vec!["adb".to_string()];

    for env_var in &["ANDROID_HOME", "ANDROID_SDK_ROOT"] {
        if let Ok(root) = std::env::var(env_var) {
            #[cfg(windows)]
            candidates.push(format!("{root}\\platform-tools\\adb.exe"));
            #[cfg(not(windows))]
            candidates.push(format!("{root}/platform-tools/adb"));
        }
    }

    #[cfg(windows)]
    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        candidates.push(format!("{local}\\Android\\Sdk\\platform-tools\\adb.exe"));
    }

    #[cfg(not(windows))]
    if let Ok(home) = std::env::var("HOME") {
        candidates.push(format!("{home}/Library/Android/sdk/platform-tools/adb"));
        candidates.push(format!("{home}/Android/Sdk/platform-tools/adb"));
    }

    for path in candidates {
        let ok = std::process::Command::new(&path)
            .arg("version")
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false);
        if ok {
            return Some(path);
        }
    }

    warn!("ADB not found in PATH or common locations");
    None
}
