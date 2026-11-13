// database.ts — Opens the SQLite database and sets up / migrates tables.
//
// IMPORTANT: We never DROP or recreate existing tables.
// ALTER TABLE … ADD COLUMN is safe to re-run — if the column already exists
// SQLite throws an error which we silently catch and continue.

import * as SQLite from 'expo-sqlite';

let database: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database === null) {
    database = await SQLite.openDatabaseAsync('twentyfour.db');
    await database.execAsync('PRAGMA journal_mode = WAL;');
  }
  return database;
}

// Helper: run SQL and swallow errors (used for ALTER TABLE ADD COLUMN).
async function tryExec(db: SQLite.SQLiteDatabase, sql: string): Promise<void> {
  try {
    await db.execAsync(sql);
  } catch (_) {
    // Column / table likely already exists — safe to ignore
  }
}

export async function initializeDatabase(): Promise<void> {
  const db = await getDatabase();

  // ── Base tables (idempotent CREATE IF NOT EXISTS) ─────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      id                    INTEGER PRIMARY KEY DEFAULT 1,
      companion_name        TEXT    NOT NULL DEFAULT 'Nova',
      work_target_hours     REAL    NOT NULL DEFAULT 8.0,
      personal_target_hours REAL    NOT NULL DEFAULT 6.0,
      sleep_target_hours    REAL    NOT NULL DEFAULT 8.0,
      current_streak        INTEGER NOT NULL DEFAULT 0,
      longest_streak        INTEGER NOT NULL DEFAULT 0,
      last_active_date      TEXT,
      onboarded             INTEGER NOT NULL DEFAULT 0,
      notification_time     TEXT    NOT NULL DEFAULT '08:00'
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      date           TEXT    NOT NULL,
      name           TEXT    NOT NULL,
      start_time     TEXT    NOT NULL DEFAULT '09:00',
      duration_hours REAL    NOT NULL DEFAULT 1.0,
      pillar         TEXT    NOT NULL DEFAULT 'work',
      completed      INTEGER NOT NULL DEFAULT 0,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);

    CREATE TABLE IF NOT EXISTS journal_entries (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      date             TEXT    UNIQUE NOT NULL,
      reflection_text  TEXT    NOT NULL DEFAULT '',
      prompt_used      TEXT    NOT NULL DEFAULT '',
      is_exception_day INTEGER NOT NULL DEFAULT 0,
      exception_reason TEXT    NOT NULL DEFAULT '',
      word_count       INTEGER NOT NULL DEFAULT 0,
      created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS streak_history (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      start_date TEXT    NOT NULL,
      end_date   TEXT    NOT NULL,
      length     INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS treat_history (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT    NOT NULL,
      delta      INTEGER NOT NULL,
      note       TEXT    NOT NULL DEFAULT '',
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS owned_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id      TEXT    NOT NULL UNIQUE,
      purchased_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── Sprint 1 migrations ────────────────────────────────────────────────────
  await tryExec(db, `ALTER TABLE settings ADD COLUMN care_enabled INTEGER NOT NULL DEFAULT 0`);
  await tryExec(db, `ALTER TABLE settings ADD COLUMN care_target_hours REAL NOT NULL DEFAULT 2.0`);
  await tryExec(db, `ALTER TABLE settings ADD COLUMN targets_last_changed TEXT`);
  await tryExec(db, `ALTER TABLE settings ADD COLUMN treat_count INTEGER NOT NULL DEFAULT 0`);

  await tryExec(db, `ALTER TABLE tasks ADD COLUMN repeat_type TEXT NOT NULL DEFAULT 'none'`);
  await tryExec(db, `ALTER TABLE tasks ADD COLUMN repeat_days TEXT NOT NULL DEFAULT ''`);
  await tryExec(db, `ALTER TABLE tasks ADD COLUMN is_master INTEGER NOT NULL DEFAULT 0`);
  await tryExec(db, `ALTER TABLE tasks ADD COLUMN master_id INTEGER`);

  // ── Sprint 2 migrations ────────────────────────────────────────────────────
  await tryExec(db, `ALTER TABLE settings ADD COLUMN reflection_count INTEGER NOT NULL DEFAULT 0`);
  // Treat Economy
  await tryExec(db, `ALTER TABLE settings ADD COLUMN app_start_date TEXT`);
  await tryExec(db, `ALTER TABLE settings ADD COLUMN last_box_date TEXT`);
  await tryExec(db, `ALTER TABLE settings ADD COLUMN milestones_claimed TEXT NOT NULL DEFAULT '[]'`);
  await tryExec(db, `ALTER TABLE settings ADD COLUMN last_reflection_bonus_count INTEGER NOT NULL DEFAULT 0`);
  // Shop
  await tryExec(db, `ALTER TABLE settings ADD COLUMN shields_owned INTEGER NOT NULL DEFAULT 0`);
  // Notifications
  await tryExec(db, `ALTER TABLE settings ADD COLUMN notifications_enabled INTEGER NOT NULL DEFAULT 1`);
  await tryExec(db, `ALTER TABLE settings ADD COLUMN morning_notification_time TEXT NOT NULL DEFAULT '08:00'`);
  await tryExec(db, `ALTER TABLE settings ADD COLUMN evening_notification_time TEXT NOT NULL DEFAULT '20:00'`);

  // ── Sprint 3: Google Calendar sync ─────────────────────────────────────────
  // tasks: per-row sync state and Google identifiers.
  //   - google_event_id : Google Calendar event id (NULL until first push)
  //   - google_etag     : last etag returned by Google (for If-Match writes)
  //   - google_updated  : last 'updated' timestamp from Google (for conflict resolution)
  //   - updated_at      : our local last-modified timestamp (for conflict resolution)
  //   - sync_status     : 'synced' | 'pending_push' | 'pending_delete'
  //   - origin          : 'app' | 'google'  (where this task first came from)
  await tryExec(db, `ALTER TABLE tasks ADD COLUMN google_event_id TEXT`);
  await tryExec(db, `ALTER TABLE tasks ADD COLUMN google_etag TEXT`);
  await tryExec(db, `ALTER TABLE tasks ADD COLUMN google_updated TEXT`);
  await tryExec(db, `ALTER TABLE tasks ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'))`);
  await tryExec(db, `ALTER TABLE tasks ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending_push'`);
  await tryExec(db, `ALTER TABLE tasks ADD COLUMN origin TEXT NOT NULL DEFAULT 'app'`);

  // Index for finding pending rows quickly
  await tryExec(db, `CREATE INDEX IF NOT EXISTS idx_tasks_sync_status ON tasks(sync_status)`);
  await tryExec(db, `CREATE INDEX IF NOT EXISTS idx_tasks_google_event_id ON tasks(google_event_id)`);

  // Tombstones table: when the user deletes a task we keep a row here so the
  // next sync can tell Google to delete the corresponding event.
  // Once successfully deleted on Google we drop the tombstone.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS task_tombstones (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      google_event_id TEXT    NOT NULL,
      deleted_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_tombstones_event_id ON task_tombstones(google_event_id);
  `);

  // settings: which Google calendar we sync with, last sync token, last sync time.
  await tryExec(db, `ALTER TABLE settings ADD COLUMN google_account_email TEXT`);
  await tryExec(db, `ALTER TABLE settings ADD COLUMN google_calendar_id TEXT`);
  await tryExec(db, `ALTER TABLE settings ADD COLUMN google_sync_token TEXT`);
  await tryExec(db, `ALTER TABLE settings ADD COLUMN google_last_sync_at TEXT`);
  await tryExec(db, `ALTER TABLE settings ADD COLUMN google_sync_enabled INTEGER NOT NULL DEFAULT 0`);

  // Ensure settings row 1 always exists
  await db.runAsync('INSERT OR IGNORE INTO settings (id) VALUES (1);');
}
