# M1: Foundation (Weeks 1–4)

**Goal:** Connect to an Android device via ADB, show device info, stream logcat in real time, list installed apps, and perform basic app controls (force stop, uninstall).

**Ship Criteria:** A user can plug in an Android phone, see device info, stream logcat live, browse installed apps, and force-stop an app — all wired end-to-end.

---

## Week 1: Skeleton & Events

### T1 — Platform Team

**Deliverable:** `phonescope-events` crate v1 with all event types.

| Task | Files |
|------|-------|
| Create crate skeleton | `crates/phonescope-events/Cargo.toml` |
| Define `DeviceEvent` enum with ALL variants | `crates/phonescope-events/src/lib.rs` |
| Define `Confidence` enum (Exact, Approximate, Inferred, Unavailable) | `crates/phonescope-events/src/confidence.rs` |
| Define `EventMeta` and `EventSource` | `crates/phonescope-events/src/lib.rs` |
| Define event structs: `AppEvent`, `LogEvent`, `PackageEvent` | `crates/phonescope-events/src/app.rs`, `src/log.rs`, `src/package.rs` |
| Define event structs: `NetworkFlowEvent`, `HttpRequestEvent`, `DnsEvent` | `crates/phonescope-events/src/network.rs`, `src/http.rs`, `src/dns.rs` |
| Define event structs: `BatteryEvent`, `StorageEvent` | `crates/phonescope-events/src/battery.rs`, `src/storage.rs` |
| Define event structs: `ProcessEvent`, `ThermalEvent` | `crates/phonescope-events/src/process.rs`, `src/thermal.rs` |
| Define event structs: `AppUsageEvent`, `InsightEvent` | `crates/phonescope-events/src/usage.rs`, `src/insight.rs` |
| Define sub-types: `LogLevel`, `Protocol`, `Direction`, `PackageEventType`, `InsightCategory`, `InsightSeverity` | Respective module files |
| All types derive `Serialize, Deserialize, Clone, Debug, specta::Type` | All files |
| Unit tests for serialization round-trips | `crates/phonescope-events/src/lib.rs` (tests module) |

**Acceptance Criteria:**
- `cargo build -p phonescope-events` succeeds
- `cargo test -p phonescope-events` — all serde round-trip tests pass
- Every public type has `Serialize + Deserialize + Clone + Debug + specta::Type`

---

### T2 — Data Team

**Deliverable:** SQLite schema design (SQL files, not yet wired).

| Task | Files |
|------|-------|
| Design M1 tables: `device`, `session`, `package`, `app_permission`, `log_entry` | `docs/migration-registry.md`, draft SQL |
| Write migration 001 SQL | `apps/desktop/src-tauri/migrations/001-foundation.sql` |
| Review schema with INT team | — |

**Acceptance Criteria:**
- Migration SQL is reviewed and approved
- Schema covers all M1 data needs

---

### T4 — Frontend Team

**Deliverable:** React project with layout shell and placeholder pages.

| Task | Files |
|------|-------|
| Initialize Vite + React 19 + TypeScript 5 project | `apps/desktop/package.json`, `vite.config.ts`, `tsconfig.json` |
| Install deps: TailwindCSS, React Router, Zustand, TanStack Query, TanStack Table, Recharts | `apps/desktop/package.json` |
| Configure Tailwind | `apps/desktop/tailwind.config.ts`, `postcss.config.js` |
| Build layout: `Sidebar`, `Header`, `DevicePanel` | `apps/desktop/src/components/layout/Sidebar.tsx`, `Header.tsx`, `DevicePanel.tsx` |
| Set up React Router with all routes (placeholder pages) | `apps/desktop/src/router.tsx` |
| Create placeholder pages: Overview, Apps, Logs, Controls, Settings | `apps/desktop/src/pages/OverviewPage.tsx`, `AppsPage.tsx`, `LogsPage.tsx`, `ControlsPage.tsx`, `SettingsPage.tsx` |
| Create Zustand stores: `deviceStore`, `uiStore`, `settingsStore` | `apps/desktop/src/stores/deviceStore.ts`, `uiStore.ts`, `settingsStore.ts` |
| Set up Vitest | `apps/desktop/vitest.config.ts` |

