use serde::{Deserialize, Serialize};

use crate::{Confidence, EventMeta};

/// A storage snapshot event.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct StorageEvent {
    pub meta: EventMeta,
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub free_bytes: u64,
    /// Per-path or per-app storage breakdown, if available.
    pub folder_sizes: Vec<FolderSize>,
    pub confidence: Confidence,
}

/// Storage usage for a folder or app.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct FolderSize {
    pub path: String,
    pub package_name: Option<String>,
    pub size_bytes: u64,
    pub file_count: Option<u64>,
}
