//! `phonescope-events` — leaf crate containing all event types for PhoneScope.
//!
//! This crate has no internal dependencies. All other crates in the workspace
//! that need event types depend on this crate.

pub mod app;
pub mod battery;
pub mod confidence;
pub mod dns;
pub mod http;
pub mod insight;
pub mod log;
pub mod network;
pub mod package;
pub mod process;
pub mod storage;
pub mod thermal;
pub mod usage;

// Re-export the most commonly used types at the crate root.
pub use app::{AppCategory, AppEvent};
pub use battery::{BatteryEvent, BatteryHealth};
pub use confidence::Confidence;
pub use dns::DnsEvent;
pub use http::HttpRequestEvent;
pub use insight::{InsightCategory, InsightEvent, InsightSeverity};
pub use log::{LogEvent, LogLevel};
pub use network::{Direction, NetworkFlowEvent, Protocol};
pub use package::{PackageEvent, PackageEventType};
pub use process::{ProcessEntry, ProcessEvent, ProcessState};
pub use storage::{FolderSize, StorageEvent};
pub use thermal::{ThermalEvent, ThermalZone, ThrottlingStatus};
pub use usage::{AppUsageEvent, AppUsageRecord, SnapshotType};

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// The primary event source — which subsystem produced this event.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum EventSource {
    /// Produced via ADB shell commands.
    Adb,
    /// Produced by the on-device helper app via WebSocket.
    HelperApp,
    /// Produced by the mitmproxy sidecar.
    Proxy,
    /// Produced via a root shell.
    RootShell,
    /// Synthesized / computed from other events.
    Synthetic,
}

/// Metadata attached to every event.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct EventMeta {
    /// The session this event belongs to.
    pub session_id: i64,
    /// When the event was captured (UTC).
    pub timestamp: DateTime<Utc>,
    /// Which subsystem produced the event.
    pub source: EventSource,
}

impl EventMeta {
    /// Create new metadata with the current UTC time.
    pub fn now(session_id: i64, source: EventSource) -> Self {
        Self {
            session_id,
            timestamp: Utc::now(),
            source,
        }
    }
}

/// The unified event enum — every collector produces variants of this.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(tag = "type", content = "data")]
pub enum DeviceEvent {
    App(AppEvent),
    NetworkFlow(NetworkFlowEvent),
    HttpRequest(HttpRequestEvent),
    Dns(DnsEvent),
    Battery(BatteryEvent),
    Storage(StorageEvent),
    Package(PackageEvent),
    Log(LogEvent),
    Process(ProcessEvent),
    Thermal(ThermalEvent),
    AppUsage(AppUsageEvent),
    Insight(InsightEvent),
}

impl DeviceEvent {
    /// Return the event metadata regardless of variant.
    pub fn meta(&self) -> &EventMeta {
        match self {
            Self::App(e) => &e.meta,
            Self::NetworkFlow(e) => &e.meta,
            Self::HttpRequest(e) => &e.meta,
            Self::Dns(e) => &e.meta,
            Self::Battery(e) => &e.meta,
            Self::Storage(e) => &e.meta,
            Self::Package(e) => &e.meta,
            Self::Log(e) => &e.meta,
            Self::Process(e) => &e.meta,
            Self::Thermal(e) => &e.meta,
            Self::AppUsage(e) => &e.meta,
            Self::Insight(e) => &e.meta,
        }
    }

