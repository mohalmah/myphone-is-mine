use serde::{Deserialize, Serialize};

use crate::{Confidence, EventMeta};

/// Thermal throttling status for a thermal zone.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum ThrottlingStatus {
    None,
    Light,
    Moderate,
    Severe,
    Critical,
    Shutdown,
}

impl Default for ThrottlingStatus {
    fn default() -> Self {
        Self::None
    }
}

/// A thermal sample event, covering one or more thermal zones.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ThermalEvent {
    pub meta: EventMeta,
    pub zones: Vec<ThermalZone>,
    pub confidence: Confidence,
}

/// A single thermal zone reading.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ThermalZone {
    pub zone_name: String,
    pub temperature_celsius: f32,
    pub throttling_status: ThrottlingStatus,
}
