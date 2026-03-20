# M3: App Usage Intelligence (Weeks 9–11)

**Goal:** Long-term app usage tracking with periodic snapshots stored in SQLite. Users can see phone usage trends over weeks/months/years — beyond what Android retains natively.

**Ship Criteria:** Usage data collected and snapshotted on schedule, dashboard shows usage trends over weeks/months, snapshot history is browsable, usage goals are settable, and stale-app recommendations work.

**Parallel Note:** M3 (Weeks 9-11) runs in parallel with M4 (Weeks 9-13). T2 and T4 split time between both. T5 and T3 focus primarily on M4 during this period.

---

## Core Concept

Android's `usagestats` service only retains data for limited periods (typically 7 days for daily stats, 30 days for weekly). PhoneScope overcomes this by:

1. Periodically capturing usage stats via ADB (`dumpsys usagestats`, `cmd usage_stats query`)
2. Storing snapshots in local SQLite with deduplication
3. Building long-term history that persists across months/years
4. Never auto-deleting usage snapshots (unlike other telemetry tables)

---

## New Crate: phonescope-usage

**Owner:** T2 (Data Team)

```
crates/phonescope-usage/
  Cargo.toml
  src/
    lib.rs              # UsageTracker, snapshot scheduler
    parser.rs           # Parse dumpsys usagestats output
    snapshots.rs        # Snapshot creation, deduplication, merging
    comparison.rs       # Period-over-period comparison logic
    goals.rs            # Usage goal tracking
    categories.rs       # App category classification
```

### Key Types (in phonescope-events)

```rust
pub struct AppUsageEvent {
    pub meta: EventMeta,
    pub package_name: String,
    pub foreground_time_ms: u64,
    pub background_time_ms: u64,
    pub last_time_used: Option<DateTime<Utc>>,
    pub launch_count: u32,
    pub notifications_posted: u32,
    pub category: Option<AppCategory>,
}

pub enum AppCategory {
    Social, Productivity, Games, Entertainment, Communication,
    News, Shopping, Finance, Health, Education, Travel, Utilities, Other,
}

pub struct ScreenTimeEvent {
    pub meta: EventMeta,
    pub total_screen_on_ms: u64,
    pub unlock_count: u32,
}
```

### SQLite Tables

```sql
CREATE TABLE usage_snapshot (
    id              INTEGER PRIMARY KEY,
    session_id      INTEGER NOT NULL REFERENCES session(id),
    device_id       INTEGER NOT NULL REFERENCES device(id),
    snapshot_type   TEXT NOT NULL, -- hourly, daily, weekly, manual
    period_start    TEXT NOT NULL,
    period_end      TEXT NOT NULL,
    captured_at     TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(device_id, snapshot_type, period_start)
);

CREATE TABLE app_usage_record (
    id                   INTEGER PRIMARY KEY,
    snapshot_id          INTEGER NOT NULL REFERENCES usage_snapshot(id),
    package_id           INTEGER NOT NULL REFERENCES package(id),
    foreground_time_ms   INTEGER NOT NULL DEFAULT 0,
    background_time_ms   INTEGER NOT NULL DEFAULT 0,
    launch_count         INTEGER NOT NULL DEFAULT 0,
    notifications_posted INTEGER NOT NULL DEFAULT 0,
    last_time_used       TEXT,
    category             TEXT
);

CREATE TABLE screen_time_record (
    id                  INTEGER PRIMARY KEY,
    snapshot_id         INTEGER NOT NULL REFERENCES usage_snapshot(id),
    total_screen_on_ms  INTEGER NOT NULL DEFAULT 0,
    unlock_count        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE usage_goal (
    id              INTEGER PRIMARY KEY,
    device_id       INTEGER NOT NULL REFERENCES device(id),
    package_id      INTEGER REFERENCES package(id), -- NULL = overall screen time goal
    daily_limit_ms  INTEGER NOT NULL,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_usage_snapshot_device ON usage_snapshot(device_id, snapshot_type);
CREATE INDEX idx_app_usage_record_snapshot ON app_usage_record(snapshot_id);
CREATE INDEX idx_app_usage_record_package ON app_usage_record(package_id);
```

