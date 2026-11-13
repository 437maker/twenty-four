// queries.ts — Every database read/write function.
// Sprint 1: Care pillar, repeat tasks, conflict detection, treats.
// Sprint 2: Journal entries, streak history, analytics helpers,
//           treat history, owned items, weekly box, export.

import { getDatabase } from './database';
import { shiftDateString } from '../utils/dateHelpers';
import {
  Settings, Task, NewTaskInput, Pillar, RepeatType,
  JournalEntry, StreakHistoryEntry,
  TreatHistoryEntry, TreatEventType, OwnedItem,
  SyncStatus, TaskOrigin,
} from '../types';

// ─────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────

export async function getSettings(): Promise<Settings | null> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<any>('SELECT * FROM settings WHERE id = 1');

  if (!row) return null;

  return {
    companion_name:               row.companion_name,
    work_target_hours:            row.work_target_hours,
    personal_target_hours:        row.personal_target_hours,
    sleep_target_hours:           row.sleep_target_hours,
    care_enabled:                 row.care_enabled === 1,
    care_target_hours:            row.care_target_hours,
    targets_last_changed:         row.targets_last_changed,
    treat_count:                  row.treat_count ?? 0,
    current_streak:               row.current_streak,
    longest_streak:               row.longest_streak,
    last_active_date:             row.last_active_date,
    onboarded:                    row.onboarded === 1,
    notification_time:            row.notification_time,
    reflection_count:             row.reflection_count ?? 0,
    app_start_date:               row.app_start_date ?? null,
    last_box_date:                row.last_box_date ?? null,
    milestones_claimed:           row.milestones_claimed ?? '[]',
    last_reflection_bonus_count:  row.last_reflection_bonus_count ?? 0,
    shields_owned:                row.shields_owned ?? 0,
    notifications_enabled:        row.notifications_enabled !== 0,
    morning_notification_time:    row.morning_notification_time ?? '08:00',
    evening_notification_time:    row.evening_notification_time ?? '20:00',
    // Sprint 3
    google_account_email:         row.google_account_email ?? null,
    google_calendar_id:           row.google_calendar_id   ?? null,
    google_sync_token:            row.google_sync_token    ?? null,
    google_last_sync_at:          row.google_last_sync_at  ?? null,
    google_sync_enabled:          (row.google_sync_enabled ?? 0) === 1,
  };
}

export async function saveSettings(updates: Partial<Settings>): Promise<void> {
  const db = await getDatabase();

  const fields = Object.keys(updates) as (keyof Settings)[];
  if (fields.length === 0) return;

  const setClause = fields.map((f) => `${f} = ?`).join(', ');
  const values    = fields.map((f) => {
    const val = updates[f];
    if (typeof val === 'boolean') return val ? 1 : 0;
    return val ?? null;
  });

  await db.runAsync(
    `UPDATE settings SET ${setClause} WHERE id = 1`,
    values as any[]
  );
}