    /// Return the session_id for this event.
    pub fn session_id(&self) -> i64 {
        self.meta().session_id
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn make_meta() -> EventMeta {
        EventMeta {
            session_id: 1,
            timestamp: Utc::now(),
            source: EventSource::Adb,
        }
    }

    #[test]
    fn test_confidence_serde_round_trip() {
        let values = [
            Confidence::Exact,
            Confidence::Approximate,
            Confidence::Inferred,
            Confidence::Unavailable,
        ];
        for c in &values {
            let json = serde_json::to_string(c).expect("serialize confidence");
            let back: Confidence = serde_json::from_str(&json).expect("deserialize confidence");
            assert_eq!(*c, back);
        }
    }

    #[test]
    fn test_log_level_char_round_trip() {
        for (ch, level) in [
            ('V', LogLevel::Verbose),
            ('D', LogLevel::Debug),
            ('I', LogLevel::Info),
            ('W', LogLevel::Warn),
            ('E', LogLevel::Error),
            ('F', LogLevel::Fatal),
        ] {
            assert_eq!(LogLevel::from_char(ch), Some(level));
            assert_eq!(level.as_char(), ch);
        }
    }

    #[test]
    fn test_log_event_serde_round_trip() {
        let event = LogEvent {
            meta: make_meta(),
            level: LogLevel::Warn,
            tag: "MyTag".to_string(),
            message: "Something happened".to_string(),
            pid: Some(1234),
            tid: Some(1235),
            package_name: Some("com.example.app".to_string()),
        };
        let json = serde_json::to_string(&event).expect("serialize LogEvent");
        let back: LogEvent = serde_json::from_str(&json).expect("deserialize LogEvent");
        assert_eq!(back.level, LogLevel::Warn);
        assert_eq!(back.tag, "MyTag");
        assert_eq!(back.pid, Some(1234));
    }

    #[test]
    fn test_package_event_serde_round_trip() {
        let event = PackageEvent {
            meta: make_meta(),
            event_type: PackageEventType::Installed,
            package_name: "com.example.app".to_string(),
            app_label: Some("Example App".to_string()),
            version_name: Some("1.2.3".to_string()),
            version_code: Some(123),
            is_system: false,
            is_enabled: true,
            apk_path: Some("/data/app/com.example.app".to_string()),
            installer: Some("com.android.vending".to_string()),
            target_sdk: Some(34),
            min_sdk: Some(26),
            permissions: vec!["android.permission.INTERNET".to_string()],
            confidence: Confidence::Exact,
        };
        let json = serde_json::to_string(&event).expect("serialize PackageEvent");
        let back: PackageEvent = serde_json::from_str(&json).expect("deserialize PackageEvent");
        assert_eq!(back.event_type, PackageEventType::Installed);
        assert_eq!(back.package_name, "com.example.app");
    }

    #[test]
    fn test_battery_event_serde_round_trip() {
        let event = BatteryEvent {
            meta: make_meta(),
            level: 85,
            is_charging: false,
            temperature_celsius: Some(32.5),
            voltage_mv: Some(3800.0),
            current_ma: Some(-450.0),
            health: Some(BatteryHealth::Good),
            technology: Some("Li-ion".to_string()),
            capacity_mah: Some(4000.0),
            confidence: Confidence::Exact,
        };
        let json = serde_json::to_string(&event).expect("serialize BatteryEvent");
        let back: BatteryEvent = serde_json::from_str(&json).expect("deserialize BatteryEvent");
        assert_eq!(back.level, 85);
        assert!(!back.is_charging);
    }

    #[test]
    fn test_device_event_enum_serde_round_trip() {
        let meta = make_meta();
        let inner = LogEvent {
            meta,
            level: LogLevel::Error,
            tag: "CrashTag".to_string(),
            message: "FATAL EXCEPTION".to_string(),
            pid: Some(9999),
            tid: Some(9999),
            package_name: None,
        };
        let event = DeviceEvent::Log(inner);
        let json = serde_json::to_string(&event).expect("serialize DeviceEvent");
        let back: DeviceEvent = serde_json::from_str(&json).expect("deserialize DeviceEvent");
        assert_eq!(back.session_id(), 1);
        if let DeviceEvent::Log(e) = back {
            assert_eq!(e.tag, "CrashTag");
        } else {
            panic!("Wrong variant after round-trip");
        }
    }

    #[test]
    fn test_network_flow_event_serde_round_trip() {
        let event = NetworkFlowEvent {
            meta: make_meta(),
            package_name: Some("com.example.app".to_string()),
            protocol: Protocol::Tcp,
            direction: Direction::Outbound,
            local_addr: Some("192.168.1.2".to_string()),
            local_port: Some(12345),
            remote_addr: Some("1.2.3.4".to_string()),
            remote_host: Some("example.com".to_string()),
            remote_port: Some(443),
            bytes_sent: 1024,
            bytes_received: 4096,
            duration_ms: Some(150),
            confidence: Confidence::Approximate,
        };
        let json = serde_json::to_string(&event).expect("serialize NetworkFlowEvent");
        let back: NetworkFlowEvent =
            serde_json::from_str(&json).expect("deserialize NetworkFlowEvent");
        assert_eq!(back.protocol, Protocol::Tcp);
        assert_eq!(back.bytes_sent, 1024);
    }

    #[test]
    fn test_insight_event_serde_round_trip() {
        let event = InsightEvent {
            meta: make_meta(),
            category: InsightCategory::Privacy,
            severity: InsightSeverity::Warning,
            title: "App accessing contacts".to_string(),
            description: "com.example has accessed contacts 50 times".to_string(),
            technical_detail: None,
            package_name: Some("com.example".to_string()),
            confidence: Confidence::Exact,
        };
        let json = serde_json::to_string(&event).expect("serialize InsightEvent");
        let back: InsightEvent = serde_json::from_str(&json).expect("deserialize InsightEvent");
        assert_eq!(back.category, InsightCategory::Privacy);
        assert_eq!(back.severity, InsightSeverity::Warning);
    }
}
