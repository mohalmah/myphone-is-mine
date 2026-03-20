use std::process::Stdio;

use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::mpsc;

use crate::{Error, Result};
use phonescope_events::{EventMeta, EventSource, LogEvent, LogLevel};

/// Executes ADB shell commands for a specific device.
#[derive(Debug, Clone)]
pub struct AdbShell {
    pub(crate) adb_path: String,
    pub(crate) serial: String,
}

impl AdbShell {
    /// Create a new shell handle for the given device serial.
    pub fn new(adb_path: impl Into<String>, serial: impl Into<String>) -> Self {
        Self {
            adb_path: adb_path.into(),
            serial: serial.into(),
        }
    }

    /// Execute a shell command and return stdout as a String.
    pub async fn exec(&self, cmd: &str) -> Result<String> {
        let output = Command::new(&self.adb_path)
            .args(["-s", &self.serial, "shell", cmd])
            .output()
            .await
            .map_err(|e| Error::SpawnFailed(e.to_string()))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr).into_owned();
            return Err(Error::CommandFailed {
                cmd: cmd.to_string(),
                stderr,
            });
        }

        Ok(String::from_utf8_lossy(&output.stdout).into_owned())
    }

    /// Execute an ADB-level command (not `adb shell`) and return stdout.
    pub async fn exec_adb(&self, args: &[&str]) -> Result<String> {
        let mut cmd_args = vec!["-s", &self.serial];
        cmd_args.extend_from_slice(args);

        let output = Command::new(&self.adb_path)
            .args(&cmd_args)
            .output()
            .await
            .map_err(|e| Error::SpawnFailed(e.to_string()))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr).into_owned();
            return Err(Error::CommandFailed {
                cmd: args.join(" "),
                stderr,
            });
        }

        Ok(String::from_utf8_lossy(&output.stdout).into_owned())
    }

    /// Stream logcat output, sending parsed `LogEvent`s to the returned receiver.
    ///
    /// Uses `adb logcat -v threadtime` format.
    /// The task runs until the receiver is dropped or the ADB process exits.
    pub async fn logcat_stream(
        &self,
        session_id: i64,
    ) -> Result<mpsc::Receiver<LogEvent>> {
        let (tx, rx) = mpsc::channel(512);

        let mut child = Command::new(&self.adb_path)
            .args(["-s", &self.serial, "logcat", "-v", "threadtime"])
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| Error::SpawnFailed(e.to_string()))?;

        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| Error::SpawnFailed("could not capture logcat stdout".into()))?;

        let reader = BufReader::new(stdout);
        let serial = self.serial.clone();

        tokio::spawn(async move {
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                if let Some(event) = parse_logcat_line(&line, session_id) {
                    if tx.send(event).await.is_err() {
                        break;
                    }
                }
            }
            tracing::debug!("logcat stream ended for {}", serial);
            // Ensure child is cleaned up.
            let _ = child.wait().await;
        });

        Ok(rx)
    }

    /// Check whether the device is rooted by examining `id` output.
    pub async fn is_rooted(&self) -> Result<bool> {
        let output = self.exec("id").await?;
        Ok(output.contains("uid=0"))
    }
}

/// Parse a single `adb logcat -v threadtime` line into a `LogEvent`.
///
/// Format: `MM-DD HH:MM:SS.mmm  PID   TID LEVEL TAG  : message`
/// Example: `03-20 12:34:56.789  1234  1235 W MyTag  : Something went wrong`
pub fn parse_logcat_line(line: &str, session_id: i64) -> Option<LogEvent> {
    // Threadtime format columns: date time pid tid level tag: message
    let line = line.trim();

    // Skip empty lines and dashes (logcat separator lines)
    if line.is_empty() || line.starts_with('-') {
        return None;
    }

    // Split into tokens up to the level field
    let mut parts = line.splitn(6, char::is_whitespace);
    let _date = parts.next()?; // MM-DD
    let _time = parts.next()?; // HH:MM:SS.mmm
    let pid_str = parts.next()?; // PID
    let tid_str = parts.next()?; // TID
    let level_str = parts.next()?; // single char level

    let rest = parts.next().unwrap_or("").trim_start();

    // Parse level
    let level = LogLevel::from_char(level_str.chars().next()?)?;

    // rest is "TAG  : message" — split on " : "
    let (tag, message) = if let Some(pos) = rest.find(": ") {
        let tag = rest[..pos].trim().to_string();
        let msg = rest[pos + 2..].to_string();
        (tag, msg)
    } else {
        (rest.to_string(), String::new())
    };

    let pid: Option<i32> = pid_str.parse().ok();
    let tid: Option<i32> = tid_str.parse().ok();

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

#[cfg(test)]
mod tests {
    use super::*;
    use phonescope_events::LogLevel;

    #[test]
    fn test_parse_logcat_line_warn() {
        let line = "03-20 12:34:56.789  1234  1235 W MyTag  : Something went wrong";
        let event = parse_logcat_line(line, 1).expect("should parse warn line");
        assert_eq!(event.level, LogLevel::Warn);
        assert_eq!(event.tag, "MyTag");
        assert_eq!(event.message, "Something went wrong");
        assert_eq!(event.pid, Some(1234));
        assert_eq!(event.tid, Some(1235));
    }

    #[test]
    fn test_parse_logcat_line_error() {
        let line = "03-20 08:00:00.001 99999 99999 E CrashHandler: FATAL EXCEPTION in main";
        let event = parse_logcat_line(line, 2).expect("should parse error line");
        assert_eq!(event.level, LogLevel::Error);
        assert_eq!(event.tag, "CrashHandler");
        assert!(event.message.contains("FATAL"));
    }

    #[test]
    fn test_parse_logcat_line_verbose() {
        let line = "03-20 09:00:00.000     1     2 V SomeTag : verbose message here";
        let event = parse_logcat_line(line, 1).expect("should parse verbose line");
        assert_eq!(event.level, LogLevel::Verbose);
    }

    #[test]
    fn test_parse_logcat_empty_line_returns_none() {
        assert!(parse_logcat_line("", 1).is_none());
        assert!(parse_logcat_line("   ", 1).is_none());
    }

    #[test]
    fn test_parse_logcat_separator_returns_none() {
        assert!(parse_logcat_line("--------- beginning of main", 1).is_none());
    }

    #[test]
    fn test_parse_logcat_info() {
        let line = "01-01 00:00:00.000  1000  1001 I ActivityManager: Displayed com.example/.MainActivity: +300ms";
        let event = parse_logcat_line(line, 5).expect("should parse info line");
        assert_eq!(event.level, LogLevel::Info);
        assert_eq!(event.tag, "ActivityManager");
    }
}
