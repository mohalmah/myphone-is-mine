use serde::{Deserialize, Serialize};
use tauri::{Emitter, State};
use crate::state::AppState;
use phonescope_adb::AdbShell;
use phonescope_events::LogLevel;
use std::sync::atomic::{AtomicI64, Ordering};

/// Monotonically increasing ID for frontend log entries.
static LOG_ENTRY_ID: AtomicI64 = AtomicI64::new(1);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionInfoDto {
    pub id: i64,
    pub serial: String,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub mode: String,
}

// ─── Frontend-compatible event DTOs ─────────────────────────────────────────
// The TypeScript frontend expects: { type, meta, data } where data is a
// LogEntry with single-char level, and meta is hoisted to the top level.

#[derive(Serialize, Clone)]
struct FrontendEventMeta {
    session_id: i64,
    timestamp: String,
    source: &'static str,
}

#[derive(Serialize, Clone)]
struct FrontendLogEntry {
    id: i64,
    session_id: i64,
    package_id: Option<i64>,
    level: &'static str,
    tag: Option<String>,
    message: String,
    pid: Option<i32>,
    tid: Option<i32>,
    captured_at: String,
}

#[derive(Serialize, Clone)]
struct FrontendLogEvent {
    #[serde(rename = "type")]
    event_type: &'static str,
    meta: FrontendEventMeta,
    data: FrontendLogEntry,
}

fn level_char(level: &LogLevel) -> &'static str {
    match level {
        LogLevel::Verbose => "V",
        LogLevel::Debug   => "D",
        LogLevel::Info    => "I",
        LogLevel::Warn    => "W",
        LogLevel::Error   => "E",
        LogLevel::Fatal   => "F",
        LogLevel::Silent  => "S",
    }
}

// ─── Commands ────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn start_session(
    serial: String,
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<SessionInfoDto, String> {
    let device_id = state.db.lock().unwrap()
        .upsert_device(&serial)
        .map_err(|e| e.to_string())?;

    let handle = {
        let core = state.core.lock().await;
        core.start_session(&serial).await.map_err(|e| e.to_string())?
    };

    let session_id = state.db.lock().unwrap()
        .create_session(device_id)
        .map_err(|e| e.to_string())?;

    // ── Spawn logcat streaming task ──────────────────────────────────────────
    let adb_path = state.adb_path.lock().unwrap().clone();
    let serial_for_logcat = serial.clone();
    let app = app_handle.clone();

    eprintln!("[phonescope] start_session: serial={serial_for_logcat} session_id={session_id} adb={adb_path}");

    let task = tokio::spawn(async move {
        eprintln!("[phonescope] logcat task spawned for serial={serial_for_logcat}");

        let shell = AdbShell::new(adb_path, &serial_for_logcat);
        let mut rx = match shell.logcat_stream(session_id).await {
            Ok(r) => {
                eprintln!("[phonescope] logcat_stream OK — waiting for log lines...");
                r
            }
            Err(e) => {
                eprintln!("[phonescope] logcat_stream FAILED: {e}");
                return;
            }
        };

        let mut count = 0u64;
        while let Some(log_event) = rx.recv().await {
            count += 1;
            let id = LOG_ENTRY_ID.fetch_add(1, Ordering::Relaxed);
            let ts = log_event.meta.timestamp.to_rfc3339();

            // Print first 5 events and then every 100th so the terminal isn't flooded
            if count <= 5 || count % 100 == 0 {
                eprintln!("[phonescope] logcat #{count}: [{level}] {tag}: {msg}",
                    level = level_char(&log_event.level),
                    tag = &log_event.tag,
                    msg = &log_event.message[..log_event.message.len().min(80)],
                );
            }

            let event = FrontendLogEvent {
                event_type: "Log",
                meta: FrontendEventMeta {
                    session_id: log_event.meta.session_id,
                    timestamp: ts.clone(),
                    source: "adb",
                },
                data: FrontendLogEntry {
                    id,
                    session_id: log_event.meta.session_id,
                    package_id: None,
                    level: level_char(&log_event.level),
                    tag: Some(log_event.tag.clone()),
                    message: log_event.message.clone(),
                    pid: log_event.pid,
                    tid: log_event.tid,
                    captured_at: ts,
                },
            };
            if let Err(e) = app.emit("device-event", &event) {
                eprintln!("[phonescope] emit error: {e}");
                break;
            }
            if count <= 5 {
                eprintln!("[phonescope] emit #{count} OK");
            }
        }

        eprintln!("[phonescope] logcat task ended after {count} events for serial={serial_for_logcat}");
    });

    // Store abort handle so we can cancel on stop_session
    state.logcat_tasks.lock().unwrap().insert(serial.clone(), task.abort_handle());

    let mode = format!("{:?}", handle.capabilities.mode).to_lowercase();
    eprintln!("[phonescope] session ready: id={session_id} mode={mode}");
    Ok(SessionInfoDto { id: session_id, serial, started_at: handle.started_at.to_rfc3339(), ended_at: None, mode })
}

#[tauri::command]
pub async fn stop_session(
    serial: String,
    session_id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    // Abort logcat streaming task
    eprintln!("[phonescope] stop_session: serial={serial} session_id={session_id}");
    if let Some(abort) = state.logcat_tasks.lock().unwrap().remove(&serial) {
        eprintln!("[phonescope] aborting logcat task for serial={serial}");
        abort.abort();
    } else {
        eprintln!("[phonescope] no logcat task found for serial={serial}");
    }

    { state.core.lock().await.stop_session(&serial).await.map_err(|e| e.to_string())?; }
    state.db.lock().unwrap().end_session(session_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_active_sessions(state: State<'_, AppState>) -> Result<Vec<SessionInfoDto>, String> {
    Ok(state.core.lock().await.active_sessions().into_iter().map(|h| SessionInfoDto {
        id: h.session_id,
        serial: h.serial.clone(),
        started_at: h.started_at.to_rfc3339(),
        ended_at: None,
        mode: format!("{:?}", h.capabilities.mode).to_lowercase(),
    }).collect())
}
