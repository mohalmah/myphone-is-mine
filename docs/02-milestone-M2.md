# M2: Deep Telemetry (Weeks 5–8)

**Goal:** Battery monitoring, storage analysis, network stats (ADB-based), process/CPU/RAM monitoring, thermal analysis, resource suitability recommendations, domain classification, and the analytics/insight engines.

**Ship Criteria:** Battery timeline visible, storage breakdown per app, network flows listed, process table with CPU/RAM, thermal warnings, domain categorization working, at least 8 insight rules generating results.

---

## Week 5: Process/Thermal + Battery/Storage Collectors + New DB Tables

### T2 — Data Team

**Deliverable:** M2 database tables + storage queries.

| Task | Files |
|------|-------|
| Write migration 002: `battery_sample`, `storage_snapshot`, `folder_size` | `crates/phonescope-storage/src/migrations.rs` |
| Write migration 003: `network_flow`, `dns_query`, `domain`, `endpoint` | `crates/phonescope-storage/src/migrations.rs` |
| Write migration 004: `process_snapshot`, `process_entry`, `thermal_sample` | `crates/phonescope-storage/src/migrations.rs` |
| Write migration 005: `insight` table | `crates/phonescope-storage/src/migrations.rs` |
| Add indexes: `idx_network_flow_session`, `idx_battery_sample_session`, etc. | migrations |
| Implement insert methods for all new event types | `crates/phonescope-storage/src/queries.rs` |
| Implement `query_battery_timeline(session_id)` | `crates/phonescope-storage/src/queries.rs` |
| Implement `query_storage_snapshots(session_id)` | `crates/phonescope-storage/src/queries.rs` |
| Implement `query_process_snapshots(session_id)` | `crates/phonescope-storage/src/queries.rs` |
| Implement `query_thermal_samples(session_id)` | `crates/phonescope-storage/src/queries.rs` |
| Define models: `BatterySample`, `StorageSnapshot`, `FolderSize`, `NetworkFlow`, `ProcessEntry`, `ThermalSample`, `Insight` | `crates/phonescope-storage/src/models.rs` |
| Unit tests for all new queries (in-memory SQLite) | `crates/phonescope-storage/tests/` |

**Acceptance Criteria:**
- All migrations apply cleanly (fresh DB and upgrade from M1)
- Insert + query round-trips work for every new table
- Indexes created correctly

---

### T3 — Collectors Team

**Deliverable:** `phonescope-process` crate + `BatteryCollector` + `StorageCollector`.

| Task | Files |
|------|-------|
| Create `phonescope-process` crate skeleton | `crates/phonescope-process/Cargo.toml`, `src/lib.rs` |
| Implement `top` command parser: parse `adb shell top -n 1 -b` output | `crates/phonescope-process/src/top_parser.rs` |
| Implement `meminfo` parser: parse `adb shell dumpsys meminfo` | `crates/phonescope-process/src/meminfo_parser.rs` |
| Implement `cpuinfo` parser: parse `adb shell dumpsys cpuinfo` | `crates/phonescope-process/src/cpuinfo_parser.rs` |
| Implement `ProcessCollector`: polling (15s), produces `ProcessEvent` | `crates/phonescope-process/src/process_collector.rs` |
| Implement thermal zone parser: `cat /sys/class/thermal/thermal_zone*/temp` + `dumpsys thermalservice` | `crates/phonescope-process/src/thermal_parser.rs` |
| Implement `ThermalCollector`: polling (30s), produces `ThermalEvent` | `crates/phonescope-process/src/thermal_collector.rs` |
| Implement `BatteryCollector`: parse `adb shell dumpsys battery` → `BatteryEvent` | `crates/phonescope-collectors/src/battery.rs` |
| Implement `StorageCollector`: parse `adb shell df` + `adb shell du -s` → `StorageEvent` | `crates/phonescope-collectors/src/storage.rs` |
| Test fixtures for `top`, `meminfo`, `cpuinfo`, `thermalservice`, `dumpsys battery`, `df` output | `crates/phonescope-process/tests/fixtures/`, `crates/phonescope-collectors/tests/fixtures/` |
| Unit tests for all parsers | `crates/phonescope-process/tests/`, `crates/phonescope-collectors/tests/` |

