# Architecture Reference

## Monorepo Structure

```
phonescope/
├── Cargo.toml                    # Virtual workspace manifest
├── Cargo.lock
├── rust-toolchain.toml           # Pin Rust 1.82+
├── .rustfmt.toml
├── clippy.toml
├── CLAUDE.md
├── README.md
├── .gitignore
├── .github/workflows/
│   ├── ci.yml                    # cargo check+test+clippy, pnpm lint+test, gradle build
│   └── release.yml               # Tauri build for Win/Mac/Linux
├── docs/                         # Design documents (00-13)
│   └── handovers/                # Team handover docs
├── crates/
│   ├── phonescope-events/        # Leaf crate — all event types
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── confidence.rs
│   │       ├── app.rs
│   │       ├── network.rs
│   │       ├── http.rs
│   │       ├── dns.rs
│   │       ├── battery.rs
│   │       ├── storage.rs
│   │       ├── package.rs
│   │       ├── log.rs
│   │       ├── process.rs
│   │       ├── thermal.rs
│   │       ├── usage.rs
│   │       └── insight.rs
│   ├── phonescope-adb/           # ADB device manager
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── device.rs
│   │       ├── shell.rs
│   │       ├── file_ops.rs
│   │       └── port_forward.rs
│   ├── phonescope-storage/       # SQLite persistence
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── migrations.rs
│   │       ├── queries.rs
│   │       ├── retention.rs
│   │       └── models.rs
│   ├── phonescope-collectors/    # All data collectors
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── traits.rs
│   │       ├── logcat.rs
│   │       ├── dumpsys.rs
│   │       ├── package.rs
│   │       ├── netstats.rs
│   │       ├── storage.rs
│   │       ├── battery.rs
│   │       ├── proxy.rs
│   │       ├── vpn_flow.rs
│   │       ├── root_tcpdump.rs
│   │       └── usage.rs
│   ├── phonescope-process/       # Process/CPU/RAM/thermal
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── top_parser.rs
│   │       ├── meminfo_parser.rs
│   │       ├── cpuinfo_parser.rs
│   │       ├── process_collector.rs
│   │       ├── thermal_parser.rs
│   │       └── thermal_collector.rs
│   ├── phonescope-proxy/         # mitmproxy manager
│   │   ├── Cargo.toml
│   │   ├── scripts/stream_har.py
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── har.rs
│   │       └── normalize.rs
│   ├── phonescope-analytics/     # Aggregation + scoring
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── aggregation.rs
│   │       ├── scoring.rs
│   │       ├── patterns.rs
│   │       └── domains.rs
│   ├── phonescope-insights/      # User-friendly insights
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── rules.rs
│   │       ├── messages.rs
│   │       └── confidence.rs
│   ├── phonescope-usage/         # App usage tracking
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── parser.rs
│   │       ├── snapshots.rs
│   │       ├── comparison.rs
│   │       ├── goals.rs
│   │       └── categories.rs
│   ├── phonescope-helper-protocol/  # WebSocket message types
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── messages.rs
│   │       └── handshake.rs
│   └── phonescope-tauri/         # Tauri IPC commands
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs
│           ├── state.rs
│           └── commands/
│               ├── mod.rs
│               ├── device.rs
│               ├── session.rs
│               ├── apps.rs
│               ├── network.rs
│               ├── logs.rs
│               ├── storage.rs
│               ├── battery.rs
│               ├── process.rs
│               ├── proxy.rs
│               ├── settings.rs
│               ├── insights.rs
│               ├── usage.rs
│               └── export.rs
├── apps/
│   ├── desktop/
│   │   ├── src-tauri/
│   │   │   ├── Cargo.toml
│   │   │   ├── tauri.conf.json
│   │   │   ├── capabilities/default.json
│   │   │   ├── binaries/           # mitmproxy (gitignored)
│   │   │   ├── icons/
│   │   │   └── src/
│   │   │       ├── main.rs
│   │   │       └── lib.rs
│   │   ├── src/                    # React frontend (see 09-frontend.md)
│   │   ├── package.json
│   │   ├── pnpm-lock.yaml
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── vitest.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.js
│   │   ├── playwright.config.ts
│   │   └── index.html
│   └── android/                    # Kotlin helper (see 10-android-helper.md)
│       ├── app/
│       │   ├── src/main/
│       │   ├── src/test/
│       │   └── build.gradle.kts
│       ├── build.gradle.kts
│       ├── settings.gradle.kts
│       └── gradle.properties
└── xtask/
    ├── Cargo.toml
    └── src/main.rs               # fetch-mitmproxy, etc.
```

