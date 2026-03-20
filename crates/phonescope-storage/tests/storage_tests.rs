//! Integration tests for `phonescope-storage` using in-memory SQLite.

use chrono::Utc;
use phonescope_events::{
    Confidence, DeviceEvent, EventMeta, EventSource, LogEvent, LogLevel, PackageEvent,
    PackageEventType,
};
use phonescope_storage::{
    models::{LogEntry, Package},
    retention::{RetentionConfig, run_retention},
    Database, LogFilter,
};

// ─── helpers ─────────────────────────────────────────────────────────────────

fn open_db() -> Database {
    Database::open_in_memory().expect("open in-memory db")
}

fn make_meta(session_id: i64) -> EventMeta {
    EventMeta {
        session_id,
        timestamp: Utc::now(),
        source: EventSource::Adb,
    }
}

// ─── migration tests ─────────────────────────────────────────────────────────

#[test]
fn test_migration_creates_all_m1_tables() {
    let db = open_db();
    let conn = db.conn();

    let tables: Vec<String> = {
        let mut stmt = conn
            .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            .unwrap();
        stmt.query_map([], |row| row.get(0))
            .unwrap()
            .map(|r| r.unwrap())
            .collect()
    };

    for required in &[
        "device",
        "session",
        "package",
        "app_permission",
        "log_entry",
        "battery_sample",
        "storage_snapshot",
        "network_flow",
        "dns_query",
        "process_snapshot",
        "process_entry",
        "thermal_sample",
        "insight",
        "user_action",
        "http_request",
        "usage_snapshot",
        "app_usage_record",
    ] {
        assert!(
            tables.contains(&required.to_string()),
            "Missing table: {required}"
        );
    }
}

// ─── device / session tests ───────────────────────────────────────────────────

#[test]
fn test_upsert_device_and_get() {
    let db = open_db();

    let id = db.upsert_device("emulator-5554").unwrap();
    assert!(id > 0);

    // Second upsert returns the same id.
    let id2 = db.upsert_device("emulator-5554").unwrap();
    assert_eq!(id, id2);

    let device = db.get_device(id).unwrap().expect("device should exist");
    assert_eq!(device.serial, "emulator-5554");
}

#[test]
fn test_create_and_get_session() {
    let db = open_db();

    let device_id = db.upsert_device("emulator-5554").unwrap();
    let session_id = db.create_session(device_id).unwrap();
    assert!(session_id > 0);

    let session = db.get_session(session_id).unwrap().expect("session should exist");
    assert_eq!(session.device_id, device_id);
    assert!(session.ended_at.is_none());
}

#[test]
fn test_end_session() {
    let db = open_db();
    let device_id = db.upsert_device("dev-001").unwrap();
    let session_id = db.create_session(device_id).unwrap();

    db.end_session(session_id).unwrap();

    let session = db.get_session(session_id).unwrap().unwrap();
    assert!(session.ended_at.is_some());
}

// ─── log entry tests ─────────────────────────────────────────────────────────

fn insert_test_logs(db: &mut Database, session_id: i64) {
    let events = vec![
        DeviceEvent::Log(LogEvent {
            meta: make_meta(session_id),
            level: LogLevel::Info,
            tag: "ActivityManager".to_string(),
            message: "App started".to_string(),
            pid: Some(1234),
            tid: Some(1234),
            package_name: Some("com.example.app".to_string()),
        }),
        DeviceEvent::Log(LogEvent {
            meta: make_meta(session_id),
            level: LogLevel::Warn,
            tag: "NetworkUtils".to_string(),
            message: "Slow network detected".to_string(),
            pid: Some(1235),
            tid: Some(1235),
            package_name: None,
        }),
        DeviceEvent::Log(LogEvent {
            meta: make_meta(session_id),
            level: LogLevel::Error,
            tag: "CrashHandler".to_string(),
            message: "NullPointerException in MainActivity".to_string(),
            pid: Some(1236),
            tid: Some(1236),
            package_name: Some("com.example.app".to_string()),
        }),
    ];
    db.insert_events(&events).unwrap();
}

#[test]
fn test_insert_and_query_logs_no_filter() {
    let mut db = open_db();
    let device_id = db.upsert_device("dev-001").unwrap();
    let session_id = db.create_session(device_id).unwrap();

    insert_test_logs(&mut db, session_id);

    let logs = db.query_logs(&LogFilter::default()).unwrap();
    assert_eq!(logs.len(), 3);
}

#[test]
fn test_query_logs_filter_by_session() {
    let mut db = open_db();
    let device_id = db.upsert_device("dev-001").unwrap();
    let session_id = db.create_session(device_id).unwrap();

    insert_test_logs(&mut db, session_id);

    let logs = db
        .query_logs(&LogFilter {
            session_id: Some(session_id),
            ..Default::default()
        })
        .unwrap();
    assert_eq!(logs.len(), 3);

    // Different session_id returns nothing.
    let logs_other = db
        .query_logs(&LogFilter {
            session_id: Some(session_id + 999),
            ..Default::default()
        })
        .unwrap();
    assert_eq!(logs_other.len(), 0);
}