**Acceptance Criteria:**
- `pnpm dev` starts the Vite dev server
- Layout renders with sidebar navigation and placeholder pages
- Router navigates between all placeholder pages
- `pnpm lint` passes

---

### INT — Integration Team

**Deliverable:** Cargo workspace, Tauri app shell, CI pipeline.

| Task | Files |
|------|-------|
| Create virtual workspace `Cargo.toml` with all member paths | `Cargo.toml` |
| Create `rust-toolchain.toml` | `rust-toolchain.toml` |
| Create `.rustfmt.toml`, `clippy.toml` | `.rustfmt.toml`, `clippy.toml` |
| Create `.gitignore` | `.gitignore` |
| Initialize Tauri 2 app: `src-tauri/Cargo.toml`, `tauri.conf.json` | `apps/desktop/src-tauri/Cargo.toml`, `apps/desktop/src-tauri/tauri.conf.json` |
| Create Tauri entry points | `apps/desktop/src-tauri/src/main.rs`, `apps/desktop/src-tauri/src/lib.rs` |
| Create `xtask/` crate skeleton | `xtask/Cargo.toml`, `xtask/src/main.rs` |
| Set up CI: cargo check, clippy, test, pnpm lint | `.github/workflows/ci.yml` |
| Create taurpc skeleton (empty router) | `crates/phonescope-tauri/Cargo.toml`, `crates/phonescope-tauri/src/lib.rs` |
| Create `AppState` struct | `crates/phonescope-tauri/src/state.rs` |
| Create `docs/migration-registry.md` | `docs/migration-registry.md` |

**Acceptance Criteria:**
- `cargo build --workspace` succeeds (with stub crates)
- `cargo clippy --workspace -- -D warnings` passes
- CI pipeline runs on push
- Tauri dev mode launches an empty window

---

### T3, T5, T6 — Idle Week

- Review architecture docs (`docs/07-architecture.md`, `docs/08-data-model.md`)
- Set up local dev environments
- T3: Study `adb logcat`, `dumpsys`, `top`, `dumpsys thermalservice` output formats
- T5: Study Android VpnService API, `/proc/net/tcp` format
- T6: Study mitmproxy CLI, HAR 1.2 format, sidecar patterns

---

## Week 2: ADB + Storage

### T1 — Platform Team

**Deliverable:** `phonescope-adb` crate v1.

| Task | Files |
|------|-------|
| Create crate skeleton | `crates/phonescope-adb/Cargo.toml` |
| Implement `AdbManager`: auto-detect adb path, `list_devices()` | `crates/phonescope-adb/src/lib.rs`, `src/device.rs` |
| Implement `AdbShell`: `exec()`, `exec_stream()` | `crates/phonescope-adb/src/shell.rs` |
| Implement `logcat_stream()` — streaming logcat via `adb logcat -v threadtime` | `crates/phonescope-adb/src/shell.rs` |
| Implement `is_rooted()` — check `adb shell id` for uid=0 | `crates/phonescope-adb/src/shell.rs` |
| Implement port forwarding: `forward_port()`, `reverse_port()` | `crates/phonescope-adb/src/port_forward.rs` |
| Implement file ops: `push_file()`, `pull_file()` | `crates/phonescope-adb/src/file_ops.rs` |
| Create test fixtures: recorded ADB output for parsing tests | `crates/phonescope-adb/tests/fixtures/` |
| Unit tests for device list parsing, logcat line parsing | `crates/phonescope-adb/tests/` |