---

## Workspace Cargo.toml

```toml
[workspace]
resolver = "2"
members = [
    "crates/phonescope-core",
    "crates/phonescope-adb",
    "crates/phonescope-collectors",
    "crates/phonescope-proxy",
    "crates/phonescope-events",
    "crates/phonescope-analytics",
    "crates/phonescope-insights",
    "crates/phonescope-storage",
    "crates/phonescope-helper-protocol",
    "crates/phonescope-process",
    "crates/phonescope-usage",
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

---

## Crate Dependency Graph

```
phonescope-events              ← LEAF (no internal deps)
│
├── phonescope-storage         ← events
├── phonescope-adb             ← events
├── phonescope-proxy           ← events
├── phonescope-helper-protocol ← events
├── phonescope-process         ← events, adb
├── phonescope-usage           ← events, storage
├── phonescope-collectors      ← events, adb, proxy, helper-protocol, process
├── phonescope-analytics       ← events, storage
├── phonescope-insights        ← events, analytics
├── phonescope-core            ← events, adb, collectors, storage, analytics,
│                                 insights, proxy, helper-protocol, process, usage
└── phonescope-tauri           ← core, events, storage

apps/desktop/src-tauri         ← phonescope-tauri (thin shell)
```

---

## Event Pipeline

```
                    ┌──────────────┐
                    │  Collectors   │
                    │ (logcat, bat, │
                    │  storage, net,│
                    │  process, etc)│
                    └──────┬───────┘
                           │
                    Vec<DeviceEvent>
                           │
                    ┌──────▼───────┐
                    │   EventBus    │  tokio::broadcast::Sender<DeviceEvent>
                    │  (in core)    │
                    └──┬───┬───┬───┘
                       │   │   │
          ┌────────────┘   │   └────────────┐
          │                │                │
  ┌───────▼──────┐ ┌──────▼───────┐ ┌──────▼──────────┐
  │StorageWriter │ │ Analytics    │ │ Frontend        │
  │(batched:     │ │ Engine       │ │ Notifier        │
  │ 100 or 1s)   │ │ (aggregation)│ │ (taurpc events) │
  └──────┬───────┘ └──────┬───────┘ └──────┬──────────┘
         │                │                │
    ┌────▼────┐    ┌──────▼──────┐   ┌─────▼─────┐
    │ SQLite  │    │  Insights   │   │  React UI │
    │   DB    │    │  Engine     │   │ (live)    │
    └─────────┘    └─────────────┘   └───────────┘
```

**StorageWriter batching:** Collects events in a buffer. Flushes when buffer reaches 100 events OR 1 second has elapsed since last flush, whichever comes first. Each flush is a single SQLite transaction.

---

## Capability Detection Flow

```
Device connects via ADB
  │
  ▼
AdbManager.list_devices() → DeviceInfo { serial, model, sdk_level }
  │
  ▼
PhoneScope.detect_capabilities(shell):
  1. shell.exec("id")          → check uid=0 → has_root
  2. shell.exec("pm list packages com.phonescope.helper") → has_helper
  3. ADB port-forward + WebSocket probe → helper reachable
  4. Check mitmproxy binary exists → proxy available
  5. shell.exec("which tcpdump") → tcpdump available (root only)
  6. shell.exec("dumpsys netstats") → netstats available
  7. Test each collector's preconditions
  │
  ▼
CapabilityProfile { has_adb, has_root, has_helper, has_proxy, ... }
  │
  ▼
Mode selection:
  Root  → has_root         → all collectors
  Proxy → has_proxy        → + HTTP inspection
  Helper→ has_helper       → + per-app network (VPN)
  Basic → ADB only         → logcat + dumpsys + packages
  │
  ▼
UI shows: "Connected to Pixel 7 (Android 14). Mode: Helper + Proxy.
  Available: logcat, packages, battery, storage, per-app network, HTTP requests.
  Not available: root tcpdump (device not rooted)."
