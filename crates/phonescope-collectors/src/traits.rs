//! Collector trait and context types.

use async_trait::async_trait;
use phonescope_adb::AdbShell;
use phonescope_events::DeviceEvent;
use std::collections::HashSet;
use tokio::sync::mpsc;

/// The set of capability strings required or provided by a collector.
///
/// Well-known capability strings:
/// - `"root"` — device must be rooted
/// - `"helper"` — on-device helper app must be installed
/// - `"adb"` — standard ADB access (always available in ADB sessions)
pub type CapabilitySet = HashSet<String>;

/// Context passed to every collector when it runs.
///
/// Provides access to the ADB shell for the target device and a channel
/// to emit `DeviceEvent`s into the session's event bus.
pub struct CollectorContext {
    /// The session this collector is running under.
    pub session_id: i64,
    /// ADB shell handle for the target device.
    pub shell: AdbShell,
    /// Channel to send collected events to the event bus.
    pub event_tx: mpsc::Sender<DeviceEvent>,
}

/// Trait implemented by all data collectors.
///
/// A collector is responsible for gathering one category of telemetry from
/// the device and emitting `DeviceEvent`s. Collectors must be `Send + Sync`
/// so they can be run concurrently by the `CollectorManager`.
#[async_trait]
pub trait Collector: Send + Sync {
    /// Human-readable name used in logs and metrics.
    fn name(&self) -> &str;

    /// Set of capability strings this collector requires in order to run.
    ///
    /// If the device's capability profile does not satisfy all required
    /// capabilities, the `CollectorManager` will skip this collector.
    fn required_capabilities(&self) -> CapabilitySet;

    /// Collect a single snapshot of data and return the events produced.
    ///
    /// Implementations should be idempotent and complete in bounded time.
    /// For streaming collectors, prefer `collect_stream` instead.
    async fn collect_once(&self, ctx: &CollectorContext) -> crate::Result<Vec<DeviceEvent>>;

    /// Stream events continuously until the context's `event_tx` is closed
    /// or an unrecoverable error occurs.
    ///
    /// The default implementation calls `collect_once` on a timer loop.
    /// Override this for collectors that naturally produce a stream (e.g. logcat).
    async fn collect_stream(&self, ctx: &CollectorContext) -> crate::Result<()> {
        use tokio::time::{interval, Duration};
        let mut ticker = interval(Duration::from_millis(self.default_interval_ms()));
        loop {
            ticker.tick().await;
            match self.collect_once(ctx).await {
                Ok(events) => {
                    for event in events {
                        if ctx.event_tx.send(event).await.is_err() {
                            // Receiver dropped — session ended.
                            return Ok(());
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!(collector = self.name(), error = %e, "collect_once error — continuing");
                }
            }
        }
    }

    /// Default interval in milliseconds for the timer-based `collect_stream` loop.
    fn default_interval_ms(&self) -> u64 {
        5_000
    }
}
