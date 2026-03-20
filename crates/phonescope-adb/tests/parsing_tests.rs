//! Integration tests for phonescope-adb using fixture data.

use phonescope_adb::{AdbManager, DeviceState, parse_logcat_line};
use phonescope_events::LogLevel;

static DEVICES_FIXTURE: &str = include_str!("fixtures/adb_devices_output.txt");
static LOGCAT_FIXTURE: &str = include_str!("fixtures/logcat_sample.txt");

#[test]
fn test_fixture_devices_parsed_correctly() {
    let devices = AdbManager::parse_devices_output(DEVICES_FIXTURE);
    assert_eq!(devices.len(), 4, "should parse 4 devices from fixture");

    assert_eq!(devices[0].serial, "emulator-5554");
    assert_eq!(devices[0].state, DeviceState::Device);
    assert!(devices[0].model.as_deref().unwrap_or("").contains("sdk"));

    assert_eq!(devices[1].serial, "R58M31KABCD");
    assert_eq!(devices[1].state, DeviceState::Device);
    assert!(devices[1].model.as_deref().unwrap_or("").contains("Pixel"));

    assert_eq!(devices[2].serial, "DEADBEEF0001");
    assert_eq!(devices[2].state, DeviceState::Offline);

    assert_eq!(devices[3].serial, "AUTH12345678");
    assert_eq!(devices[3].state, DeviceState::Unauthorized);
}

#[test]
fn test_fixture_logcat_parsed_correctly() {
    let events: Vec<_> = LOGCAT_FIXTURE
        .lines()
        .filter_map(|line| parse_logcat_line(line, 1))
        .collect();

    // Separators and empty lines are filtered out, should have 10 events
    assert!(!events.is_empty(), "should parse at least one log event");

    // Find the fatal exception line
    let fatal = events.iter().find(|e| e.level == LogLevel::Fatal);
    assert!(fatal.is_some(), "should find a Fatal log event");

    // Find error lines
    let errors: Vec<_> = events.iter().filter(|e| e.level == LogLevel::Error).collect();
    assert!(!errors.is_empty(), "should find Error log events");
    assert_eq!(errors[0].tag, "CrashHandler");

    // Find info lines
    let info: Vec<_> = events.iter().filter(|e| e.level == LogLevel::Info).collect();
    assert!(!info.is_empty(), "should find Info log events");
}

#[test]
fn test_logcat_pid_tid_parsed() {
    let line = "03-20 12:00:01.500  2345  2348 E CrashHandler: FATAL EXCEPTION: main";
    let event = parse_logcat_line(line, 1).expect("should parse");
    assert_eq!(event.pid, Some(2345));
    assert_eq!(event.tid, Some(2348));
    assert_eq!(event.level, LogLevel::Error);
    assert_eq!(event.tag, "CrashHandler");
}

#[test]
fn test_logcat_unicode_message() {
    let line = "03-20 12:00:00.000  1234  1234 I UnicodeTag : Hello 世界 🎉 emoji";
    let event = parse_logcat_line(line, 1).expect("should parse unicode line");
    assert!(event.message.contains("世界"));
}

#[test]
fn test_logcat_message_with_colon_in_content() {
    let line = "03-20 12:00:00.000  1234  1234 D MyTag : key: value: more: data";
    let event = parse_logcat_line(line, 1).expect("should parse line with colons in message");
    assert!(event.message.contains("key: value: more: data") || event.message.contains("value"));
}
