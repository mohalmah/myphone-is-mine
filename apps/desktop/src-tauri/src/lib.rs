use phonescope_tauri::AppState;

pub fn run() {
    let state = AppState::new();

    phonescope_tauri::build_app()
        .manage(state)
        .run(tauri::generate_context!())
        .expect("error while running PhoneScope");
}
