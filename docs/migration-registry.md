# Migration Registry

This file tracks all SQLite migrations in sequence. Only one team adds migrations per week. All migrations must be registered here before merging.

## Format

| # | File | Owner | Milestone | Status | Description |
|---|------|-------|-----------|--------|-------------|
| 001 | `001-foundation.sql` | T2 | M1 | planned | Foundation tables: device, session, package, app_permission, log_entry |

## Rules

1. Migrations are numbered sequentially with zero-padded 3-digit prefix.
2. Migration files live in `apps/desktop/src-tauri/migrations/`.
3. Never modify a migration after it has been applied to any environment.
4. New migrations must be added to this registry before the PR is merged.
5. Coordinate with the Data Team (T2) before adding any migration.

## Applied Migrations

None yet — M1 foundation schema pending T2 implementation.
