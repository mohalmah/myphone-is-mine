//! `phonescope-storage` — SQLite persistence and migrations for PhoneScope.
//!
//! # Usage
//!
//! ```rust,no_run
//! use phonescope_storage::Database;
//! let db = Database::open_in_memory().unwrap();
//! ```

pub mod migrations;
pub mod models;
pub mod queries;
pub mod retention;

use std::path::Path;

use rusqlite::Connection;
use thiserror::Error;
use tracing::debug;

use phonescope_events::DeviceEvent;

use models::{Device, LogEntry, Package, Session};

pub use queries::LogFilter;

/// Crate-level error type.
#[derive(Debug, Error)]
pub enum Error {
    #[error("SQLite error: {0}")]
    Rusqlite(#[from] rusqlite::Error),

    #[error("Migration error: {0}")]
    Migration(#[from] rusqlite_migration::Error),

    #[error("JSON serialization error: {0}")]
    Json(#[from] serde_json::Error),
}

/// Crate-level result alias.
pub type Result<T> = std::result::Result<T, Error>;

/// The primary database handle. Wraps a single `rusqlite::Connection`.
pub struct Database {
    conn: Connection,
}

impl Database {
    /// Open (or create) the database at `path`, apply all migrations, and
    /// configure WAL mode + foreign keys.
    pub fn open(path: &Path) -> Result<Self> {
        let conn = Connection::open(path).map_err(Error::Rusqlite)?;
        Self::configure_and_migrate(conn)
    }

    /// Open an in-memory database (useful for tests).
    pub fn open_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory().map_err(Error::Rusqlite)?;
        Self::configure_and_migrate(conn)
    }

    fn configure_and_migrate(mut conn: Connection) -> Result<Self> {
        conn.pragma_update(None, "journal_mode", "WAL")
            .map_err(Error::Rusqlite)?;
        conn.pragma_update(None, "synchronous", "NORMAL")
            .map_err(Error::Rusqlite)?;
        conn.pragma_update(None, "foreign_keys", "ON")
            .map_err(Error::Rusqlite)?;
        conn.pragma_update(None, "busy_timeout", 5000)
            .map_err(Error::Rusqlite)?;

        let migrations = migrations::migrations();
        migrations.to_latest(&mut conn)?;

        debug!("Database opened and migrations applied");
        Ok(Self { conn })
    }

    /// Expose a reference to the underlying connection (for raw queries).
    pub fn conn(&self) -> &Connection {
        &self.conn
    }

    // -------------------------------------------------------------------------
    // Device helpers
    // -------------------------------------------------------------------------

    /// Upsert a device row by serial. Returns the device id.
    pub fn upsert_device(&self, serial: &str) -> Result<i64> {
        self.conn
            .execute(
                "INSERT INTO device (serial, last_seen_at)
                 VALUES (?1, datetime('now'))
                 ON CONFLICT(serial) DO UPDATE SET last_seen_at = datetime('now')",
                rusqlite::params![serial],
            )
            .map_err(Error::Rusqlite)?;
        let id: i64 = self
            .conn
            .query_row(
                "SELECT id FROM device WHERE serial = ?1",
                rusqlite::params![serial],
                |row| row.get(0),
            )
            .map_err(Error::Rusqlite)?;
        Ok(id)
    }

    /// Fetch a device by id.
    pub fn get_device(&self, id: i64) -> Result<Option<Device>> {
        let result = self.conn.query_row(
            "SELECT id, serial, model, manufacturer, android_version, sdk_level,
                    is_rooted, has_helper, first_seen_at, last_seen_at
             FROM device WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(Device {
                    id: row.get(0)?,
                    serial: row.get(1)?,
                    model: row.get(2)?,
                    manufacturer: row.get(3)?,
                    android_version: row.get(4)?,
                    sdk_level: row.get(5)?,
                    is_rooted: row.get::<_, i64>(6)? != 0,
                    has_helper: row.get::<_, i64>(7)? != 0,
                    first_seen_at: row.get(8)?,
                    last_seen_at: row.get(9)?,
                })
            },
        );
        match result {
            Ok(d) => Ok(Some(d)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(Error::Rusqlite(e)),
        }
    }

    // -------------------------------------------------------------------------
    // Session helpers
    // -------------------------------------------------------------------------

    /// Create a new session for `device_id`. Returns the session id.
    pub fn create_session(&self, device_id: i64) -> Result<i64> {
        self.conn
            .execute(
                "INSERT INTO session (device_id) VALUES (?1)",
                rusqlite::params![device_id],
            )
            .map_err(Error::Rusqlite)?;
        Ok(self.conn.last_insert_rowid())
    }

    /// Mark a session as ended.
    pub fn end_session(&self, session_id: i64) -> Result<()> {
        self.conn
            .execute(
                "UPDATE session SET ended_at = datetime('now') WHERE id = ?1",
                rusqlite::params![session_id],
            )
            .map_err(Error::Rusqlite)?;
        Ok(())
    }

    /// Fetch a session by id.
    pub fn get_session(&self, id: i64) -> Result<Option<Session>> {
        let result = self.conn.query_row(
            "SELECT id, device_id, started_at, ended_at, capability_mask, mode
             FROM session WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(Session {
                    id: row.get(0)?,
                    device_id: row.get(1)?,
                    started_at: row.get(2)?,
                    ended_at: row.get(3)?,
                    capability_mask: row.get(4)?,
                    mode: row.get(5)?,
                })
            },
        );
        match result {
            Ok(s) => Ok(Some(s)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(Error::Rusqlite(e)),
        }
    }

    // -------------------------------------------------------------------------
    // Event insertion
    // -------------------------------------------------------------------------

    /// Insert a batch of `DeviceEvent`s, dispatching each to the appropriate table.
    /// All inserts run inside a single transaction for performance.
    pub fn insert_events(&mut self, events: &[DeviceEvent]) -> Result<()> {
        let tx = self.conn.transaction().map_err(Error::Rusqlite)?;

        for event in events {
            match event {
                DeviceEvent::Log(e) => {
                    let level_str = e.level.as_char().to_string();
                    tx.execute(
                        "INSERT INTO log_entry
                             (session_id, level, tag, message, pid, tid, captured_at)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                        rusqlite::params![
                            e.meta.session_id,
                            level_str,
                            e.tag,
                            e.message,
                            e.pid,
                            e.tid,
                            e.meta.timestamp.to_rfc3339(),
                        ],
                    )
                    .map_err(Error::Rusqlite)?;
                }
                DeviceEvent::Package(e) => {
                    // Look up device_id via session
                    let device_id: i64 = tx
                        .query_row(
                            "SELECT device_id FROM session WHERE id = ?1",
                            rusqlite::params![e.meta.session_id],
                            |row| row.get(0),
                        )
                        .map_err(Error::Rusqlite)?;

                    tx.execute(
                        "INSERT INTO package
                             (device_id, package_name, app_label, version_name, version_code,
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
                            device_id,
                            e.package_name,
                            e.app_label,
                            e.version_name,
                            e.version_code,
                            e.is_system as i64,
                            e.is_enabled as i64,
                            e.installer,
                            e.target_sdk,
                            e.min_sdk,
                        ],
                    )
                    .map_err(Error::Rusqlite)?;
                }
                // Other event types are not stored by M1 storage.
                _ => {}
            }
        }

        tx.commit().map_err(Error::Rusqlite)?;
        Ok(())
    }

    /// Insert a single log entry directly (without going through `DeviceEvent`).
    pub fn insert_log_entry(&self, entry: &LogEntry) -> Result<i64> {
        self.conn
            .execute(
                "INSERT INTO log_entry
                     (session_id, package_id, level, tag, message, pid, tid, captured_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                rusqlite::params![
                    entry.session_id,
                    entry.package_id,
                    entry.level,
                    entry.tag,
                    entry.message,
                    entry.pid,
                    entry.tid,
                    entry.captured_at,
                ],
            )
            .map_err(Error::Rusqlite)?;
        Ok(self.conn.last_insert_rowid())
    }

    // -------------------------------------------------------------------------
    // Query delegation
    // -------------------------------------------------------------------------

    /// Query log entries with optional filtering and pagination.
    pub fn query_logs(&self, filter: &LogFilter) -> Result<Vec<LogEntry>> {
        queries::query_logs(&self.conn, filter)
    }

    /// Query all packages for a given device.
    pub fn query_packages(&self, device_id: i64) -> Result<Vec<Package>> {
        queries::query_packages(&self.conn, device_id)
    }

    /// Upsert a package row.
    pub fn upsert_package(&self, pkg: &Package) -> Result<i64> {
        queries::upsert_package(&self.conn, pkg)
    }
}
