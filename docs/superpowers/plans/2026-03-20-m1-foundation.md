# M1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete M1 Foundation — workspace scaffold, all event types, ADB layer, SQLite storage, React shell, and wire them end-to-end so a user can connect an Android device, stream logcat, list apps, and force-stop an app.

**Architecture:** Greenfield Rust workspace + Tauri 2 + React 19. Four parallel tracks: T1 (events + ADB + core), T2 (storage), T3 (collectors), T4 (frontend), INT (workspace + Tauri IPC + CI). T1/phonescope-events is a hard prerequisite for all other Rust crates — it must ship first.

**Tech Stack:** Rust 2021/1.82+, Tauri 2, React 19, TypeScript 5, taurpc 0.5, rusqlite 0.32, rusqlite_migration 2.4, Zustand, TanStack Query, TanStack Table, TanStack Virtual, TailwindCSS, Vitest, Playwright

---

## TRACK INT-W1: Workspace & CI Scaffold

**Files:**
- Create: `Cargo.toml` (workspace root)
- Create: `rust-toolchain.toml`
- Create: `.rustfmt.toml`
- Create: `clippy.toml`
- Create: `.gitignore`
- Create: `.github/workflows/ci.yml`
- Create: `xtask/Cargo.toml`
- Create: `xtask/src/main.rs`
- Create: `docs/migration-registry.md`

### Task INT-1: Create Cargo workspace root

- [ ] **Step 1: Create `Cargo.toml`**

```toml
[workspace]
resolver = "2"
members = [
    "crates/phonescope-events",
    "crates/phonescope-adb",
    "crates/phonescope-storage",
    "crates/phonescope-collectors",
    "crates/phonescope-process",
    "crates/phonescope-proxy",
    "crates/phonescope-analytics",
    "crates/phonescope-insights",
    "crates/phonescope-usage",
    "crates/phonescope-helper-protocol",
    "crates/phonescope-core",
    "crates/phonescope-tauri",
    "apps/desktop/src-tauri",
    "xtask",
]

[workspace.package]
version = "0.1.0"
edition = "2021"
license = "MIT"
rust-version = "1.82"

[workspace.dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
chrono = { version = "0.4", features = ["serde"] }
thiserror = "2"
anyhow = "1"
tracing = "0.1"
tracing-subscriber = "0.3"
rusqlite = { version = "0.32", features = ["bundled", "serde_json"] }
rusqlite_migration = "2.4"
tokio-tungstenite = "0.24"
uuid = { version = "1", features = ["v4", "serde"] }
taurpc = "0.5"
tauri = "2"
tauri-plugin-shell = "2"
specta = "2"
bitflags = "2"
async-trait = "0.1"
futures = "0.3"
r2d2 = "0.8"
r2d2_sqlite = "0.25"
```

- [ ] **Step 2: Create `rust-toolchain.toml`**

```toml
[toolchain]
channel = "1.82"
```

- [ ] **Step 3: Create `.rustfmt.toml`**

```toml
edition = "2021"
max_width = 100
```

- [ ] **Step 4: Create `clippy.toml`**

```toml
msrv = "1.82"
```

- [ ] **Step 5: Create `.gitignore`**

```
/target
/apps/desktop/node_modules
/apps/desktop/dist
/apps/desktop/src-tauri/target
/apps/desktop/src-tauri/binaries
*.db
*.db-shm
*.db-wal
.DS_Store
```

- [ ] **Step 6: Create `xtask/Cargo.toml`**

```toml
[package]
name = "xtask"
version.workspace = true
edition.workspace = true

[[bin]]
name = "xtask"
path = "src/main.rs"

[dependencies]
anyhow.workspace = true
```

- [ ] **Step 7: Create `xtask/src/main.rs`**

```rust
fn main() -> anyhow::Result<()> {
    let task = std::env::args().nth(1);
    match task.as_deref() {
        Some("fetch-mitmproxy") => fetch_mitmproxy(),
        _ => {
            eprintln!("Usage: cargo xtask <task>");
            eprintln!("Tasks: fetch-mitmproxy");
            Ok(())
        }
    }
}

fn fetch_mitmproxy() -> anyhow::Result<()> {
    println!("fetch-mitmproxy: not yet implemented");
    Ok(())
}
```

- [ ] **Step 8: Create stub crate directories so workspace compiles**