**Retention:** `usage_snapshot` and related records are NEVER auto-deleted. This is the core long-term data store.

---

## Week 9: Usage Crate + DB Tables + UsageCollector + ADB Parsing

### T2 — Data Team

**Deliverable:** `phonescope-usage` crate + DB tables.

| Task | Files |
|------|-------|
| Create crate skeleton | `crates/phonescope-usage/Cargo.toml`, `src/lib.rs` |
| Write migration 006: `usage_snapshot`, `app_usage_record`, `screen_time_record`, `usage_goal` | `crates/phonescope-storage/src/migrations.rs` |
| Implement `dumpsys usagestats` parser | `crates/phonescope-usage/src/parser.rs` |
| Implement `cmd usage_stats query --days N` parser | `crates/phonescope-usage/src/parser.rs` |
| Implement `UsageTracker::capture_snapshot()` — one-shot capture | `crates/phonescope-usage/src/lib.rs` |
| Implement snapshot storage: insert with UNIQUE constraint handling | `crates/phonescope-usage/src/snapshots.rs` |
| Implement deduplication: if same (device, type, period_start) exists, merge/update | `crates/phonescope-usage/src/snapshots.rs` |
| Implement app category classification (heuristic from package name + play store category if available) | `crates/phonescope-usage/src/categories.rs` |
| Storage queries: `insert_usage_snapshot()`, `query_usage_snapshots()` | `crates/phonescope-storage/src/queries.rs` |
| Test fixtures: recorded `dumpsys usagestats` output from different Android versions | `crates/phonescope-usage/tests/fixtures/` |
| Unit tests for parser, deduplication, category classification | `crates/phonescope-usage/tests/` |

**Acceptance Criteria:**
- Parser correctly extracts per-app foreground time, launch count, last used
- Deduplication: inserting same period twice updates rather than duplicates
- Categories assigned for common packages (com.instagram.android → Social)

---

### T3 — Collectors Team

**Deliverable:** `UsageCollector`.

| Task | Files |
|------|-------|
| Implement `UsageCollector` — runs ADB commands, feeds through usage parser | `crates/phonescope-collectors/src/usage.rs` |
| Check `settings get secure usage_stats_enabled` before attempting collection | `crates/phonescope-collectors/src/usage.rs` |
| Register in `CollectorManager` with default interval (hourly) | `crates/phonescope-collectors/src/lib.rs` |
| Unit tests with fixture data | `crates/phonescope-collectors/tests/` |

**Acceptance Criteria:**
- Collector produces valid `AppUsageEvent` list
- Gracefully handles `usage_stats_enabled=0` (returns empty with log warning)
- Works on Android 8+ (API 26+)

---

### T4 — Frontend Team (split with M4 work)

**Deliverable:** UsagePage skeleton.

| Task | Files |
|------|-------|
| Create `UsagePage` route at `/usage` | `apps/desktop/src/pages/UsagePage.tsx` |
| Daily screen time bar chart component (last 30 days) | `apps/desktop/src/components/usage/ScreenTimeChart.tsx` |
| App usage breakdown component (stacked bar or pie) | `apps/desktop/src/components/usage/AppUsageBreakdown.tsx` |
| Create `useUsage` hook | `apps/desktop/src/hooks/useUsage.ts` |
| Add Usage link to sidebar navigation | `apps/desktop/src/components/layout/Sidebar.tsx` |

---

## Week 10: Snapshot Scheduler + Historical Queries + Charts

### T2 — Data Team

**Deliverable:** Snapshot scheduler + comparison logic.