// Add or subtract treats (never goes below 0)
export async function changeTreats(delta: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE settings SET treat_count = MAX(0, treat_count + ?) WHERE id = 1`,
    [delta]
  );
}

// ─────────────────────────────────────────────────────────────
// TASK HELPERS
// ─────────────────────────────────────────────────────────────

function rowToTask(row: any): Task {
  return {
    id:             row.id,
    date:           row.date,
    name:           row.name,
    start_time:     row.start_time,
    duration_hours: row.duration_hours,
    pillar:         row.pillar as Pillar,
    completed:      row.completed === 1,
    created_at:     row.created_at,
    repeat_type:    (row.repeat_type ?? 'none') as RepeatType,
    repeat_days:    row.repeat_days ?? '',
    is_master:      row.is_master === 1,
    master_id:      row.master_id ?? null,
    // Sprint 3
    google_event_id: row.google_event_id ?? null,
    google_etag:     row.google_etag     ?? null,
    google_updated:  row.google_updated  ?? null,
    updated_at:      row.updated_at      ?? new Date().toISOString(),
    sync_status:     (row.sync_status    ?? 'pending_push') as SyncStatus,
    origin:          (row.origin         ?? 'app') as TaskOrigin,
  };
}

// ─────────────────────────────────────────────────────────────
// REPEAT LOGIC
// ─────────────────────────────────────────────────────────────

function doesRepeatFire(
  repeatType: string,
  repeatDays: string,
  masterOriginDate: string,
  targetDate: string
): boolean {
  if (targetDate < masterOriginDate) return false;

  const d   = new Date(targetDate + 'T12:00:00');
  const dow = d.getDay();

  switch (repeatType) {
    case 'daily':    return true;
    case 'weekdays': return dow >= 1 && dow <= 5;
    case 'weekends': return dow === 0 || dow === 6;
    case 'weekly': {
      const origin = new Date(masterOriginDate + 'T12:00:00');
      return origin.getDay() === dow;
    }
    case 'custom': {
      if (!repeatDays) return false;
      return repeatDays.split(',').map(Number).includes(dow);
    }
    default: return false;
  }
}

export async function ensureRepeatInstances(targetDate: string): Promise<void> {
  const db = await getDatabase();

  const masters = await db.getAllAsync<any>(
    'SELECT * FROM tasks WHERE is_master = 1'
  );

  for (const m of masters) {
    if (!doesRepeatFire(m.repeat_type, m.repeat_days, m.date, targetDate)) continue;

    const existing = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM tasks WHERE master_id = ? AND date = ?',
      [m.id, targetDate]
    );

    if (!existing) {
      await db.runAsync(
        `INSERT INTO tasks (date, name, start_time, duration_hours, pillar, completed, master_id, repeat_type, repeat_days, is_master)
         VALUES (?, ?, ?, ?, ?, 0, ?, 'none', '', 0)`,
        [targetDate, m.name, m.start_time, m.duration_hours, m.pillar, m.id]
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────
// TASK QUERIES
// ─────────────────────────────────────────────────────────────

// Get tasks for a date (generates repeat instances first)
export async function getTasksForDate(date: string): Promise<Task[]> {
  await ensureRepeatInstances(date);
  const db   = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM tasks WHERE date = ? AND is_master = 0 ORDER BY start_time ASC',
    [date]
  );
  return rows.map(rowToTask);
}

// Get tasks for a date WITHOUT generating repeat instances — used for analytics
// so we only see tasks that were actually created/visible for that day.
export async function getTasksForDateRaw(date: string): Promise<Task[]> {
  const db   = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM tasks WHERE date = ? AND is_master = 0 ORDER BY start_time ASC',
    [date]
  );
  return rows.map(rowToTask);
}

// Get tasks for a list of dates (used in Analytics screen)
export async function getTasksForDates(
  dates: string[]
): Promise<{ [date: string]: Task[] }> {
  if (dates.length === 0) return {};
  const result: { [date: string]: Task[] } = {};
  for (const d of dates) {
    result[d] = await getTasksForDateRaw(d);
  }
  return result;
}

// Helper — current ISO timestamp for updated_at and tombstones.
function nowIso(): string {
  return new Date().toISOString();
}

export async function createTask(input: NewTaskInput): Promise<number> {
  const db         = await getDatabase();
  const repeatType = input.repeat_type ?? 'none';
  const repeatDays = input.repeat_days ?? '';
  const isMaster   = repeatType !== 'none' ? 1 : 0;
  const now        = nowIso();

  const result = await db.runAsync(
    `INSERT INTO tasks
       (date, name, start_time, duration_hours, pillar, completed,
        repeat_type, repeat_days, is_master,
        updated_at, sync_status, origin)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'pending_push', 'app')`,
    [input.date, input.name, input.start_time, input.duration_hours,
     input.pillar, repeatType, repeatDays, isMaster, now]
  );
  return result.lastInsertRowId;
}

export async function toggleTaskComplete(id: number, completed: boolean): Promise<void> {
  const db = await getDatabase();
  // Note: completion state isn't pushed to Google (Calendar has no "done" field).
  // We still bump updated_at so the next pull doesn't blindly overwrite us.
  await db.runAsync(
    `UPDATE tasks SET completed = ?, updated_at = ? WHERE id = ?`,
    [completed ? 1 : 0, nowIso(), id]
  );
}

export async function updateTask(
  id: number,
  updates: Partial<NewTaskInput>
): Promise<void> {
  const db     = await getDatabase();
  const fields = Object.keys(updates) as (keyof NewTaskInput)[];
  if (fields.length === 0) return;

  // Build SET clause from user updates, then append sync metadata.
  const setClause = fields.map((f) => `${f} = ?`).join(', ');
  const values    = fields.map((f) => updates[f]);

  await db.runAsync(
    `UPDATE tasks
        SET ${setClause}, updated_at = ?, sync_status = 'pending_push'
      WHERE id = ?`,
    [...(values as any[]), nowIso(), id]
  );
}

// Internal: write a tombstone so the next sync can delete the Google event.
async function recordTombstoneIfNeeded(id: number): Promise<void> {
  const db  = await getDatabase();
  const row = await db.getFirstAsync<{ google_event_id: string | null }>(
    `SELECT google_event_id FROM tasks WHERE id = ?`,
    [id]
  );
  if (row?.google_event_id) {
    await db.runAsync(
      `INSERT INTO task_tombstones (google_event_id) VALUES (?)`,
      [row.google_event_id]
    );
  }
}

export async function deleteTask(id: number): Promise<void> {
  const db = await getDatabase();
  await recordTombstoneIfNeeded(id);
  await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
}

// Move a single task (or repeat instance) to a different date
export async function moveTask(id: number, newDate: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE tasks
        SET date = ?, updated_at = ?, sync_status = 'pending_push'
      WHERE id = ?`,
    [newDate, nowIso(), id]
  );
}

