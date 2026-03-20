# PhoneScope

Local-first Android phone observability and control desktop application.

## Project Overview

PhoneScope connects to Android devices over ADB, collects telemetry (logcat, network flows, battery, storage, packages, process/CPU/RAM, thermal data, app usage), normalizes it into a unified event model, stores it in local SQLite, and presents it through a Tauri+React desktop UI. An optional Kotlin helper app on the device enables VPN-based per-app network capture. An optional managed mitmproxy sidecar enables full HTTP request inspection. Long-term app usage snapshots allow tracking phone behavior over months/years beyond what Android retains natively.

## Tech Stack

- Desktop core: Rust (2021 edition, workspace of 12 crates)
- Desktop UI: Tauri 2 + React 19 + TypeScript 5
- Android helper: Kotlin (minSdk 26, targetSdk 35)
- Database: SQLite via rusqlite (WAL mode)
- Proxy: mitmproxy (managed as Tauri sidecar via tauri-plugin-shell)
- IPC type safety: taurpc (generates TS types from Rust traits)
- Communication: ADB port-forward + WebSocket (tokio-tungstenite)

## Repository Layout

```
phonescope/                     # root — virtual Cargo workspace
  Cargo.toml                    # [workspace] members
  Cargo.lock
  CLAUDE.md
  docs/                         # Design documents
  crates/
    phonescope-core/            # Orchestrator, session, config
    phonescope-adb/             # ADB device manager
    phonescope-collectors/      # All data collectors
    phonescope-proxy/           # mitmproxy process manager
    phonescope-events/          # All event types (leaf crate)
    phonescope-analytics/       # Aggregation, scoring, patterns
    phonescope-insights/        # User-friendly insight rules
    phonescope-storage/         # SQLite persistence + migrations
    phonescope-helper-protocol/ # WebSocket message types
    phonescope-process/         # Process/CPU/RAM/thermal monitoring
    phonescope-usage/           # App usage tracking + snapshots
    phonescope-tauri/           # Tauri IPC commands
  apps/
    desktop/
      src-tauri/                # Tauri app shell
        binaries/               # mitmproxy sidecar (gitignored)
        capabilities/
        migrations/
      src/                      # React frontend
    android/                    # Kotlin helper app
  xtask/                        # Build automation
  .github/workflows/
```

## Build Commands

```sh
cargo build --workspace                    # Build all Rust crates
cargo test --workspace                     # Run all Rust tests
cargo clippy --workspace -- -D warnings    # Lint
cd apps/desktop && pnpm install            # Install frontend deps
cd apps/desktop && pnpm dev                # Run Tauri dev mode
cd apps/desktop && pnpm build              # Production build
cd apps/android && ./gradlew assembleDebug # Build Android helper
cargo xtask fetch-mitmproxy               # Download mitmproxy sidecar
```

## Coding Conventions

- Rust: use thiserror for error types, anyhow in binary crates only. All public types derive Serialize+Deserialize. Prefer &str over String in function args. No unwrap() in library crates.
- TypeScript: strict mode, no `any`. Use Zod for runtime validation at IPC boundary. React components are functional with hooks.
- SQL: snake_case table/column names, every table has `id INTEGER PRIMARY KEY`, `created_at TEXT NOT NULL DEFAULT (datetime('now'))`.
- All timestamps are ISO 8601 UTC strings in the database, chrono::DateTime<Utc> in Rust, Date objects in TypeScript.
- Crate-level error types: each crate defines `pub type Result<T> = std::result::Result<T, Error>;` with its own Error enum.

## Testing Strategy

- Rust: unit tests in each module, integration tests in tests/ dir. phonescope-storage uses in-memory SQLite. phonescope-adb uses recorded ADB output fixtures.
- TypeScript: Vitest for unit tests, Playwright for E2E.
- Android: JUnit + MockK, Espresso for UI.

## Key Design Decisions

1. Local-only storage — no cloud, no telemetry, no accounts.
2. Capability-aware degradation — app detects what the device supports and adapts.
3. mitmproxy as sidecar — managed via tauri-plugin-shell.
4. taurpc for type-safe IPC — no magic invoke strings.
5. SQLite WAL mode — set at connection open.
6. Event normalization — all collectors produce DeviceEvent variants.
7. Confidence levels on all measurements — Exact/Approximate/Inferred/Unavailable.
8. Long-term snapshots — periodic app usage snapshots stored locally to build history beyond Android retention.
