use serde::{Deserialize, Serialize};

/// Confidence level for a measurement or derived value.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum Confidence {
    /// The value is directly measured and reliable.
    Exact,
    /// The value is measured but may have minor inaccuracies.
    Approximate,
    /// The value is derived/inferred from indirect signals.
    Inferred,
    /// The value cannot be determined.
    Unavailable,
}

impl Default for Confidence {
    fn default() -> Self {
        Self::Approximate
    }
}
