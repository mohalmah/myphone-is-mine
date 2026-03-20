//! Database migrations using `rusqlite_migration`.
//!
//! Migrations are embedded as Rust string literals. They run automatically
//! on `Database::open()`. Never modify existing migrations — always add new ones.

use rusqlite_migration::{Migrations, M};

/// All schema migrations. Applied in order on `Database::open()`.
pub fn migrations() -> Migrations<'static> {
    Migrations::new(vec![
        // 001: Foundation tables — device, session, package, app_permission, log_entry
        M::up("
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
                mode            TEXT NOT NULL DEFAULT 'basic'
            );

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

            CREATE INDEX idx_package_device ON package(device_id);

            CREATE TABLE app_permission (
                id              INTEGER PRIMARY KEY,
                package_id      INTEGER NOT NULL REFERENCES package(id),
                permission      TEXT NOT NULL,
                is_granted      INTEGER NOT NULL DEFAULT 0,
                captured_at     TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE log_entry (
                id              INTEGER PRIMARY KEY,
                session_id      INTEGER NOT NULL REFERENCES session(id),
                package_id      INTEGER REFERENCES package(id),
                level           TEXT NOT NULL,
                tag             TEXT,
                message         TEXT NOT NULL,
                pid             INTEGER,
                tid             INTEGER,
                captured_at     TEXT NOT NULL
            );

            CREATE INDEX idx_log_entry_session_level ON log_entry(session_id, level);
            CREATE INDEX idx_log_entry_package ON log_entry(package_id);
            CREATE INDEX idx_log_entry_captured ON log_entry(captured_at);
        "),
        // 002: Battery & Storage
        M::up("
            CREATE TABLE battery_sample (
                id              INTEGER PRIMARY KEY,
                session_id      INTEGER NOT NULL REFERENCES session(id),
                level           INTEGER NOT NULL,
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
        "),
        // 003: Network
        M::up("
            CREATE TABLE domain (
                id              INTEGER PRIMARY KEY,
                name            TEXT NOT NULL UNIQUE,
                category        TEXT,
                risk_level      TEXT DEFAULT 'unknown',
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

            CREATE TABLE dns_query (
                id              INTEGER PRIMARY KEY,
                session_id      INTEGER NOT NULL REFERENCES session(id),
                package_id      INTEGER REFERENCES package(id),
                query_name      TEXT NOT NULL,
                query_type      TEXT NOT NULL DEFAULT 'A',
                resolved_ips    TEXT,
                response_code   INTEGER,
                duration_ms     INTEGER,
                captured_at     TEXT NOT NULL
            );

            CREATE INDEX idx_network_flow_session ON network_flow(session_id);
            CREATE INDEX idx_network_flow_package ON network_flow(package_id);
            CREATE INDEX idx_dns_query_session ON dns_query(session_id);
        "),
        // 004: Process & Thermal
        M::up("
            CREATE TABLE process_snapshot (
                id                  INTEGER PRIMARY KEY,
                session_id          INTEGER NOT NULL REFERENCES session(id),
                total_cpu_percent   REAL,
                total_ram_kb        INTEGER,
                used_ram_kb         INTEGER,
                captured_at         TEXT NOT NULL
            );

            CREATE TABLE process_entry (
                id          INTEGER PRIMARY KEY,
                snapshot_id INTEGER NOT NULL REFERENCES process_snapshot(id),
                pid         INTEGER NOT NULL,
                name        TEXT NOT NULL,
                package_id  INTEGER REFERENCES package(id),
                cpu_percent REAL NOT NULL DEFAULT 0,
                rss_kb      INTEGER NOT NULL DEFAULT 0,
                vss_kb      INTEGER NOT NULL DEFAULT 0,
                threads     INTEGER NOT NULL DEFAULT 0,
                state       TEXT,
                oom_adj     INTEGER
            );

            CREATE TABLE thermal_sample (
                id                  INTEGER PRIMARY KEY,
                session_id          INTEGER NOT NULL REFERENCES session(id),
                zone_name           TEXT NOT NULL,
                temperature_celsius REAL NOT NULL,
                throttling_status   TEXT DEFAULT 'none',
                captured_at         TEXT NOT NULL
            );

            CREATE INDEX idx_process_snapshot_session ON process_snapshot(session_id);
            CREATE INDEX idx_process_entry_snapshot ON process_entry(snapshot_id);
            CREATE INDEX idx_thermal_sample_session ON thermal_sample(session_id, captured_at);
        "),
        // 005: Insights & Actions
        M::up("
            CREATE TABLE insight (
                id               INTEGER PRIMARY KEY,
                session_id       INTEGER NOT NULL REFERENCES session(id),
                package_id       INTEGER REFERENCES package(id),
                category         TEXT NOT NULL,
                severity         TEXT NOT NULL,
                title            TEXT NOT NULL,
                description      TEXT NOT NULL,
                technical_detail TEXT,
                confidence       TEXT NOT NULL DEFAULT 'approximate',
                created_at       TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE user_action (
                id           INTEGER PRIMARY KEY,
                session_id   INTEGER NOT NULL REFERENCES session(id),
                package_id   INTEGER REFERENCES package(id),
                action_type  TEXT NOT NULL,
                target       TEXT,
                result       TEXT,
                performed_at TEXT NOT NULL DEFAULT (datetime('now'))
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

            CREATE INDEX idx_insight_session ON insight(session_id, severity);
        "),
        // 006: Usage tracking
        M::up("
            CREATE TABLE usage_snapshot (
                id            INTEGER PRIMARY KEY,
                session_id    INTEGER NOT NULL REFERENCES session(id),
                device_id     INTEGER NOT NULL REFERENCES device(id),
                snapshot_type TEXT NOT NULL,
                period_start  TEXT NOT NULL,
                period_end    TEXT NOT NULL,
                captured_at   TEXT NOT NULL DEFAULT (datetime('now')),
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
                id             INTEGER PRIMARY KEY,
                device_id      INTEGER NOT NULL REFERENCES device(id),
                package_id     INTEGER REFERENCES package(id),
                daily_limit_ms INTEGER NOT NULL,
                is_active      INTEGER NOT NULL DEFAULT 1,
                created_at     TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX idx_usage_snapshot_device ON usage_snapshot(device_id, snapshot_type);
            CREATE INDEX idx_app_usage_record_snapshot ON app_usage_record(snapshot_id);
            CREATE INDEX idx_app_usage_record_package ON app_usage_record(package_id);
        "),
        // 007: HTTP Requests (proxy mode)
        M::up("
            CREATE TABLE http_request (
                id            INTEGER PRIMARY KEY,
                flow_id       INTEGER REFERENCES network_flow(id),
                session_id    INTEGER NOT NULL REFERENCES session(id),
                package_id    INTEGER REFERENCES package(id),
                method        TEXT NOT NULL,
                url           TEXT NOT NULL,
                host          TEXT NOT NULL,
                path          TEXT NOT NULL,
                status_code   INTEGER,
                request_size  INTEGER,
                response_size INTEGER,
                content_type  TEXT,
                duration_ms   INTEGER,
                is_tls        INTEGER NOT NULL DEFAULT 0,
                har_entry_json TEXT,
                captured_at   TEXT NOT NULL
            );

            CREATE INDEX idx_http_request_session ON http_request(session_id);
            CREATE INDEX idx_http_request_host ON http_request(host);
        "),
    ])
}