Create minimal `Cargo.toml` + `src/lib.rs` for each of these (they'll be filled in by other tasks):
- `crates/phonescope-events/`
- `crates/phonescope-adb/`
- `crates/phonescope-storage/`
- `crates/phonescope-collectors/`
- `crates/phonescope-process/`
- `crates/phonescope-proxy/`
- `crates/phonescope-analytics/`
- `crates/phonescope-insights/`
- `crates/phonescope-usage/`
- `crates/phonescope-helper-protocol/`
- `crates/phonescope-core/`
- `crates/phonescope-tauri/`

Each stub `Cargo.toml`:
```toml
[package]
name = "phonescope-CRATE"
version.workspace = true
edition.workspace = true

[dependencies]
```

Each stub `src/lib.rs`:
```rust
// stub
```

- [ ] **Step 9: Verify workspace compiles**

Run: `cargo build --workspace`
Expected: compiles (all stubs)

- [ ] **Step 10: Create CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
  pull_request:

jobs:
  rust:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@1.82
      - uses: Swatinem/rust-cache@v2
      - run: cargo check --workspace
      - run: cargo clippy --workspace -- -D warnings
      - run: cargo test --workspace

  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/desktop
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          cache-dependency-path: apps/desktop/pnpm-lock.yaml
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test
```

- [ ] **Step 11: Create migration registry doc**

Create `docs/migration-registry.md`:

```markdown
# Migration Registry

Sequential list of all database migrations. Only one team adds per week.

| # | Description | Owner | Week |
|---|-------------|-------|------|
| 001 | Foundation tables (device, session, package, app_permission, log_entry) | T2 | W2 |
```

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: INT-W1 — workspace scaffold, CI, xtask skeleton"
```

---

## TRACK T1-W1: phonescope-events Crate

**Files:**
- Create: `crates/phonescope-events/Cargo.toml`
- Create: `crates/phonescope-events/src/lib.rs`
- Create: `crates/phonescope-events/src/confidence.rs`
- Create: `crates/phonescope-events/src/app.rs`
- Create: `crates/phonescope-events/src/log.rs`
- Create: `crates/phonescope-events/src/package.rs`
- Create: `crates/phonescope-events/src/network.rs`
- Create: `crates/phonescope-events/src/http.rs`
- Create: `crates/phonescope-events/src/dns.rs`
- Create: `crates/phonescope-events/src/battery.rs`
- Create: `crates/phonescope-events/src/storage.rs`
- Create: `crates/phonescope-events/src/process.rs`
- Create: `crates/phonescope-events/src/thermal.rs`
- Create: `crates/phonescope-events/src/usage.rs`
- Create: `crates/phonescope-events/src/insight.rs`

### Task T1-1: phonescope-events crate

- [ ] **Step 1: Create `Cargo.toml`**

```toml
[package]
name = "phonescope-events"
version.workspace = true
edition.workspace = true

[dependencies]
serde.workspace = true
chrono.workspace = true
specta.workspace = true
```

- [ ] **Step 2: Write failing test for Confidence round-trip**

In `crates/phonescope-events/src/lib.rs` (tests module at the bottom):

```rust
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn confidence_serde_round_trip() {
        let c = Confidence::Exact;
        let json = serde_json::to_string(&c).unwrap();
        let back: Confidence = serde_json::from_str(&json).unwrap();
        assert_eq!(c, back);
    }
}
```

- [ ] **Step 3: Run test — expect compile failure**

Run: `cargo test -p phonescope-events 2>&1 | head -20`
Expected: error — Confidence not defined

- [ ] **Step 4: Implement `confidence.rs`**

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
pub enum Confidence {
    Exact,
    Approximate,
    Inferred,
    Unavailable,
}
```

- [ ] **Step 5: Implement `app.rs`**

```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use crate::{Confidence, EventMeta};

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct AppEvent {
    pub meta: EventMeta,
    pub package_name: String,
    pub app_label: Option<String>,
    pub event_type: AppEventType,
    pub confidence: Confidence,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub enum AppEventType {
    Launched,
    Backgrounded,
    Foregrounded,
    Stopped,
    Crashed,
}
```

- [ ] **Step 6: Implement `log.rs`**

```rust
use serde::{Deserialize, Serialize};
use crate::EventMeta;

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct LogEvent {
    pub meta: EventMeta,
    pub level: LogLevel,
    pub tag: String,
    pub message: String,
    pub pid: i32,
    pub tid: i32,
    pub package_name: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
pub enum LogLevel {
    Verbose,
    Debug,
    Info,
    Warn,
    Error,
    Fatal,
}
```

- [ ] **Step 7: Implement `package.rs`**

```rust
use serde::{Deserialize, Serialize};
use crate::EventMeta;

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct PackageEvent {
    pub meta: EventMeta,
    pub package_name: String,
    pub app_label: Option<String>,
    pub version_name: Option<String>,
    pub version_code: Option<i64>,
    pub is_system: bool,
    pub is_enabled: bool,
    pub installer: Option<String>,
    pub target_sdk: Option<i32>,
    pub min_sdk: Option<i32>,
    pub event_type: PackageEventType,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
pub enum PackageEventType {
    Installed,
    Updated,
    Removed,
    Enabled,
    Disabled,
    Listed,
}
```

- [ ] **Step 8: Implement `network.rs`**

```rust
use serde::{Deserialize, Serialize};
use crate::{Confidence, EventMeta};

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct NetworkFlowEvent {
    pub meta: EventMeta,
    pub package_name: Option<String>,
    pub remote_host: Option<String>,
    pub remote_ip: Option<String>,
    pub remote_port: u16,
    pub protocol: Protocol,
    pub direction: Direction,
    pub bytes_sent: u64,
    pub bytes_received: u64,
    pub confidence: Confidence,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
pub enum Protocol { Tcp, Udp }

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
pub enum Direction { Outbound, Inbound }
```

- [ ] **Step 9: Implement `http.rs`**

```rust
use serde::{Deserialize, Serialize};
use crate::EventMeta;

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct HttpRequestEvent {
    pub meta: EventMeta,
    pub package_name: Option<String>,
    pub method: String,
    pub url: String,
    pub host: String,
    pub path: String,
    pub status_code: Option<u16>,
    pub request_size: Option<i64>,
    pub response_size: Option<i64>,
    pub content_type: Option<String>,
    pub duration_ms: Option<i64>,
    pub is_tls: bool,
    pub har_entry_json: Option<String>,
}
```

- [ ] **Step 10: Implement `dns.rs`**

```rust
use serde::{Deserialize, Serialize};
use crate::EventMeta;

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct DnsEvent {
    pub meta: EventMeta,
    pub package_name: Option<String>,
    pub query_name: String,
    pub query_type: String,
    pub resolved_ips: Vec<String>,
    pub response_code: Option<i32>,
    pub duration_ms: Option<i64>,
}
```

- [ ] **Step 11: Implement `battery.rs`**

```rust
use serde::{Deserialize, Serialize};
use crate::{Confidence, EventMeta};

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct BatteryEvent {
    pub meta: EventMeta,
    pub level: u8,
    pub is_charging: bool,
    pub temperature: Option<f32>,
    pub voltage: Option<f32>,
    pub current_ma: Option<f32>,
    pub health: Option<String>,
    pub technology: Option<String>,
    pub confidence: Confidence,
}
```

- [ ] **Step 12: Implement `storage.rs`**

```rust
use serde::{Deserialize, Serialize};
use crate::{Confidence, EventMeta};

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct StorageEvent {
    pub meta: EventMeta,
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub free_bytes: u64,
    pub confidence: Confidence,
}
```

- [ ] **Step 13: Implement `process.rs`**

```rust
use serde::{Deserialize, Serialize};
use crate::EventMeta;

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ProcessEvent {
    pub meta: EventMeta,
    pub pid: i32,
    pub name: String,
    pub package_name: Option<String>,
    pub cpu_percent: f32,
    pub rss_kb: i64,
    pub vss_kb: i64,
    pub threads: i32,
    pub state: ProcessState,
    pub oom_adj: Option<i32>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
pub enum ProcessState { Running, Sleeping, Stopped, Zombie }
```

- [ ] **Step 14: Implement `thermal.rs`**

```rust
use serde::{Deserialize, Serialize};
use crate::EventMeta;

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ThermalEvent {
    pub meta: EventMeta,
    pub zone_name: String,
    pub temperature_celsius: f32,
    pub throttling_status: ThrottlingStatus,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
pub enum ThrottlingStatus { None, Light, Moderate, Severe, Critical, Shutdown }
```

- [ ] **Step 15: Implement `usage.rs`**

```rust
use serde::{Deserialize, Serialize};
use crate::EventMeta;

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct AppUsageEvent {
    pub meta: EventMeta,
    pub package_name: String,
    pub foreground_time_ms: i64,
    pub background_time_ms: i64,
    pub launch_count: i32,
    pub notifications_posted: i32,
    pub last_time_used: Option<String>,
    pub category: Option<AppCategory>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
pub enum AppCategory {
    Social, Productivity, Games, Entertainment, Communication,
    News, Shopping, Finance, Health, Education, Travel, Utilities, Other,
}
```

- [ ] **Step 16: Implement `insight.rs`**

```rust
use serde::{Deserialize, Serialize};
use crate::{Confidence, EventMeta};

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct InsightEvent {
    pub meta: EventMeta,
    pub package_name: Option<String>,
    pub category: InsightCategory,
    pub severity: InsightSeverity,
    pub title: String,
    pub description: String,
    pub technical_detail: Option<String>,
    pub confidence: Confidence,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
pub enum InsightCategory {
    Network, Battery, Storage, Privacy, Behavior, Usage, Thermal, Resource,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
pub enum InsightSeverity { Info, Warning, Critical }
```

- [ ] **Step 17: Implement `lib.rs` — glue it all together**

```rust
pub mod confidence;
pub mod app;
pub mod log;
pub mod package;
pub mod network;
pub mod http;
pub mod dns;
pub mod battery;
pub mod storage;
pub mod process;
pub mod thermal;
pub mod usage;
pub mod insight;

pub use confidence::Confidence;
pub use app::{AppEvent, AppEventType};
pub use log::{LogEvent, LogLevel};
pub use package::{PackageEvent, PackageEventType};
pub use network::{NetworkFlowEvent, Protocol, Direction};
pub use http::HttpRequestEvent;
pub use dns::DnsEvent;
pub use battery::BatteryEvent;
pub use storage::StorageEvent;
pub use process::{ProcessEvent, ProcessState};
pub use thermal::{ThermalEvent, ThrottlingStatus};
pub use usage::{AppUsageEvent, AppCategory};
pub use insight::{InsightEvent, InsightCategory, InsightSeverity};

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub enum DeviceEvent {
    App(AppEvent),
    NetworkFlow(NetworkFlowEvent),
    HttpRequest(HttpRequestEvent),
    Dns(DnsEvent),
    Battery(BatteryEvent),
    Storage(StorageEvent),
    Package(PackageEvent),
    Log(LogEvent),
    Process(ProcessEvent),
    Thermal(ThermalEvent),
    AppUsage(AppUsageEvent),
    Insight(InsightEvent),
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct EventMeta {
    pub session_id: i64,
    pub timestamp: DateTime<Utc>,
    pub source: EventSource,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
pub enum EventSource {
    Adb,
    HelperApp,
    Proxy,
    RootShell,
    Synthetic,
}

impl EventMeta {
    pub fn new(session_id: i64, source: EventSource) -> Self {
        Self {
            session_id,
            timestamp: Utc::now(),
            source,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn confidence_serde_round_trip() {
        for c in [Confidence::Exact, Confidence::Approximate, Confidence::Inferred, Confidence::Unavailable] {
            let json = serde_json::to_string(&c).unwrap();
            let back: Confidence = serde_json::from_str(&json).unwrap();
            assert_eq!(c, back);
        }
    }

    #[test]
    fn device_event_log_round_trip() {
        let event = DeviceEvent::Log(LogEvent {
            meta: EventMeta::new(1, EventSource::Adb),
            level: LogLevel::Info,
            tag: "MyTag".to_string(),
            message: "hello world".to_string(),
            pid: 1234,
            tid: 1234,
            package_name: Some("com.example.app".to_string()),
        });
        let json = serde_json::to_string(&event).unwrap();
        let back: DeviceEvent = serde_json::from_str(&json).unwrap();
        assert!(matches!(back, DeviceEvent::Log(_)));
    }

    #[test]
    fn device_event_battery_round_trip() {
        let event = DeviceEvent::Battery(BatteryEvent {
            meta: EventMeta::new(1, EventSource::Adb),
            level: 85,
            is_charging: false,
            temperature: Some(32.5),
            voltage: Some(4.1),
            current_ma: None,
            health: Some("good".to_string()),
            technology: Some("Li-ion".to_string()),
            confidence: Confidence::Exact,
        });
        let json = serde_json::to_string(&event).unwrap();
        let back: DeviceEvent = serde_json::from_str(&json).unwrap();
        assert!(matches!(back, DeviceEvent::Battery(_)));
    }
}
```

- [ ] **Step 18: Run tests**

Run: `cargo test -p phonescope-events`
Expected: all tests pass

- [ ] **Step 19: Clippy**

Run: `cargo clippy -p phonescope-events -- -D warnings`
Expected: no warnings

- [ ] **Step 20: Commit**

```bash
git add crates/phonescope-events/
git commit -m "feat: T1-W1 — phonescope-events crate with all event types"
```

---

## TRACK T2-W2: phonescope-storage Crate

*Prerequisite: phonescope-events must be committed first.*

**Files:**
- Modify: `crates/phonescope-storage/Cargo.toml`
- Create: `crates/phonescope-storage/src/lib.rs`
- Create: `crates/phonescope-storage/src/migrations.rs`
- Create: `crates/phonescope-storage/src/models.rs`
- Create: `crates/phonescope-storage/src/queries.rs`
- Create: `crates/phonescope-storage/src/retention.rs`
- Test: `crates/phonescope-storage/tests/storage_tests.rs`

### Task T2-1: Storage crate

- [ ] **Step 1: Update `Cargo.toml`**

```toml
[package]
name = "phonescope-storage"
version.workspace = true
edition.workspace = true

[dependencies]
phonescope-events = { path = "../phonescope-events" }
serde.workspace = true
serde_json.workspace = true
chrono.workspace = true
thiserror.workspace = true
tracing.workspace = true
rusqlite.workspace = true
rusqlite_migration.workspace = true
tokio.workspace = true

[dev-dependencies]
tokio = { workspace = true, features = ["test-util"] }
```

- [ ] **Step 2: Write failing integration test**

Create `crates/phonescope-storage/tests/storage_tests.rs`:

```rust
use phonescope_storage::Database;

#[test]
fn open_in_memory_and_migrate() {
    let db = Database::open_in_memory().expect("failed to open");
    // If migrations ran, this query should succeed
    let count: i64 = db.conn().query_row(
        "SELECT COUNT(*) FROM device",
        [],
        |r| r.get(0),
    ).expect("device table should exist");
    assert_eq!(count, 0);
}

#[test]
fn insert_and_query_device() {
    let db = Database::open_in_memory().unwrap();
    let id = db.upsert_device("emulator-5554", Some("Pixel 7"), Some("Google"),
                              Some("14"), Some(34), false, false).unwrap();
    assert!(id > 0);
    let devices = db.list_devices().unwrap();
    assert_eq!(devices.len(), 1);
    assert_eq!(devices[0].serial, "emulator-5554");
}

#[test]
fn insert_and_query_log_entries() {
    use phonescope_events::{LogEvent, LogLevel, EventMeta, EventSource};
    use chrono::Utc;
    let db = Database::open_in_memory().unwrap();
    let dev_id = db.upsert_device("emu", None, None, None, None, false, false).unwrap();
    let sess_id = db.create_session(dev_id, 0, "basic").unwrap();

    let event = LogEvent {
        meta: EventMeta { session_id: sess_id, timestamp: Utc::now(), source: EventSource::Adb },
        level: LogLevel::Info,
        tag: "MyTag".to_string(),
        message: "test message".to_string(),
        pid: 100,
        tid: 100,
        package_name: None,
    };
    db.insert_log_event(&event).unwrap();

    let logs = db.query_logs(sess_id, None, None, None, 10, 0).unwrap();
    assert_eq!(logs.len(), 1);
    assert_eq!(logs[0].message, "test message");
}
```

- [ ] **Step 3: Run — expect compile fail**

Run: `cargo test -p phonescope-storage 2>&1 | head -10`
Expected: compile error — Database not found

- [ ] **Step 4: Implement `migrations.rs`**

```rust
use rusqlite_migration::{Migrations, M};

pub static MIGRATIONS: Migrations<'static> = Migrations::new(vec![
    M::up("
        CREATE TABLE IF NOT EXISTS device (
            id              INTEGER PRIMARY KEY,
            serial          TEXT NOT NULL UNIQUE,
            model           TEXT,
            manufacturer    TEXT,
            android_version TEXT,
            sdk_level       INTEGER,
            is_rooted       INTEGER NOT NULL DEFAULT 0,
            has_helper      INTEGER NOT NULL DEFAULT 0,
            first_seen_at   TEXT NOT NULL DEFAULT (datetime('now')),
            last_seen_at    TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS session (
            id              INTEGER PRIMARY KEY,
            device_id       INTEGER NOT NULL REFERENCES device(id),
            started_at      TEXT NOT NULL DEFAULT (datetime('now')),
            ended_at        TEXT,
            capability_mask INTEGER NOT NULL DEFAULT 0,
            mode            TEXT NOT NULL DEFAULT 'basic'
        );
        CREATE TABLE IF NOT EXISTS package (
            id              INTEGER PRIMARY KEY,
            device_id       INTEGER NOT NULL REFERENCES device(id),
            package_name    TEXT NOT NULL,
            app_label       TEXT,
            version_name    TEXT,
            version_code    INTEGER,
            is_system       INTEGER NOT NULL DEFAULT 0,
            is_enabled      INTEGER NOT NULL DEFAULT 1,
            installer       TEXT,
            target_sdk      INTEGER,
            min_sdk         INTEGER,
            first_seen_at   TEXT NOT NULL DEFAULT (datetime('now')),
            last_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(device_id, package_name)
        );
        CREATE TABLE IF NOT EXISTS app_permission (
            id          INTEGER PRIMARY KEY,
            package_id  INTEGER NOT NULL REFERENCES package(id),
            permission  TEXT NOT NULL,
            is_granted  INTEGER NOT NULL DEFAULT 0,
            captured_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS log_entry (
            id          INTEGER PRIMARY KEY,
            session_id  INTEGER NOT NULL REFERENCES session(id),
            package_id  INTEGER REFERENCES package(id),
            level       TEXT NOT NULL,
            tag         TEXT,
            message     TEXT NOT NULL,
            pid         INTEGER,
            tid         INTEGER,
            captured_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_log_session_level ON log_entry(session_id, level);
        CREATE INDEX IF NOT EXISTS idx_log_package ON log_entry(package_id);
        CREATE INDEX IF NOT EXISTS idx_log_captured ON log_entry(captured_at);
        CREATE INDEX IF NOT EXISTS idx_package_device ON package(device_id);
    "),
]);
```

- [ ] **Step 5: Implement `models.rs`**

```rust
#[derive(Debug, Clone)]
pub struct DeviceRow {
    pub id: i64,
    pub serial: String,
    pub model: Option<String>,
    pub manufacturer: Option<String>,
    pub android_version: Option<String>,
    pub sdk_level: Option<i32>,
    pub is_rooted: bool,
    pub has_helper: bool,
}

#[derive(Debug, Clone)]
pub struct SessionRow {
    pub id: i64,
    pub device_id: i64,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub mode: String,
}

#[derive(Debug, Clone)]
pub struct LogEntryRow {
    pub id: i64,
    pub session_id: i64,
    pub level: String,
    pub tag: Option<String>,
    pub message: String,
    pub pid: Option<i32>,
    pub tid: Option<i32>,
    pub captured_at: String,
}

#[derive(Debug, Clone)]
pub struct PackageRow {
    pub id: i64,
    pub device_id: i64,
    pub package_name: String,
    pub app_label: Option<String>,
    pub version_name: Option<String>,
    pub version_code: Option<i64>,
    pub is_system: bool,
    pub is_enabled: bool,
}
```

- [ ] **Step 6: Implement `queries.rs`**

```rust
use rusqlite::{Connection, params};
use crate::models::{DeviceRow, LogEntryRow, PackageRow, SessionRow};
use crate::error::Result;

pub fn upsert_device(
    conn: &Connection,
    serial: &str,
    model: Option<&str>,
    manufacturer: Option<&str>,
    android_version: Option<&str>,
    sdk_level: Option<i32>,
    is_rooted: bool,
    has_helper: bool,
) -> Result<i64> {
    conn.execute(
        "INSERT INTO device (serial, model, manufacturer, android_version, sdk_level, is_rooted, has_helper, last_seen_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'))
         ON CONFLICT(serial) DO UPDATE SET
             model=excluded.model, manufacturer=excluded.manufacturer,
             android_version=excluded.android_version, sdk_level=excluded.sdk_level,
             is_rooted=excluded.is_rooted, has_helper=excluded.has_helper,
             last_seen_at=excluded.last_seen_at",
        params![serial, model, manufacturer, android_version, sdk_level,
                is_rooted as i32, has_helper as i32],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn list_devices(conn: &Connection) -> Result<Vec<DeviceRow>> {
    let mut stmt = conn.prepare(
        "SELECT id, serial, model, manufacturer, android_version, sdk_level, is_rooted, has_helper FROM device ORDER BY last_seen_at DESC"
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(DeviceRow {
            id: row.get(0)?,
            serial: row.get(1)?,
            model: row.get(2)?,
            manufacturer: row.get(3)?,
            android_version: row.get(4)?,
            sdk_level: row.get(5)?,
            is_rooted: row.get::<_, i32>(6)? != 0,
            has_helper: row.get::<_, i32>(7)? != 0,
        })
    })?;
    rows.collect::<rusqlite::Result<Vec<_>>>().map_err(Into::into)
}

pub fn create_session(conn: &Connection, device_id: i64, capability_mask: i64, mode: &str) -> Result<i64> {
    conn.execute(
        "INSERT INTO session (device_id, capability_mask, mode) VALUES (?1, ?2, ?3)",
        params![device_id, capability_mask, mode],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn end_session(conn: &Connection, session_id: i64) -> Result<()> {
    conn.execute(
        "UPDATE session SET ended_at = datetime('now') WHERE id = ?1",
        params![session_id],
    )?;
    Ok(())
}

pub fn insert_log_event(conn: &Connection, session_id: i64, level: &str, tag: &str, message: &str, pid: i32, tid: i32, captured_at: &str) -> Result<i64> {
    conn.execute(
        "INSERT INTO log_entry (session_id, level, tag, message, pid, tid, captured_at) VALUES (?1,?2,?3,?4,?5,?6,?7)",
        params![session_id, level, tag, message, pid, tid, captured_at],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn query_logs(conn: &Connection, session_id: i64, level_filter: Option<&str>, tag_filter: Option<&str>, search: Option<&str>, limit: i64, offset: i64) -> Result<Vec<LogEntryRow>> {
    // Build dynamic query with optional filters
    let mut sql = "SELECT id, session_id, level, tag, message, pid, tid, captured_at FROM log_entry WHERE session_id = ?1".to_string();
    if level_filter.is_some() { sql.push_str(" AND level = ?2"); }
    if tag_filter.is_some() { sql.push_str(" AND tag LIKE ?3"); }
    if search.is_some() { sql.push_str(" AND message LIKE ?4"); }
    sql.push_str(" ORDER BY captured_at DESC LIMIT ?5 OFFSET ?6");

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(
        params![
            session_id,
            level_filter.unwrap_or(""),
            tag_filter.map(|t| format!("%{t}%")).unwrap_or_default(),
            search.map(|s| format!("%{s}%")).unwrap_or_default(),
            limit,
            offset
        ],
        |row| Ok(LogEntryRow {
            id: row.get(0)?,
            session_id: row.get(1)?,
            level: row.get(2)?,
            tag: row.get(3)?,
            message: row.get(4)?,
            pid: row.get(5)?,
            tid: row.get(6)?,
            captured_at: row.get(7)?,
        }),
    )?;
    rows.collect::<rusqlite::Result<Vec<_>>>().map_err(Into::into)
}

pub fn upsert_package(conn: &Connection, device_id: i64, package_name: &str, app_label: Option<&str>, version_name: Option<&str>, version_code: Option<i64>, is_system: bool, is_enabled: bool, installer: Option<&str>, target_sdk: Option<i32>, min_sdk: Option<i32>) -> Result<i64> {
    conn.execute(
        "INSERT INTO package (device_id, package_name, app_label, version_name, version_code, is_system, is_enabled, installer, target_sdk, min_sdk)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)
         ON CONFLICT(device_id, package_name) DO UPDATE SET
             app_label=excluded.app_label, version_name=excluded.version_name,
             version_code=excluded.version_code, is_system=excluded.is_system,
             is_enabled=excluded.is_enabled, installer=excluded.installer,
             target_sdk=excluded.target_sdk, min_sdk=excluded.min_sdk,
             last_updated_at=datetime('now')",
        params![device_id, package_name, app_label, version_name, version_code,
                is_system as i32, is_enabled as i32, installer, target_sdk, min_sdk],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn list_packages(conn: &Connection, device_id: i64) -> Result<Vec<PackageRow>> {
    let mut stmt = conn.prepare(
        "SELECT id, device_id, package_name, app_label, version_name, version_code, is_system, is_enabled FROM package WHERE device_id = ?1 ORDER BY package_name"
    )?;
    let rows = stmt.query_map(params![device_id], |row| Ok(PackageRow {
        id: row.get(0)?,
        device_id: row.get(1)?,
        package_name: row.get(2)?,
        app_label: row.get(3)?,
        version_name: row.get(4)?,
        version_code: row.get(5)?,
        is_system: row.get::<_, i32>(6)? != 0,
        is_enabled: row.get::<_, i32>(7)? != 0,
    }))?;
    rows.collect::<rusqlite::Result<Vec<_>>>().map_err(Into::into)
}
```

- [ ] **Step 7: Implement `retention.rs`**

```rust
use rusqlite::{Connection, params};
use crate::error::Result;

pub fn run_retention(conn: &Connection) -> Result<()> {
    conn.execute(
        "DELETE FROM log_entry WHERE captured_at < datetime('now', '-7 days')",
        [],
    )?;
    Ok(())
}
```

- [ ] **Step 8: Implement `lib.rs`**

```rust
pub mod migrations;
pub mod models;
pub mod queries;
pub mod retention;

mod error {
    use thiserror::Error;
    #[derive(Debug, Error)]
    pub enum Error {
        #[error("sqlite: {0}")]
        Sqlite(#[from] rusqlite::Error),
        #[error("migration: {0}")]
        Migration(#[from] rusqlite_migration::Error),
    }
    pub type Result<T> = std::result::Result<T, Error>;
}
pub use error::{Error, Result};

use rusqlite::Connection;
use crate::models::{DeviceRow, LogEntryRow, PackageRow};
use phonescope_events::LogEvent;

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn open_in_memory() -> Result<Self> {
        let mut conn = Connection::open_in_memory()?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        migrations::MIGRATIONS.to_latest(&mut conn)?;
        Ok(Self { conn })
    }

    pub fn open(path: &std::path::Path) -> Result<Self> {
        let mut conn = Connection::open(path)?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "synchronous", "NORMAL")?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        conn.pragma_update(None, "busy_timeout", 5000)?;
        migrations::MIGRATIONS.to_latest(&mut conn)?;
        Ok(Self { conn })
    }

    pub fn conn(&self) -> &Connection { &self.conn }

    pub fn upsert_device(&self, serial: &str, model: Option<&str>, manufacturer: Option<&str>, android_version: Option<&str>, sdk_level: Option<i32>, is_rooted: bool, has_helper: bool) -> Result<i64> {
        queries::upsert_device(&self.conn, serial, model, manufacturer, android_version, sdk_level, is_rooted, has_helper)
    }

    pub fn list_devices(&self) -> Result<Vec<DeviceRow>> {
        queries::list_devices(&self.conn)
    }

    pub fn create_session(&self, device_id: i64, capability_mask: i64, mode: &str) -> Result<i64> {
        queries::create_session(&self.conn, device_id, capability_mask, mode)
    }

    pub fn end_session(&self, session_id: i64) -> Result<()> {
        queries::end_session(&self.conn, session_id)
    }

    pub fn insert_log_event(&self, event: &LogEvent) -> Result<i64> {
        let level = format!("{:?}", event.level);
        let ts = event.meta.timestamp.to_rfc3339();
        queries::insert_log_event(&self.conn, event.meta.session_id, &level, &event.tag, &event.message, event.pid, event.tid, &ts)
    }

    pub fn query_logs(&self, session_id: i64, level: Option<&str>, tag: Option<&str>, search: Option<&str>, limit: i64, offset: i64) -> Result<Vec<LogEntryRow>> {
        queries::query_logs(&self.conn, session_id, level, tag, search, limit, offset)
    }

    pub fn upsert_package(&self, device_id: i64, pkg: &phonescope_events::PackageEvent) -> Result<i64> {
        queries::upsert_package(&self.conn, device_id, &pkg.package_name, pkg.app_label.as_deref(), pkg.version_name.as_deref(), pkg.version_code, pkg.is_system, pkg.is_enabled, pkg.installer.as_deref(), pkg.target_sdk, pkg.min_sdk)
    }

    pub fn list_packages(&self, device_id: i64) -> Result<Vec<PackageRow>> {
        queries::list_packages(&self.conn, device_id)
    }

    pub fn run_retention(&self) -> Result<()> {
        retention::run_retention(&self.conn)
    }
}
```

- [ ] **Step 9: Run tests**

Run: `cargo test -p phonescope-storage`
Expected: all 3 tests pass

- [ ] **Step 10: Commit**

```bash
git add crates/phonescope-storage/
git commit -m "feat: T2-W2 — phonescope-storage with migrations, insert/query"
```

---

## TRACK T1-W2: phonescope-adb Crate

**Files:**
- Modify: `crates/phonescope-adb/Cargo.toml`
- Create: `crates/phonescope-adb/src/lib.rs`
- Create: `crates/phonescope-adb/src/device.rs`
- Create: `crates/phonescope-adb/src/shell.rs`
- Create: `crates/phonescope-adb/src/port_forward.rs`
- Create: `crates/phonescope-adb/src/file_ops.rs`
- Create: `crates/phonescope-adb/tests/fixtures/device_list.txt`
- Create: `crates/phonescope-adb/tests/fixtures/logcat_sample.txt`
- Test: `crates/phonescope-adb/tests/adb_tests.rs`

### Task T1-2: ADB crate

- [ ] **Step 1: Update `Cargo.toml`**

```toml
[package]
name = "phonescope-adb"
version.workspace = true
edition.workspace = true

[dependencies]
phonescope-events = { path = "../phonescope-events" }
serde.workspace = true
chrono.workspace = true
thiserror.workspace = true
tracing.workspace = true
tokio.workspace = true
anyhow.workspace = true
```

- [ ] **Step 2: Create test fixtures**

`crates/phonescope-adb/tests/fixtures/device_list.txt`:
```
List of devices attached
emulator-5554	device
192.168.1.100:5555	device product:sdk_gphone64_arm64 model:sdk_gphone64_arm64 device:emu64a transport_id:1
```

`crates/phonescope-adb/tests/fixtures/logcat_sample.txt`:
```
03-20 14:23:45.123  1234  1234 I MyTag   : Hello world
03-20 14:23:45.456  1234  1235 W ActivityManager: Force stopping com.example.app
03-20 14:23:45.789  5678  5678 E AndroidRuntime: FATAL EXCEPTION: main
```

- [ ] **Step 3: Write failing tests**

`crates/phonescope-adb/tests/adb_tests.rs`:

```rust
use phonescope_adb::{parse_device_list, parse_logcat_line};

#[test]
fn parse_device_list_from_fixture() {
    let input = include_str!("fixtures/device_list.txt");
    let devices = parse_device_list(input);
    assert_eq!(devices.len(), 2);
    assert_eq!(devices[0].serial, "emulator-5554");
    assert_eq!(devices[1].serial, "192.168.1.100:5555");
}

#[test]
fn parse_logcat_line_info() {
    let line = "03-20 14:23:45.123  1234  1234 I MyTag   : Hello world";
    let parsed = parse_logcat_line(line).expect("should parse");
    assert_eq!(parsed.tag, "MyTag");
    assert_eq!(parsed.message, "Hello world");
    assert_eq!(format!("{:?}", parsed.level), "Info");
    assert_eq!(parsed.pid, 1234);
}

#[test]
fn parse_logcat_line_warn() {
    let line = "03-20 14:23:45.456  1234  1235 W ActivityManager: Force stopping com.example.app";
    let parsed = parse_logcat_line(line).expect("should parse");
    assert_eq!(parsed.tag, "ActivityManager");
    assert_eq!(format!("{:?}", parsed.level), "Warn");
}

#[test]
fn parse_logcat_ignores_header_line() {
    let line = "--------- beginning of system";
    assert!(parse_logcat_line(line).is_none());
}
```

- [ ] **Step 4: Run — expect compile fail**

Run: `cargo test -p phonescope-adb 2>&1 | head -5`

- [ ] **Step 5: Implement `device.rs`**

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub serial: String,
    pub state: DeviceState,
    pub model: Option<String>,
    pub product: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum DeviceState {
    Device,
    Offline,
    Unauthorized,
    Unknown,
}

pub fn parse_device_list(output: &str) -> Vec<DeviceInfo> {
    output
        .lines()
        .filter(|l| !l.starts_with("List of devices") && !l.trim().is_empty())
        .filter_map(|line| {
            let mut parts = line.splitn(2, '\t');
            let serial = parts.next()?.trim().to_string();
            let rest = parts.next().unwrap_or("").trim();
            let state = match rest.split_whitespace().next().unwrap_or("") {
                "device" => DeviceState::Device,
                "offline" => DeviceState::Offline,
                "unauthorized" => DeviceState::Unauthorized,
                _ => DeviceState::Unknown,
            };
            let model = rest.split_whitespace()
                .find(|s| s.starts_with("model:"))
                .map(|s| s.trim_start_matches("model:").to_string());
            Some(DeviceInfo { serial, state, model, product: None })
        })
        .collect()
}
```

- [ ] **Step 6: Implement `shell.rs`**

```rust
use std::process::Stdio;
use tokio::process::Command;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio_stream::wrappers::LinesStream;
use futures::Stream;
use crate::error::{Error, Result};
use phonescope_events::{LogEvent, LogLevel, EventMeta, EventSource};
use chrono::Utc;

pub struct AdbShell {
    pub serial: String,
    pub adb_path: String,
}

impl AdbShell {
    pub fn new(serial: impl Into<String>, adb_path: impl Into<String>) -> Self {
        Self { serial: serial.into(), adb_path: adb_path.into() }
    }

    pub async fn exec(&self, cmd: &str) -> Result<String> {
        let output = Command::new(&self.adb_path)
            .args(["-s", &self.serial, "shell", cmd])
            .output()
            .await?;
        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).into_owned())
        } else {
            Err(Error::AdbCommand(String::from_utf8_lossy(&output.stderr).into_owned()))
        }
    }

    pub async fn is_rooted(&self) -> bool {
        self.exec("id").await
            .map(|out| out.contains("uid=0"))
            .unwrap_or(false)
    }
}

pub struct ParsedLogLine {
    pub level: LogLevel,
    pub tag: String,
    pub message: String,
    pub pid: i32,
    pub tid: i32,
}

pub fn parse_logcat_line(line: &str) -> Option<ParsedLogLine> {
    // Skip header/separator lines
    if line.starts_with('-') || line.trim().is_empty() {
        return None;
    }
    // Format: MM-DD HH:MM:SS.mmm  PID  TID LEVEL TAG  : MESSAGE
    let rest = line.get(18..)?; // skip date+time
    let mut parts = rest.splitn(2, ' ').collect::<Vec<_>>();
    // re-parse more carefully
    let tokens: Vec<&str> = line.split_whitespace().collect();
    if tokens.len() < 6 { return None; }
    let pid: i32 = tokens[2].parse().ok()?;
    let tid: i32 = tokens[3].parse().ok()?;
    let level = match tokens[4] {
        "V" => LogLevel::Verbose,
        "D" => LogLevel::Debug,
        "I" => LogLevel::Info,
        "W" => LogLevel::Warn,
        "E" => LogLevel::Error,
        "F" => LogLevel::Fatal,
        _ => return None,
    };
    let tag = tokens[5].trim_end_matches(':').to_string();
    // message is everything after "TAG  : "
    let msg_start = line.find(&format!("{}: ", tag))
        .or_else(|| line.find(&format!("{}  : ", tag)))
        .or_else(|| line.find(": "))?;
    let message = line[msg_start + tag.len() + 2..].trim_start_matches(": ").trim().to_string();
    Some(ParsedLogLine { level, tag, message, pid, tid })
}
```

- [ ] **Step 7: Implement error type + `lib.rs`**

```rust
// src/lib.rs
pub mod device;
pub mod shell;
pub mod port_forward;
pub mod file_ops;

mod error {
    use thiserror::Error;
    #[derive(Debug, Error)]
    pub enum Error {
        #[error("io: {0}")]
        Io(#[from] std::io::Error),
        #[error("adb command failed: {0}")]
        AdbCommand(String),
        #[error("adb not found at path")]
        AdbNotFound,
    }
    pub type Result<T> = std::result::Result<T, Error>;
}
pub use error::{Error, Result};
pub use device::{DeviceInfo, DeviceState, parse_device_list};
pub use shell::{AdbShell, ParsedLogLine, parse_logcat_line};

use tokio::process::Command;

pub struct AdbManager {
    pub adb_path: String,
}

impl AdbManager {
    pub fn new(adb_path: impl Into<String>) -> Self {
        Self { adb_path: adb_path.into() }
    }

    pub fn detect() -> Self {
        // Try common locations
        for path in ["adb", "/usr/bin/adb", "/usr/local/bin/adb"] {
            if std::process::Command::new(path).arg("version").output().is_ok() {
                return Self::new(path);
            }
        }
        Self::new("adb")
    }

    pub async fn list_devices(&self) -> Result<Vec<DeviceInfo>> {
        let output = Command::new(&self.adb_path)
            .arg("devices")
            .arg("-l")
            .output()
            .await?;
        let text = String::from_utf8_lossy(&output.stdout);
        Ok(parse_device_list(&text))
    }
}
```

- [ ] **Step 8: Add stub `port_forward.rs` and `file_ops.rs`**

```rust
// port_forward.rs
pub struct PortForwarder;
impl PortForwarder {
    pub async fn forward(_adb: &str, _serial: &str, _local: u16, _remote: u16) -> crate::Result<()> {
        Ok(()) // stub
    }
}
```

```rust
// file_ops.rs
pub struct FileOps;
impl FileOps {
    pub async fn push(_adb: &str, _serial: &str, _local: &std::path::Path, _remote: &str) -> crate::Result<()> {
        Ok(()) // stub
    }
}
```

- [ ] **Step 9: Run tests**

Run: `cargo test -p phonescope-adb`
Expected: all 4 tests pass

- [ ] **Step 10: Commit**

```bash
git add crates/phonescope-adb/
git commit -m "feat: T1-W2 — phonescope-adb with device listing and logcat parsing"
```

---

## TRACK T4-W1+W2: React Frontend Shell

**Files:**
- Create: `apps/desktop/package.json`
- Create: `apps/desktop/vite.config.ts`
- Create: `apps/desktop/tsconfig.json`
- Create: `apps/desktop/tailwind.config.ts`
- Create: `apps/desktop/postcss.config.js`
- Create: `apps/desktop/index.html`
- Create: `apps/desktop/src/main.tsx`
- Create: `apps/desktop/src/App.tsx`
- Create: `apps/desktop/src/router.tsx`
- Create: `apps/desktop/src/stores/deviceStore.ts`
- Create: `apps/desktop/src/stores/uiStore.ts`
- Create: `apps/desktop/src/stores/sessionStore.ts`
- Create: `apps/desktop/src/stores/settingsStore.ts`
- Create: `apps/desktop/src/components/layout/Sidebar.tsx`
- Create: `apps/desktop/src/components/layout/Header.tsx`
- Create: `apps/desktop/src/components/common/Badge.tsx`
- Create: `apps/desktop/src/components/common/DataTable.tsx`
- Create: `apps/desktop/src/services/mockData.ts`
- Create: `apps/desktop/src/pages/OverviewPage.tsx`
- Create: `apps/desktop/src/pages/LogsPage.tsx`
- Create: `apps/desktop/src/pages/AppsPage.tsx`
- Create: `apps/desktop/src/pages/ControlsPage.tsx`
- Create: `apps/desktop/src/pages/SettingsPage.tsx`
- Create: `apps/desktop/vitest.config.ts`
- Test: `apps/desktop/src/components/common/Badge.test.tsx`

### Task T4-1: Frontend project setup

- [ ] **Step 1: Create `apps/desktop/package.json`**

```json
{
  "name": "phonescope-desktop",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^6.22.0",
    "zustand": "^5.0.0",
    "@tanstack/react-query": "^5.0.0",
    "@tanstack/react-table": "^8.0.0",
    "@tanstack/react-virtual": "^3.0.0",
    "recharts": "^2.12.0",
    "zod": "^3.22.0",
    "clsx": "^2.1.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "vitest": "^1.5.0",
    "@testing-library/react": "^15.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "jsdom": "^24.0.0"
  }
}
```

- [ ] **Step 2: Install deps**

```bash
cd apps/desktop && pnpm install
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  clearScreen: false,
  server: { port: 1420, strictPort: true },
})
```

- [ ] **Step 5: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
})
```

- [ ] **Step 6: Create `apps/desktop/src/test-setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 7: Create `tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: { extend: {} },
  plugins: [],
} satisfies Config
```

- [ ] **Step 8: Create `postcss.config.js`**

```javascript
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
}
```

- [ ] **Step 9: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PhoneScope</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 10: Write failing test for Badge component**

Create `apps/desktop/src/components/common/Badge.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

test('renders badge with label', () => {
  render(<Badge label="INFO" variant="info" />)
  expect(screen.getByText('INFO')).toBeInTheDocument()
})

test('renders error badge with red styling', () => {
  render(<Badge label="ERROR" variant="error" />)
  const el = screen.getByText('ERROR')
  expect(el).toHaveClass('bg-red-100')
})
```

- [ ] **Step 11: Run test — expect fail**

```bash
cd apps/desktop && pnpm test 2>&1 | head -10
```

- [ ] **Step 12: Create Badge component**

`apps/desktop/src/components/common/Badge.tsx`:

```typescript
interface BadgeProps {
  label: string
  variant: 'verbose' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
}

const VARIANT_CLASSES: Record<BadgeProps['variant'], string> = {
  verbose: 'bg-gray-100 text-gray-600',
  debug:   'bg-blue-100 text-blue-700',
  info:    'bg-green-100 text-green-700',
  warn:    'bg-yellow-100 text-yellow-700',
  error:   'bg-red-100 text-red-700',
  fatal:   'bg-red-200 text-red-900 font-bold',
}

export function Badge({ label, variant }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${VARIANT_CLASSES[variant]}`}>
      {label}
    </span>
  )
}
```

- [ ] **Step 13: Create stores**

`apps/desktop/src/stores/deviceStore.ts`:

```typescript
import { create } from 'zustand'

interface DeviceStore {
  selectedSerial: string | null
  connectionStatus: 'disconnected' | 'connecting' | 'connected'
  setSelectedSerial: (serial: string | null) => void
  setConnectionStatus: (s: DeviceStore['connectionStatus']) => void
}

export const useDeviceStore = create<DeviceStore>((set) => ({
  selectedSerial: null,
  connectionStatus: 'disconnected',
  setSelectedSerial: (serial) => set({ selectedSerial: serial }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
}))
```

`apps/desktop/src/stores/sessionStore.ts`:

```typescript
import { create } from 'zustand'

interface SessionStore {
  activeSessionId: number | null
  setActiveSessionId: (id: number | null) => void
}

export const useSessionStore = create<SessionStore>((set) => ({
  activeSessionId: null,
  setActiveSessionId: (id) => set({ activeSessionId: id }),
}))
```

`apps/desktop/src/stores/uiStore.ts`:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiStore {
  sidebarCollapsed: boolean
  darkMode: boolean
  friendlyMode: boolean
  toggleSidebar: () => void
  toggleDarkMode: () => void
  toggleFriendlyMode: () => void
}

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      darkMode: false,
      friendlyMode: true,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      toggleFriendlyMode: () => set((s) => ({ friendlyMode: !s.friendlyMode })),
    }),
    { name: 'phonescope-ui' }
  )
)
```

`apps/desktop/src/stores/settingsStore.ts`:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsStore {
  adbPath: string
  setAdbPath: (path: string) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      adbPath: 'adb',
      setAdbPath: (adbPath) => set({ adbPath }),
    }),
    { name: 'phonescope-settings' }
  )
)
```

- [ ] **Step 14: Create layout components**

`apps/desktop/src/components/layout/Sidebar.tsx`:

```typescript
import { NavLink } from 'react-router-dom'
import { useUiStore } from '@/stores/uiStore'

const NAV_ITEMS = [
  { to: '/', label: 'Overview' },
  { to: '/apps', label: 'Apps' },
  { to: '/logs', label: 'Logs' },
  { to: '/controls', label: 'Controls' },
  { to: '/settings', label: 'Settings' },
]

export function Sidebar() {
  const { sidebarCollapsed } = useUiStore()
  return (
    <nav className={`bg-gray-900 text-white flex flex-col ${sidebarCollapsed ? 'w-12' : 'w-48'} transition-all`}>
      <div className="p-4 font-bold text-lg">{!sidebarCollapsed && 'PhoneScope'}</div>
      {NAV_ITEMS.map(({ to, label }) => (
        <NavLink key={to} to={to} end={to === '/'}
          className={({ isActive }) =>
            `px-4 py-2 text-sm hover:bg-gray-700 ${isActive ? 'bg-gray-700 text-white' : 'text-gray-300'}`
          }>
          {!sidebarCollapsed && label}
        </NavLink>
      ))}
    </nav>
  )
}
```

`apps/desktop/src/components/layout/Header.tsx`:

```typescript
import { useUiStore } from '@/stores/uiStore'
import { useDeviceStore } from '@/stores/deviceStore'

export function Header() {
  const { darkMode, friendlyMode, toggleDarkMode, toggleFriendlyMode, toggleSidebar } = useUiStore()
  const { selectedSerial, connectionStatus } = useDeviceStore()

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center gap-4">
      <button onClick={toggleSidebar} className="text-gray-500 hover:text-gray-700">☰</button>
      <span className="font-semibold text-gray-800 dark:text-white">
        {selectedSerial ? `${selectedSerial} (${connectionStatus})` : 'No device connected'}
      </span>
      <div className="ml-auto flex gap-2">
        <button onClick={toggleFriendlyMode} className="text-xs px-2 py-1 rounded border">
          {friendlyMode ? 'Friendly' : 'Raw'}
        </button>
        <button onClick={toggleDarkMode} className="text-xs px-2 py-1 rounded border">
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  )
}
```

- [ ] **Step 15: Create placeholder pages**

`apps/desktop/src/pages/OverviewPage.tsx`:

```typescript
export function OverviewPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Overview</h1>
      <p className="text-gray-500">Connect a device to see device info.</p>
    </div>
  )
}
```

`apps/desktop/src/pages/LogsPage.tsx`:

```typescript
export function LogsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Logs</h1>
      <p className="text-gray-500">Log stream will appear here.</p>
    </div>
  )
}
```

`apps/desktop/src/pages/AppsPage.tsx`:

```typescript
export function AppsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Apps</h1>
      <p className="text-gray-500">Installed apps will appear here.</p>
    </div>
  )
}
```

`apps/desktop/src/pages/ControlsPage.tsx`:

```typescript
export function ControlsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Controls</h1>
      <p className="text-gray-500">App controls will appear here.</p>
    </div>
  )
}
```

`apps/desktop/src/pages/SettingsPage.tsx`:

```typescript
import { useSettingsStore } from '@/stores/settingsStore'

export function SettingsPage() {
  const { adbPath, setAdbPath } = useSettingsStore()
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <label className="block mb-2 text-sm font-medium">ADB Path</label>
      <input
        className="border rounded px-3 py-2 w-64"
        value={adbPath}
        onChange={(e) => setAdbPath(e.target.value)}
      />
    </div>
  )
}
```

- [ ] **Step 16: Create router, App, main**

`apps/desktop/src/router.tsx`:

```typescript
import { createBrowserRouter } from 'react-router-dom'
import { OverviewPage } from '@/pages/OverviewPage'
import { AppsPage } from '@/pages/AppsPage'
import { LogsPage } from '@/pages/LogsPage'
import { ControlsPage } from '@/pages/ControlsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}

export const router = createBrowserRouter([
  { path: '/', element: <Layout><OverviewPage /></Layout> },
  { path: '/apps', element: <Layout><AppsPage /></Layout> },
  { path: '/logs', element: <Layout><LogsPage /></Layout> },
  { path: '/controls', element: <Layout><ControlsPage /></Layout> },
  { path: '/settings', element: <Layout><SettingsPage /></Layout> },
])
```

`apps/desktop/src/App.tsx`:

```typescript
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from './router'

const queryClient = new QueryClient()

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
```

`apps/desktop/src/main.tsx`:

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

Create `apps/desktop/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 17: Run tests**

```bash
cd apps/desktop && pnpm test
```
Expected: Badge tests pass

- [ ] **Step 18: Run lint**

```bash
cd apps/desktop && pnpm lint
```
Expected: no errors

- [ ] **Step 19: Commit**

```bash
git add apps/desktop/
git commit -m "feat: T4-W1+W2 — React frontend shell with layout, stores, placeholder pages"
```

---

## TRACK INT-W2: Tauri App Shell

**Files:**
- Create: `apps/desktop/src-tauri/Cargo.toml`
- Create: `apps/desktop/src-tauri/tauri.conf.json`
- Create: `apps/desktop/src-tauri/src/main.rs`
- Create: `apps/desktop/src-tauri/src/lib.rs`
- Create: `apps/desktop/src-tauri/capabilities/default.json`
- Modify: `crates/phonescope-tauri/Cargo.toml`
- Create: `crates/phonescope-tauri/src/lib.rs`
- Create: `crates/phonescope-tauri/src/state.rs`
- Create: `crates/phonescope-tauri/src/commands/mod.rs`
- Create: `crates/phonescope-tauri/src/commands/device.rs`

### Task INT-2: Tauri shell + taurpc skeleton

- [ ] **Step 1: Create `apps/desktop/src-tauri/Cargo.toml`**

```toml
[package]
name = "phonescope-app"
version.workspace = true
edition.workspace = true

[lib]
name = "phonescope_app_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[[bin]]
name = "phonescope-app"
path = "src/main.rs"

[dependencies]
phonescope-tauri = { path = "../../../crates/phonescope-tauri" }
tauri.workspace = true
tauri-plugin-shell.workspace = true
serde.workspace = true
serde_json.workspace = true
tokio.workspace = true
```

- [ ] **Step 2: Create `tauri.conf.json`**

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "PhoneScope",
  "version": "0.1.0",
  "identifier": "dev.phonescope.app",
  "build": {
    "beforeDevCommand": "pnpm dev",
    "beforeBuildCommand": "pnpm build",
    "devUrl": "http://localhost:1420",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "PhoneScope",
        "width": 1280,
        "height": 800,
        "minWidth": 900,
        "minHeight": 600
      }
    ],
    "security": { "csp": null }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": ["icons/32x32.png", "icons/128x128.png"]
  }
}
```

- [ ] **Step 3: Create `apps/desktop/src-tauri/capabilities/default.json`**

```json
{
  "$schema": "../node_modules/@tauri-apps/cli/schema/acl-manifests/acl.schema.json",
  "identifier": "default",
  "description": "Default capability",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "shell:allow-execute",
    "shell:allow-open"
  ]
}
```

- [ ] **Step 4: Create entry points**

`apps/desktop/src-tauri/src/main.rs`:
```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
fn main() {
    phonescope_app_lib::run();
}
```

`apps/desktop/src-tauri/src/lib.rs`:
```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error running tauri application");
}
```

- [ ] **Step 5: Update `crates/phonescope-tauri/Cargo.toml`**

```toml
[package]
name = "phonescope-tauri"
version.workspace = true
edition.workspace = true

[dependencies]
phonescope-events = { path = "../phonescope-events" }
phonescope-storage = { path = "../phonescope-storage" }
phonescope-adb = { path = "../phonescope-adb" }
taurpc.workspace = true
tauri.workspace = true
serde.workspace = true
serde_json.workspace = true
tokio.workspace = true
thiserror.workspace = true
tracing.workspace = true
```

- [ ] **Step 6: Create `crates/phonescope-tauri/src/state.rs`**

```rust
use std::sync::Mutex;
use phonescope_adb::AdbManager;

pub struct AppState {
    pub adb: Mutex<AdbManager>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            adb: Mutex::new(AdbManager::detect()),
        }
    }
}
```

- [ ] **Step 7: Create `crates/phonescope-tauri/src/commands/device.rs`**

```rust
use phonescope_adb::DeviceInfo;
use taurpc::procedures;

