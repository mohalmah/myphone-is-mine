use serde::{Deserialize, Serialize};

use crate::{Confidence, EventMeta};

/// Battery health status as reported by Android.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum BatteryHealth {
    Good,
    Overheat,
    Dead,
    OverVoltage,
    UnspecifiedFailure,
    Cold,
    Unknown,
}

/// A battery sample event.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct BatteryEvent {
    pub meta: EventMeta,
    /// Battery percentage 0–100.
    pub level: u8,
    pub is_charging: bool,
    /// Temperature in Celsius.
    pub temperature_celsius: Option<f32>,
    /// Voltage in millivolts.
    pub voltage_mv: Option<f32>,
    /// Current in milliamps (negative = discharging).
    pub current_ma: Option<f32>,
    pub health: Option<BatteryHealth>,
    pub technology: Option<String>,
    pub capacity_mah: Option<f32>,
    pub confidence: Confidence,
}
