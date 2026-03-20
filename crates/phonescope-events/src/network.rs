use serde::{Deserialize, Serialize};

use crate::{Confidence, EventMeta};

/// Network protocol.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, specta::Type)]
#[serde(rename_all = "UPPERCASE")]
pub enum Protocol {
    Tcp,
    Udp,
    Icmp,
    Unknown,
}

/// Network traffic direction relative to the device.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum Direction {
    Outbound,
    Inbound,
    Both,
}

/// A network flow (connection or UDP exchange) observed on the device.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct NetworkFlowEvent {
    pub meta: EventMeta,
    pub package_name: Option<String>,
    pub protocol: Protocol,
    pub direction: Direction,
    pub local_addr: Option<String>,
    pub local_port: Option<u16>,
    pub remote_addr: Option<String>,
    pub remote_host: Option<String>,
    pub remote_port: Option<u16>,
    pub bytes_sent: u64,
    pub bytes_received: u64,
    pub duration_ms: Option<u64>,
    pub confidence: Confidence,
}
