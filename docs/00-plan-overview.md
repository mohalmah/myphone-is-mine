# PhoneScope — Master Plan & Team Coordination

## Table of Contents

1. [Guiding Principles](#guiding-principles)
2. [Team Structure](#team-structure)
3. [Dependency Graph & Start Order](#dependency-graph--start-order)
4. [Conflict Avoidance Strategy](#conflict-avoidance-strategy)
5. [Big Milestones (M1–M6)](#big-milestones)
6. [Weekly Deliverables per Team](#weekly-deliverables-per-team)
7. [Handover Protocol](#handover-protocol)
8. [Integration Team Responsibilities](#integration-team-responsibilities)

---

## Guiding Principles

### What to Start First

1. **phonescope-events crate** — this is the leaf crate with ZERO internal dependencies. Every other crate depends on it. It MUST be finished first (Week 1, Day 1-2).
2. **phonescope-storage crate** — the database schema underpins all queries. Must be stable before any collector writes data.
3. **phonescope-adb crate** — the primary data transport. All ADB-based collectors depend on it.
4. **Skeleton Tauri app + React shell** — teams need a running app to integrate into.

### Ordering Rule

```
Events (leaf) → Storage + ADB (parallel) → Collectors → Core → Tauri IPC → Frontend pages
```

No team should start a crate that depends on an unfinished crate. If blocked, build against trait interfaces and mock implementations.

### Conflict Avoidance Rules

1. **One team owns one crate.** No two teams edit the same Rust crate in the same week.
2. **Shared types live in phonescope-events only.** If you need a new type that crosses crate boundaries, add it to events (coordinated through the Integration Team).
3. **Frontend pages are isolated.** Each page is a self-contained route. Teams can build pages in parallel as long as they don't modify shared layout components.
4. **Integration points are defined by traits.** Teams code against `trait Collector`, `trait InsightRule`, etc. The Integration Team wires implementations together.
5. **Database migrations are sequential.** Only one team adds migrations per week. Coordinate via a shared migration registry (a numbered list in `docs/migration-registry.md`).
6. **Git workflow:** Each team works on their own feature branch (`team-X/milestone-Y`). Integration Team merges into the main development branch weekly.

---

## Team Structure

| Team | Name | Focus Area | Crates Owned |
|------|------|------------|--------------|
| **T1** | Platform Team | ADB, device management, capability detection | `phonescope-events`, `phonescope-adb`, `phonescope-core` |
| **T2** | Data Team | Storage, analytics, insights, usage tracking | `phonescope-storage`, `phonescope-analytics`, `phonescope-insights`, `phonescope-usage` |
| **T3** | Collectors Team | All data collectors, process/thermal monitoring | `phonescope-collectors`, `phonescope-process` |
| **T4** | Frontend Team | React UI, all pages, dashboard, charts | `apps/desktop/src/` (entire React app) |
| **T5** | Android Team | Kotlin helper app, VPN capture | `apps/android/`, `phonescope-helper-protocol` |
| **T6** | Proxy Team | mitmproxy sidecar, HAR parsing, HTTP inspection | `phonescope-proxy` |
| **INT** | Integration Team | Tauri IPC, wiring, CI/CD, final assembly | `phonescope-tauri`, `apps/desktop/src-tauri/`, `xtask/`, `.github/` |

---

## Dependency Graph & Start Order

```
Week 1:  T1 builds phonescope-events (everyone blocked until this ships)
         T4 builds React shell + layout (no backend needed)
         INT sets up monorepo, CI, Cargo workspace

Week 2:  T1 builds phonescope-adb
         T2 builds phonescope-storage (depends on events)
         T4 continues layout + mock pages
         INT builds Tauri app shell + taurpc skeleton

Week 3+: All teams can work in parallel (see weekly breakdown below)
```

### Crate Dependency Graph

```
phonescope-events              ← LEAF (no deps)
  ├── phonescope-storage       ← depends on: events
  ├── phonescope-adb           ← depends on: events
  ├── phonescope-proxy         ← depends on: events
  ├── phonescope-helper-protocol ← depends on: events
  ├── phonescope-process       ← depends on: events
  ├── phonescope-usage         ← depends on: events, storage
  ├── phonescope-collectors    ← depends on: events, adb, proxy, helper-protocol, process
  ├── phonescope-analytics     ← depends on: events, storage
  ├── phonescope-insights      ← depends on: events, analytics
  ├── phonescope-core          ← depends on: events, adb, collectors, storage, analytics, insights, proxy, helper-protocol, process, usage
  └── phonescope-tauri         ← depends on: core, events, storage
```

---

## Conflict Avoidance Strategy

### File Ownership Map

| Path | Owner | Others May NOT Touch |
|------|-------|---------------------|
| `crates/phonescope-events/` | T1 (Weeks 1-2), then shared read-only | Without INT approval |
| `crates/phonescope-adb/` | T1 | ✓ |
| `crates/phonescope-core/` | T1 (late), then INT | ✓ |
| `crates/phonescope-storage/` | T2 | ✓ |
| `crates/phonescope-analytics/` | T2 | ✓ |
| `crates/phonescope-insights/` | T2 | ✓ |
| `crates/phonescope-usage/` | T2 | ✓ |
| `crates/phonescope-collectors/` | T3 | ✓ |
| `crates/phonescope-process/` | T3 | ✓ |
| `crates/phonescope-proxy/` | T6 | ✓ |
| `crates/phonescope-helper-protocol/` | T5 | ✓ |
| `crates/phonescope-tauri/` | INT | ✓ |
| `apps/desktop/src-tauri/` | INT | ✓ |
| `apps/desktop/src/` | T4 | ✓ |
| `apps/android/` | T5 | ✓ |
| `xtask/` | INT | ✓ |
| `.github/` | INT | ✓ |

### Shared Interface Contract

When a team needs another team's output, they code against:
1. **Traits** defined in the owning crate (e.g., `trait Collector` in phonescope-collectors)
2. **Types** defined in phonescope-events (the universal shared vocabulary)
3. **Mock implementations** until the real one is ready

The Integration Team (INT) maintains a `docs/interface-contracts.md` file listing all cross-team interfaces, their status (draft/stable/frozen), and which team owns each.

---

## Big Milestones

### M1: Foundation (Weeks 1–4)
**Goal:** Connect to device, show info, stream logs, list apps, basic controls.
**Ship criteria:** A user can plug in an Android phone, see device info, stream logcat live, browse installed apps, and force-stop an app.

### M2: Deep Telemetry (Weeks 5–8)
**Goal:** Battery, storage, network stats (ADB-based), process/CPU/RAM monitoring, thermal analysis, resource recommendations, basic insights.
**Ship criteria:** Battery timeline, storage breakdown, network flows, process list with CPU/RAM, thermal warnings, and at least 5 insight rules generating results.

### M3: App Usage Intelligence (Weeks 9–11)
**Goal:** App usage tracking with periodic snapshots, long-term usage dashboard, usage comparison across time periods.
**Ship criteria:** Usage data collected and snapshotted on schedule, dashboard shows usage trends over weeks/months, snapshot history is browsable.

### M4: Helper App & Per-App Network (Weeks 9–13)
**Goal:** Kotlin helper app with VPN capture, per-app network attribution.
**Ship criteria:** Helper installs, pairs over ADB, streams per-app flows in real time with correct app attribution.

### M5: Proxy Mode & HTTP Inspection (Weeks 12–15)
**Goal:** mitmproxy sidecar, HTTP request inspection, HAR export.
**Ship criteria:** Proxy starts as sidecar, HTTP requests visible with full detail, HAR export works.

### M6: Polish & Ship (Weeks 16–19)
**Goal:** Onboarding wizard, reports, performance, root mode, dark mode, E2E tests, packaging.
**Ship criteria:** New user completes setup in <2 minutes. Reports exportable. Handles 1M+ log entries. Packaged for Windows/macOS/Linux.

---

## Weekly Deliverables per Team

See the detailed breakdown in the following docs:
- `docs/01-milestone-M1.md` — Foundation (Weeks 1–4)
- `docs/02-milestone-M2.md` — Deep Telemetry (Weeks 5–8)
- `docs/03-milestone-M3.md` — App Usage Intelligence (Weeks 9–11)
- `docs/04-milestone-M4.md` — Helper App (Weeks 9–13)
- `docs/05-milestone-M5.md` — Proxy Mode (Weeks 12–15)
- `docs/06-milestone-M6.md` — Polish & Ship (Weeks 16–19)
- `docs/07-architecture.md` — Full architecture reference
- `docs/08-data-model.md` — SQLite schema + event types
- `docs/09-frontend.md` — React frontend architecture
- `docs/10-android-helper.md` — Android helper app design
- `docs/11-security-privacy.md` — Security, redaction, consent
- `docs/12-acceptance-criteria.md` — Testing requirements per phase

---

## Handover Protocol

When a team finishes a crate/component that another team depends on:

1. **Tag the handover commit**: `git tag handover/crate-name-v1`
2. **Write a handover doc** in `docs/handovers/`: what's done, what the API looks like, known limitations, example usage.
3. **Notify Integration Team** via the project channel.
4. **Integration Team reviews** within 24 hours, then announces availability to downstream teams.
5. **Downstream teams pull** and replace mocks with real implementations.

### Critical Handover Points

| From | To | What | When |
|------|----|------|------|
| T1 | Everyone | `phonescope-events` v1 (all types) | End of Week 1 |
| T1 | T3, INT | `phonescope-adb` v1 (shell, logcat, device listing) | End of Week 2 |
| T2 | T3, INT | `phonescope-storage` v1 (migrations, insert/query) | End of Week 2 |
| INT | T4 | Tauri app shell + taurpc skeleton | End of Week 2 |
| T3 | INT | Logcat + Package + Battery + Storage collectors | End of Week 4 |
| T1 | INT | `phonescope-core` v1 (session, capability detection) | End of Week 4 |
| INT | T4 | All IPC commands for M1 pages | End of Week 4 |
| T3 | INT | Process/thermal collectors | End of Week 7 |
| T2 | INT | Analytics + insights engine | End of Week 8 |
| T2 | INT | Usage tracking + snapshot system | End of Week 11 |
| T5 | INT | Helper app + protocol | End of Week 13 |
| T6 | INT | Proxy manager + HAR parsing | End of Week 14 |

---

## Integration Team Responsibilities

The Integration Team (INT) is the **glue**. They:

1. **Own the Tauri IPC layer** — translate Rust crate APIs into taurpc commands.
2. **Own CI/CD** — ensure all teams' code compiles together, tests pass.
3. **Resolve merge conflicts** — weekly integration merges from team branches.
4. **Maintain the migration registry** — ensure sequential, non-conflicting DB migrations.
5. **Write the onboarding/setup code** — Tauri app configuration, sidecar management, state initialization.
6. **Performance testing** — ensure the integrated system meets performance criteria.
7. **Release packaging** — Tauri build for all platforms.

### Weekly Integration Cadence

- **Monday**: Teams push their weekly deliverables to team branches.
- **Tuesday**: INT merges all team branches, resolves conflicts, runs full test suite.
- **Wednesday**: INT announces integration status. If broken, affected teams fix by Thursday.
- **Thursday**: INT tags a weekly integration build.
- **Friday**: Teams start next week's work, INT writes integration notes.