**Acceptance Criteria:**
- `cargo test -p phonescope-adb` passes
- Can list connected devices (tested against emulator or real device)
- Logcat stream produces parsed log lines
- `is_rooted()` returns correct result

---

### T2 — Data Team

**Deliverable:** `phonescope-storage` crate v1.

| Task | Files |
|------|-------|
| Create crate skeleton | `crates/phonescope-storage/Cargo.toml` |
| Implement `Database::open()` with WAL mode, foreign keys, busy timeout | `crates/phonescope-storage/src/lib.rs` |
| Integrate `rusqlite_migration` | `crates/phonescope-storage/src/migrations.rs` |
| Write migration 001: device, session, package, app_permission, log_entry tables | `crates/phonescope-storage/src/migrations.rs` |
| Implement `insert_events()` for LogEvent and PackageEvent | `crates/phonescope-storage/src/lib.rs` |
| Implement `query_logs(filter: &LogFilter)` | `crates/phonescope-storage/src/queries.rs` |
| Implement `query_packages(device_id)` | `crates/phonescope-storage/src/queries.rs` |
| Define DB row types: `LogEntry`, `Package`, `Device`, `Session` | `crates/phonescope-storage/src/models.rs` |
| Unit tests with in-memory SQLite | `crates/phonescope-storage/tests/` |

**Acceptance Criteria:**
- `cargo test -p phonescope-storage` passes
- Migration applies to fresh DB and creates all M1 tables
- Can insert and query log entries and packages
- All queries use parameterized statements (no SQL injection)

---

### T4 — Frontend Team

**Deliverable:** Device list + LogsPage component (with mock data).

| Task | Files |
|------|-------|
| Build device list UI (shows connected devices, connect button) | `apps/desktop/src/pages/OverviewPage.tsx` |
| Build `LogsPage`: virtual-scrolling log table | `apps/desktop/src/pages/LogsPage.tsx` |
| Log level filter (V/D/I/W/E/F checkboxes) | `apps/desktop/src/pages/LogsPage.tsx` |
| Tag filter (text input) | `apps/desktop/src/pages/LogsPage.tsx` |
| Search bar for log messages | `apps/desktop/src/pages/LogsPage.tsx` |
| Auto-scroll toggle | `apps/desktop/src/pages/LogsPage.tsx` |
| Create `DataTable` reusable component | `apps/desktop/src/components/common/DataTable.tsx` |
| Create `Badge` component for log levels | `apps/desktop/src/components/common/Badge.tsx` |
| Mock data service for development | `apps/desktop/src/services/mockData.ts` |

**Acceptance Criteria:**
- LogsPage renders with mock log data
- Level filtering works
- Virtual scrolling handles 10K+ rows smoothly
- Auto-scroll follows new entries

---

### INT — Integration Team

**Deliverable:** taurpc DeviceCommands wired.

| Task | Files |
|------|-------|
| Define `DeviceCommands` taurpc procedures: `list_devices`, `connect_device`, `disconnect_device` | `crates/phonescope-tauri/src/commands/device.rs` |
| Implement `DeviceCommandsImpl` using `phonescope-adb` | `crates/phonescope-tauri/src/commands/device.rs` |
| Wire router in `phonescope-tauri/src/lib.rs` | `crates/phonescope-tauri/src/lib.rs` |
| Update `AppState` with `AdbManager` | `crates/phonescope-tauri/src/state.rs` |
| Generate TypeScript types for frontend | `apps/desktop/src/services/ipc.ts` |

**Acceptance Criteria:**
- Frontend can call `list_devices()` and get real device list
- `connect_device(serial)` establishes an ADB connection

---

### T3 — Collectors Team

**Deliverable:** `Collector` trait definition + plan.

