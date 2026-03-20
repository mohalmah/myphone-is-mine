//! Database row types (deserialized from SQLite rows).

use serde::{Deserialize, Serialize};

/// A row from the `device` table.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Device {
    pub id: i64,
    pub serial: String,
    pub model: Option<String>,
    pub manufacturer: Option<String>,
    pub android_version: Option<String>,
    pub sdk_level: Option<i64>,
    pub is_rooted: bool,
    pub has_helper: bool,
    pub first_seen_at: String,
    pub last_seen_at: String,
}

/// A row from the `session` table.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: i64,
    pub device_id: i64,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub capability_mask: i64,
    pub mode: String,
}

/// A row from the `package` table.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Package {
    pub id: i64,
    pub device_id: i64,
    pub package_name: String,
    pub app_label: Option<String>,
    pub version_name: Option<String>,
    pub version_code: Option<i64>,
    pub is_system: bool,
    pub is_enabled: bool,
    pub installer: Option<String>,
    pub target_sdk: Option<i64>,
    pub min_sdk: Option<i64>,
    pub first_seen_at: String,
    pub last_updated_at: String,
}

/// A row from the `log_entry` table.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub id: i64,
    pub session_id: i64,
    pub package_id: Option<i64>,
    pub level: String,
    pub tag: Option<String>,
    pub message: String,
    pub pid: Option<i64>,
    pub tid: Option<i64>,
    pub captured_at: String,
}