#[procedures]
pub trait DeviceCommands {
    async fn list_devices() -> Vec<DeviceInfo>;
}

pub struct DeviceCommandsImpl;

#[taurpc::resolvers]
impl DeviceCommands for DeviceCommandsImpl {
    async fn list_devices(self) -> Vec<DeviceInfo> {
        // TODO: wire to AppState
        vec![]
    }
}
```

- [ ] **Step 8: Create `crates/phonescope-tauri/src/commands/mod.rs`**

```rust
pub mod device;
```

- [ ] **Step 9: Create `crates/phonescope-tauri/src/lib.rs`**

```rust
pub mod commands;
pub mod state;

pub use state::AppState;
```

- [ ] **Step 10: Verify workspace builds**

Run: `cargo build --workspace`
Expected: compiles

- [ ] **Step 11: Commit**

```bash
git add crates/phonescope-tauri/ apps/desktop/src-tauri/
git commit -m "feat: INT-W2 — Tauri app shell + taurpc skeleton + AppState"
```

---

## TRACK T3-W2+W3: Collectors Trait + LogcatCollector

**Files:**
- Modify: `crates/phonescope-collectors/Cargo.toml`
- Create: `crates/phonescope-collectors/src/lib.rs`
- Create: `crates/phonescope-collectors/src/traits.rs`
- Create: `crates/phonescope-collectors/src/logcat.rs`
- Create: `crates/phonescope-collectors/src/package.rs`
- Create: `crates/phonescope-collectors/tests/fixtures/logcat_sample.txt`
- Create: `crates/phonescope-collectors/tests/fixtures/pm_list_packages.txt`
- Test: `crates/phonescope-collectors/tests/collector_tests.rs`

### Task T3-1: Collector trait + LogcatCollector

- [ ] **Step 1: Update `Cargo.toml`**

```toml
[package]
name = "phonescope-collectors"
version.workspace = true
edition.workspace = true