| Task | Files |
|------|-------|
| Create crate skeleton | `crates/phonescope-collectors/Cargo.toml` |
| Define `Collector` trait: `name()`, `required_capabilities()`, `collect_once()`, `collect_stream()`, `default_interval()` | `crates/phonescope-collectors/src/traits.rs` |
| Define `CollectorContext` struct | `crates/phonescope-collectors/src/traits.rs` |
| Define `CapabilitySet` type | `crates/phonescope-collectors/src/traits.rs` |
| Study and document logcat threadtime format for parser | `crates/phonescope-collectors/tests/fixtures/logcat_sample.txt` |
| Study and document `pm list packages` + `dumpsys package` format | `crates/phonescope-collectors/tests/fixtures/` |

**Acceptance Criteria:**
- Trait compiles and is usable by downstream crates
- Test fixtures are realistic and cover edge cases

---

## Week 3: First Collectors + Pages

### T1 — Platform Team

**Deliverable:** `phonescope-core` crate v1 skeleton.

| Task | Files |
|------|-------|
| Create crate skeleton | `crates/phonescope-core/Cargo.toml` |
| Define `PhoneScope` struct (config, adb, db, event_bus, sessions) | `crates/phonescope-core/src/lib.rs` |
| Define `SessionHandle` struct | `crates/phonescope-core/src/lib.rs` |
| Implement `start_session(serial)` — creates session in DB, returns session_id | `crates/phonescope-core/src/lib.rs` |
| Implement `stop_session(serial)` — ends session, stops collectors | `crates/phonescope-core/src/lib.rs` |
| Implement basic `detect_capabilities()` — ADB-only mode (check root, check helper installed) | `crates/phonescope-core/src/lib.rs` |
| Define `Config` struct | `crates/phonescope-core/src/lib.rs` |

**Acceptance Criteria:**
- Can create and end sessions
- Capability detection returns correct ADB-only profile
- Session persists to database

---

### T3 — Collectors Team

**Deliverable:** `LogcatCollector` + `PackageCollector`.

| Task | Files |
|------|-------|
| Implement `LogcatCollector` — streams `adb logcat -v threadtime`, parses each line into `LogEvent` | `crates/phonescope-collectors/src/logcat.rs` |
| Logcat line parser: extract timestamp, pid, tid, level, tag, message | `crates/phonescope-collectors/src/logcat.rs` |
| Implement `PackageCollector` — runs `adb shell pm list packages -f`, parses into `PackageEvent` | `crates/phonescope-collectors/src/package.rs` |
| Package detail parser: parse `dumpsys package <pkg>` for version, permissions, installer | `crates/phonescope-collectors/src/package.rs` |
| Unit tests with fixture data | `crates/phonescope-collectors/tests/` |

**Acceptance Criteria:**
- LogcatCollector produces valid `LogEvent` stream from ADB
- PackageCollector lists all installed packages with metadata
- Parsers handle edge cases (multiline log messages, Unicode, missing fields)

---

### T2 — Data Team

**Deliverable:** Enhanced queries + LogFilter.

| Task | Files |
|------|-------|
| Define `LogFilter` struct (level, tag pattern, message search, time range, package) | `crates/phonescope-storage/src/queries.rs` |
| Implement filtered log queries with pagination (offset + limit) | `crates/phonescope-storage/src/queries.rs` |
| Implement `insert_package()` and `update_package()` (upsert logic) | `crates/phonescope-storage/src/queries.rs` |
| Implement `query_packages(device_id)` with sorting options | `crates/phonescope-storage/src/queries.rs` |
| Add retention skeleton: `RetentionConfig`, `run_retention()` stub | `crates/phonescope-storage/src/retention.rs` |

**Acceptance Criteria:**
- Log queries with filters return correct results
- Package upsert handles re-scans without duplicates
- Pagination works correctly

---

### T4 — Frontend Team

**Deliverable:** AppsPage + LogsPage with real structure.

