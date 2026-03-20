use std::path::Path;

use crate::{AdbShell, Result};

/// File transfer operations for an ADB device.
impl AdbShell {
    /// Push a local file to the device.
    ///
    /// Runs: `adb -s <serial> push <local_path> <device_path>`
    pub async fn push_file(
        &self,
        local_path: &Path,
        device_path: &str,
    ) -> Result<()> {
        let local_str = local_path
            .to_str()
            .ok_or_else(|| crate::Error::InvalidPath(local_path.display().to_string()))?;
        self.exec_adb(&["push", local_str, device_path]).await?;
        Ok(())
    }

    /// Pull a file from the device to a local path.
    ///
    /// Runs: `adb -s <serial> pull <device_path> <local_path>`
    pub async fn pull_file(
        &self,
        device_path: &str,
        local_path: &Path,
    ) -> Result<()> {
        let local_str = local_path
            .to_str()
            .ok_or_else(|| crate::Error::InvalidPath(local_path.display().to_string()))?;
        self.exec_adb(&["pull", device_path, local_str]).await?;
        Ok(())
    }
}
