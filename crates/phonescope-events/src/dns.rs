use serde::{Deserialize, Serialize};

use crate::{Confidence, EventMeta};

/// A DNS query observed on the device.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct DnsEvent {
    pub meta: EventMeta,
    pub package_name: Option<String>,
    pub query_name: String,
    pub query_type: String,
    pub resolved_ips: Vec<String>,
    pub response_code: Option<i32>,
    pub duration_ms: Option<u64>,
    pub confidence: Confidence,
}