#[test]
fn test_query_logs_filter_by_level() {
    let mut db = open_db();
    let device_id = db.upsert_device("dev-001").unwrap();
    let session_id = db.create_session(device_id).unwrap();

    insert_test_logs(&mut db, session_id);

    let errors = db
        .query_logs(&LogFilter {
            level: Some("E".to_string()),
            ..Default::default()
        })
        .unwrap();
    assert_eq!(errors.len(), 1);
    assert_eq!(errors[0].level, "E");
}

#[test]
fn test_query_logs_filter_by_tag_pattern() {
    let mut db = open_db();
    let device_id = db.upsert_device("dev-001").unwrap();
    let session_id = db.create_session(device_id).unwrap();

    insert_test_logs(&mut db, session_id);

    let logs = db
        .query_logs(&LogFilter {
            tag_pattern: Some("Network".to_string()),
            ..Default::default()
        })
        .unwrap();
    assert_eq!(logs.len(), 1);
    assert_eq!(logs[0].tag.as_deref(), Some("NetworkUtils"));
}

#[test]
fn test_query_logs_filter_by_message_search() {
    let mut db = open_db();
    let device_id = db.upsert_device("dev-001").unwrap();
    let session_id = db.create_session(device_id).unwrap();

    insert_test_logs(&mut db, session_id);

    let logs = db
        .query_logs(&LogFilter {
            message_search: Some("Exception".to_string()),
            ..Default::default()
        })
        .unwrap();
    assert_eq!(logs.len(), 1);
    assert!(logs[0].message.contains("Exception"));
}

#[test]
fn test_query_logs_pagination() {
    let mut db = open_db();
    let device_id = db.upsert_device("dev-001").unwrap();
    let session_id = db.create_session(device_id).unwrap();

    insert_test_logs(&mut db, session_id);

    let page1 = db
        .query_logs(&LogFilter {
            limit: Some(2),
            offset: Some(0),
            ..Default::default()
        })
        .unwrap();
    assert_eq!(page1.len(), 2);

    let page2 = db
        .query_logs(&LogFilter {
            limit: Some(2),
            offset: Some(2),
            ..Default::default()
        })
        .unwrap();
    assert_eq!(page2.len(), 1);
}

#[test]
fn test_insert_log_entry_directly() {
    let db = open_db();
    let device_id = db.upsert_device("dev-001").unwrap();
    let session_id = db.create_session(device_id).unwrap();

    let entry = LogEntry {
        id: 0,
        session_id,
        package_id: None,
        level: "W".to_string(),
        tag: Some("TestTag".to_string()),
        message: "test message".to_string(),
        pid: Some(42),
        tid: Some(43),
        captured_at: Utc::now().to_rfc3339(),
    };

    let id = db.insert_log_entry(&entry).unwrap();
    assert!(id > 0);

    let logs = db.query_logs(&LogFilter::default()).unwrap();
    assert_eq!(logs.len(), 1);
    assert_eq!(logs[0].tag.as_deref(), Some("TestTag"));
}

// ─── package tests ────────────────────────────────────────────────────────────

fn make_package_event(session_id: i64, pkg_name: &str) -> DeviceEvent {
    DeviceEvent::Package(PackageEvent {
        meta: make_meta(session_id),
        event_type: PackageEventType::Installed,
        package_name: pkg_name.to_string(),
        app_label: Some(format!("{pkg_name} Label")),
        version_name: Some("1.0.0".to_string()),
        version_code: Some(100),
        is_system: false,
        is_enabled: true,
        apk_path: None,
        installer: Some("com.android.vending".to_string()),
        target_sdk: Some(34),
        min_sdk: Some(26),
        permissions: vec![],
        confidence: Confidence::Exact,
    })
}

#[test]
fn test_insert_package_via_event() {
    let mut db = open_db();
    let device_id = db.upsert_device("dev-001").unwrap();
    let session_id = db.create_session(device_id).unwrap();

    let events = vec![
        make_package_event(session_id, "com.example.one"),
        make_package_event(session_id, "com.example.two"),
    ];
    db.insert_events(&events).unwrap();

    let packages = db.query_packages(device_id).unwrap();
    assert_eq!(packages.len(), 2);

    let names: Vec<&str> = packages.iter().map(|p| p.package_name.as_str()).collect();
    assert!(names.contains(&"com.example.one"));
    assert!(names.contains(&"com.example.two"));
}

