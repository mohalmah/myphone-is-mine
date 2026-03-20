use serde::{Deserialize, Serialize};
use tauri::State;
use crate::state::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionInfoDto {
    pub id: i64,
    pub serial: String,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub mode: String,
}

#[tauri::command]
pub async fn start_session(
    serial: String,
    state: State<'_, AppState>,
) -> Result<SessionInfoDto, String> {
    let device_id = state.db.lock().unwrap()
        .upsert_device(&serial)
        .map_err(|e| e.to_string())?;

    let handle = {
        let core = state.core.lock().unwrap();
        core.start_session(&serial).await.map_err(|e| e.to_string())?
    };

    let session_id = state.db.lock().unwrap()
        .create_session(device_id)
        .map_err(|e| e.to_string())?;

    let mode = format!("{:?}", handle.capabilities.mode).to_lowercase();
    Ok(SessionInfoDto { id: session_id, serial, started_at: handle.started_at.to_rfc3339(), ended_at: None, mode })
}

#[tauri::command]
pub async fn stop_session(
    serial: String,
    session_id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    { state.core.lock().unwrap().stop_session(&serial).await.map_err(|e| e.to_string())?; }
    state.db.lock().unwrap().end_session(session_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_active_sessions(state: State<'_, AppState>) -> Result<Vec<SessionInfoDto>, String> {
    Ok(state.core.lock().unwrap().active_sessions().into_iter().map(|h| SessionInfoDto {
        id: h.session_id,
        serial: h.serial.clone(),
        started_at: h.started_at.to_rfc3339(),
        ended_at: None,
        mode: format!("{:?}", h.capabilities.mode).to_lowercase(),
    }).collect())
}
