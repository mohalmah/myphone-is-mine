//! Data retention policy — deletes old rows from time-series tables.

use rusqlite::Connection;

use crate::{Error, Result};

/// Retention configuration (days to keep data per table).
#[derive(Debug, Clone)]
pub struct RetentionConfig {
    /// Days to retain `log_entry` rows. Default: 7.
    pub log_entry_days: u32,
    /// Days to retain `battery_sample` rows. Default: 30.
    pub battery_sample_days: u32,
    /// Days to retain `network_flow` rows. Default: 30.
    pub network_flow_days: u32,
    /// Days to retain `http_request` rows. Default: 14.
    pub http_request_days: u32,
    /// Days to retain `dns_query` rows. Default: 14.
    pub dns_query_days: u32,
    /// Days to retain `process_snapshot` (and cascade `process_entry`) rows. Default: 14.
    pub process_snapshot_days: u32,
    /// Days to retain `thermal_sample` rows. Default: 30.
    pub thermal_sample_days: u32,
    /// Days to retain `insight` rows. Default: 90.
    pub insight_days: u32,
}

impl Default for RetentionConfig {
    fn default() -> Self {
        Self {
            log_entry_days: 7,
            battery_sample_days: 30,
            network_flow_days: 30,
            http_request_days: 14,
            dns_query_days: 14,
            process_snapshot_days: 14,
            thermal_sample_days: 30,
            insight_days: 90,
        }
    }
}

/// Run retention deletes for all configured tables.
///
/// Tables that must never be deleted (`device`, `session`, `package`,
/// `usage_snapshot`, `app_usage_record`) are intentionally excluded.
pub fn run_retention(conn: &Connection, config: &RetentionConfig) -> Result<RetentionStats> {
    let mut stats = RetentionStats::default();

    stats.log_entries_deleted = delete_older_than(
        conn,
        "log_entry",
        "captured_at",
        config.log_entry_days,
    )?;

    stats.battery_samples_deleted = delete_older_than(
        conn,
        "battery_sample",
        "captured_at",
        config.battery_sample_days,
    )?;

    stats.network_flows_deleted = delete_older_than(
        conn,
        "network_flow",
        "started_at",
        config.network_flow_days,
    )?;

    stats.http_requests_deleted = delete_older_than(
        conn,
        "http_request",
        "captured_at",
        config.http_request_days,
    )?;

    stats.dns_queries_deleted = delete_older_than(
        conn,
        "dns_query",
        "captured_at",
        config.dns_query_days,
    )?;

    // process_entry rows reference process_snapshot via FK; delete snapshots first
    // (FK enforcement deletes entries if ON DELETE CASCADE is set, but our schema
    // uses REFERENCES without CASCADE, so delete entries first).
    conn.execute(
        &format!(
            "DELETE FROM process_entry
             WHERE snapshot_id IN (
                 SELECT id FROM process_snapshot
                 WHERE captured_at < datetime('now', '-{} days')
             )",
            config.process_snapshot_days
        ),
        [],
    )
    .map_err(Error::Rusqlite)?;

    stats.process_snapshots_deleted = delete_older_than(
        conn,
        "process_snapshot",
        "captured_at",
        config.process_snapshot_days,
    )?;

    stats.thermal_samples_deleted = delete_older_than(
        conn,
        "thermal_sample",
        "captured_at",
        config.thermal_sample_days,
    )?;

    stats.insights_deleted = delete_older_than(
        conn,
        "insight",
        "created_at",
        config.insight_days,
    )?;

    Ok(stats)
}

/// Summary of rows deleted by a retention run.
#[derive(Debug, Default, Clone)]
pub struct RetentionStats {
    pub log_entries_deleted: usize,
    pub battery_samples_deleted: usize,
    pub network_flows_deleted: usize,
    pub http_requests_deleted: usize,
    pub dns_queries_deleted: usize,
    pub process_snapshots_deleted: usize,
    pub thermal_samples_deleted: usize,
    pub insights_deleted: usize,
}

fn delete_older_than(
    conn: &Connection,
    table: &str,
    ts_col: &str,
    days: u32,
) -> Result<usize> {
    let n = conn
        .execute(
            &format!(
                "DELETE FROM {table} WHERE {ts_col} < datetime('now', '-{days} days')"
            ),
            [],
        )
        .map_err(Error::Rusqlite)?;
    Ok(n)
}