**Process event types (defined in phonescope-events, already created in M1):**
```rust
pub struct ProcessEvent {
    pub meta: EventMeta,
    pub pid: u32,
    pub name: String,
    pub package_name: Option<String>,
    pub cpu_percent: f32,
    pub rss_kb: u64,
    pub vss_kb: u64,
    pub threads: u32,
    pub state: ProcessState, // Running, Sleeping, Stopped, Zombie
    pub oom_adj: Option<i32>,
}

pub struct ThermalEvent {
    pub meta: EventMeta,
    pub zone_name: String,
    pub temperature_celsius: f32,
    pub throttling_status: ThrottlingStatus, // None, Light, Moderate, Severe, Critical, Shutdown
}
```

**Acceptance Criteria:**
- `top` parser correctly extracts PID, name, CPU%, RSS for all processes
- Thermal parser handles both `/sys/class/thermal` and `dumpsys thermalservice`
- Battery parser extracts level, charging, temperature, voltage, current
- Storage parser extracts total/used/free bytes and per-path sizes
- All parsers handle edge cases (missing fields, different Android versions)

---

### T4 — Frontend Team

**Deliverable:** Prep shared chart components.

| Task | Files |
|------|-------|
| Create `Chart` wrapper component (Recharts) | `apps/desktop/src/components/common/Chart.tsx` |
| Create `TimelineChart` (line chart with time X-axis) | `apps/desktop/src/components/common/TimelineChart.tsx` |
| Create `GaugeChart` (circular percentage indicator) | `apps/desktop/src/components/common/GaugeChart.tsx` |
| Create `DomainTag` component (colored badge by category) | `apps/desktop/src/components/common/DomainTag.tsx` |
| Create `RiskIndicator` component (green/yellow/red dot) | `apps/desktop/src/components/common/RiskIndicator.tsx` |
| Create `Toggle` component | `apps/desktop/src/components/common/Toggle.tsx` |
| Define domain category colors: first_party=blue, analytics=purple, ads=red, cdn=gray, social=teal, search=green, government=amber, unknown=slate | `apps/desktop/src/services/domainClassifier.ts` |

**Acceptance Criteria:**
- Chart components render with mock data
- DomainTag shows correct colors per category
- Components are reusable across all M2 pages

---

### T1, INT — Light Week

- T1: Review M2 architecture, plan capability detection updates for process/thermal
- INT: Add process/thermal/battery/storage command stubs to taurpc (empty implementations)

---

## Week 6: Network Stats + Analytics Engine + Domain Classification

### T3 — Collectors Team

**Deliverable:** `NetstatsCollector` + `DumpsysCollector`.

| Task | Files |
|------|-------|
| Implement `NetstatsCollector`: parse `adb shell dumpsys netstats detail` → `NetworkFlowEvent` | `crates/phonescope-collectors/src/netstats.rs` |
| Parse netstats for per-UID bytes sent/received, map UID to package | `crates/phonescope-collectors/src/netstats.rs` |
| Implement `DumpsysCollector`: unified dumpsys runner for battery + netstats | `crates/phonescope-collectors/src/dumpsys.rs` |
| Wire all Week 5 + 6 collectors to EventBus | `crates/phonescope-collectors/src/lib.rs` |
| Register new collectors in `CollectorManager` | `crates/phonescope-collectors/src/lib.rs` |
| Test fixtures for `dumpsys netstats` output | `crates/phonescope-collectors/tests/fixtures/netstats_sample.txt` |

**Acceptance Criteria:**
- Netstats parser extracts per-app network usage (Confidence::Approximate)
- All M2 collectors registered and running in session lifecycle
- UID-to-package mapping works correctly

---

### T2 — Data Team

**Deliverable:** `phonescope-analytics` crate v1.