export async function deleteTaskSeries(masterId: number): Promise<void> {
  const db = await getDatabase();
  // Record tombstones for any synced instances in the series.
  const rows = await db.getAllAsync<{ id: number; google_event_id: string | null }>(
    `SELECT id, google_event_id FROM tasks WHERE id = ? OR master_id = ?`,
    [masterId, masterId]
  );
  for (const r of rows) {
    if (r.google_event_id) {
      await db.runAsync(
        `INSERT INTO task_tombstones (google_event_id) VALUES (?)`,
        [r.google_event_id]
      );
    }
  }
  await db.runAsync(
    'DELETE FROM tasks WHERE id = ? OR master_id = ?',
    [masterId, masterId]
  );
}

// ─────────────────────────────────────────────────────────────
// SYNC-SPECIFIC HELPERS (used by services/calendarSync.ts)
// ─────────────────────────────────────────────────────────────

// Tasks waiting to be pushed to Google. We skip repeat masters / instances
// because the user chose not to sync repeating tasks for v1.
export async function getTasksPendingPush(): Promise<Task[]> {
  const db   = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM tasks
       WHERE sync_status = 'pending_push'
         AND is_master = 0
         AND master_id IS NULL`
  );
  return rows.map(rowToTask);
}

export async function getTombstones(): Promise<{ id: number; google_event_id: string }[]> {
  const db = await getDatabase();
  return db.getAllAsync<{ id: number; google_event_id: string }>(
    `SELECT id, google_event_id FROM task_tombstones`
  );
}

export async function deleteTombstone(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM task_tombstones WHERE id = ?`, [id]);
}

// After successful push: mark synced and stash returned identifiers.
export async function markTaskSynced(
  id: number,
  googleEventId: string,
  googleEtag: string | null,
  googleUpdated: string | null
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE tasks
        SET sync_status     = 'synced',
            google_event_id = ?,
            google_etag     = ?,
            google_updated  = ?
      WHERE id = ?`,
    [googleEventId, googleEtag, googleUpdated, id]
  );
}

// Look up a task by Google event id (used when pulling updates).
export async function getTaskByGoogleId(googleEventId: string): Promise<Task | null> {
  const db  = await getDatabase();
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM tasks WHERE google_event_id = ?`,
    [googleEventId]
  );
  return row ? rowToTask(row) : null;
}

