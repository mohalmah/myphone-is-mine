# Data Model Reference

## SQLite Schema

All tables use `INTEGER PRIMARY KEY` (SQLite rowid alias). Timestamps are ISO 8601 UTC text. Foreign keys enforced.

### Core Tables

```sql
CREATE TABLE device (
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

CREATE TABLE session (
    id              INTEGER PRIMARY KEY,
    device_id       INTEGER NOT NULL REFERENCES device(id),
    started_at      TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at        TEXT,
    capability_mask INTEGER NOT NULL DEFAULT 0,
    mode            TEXT NOT NULL DEFAULT 'basic' -- basic|helper|proxy|root
);

CREATE TABLE capability_profile (
    id              INTEGER PRIMARY KEY,
    session_id      INTEGER NOT NULL REFERENCES session(id) UNIQUE,
    has_adb         INTEGER NOT NULL DEFAULT 1,
    has_root        INTEGER NOT NULL DEFAULT 0,
    has_helper_app  INTEGER NOT NULL DEFAULT 0,
    has_proxy       INTEGER NOT NULL DEFAULT 0,
    can_logcat      INTEGER NOT NULL DEFAULT 1,
    can_dumpsys     INTEGER NOT NULL DEFAULT 1,
    can_netstats    INTEGER NOT NULL DEFAULT 0,
    can_tcpdump     INTEGER NOT NULL DEFAULT 0,
    can_vpn_capture INTEGER NOT NULL DEFAULT 0,
    detected_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### App Tables

```sql
CREATE TABLE package (
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

CREATE TABLE app_permission (
    id              INTEGER PRIMARY KEY,
    package_id      INTEGER NOT NULL REFERENCES package(id),
    permission      TEXT NOT NULL,
    is_granted      INTEGER NOT NULL DEFAULT 0,
    captured_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_package_device ON package(device_id);
```

### Network Tables

```sql
CREATE TABLE domain (
    id              INTEGER PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,
    category        TEXT, -- first_party, analytics, ads, cdn, social, search, government, unknown
    risk_level      TEXT DEFAULT 'unknown', -- safe, low, medium, high, unknown
    first_seen_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE endpoint (
    id              INTEGER PRIMARY KEY,
    domain_id       INTEGER REFERENCES domain(id),
    ip_address      TEXT,
    port            INTEGER NOT NULL,
    protocol        TEXT NOT NULL DEFAULT 'tcp',
    first_seen_at   TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(domain_id, ip_address, port, protocol)
);

CREATE TABLE network_flow (
    id              INTEGER PRIMARY KEY,
    session_id      INTEGER NOT NULL REFERENCES session(id),
    package_id      INTEGER REFERENCES package(id),
    endpoint_id     INTEGER REFERENCES endpoint(id),
    direction       TEXT NOT NULL DEFAULT 'outbound',
    bytes_sent      INTEGER NOT NULL DEFAULT 0,
    bytes_received  INTEGER NOT NULL DEFAULT 0,
    started_at      TEXT NOT NULL,
    ended_at        TEXT,
    confidence      TEXT NOT NULL DEFAULT 'exact'
);

CREATE TABLE http_request (
    id              INTEGER PRIMARY KEY,
    flow_id         INTEGER REFERENCES network_flow(id),
    session_id      INTEGER NOT NULL REFERENCES session(id),
    package_id      INTEGER REFERENCES package(id),
    method          TEXT NOT NULL,
    url             TEXT NOT NULL,
    host            TEXT NOT NULL,
    path            TEXT NOT NULL,
    status_code     INTEGER,
    request_size    INTEGER,
    response_size   INTEGER,
    content_type    TEXT,
    duration_ms     INTEGER,
    is_tls          INTEGER NOT NULL DEFAULT 0,
    har_entry_json  TEXT,
    captured_at     TEXT NOT NULL
);

CREATE TABLE dns_query (
    id              INTEGER PRIMARY KEY,
    session_id      INTEGER NOT NULL REFERENCES session(id),
    package_id      INTEGER REFERENCES package(id),
    query_name      TEXT NOT NULL,
    query_type      TEXT NOT NULL DEFAULT 'A',
    resolved_ips    TEXT, -- JSON array
    response_code   INTEGER,
    duration_ms     INTEGER,
    captured_at     TEXT NOT NULL
);

CREATE INDEX idx_network_flow_session ON network_flow(session_id);
CREATE INDEX idx_network_flow_package ON network_flow(package_id);
CREATE INDEX idx_http_request_session ON http_request(session_id);
CREATE INDEX idx_http_request_host ON http_request(host);
CREATE INDEX idx_dns_query_session ON dns_query(session_id);
```

### Log Table

```sql
CREATE TABLE log_entry (
    id              INTEGER PRIMARY KEY,
    session_id      INTEGER NOT NULL REFERENCES session(id),
    package_id      INTEGER REFERENCES package(id),
    level           TEXT NOT NULL, -- V, D, I, W, E, F
    tag             TEXT,
    message         TEXT NOT NULL,
    pid             INTEGER,
    tid             INTEGER,
    captured_at     TEXT NOT NULL
);

CREATE INDEX idx_log_entry_session_level ON log_entry(session_id, level);
CREATE INDEX idx_log_entry_package ON log_entry(package_id);
CREATE INDEX idx_log_entry_captured ON log_entry(captured_at);
```

### Battery & Storage Tables

```sql
CREATE TABLE battery_sample (
    id              INTEGER PRIMARY KEY,
    session_id      INTEGER NOT NULL REFERENCES session(id),
    level           INTEGER NOT NULL, -- 0-100
    is_charging     INTEGER NOT NULL DEFAULT 0,
    temperature     REAL,
    voltage         REAL,
    current_ma      REAL,
    health          TEXT,
    technology      TEXT,
    captured_at     TEXT NOT NULL
);

CREATE TABLE storage_snapshot (
    id              INTEGER PRIMARY KEY,
    session_id      INTEGER NOT NULL REFERENCES session(id),
    total_bytes     INTEGER NOT NULL,
    used_bytes      INTEGER NOT NULL,
    free_bytes      INTEGER NOT NULL,
    captured_at     TEXT NOT NULL
);

CREATE TABLE folder_size (
    id              INTEGER PRIMARY KEY,
    snapshot_id     INTEGER NOT NULL REFERENCES storage_snapshot(id),
    package_id      INTEGER REFERENCES package(id),
    path            TEXT NOT NULL,
    size_bytes      INTEGER NOT NULL,
    file_count      INTEGER
);

CREATE INDEX idx_battery_sample_session ON battery_sample(session_id, captured_at);
```

### Process & Thermal Tables

```sql
CREATE TABLE process_snapshot (
    id              INTEGER PRIMARY KEY,
    session_id      INTEGER NOT NULL REFERENCES session(id),
    total_cpu_percent REAL,
    total_ram_kb    INTEGER,
    used_ram_kb     INTEGER,
    captured_at     TEXT NOT NULL
);

CREATE TABLE process_entry (
    id              INTEGER PRIMARY KEY,
    snapshot_id     INTEGER NOT NULL REFERENCES process_snapshot(id),
    pid             INTEGER NOT NULL,
    name            TEXT NOT NULL,
    package_id      INTEGER REFERENCES package(id),
    cpu_percent     REAL NOT NULL DEFAULT 0,
    rss_kb          INTEGER NOT NULL DEFAULT 0,
    vss_kb          INTEGER NOT NULL DEFAULT 0,
    threads         INTEGER NOT NULL DEFAULT 0,
    state           TEXT, -- R, S, T, Z
    oom_adj         INTEGER
);

CREATE TABLE thermal_sample (
    id              INTEGER PRIMARY KEY,
    session_id      INTEGER NOT NULL REFERENCES session(id),
    zone_name       TEXT NOT NULL,
    temperature_celsius REAL NOT NULL,
    throttling_status TEXT DEFAULT 'none', -- none, light, moderate, severe, critical
    captured_at     TEXT NOT NULL
);

CREATE INDEX idx_process_snapshot_session ON process_snapshot(session_id);
CREATE INDEX idx_process_entry_snapshot ON process_entry(snapshot_id);
CREATE INDEX idx_thermal_sample_session ON thermal_sample(session_id, captured_at);
```

### App Usage Tables

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
    package_id      INTEGER REFERENCES package(id),
    daily_limit_ms  INTEGER NOT NULL,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_usage_snapshot_device ON usage_snapshot(device_id, snapshot_type);
CREATE INDEX idx_app_usage_record_snapshot ON app_usage_record(snapshot_id);
CREATE INDEX idx_app_usage_record_package ON app_usage_record(package_id);
```

### Actions & Insights Tables

```sql
CREATE TABLE user_action (
    id              INTEGER PRIMARY KEY,
    session_id      INTEGER NOT NULL REFERENCES session(id),
    package_id      INTEGER REFERENCES package(id),
    action_type     TEXT NOT NULL, -- force_stop, clear_data, disable, uninstall, revoke_permission, grant_permission
    target          TEXT,
    result          TEXT, -- success, failed, denied
    performed_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE insight (
    id              INTEGER PRIMARY KEY,
    session_id      INTEGER NOT NULL REFERENCES session(id),
    package_id      INTEGER REFERENCES package(id),
    category        TEXT NOT NULL, -- network, battery, storage, privacy, behavior, usage, thermal, resource
    severity        TEXT NOT NULL, -- info, warning, critical
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    technical_detail TEXT,
    confidence      TEXT NOT NULL DEFAULT 'approximate',
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_insight_session ON insight(session_id, severity);
```

---

## Rust Event Types

### Core Enum

```rust
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

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, specta::Type)]
pub enum Confidence {
    Exact,
    Approximate,
    Inferred,
    Unavailable,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct EventMeta {
    pub session_id: i64,
    pub timestamp: DateTime<Utc>,
    pub source: EventSource,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub enum EventSource {
    Adb,
    HelperApp,
    Proxy,
    RootShell,
    Synthetic,
}
```

### Sub-types

```rust
pub enum LogLevel { Verbose, Debug, Info, Warn, Error, Fatal }
pub enum Protocol { Tcp, Udp }
pub enum Direction { Outbound, Inbound }
pub enum PackageEventType { Installed, Updated, Removed, Enabled, Disabled }
pub enum ProcessState { Running, Sleeping, Stopped, Zombie }
pub enum ThrottlingStatus { None, Light, Moderate, Severe, Critical, Shutdown }
pub enum InsightCategory { Network, Battery, Storage, Privacy, Behavior, Usage, Thermal, Resource }
pub enum InsightSeverity { Info, Warning, Critical }
pub enum AppCategory { Social, Productivity, Games, Entertainment, Communication, News, Shopping, Finance, Health, Education, Travel, Utilities, Other }
```

---

## Retention Policy

| Table | Default Retention | Auto-Delete |
|-------|-------------------|-------------|
| log_entry | 7 days | Yes |
| battery_sample | 30 days | Yes |
| network_flow | 30 days | Yes |
| http_request | 14 days | Yes |
| dns_query | 14 days | Yes |
| process_snapshot + process_entry | 14 days | Yes |
| thermal_sample | 30 days | Yes |
| insight | 90 days | Yes |
| usage_snapshot + records | **NEVER** | **No** |
| device, session, package | **NEVER** | **No** |

Retention runs as periodic task in `phonescope-storage::retention`:
```sql
DELETE FROM log_entry WHERE captured_at < datetime('now', '-7 days');
```

---

## Connection Setup

```rust
fn open_db(path: &Path) -> rusqlite::Result<Connection> {
    let conn = Connection::open(path)?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "synchronous", "NORMAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    conn.pragma_update(None, "busy_timeout", 5000)?;
    MIGRATIONS.to_latest(&mut conn)?;
    Ok(conn)
}
```

---

## Migration Strategy

Using `rusqlite_migration`. Migrations are embedded Rust strings (not external files):

```rust
use rusqlite_migration::{Migrations, M};

static MIGRATIONS: Migrations = Migrations::new(vec![
    M::up("-- 001: Foundation tables
        CREATE TABLE device (...);
        CREATE TABLE session (...);
        CREATE TABLE package (...);
        CREATE TABLE app_permission (...);
        CREATE TABLE log_entry (...);
        CREATE INDEX ...;
    "),
    M::up("-- 002: Battery & Storage
        CREATE TABLE battery_sample (...);
        CREATE TABLE storage_snapshot (...);
        CREATE TABLE folder_size (...);
    "),
    M::up("-- 003: Network
        CREATE TABLE domain (...);
        CREATE TABLE endpoint (...);
        CREATE TABLE network_flow (...);
        CREATE TABLE dns_query (...);
        CREATE INDEX ...;
    "),
    M::up("-- 004: Process & Thermal
        CREATE TABLE process_snapshot (...);
        CREATE TABLE process_entry (...);
        CREATE TABLE thermal_sample (...);
        CREATE INDEX ...;
    "),
    M::up("-- 005: Insights & Actions
        CREATE TABLE insight (...);
        CREATE TABLE user_action (...);
        CREATE TABLE capability_profile (...);
        CREATE INDEX ...;
    "),
    M::up("-- 006: Usage tracking
        CREATE TABLE usage_snapshot (...);
        CREATE TABLE app_usage_record (...);
        CREATE TABLE screen_time_record (...);
        CREATE TABLE usage_goal (...);
        CREATE INDEX ...;
    "),
    M::up("-- 007: HTTP Requests (proxy mode)
        CREATE TABLE http_request (...);
        CREATE INDEX ...;
    "),
]);
```

Migrations run automatically on `Database::open()`. Never modify existing migrations — always add new ones.