| Task | Files |
|------|-------|
| Create crate skeleton | `crates/phonescope-analytics/Cargo.toml` |
| Build domain classification engine with built-in domain list | `crates/phonescope-analytics/src/domains.rs` |
| Domain list: ~200 known tracker/ad/CDN/social domains | `crates/phonescope-analytics/src/domains.rs` |
| Classification logic: exact match → suffix match → user rules → Unknown | `crates/phonescope-analytics/src/domains.rs` |
| Implement `AnalyticsEngine` struct | `crates/phonescope-analytics/src/lib.rs` |
| Implement `compute_app_traffic_summary(session_id)` | `crates/phonescope-analytics/src/aggregation.rs` |
| Implement `compute_domain_classification(session_id)` | `crates/phonescope-analytics/src/aggregation.rs` |
| Implement `compute_background_activity_score(package_id)` → 0-100 | `crates/phonescope-analytics/src/scoring.rs` |
| Implement `detect_suspicious_patterns(session_id)` | `crates/phonescope-analytics/src/patterns.rs` |
| Implement `compute_storage_hotspots(session_id)` | `crates/phonescope-analytics/src/aggregation.rs` |
| Implement `correlate_battery_drain(session_id)` | `crates/phonescope-analytics/src/aggregation.rs` |
| Implement storage aggregation queries: `top_apps_by_traffic`, `domain_breakdown` | `crates/phonescope-storage/src/queries.rs` |
| Unit tests for domain classification (exact, suffix, unknown) | `crates/phonescope-analytics/tests/` |
| Unit tests for scoring (boundary values) | `crates/phonescope-analytics/tests/` |

**Domain categories:**
```rust
pub enum DomainCategory {
    FirstParty,  // App's own domain
    Analytics,   // google-analytics.com, mixpanel.com, amplitude.com, segment.io
    Ads,         // doubleclick.net, googlesyndication.com, appsflyer.com, adjust.com
    Cdn,         // cloudfront.net, akamaized.net, fastly.net
    Social,      // graph.facebook.com, api.twitter.com
    Search,      // google.com, bing.com
    Government,  // .gov domains
    Unknown,
}
```

**Background Activity Score (0-100):**
- 0-20: Normal (keep-alive, push notifications)
- 21-50: Moderate (regular polling)
- 51-80: High (frequent background network)
- 81-100: Excessive (constant background traffic)

**Acceptance Criteria:**
- Domain classification correctly categorizes known domains
- Suffix matching works (e.g., `*.doubleclick.net`)
- Background score produces sensible values
- All aggregation queries return correct results from test data

---

### T4 — Frontend Team

**Deliverable:** NetworkPage foundation.

| Task | Files |
|------|-------|
| Build `NetworkPage` skeleton: tabs for Flows / Domains / DNS | `apps/desktop/src/pages/NetworkPage.tsx` |
| Flow table: source app, destination domain/IP, bytes, duration, confidence | `apps/desktop/src/components/network/FlowTable.tsx` |
| Domain breakdown panel: list of domains with category badges and traffic totals | `apps/desktop/src/components/network/DomainBreakdown.tsx` |
| Traffic timeline chart (bytes over time) | `apps/desktop/src/components/network/TrafficTimeline.tsx` |
| Create `useNetwork` hook | `apps/desktop/src/hooks/useNetwork.ts` |

**Acceptance Criteria:**
- NetworkPage renders with mock data
- Domain badges show correct colors
- Flow table is sortable by all columns

---

### INT — Integration Team

**Deliverable:** Wire network + analytics commands.

| Task | Files |
|------|-------|
| Define `NetworkCommands`: `get_flows`, `get_dns_queries`, `get_domain_breakdown`, `get_top_apps_by_traffic` | `crates/phonescope-tauri/src/commands/network.rs` |
| Update AppState with `AnalyticsEngine` | `crates/phonescope-tauri/src/state.rs` |
| Wire process/thermal collectors into core session lifecycle | `crates/phonescope-core/src/lib.rs` |

---

## Week 7: Insights Engine + Resource Recommendations + Frontend Pages

### T2 — Data Team

**Deliverable:** `phonescope-insights` crate with 8 rules.

