use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::{Confidence, EventMeta};

/// The type of usage snapshot period.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum SnapshotType {
    Hourly,
    Daily,
    Weekly,
    Manual,
}

/// App usage event covering a time period.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct AppUsageEvent {
    pub meta: EventMeta,
    pub snapshot_type: SnapshotType,
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
    pub total_screen_on_ms: u64,
    pub unlock_count: u32,
    pub app_usages: Vec<AppUsageRecord>,
    pub confidence: Confidence,
}

/// Usage record for a single app within a snapshot.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct AppUsageRecord {
    pub package_name: String,
    pub foreground_time_ms: u64,
    pub background_time_ms: u64,
    pub launch_count: u32,
    pub notifications_posted: u32,
    pub last_time_used: Option<DateTime<Utc>>,
    pub category: Option<String>,
}
