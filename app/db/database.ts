// database.ts — Opens (or creates) the SQLite database file and sets up tables.
//
// SQLite is a tiny database that lives entirely on the phone as a file.
// No server, no internet needed. It's like a spreadsheet that your app can
// read and write programmatically.

import * as SQLite from 'expo-sqlite';

// We store the open database connection here so we only open it once.
// "null" means it hasn't been opened yet.
let database: SQLite.SQLiteDatabase | null = null;

// getDatabase() either returns the existing connection or opens a new one.
// The "async" keyword means this function can wait for things (like file I/O).
// The "Promise<...>" means it returns a value that will be ready in the future.
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database === null) {
    // openDatabaseAsync creates the .db file on first call, or opens it if it exists.
    database = await SQLite.openDatabaseAsync('twentyfour.db');

    // WAL = Write-Ahead Logging. This makes reads faster and prevents corruption
    // if the app crashes mid-write.
    await database.execAsync('PRAGMA journal_mode = WAL;');
  }
  return database;
}

// initializeDatabase() creates our tables if they don't exist yet.
// Safe to call on every app launch — "IF NOT EXISTS" means it won't overwrite data.
export async function initializeDatabase(): Promise<void> {
  const db = await getDatabase();

  // execAsync runs one or more SQL statements at once.
  // SQL is the language for talking to databases — CREATE TABLE makes a new table,
  // like adding a new sheet to a spreadsheet.
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
  `);

  // Insert the one-and-only settings row if it doesn't exist yet.
  // "INSERT OR IGNORE" = only insert if a row with id=1 doesn't exist.
  await db.runAsync('INSERT OR IGNORE INTO settings (id) VALUES (1);');
}