#[test]
fn test_package_upsert_no_duplicates() {
    let mut db = open_db();
    let device_id = db.upsert_device("dev-001").unwrap();
    let session_id = db.create_session(device_id).unwrap();

    // Insert the same package twice.
    let events = vec![
        make_package_event(session_id, "com.example.app"),
        make_package_event(session_id, "com.example.app"),
    ];
    db.insert_events(&events).unwrap();

    let packages = db.query_packages(device_id).unwrap();
    assert_eq!(packages.len(), 1, "Upsert should not create duplicates");
}

#[test]
fn test_query_packages_empty() {
    let db = open_db();
    let device_id = db.upsert_device("dev-001").unwrap();
    let packages = db.query_packages(device_id).unwrap();
    assert!(packages.is_empty());
}

#[test]
fn test_upsert_package_directly() {
    let db = open_db();
    let device_id = db.upsert_device("dev-direct").unwrap();

    let pkg = Package {
        id: 0,
        device_id,
        package_name: "com.direct.test".to_string(),
        app_label: Some("Direct Test".to_string()),
        version_name: Some("2.0".to_string()),
        version_code: Some(200),
        is_system: false,
        is_enabled: true,
        installer: None,
        target_sdk: Some(33),
        min_sdk: Some(24),
        first_seen_at: String::new(),
        last_updated_at: String::new(),
    };

    db.upsert_package(&pkg).unwrap();

    let packages = db.query_packages(device_id).unwrap();
    assert_eq!(packages.len(), 1);
    assert_eq!(packages[0].package_name, "com.direct.test");
    assert_eq!(packages[0].version_name.as_deref(), Some("2.0"));
}

// ─── retention tests ─────────────────────────────────────────────────────────

#[test]
fn test_retention_deletes_old_logs() {
    let db = open_db();
    let device_id = db.upsert_device("dev-ret").unwrap();
    let session_id = db.create_session(device_id).unwrap();

    // Insert a log with an artificially old captured_at.
    db.conn()
        .execute(
            "INSERT INTO log_entry (session_id, level, tag, message, captured_at)
             VALUES (?1, 'I', 'OldTag', 'old message', datetime('now', '-10 days'))",
            rusqlite::params![session_id],
        )
        .unwrap();
    // Insert a recent log.
    db.conn()
        .execute(
            "INSERT INTO log_entry (session_id, level, tag, message, captured_at)
             VALUES (?1, 'I', 'NewTag', 'new message', datetime('now'))",
            rusqlite::params![session_id],
        )
        .unwrap();

    let before: i64 = db
        .conn()
        .query_row("SELECT COUNT(*) FROM log_entry", [], |r| r.get(0))
        .unwrap();
    assert_eq!(before, 2);

    let config = RetentionConfig {
        log_entry_days: 7,
        ..Default::default()
    };
    let stats = run_retention(db.conn(), &config).unwrap();
    assert_eq!(stats.log_entries_deleted, 1);

    let after: i64 = db
        .conn()
        .query_row("SELECT COUNT(*) FROM log_entry", [], |r| r.get(0))
        .unwrap();
    assert_eq!(after, 1);
}

#[test]
fn test_retention_keeps_recent_logs() {
    let db = open_db();
    let device_id = db.upsert_device("dev-ret2").unwrap();
    let session_id = db.create_session(device_id).unwrap();

    // Insert only recent logs.
    db.conn()
        .execute(
            "INSERT INTO log_entry (session_id, level, tag, message, captured_at)
             VALUES (?1, 'D', 'RecentTag', 'recent message', datetime('now'))",
            rusqlite::params![session_id],
        )
        .unwrap();

    let config = RetentionConfig::default();
    let stats = run_retention(db.conn(), &config).unwrap();
    assert_eq!(stats.log_entries_deleted, 0);

    let count: i64 = db
        .conn()
        .query_row("SELECT COUNT(*) FROM log_entry", [], |r| r.get(0))
        .unwrap();
    assert_eq!(count, 1);
}

// ─── parameterized query safety tests ────────────────────────────────────────

#[test]
fn test_sql_injection_in_tag_pattern_is_safe() {
    let db = open_db();
    let device_id = db.upsert_device("dev-inject").unwrap();
    let session_id = db.create_session(device_id).unwrap();

    db.conn()
        .execute(
            "INSERT INTO log_entry (session_id, level, tag, message, captured_at)
             VALUES (?1, 'I', 'SafeTag', 'safe message', datetime('now'))",
            rusqlite::params![session_id],
        )
        .unwrap();

    // This should not cause an error and should return 0 results.
    let logs = db
        .query_logs(&LogFilter {
            tag_pattern: Some("'; DROP TABLE log_entry; --".to_string()),
            ..Default::default()
        })
        .unwrap();
    assert_eq!(logs.len(), 0);

    // The table should still have its row.
    let count: i64 = db
        .conn()
        .query_row("SELECT COUNT(*) FROM log_entry", [], |r| r.get(0))
        .unwrap();
    assert_eq!(count, 1);
}