```

---

## Tauri IPC Architecture

### taurpc Router Setup

```rust
// crates/phonescope-tauri/src/lib.rs
pub fn create_router() -> Router {
    Router::new()
        .merge(DeviceCommandsImpl.into_handler())
        .merge(SessionCommandsImpl.into_handler())
        .merge(AppCommandsImpl.into_handler())
        .merge(NetworkCommandsImpl.into_handler())
        .merge(LogCommandsImpl.into_handler())
        .merge(StorageCommandsImpl.into_handler())
        .merge(BatteryCommandsImpl.into_handler())
        .merge(ProcessCommandsImpl.into_handler())
        .merge(ProxyCommandsImpl.into_handler())
        .merge(InsightCommandsImpl.into_handler())
        .merge(UsageCommandsImpl.into_handler())
        .merge(SettingsCommandsImpl.into_handler())
        .merge(ExportCommandsImpl.into_handler())
}
```

### AppState

```rust
pub struct AppState {
    pub phonescope: Mutex<PhoneScope>,
    pub config: RwLock<Config>,
}
```

### Tauri App Setup

```rust
// apps/desktop/src-tauri/src/lib.rs
pub fn run() {
    let state = AppState::new().expect("Failed to initialize");
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(phonescope_tauri::create_router().into_plugin())
        .manage(state)
        .run(tauri::generate_context!())
        .expect("error running tauri application");
}
```

### Command Categories

| Category | Commands |
|----------|----------|
| Device | list_devices, connect_device, disconnect_device, get_capabilities |
| Session | get_active_sessions, get_session_history, start_session, stop_session |
| App | list_packages, get_package_detail, force_stop, clear_data, disable, uninstall, revoke/grant_permission |
| Network | get_flows, get_requests, get_dns_queries, get_domain_breakdown, get_top_apps_by_traffic |
| Log | get_logs, get_log_tags, clear_log_buffer |
| Storage | get_storage_overview, get_folder_sizes, get_app_storage_breakdown |
| Battery | get_battery_timeline, get_current_battery, get_battery_stats |
| Process | get_process_snapshot, get_thermal_samples, get_system_resources |
| Proxy | start_proxy, stop_proxy, get_proxy_status, install_ca_cert, configure_device_proxy |
| Insight | get_insights, get_insight_categories, dismiss_insight |
| Usage | get_usage_summary, get_top_apps, get_hourly_distribution, compare_periods, trigger_snapshot, list_snapshots, create/update/delete_goal, get_goal_progress |
| Settings | get_settings, update_settings, get_adb_path, set_adb_path |
| Export | export_json, export_csv, export_har, generate_report, export_usage_csv |

### Events (Rust → Frontend)

```rust
#[taurpc::procedures]
pub trait PhoneScopeEvents {
    async fn on_device_event(event: DeviceEvent);
    async fn on_device_connected(info: DeviceInfo);
    async fn on_device_disconnected(serial: String);
    async fn on_session_started(info: SessionInfo);
    async fn on_session_ended(session_id: i64);
    async fn on_capability_detected(profile: CapabilityProfile);
    async fn on_insight_generated(insight: InsightEvent);
    async fn on_collector_status_changed(status: CollectorStatus);
    async fn on_proxy_status_changed(running: bool);
    async fn on_usage_snapshot_captured(snapshot_id: i64);
}
```

---

## State Management

### Rust Side

- `PhoneScope` struct holds all state: ADB manager, DB, EventBus, active sessions
- `SessionHandle` per device: collectors, helper client, proxy manager
- `Database` behind `Arc<Mutex<Connection>>` (WAL mode allows concurrent reads)
- Config in `RwLock<Config>`

### Frontend Side

- **Zustand stores**: global UI state (selected device, sidebar collapsed, dark mode, friendly mode)
  - `deviceStore`: selected device serial, connection status
  - `sessionStore`: active session ID
  - `settingsStore`: persisted preferences
  - `uiStore`: sidebar, theme, friendly mode
- **TanStack Query**: all data from backend (cached, auto-refetched on configurable intervals)
- **Component state**: ephemeral UI state (expanded rows, text input, modals)

---

## App Usage Snapshot Architecture

```
UsageCollector (T3)                    UsageTracker (T2)
┌──────────────────┐                  ┌──────────────────┐
│ Runs ADB commands│                  │ Snapshot Scheduler│
│ dumpsys usagestats│─── AppUsage ──►│   hourly: when    │
│ cmd usage_stats  │    Events       │     connected     │
└──────────────────┘                  │   daily: midnight │
                                      │   weekly: Sunday  │
                                      │   manual: on-demand│
                                      └────────┬─────────┘
                                               │
                                      ┌────────▼─────────┐
                                      │ Deduplication     │
                                      │ UNIQUE(device,    │
                                      │   type, start)    │
                                      │ → merge if exists │
                                      └────────┬─────────┘
                                               │
                                      ┌────────▼─────────┐
                                      │ SQLite            │
                                      │ usage_snapshot    │
                                      │ app_usage_record  │
                                      │ screen_time_record│
                                      │ (NEVER deleted)   │
                                      └──────────────────┘
```

Snapshots are never auto-deleted — they form the long-term usage history that persists across months/years, overcoming Android's limited retention.