| Task | Files |
|------|-------|
| Implement snapshot scheduler: hourly when connected, daily at midnight, weekly on Sunday | `crates/phonescope-usage/src/lib.rs` |
| Scheduler uses tokio interval timer, checks if snapshot already exists for period | `crates/phonescope-usage/src/lib.rs` |
| Implement `query_usage_range(device_id, start, end)` — aggregate usage across snapshots | `crates/phonescope-usage/src/snapshots.rs` |
| Implement `compare_periods(device_id, period_a, period_b)` — week-over-week, month-over-month | `crates/phonescope-usage/src/comparison.rs` |
| Return `UsageComparison { app, current_ms, previous_ms, change_percent, trend }` | `crates/phonescope-usage/src/comparison.rs` |
| Implement `get_top_apps_by_usage(device_id, days, limit)` | `crates/phonescope-usage/src/snapshots.rs` |
| Implement `get_hourly_distribution(device_id, days)` — which hours are most active | `crates/phonescope-usage/src/snapshots.rs` |
| Implement `get_category_breakdown(device_id, days)` | `crates/phonescope-usage/src/snapshots.rs` |
| Performance test: 365 days of daily snapshots (50 apps each) — query time < 2s | `crates/phonescope-usage/tests/` |

**Acceptance Criteria:**
- Scheduler captures snapshots at correct intervals
- Deduplication works when scheduler fires twice for same period
- Period comparison calculates correct percentages
- Hourly distribution returns 24-element array
- 365 days of data queries in < 2 seconds

---

### T4 — Frontend Team

**Deliverable:** Full UsagePage with charts.

| Task | Files |
|------|-------|
| Top apps table: ranked by foreground time with trend arrows (↑/↓ vs previous period) | `apps/desktop/src/components/usage/TopAppsTable.tsx` |
| Usage heatmap: 7x24 grid (day-of-week × hour) showing intensity | `apps/desktop/src/components/usage/UsageHeatmap.tsx` |
| Category breakdown pie chart (Social, Productivity, Games, etc.) | `apps/desktop/src/components/usage/CategoryBreakdown.tsx` |
| Period comparison view: "This week vs last week" with delta indicators | `apps/desktop/src/components/usage/PeriodComparison.tsx` |
| Period selector: day / week / month / custom range | `apps/desktop/src/components/usage/PeriodSelector.tsx` |
| Notification count per app table | `apps/desktop/src/components/usage/NotificationTable.tsx` |
| Long-term trend line chart (total daily screen time over weeks/months) | `apps/desktop/src/components/usage/LongTermTrend.tsx` |
| Launch count per app chart | `apps/desktop/src/components/usage/LaunchCountChart.tsx` |

**Acceptance Criteria:**
- Heatmap renders with correct color intensity
- Period comparison shows correct deltas with up/down arrows
- Long-term trend handles 365+ data points smoothly
- Period selector switches between day/week/month/custom views

---

### INT — Integration Team

**Deliverable:** Wire usage commands.

| Task | Files |
|------|-------|
| Define `UsageCommands`: `get_usage_summary`, `get_top_apps`, `get_hourly_distribution`, `get_category_breakdown`, `compare_periods`, `trigger_snapshot`, `list_snapshots`, `delete_snapshot` | `crates/phonescope-tauri/src/commands/usage.rs` |
| Wire usage collector into session lifecycle | `crates/phonescope-core/src/lib.rs` |
| Update TypeScript types | `apps/desktop/src/types/` |

---

## Week 11: Usage Goals + Insight Rules + Export + Integration

### T2 — Data Team

**Deliverable:** Goals system + usage insight rules.

| Task | Files |
|------|-------|
| Implement `UsageGoalTracker`: check current usage against goals, produce alerts | `crates/phonescope-usage/src/goals.rs` |
| CRUD for goals: `create_goal`, `update_goal`, `delete_goal`, `list_goals` | `crates/phonescope-usage/src/goals.rs` |
| Goal progress: `get_goal_progress(goal_id)` → `{ limit_ms, used_ms, remaining_ms, on_track }` | `crates/phonescope-usage/src/goals.rs` |
| Insight rule: `ScreenTimeIncreaseRule` — "Screen time increased 23% this week vs last week" | `crates/phonescope-insights/src/rules.rs` |
| Insight rule: `AppUsageSpikeRule` — "TikTok usage doubled from 45min/day to 1h32min/day" | `crates/phonescope-insights/src/rules.rs` |
| Insight rule: `ExcessiveUnlocksRule` — "You unlocked your phone 87 times today (avg: 62)" | `crates/phonescope-insights/src/rules.rs` |
| Insight rule: `GoalExceedingRule` — "On track to exceed 2hr screen time goal by 3pm" | `crates/phonescope-insights/src/rules.rs` |
| Insight rule: `StaleAppsRule` — "15 apps not opened in 30 days — uninstalling would free 2.1GB" | `crates/phonescope-insights/src/rules.rs` |
| Implement usage CSV export: date, app, foreground_ms, background_ms, launches, notifications | `crates/phonescope-usage/src/lib.rs` |
| Unit tests for all rules and goal tracking | `crates/phonescope-usage/tests/`, `crates/phonescope-insights/tests/` |