[dependencies]
phonescope-events = { path = "../phonescope-events" }
phonescope-adb = { path = "../phonescope-adb" }
serde.workspace = true
chrono.workspace = true
thiserror.workspace = true
tracing.workspace = true
tokio.workspace = true
async-trait.workspace = true
```

- [ ] **Step 2: Create test fixtures**

`crates/phonescope-collectors/tests/fixtures/logcat_sample.txt`:
```
03-20 14:23:45.123  1234  1234 I MyApp   : Starting activity
03-20 14:23:45.456  1234  1235 W ActivityManager: Slow start for com.example.app
03-20 14:23:45.789  5678  5678 E System  : Fatal error occurred
```

`crates/phonescope-collectors/tests/fixtures/pm_list_packages.txt`:
```
package:/system/app/Contacts/Contacts.apk=com.android.contacts
package:/data/app/com.example.app-1/base.apk=com.example.app
package:/system/priv-app/Launcher3/Launcher3.apk=com.android.launcher3
```

- [ ] **Step 3: Write failing test**

`crates/phonescope-collectors/tests/collector_tests.rs`:

```rust
use phonescope_collectors::package::parse_pm_list_packages;
use phonescope_adb::parse_logcat_line;

#[test]
fn parse_pm_list_packages_fixture() {
    let input = include_str!("fixtures/pm_list_packages.txt");
    let packages = parse_pm_list_packages(input);
    assert_eq!(packages.len(), 3);
    assert!(packages.iter().any(|p| p.package_name == "com.android.contacts"));
    assert!(packages.iter().any(|p| p.package_name == "com.example.app"));
    assert!(!packages[0].is_system || packages[0].apk_path.contains("/system"));
}

