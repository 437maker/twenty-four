// queries.ts — Every database read/write function.
// Sprint 1: Care pillar, repeat tasks, conflict detection, treats.
// Sprint 2: Journal entries, streak history, analytics helpers,
//           treat history, owned items, weekly box, export.

import { getDatabase } from './database';
import { getCatalogItem } from '../data/shopCatalog';
import { CHESTS, SHIELD_ID, isChestTier, rollChest } from '../data/chestLoot';
import type { ChestRoll, ChestTier } from '../data/chestLoot';
import { isBreedAvailable } from '../components/companion/breeds';
import { SLOTS, parseEquipped, slotForItem, withItem, withoutSlot } from '../components/companion/items/itemSlots';
import type { Equipped, Slot } from '../components/companion/items/itemSlots';
import { cleanCompanionName } from '../utils/companionName';
import { shiftDateString } from '../utils/dateHelpers';
import {
  Settings, Task, NewTaskInput, Pillar, RepeatType,
  JournalEntry, StreakHistoryEntry,
  TreatHistoryEntry, TreatEventType, OwnedItem,
  SyncStatus, TaskOrigin,
  DeliveryRow, DeliveryCardType,
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
    // Wardrobe
    equipped_items:               row.equipped_items ?? '{}',
    breed:                        row.breed ?? 'maltese',
    shown_house:                  row.shown_house ?? null,
    // Chests
    chests_wooden:                row.chests_wooden ?? 0,
    chests_silver:                row.chests_silver ?? 0,
    chests_gold:                  row.chests_gold ?? 0,
    chest_pity:                   row.chest_pity ?? 0,
    // Phase C: Treat deliveries
    last_delivery_week:           row.last_delivery_week ?? null,
    delivery_type_history:        row.delivery_type_history ?? '[]',
    delivery_content_history:     row.delivery_content_history ?? '[]',
    delivery_tag_weights:         row.delivery_tag_weights ?? '{}',
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

// Purchase an item: deduct treats, add to owned_items, log event.
// Returns false (and charges nothing) if the item is already owned or there
// are not enough treats. The ownership check lives here, next to the code
// that takes the money, so no caller can double-charge by skipping a UI check.
//
// The check, the deduction, the grant, and the ledger row run in ONE
// transaction: either all of them happen or none does. If anything fails
// half-way (or the app is killed), SQLite rolls the whole purchase back, so
// treats can never be taken without the item being granted (this was bug B3).
export async function purchaseItem(
  item_id: string,
  price: number,
  itemName: string
): Promise<boolean> {
  const db = await getDatabase();
  let bought = false;
  await db.withTransactionAsync(async () => {
    if (await isItemOwned(item_id)) return;
    const row = await db.getFirstAsync<{ treat_count: number }>(
      'SELECT treat_count FROM settings WHERE id = 1'
    );
    if (!row || row.treat_count < price) return;

    await db.runAsync(
      `UPDATE settings SET treat_count = treat_count - ? WHERE id = 1`,
      [price]
    );
    await db.runAsync(
      'INSERT OR IGNORE INTO owned_items (item_id) VALUES (?)',
      [item_id]
    );
    await logTreatEvent('shop_purchase', -price, `Bought: ${itemName}`);
    bought = true;
  });
  return bought;
}

// Special: purchase a shield (adds to shields_owned count instead of owned_items).
// One transaction, like purchaseItem.
export async function purchaseShield(price: number): Promise<boolean> {
  const db = await getDatabase();
  let bought = false;
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ treat_count: number }>(
      'SELECT treat_count FROM settings WHERE id = 1'
    );
    if (!row || row.treat_count < price) return;

    await db.runAsync(
      `UPDATE settings SET treat_count = treat_count - ?, shields_owned = shields_owned + 1 WHERE id = 1`,
      [price]
    );
    await logTreatEvent('shop_purchase', -price, 'Bought: Streak Shield');
    bought = true;
  });
  return bought;
}

// ─────────────────────────────────────────────────────────────
// CHESTS
// ─────────────────────────────────────────────────────────────
// Unopened chests are three counters on the settings row. What a chest holds
// is decided by data/chestLoot.ts; this section only stores and applies it.

// The settings column that counts each tier. Fixed strings, never user input.
const CHEST_COLUMN: Record<ChestTier, 'chests_wooden' | 'chests_silver' | 'chests_gold'> = {
  wooden: 'chests_wooden',
  silver: 'chests_silver',
  gold:   'chests_gold',
};

export async function getChestCounts(): Promise<Record<ChestTier, number>> {
  const db  = await getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT chests_wooden, chests_silver, chests_gold FROM settings WHERE id = 1'
  );
  return {
    wooden: row?.chests_wooden ?? 0,
    silver: row?.chests_silver ?? 0,
    gold:   row?.chests_gold ?? 0,
  };
}

// Add one earned chest (the weekly box). Costs nothing.
export async function grantChest(tier: ChestTier): Promise<void> {
  if (!isChestTier(tier)) return;
  const db  = await getDatabase();
  const col = CHEST_COLUMN[tier];
  await db.runAsync(`UPDATE settings SET ${col} = ${col} + 1 WHERE id = 1`);
}

