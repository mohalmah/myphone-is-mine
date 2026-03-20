//! `phonescope-core` — orchestrator, session management, config, and capability detection.
//!
//! This is the central crate that wires together ADB, storage, collectors,
//! and the event bus. Other teams (INT, T3) depend on this crate.

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use bitflags::bitflags;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use tokio::sync::broadcast;
use tracing::{debug, info, warn};

use phonescope_adb::{AdbManager, AdbShell, DeviceInfo};
use phonescope_events::DeviceEvent;

/// Crate-level error type.
#[derive(Debug, Error)]
pub enum Error {
    #[error("ADB error: {0}")]
    Adb(#[from] phonescope_adb::Error),

    #[error("Session not found: {0}")]
    SessionNotFound(String),

    #[error("Device already has an active session")]
    SessionAlreadyActive,

    #[error("Configuration error: {0}")]
    Config(String),

    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
}

/// Crate-level result alias.
pub type Result<T> = std::result::Result<T, Error>;

bitflags! {
    /// Bitmask of detected device capabilities.
    #[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
    pub struct Capabilities: u32 {
        /// Basic ADB connection is available.
        const ADB        = 0b0000_0001;
        /// Device is rooted (uid=0 accessible).
        const ROOT       = 0b0000_0010;
        /// PhoneScope helper app is installed.
        const HELPER     = 0b0000_0100;
        /// mitmproxy sidecar is available.
        const PROXY      = 0b0000_1000;
        /// logcat is readable.
        const LOGCAT     = 0b0001_0000;
        /// dumpsys is accessible.
        const DUMPSYS    = 0b0010_0000;
        /// Network statistics (netstats) are readable.
        const NETSTATS   = 0b0100_0000;
        /// tcpdump is available (requires root).
        const TCPDUMP    = 0b1000_0000;
        /// VPN capture via helper app.
        const VPN_CAPTURE = 0b0001_0000_0000;
    }
}

/// Operating mode derived from available capabilities.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum OperationMode {
    /// Only ADB commands (logcat + dumpsys + packages).
    Basic,
    /// Helper app connected (adds per-app network capture).
    Helper,
    /// Proxy available (adds HTTP inspection).
    Proxy,
    /// Device is rooted (all collectors available).
    Root,
}

impl OperationMode {
    pub fn from_capabilities(caps: Capabilities) -> Self {
        if caps.contains(Capabilities::ROOT) {
            Self::Root
        } else if caps.contains(Capabilities::PROXY) {
            Self::Proxy
        } else if caps.contains(Capabilities::HELPER) {
            Self::Helper
        } else {
            Self::Basic
        }
    }
}

/// Capability profile for a session.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapabilityProfile {
    pub capabilities: Capabilities,
    pub mode: OperationMode,
    pub detected_at: DateTime<Utc>,
}

impl CapabilityProfile {
    /// Minimum ADB-only profile.
    pub fn adb_only() -> Self {
        let caps = Capabilities::ADB | Capabilities::LOGCAT | Capabilities::DUMPSYS;
        Self {
            capabilities: caps,
            mode: OperationMode::Basic,
            detected_at: Utc::now(),
        }
    }
}

/// Application configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    /// Path to the SQLite database file. None = in-memory.
    pub db_path: Option<PathBuf>,
    /// Override path for the `adb` binary.
    pub adb_path: Option<String>,
    /// Event bus channel capacity.
    pub event_bus_capacity: usize,
    /// Data directory for PhoneScope files.
    pub data_dir: PathBuf,
}

impl Default for Config {
    fn default() -> Self {
        let data_dir = dirs_from_env();
        Self {
            db_path: None,
            adb_path: None,
            event_bus_capacity: 1024,
            data_dir,
        }
    }
}

fn dirs_from_env() -> PathBuf {
    if let Ok(home) = std::env::var("HOME") {
        PathBuf::from(home).join(".phonescope")
    } else if let Ok(appdata) = std::env::var("APPDATA") {
        PathBuf::from(appdata).join("phonescope")
    } else {
        PathBuf::from(".phonescope")
    }
}

impl Config {
    /// Create a config suitable for in-memory testing.
    pub fn in_memory() -> Self {
        Self {
            db_path: None,
            adb_path: None,
            event_bus_capacity: 256,
            data_dir: std::env::temp_dir().join("phonescope-test"),
        }
    }
}

/// Monotonically increasing session ID counter.
static SESSION_COUNTER: std::sync::atomic::AtomicI64 =
    std::sync::atomic::AtomicI64::new(1);

fn next_session_id() -> i64 {
    SESSION_COUNTER.fetch_add(1, std::sync::atomic::Ordering::SeqCst)
}

/// A handle representing an active device session.
#[derive(Debug, Clone)]
pub struct SessionHandle {
    /// Unique session identifier.
    pub session_id: i64,
    /// Device serial number.
    pub serial: String,
    /// When this session was started.
    pub started_at: DateTime<Utc>,
    /// Detected capability profile.
    pub capabilities: CapabilityProfile,
    /// Whether the session is still active.
    pub is_active: bool,
}