#[test]
fn parse_logcat_sample() {
    let line = "03-20 14:23:45.123  1234  1234 I MyApp   : Starting activity";
    let parsed = parse_logcat_line(line).expect("should parse");
    assert_eq!(parsed.tag, "MyApp");
    assert_eq!(parsed.message, "Starting activity");
}
```

- [ ] **Step 4: Implement `traits.rs`**

```rust
use async_trait::async_trait;
use phonescope_events::DeviceEvent;
use tokio::sync::broadcast;

pub struct CollectorContext {
    pub session_id: i64,
    pub serial: String,
    pub adb_path: String,
    pub event_tx: broadcast::Sender<DeviceEvent>,
}

#[async_trait]
pub trait Collector: Send + Sync {
    fn name(&self) -> &str;
    async fn run(&self, ctx: &CollectorContext) -> crate::Result<()>;
}
```

- [ ] **Step 5: Implement `package.rs`**

```rust
pub struct PmPackageInfo {
    pub package_name: String,
    pub apk_path: String,
    pub is_system: bool,
}

pub fn parse_pm_list_packages(output: &str) -> Vec<PmPackageInfo> {
    output.lines()
        .filter_map(|line| {
            let line = line.trim();
            if !line.starts_with("package:") { return None; }
            let rest = line.trim_start_matches("package:");
            let (apk_path, package_name) = rest.split_once('=')?;
            let is_system = apk_path.contains("/system/") || apk_path.contains("/priv-app/");
            Some(PmPackageInfo {
                package_name: package_name.trim().to_string(),
                apk_path: apk_path.trim().to_string(),
                is_system,
            })
        })
        .collect()
}
```

- [ ] **Step 6: Implement `logcat.rs`**

```rust
use async_trait::async_trait;
use phonescope_events::{LogEvent, DeviceEvent, EventMeta, EventSource};
use chrono::Utc;
use crate::traits::{Collector, CollectorContext};
use phonescope_adb::parse_logcat_line;
use tokio::process::Command;
use tokio::io::{AsyncBufReadExt, BufReader};
use tracing::{info, warn};

