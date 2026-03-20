use serde::{Deserialize, Serialize};

use crate::{Confidence, EventMeta};

/// Process state as reported by the kernel.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum ProcessState {
    Running,
    Sleeping,
    Stopped,
    Zombie,
    Unknown,
}

impl ProcessState {
    pub fn from_char(c: char) -> Self {
        match c {
            'R' => Self::Running,
            'S' => Self::Sleeping,
            'T' => Self::Stopped,
            'Z' => Self::Zombie,
            _ => Self::Unknown,
        }
    }
}

/// A snapshot of process/CPU/RAM usage.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ProcessEvent {
    pub meta: EventMeta,
    pub total_cpu_percent: Option<f32>,
    pub total_ram_kb: Option<u64>,
    pub used_ram_kb: Option<u64>,
    pub processes: Vec<ProcessEntry>,
    pub confidence: Confidence,
}

/// A single process entry in a process snapshot.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ProcessEntry {
    pub pid: i32,
    pub name: String,
    pub package_name: Option<String>,
    pub cpu_percent: f32,
    pub rss_kb: u64,
    pub vss_kb: u64,
    pub threads: u32,
    pub state: ProcessState,
    pub oom_adj: Option<i32>,
}