// Buy a chest with treats. One transaction: the check, the deduction, the
// chest, and the ledger row all happen, or none does. Returns false (and
// charges nothing) if there are not enough treats.
export async function purchaseChest(tier: ChestTier): Promise<boolean> {
  if (!isChestTier(tier)) return false;
  const db    = await getDatabase();
  const def   = CHESTS[tier];
  const col   = CHEST_COLUMN[tier];
  let bought  = false;
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ treat_count: number }>(
      'SELECT treat_count FROM settings WHERE id = 1'
    );
    if (!row || row.treat_count < def.price) return;
    await db.runAsync(
      `UPDATE settings SET treat_count = treat_count - ?, ${col} = ${col} + 1 WHERE id = 1`,
      [def.price]
    );
    await logTreatEvent('chest_purchase', -def.price, `Bought: ${def.name}`);
    bought = true;
  });
  return bought;
}

// Open one chest of a tier. One transaction: the chest is removed, the
// treats and the item (or shield, or duplicate refund) are granted, the pity
// counter is updated, and the opening is recorded. If any step fails,
// nothing is kept and the chest is still there to open.
//
// Returns what was inside, or null if there is no chest of that tier.
// `rng` is the random source (0 ≤ n < 1); tests pass a seeded one.
export async function openChest(
  tier: ChestTier,
  rng: () => number = Math.random
): Promise<ChestRoll | null> {
  if (!isChestTier(tier)) return null;
  const db  = await getDatabase();
  const col = CHEST_COLUMN[tier];
  let result: ChestRoll | null = null;

  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<any>(
      `SELECT ${col} AS chests, chest_pity FROM settings WHERE id = 1`
    );
    if (!row || (row.chests ?? 0) < 1) return;

    const ownedRows = await db.getAllAsync<{ item_id: string }>('SELECT item_id FROM owned_items');
    const roll = rollChest(
      tier,
      { owned: new Set(ownedRows.map((r) => r.item_id)), pity: row.chest_pity ?? 0 },
      rng
    );
    const item        = roll.item;
    const gotShield   = item?.id === SHIELD_ID ? 1 : 0;

    await db.runAsync(
      `UPDATE settings
          SET ${col} = ${col} - 1,
              chest_pity = ?,
              treat_count = treat_count + ?,
              shields_owned = shields_owned + ?
        WHERE id = 1`,
      [roll.pityAfter, roll.totalBones, gotShield]
    );
    if (item && !item.duplicate && !gotShield) {
      await db.runAsync('INSERT INTO owned_items (item_id) VALUES (?)', [item.id]);
    }
    await db.runAsync(
      `INSERT INTO chest_openings (tier, bones, item_id, duplicate, refund, pity_used)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tier, roll.bones, item?.id ?? null, item?.duplicate ? 1 : 0, item?.refund ?? 0, roll.pityUsed ? 1 : 0]
    );
    const what = !item
      ? ''
      : item.duplicate
        ? ` + duplicate ${item.name} (${item.refund} treats)`
        : ` + ${item.name}`;
    await logTreatEvent('chest_open', roll.totalBones, `Opened: ${CHESTS[tier].name}${what}`);
    result = roll;
  });

  return result;
}

// ─────────────────────────────────────────────────────────────
// WARDROBE (what the companion wears, which breed, which house)
// ─────────────────────────────────────────────────────────────
// The rules live here, next to the data, so no screen can skip them:
//   • you can only wear an item you own
//   • an item only goes in its own slot (a hat cannot be worn as a cape)
//   • one item per slot: equipping replaces what was there

export async function getEquipped(): Promise<Equipped> {
  const db  = await getDatabase();
  const row = await db.getFirstAsync<{ equipped_items: string | null }>(
    'SELECT equipped_items FROM settings WHERE id = 1'
  );
  return parseEquipped(row?.equipped_items);
}

async function writeEquipped(equipped: Equipped): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE settings SET equipped_items = ? WHERE id = 1',
    [JSON.stringify(equipped)]
  );
}

// Put an owned item on. Returns false, and changes nothing, if the item is
// not wearable, does not belong in that slot, or is not owned.
export async function equipItem(slot: Slot, itemId: string): Promise<boolean> {
  if (slotForItem(itemId) !== slot) return false;
  if (!(await isItemOwned(itemId))) return false;
  const equipped = await getEquipped();
  await writeEquipped(withItem(equipped, itemId));
  return true;
}

// Take off whatever is in a slot. Safe to call on an empty slot.
export async function unequipSlot(slot: Slot): Promise<void> {
  if (!SLOTS.includes(slot)) return;
  const equipped = await getEquipped();
  await writeEquipped(withoutSlot(equipped, slot));
}

// Switch to another breed. Returns false for a breed the app does not have.
// The name and everything she is wearing are left exactly as they are.
export async function setBreed(breedId: string): Promise<boolean> {
  if (!isBreedAvailable(breedId)) return false;
  const db = await getDatabase();
  await db.runAsync('UPDATE settings SET breed = ? WHERE id = 1', [breedId]);
  return true;
}

// Choose which owned house the yard shows. Pass null to go back to
// "the best house I own". Returns false for anything that is not an owned house.
export async function setShownHouse(itemId: string | null): Promise<boolean> {
  const db = await getDatabase();
  if (itemId === null) {
    await db.runAsync('UPDATE settings SET shown_house = NULL WHERE id = 1');
    return true;
  }
  if (getCatalogItem(itemId)?.category !== 'house') return false;
  if (!(await isItemOwned(itemId))) return false;
  await db.runAsync('UPDATE settings SET shown_house = ? WHERE id = 1', [itemId]);
  return true;
}

// Rename the companion. The name is trimmed; an empty name or one longer than
// MAX_NAME_LENGTH is rejected (returns false) and nothing is saved.
export async function renameCompanion(name: string): Promise<boolean> {
  const clean = cleanCompanionName(name);
  if (clean === null) return false;
  const db = await getDatabase();
  await db.runAsync('UPDATE settings SET companion_name = ? WHERE id = 1', [clean]);
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

// ─────────────────────────────────────────────────────────────
// DELIVERIES (Phase C)
// ─────────────────────────────────────────────────────────────

function rowToDelivery(row: any): DeliveryRow {
  return {
    id:           row.id,
    delivered_on: row.delivered_on,
    card_type:    row.card_type as DeliveryCardType,
    content_id:   row.content_id,
    why_line:     row.why_line ?? '',
    opened:       row.opened === 1,
    feedback:     (row.feedback as 'up' | 'down' | null) ?? null,
    saved:        row.saved === 1,
    bones_given:  row.bones_given === 1,
    created_at:   row.created_at,
  };
}

export async function getPendingDeliveries(): Promise<DeliveryRow[]> {
  const db   = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM deliveries WHERE opened = 0 ORDER BY delivered_on ASC LIMIT 2`
  );
  return rows.map(rowToDelivery);
}