pub struct LogcatCollector;

#[async_trait]
impl Collector for LogcatCollector {
    fn name(&self) -> &str { "logcat" }

    async fn run(&self, ctx: &CollectorContext) -> crate::Result<()> {
        info!("starting logcat collector for {}", ctx.serial);
        let mut child = Command::new(&ctx.adb_path)
            .args(["-s", &ctx.serial, "logcat", "-v", "threadtime"])
            .stdout(std::process::Stdio::piped())
            .spawn()?;

        let stdout = child.stdout.take().ok_or(crate::Error::NoOutput)?;
        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();

        while let Some(line) = lines.next_line().await? {
            if let Some(parsed) = parse_logcat_line(&line) {
                let event = DeviceEvent::Log(LogEvent {
                    meta: EventMeta {
                        session_id: ctx.session_id,
                        timestamp: Utc::now(),
                        source: EventSource::Adb,
                    },
                    level: parsed.level,
                    tag: parsed.tag,
                    message: parsed.message,
                    pid: parsed.pid,
                    tid: parsed.tid,
                    package_name: None,
                });
                let _ = ctx.event_tx.send(event); // ignore if no subscribers
            }
        }
        Ok(())
    }
}
```

- [ ] **Step 7: Implement `lib.rs`**

```rust
pub mod traits;
pub mod logcat;
pub mod package;