| Task | Files |
|------|-------|
| Create crate skeleton | `crates/phonescope-insights/Cargo.toml` |
| Define `InsightRule` trait: `name()`, `category()`, `evaluate(ctx)` | `crates/phonescope-insights/src/rules.rs` |
| Define `InsightContext` (holds analytics engine, DB, session info) | `crates/phonescope-insights/src/rules.rs` |
| Implement rule: `HighBackgroundTrafficRule` | `crates/phonescope-insights/src/rules.rs` |
| Implement rule: `ExcessiveTrackersRule` | `crates/phonescope-insights/src/rules.rs` |
| Implement rule: `BatteryDrainCorrelationRule` | `crates/phonescope-insights/src/rules.rs` |
| Implement rule: `StorageHogRule` | `crates/phonescope-insights/src/rules.rs` |
| Implement rule: `ExcessivePermissionsRule` | `crates/phonescope-insights/src/rules.rs` |
| Implement rule: `ThermalWarningRule` — "CPU temp is 45°C, Instagram + Chrome using 60% CPU" | `crates/phonescope-insights/src/rules.rs` |
| Implement rule: `ResourceOverloadRule` — "3GB RAM, 45 apps, 12 in background" | `crates/phonescope-insights/src/rules.rs` |
| Implement rule: `NewDomainContactRule` | `crates/phonescope-insights/src/rules.rs` |
| Friendly vs technical message templates for each rule | `crates/phonescope-insights/src/messages.rs` |
| `InsightEngine`: runs all rules periodically, deduplicates, stores to DB | `crates/phonescope-insights/src/lib.rs` |
| Unit tests for each rule with mock analytics data | `crates/phonescope-insights/tests/` |

**Example insight messages:**

| Rule | Friendly | Technical |
|------|----------|-----------|
| HighBackgroundTraffic | "Facebook sent 45MB in the background over the last hour" | "UID 10145 (com.facebook.katana) transmitted 47,185,920B via 23 flows to 8 unique domains while in background state" |
| ThermalWarning | "Phone is running hot (45°C). Instagram and Chrome are using 60% of CPU" | "thermal_zone0: 45.2°C (throttling: Light). Top CPU: com.instagram.android (38.2%), com.android.chrome (22.1%)" |
| ResourceOverload | "This phone has 3GB RAM but 12 apps running in background — consider closing unused apps" | "Device RAM: 3072MB total, 2847MB used (92.7%). Background processes: 12, foreground: 3. OOM pressure: HIGH" |
| StorageHog | "WhatsApp is using 4.2GB of storage (50% is cache you can clear)" | "com.whatsapp: total=4,509,715,456B, data=1,504,905,152B, cache=2,254,857,728B, code=750,952,576B" |

**Acceptance Criteria:**
- All 8 rules trigger correctly from test data
- Each rule produces both friendly and technical messages
- InsightEngine deduplicates (same insight not stored twice in 1 hour)
- Severity levels correct: ThermalWarning=Warning, StorageHog=Info, ResourceOverload=Warning

---

### T3 — Collectors Team

**Deliverable:** Handover of all M2 collectors.

| Task | Files |
|------|-------|
| Polish process collector: handle different `top` output formats across Android versions | `crates/phonescope-process/src/top_parser.rs` |
| Polish thermal collector: graceful fallback if thermal zones not accessible | `crates/phonescope-process/src/thermal_collector.rs` |
| Write handover docs for all M2 collectors | `docs/handovers/collectors-v2.md` |
| Integration test: all collectors running simultaneously against emulator | `crates/phonescope-collectors/tests/` |

**Acceptance Criteria:**
- All collectors handle different Android versions (8-15)
- Collectors degrade gracefully when data not available
- Handover doc written with API examples

---

### T4 — Frontend Team

**Deliverable:** BatteryPage + StoragePage + ProcessPage.

| Task | Files |
|------|-------|
| Build `BatteryPage`: timeline chart (level over time), charging period highlights | `apps/desktop/src/pages/BatteryPage.tsx` |
| Battery drain correlation section | `apps/desktop/src/components/battery/DrainCorrelation.tsx` |
| Create `useBattery` hook | `apps/desktop/src/hooks/useBattery.ts` |
| Build `StoragePage`: treemap visualization (Recharts Treemap) | `apps/desktop/src/pages/StoragePage.tsx` |
| Per-app storage breakdown table | `apps/desktop/src/components/storage/AppStorageTable.tsx` |
| Create `useStorage` hook | `apps/desktop/src/hooks/useStorage.ts` |
| Build `ProcessPage`: live process table (sortable by CPU%, RAM) | `apps/desktop/src/pages/ProcessPage.tsx` |
| System resource gauges (CPU total, RAM used/total) | `apps/desktop/src/components/process/ResourceGauges.tsx` |
| Thermal timeline chart | `apps/desktop/src/components/process/ThermalTimeline.tsx` |
| Thermal warning banner (shows when temp > threshold) | `apps/desktop/src/components/process/ThermalWarning.tsx` |

