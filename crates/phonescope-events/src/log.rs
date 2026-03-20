use serde::{Deserialize, Serialize};

use crate::EventMeta;

/// Android logcat log level.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash, specta::Type)]
#[serde(rename_all = "UPPERCASE")]
pub enum LogLevel {
    Verbose,
    Debug,
    Info,
    Warn,
    Error,
    Fatal,
    Silent,
}

impl LogLevel {
    /// Parse a single-character log level as used in logcat output.
    pub fn from_char(c: char) -> Option<Self> {
        match c {
            'V' => Some(Self::Verbose),
            'D' => Some(Self::Debug),
            'I' => Some(Self::Info),
            'W' => Some(Self::Warn),
            'E' => Some(Self::Error),
            'F' => Some(Self::Fatal),
            'S' => Some(Self::Silent),
            _ => None,
        }
    }

    /// Return the single-character representation used in logcat.
    pub fn as_char(&self) -> char {
        match self {
            Self::Verbose => 'V',
            Self::Debug => 'D',
            Self::Info => 'I',
            Self::Warn => 'W',
            Self::Error => 'E',
            Self::Fatal => 'F',
            Self::Silent => 'S',
        }
    }
}

/// A single logcat log line.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct LogEvent {
    pub meta: EventMeta,
    pub level: LogLevel,
    pub tag: String,
    pub message: String,
    pub pid: Option<i32>,
    pub tid: Option<i32>,
    pub package_name: Option<String>,
}