mod error {
    use thiserror::Error;
    #[derive(Debug, Error)]
    pub enum Error {
        #[error("io: {0}")]
        Io(#[from] std::io::Error),
        #[error("no stdout from adb process")]
        NoOutput,
    }
    pub type Result<T> = std::result::Result<T, Error>;
}
pub use error::{Error, Result};
pub use logcat::LogcatCollector;
pub use traits::{Collector, CollectorContext};
```

- [ ] **Step 8: Run tests**

Run: `cargo test -p phonescope-collectors`
Expected: both tests pass

- [ ] **Step 9: Commit**

```bash
git add crates/phonescope-collectors/
git commit -m "feat: T3-W2+W3 — Collector trait, LogcatCollector, PackageCollector parser"
```

---

## TRACK T1-W3: phonescope-core v1

*Prerequisite: phonescope-adb, phonescope-storage, phonescope-events, phonescope-collectors.*

**Files:**
- Modify: `crates/phonescope-core/Cargo.toml`
- Create: `crates/phonescope-core/src/lib.rs`
- Test: `crates/phonescope-core/tests/core_tests.rs`

### Task T1-3: Core orchestrator

- [ ] **Step 1: Update `Cargo.toml`**

```toml
[package]
name = "phonescope-core"
version.workspace = true
edition.workspace = true

[dependencies]
phonescope-events = { path = "../phonescope-events" }
phonescope-adb = { path = "../phonescope-adb" }
phonescope-storage = { path = "../phonescope-storage" }
phonescope-collectors = { path = "../phonescope-collectors" }
serde.workspace = true
chrono.workspace = true
thiserror.workspace = true
tracing.workspace = true
tokio.workspace = true
```

- [ ] **Step 2: Write failing test**

`crates/phonescope-core/tests/core_tests.rs`:

```rust
use phonescope_core::PhoneScope;

#[tokio::test]
async fn create_and_list_sessions() {
    let scope = PhoneScope::new_in_memory().await.expect("init failed");
    // No active sessions at start
    let sessions = scope.active_sessions();
    assert!(sessions.is_empty());
}
```

- [ ] **Step 3: Implement `lib.rs`**

```rust
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::broadcast;
use phonescope_events::DeviceEvent;
use phonescope_storage::Database;

pub struct SessionInfo {
    pub session_id: i64,
    pub serial: String,
}

pub struct PhoneScope {
    pub db: Arc<Database>,
    pub event_tx: broadcast::Sender<DeviceEvent>,
    sessions: Arc<Mutex<HashMap<String, SessionInfo>>>,
}

impl PhoneScope {
    pub async fn new_in_memory() -> Result<Self> {
        let db = Database::open_in_memory().map_err(Error::Storage)?;
        let (event_tx, _) = broadcast::channel(1024);
        Ok(Self {
            db: Arc::new(db),
            event_tx,
            sessions: Arc::new(Mutex::new(HashMap::new())),
        })
    }

    pub fn active_sessions(&self) -> Vec<String> {
        self.sessions.lock().unwrap().keys().cloned().collect()
    }

