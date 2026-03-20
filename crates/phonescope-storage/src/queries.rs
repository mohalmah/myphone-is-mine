//! Query helpers for reading data from the database.

use rusqlite::Connection;

use crate::{Error, Result};
use crate::models::{LogEntry, Package};

/// Filter parameters for `query_logs`.
#[derive(Debug, Default, Clone)]
pub struct LogFilter {
    /// Only return entries for this session.
    pub session_id: Option<i64>,
    /// Filter by exact log level character (e.g. "W", "E").
    pub level: Option<String>,
    /// Filter by tag substring (case-insensitive LIKE match).
    pub tag_pattern: Option<String>,
    /// Filter by message substring (case-insensitive LIKE match).
    pub message_search: Option<String>,
    /// Only entries captured after this ISO 8601 UTC string (inclusive).
    pub captured_after: Option<String>,
    /// Only entries captured before this ISO 8601 UTC string (inclusive).
    pub captured_before: Option<String>,
    /// Pagination: number of rows to skip.
    pub offset: Option<i64>,
    /// Pagination: maximum rows to return.
    pub limit: Option<i64>,
}

/// Query log entries with optional filtering and pagination.
///
/// Uses `WHERE 1=1` with optional AND clauses so the query is always valid.
pub fn query_logs(conn: &Connection, filter: &LogFilter) -> Result<Vec<LogEntry>> {
    let mut sql = "SELECT id, session_id, package_id, level, tag, message, pid, tid, captured_at
                   FROM log_entry
                   WHERE 1=1".to_string();

    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if filter.session_id.is_some() {
        sql.push_str(" AND session_id = ?");
        params.push(Box::new(filter.session_id));
    }
    if filter.level.is_some() {
        sql.push_str(" AND level = ?");
        params.push(Box::new(filter.level.clone()));
    }
    if let Some(ref tag) = filter.tag_pattern {
        sql.push_str(" AND tag LIKE ?");
        params.push(Box::new(format!("%{tag}%")));
    }
    if let Some(ref msg) = filter.message_search {
        sql.push_str(" AND message LIKE ?");
        params.push(Box::new(format!("%{msg}%")));
    }
    if filter.captured_after.is_some() {
        sql.push_str(" AND captured_at >= ?");
        params.push(Box::new(filter.captured_after.clone()));
    }
    if filter.captured_before.is_some() {
        sql.push_str(" AND captured_at <= ?");
        params.push(Box::new(filter.captured_before.clone()));
    }

    sql.push_str(" ORDER BY captured_at ASC, id ASC");

    if let Some(limit) = filter.limit {
        sql.push_str(&format!(" LIMIT {limit}"));
    }
    if let Some(offset) = filter.offset {
        sql.push_str(&format!(" OFFSET {offset}"));
    }

    let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let mut stmt = conn.prepare(&sql).map_err(Error::Rusqlite)?;
    let rows = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok(LogEntry {
                id: row.get(0)?,
                session_id: row.get(1)?,
                package_id: row.get(2)?,
                level: row.get(3)?,
                tag: row.get(4)?,
                message: row.get(5)?,
                pid: row.get(6)?,
                tid: row.get(7)?,
                captured_at: row.get(8)?,
            })
        })
        .map_err(Error::Rusqlite)?;

    let mut entries = Vec::new();
    for row in rows {
        entries.push(row.map_err(Error::Rusqlite)?);
    }
    Ok(entries)
}

/// Query all packages for a given device.
pub fn query_packages(conn: &Connection, device_id: i64) -> Result<Vec<Package>> {
    let mut stmt = conn
        .prepare(
            "SELECT id, device_id, package_name, app_label, version_name, version_code,
                    is_system, is_enabled, installer, target_sdk, min_sdk,
                    first_seen_at, last_updated_at
             FROM package
             WHERE device_id = ?1
             ORDER BY package_name ASC",
        )
        .map_err(Error::Rusqlite)?;

    let rows = stmt
        .query_map(rusqlite::params![device_id], |row| {
            Ok(Package {
                id: row.get(0)?,
                device_id: row.get(1)?,
                package_name: row.get(2)?,
                app_label: row.get(3)?,
                version_name: row.get(4)?,
                version_code: row.get(5)?,
                is_system: row.get::<_, i64>(6)? != 0,
                is_enabled: row.get::<_, i64>(7)? != 0,
                installer: row.get(8)?,
                target_sdk: row.get(9)?,
                min_sdk: row.get(10)?,
                first_seen_at: row.get(11)?,
                last_updated_at: row.get(12)?,
            })
        })
        .map_err(Error::Rusqlite)?;

    let mut packages = Vec::new();
    for row in rows {
        packages.push(row.map_err(Error::Rusqlite)?);
    }
    Ok(packages)
}

/// Insert or update a package row (upsert by device_id + package_name).
pub fn upsert_package(conn: &Connection, pkg: &Package) -> Result<i64> {
    conn.execute(
        "INSERT INTO package (device_id, package_name, app_label, version_name, version_code,
                              is_system, is_enabled, installer, target_sdk, min_sdk,
                              last_updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, datetime('now'))
         ON CONFLICT(device_id, package_name) DO UPDATE SET
             app_label       = excluded.app_label,
             version_name    = excluded.version_name,
             version_code    = excluded.version_code,
             is_system       = excluded.is_system,
             is_enabled      = excluded.is_enabled,
             installer       = excluded.installer,
             target_sdk      = excluded.target_sdk,
             min_sdk         = excluded.min_sdk,
             last_updated_at = datetime('now')",
        rusqlite::params![
            pkg.device_id,
            pkg.package_name,
            pkg.app_label,
            pkg.version_name,
            pkg.version_code,
            pkg.is_system as i64,
            pkg.is_enabled as i64,
            pkg.installer,
            pkg.target_sdk,
            pkg.min_sdk,
        ],
    )
    .map_err(Error::Rusqlite)?;

    Ok(conn.last_insert_rowid())
}
