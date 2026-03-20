pub mod commands;
pub mod state;

pub use state::AppState;

use commands::{apps, device, logs, session, settings};

/// Build and return the configured Tauri Builder.
pub fn build_app() -> tauri::Builder<tauri::Wry> {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // Device
            device::list_devices,
            device::disconnect_device,
            device::get_capabilities,
            // Session
            session::start_session,
            session::stop_session,
            session::get_active_sessions,
            // Apps
            apps::list_packages,
            apps::force_stop,
            apps::clear_data,
            apps::disable_app,
            apps::uninstall_app,
            // Logs
            logs::get_logs,
            logs::get_log_tags,
            logs::clear_log_buffer,
            // Settings
            settings::get_settings,
            settings::update_settings,
            settings::get_adb_path,
            settings::set_adb_path,
        ])
}