    pub fn subscribe_events(&self) -> broadcast::Receiver<DeviceEvent> {
        self.event_tx.subscribe()
    }
}

mod error {
    use thiserror::Error;
    #[derive(Debug, Error)]
    pub enum Error {
        #[error("storage: {0}")]
        Storage(#[from] phonescope_storage::Error),
    }
    pub type Result<T> = std::result::Result<T, Error>;
}
pub use error::{Error, Result};
```

- [ ] **Step 4: Run tests**

Run: `cargo test -p phonescope-core`
Expected: test passes

- [ ] **Step 5: Full workspace build + lint check**

Run: `cargo build --workspace && cargo clippy --workspace -- -D warnings`
Expected: all green

- [ ] **Step 6: Commit**

```bash
git add crates/phonescope-core/
git commit -m "feat: T1-W3 — phonescope-core orchestrator with EventBus and session management"
```

---

## TRACK INT-W3+W4: Wire IPC Commands

*Prerequisite: phonescope-core, phonescope-storage, phonescope-adb all complete.*

**Files:**
- Modify: `crates/phonescope-tauri/src/state.rs`
- Modify: `crates/phonescope-tauri/src/commands/device.rs`
- Create: `crates/phonescope-tauri/src/commands/logs.rs`
- Create: `crates/phonescope-tauri/src/commands/apps.rs`
- Create: `crates/phonescope-tauri/src/commands/session.rs`
- Create: `crates/phonescope-tauri/src/commands/settings.rs`
- Modify: `apps/desktop/src-tauri/src/lib.rs`

### Task INT-3: Wire IPC

- [ ] **Step 1: Update `AppState` to hold PhoneScope**

`crates/phonescope-tauri/src/state.rs`:

```rust
use std::sync::Arc;
use tokio::sync::Mutex;
use phonescope_core::PhoneScope;

pub struct AppState {
    pub core: Arc<Mutex<PhoneScope>>,
}

impl AppState {
    pub async fn new() -> phonescope_core::Result<Self> {
        let core = PhoneScope::new_in_memory().await?;
        Ok(Self { core: Arc::new(Mutex::new(core)) })
    }
}
```

- [ ] **Step 2: Implement device commands**

`crates/phonescope-tauri/src/commands/device.rs`:

```rust
use phonescope_adb::{AdbManager, DeviceInfo};
use tauri::State;
use crate::state::AppState;

#[tauri::command]
pub async fn list_devices(state: State<'_, AppState>) -> Result<Vec<DeviceInfo>, String> {
    let adb = AdbManager::detect();
    adb.list_devices().await.map_err(|e| e.to_string())
}
```

- [ ] **Step 3: Implement session commands**

`crates/phonescope-tauri/src/commands/session.rs`:

```rust
use tauri::State;
use crate::state::AppState;

#[tauri::command]
pub async fn get_active_sessions(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let core = state.core.lock().await;
    Ok(core.active_sessions())
}
```

- [ ] **Step 4: Implement log commands**

`crates/phonescope-tauri/src/commands/logs.rs`:

```rust
use tauri::State;
use crate::state::AppState;
use phonescope_storage::models::LogEntryRow;
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct LogQuery {
    pub session_id: i64,
    pub level: Option<String>,
    pub tag: Option<String>,
    pub search: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[tauri::command]
pub async fn get_logs(state: State<'_, AppState>, query: LogQuery) -> Result<Vec<LogEntryRow>, String> {
    let core = state.core.lock().await;
    core.db.query_logs(
        query.session_id,
        query.level.as_deref(),
        query.tag.as_deref(),
        query.search.as_deref(),
        query.limit.unwrap_or(100),
        query.offset.unwrap_or(0),
    ).map_err(|e| e.to_string())
}
```

- [ ] **Step 5: Implement app commands**

`crates/phonescope-tauri/src/commands/apps.rs`:

```rust
use tauri::State;
use crate::state::AppState;
use phonescope_storage::models::PackageRow;
use phonescope_adb::AdbShell;

#[tauri::command]
pub async fn list_packages(state: State<'_, AppState>, device_id: i64) -> Result<Vec<PackageRow>, String> {
    let core = state.core.lock().await;
    core.db.list_packages(device_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn force_stop(serial: String, package_name: String) -> Result<(), String> {
    let shell = AdbShell::new(&serial, "adb");
    shell.exec(&format!("am force-stop {package_name}")).await
        .map(|_| ())
        .map_err(|e| e.to_string())
}
```

- [ ] **Step 6: Implement settings commands**

`crates/phonescope-tauri/src/commands/settings.rs`:

```rust
#[tauri::command]
pub fn get_adb_path() -> String {
    "adb".to_string()
}
```

- [ ] **Step 7: Wire all commands in `lib.rs`**

`crates/phonescope-tauri/src/lib.rs`:

```rust
pub mod commands;
pub mod state;

pub use state::AppState;

pub fn build_app() -> tauri::Builder<tauri::Wry> {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::device::list_devices,
            commands::session::get_active_sessions,
            commands::logs::get_logs,
            commands::apps::list_packages,
            commands::apps::force_stop,
            commands::settings::get_adb_path,
        ])
}
```

- [ ] **Step 8: Update Tauri entry `lib.rs`**

`apps/desktop/src-tauri/src/lib.rs`:

```rust
use phonescope_tauri::AppState;

pub fn run() {
    let rt = tokio::runtime::Runtime::new().unwrap();
    let state = rt.block_on(AppState::new()).expect("failed to initialize");

    phonescope_tauri::build_app()
        .manage(state)
        .run(tauri::generate_context!())
        .expect("error running tauri application");
}
```

- [ ] **Step 9: Build**

Run: `cargo build --workspace`
Expected: compiles

- [ ] **Step 10: Commit**

```bash
git add crates/phonescope-tauri/ apps/desktop/src-tauri/
git commit -m "feat: INT-W3+W4 — wire Tauri IPC commands for devices, sessions, logs, apps"
```

---

## TRACK T4-W3+W4: Wire Frontend to Backend

*Prerequisite: INT commands wired.*

**Files:**
- Create: `apps/desktop/src/services/ipc.ts`
- Modify: `apps/desktop/src/pages/OverviewPage.tsx`
- Modify: `apps/desktop/src/pages/AppsPage.tsx`
- Modify: `apps/desktop/src/pages/LogsPage.tsx`
- Modify: `apps/desktop/src/pages/ControlsPage.tsx`
- Create: `apps/desktop/src/hooks/useDevice.ts`
- Create: `apps/desktop/src/hooks/useApps.ts`
- Create: `apps/desktop/src/hooks/useLogs.ts`

### Task T4-2: Wire real IPC

- [ ] **Step 1: Create `services/ipc.ts`**

```typescript
import { invoke } from '@tauri-apps/api/core'
import type { LogEntryRow, PackageRow, DeviceInfo } from '@/types'

export const ipc = {
  listDevices: (): Promise<DeviceInfo[]> =>
    invoke('list_devices'),
  getActiveSession: (): Promise<string[]> =>
    invoke('get_active_sessions'),
  getLogs: (query: {
    session_id: number,
    level?: string,
    tag?: string,
    search?: string,
    limit?: number,
    offset?: number
  }): Promise<LogEntryRow[]> =>
    invoke('get_logs', { query }),
  listPackages: (deviceId: number): Promise<PackageRow[]> =>
    invoke('list_packages', { deviceId }),
  forceStop: (serial: string, packageName: string): Promise<void> =>
    invoke('force_stop', { serial, packageName }),
  getAdbPath: (): Promise<string> =>
    invoke('get_adb_path'),
}
```

- [ ] **Step 2: Create `types/index.ts`**

```typescript
export interface DeviceInfo {
  serial: string
  state: 'Device' | 'Offline' | 'Unauthorized' | 'Unknown'
  model?: string
}

export interface LogEntryRow {
  id: number
  session_id: number
  level: string
  tag?: string
  message: string
  pid?: number
  tid?: number
  captured_at: string
}

export interface PackageRow {
  id: number
  device_id: number
  package_name: string
  app_label?: string
  version_name?: string
  version_code?: number
  is_system: boolean
  is_enabled: boolean
}
```

- [ ] **Step 3: Create `hooks/useDevice.ts`**

```typescript
import { useQuery } from '@tanstack/react-query'
import { ipc } from '@/services/ipc'

export function useDevices() {
  return useQuery({
    queryKey: ['devices'],
    queryFn: () => ipc.listDevices(),
    refetchInterval: 3000,
  })
}
```

- [ ] **Step 4: Create `hooks/useApps.ts`**

```typescript
import { useQuery } from '@tanstack/react-query'
import { ipc } from '@/services/ipc'

export function useApps(deviceId: number | null) {
  return useQuery({
    queryKey: ['apps', deviceId],
    queryFn: () => ipc.listPackages(deviceId!),
    enabled: deviceId !== null,
    refetchInterval: 60_000,
  })
}
```

- [ ] **Step 5: Create `hooks/useLogs.ts`**

```typescript
import { useQuery } from '@tanstack/react-query'
import { ipc } from '@/services/ipc'

export function useLogs(sessionId: number | null, filters?: { level?: string; tag?: string; search?: string }) {
  return useQuery({
    queryKey: ['logs', sessionId, filters],
    queryFn: () => ipc.getLogs({ session_id: sessionId!, ...filters, limit: 200 }),
    enabled: sessionId !== null,
    refetchInterval: 1000,
  })
}
```

- [ ] **Step 6: Wire `OverviewPage`**

```typescript
import { useDevices } from '@/hooks/useDevice'
import { useDeviceStore } from '@/stores/deviceStore'

export function OverviewPage() {
  const { data: devices, isLoading } = useDevices()
  const { setSelectedSerial, selectedSerial } = useDeviceStore()

  if (isLoading) return <div className="p-6">Scanning for devices...</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Overview</h1>
      {devices?.length === 0 && (
        <p className="text-gray-500">No Android devices found. Connect a device via USB and ensure ADB is enabled.</p>
      )}
      <div className="grid gap-4 mt-4">
        {devices?.map(d => (
          <div key={d.serial}
            className={`p-4 rounded-lg border cursor-pointer ${selectedSerial === d.serial ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
            onClick={() => setSelectedSerial(d.serial)}>
            <div className="font-medium">{d.model ?? d.serial}</div>
            <div className="text-sm text-gray-500">{d.serial} — {d.state}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Wire `AppsPage`**

```typescript
import { useApps } from '@/hooks/useApps'
import { useDeviceStore } from '@/stores/deviceStore'

export function AppsPage() {
  const { selectedSerial } = useDeviceStore()
  const { data: apps, isLoading } = useApps(selectedSerial ? 1 : null) // device_id 1 placeholder

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Apps</h1>
      {isLoading && <p>Loading apps...</p>}
      {!selectedSerial && <p className="text-gray-500">Select a device first.</p>}
      <div className="mt-4 space-y-1">
        {apps?.map(app => (
          <div key={app.package_name} className="flex items-center gap-3 py-2 border-b">
            <span className="flex-1 text-sm font-medium">{app.app_label ?? app.package_name}</span>
            <span className="text-xs text-gray-400">{app.version_name}</span>
            {app.is_system && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">System</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Wire `LogsPage`**

```typescript
import { useLogs } from '@/hooks/useLogs'
import { useSessionStore } from '@/stores/sessionStore'
import { Badge } from '@/components/common/Badge'

const LEVEL_VARIANT: Record<string, 'verbose'|'debug'|'info'|'warn'|'error'|'fatal'> = {
  Verbose: 'verbose', Debug: 'debug', Info: 'info',
  Warn: 'warn', Error: 'error', Fatal: 'fatal',
}

export function LogsPage() {
  const { activeSessionId } = useSessionStore()
  const { data: logs } = useLogs(activeSessionId)

  return (
    <div className="p-6 h-full flex flex-col">
      <h1 className="text-2xl font-bold mb-4">Logs</h1>
      {!activeSessionId && <p className="text-gray-500">Start a session to see logs.</p>}
      <div className="flex-1 overflow-auto font-mono text-xs">
        {logs?.map(log => (
          <div key={log.id} className="flex gap-2 py-0.5 border-b border-gray-100">
            <Badge label={log.level} variant={LEVEL_VARIANT[log.level] ?? 'info'} />
            <span className="text-gray-400 w-24 shrink-0">{log.tag}</span>
            <span>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 9: Wire `ControlsPage`**

```typescript
import { useApps } from '@/hooks/useApps'
import { useDeviceStore } from '@/stores/deviceStore'
import { ipc } from '@/services/ipc'
import { useState } from 'react'

export function ControlsPage() {
  const { selectedSerial } = useDeviceStore()
  const { data: apps } = useApps(selectedSerial ? 1 : null)
  const [busy, setBusy] = useState<string | null>(null)

  const handleForceStop = async (pkg: string) => {
    if (!selectedSerial || !confirm(`Force stop ${pkg}?`)) return
    setBusy(pkg)
    try { await ipc.forceStop(selectedSerial, pkg) }
    finally { setBusy(null) }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Controls</h1>
      {apps?.filter(a => !a.is_system).map(app => (
        <div key={app.package_name} className="flex items-center gap-3 py-2 border-b">
          <span className="flex-1 text-sm">{app.app_label ?? app.package_name}</span>
          <button
            disabled={busy === app.package_name}
            onClick={() => handleForceStop(app.package_name)}
            className="text-xs px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50">
            {busy === app.package_name ? 'Stopping...' : 'Force Stop'}
          </button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 10: Add pnpm tauri dependency**

```bash
cd apps/desktop && pnpm add @tauri-apps/api
```

- [ ] **Step 11: Run lint**

```bash
cd apps/desktop && pnpm lint
```
Expected: no errors

- [ ] **Step 12: Commit**

```bash
git add apps/desktop/src/
git commit -m "feat: T4-W3+W4 — wire frontend pages to Tauri IPC commands"
```

---

## M1 Exit Checklist

- [ ] `cargo build --workspace` — green
- [ ] `cargo test --workspace` — all tests pass
- [ ] `cargo clippy --workspace -- -D warnings` — no warnings
- [ ] `cd apps/desktop && pnpm lint` — no errors
- [ ] `cd apps/desktop && pnpm test` — all tests pass
- [ ] `pnpm dev` (inside apps/desktop) — Tauri dev window opens
- [ ] Device list visible when ADB device connected
- [ ] Logcat streaming via backend (verify with emulator)
- [ ] Apps list populated from device
- [ ] Force stop button sends `am force-stop` to device
- [ ] CI pipeline green on push