**Acceptance Criteria:**
- Goals persist across sessions
- Goal progress calculates correctly mid-day
- All 5 usage insight rules trigger from test data
- StaleAppsRule correctly identifies unused apps and calculates space savings
- CSV export is well-formed

---

### T4 — Frontend Team

**Deliverable:** Goals UI + snapshot management + export.

| Task | Files |
|------|-------|
| Usage goals section: create/edit daily limits per app or overall | `apps/desktop/src/components/usage/GoalsManager.tsx` |
| Goal progress bars (per app and overall) | `apps/desktop/src/components/usage/GoalProgress.tsx` |
| Snapshot management panel: list snapshots, trigger manual capture, delete old | `apps/desktop/src/components/usage/SnapshotManager.tsx` |
| "Capture Now" button (triggers immediate snapshot) | `apps/desktop/src/components/usage/SnapshotManager.tsx` |
| Export usage data as CSV button | `apps/desktop/src/pages/UsagePage.tsx` |
| Wire all UsagePage components to real backend | All usage components |
| Stale apps recommendation card on OverviewPage | `apps/desktop/src/pages/OverviewPage.tsx` |

**Acceptance Criteria:**
- Can set daily screen time goal and see progress bar
- Can set per-app daily limit
- Snapshot list shows all captured snapshots with type and date
- Manual capture button triggers immediate snapshot
- CSV export downloads correctly formatted file
- Stale app recommendations show on OverviewPage

---

### INT — Integration Team

**Deliverable:** Full M3 integration.

| Task | Files |
|------|-------|
| Wire `GoalCommands`: `create_goal`, `update_goal`, `delete_goal`, `get_goal_progress` | `crates/phonescope-tauri/src/commands/usage.rs` |
| Wire `ExportCommands` for usage CSV | `crates/phonescope-tauri/src/commands/export.rs` |
| Wire usage insight rules into InsightEngine | `crates/phonescope-insights/src/lib.rs` |
| Integration test: capture snapshot, query trends, compare periods | tests |
| E2E: connect device → usage page shows data → set goal → see progress | tests |

**Acceptance Criteria:**
- Full usage flow works end-to-end
- Goals persist across app restarts
- Usage data accumulates over multiple sessions
- Snapshot deduplication works in practice
- CI green

---

## M3 Exit Criteria Checklist

- [ ] Usage data collected via `dumpsys usagestats`
- [ ] Hourly snapshots captured automatically when connected
- [ ] Daily and weekly snapshots captured on schedule
- [ ] Manual "capture now" button works
- [ ] UsagePage: daily screen time chart, top apps, heatmap, category breakdown
- [ ] Period comparison: week vs week, month vs month with trend arrows
- [ ] Long-term trend line over 30+ days
- [ ] Usage goals: set, track progress, get alerts
- [ ] 5 usage insight rules working
- [ ] Stale app recommendations visible
- [ ] Usage CSV export works
- [ ] Snapshots never auto-deleted
- [ ] 365 days of data queries in < 2 seconds
- [ ] CI green

---

## Handovers from M3

| From | To | What | When |
|------|----|------|------|
| T2 | INT | `phonescope-usage` v1 — tracker, scheduler, comparison | End of Week 11 |
| T2 | INT | 5 usage insight rules | End of Week 11 |
