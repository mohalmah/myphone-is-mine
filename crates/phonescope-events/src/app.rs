use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::{Confidence, EventMeta};

/// Category of an Android application.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum AppCategory {
    Social,
    Productivity,
    Games,
    Entertainment,
    Communication,
    News,
    Shopping,
    Finance,
    Health,
    Education,
    Travel,
    Utilities,
    Other,
}

/// An event related to an application's lifecycle or state.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct AppEvent {
    pub meta: EventMeta,
    pub package_name: String,
    pub app_label: Option<String>,
    pub category: Option<AppCategory>,
    pub is_system: bool,
    pub is_enabled: bool,
    pub version_name: Option<String>,
    pub version_code: Option<i64>,
    pub target_sdk: Option<i32>,
    pub min_sdk: Option<i32>,
    pub installer: Option<String>,
    pub last_updated: Option<DateTime<Utc>>,
    pub confidence: Confidence,
}
