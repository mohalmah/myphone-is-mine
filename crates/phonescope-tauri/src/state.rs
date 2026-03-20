//! Application state (stub — INT will implement).
use phonescope_core::{Config, PhoneScope};
use std::sync::Mutex;

pub struct AppState {
    pub phonescope: Mutex<PhoneScope>,
    pub config: std::sync::RwLock<Config>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            phonescope: Mutex::new(PhoneScope::new_in_memory()),
            config: std::sync::RwLock::new(Config::default()),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