impl SessionHandle {
    fn new(session_id: i64, serial: String, capabilities: CapabilityProfile) -> Self {
        Self {
            session_id,
            serial,
            started_at: Utc::now(),
            capabilities,
            is_active: true,
        }
    }
}

/// The central PhoneScope orchestrator.
///
/// Holds the ADB manager, active sessions, event bus, and configuration.
pub struct PhoneScope {
    /// Application configuration.
    pub config: Config,
    /// ADB manager (None if ADB was not found at init time).
    pub adb: Option<AdbManager>,
    /// Event bus sender — broadcast to all subscribers.
    pub event_bus: broadcast::Sender<DeviceEvent>,
    /// Active sessions keyed by device serial.
    sessions: Arc<Mutex<HashMap<String, SessionHandle>>>,
}

impl PhoneScope {
    /// Create a new `PhoneScope` instance with the given configuration.
    ///
    /// ADB auto-detection is skipped when `config.adb_path` is None and
    /// the function is called with `new_in_memory()`.
    pub fn new(config: Config, adb: Option<AdbManager>) -> Self {
        let (tx, _rx) = broadcast::channel(config.event_bus_capacity);
        Self {
            config,
            adb,
            event_bus: tx,
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Create a PhoneScope instance suitable for unit tests (no real ADB, in-memory config).
    pub fn new_in_memory() -> Self {
        Self::new(Config::in_memory(), None)
    }

    /// Subscribe to the event bus.
    pub fn subscribe_events(&self) -> broadcast::Receiver<DeviceEvent> {
        self.event_bus.subscribe()
    }

    /// Publish an event to the bus.
    pub fn publish_event(&self, event: DeviceEvent) {
        // Ignore send errors — it just means there are no subscribers right now.
        let _ = self.event_bus.send(event);
    }

    /// List all currently active sessions.
    pub fn active_sessions(&self) -> Vec<SessionHandle> {
        let sessions = self.sessions.lock().expect("sessions lock poisoned");
        sessions
            .values()
            .filter(|s| s.is_active)
            .cloned()
            .collect()
    }

    /// Start a new session for the given device serial.
    ///
    /// Returns the session handle. Errors if a session is already active for
    /// the given serial.
    pub async fn start_session(&self, serial: &str) -> Result<SessionHandle> {
        {
            let sessions = self.sessions.lock().expect("sessions lock poisoned");
            if sessions.get(serial).map(|s| s.is_active).unwrap_or(false) {
                return Err(Error::SessionAlreadyActive);
            }
        }

        let caps = self.detect_capabilities(serial).await;
        let session_id = next_session_id();
        let handle = SessionHandle::new(session_id, serial.to_string(), caps);

        info!(
            session_id = handle.session_id,
            serial = serial,
            mode = ?handle.capabilities.mode,
            "Session started"
        );

        {
            let mut sessions = self.sessions.lock().expect("sessions lock poisoned");
            sessions.insert(serial.to_string(), handle.clone());
        }

        Ok(handle)
    }

    /// Stop the active session for the given device serial.
    pub async fn stop_session(&self, serial: &str) -> Result<()> {
        let mut sessions = self.sessions.lock().expect("sessions lock poisoned");
        match sessions.get_mut(serial) {
            Some(s) if s.is_active => {
                s.is_active = false;
                info!(session_id = s.session_id, serial = serial, "Session stopped");
                Ok(())
            }
            Some(_) => Err(Error::SessionNotFound(serial.to_string())),
            None => Err(Error::SessionNotFound(serial.to_string())),
        }
    }

    /// Detect capabilities for the given device serial.
    ///
    /// In ADB-only mode (no adb manager configured) returns minimal profile.
    pub async fn detect_capabilities(&self, serial: &str) -> CapabilityProfile {
        let adb = match &self.adb {
            Some(a) => a,
            None => return CapabilityProfile::adb_only(),
        };

        let shell = adb.shell(serial);
        let mut caps = Capabilities::ADB | Capabilities::LOGCAT | Capabilities::DUMPSYS;

        // Check root
        match shell.is_rooted().await {
            Ok(true) => {
                caps |= Capabilities::ROOT;
                debug!(serial = serial, "Device is rooted");
            }
            Ok(false) => {}
            Err(e) => warn!(serial = serial, error = %e, "Could not check root"),
        }

        // Check helper app
        match shell.exec("pm list packages com.phonescope.helper").await {
            Ok(output) if output.contains("com.phonescope.helper") => {
                caps |= Capabilities::HELPER;
                debug!(serial = serial, "Helper app detected");
            }
            _ => {}
        }

        // Check netstats
        match shell.exec("dumpsys netstats 2>/dev/null | head -1").await {
            Ok(output) if !output.is_empty() => {
                caps |= Capabilities::NETSTATS;
            }
            _ => {}
        }

        // Check tcpdump (root only)
        if caps.contains(Capabilities::ROOT) {
            match shell.exec("which tcpdump").await {
                Ok(output) if output.trim().ends_with("tcpdump") => {
                    caps |= Capabilities::TCPDUMP;
                }
                _ => {}
            }
        }

        let mode = OperationMode::from_capabilities(caps);
        CapabilityProfile {
            capabilities: caps,
            mode,
            detected_at: Utc::now(),
        }
    }

    /// List connected ADB devices.
    pub async fn list_devices(&self) -> Result<Vec<DeviceInfo>> {
        match &self.adb {
            Some(adb) => Ok(adb.list_devices().await?),
            None => Ok(Vec::new()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_in_memory_no_active_sessions() {
        let ps = PhoneScope::new_in_memory();
        assert!(ps.active_sessions().is_empty());
    }

    #[tokio::test]
    async fn test_start_and_stop_session() {
        let ps = PhoneScope::new_in_memory();
        let handle = ps.start_session("emulator-5554").await.expect("start session");

        assert_eq!(handle.serial, "emulator-5554");
        assert!(handle.is_active);
        assert!(handle.session_id > 0);

        let active = ps.active_sessions();
        assert_eq!(active.len(), 1);

        ps.stop_session("emulator-5554").await.expect("stop session");
        let active = ps.active_sessions();
        assert!(active.is_empty());
    }

    #[tokio::test]
    async fn test_double_start_session_returns_error() {
        let ps = PhoneScope::new_in_memory();
        ps.start_session("device-1").await.expect("first start");
        let err = ps.start_session("device-1").await;
        assert!(matches!(err, Err(Error::SessionAlreadyActive)));
    }

    #[tokio::test]
    async fn test_stop_nonexistent_session_returns_error() {
        let ps = PhoneScope::new_in_memory();
        let err = ps.stop_session("nonexistent").await;
        assert!(matches!(err, Err(Error::SessionNotFound(_))));
    }

    #[tokio::test]
    async fn test_multiple_sessions_different_devices() {
        let ps = PhoneScope::new_in_memory();
        ps.start_session("device-A").await.expect("start A");
        ps.start_session("device-B").await.expect("start B");

        let active = ps.active_sessions();
        assert_eq!(active.len(), 2);

        ps.stop_session("device-A").await.expect("stop A");
        let active = ps.active_sessions();
        assert_eq!(active.len(), 1);
        assert_eq!(active[0].serial, "device-B");
    }

    #[test]
    fn test_event_bus_subscribe_and_publish() {
        let ps = PhoneScope::new_in_memory();
        let mut rx = ps.subscribe_events();

        use phonescope_events::{EventMeta, EventSource, LogEvent, LogLevel};
        let event = DeviceEvent::Log(LogEvent {
            meta: EventMeta::now(1, EventSource::Adb),
            level: LogLevel::Info,
            tag: "test".to_string(),
            message: "hello".to_string(),
            pid: None,
            tid: None,
            package_name: None,
        });

        ps.publish_event(event);
        let received = rx.try_recv().expect("should receive event");
        assert_eq!(received.session_id(), 1);
    }

    #[test]
    fn test_capabilities_adb_only() {
        let profile = CapabilityProfile::adb_only();
        assert!(profile.capabilities.contains(Capabilities::ADB));
        assert!(profile.capabilities.contains(Capabilities::LOGCAT));
        assert!(!profile.capabilities.contains(Capabilities::ROOT));
        assert_eq!(profile.mode, OperationMode::Basic);
    }

    #[test]
    fn test_operation_mode_from_capabilities() {
        let root_caps = Capabilities::ADB | Capabilities::ROOT;
        assert_eq!(OperationMode::from_capabilities(root_caps), OperationMode::Root);

        let proxy_caps = Capabilities::ADB | Capabilities::PROXY;
        assert_eq!(OperationMode::from_capabilities(proxy_caps), OperationMode::Proxy);

        let helper_caps = Capabilities::ADB | Capabilities::HELPER;
        assert_eq!(OperationMode::from_capabilities(helper_caps), OperationMode::Helper);

        let basic_caps = Capabilities::ADB;
        assert_eq!(OperationMode::from_capabilities(basic_caps), OperationMode::Basic);
    }

    #[tokio::test]
    async fn test_detect_capabilities_no_adb_returns_adb_only() {
        let ps = PhoneScope::new_in_memory();
        let profile = ps.detect_capabilities("any-serial").await;
        assert_eq!(profile.mode, OperationMode::Basic);
        assert!(profile.capabilities.contains(Capabilities::ADB));
    }

    #[test]
    fn test_config_in_memory() {
        let config = Config::in_memory();
        assert!(config.db_path.is_none());
        assert!(config.adb_path.is_none());
    }
}