export async function getAllDeliveries(limit = 50): Promise<DeliveryRow[]> {
  const db   = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM deliveries ORDER BY delivered_on DESC LIMIT ?`,
    [limit]
  );
  return rows.map(rowToDelivery);
}

export async function getSavedDeliveries(): Promise<DeliveryRow[]> {
  const db   = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM deliveries WHERE saved = 1 ORDER BY delivered_on DESC`
  );
  return rows.map(rowToDelivery);
}

export async function insertDelivery(
  delivered_on: string,
  card_type: DeliveryCardType,
  content_id: string,
  why_line: string
): Promise<number> {
  const db  = await getDatabase();
  const res = await db.runAsync(
    `INSERT INTO deliveries (delivered_on, card_type, content_id, why_line)
     VALUES (?, ?, ?, ?)`,
    [delivered_on, card_type, content_id, why_line]
  );
  return res.lastInsertRowId;
}

export async function openDelivery(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE deliveries SET opened = 1 WHERE id = ?`, [id]);
}

export async function markDeliveryBonesGiven(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE deliveries SET bones_given = 1 WHERE id = ?`, [id]);
}

export async function setDeliveryFeedback(id: number, feedback: 'up' | 'down'): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE deliveries SET feedback = ? WHERE id = ?`, [feedback, id]);
}

export async function saveDelivery(id: number, saved: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE deliveries SET saved = ? WHERE id = ?`, [saved ? 1 : 0, id]);
}

export async function deliveryExistsForDate(date: string): Promise<boolean> {
  const db  = await getDatabase();
  const row = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM deliveries WHERE delivered_on = ?`,
    [date]
  );
  return row !== null;
}

// Every table the app owns. Export and wipe both walk this one list, so a
// table can't be exported but not wiped (or the reverse). A test compares this
// list with the tables the schema actually creates, so adding a table to
// database.ts without adding it here fails the build.
export const ALL_TABLES = [
  'settings',
  'tasks',
  'journal_entries',
  'streak_history',
  'treat_history',
  'owned_items',
  'task_tombstones',
  'chest_openings',
  'deliveries',
] as const;

export type TableName = (typeof ALL_TABLES)[number];

export async function getAllTablesForExport(): Promise<Record<TableName, any[]>> {
  const db = await getDatabase();
  const result = {} as Record<TableName, any[]>;
  for (const table of ALL_TABLES) {
    // Table names come from the constant above, never from user input.
    result[table] = await db.getAllAsync<any>(`SELECT * FROM ${table}`);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// DELETE ALL DATA
// ─────────────────────────────────────────────────────────────

// Empties every table and puts settings back to a fresh-install row.
// Runs in one transaction: either everything is wiped or nothing is, so a
// crash half-way can't leave treats without their ledger or tasks without
// their settings. The schema (tables, columns, indexes) is left in place.
export async function deleteAllData(): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    for (const table of ALL_TABLES) {
      await db.runAsync(`DELETE FROM ${table}`);
    }
    // Restart AUTOINCREMENT ids at 1, like a new install.
    await db.runAsync('DELETE FROM sqlite_sequence');
    // Settings is a single row (id = 1); recreate it with column defaults.
    await db.runAsync('INSERT INTO settings (id) VALUES (1)');
  });
}
