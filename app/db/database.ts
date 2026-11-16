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

// Helper: run SQL and swallow duplicate-column-name errors only.
// Any other error is re-thrown so a failed migration cannot be silent.
async function tryExec(db: SQLite.SQLiteDatabase, sql: string): Promise<void> {
  try {
    await db.execAsync(sql);
  } catch (err: any) {
    const msg: string = err?.message ?? String(err);
    if (!msg.includes('duplicate column name')) throw err;
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
  // B0 fix: constant default so the ALTER succeeds on a table that already has rows.
  await tryExec(db, `ALTER TABLE tasks ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''`);
  await tryExec(db, `UPDATE tasks SET updated_at = datetime('now') WHERE updated_at = ''`);
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

  // ── Wardrobe: what the companion wears, which breed, which house shows ────
  // Each column is added with a CONSTANT default. SQLite refuses to add a
  // column with a computed default to a table that already has rows, and
  // tryExec would hide that failure (this is bug B0 on the tasks table).
  // Constant defaults always succeed. The backfill lines after them repair
  // any row that somehow holds an empty value.
  //   - equipped_items : JSON map from slot to item id, e.g. {"head":"acc_party_hat"}
  //   - breed          : which dog is shown
  //   - shown_house    : the owned house shown in the yard (NULL = best owned)
  await tryExec(db, `ALTER TABLE settings ADD COLUMN equipped_items TEXT NOT NULL DEFAULT '{}'`);
  await tryExec(db, `ALTER TABLE settings ADD COLUMN breed TEXT NOT NULL DEFAULT 'maltese'`);
  await tryExec(db, `ALTER TABLE settings ADD COLUMN shown_house TEXT`);
  await tryExec(db, `UPDATE settings SET equipped_items = '{}' WHERE equipped_items IS NULL OR equipped_items = ''`);
  await tryExec(db, `UPDATE settings SET breed = 'maltese' WHERE breed IS NULL OR breed = ''`);

  // ── Chests: unopened chests, the pity counter, and a log of openings ──────
  // Same rule as above (bug B0): constant defaults only, then a backfill.
  //   - chests_wooden / chests_silver / chests_gold : unopened chests owned
  //   - chest_pity : chests opened in a row that held no item
  await tryExec(db, `ALTER TABLE settings ADD COLUMN chests_wooden INTEGER NOT NULL DEFAULT 0`);
  await tryExec(db, `ALTER TABLE settings ADD COLUMN chests_silver INTEGER NOT NULL DEFAULT 0`);
  await tryExec(db, `ALTER TABLE settings ADD COLUMN chests_gold INTEGER NOT NULL DEFAULT 0`);
  await tryExec(db, `ALTER TABLE settings ADD COLUMN chest_pity INTEGER NOT NULL DEFAULT 0`);
  await tryExec(db, `UPDATE settings SET chests_wooden = 0 WHERE chests_wooden IS NULL OR chests_wooden < 0`);
  await tryExec(db, `UPDATE settings SET chests_silver = 0 WHERE chests_silver IS NULL OR chests_silver < 0`);
  await tryExec(db, `UPDATE settings SET chests_gold = 0 WHERE chests_gold IS NULL OR chests_gold < 0`);
  await tryExec(db, `UPDATE settings SET chest_pity = 0 WHERE chest_pity IS NULL OR chest_pity < 0`);

  // One row per chest opened: what tier, how many treats, which item (if
  // any), and whether that item was a duplicate paid out in treats.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS chest_openings (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      tier       TEXT    NOT NULL,
      bones      INTEGER NOT NULL DEFAULT 0,
      item_id    TEXT,
      duplicate  INTEGER NOT NULL DEFAULT 0,
      refund     INTEGER NOT NULL DEFAULT 0,
      pity_used  INTEGER NOT NULL DEFAULT 0,
      opened_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── Phase C: Treat deliveries ───────────────────────────────────────────────
  // Settings columns: track which week was last scheduled and content history.
  await tryExec(db, `ALTER TABLE settings ADD COLUMN last_delivery_week TEXT`);
  await tryExec(db, `ALTER TABLE settings ADD COLUMN delivery_type_history TEXT NOT NULL DEFAULT '[]'`);
  await tryExec(db, `ALTER TABLE settings ADD COLUMN delivery_content_history TEXT NOT NULL DEFAULT '[]'`);
  await tryExec(db, `ALTER TABLE settings ADD COLUMN delivery_tag_weights TEXT NOT NULL DEFAULT '{}'`);
  await tryExec(db, `UPDATE settings SET delivery_type_history = '[]' WHERE delivery_type_history IS NULL OR delivery_type_history = ''`);
  await tryExec(db, `UPDATE settings SET delivery_content_history = '[]' WHERE delivery_content_history IS NULL OR delivery_content_history = ''`);
  await tryExec(db, `UPDATE settings SET delivery_tag_weights = '{}' WHERE delivery_tag_weights IS NULL OR delivery_tag_weights = ''`);

  // ── B12/B13 fix: skip deleted/moved repeat occurrences ───────────────────────
  // repeat_exceptions(master_id, date) means "don't create an instance of master
  // master_id on that date." deleteTask and moveTask write rows here; ensureRepeat
  // Instances reads and skips them.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS repeat_exceptions (
      master_id INTEGER NOT NULL,
      date      TEXT    NOT NULL,
      PRIMARY KEY (master_id, date)
    )
  `);

  // ── B6 fix: separate "last day with a completed task" from "last app open" ──
  // last_active_date now only updates when a task is completed (handleToggle).
  // last_app_open_date guards against checkStreakOnOpen running twice in one day.
  await tryExec(db, `ALTER TABLE settings ADD COLUMN last_app_open_date TEXT`);

  // ── Lively run: last app open, last used durations, journal prompt history ──
  await tryExec(db, `ALTER TABLE settings ADD COLUMN last_opened_at TEXT`);
  await tryExec(db, `ALTER TABLE settings ADD COLUMN last_durations TEXT NOT NULL DEFAULT '{}'`);
  await tryExec(db, `ALTER TABLE settings ADD COLUMN prompt_history TEXT NOT NULL DEFAULT '[]'`);
  await tryExec(db, `UPDATE settings SET last_durations = '{}' WHERE last_durations IS NULL OR last_durations = ''`);
  await tryExec(db, `UPDATE settings SET prompt_history = '[]' WHERE prompt_history IS NULL OR prompt_history = ''`);

  // Deliveries table: one row per scheduled delivery.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS deliveries (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      delivered_on    TEXT    NOT NULL,
      card_type       TEXT    NOT NULL,
      content_id      TEXT    NOT NULL,
      why_line        TEXT    NOT NULL DEFAULT '',
      opened          INTEGER NOT NULL DEFAULT 0,
      feedback        TEXT,
      saved           INTEGER NOT NULL DEFAULT 0,
      bones_given     INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_deliveries_date ON deliveries(delivered_on);
  `);

  // Ensure settings row 1 always exists
  await db.runAsync('INSERT OR IGNORE INTO settings (id) VALUES (1);');
}
