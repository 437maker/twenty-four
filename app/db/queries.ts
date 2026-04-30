// queries.ts — Every function that reads from or writes to the database lives here.
//
// Keeping all database code in one file means you only have to look in one place
// when something breaks or needs to change.

import { getDatabase } from './database';
import { Settings, Task, NewTaskInput, Pillar } from '../types';

// ─────────────────────────────────────────────────────────────
// SETTINGS QUERIES
// ─────────────────────────────────────────────────────────────

// Read the settings row and return it as a Settings object.
// Returns null if no row exists (shouldn't happen after initializeDatabase runs).
export async function getSettings(): Promise<Settings | null> {
  const db = await getDatabase();

  // getFirstAsync returns the first matching row, or null if there are none.
  // The <{...}> part tells TypeScript what shape to expect from the database.
  const row = await db.getFirstAsync<{
    companion_name: string;
    work_target_hours: number;
    personal_target_hours: number;
    sleep_target_hours: number;
    current_streak: number;
    longest_streak: number;
    last_active_date: string | null;
    onboarded: number;        // SQLite stores booleans as 0 or 1
    notification_time: string;
  }>('SELECT * FROM settings WHERE id = 1');

  if (!row) return null;

  // Convert the raw database row into our clean Settings type.
  // Specifically: convert the integer 0/1 back into true/false for "onboarded".
  return {
    companion_name: row.companion_name,
    work_target_hours: row.work_target_hours,
    personal_target_hours: row.personal_target_hours,
    sleep_target_hours: row.sleep_target_hours,
    current_streak: row.current_streak,
    longest_streak: row.longest_streak,
    last_active_date: row.last_active_date,
    onboarded: row.onboarded === 1,
    notification_time: row.notification_time,
  };
}

// Update settings. Only the fields you pass will change.
// "Partial<Settings>" means an object with some (or all) Settings fields.
export async function saveSettings(updates: Partial<Settings>): Promise<void> {
  const db = await getDatabase();

  const fields = Object.keys(updates) as (keyof Settings)[];
  if (fields.length === 0) return;

  // Build "field1 = ?, field2 = ?" etc. dynamically
  const setClause = fields.map((f) => `${f} = ?`).join(', ');

  // Convert booleans to 0/1 for SQLite
  const values = fields.map((f) => {
    const val = updates[f];
    if (typeof val === 'boolean') return val ? 1 : 0;
    return val ?? null;
  });

  await db.runAsync(`UPDATE settings SET ${setClause} WHERE id = 1`, values as any[]);
}

// ─────────────────────────────────────────────────────────────
// TASK QUERIES
// ─────────────────────────────────────────────────────────────

// Get all tasks for a specific date, ordered by start time.
// date format: "YYYY-MM-DD"
export async function getTasksForDate(date: string): Promise<Task[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<{
    id: number;
    date: string;
    name: string;
    start_time: string;
    duration_hours: number;
    pillar: string;
    completed: number;
    created_at: string;
  }>('SELECT * FROM tasks WHERE date = ? ORDER BY start_time ASC', [date]);

  // Map raw rows to our Task type, converting completed 0/1 → boolean
  return rows.map((row) => ({
    ...row,
    pillar: row.pillar as Pillar,
    completed: row.completed === 1,
  }));
}

// Insert a new task. Returns the ID of the newly created row.
export async function createTask(input: NewTaskInput): Promise<number> {
  const db = await getDatabase();

  const result = await db.runAsync(
    `INSERT INTO tasks (date, name, start_time, duration_hours, pillar, completed)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [input.date, input.name, input.start_time, input.duration_hours, input.pillar]
  );

  return result.lastInsertRowId;
}

// Mark a task complete or incomplete.
export async function toggleTaskComplete(id: number, completed: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE tasks SET completed = ? WHERE id = ?', [completed ? 1 : 0, id]);
}

// Update fields on an existing task.
export async function updateTask(id: number, updates: Partial<NewTaskInput>): Promise<void> {
  const db = await getDatabase();

  const fields = Object.keys(updates) as (keyof NewTaskInput)[];
  if (fields.length === 0) return;

  const setClause = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => updates[f]);

  await db.runAsync(`UPDATE tasks SET ${setClause} WHERE id = ?`, [...(values as any[]), id]);
}

// Delete a task permanently.
export async function deleteTask(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
}

// Insert several tasks at once. Used for onboarding sample tasks.
export async function insertSampleTasks(tasks: NewTaskInput[]): Promise<void> {
  for (const task of tasks) {
    await createTask(task);
  }
}
