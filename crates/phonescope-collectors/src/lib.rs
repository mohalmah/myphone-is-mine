//! `phonescope-collectors` — data collectors for PhoneScope.
//!
//! Each collector implements the [`Collector`] trait and produces
//! [`DeviceEvent`]s which are forwarded to the session's event bus.
//!
//! # Collectors
//! - [`LogcatCollector`] — streams `adb logcat` output as [`LogEvent`]s.
//! - [`PackageCollector`] — snapshots installed packages as [`PackageEvent`]s.

pub mod logcat;
pub mod package;
pub mod traits;

pub use logcat::{parse_logcat_block, parse_logcat_line, LogcatCollector};
pub use package::{parse_pm_list_packages, PackageCollector};
pub use traits::{CapabilitySet, Collector, CollectorContext};

use thiserror::Error;

/// Crate-level error type.
#[derive(Debug, Error)]
pub enum Error {
    #[error("ADB error: {0}")]
    Adb(String),

    #[error("Parse error: {0}")]
    Parse(String),

    #[error("Event bus closed — session ended")]
    EventBusClosed,

    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
}

/// Crate-level result alias.
pub type Result<T> = std::result::Result<T, Error>;