| Task | Files |
|------|-------|
| Build `AppsPage`: sortable table (name, package, version, system flag, status) | `apps/desktop/src/pages/AppsPage.tsx` |
| App search bar and filter (system/user/all) | `apps/desktop/src/pages/AppsPage.tsx` |
| Create `useApps` hook (TanStack Query wrapping taurpc) | `apps/desktop/src/hooks/useApps.ts` |
| Create `useLogs` hook | `apps/desktop/src/hooks/useLogs.ts` |
| Enhance LogsPage with pause/resume stream, clear button | `apps/desktop/src/pages/LogsPage.tsx` |
| Create `ConfidenceIndicator` component | `apps/desktop/src/components/common/ConfidenceIndicator.tsx` |

**Acceptance Criteria:**
- AppsPage shows sortable, searchable app table
- LogsPage streams logs in real time (mock → will connect to real in Week 4)
- Hooks are ready to swap mock data for real taurpc calls

---

### INT — Integration Team

**Deliverable:** LogCommands + AppCommands wired.

| Task | Files |
|------|-------|
| Define `LogCommands` taurpc procedures: `get_logs`, `get_log_tags`, `clear_log_buffer` | `crates/phonescope-tauri/src/commands/logs.rs` |
| Define `AppCommands` procedures: `list_packages`, `get_package_detail`, `force_stop_app`, `clear_app_data`, `disable_app`, `uninstall_app` | `crates/phonescope-tauri/src/commands/apps.rs` |
| Implement commands using `phonescope-core` + `phonescope-storage` | `crates/phonescope-tauri/src/commands/` |
| Define `PhoneScopeEvents` for real-time push: `on_device_event`, `on_device_connected` | `crates/phonescope-tauri/src/lib.rs` |
| Update TypeScript types | `apps/desktop/src/types/` |

**Acceptance Criteria:**
- Frontend can call `list_packages()` and get real app list
- Frontend can call `get_logs()` with filters
- Real-time log events pushed from Rust to frontend

---

## Week 4: Controls + Full Integration

### T1 — Platform Team

**Deliverable:** EventBus + enhanced capability detection.

| Task | Files |
|------|-------|
| Create EventBus: `tokio::broadcast::Sender<DeviceEvent>` in `PhoneScope` | `crates/phonescope-core/src/lib.rs` |
| Implement `subscribe_events()` returning `broadcast::Receiver` | `crates/phonescope-core/src/lib.rs` |
| Wire collectors into session lifecycle: start collectors on session start, stop on end | `crates/phonescope-core/src/lib.rs` |
| Enhanced capability detection: check dumpsys access, netstats, logcat permissions | `crates/phonescope-core/src/lib.rs` |
| Define `Capabilities` bitflags | `crates/phonescope-core/src/lib.rs` |

**Acceptance Criteria:**
- EventBus distributes events to multiple subscribers
- Collectors start/stop with session lifecycle
- Capability detection reports accurate capabilities

---

### T3 — Collectors Team

**Deliverable:** Collectors wired to EventBus.

| Task | Files |
|------|-------|
| Wire `LogcatCollector` to emit events on EventBus | `crates/phonescope-collectors/src/logcat.rs` |
| Wire `PackageCollector` to emit events on EventBus | `crates/phonescope-collectors/src/package.rs` |
| Implement collector error handling: log errors, continue collecting | `crates/phonescope-collectors/src/traits.rs` |
| Create `CollectorManager`: starts/stops collectors based on capabilities | `crates/phonescope-collectors/src/lib.rs` |

**Acceptance Criteria:**
- Collectors emit events through EventBus
- A failed collector doesn't crash others
- CollectorManager respects capability profile

---

### T2 — Data Team

**Deliverable:** StorageWriter with batched inserts.

| Task | Files |
|------|-------|
| Implement `StorageWriter`: subscribes to EventBus, batches events (100 or 1s) | `crates/phonescope-storage/src/lib.rs` |
| Batch insert in single SQLite transaction | `crates/phonescope-storage/src/lib.rs` |
| Implement `run_retention()` for log_entry table (default 7 days) | `crates/phonescope-storage/src/retention.rs` |
| Performance test: insert 10K events in batch, measure time | `crates/phonescope-storage/tests/` |

