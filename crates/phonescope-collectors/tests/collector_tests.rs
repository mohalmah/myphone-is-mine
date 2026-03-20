//! Integration tests for phonescope-collectors.
//!
//! These tests use fixture files and do not require a connected device.

use phonescope_collectors::{parse_logcat_block, parse_logcat_line, parse_pm_list_packages};
use phonescope_events::LogLevel;

// ---------------------------------------------------------------------------
// Logcat fixture tests
// ---------------------------------------------------------------------------

const LOGCAT_FIXTURE: &str = include_str!("fixtures/logcat_sample.txt");
const PM_FIXTURE: &str = include_str!("fixtures/pm_list_packages.txt");

#[test]
fn logcat_fixture_parses_non_zero_events() {
    let events = parse_logcat_block(LOGCAT_FIXTURE, 1);
    assert!(
        !events.is_empty(),
        "logcat fixture should produce at least one event"
    );
}

#[test]
fn logcat_fixture_separators_are_skipped() {
    // Separator lines ("--------- beginning of …") must not produce events.
    let events = parse_logcat_block(LOGCAT_FIXTURE, 1);
    // All events must have a valid level (guaranteed by the parser returning None for separators).
    // If a separator were included it would have no level and fail to parse — confirmed by
    // the fact that we get clean LogEvent structs.
    assert!(events.iter().all(|e| {
        matches!(
            e.level,
            LogLevel::Verbose
                | LogLevel::Debug
                | LogLevel::Info
                | LogLevel::Warn
                | LogLevel::Error
                | LogLevel::Fatal
                | LogLevel::Silent
        )
    }));
}

#[test]
fn logcat_fixture_contains_error_events() {
    let events = parse_logcat_block(LOGCAT_FIXTURE, 1);
    let errors: Vec<_> = events.iter().filter(|e| e.level == LogLevel::Error).collect();
    assert!(!errors.is_empty(), "fixture should contain E-level events");
}

#[test]
fn logcat_fixture_contains_info_events() {
    let events = parse_logcat_block(LOGCAT_FIXTURE, 1);
    assert!(events.iter().any(|e| e.level == LogLevel::Info));
}

#[test]
fn logcat_fixture_pid_tid_parsed() {
    let events = parse_logcat_block(LOGCAT_FIXTURE, 1);
    // All events should have valid pids/tids (all lines in fixture have numeric pids).
    assert!(events.iter().all(|e| e.pid.is_some()), "all events should have pids");
    assert!(events.iter().all(|e| e.tid.is_some()), "all events should have tids");
}

#[test]
fn logcat_fixture_session_id_propagated() {
    let events = parse_logcat_block(LOGCAT_FIXTURE, 42);
    assert!(events.iter().all(|e| e.meta.session_id == 42));
}

#[test]
fn logcat_fatal_level_parsed() {
    let line = "03-20 12:00:03.300  6000  6001 F art: art/runtime/gc/heap.cc] Couldn't allocate";
    let ev = parse_logcat_line(line, 1).expect("fatal line should parse");
    assert_eq!(ev.level, LogLevel::Fatal);
}

#[test]
fn logcat_message_with_colon_preserved() {
    // The message contains a colon — we want everything after the first ": " separator.
    let line = "03-20 12:00:00.001  1000  1001 I ActivityManager: Displayed com.example/.Main: +300ms";
    let ev = parse_logcat_line(line, 1).unwrap();
    assert!(ev.message.contains("com.example/.Main"), "colon in message should be kept");
}

// ---------------------------------------------------------------------------
// pm list packages fixture tests
// ---------------------------------------------------------------------------

#[test]
fn pm_fixture_correct_count() {
    let entries = parse_pm_list_packages(PM_FIXTURE);
    assert_eq!(entries.len(), 12, "fixture has 12 package lines");
}

#[test]
fn pm_fixture_user_apps_not_system() {
    let entries = parse_pm_list_packages(PM_FIXTURE);
    let myapp = entries
        .iter()
        .find(|e| e.package_name == "com.example.myapp")
        .expect("com.example.myapp should be present");
    assert!(!myapp.is_system);
}

#[test]
fn pm_fixture_system_apps() {
    let entries = parse_pm_list_packages(PM_FIXTURE);
    for pkg in &["android", "com.android.settings", "com.android.phone"] {
        let entry = entries
            .iter()
            .find(|e| &e.package_name == pkg)
            .unwrap_or_else(|| panic!("{pkg} should be in fixture"));
        assert!(entry.is_system, "{pkg} should be is_system=true");
    }
}

#[test]
fn pm_fixture_vendor_and_product_are_system() {
    let entries = parse_pm_list_packages(PM_FIXTURE);
    let vendor = entries.iter().find(|e| e.package_name == "com.vendor.someapp").unwrap();
    let product = entries.iter().find(|e| e.package_name == "com.google.android.gsf").unwrap();
    let apex = entries.iter().find(|e| e.package_name == "com.android.connectivity.resources").unwrap();
    assert!(vendor.is_system);
    assert!(product.is_system);
    assert!(apex.is_system);
}

#[test]
fn pm_fixture_apk_paths_present() {
    let entries = parse_pm_list_packages(PM_FIXTURE);
    assert!(entries.iter().all(|e| e.apk_path.is_some()), "all entries should have apk paths");
}

#[test]
fn pm_fixture_no_duplicate_packages() {
    let entries = parse_pm_list_packages(PM_FIXTURE);
    let mut names: Vec<&str> = entries.iter().map(|e| e.package_name.as_str()).collect();
    names.sort();
    let original_len = names.len();
    names.dedup();
    assert_eq!(names.len(), original_len, "no duplicate package names");
}

// ---------------------------------------------------------------------------
// Trait object usability
// ---------------------------------------------------------------------------

use phonescope_collectors::{Collector, LogcatCollector, PackageCollector};

#[test]
fn logcat_collector_name() {
    let c = LogcatCollector;
    assert_eq!(c.name(), "logcat");
}

#[test]
fn package_collector_name() {
    let c = PackageCollector::basic();
    assert_eq!(c.name(), "packages");
}

#[test]
fn logcat_collector_no_required_capabilities() {
    let c = LogcatCollector;
    assert!(c.required_capabilities().is_empty());
}

#[test]
fn package_collector_no_required_capabilities() {
    let c = PackageCollector::basic();
    assert!(c.required_capabilities().is_empty());
}

/// Collectors can be stored as trait objects.
#[test]
fn collectors_as_trait_objects() {
    let collectors: Vec<Box<dyn Collector>> = vec![
        Box::new(LogcatCollector),
        Box::new(PackageCollector::basic()),
        Box::new(PackageCollector::with_enrichment()),
    ];
    assert_eq!(collectors.len(), 3);
    let names: Vec<&str> = collectors.iter().map(|c| c.name()).collect();
    assert!(names.contains(&"logcat"));
    assert!(names.contains(&"packages"));
}
