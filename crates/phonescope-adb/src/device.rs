use serde::{Deserialize, Serialize};

/// Connection state of an ADB device.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DeviceState {
    Device,
    Offline,
    Unauthorized,
    Unknown,
}

impl DeviceState {
    pub fn from_str(s: &str) -> Self {
        match s {
            "device" => Self::Device,
            "offline" => Self::Offline,
            "unauthorized" => Self::Unauthorized,
            _ => Self::Unknown,
        }
    }
}

/// Information about a connected ADB device.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    /// ADB serial number (e.g. "emulator-5554", "ABC123").
    pub serial: String,
    /// Device connection state.
    pub state: DeviceState,
    /// Device model name (e.g. "Pixel 7").
    pub model: Option<String>,
    /// Device manufacturer.
    pub manufacturer: Option<String>,
    /// Android version string (e.g. "14").
    pub android_version: Option<String>,
    /// SDK level integer.
    pub sdk_level: Option<u32>,
}

impl DeviceInfo {
    /// Parse a line from `adb devices -l`.
    ///
    /// Example line:
    /// `emulator-5554          device product:sdk_gphone_x86_64 model:sdk_gphone_x86_64 device:generic_x86_64 transport_id:1`
    pub fn parse_devices_line(line: &str) -> Option<Self> {
        let line = line.trim();
        if line.is_empty() || line.starts_with("List of devices") {
            return None;
        }

        let mut parts = line.splitn(2, char::is_whitespace);
        let serial = parts.next()?.trim().to_string();
        let rest = parts.next().unwrap_or("").trim();

        let mut rest_parts = rest.splitn(2, char::is_whitespace);
        let state_str = rest_parts.next().unwrap_or("unknown");
        let state = DeviceState::from_str(state_str);

        let extras = rest_parts.next().unwrap_or("");
        let model = Self::extract_extra(extras, "model:");
        let manufacturer = None; // Not in `adb devices -l` — populated separately.

        Some(DeviceInfo {
            serial,
            state,
            model,
            manufacturer,
            android_version: None,
            sdk_level: None,
        })
    }

    fn extract_extra(s: &str, key: &str) -> Option<String> {
        s.split_whitespace()
            .find(|part| part.starts_with(key))
            .map(|part| part[key.len()..].replace('_', " "))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_device_line_emulator() {
        let line = "emulator-5554          device product:sdk_gphone model:sdk_gphone device:generic transport_id:1";
        let info = DeviceInfo::parse_devices_line(line).expect("should parse");
        assert_eq!(info.serial, "emulator-5554");
        assert_eq!(info.state, DeviceState::Device);
        assert_eq!(info.model.as_deref(), Some("sdk gphone"));
    }

    #[test]
    fn test_parse_device_line_offline() {
        let line = "ABC123DEF              offline";
        let info = DeviceInfo::parse_devices_line(line).expect("should parse");
        assert_eq!(info.serial, "ABC123DEF");
        assert_eq!(info.state, DeviceState::Offline);
    }

    #[test]
    fn test_parse_devices_header_returns_none() {
        assert!(DeviceInfo::parse_devices_line("List of devices attached").is_none());
        assert!(DeviceInfo::parse_devices_line("").is_none());
    }

    #[test]
    fn test_parse_device_line_unauthorized() {
        let line = "DEADBEEF0001           unauthorized";
        let info = DeviceInfo::parse_devices_line(line).expect("should parse");
        assert_eq!(info.state, DeviceState::Unauthorized);
    }
}