**Acceptance Criteria:**
- StorageWriter batches correctly (100 events or 1s timeout)
- Batch insert of 10K events completes in < 1s
- Retention deletes old log entries correctly

---

### T4 — Frontend Team

**Deliverable:** ControlsPage + OverviewPage + real data wiring.

| Task | Files |
|------|-------|
| Build `ControlsPage`: force stop, uninstall, disable buttons per app | `apps/desktop/src/pages/ControlsPage.tsx` |
| Confirmation dialogs for destructive actions (uninstall, clear data) | `apps/desktop/src/pages/ControlsPage.tsx` |
| Build `OverviewPage`: device info cards (model, Android version, SDK, storage, battery) | `apps/desktop/src/pages/OverviewPage.tsx` |
| Recent activity feed on OverviewPage | `apps/desktop/src/pages/OverviewPage.tsx` |
| Create `useDevice` hook | `apps/desktop/src/hooks/useDevice.ts` |
| Create `useSession` hook | `apps/desktop/src/hooks/useSession.ts` |
| Wire ALL pages to real taurpc backend (replace mock data) | All page files |
| Real-time log streaming via taurpc events | `apps/desktop/src/hooks/useLogs.ts` |

**Acceptance Criteria:**
- Force stop button actually stops the app on the device
- Uninstall button removes the app (with confirmation)
- OverviewPage shows real device info
- Logs stream in real time from the actual device

---

### INT — Integration Team

**Deliverable:** Full M1 integration + E2E test.

| Task | Files |
|------|-------|
| Wire `SessionCommands`: `start_session`, `stop_session`, `get_active_sessions` | `crates/phonescope-tauri/src/commands/session.rs` |
| Wire EventBus -> taurpc events (push device events to frontend) | `crates/phonescope-tauri/src/lib.rs` |
| Implement `SettingsCommands`: `get_adb_path`, `set_adb_path` | `crates/phonescope-tauri/src/commands/settings.rs` |
| Full integration test: connect to emulator, stream logs, list apps, force stop | `apps/desktop/src-tauri/tests/` |
| Ensure CI runs all tests | `.github/workflows/ci.yml` |

**Acceptance Criteria:**
- E2E flow works: launch app → see device → connect → logs stream → apps listed → force stop works
- All Rust tests pass
- All frontend lint/tests pass
- CI is green

---

## M1 Exit Criteria Checklist

- [ ] Connect to real Android device via ADB
- [ ] Display device info (model, Android version, SDK level)
- [ ] Stream logcat in real time with level/tag/search filtering
- [ ] List all installed apps with metadata
- [ ] Force stop an app from the UI
- [ ] Uninstall an app from the UI (with confirmation)
- [ ] `cargo clippy --workspace -- -D warnings` passes
- [ ] `cargo test --workspace` passes
- [ ] `pnpm lint` and `pnpm test` pass
- [ ] CI pipeline green
- [ ] Handover docs written for phonescope-events, phonescope-adb, phonescope-storage

---

## Handovers from M1

| From | To | What | Handover Doc |
|------|----|------|-------------|
| T1 | All teams | `phonescope-events` v1 — all event types stable | `docs/handovers/events-v1.md` |
| T1 | T3, INT | `phonescope-adb` v1 — device listing, shell, logcat | `docs/handovers/adb-v1.md` |
| T2 | T3, INT | `phonescope-storage` v1 — migrations, insert, query | `docs/handovers/storage-v1.md` |
| T1 | INT | `phonescope-core` v1 — sessions, capabilities, EventBus | `docs/handovers/core-v1.md` |
| T3 | INT | LogcatCollector + PackageCollector | `docs/handovers/collectors-v1.md` |
