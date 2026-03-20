//! `phonescope-adb` — ADB device manager for PhoneScope.
//!
//! Provides device listing, shell execution, logcat streaming,
//! port forwarding, and file operations over ADB.

pub mod device;
pub mod file_ops;
pub mod port_forward;
pub mod shell;

pub use device::{DeviceInfo, DeviceState};
pub use shell::{parse_logcat_line, AdbShell};

use std::path::PathBuf;
use thiserror::Error;
use tokio::process::Command;

/// Crate-level error type.
#[derive(Debug, Error)]
pub enum Error {
    #[error("ADB not found — checked PATH and common install locations")]
    AdbNotFound,

    #[error("Failed to spawn process: {0}")]
    SpawnFailed(String),

    #[error("ADB command failed (cmd={cmd}): {stderr}")]
    CommandFailed { cmd: String, stderr: String },

    #[error("Failed to parse ADB output: {0}")]
    ParseError(String),

    #[error("Invalid path: {0}")]
    InvalidPath(String),

    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
}

/// Crate-level result alias.
pub type Result<T> = std::result::Result<T, Error>;

/// Manages ADB connectivity and device discovery.
#[derive(Debug, Clone)]
pub struct AdbManager {
    /// Resolved path to the `adb` binary.
    pub adb_path: String,
}

impl AdbManager {
    /// Auto-detect `adb` on the system PATH and common install locations,
    /// then return a new `AdbManager`.
    pub async fn new() -> Result<Self> {
        let path = Self::detect_adb().await?;
        Ok(Self { adb_path: path })
    }

    /// Create an `AdbManager` with an explicit adb binary path.
    pub fn with_path(path: impl Into<String>) -> Self {
        Self {
            adb_path: path.into(),
        }
    }

    /// Return an `AdbShell` for the given device serial.
    pub fn shell(&self, serial: &str) -> AdbShell {
        AdbShell::new(self.adb_path.clone(), serial)
    }

    /// List all connected ADB devices.
    ///
    /// Runs `adb devices -l` and parses the output.
    pub async fn list_devices(&self) -> Result<Vec<DeviceInfo>> {
        let output = Command::new(&self.adb_path)
            .args(["devices", "-l"])
            .output()
            .await
            .map_err(|e| Error::SpawnFailed(e.to_string()))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let devices = Self::parse_devices_output(&stdout);
        Ok(devices)
    }

    /// Parse `adb devices -l` output into a list of `DeviceInfo`.
    pub fn parse_devices_output(output: &str) -> Vec<DeviceInfo> {
        output
            .lines()
            .filter_map(DeviceInfo::parse_devices_line)
            .collect()
    }

    /// Attempt to find the `adb` binary.
    /// Checks `ANDROID_HOME`, `ANDROID_SDK_ROOT`, and PATH.
    async fn detect_adb() -> Result<String> {
        // 1. Try plain `adb` on PATH first.
        if Self::probe_adb("adb").await {
            return Ok("adb".to_string());
        }

        // 2. Try common SDK locations.
        let candidates = Self::candidate_paths();
        for path in &candidates {
            let path_str = path.to_string_lossy().into_owned();
            if Self::probe_adb(&path_str).await {
                return Ok(path_str);
            }
        }

        Err(Error::AdbNotFound)
    }

    /// Return candidate adb binary paths from environment variables.
    fn candidate_paths() -> Vec<PathBuf> {
        let mut paths = Vec::new();

        for env_var in &["ANDROID_HOME", "ANDROID_SDK_ROOT"] {
            if let Ok(root) = std::env::var(env_var) {
                let root = PathBuf::from(root);
                paths.push(root.join("platform-tools").join("adb"));
                #[cfg(windows)]
                paths.push(root.join("platform-tools").join("adb.exe"));
            }
        }

        // Common default locations
        #[cfg(target_os = "macos")]
        {
            if let Ok(home) = std::env::var("HOME") {
                paths.push(PathBuf::from(home).join("Library/Android/sdk/platform-tools/adb"));
            }
        }
        #[cfg(target_os = "linux")]
        {
            if let Ok(home) = std::env::var("HOME") {
                paths.push(PathBuf::from(home).join("Android/Sdk/platform-tools/adb"));
            }
        }
        #[cfg(windows)]
        {
            if let Ok(local) = std::env::var("LOCALAPPDATA") {
                paths.push(
                    PathBuf::from(local)
                        .join("Android/Sdk/platform-tools/adb.exe"),
                );
            }
        }

        paths
    }

    /// Run `adb version` to check if the given path is a working adb binary.
    async fn probe_adb(path: &str) -> bool {
        Command::new(path)
            .arg("version")
            .output()
            .await
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_devices_output_empty() {
        let output = "List of devices attached\n\n";
        let devices = AdbManager::parse_devices_output(output);
        assert!(devices.is_empty());
    }

    #[test]
    fn test_parse_devices_output_one_device() {
        let output = "List of devices attached\nemulator-5554          device product:sdk model:Pixel_7 device:generic transport_id:1\n";
        let devices = AdbManager::parse_devices_output(output);
        assert_eq!(devices.len(), 1);
        assert_eq!(devices[0].serial, "emulator-5554");
        assert_eq!(devices[0].state, DeviceState::Device);
    }

    #[test]
    fn test_parse_devices_output_multiple() {
        let output = concat!(
            "List of devices attached\n",
            "emulator-5554          device product:sdk model:Pixel_7 device:generic\n",
            "ABCD1234               offline\n",
            "XY9876                 unauthorized\n",
        );
        let devices = AdbManager::parse_devices_output(output);
        assert_eq!(devices.len(), 3);
        assert_eq!(devices[1].state, DeviceState::Offline);
        assert_eq!(devices[2].state, DeviceState::Unauthorized);
    }

    #[test]
    fn test_adb_manager_with_path() {
        let mgr = AdbManager::with_path("/usr/bin/adb");
        assert_eq!(mgr.adb_path, "/usr/bin/adb");
    }

    #[test]
    fn test_shell_returns_correct_serial() {
        let mgr = AdbManager::with_path("adb");
        let shell = mgr.shell("emulator-5554");
        assert_eq!(shell.serial, "emulator-5554");
    }
}