// Insert a brand-new task that came from Google (origin='google').
// All incoming events are pinned to the 'work' pillar per the v1 design.
export async function insertTaskFromGoogle(args: {
  googleEventId: string;
  googleEtag:    string | null;
  googleUpdated: string | null;
  date:          string;
  name:          string;
  start_time:    string;
  duration_hours: number;
}): Promise<number> {
  const db  = await getDatabase();
  const now = nowIso();
  const res = await db.runAsync(
    `INSERT INTO tasks
       (date, name, start_time, duration_hours, pillar, completed,
        repeat_type, repeat_days, is_master,
        google_event_id, google_etag, google_updated,
        updated_at, sync_status, origin)
     VALUES (?, ?, ?, ?, 'work', 0,
             'none', '', 0,
             ?, ?, ?,
             ?, 'synced', 'google')`,
    [args.date, args.name, args.start_time, args.duration_hours,
     args.googleEventId, args.googleEtag, args.googleUpdated, now]
  );
  return res.lastInsertRowId;
}

// Update a task with data pulled from Google (last-write-wins).
export async function applyGooglePull(args: {
  id: number;
  date: string;
  name: string;
  start_time: string;
  duration_hours: number;
  googleEtag:    string | null;
  googleUpdated: string | null;
}): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE tasks
        SET date = ?, name = ?, start_time = ?, duration_hours = ?,
            google_etag = ?, google_updated = ?,
            updated_at = ?, sync_status = 'synced'
      WHERE id = ?`,
    [args.date, args.name, args.start_time, args.duration_hours,
     args.googleEtag, args.googleUpdated, nowIso(), args.id]
  );
}

// Hard-delete a task because Google says it was deleted.
// Does NOT write a tombstone (we don't want to push the delete back).
export async function deleteTaskFromGooglePull(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM tasks WHERE id = ?`, [id]);
}

export async function insertSampleTasks(tasks: NewTaskInput[]): Promise<void> {
  for (const t of tasks) await createTask(t);
}

// ─────────────────────────────────────────────────────────────
// CONFLICT DETECTION
// ─────────────────────────────────────────────────────────────

export function findConflict(
  tasks: Task[],
  startTime: string,
  durationHours: number,
  excludeId?: number
): Task | null {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const newStart = toMin(startTime);
  const newEnd   = newStart + durationHours * 60;

  for (const task of tasks) {
    if (task.id === excludeId) continue;
    const tStart = toMin(task.start_time);
    const tEnd   = tStart + task.duration_hours * 60;
    if (newStart < tEnd && tStart < newEnd) return task;
  }
  return null;
}

// Returns the set of task IDs that have any time overlap with another task
export function getConflictingIds(tasks: Task[]): Set<number> {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const conflicting = new Set<number>();
  for (let i = 0; i < tasks.length; i++) {
    for (let j = i + 1; j < tasks.length; j++) {
      const aStart = toMin(tasks[i].start_time);
      const aEnd   = aStart + tasks[i].duration_hours * 60;
      const bStart = toMin(tasks[j].start_time);
      const bEnd   = bStart + tasks[j].duration_hours * 60;
      if (aStart < bEnd && bStart < aEnd) {
        conflicting.add(tasks[i].id);
        conflicting.add(tasks[j].id);
      }
    }
  }
  return conflicting;
}

// ─────────────────────────────────────────────────────────────
// JOURNAL
// ─────────────────────────────────────────────────────────────

function rowToJournalEntry(row: any): JournalEntry {
  return {
    id:               row.id,
    date:             row.date,
    reflection_text:  row.reflection_text,
    prompt_used:      row.prompt_used,
    is_exception_day: row.is_exception_day === 1,
    exception_reason: row.exception_reason ?? '',
    word_count:       row.word_count ?? 0,
    created_at:       row.created_at,
  };
}

