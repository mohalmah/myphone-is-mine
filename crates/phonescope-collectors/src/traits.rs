//! Collector trait and context types (stub for T3).

use async_trait::async_trait;
use phonescope_adb::AdbShell;
use phonescope_events::DeviceEvent;
use std::collections::HashSet;
use tokio::sync::mpsc;

/// The set of capabilities required or provided by a collector.
pub type CapabilitySet = HashSet<String>;

/// Context passed to collectors when they run.
pub struct CollectorContext {
    pub session_id: i64,
    pub shell: AdbShell,
    pub event_tx: mpsc::Sender<DeviceEvent>,
}

/// Trait implemented by all data collectors.
#[async_trait]
pub trait Collector: Send + Sync {
    /// Human-readable name for logging.
    fn name(&self) -> &str;

    /// Capabilities this collector requires (e.g. "root", "helper").
    fn required_capabilities(&self) -> CapabilitySet;

    /// Collect a single snapshot of data.
    async fn collect_once(&self, ctx: &CollectorContext) -> anyhow::Result<Vec<DeviceEvent>>;

    /// Default interval between collections in milliseconds.
    fn default_interval_ms(&self) -> u64 {
        5_000
    }
}
