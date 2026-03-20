//! LogcatCollector — streams `adb logcat -v threadtime` and emits `LogEvent`s.

use async_trait::async_trait;
use phonescope_events::{DeviceEvent, EventMeta, EventSource, LogEvent, LogLevel};
use tracing::{debug, warn};

use crate::{
    traits::{CapabilitySet, Collector, CollectorContext},
    Result,
};

/// Streams Android logcat output and converts each line into a `LogEvent`.
///
/// Uses `adb logcat -v threadtime` format:
/// ```text
/// MM-DD HH:MM:SS.mmm  PID   TID LEVEL TAG  : message
/// ```
pub struct LogcatCollector;

#[async_trait]
impl Collector for LogcatCollector {
    fn name(&self) -> &str {
        "logcat"
    }

    fn required_capabilities(&self) -> CapabilitySet {
        // Standard ADB logcat requires no special capabilities.
        CapabilitySet::new()
    }

    /// LogcatCollector has no meaningful `collect_once` — it is inherently a stream.
    /// Returns an empty vec; callers should use `collect_stream` instead.
    async fn collect_once(&self, _ctx: &CollectorContext) -> Result<Vec<DeviceEvent>> {
        Ok(vec![])
    }

    /// Stream logcat lines, converting each to a `LogEvent` and forwarding it
    /// to the event bus until the session ends (event_tx closed) or ADB exits.
    async fn collect_stream(&self, ctx: &CollectorContext) -> Result<()> {
        let mut rx = ctx
            .shell
            .logcat_stream(ctx.session_id)
            .await
            .map_err(|e| crate::Error::Adb(e.to_string()))?;

        debug!(collector = "logcat", session_id = ctx.session_id, "logcat stream started");

        while let Some(log_event) = rx.recv().await {
            let device_event = DeviceEvent::Log(log_event);
            if ctx.event_tx.send(device_event).await.is_err() {
                debug!(collector = "logcat", "event_tx closed — stopping stream");
                break;
            }
        }

        debug!(collector = "logcat", "logcat stream ended");
        Ok(())
    }

    fn default_interval_ms(&self) -> u64 {
        // Not used for streaming collector.
        1_000
    }
}

// ---------------------------------------------------------------------------
// Logcat line parser (public for use in tests and by phonescope-adb)
// ---------------------------------------------------------------------------

/// Parse a single `adb logcat -v threadtime` line into a `LogEvent`.
///
/// Format: `MM-DD HH:MM:SS.mmm  PID   TID LEVEL TAG  : message`
///
/// Returns `None` for blank lines, separator lines (`--------- beginning of …`),
/// and any line that cannot be parsed.
pub fn parse_logcat_line(line: &str, session_id: i64) -> Option<LogEvent> {
    let line = line.trim();

    if line.is_empty() || line.starts_with('-') {
        return None;
    }

    // Threadtime columns: date time pid tid level rest…
    // We use splitn so that the message part (which may contain spaces) is kept intact.
    let mut parts = line.splitn(6, |c: char| c == ' ' || c == '\t');

    let _date = parts.next()?; // MM-DD
    // Skip empty tokens caused by multiple spaces between columns.
    let _time = skip_empty(&mut parts)?; // HH:MM:SS.mmm
    let pid_str = skip_empty(&mut parts)?; // PID
    let tid_str = skip_empty(&mut parts)?; // TID
    let level_str = skip_empty(&mut parts)?; // single char level

    let rest = parts.next().unwrap_or("").trim_start();
    let level = LogLevel::from_char(level_str.chars().next()?)?;

    // rest is "TAG  : message" or "TAG: message"
    let (tag, message) = if let Some(pos) = rest.find(": ") {
        let tag = rest[..pos].trim().to_string();
        let msg = rest[pos + 2..].to_string();
        (tag, msg)
    } else {
        // No ": " separator — treat whole rest as tag with empty message.
        (rest.trim().to_string(), String::new())
    };

    // Filter out tags that are empty (can happen with malformed lines).
    if tag.is_empty() && message.is_empty() {
        return None;
    }

    let pid: Option<i32> = pid_str.trim().parse().ok();
    let tid: Option<i32> = tid_str.trim().parse().ok();

    Some(LogEvent {
        meta: EventMeta {
            session_id,
            timestamp: chrono::Utc::now(),
            source: EventSource::Adb,
        },
        level,
        tag,
        message,
        pid,
        tid,
        package_name: None,
    })
}