export async function getJournalEntry(date: string): Promise<JournalEntry | null> {
  const db  = await getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM journal_entries WHERE date = ?',
    [date]
  );
  return row ? rowToJournalEntry(row) : null;
}

// Insert or update a journal entry (upsert via INSERT OR REPLACE)
export async function saveJournalEntry(
  entry: Omit<JournalEntry, 'id' | 'created_at'>
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO journal_entries
       (date, reflection_text, prompt_used, is_exception_day, exception_reason, word_count)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       reflection_text  = excluded.reflection_text,
       prompt_used      = excluded.prompt_used,
       is_exception_day = excluded.is_exception_day,
       exception_reason = excluded.exception_reason,
       word_count       = excluded.word_count`,
    [
      entry.date,
      entry.reflection_text,
      entry.prompt_used,
      entry.is_exception_day ? 1 : 0,
      entry.exception_reason,
      entry.word_count,
    ]
  );
}

export async function getRecentJournalEntries(limit = 30): Promise<JournalEntry[]> {
  const db   = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM journal_entries ORDER BY date DESC LIMIT ?',
    [limit]
  );
  return rows.map(rowToJournalEntry);
}

// Bump reflection_count and return the new value
export async function incrementReflectionCount(): Promise<number> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE settings SET reflection_count = reflection_count + 1 WHERE id = 1'
  );
  const row = await db.getFirstAsync<{ reflection_count: number }>(
    'SELECT reflection_count FROM settings WHERE id = 1'
  );
  return row?.reflection_count ?? 0;
}

// ─────────────────────────────────────────────────────────────
// STREAK HISTORY
// ─────────────────────────────────────────────────────────────

// Call this before resetting the streak counter to preserve history
export async function logStreakEnd(
  endDate: string,
  length: number
): Promise<void> {
  if (length < 1) return; // don't log tiny streaks
  const db = await getDatabase();
  // Compute start_date from end_date and length (local calendar days)
  const startDate = shiftDateString(endDate, -(length - 1));
  await db.runAsync(
    'INSERT INTO streak_history (start_date, end_date, length) VALUES (?, ?, ?)',
    [startDate, endDate, length]
  );
}

export async function getRecentStreaks(limit = 5): Promise<StreakHistoryEntry[]> {
  const db   = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM streak_history ORDER BY end_date DESC LIMIT ?',
    [limit]
  );
  return rows.map((r: any) => ({
    id:         r.id,
    start_date: r.start_date,
    end_date:   r.end_date,
    length:     r.length,
  }));
}

// ─────────────────────────────────────────────────────────────
// TREAT HISTORY
// ─────────────────────────────────────────────────────────────

export async function logTreatEvent(
  event_type: TreatEventType,
  delta: number,
  note: string
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO treat_history (event_type, delta, note) VALUES (?, ?, ?)',
    [event_type, delta, note]
  );
}

export async function getRecentTreatHistory(limit = 20): Promise<TreatHistoryEntry[]> {
  const db   = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM treat_history ORDER BY created_at DESC LIMIT ?',
    [limit]
  );
  return rows.map((r: any) => ({
    id:         r.id,
    event_type: r.event_type as TreatEventType,
    delta:      r.delta,
    note:       r.note,
    created_at: r.created_at,
  }));
}

// ─────────────────────────────────────────────────────────────
// OWNED ITEMS (Shop)
// ─────────────────────────────────────────────────────────────

export async function getOwnedItems(): Promise<OwnedItem[]> {
  const db   = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM owned_items ORDER BY purchased_at DESC'
  );
  return rows.map((r: any) => ({
    id:           r.id,
    item_id:      r.item_id,
    purchased_at: r.purchased_at,
  }));
}

export async function isItemOwned(item_id: string): Promise<boolean> {
  const db  = await getDatabase();
  const row = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM owned_items WHERE item_id = ?',
    [item_id]
  );
  return row !== null;
}

// Purchase an item: deduct treats, add to owned_items, log event
// Returns false if not enough treats
export async function purchaseItem(
  item_id: string,
  price: number,
  itemName: string
): Promise<boolean> {
  const db      = await getDatabase();
  const row     = await db.getFirstAsync<{ treat_count: number }>(
    'SELECT treat_count FROM settings WHERE id = 1'
  );
  if (!row || row.treat_count < price) return false;

  await db.runAsync(
    `UPDATE settings SET treat_count = treat_count - ? WHERE id = 1`,
    [price]
  );
  await db.runAsync(
    'INSERT OR IGNORE INTO owned_items (item_id) VALUES (?)',
    [item_id]
  );
  await logTreatEvent('shop_purchase', -price, `Bought: ${itemName}`);
  return true;
}

// Special: purchase a shield (adds to shields_owned count instead of owned_items)
export async function purchaseShield(price: number): Promise<boolean> {
  const db  = await getDatabase();
  const row = await db.getFirstAsync<{ treat_count: number }>(
    'SELECT treat_count FROM settings WHERE id = 1'
  );
  if (!row || row.treat_count < price) return false;

  await db.runAsync(
    `UPDATE settings SET treat_count = treat_count - ?, shields_owned = shields_owned + 1 WHERE id = 1`,
    [price]
  );
  await logTreatEvent('shop_purchase', -price, 'Bought: Streak Shield');
  return true;
}

// ─────────────────────────────────────────────────────────────
// EXPORT (Data Backup)
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// MONTHLY / YEARLY ANALYTICS QUERIES
// ─────────────────────────────────────────────────────────────

// All journal entries for a specific calendar month (month is 0-indexed: 0=Jan)
export async function getJournalEntriesForMonth(
  year: number,
  month: number
): Promise<JournalEntry[]> {
  const db     = await getDatabase();
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const rows   = await db.getAllAsync<any>(
    `SELECT * FROM journal_entries WHERE date LIKE ? ORDER BY date ASC`,
    [`${prefix}-%`]
  );
  return rows.map(rowToJournalEntry);
}

// Total treats EARNED (positive delta events) in a given calendar year
export async function getTreatEarnedForYear(year: number): Promise<number> {
  const db  = await getDatabase();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(delta), 0) AS total
       FROM treat_history
      WHERE delta > 0
        AND strftime('%Y', created_at) = ?`,
    [String(year)]
  );
  return row?.total ?? 0;
}