**Acceptance Criteria:**
- Battery timeline shows realistic chart with charging highlights
- Storage treemap renders per-app sizes
- Process table sorts correctly, updates periodically
- Thermal timeline shows temperature zones with color bands (green/yellow/red)
- Thermal warning banner appears when temperature is high

---

## Week 8: Insights Panel + Full Integration + Performance

### T2 — Data Team

**Deliverable:** Analytics + insights handover.

| Task | Files |
|------|-------|
| Performance test: domain classification with 10K domains | `crates/phonescope-analytics/benches/` |
| Performance test: insight engine with 30 days of data | `crates/phonescope-insights/benches/` |
| Wire retention for new tables (battery 30d, network 30d, process 14d, thermal 30d, insight 90d) | `crates/phonescope-storage/src/retention.rs` |
| Write handover docs | `docs/handovers/analytics-v1.md`, `docs/handovers/insights-v1.md` |

---

### T4 — Frontend Team

**Deliverable:** Insights panel + enhanced OverviewPage + NetworkPage complete.

| Task | Files |
|------|-------|
| Build `InsightsPanel`: collapsible sidebar on all pages | `apps/desktop/src/components/insights/InsightsPanel.tsx` |
| Insight cards: severity badge, title, expandable detail (friendly → technical) | `apps/desktop/src/components/insights/InsightCard.tsx` |
| Insight filtering by category and severity | `apps/desktop/src/components/insights/InsightsPanel.tsx` |
| Create `useInsights` hook | `apps/desktop/src/hooks/useInsights.ts` |
| Enhance `OverviewPage`: resource recommendations section | `apps/desktop/src/pages/OverviewPage.tsx` |
| Resource recommendation cards (RAM pressure, storage full, thermal) | `apps/desktop/src/components/insights/RecommendationCards.tsx` |
| Complete `NetworkPage`: domain breakdown with traffic bars, category filters | `apps/desktop/src/pages/NetworkPage.tsx` |
| DNS query table | `apps/desktop/src/components/network/DnsTable.tsx` |

**Acceptance Criteria:**
- Insights panel shows on all pages with real data
- Clicking insight card expands to show technical detail
- OverviewPage shows resource recommendations
- NetworkPage fully functional with domain categorization

---

### INT — Integration Team

**Deliverable:** Full M2 integration.

| Task | Files |
|------|-------|
| Wire `BatteryCommands`: `get_battery_timeline`, `get_current_battery` | `crates/phonescope-tauri/src/commands/battery.rs` |
| Wire `StorageCommands`: `get_storage_overview`, `get_folder_sizes`, `get_app_storage_breakdown` | `crates/phonescope-tauri/src/commands/storage.rs` |
| Wire `InsightCommands`: `get_insights`, `get_insight_categories`, `dismiss_insight` | `crates/phonescope-tauri/src/commands/insights.rs` |
| Wire process/thermal commands | `crates/phonescope-tauri/src/commands/process.rs` |
| Push insight events to frontend via taurpc events | `crates/phonescope-tauri/src/lib.rs` |
| Integration test: full M2 flow with emulator | tests |
| Performance test: app with 50K events in DB, measure query times | tests |

**Acceptance Criteria:**
- All M2 pages show real data from device
- Insights generated and displayed in real time
- Resource recommendations visible on OverviewPage
- All queries < 100ms with 50K events
- CI green

---

## M2 Exit Criteria Checklist

- [ ] Battery timeline chart with charging period highlights
- [ ] Storage treemap with per-app breakdown
- [ ] Network flow table with domain categorization
- [ ] Process table with CPU% and RAM, sortable
- [ ] Thermal timeline with warning banners
- [ ] Resource recommendations on OverviewPage
- [ ] 8 insight rules generating correct results
- [ ] Domain classification for 200+ known domains
- [ ] Background activity scoring working
- [ ] Retention system running for all tables
- [ ] All queries < 100ms with realistic data volume
- [ ] `cargo clippy --workspace -- -D warnings` passes
- [ ] CI green

---

## Handovers from M2

| From | To | What | When |
|------|----|------|------|
| T3 | INT | All M2 collectors (battery, storage, netstats, process, thermal) | End of Week 7 |
| T2 | INT | Analytics engine + domain classification | End of Week 8 |
| T2 | INT | Insights engine with 8 rules | End of Week 8 |
