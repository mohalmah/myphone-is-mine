use serde::{Deserialize, Serialize};

use crate::{Confidence, EventMeta};

/// An HTTP/HTTPS request captured by the proxy.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct HttpRequestEvent {
    pub meta: EventMeta,
    pub package_name: Option<String>,
    pub method: String,
    pub url: String,
    pub host: String,
    pub path: String,
    pub status_code: Option<u16>,
    pub request_size: Option<u64>,
    pub response_size: Option<u64>,
    pub content_type: Option<String>,
    pub duration_ms: Option<u64>,
    pub is_tls: bool,
    pub har_entry_json: Option<String>,
    pub confidence: Confidence,
}
