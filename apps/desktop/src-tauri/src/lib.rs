use phonescope_tauri::state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState::default())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