// Count of journal entries written in a given calendar year
export async function getJournalCountForYear(year: number): Promise<number> {
  const db  = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count
       FROM journal_entries
      WHERE strftime('%Y', date) = ?`,
    [String(year)]
  );
  return row?.count ?? 0;
}

// Total number of items ever purchased (owned_items table row count)
export async function getOwnedItemsCount(): Promise<number> {
  const db  = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM owned_items`
  );
  return row?.count ?? 0;
}

// All task rows for a specific calendar month — used by both Monthly and Yearly sections
export async function getTasksForMonth(
  year: number,
  month: number   // 0-indexed
): Promise<{ [date: string]: Task[] }> {
  // Build every date string for the month, e.g. ["2026-05-01", …, "2026-05-31"]
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(
      `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    );
  }
  return getTasksForDates(dates);
}

export async function getAllTablesForExport(): Promise<Record<string, any[]>> {
  const db = await getDatabase();
  const [settings, tasks, journal, streaks, treatHist, owned] = await Promise.all([
    db.getAllAsync<any>('SELECT * FROM settings'),
    db.getAllAsync<any>('SELECT * FROM tasks'),
    db.getAllAsync<any>('SELECT * FROM journal_entries'),
    db.getAllAsync<any>('SELECT * FROM streak_history'),
    db.getAllAsync<any>('SELECT * FROM treat_history'),
    db.getAllAsync<any>('SELECT * FROM owned_items'),
  ]);
  return {
    settings,
    tasks,
    journal_entries: journal,
    streak_history:  streaks,
    treat_history:   treatHist,
    owned_items:     owned,
  };
}
