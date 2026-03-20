use serde::{Deserialize, Serialize};

use crate::{Confidence, EventMeta};

/// The type of package lifecycle event.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum PackageEventType {
    Installed,
    Updated,
    Removed,
    Enabled,
    Disabled,
}

/// A package (installed app) event, including installs, updates, and removals.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct PackageEvent {
    pub meta: EventMeta,
    pub event_type: PackageEventType,
    pub package_name: String,
    pub app_label: Option<String>,
    pub version_name: Option<String>,
    pub version_code: Option<i64>,
    pub is_system: bool,
    pub is_enabled: bool,
    pub apk_path: Option<String>,
    pub installer: Option<String>,
    pub target_sdk: Option<i32>,
    pub min_sdk: Option<i32>,
    pub permissions: Vec<String>,
    pub confidence: Confidence,
}
