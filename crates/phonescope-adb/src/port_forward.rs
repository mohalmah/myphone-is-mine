use crate::{AdbShell, Result};

/// Port forwarding operations for an ADB device.
impl AdbShell {
    /// Forward a local TCP port to a remote TCP port on the device.
    ///
    /// Runs: `adb -s <serial> forward tcp:<local_port> tcp:<device_port>`
    pub async fn forward_port(&self, local_port: u16, device_port: u16) -> Result<()> {
        self.exec_adb(&[
            "forward",
            &format!("tcp:{}", local_port),
            &format!("tcp:{}", device_port),
        ])
        .await?;
        Ok(())
    }

    /// Remove a specific local port forward.
    ///
    /// Runs: `adb -s <serial> forward --remove tcp:<local_port>`
    pub async fn remove_forward(&self, local_port: u16) -> Result<()> {
        self.exec_adb(&["forward", "--remove", &format!("tcp:{}", local_port)])
            .await?;
        Ok(())
    }

    /// Remove all port forwards for this device.
    ///
    /// Runs: `adb -s <serial> forward --remove-all`
    pub async fn remove_all_forwards(&self) -> Result<()> {
        self.exec_adb(&["forward", "--remove-all"]).await?;
        Ok(())
    }

    /// Set up a reverse port forward: device port → host port.
    ///
    /// Runs: `adb -s <serial> reverse tcp:<device_port> tcp:<host_port>`
    pub async fn reverse_port(&self, device_port: u16, host_port: u16) -> Result<()> {
        self.exec_adb(&[
            "reverse",
            &format!("tcp:{}", device_port),
            &format!("tcp:{}", host_port),
        ])
        .await?;
        Ok(())
    }

    /// Remove a reverse port forward.
    ///
    /// Runs: `adb -s <serial> reverse --remove tcp:<device_port>`
    pub async fn remove_reverse(&self, device_port: u16) -> Result<()> {
        self.exec_adb(&["reverse", "--remove", &format!("tcp:{}", device_port)])
            .await?;
        Ok(())
    }
}
