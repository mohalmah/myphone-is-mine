use serde::{Deserialize, Serialize};
use tauri::State;
use crate::state::AppState;
use phonescope_storage::{LogFilter, models::LogEntry};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LogFilterDto {
    pub level: Option<String>,
    pub tag: Option<String>,
    pub search: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[tauri::command]
pub fn get_logs(
    session_id: i64,
    filter: Option<LogFilterDto>,
    state: State<'_, AppState>,
) -> Result<Vec<LogEntry>, String> {
    let f = filter.unwrap_or_default();
    let db_filter = LogFilter {
        session_id: Some(session_id),
        level: f.level,
        tag_pattern: f.tag,
        message_search: f.search,
        captured_after: None,
        captured_before: None,
        offset: f.offset,
        limit: f.limit.or(Some(200)),
    };
    state.db.lock().unwrap().query_logs(&db_filter).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_log_tags(session_id: i64, state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let filter = LogFilter { session_id: Some(session_id), limit: Some(5000), ..LogFilter::default() };
    let logs = state.db.lock().unwrap().query_logs(&filter).map_err(|e| e.to_string())?;
    let mut tags: Vec<String> = logs
        .into_iter()
        .filter_map(|l| l.tag)
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();
    tags.sort();
    Ok(tags)
}

#[tauri::command]
pub fn clear_log_buffer(session_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    state.db.lock().unwrap().conn()
        .execute("DELETE FROM log_entry WHERE session_id = ?1", rusqlite::params![session_id])
        .map(|_| ())
        .map_err(|e| e.to_string())
}