/// Advance the iterator past any empty/whitespace-only tokens and return the next non-empty one.
fn skip_empty<'a>(iter: &mut impl Iterator<Item = &'a str>) -> Option<&'a str> {
    loop {
        match iter.next() {
            None => return None,
            Some(s) if s.trim().is_empty() => continue,
            Some(s) => return Some(s),
        }
    }
}

/// Parse a contiguous block of logcat output (multiple lines) into a `Vec<LogEvent>`.
///
/// Useful for batch-processing fixture data in tests.
pub fn parse_logcat_block(text: &str, session_id: i64) -> Vec<LogEvent> {
    text.lines()
        .filter_map(|line| parse_logcat_line(line, session_id))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use phonescope_events::LogLevel;

    #[test]
    fn parse_warn_line() {
        let line = "03-20 12:34:56.789  1234  1235 W MyTag  : Something went wrong";
        let ev = parse_logcat_line(line, 1).expect("warn line");
        assert_eq!(ev.level, LogLevel::Warn);
        assert_eq!(ev.tag, "MyTag");
        assert_eq!(ev.message, "Something went wrong");
        assert_eq!(ev.pid, Some(1234));
        assert_eq!(ev.tid, Some(1235));
    }

    #[test]
    fn parse_error_line() {
        let line = "03-20 08:00:00.001 99999 99999 E CrashHandler: FATAL EXCEPTION in main";
        let ev = parse_logcat_line(line, 2).expect("error line");
        assert_eq!(ev.level, LogLevel::Error);
        assert_eq!(ev.tag, "CrashHandler");
        assert!(ev.message.contains("FATAL"));
    }

    #[test]
    fn parse_verbose_line() {
        let line = "03-20 09:00:00.000     1     2 V SomeTag : verbose message here";
        let ev = parse_logcat_line(line, 1).expect("verbose line");
        assert_eq!(ev.level, LogLevel::Verbose);
    }

    #[test]
    fn parse_info_colon_in_message() {
        let line = "01-01 00:00:00.000  1000  1001 I ActivityManager: Displayed com.example/.MainActivity: +300ms";
        let ev = parse_logcat_line(line, 5).expect("info line");
        assert_eq!(ev.level, LogLevel::Info);
        assert_eq!(ev.tag, "ActivityManager");
        // Colon inside message should be preserved
        assert!(ev.message.contains("com.example"));
    }

    #[test]
    fn blank_lines_return_none() {
        assert!(parse_logcat_line("", 1).is_none());
        assert!(parse_logcat_line("   ", 1).is_none());
    }

    #[test]
    fn separator_lines_return_none() {
        assert!(parse_logcat_line("--------- beginning of main", 1).is_none());
        assert!(parse_logcat_line("--------- beginning of system", 1).is_none());
    }

    #[test]
    fn parse_fatal_line() {
        let line = "03-20 10:00:00.000  5555  5556 F AndroidRuntime: FATAL EXCEPTION: main";
        let ev = parse_logcat_line(line, 1).expect("fatal line");
        assert_eq!(ev.level, LogLevel::Fatal);
        assert_eq!(ev.tag, "AndroidRuntime");
    }

    #[test]
    fn parse_debug_unicode_message() {
        let line = "03-20 11:00:00.000  2000  2001 D UnicodeTag : Héllo wörld 🌍";
        let ev = parse_logcat_line(line, 1).expect("unicode line");
        assert_eq!(ev.level, LogLevel::Debug);
        assert!(ev.message.contains("Héllo"));
    }

    #[test]
    fn parse_block_counts_correctly() {
        let block = "03-20 12:00:00.000  100  101 I TagA: msg1\n\
                     --------- beginning of main\n\
                     03-20 12:00:01.000  100  101 W TagB: msg2\n\
                     \n\
                     03-20 12:00:02.000  100  101 E TagC: msg3";
        let events = parse_logcat_block(block, 1);
        assert_eq!(events.len(), 3);
        assert_eq!(events[0].level, LogLevel::Info);
        assert_eq!(events[1].level, LogLevel::Warn);
        assert_eq!(events[2].level, LogLevel::Error);
    }
}
