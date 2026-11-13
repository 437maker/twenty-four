// __tests__/repeatAndConflicts.test.ts
//
// The repeat-task master/instance model and conflict detection, run against a
// real in-memory SQLite database (test-utils/realSqlite.ts). These back the
// claims made in docs/HOW_IT_WORKS.md.

jest.mock('expo-sqlite', () => require('../test-utils/realSqlite').expoSqliteMock);

import { resetRealDb, rawDb } from '../test-utils/realSqlite';
import { initializeDatabase } from '../app/db/database';
import {
  createTask,
  getTasksForDate,
  getTasksForDateRaw,
  toggleTaskComplete,
  deleteTask,
  deleteTaskSeries,
  moveTask,
  findConflict,
  getConflictingIds,
} from '../app/db/queries';
import type { Task, NewTaskInput } from '../app/types';

// May 2026: the 11th is a Monday, the 16th a Saturday, the 17th a Sunday.
const MON = '2026-05-11';
const TUE = '2026-05-12';
const WED = '2026-05-13';
const SAT = '2026-05-16';
const SUN = '2026-05-17';
const NEXT_MON = '2026-05-18';

function repeating(overrides: Partial<NewTaskInput> = {}): NewTaskInput {
  return {
    date: MON, name: 'Gym', start_time: '18:00', duration_hours: 1,
    pillar: 'personal', repeat_type: 'daily', ...overrides,
  };
}

function rowCount(): number {
  return Number(rawDb().prepare('SELECT COUNT(*) AS n FROM tasks').get().n);
}

beforeEach(async () => {
  resetRealDb();
  await initializeDatabase();
});

// ─────────────────────────────────────────────────────────────────────────────
// Master / instance model
// ─────────────────────────────────────────────────────────────────────────────
describe('repeat tasks: master and instances', () => {
  test('creating a repeat task stores ONE master row and no instances yet', async () => {
    const masterId = await createTask(repeating());

    expect(rowCount()).toBe(1);
    const row = rawDb().prepare('SELECT * FROM tasks WHERE id = ?').get(masterId);
    expect(row.is_master).toBe(1);
    expect(row.master_id).toBeNull();
    expect(row.repeat_type).toBe('daily');
  });

  test('the master is a template: it is never returned as a task', async () => {
    const masterId = await createTask(repeating());
    const tasks = await getTasksForDate(MON);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).not.toBe(masterId);
    expect(tasks[0].is_master).toBe(false);
    expect(tasks[0].master_id).toBe(masterId);
  });

  test('instances are created lazily, only for dates that are read', async () => {
    await createTask(repeating());
    expect(rowCount()).toBe(1); // just the master

    await getTasksForDate(TUE);
    expect(rowCount()).toBe(2); // master + Tuesday

    await getTasksForDate(WED);
    expect(rowCount()).toBe(3); // + Wednesday. Thursday onward does not exist yet.
  });

  test('reading the same date twice does not duplicate the instance', async () => {
    await createTask(repeating());
    await getTasksForDate(TUE);
    await getTasksForDate(TUE);
    await getTasksForDate(TUE);

    expect(await getTasksForDate(TUE)).toHaveLength(1);
    expect(rowCount()).toBe(2);
  });

  test('an instance copies name, time, duration and pillar from the master', async () => {
    await createTask(repeating({ name: 'Read', start_time: '21:30', duration_hours: 0.5, pillar: 'care' }));
    const [instance] = await getTasksForDate(WED);

    expect(instance).toMatchObject({
      date: WED, name: 'Read', start_time: '21:30', duration_hours: 0.5,
      pillar: 'care', completed: false, repeat_type: 'none',
    });
  });

  test('each instance has its own completed flag', async () => {
    await createTask(repeating());
    const [mon] = await getTasksForDate(MON);
    await toggleTaskComplete(mon.id, true);

    expect((await getTasksForDate(MON))[0].completed).toBe(true);
    expect((await getTasksForDate(TUE))[0].completed).toBe(false);
  });

  test('a repeat never fires before the date it was created on', async () => {
    await createTask(repeating({ date: WED }));

    expect(await getTasksForDate(TUE)).toHaveLength(0);
    expect(await getTasksForDate(WED)).toHaveLength(1);
  });

  test('the raw read (used by analytics) never creates instances', async () => {
    await createTask(repeating());

    expect(await getTasksForDateRaw(TUE)).toHaveLength(0);
    expect(rowCount()).toBe(1);
  });

  test('deleting the series removes the master and every instance', async () => {
    const masterId = await createTask(repeating());
    await getTasksForDate(MON);
    await getTasksForDate(TUE);
    await createTask({ date: MON, name: 'Unrelated', start_time: '08:00', duration_hours: 1, pillar: 'work' });

    await deleteTaskSeries(masterId);

    expect(rowCount()).toBe(1); // only the unrelated task is left
    expect(await getTasksForDate(WED)).toHaveLength(0); // and it stops repeating
  });
});

describe('repeat patterns', () => {
  const fires = async (date: string) => (await getTasksForDate(date)).length === 1;

  test('weekdays: Monday to Friday only', async () => {
    await createTask(repeating({ repeat_type: 'weekdays' }));
    expect(await fires(MON)).toBe(true);
    expect(await fires(SAT)).toBe(false);
    expect(await fires(SUN)).toBe(false);
    expect(await fires(NEXT_MON)).toBe(true);
  });

  test('weekends: Saturday and Sunday only', async () => {
    await createTask(repeating({ repeat_type: 'weekends' }));
    expect(await fires(MON)).toBe(false);
    expect(await fires(SAT)).toBe(true);
    expect(await fires(SUN)).toBe(true);
  });

  test('weekly: same weekday as the day it was created', async () => {
    await createTask(repeating({ repeat_type: 'weekly' })); // created on a Monday
    expect(await fires(MON)).toBe(true);
    expect(await fires(TUE)).toBe(false);
    expect(await fires(NEXT_MON)).toBe(true);
  });

  test('custom: only the chosen weekdays (0 = Sunday)', async () => {
    await createTask(repeating({ repeat_type: 'custom', repeat_days: '1,3' })); // Mon, Wed
    expect(await fires(MON)).toBe(true);
    expect(await fires(TUE)).toBe(false);
    expect(await fires(WED)).toBe(true);
    expect(await fires(SUN)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Known bugs in the instance model (docs/BUGS.md B12, B13) — reported, not fixed.
// `test.failing` = expected to fail today; flips to a failure once the bug is
// fixed, at which point change it to `test`.
// ─────────────────────────────────────────────────────────────────────────────
describe('known bugs in the repeat model', () => {
  test.failing('B12: deleting one occurrence keeps it deleted', async () => {
    await createTask(repeating());
    const [tue] = await getTasksForDate(TUE);

    await deleteTask(tue.id); // "Delete this occurrence"

    // The Schedule screen reloads the day right after the delete:
    expect(await getTasksForDate(TUE)).toHaveLength(0);
  });

  test.failing('B13: moving an occurrence does not leave a copy behind', async () => {
    await createTask(repeating({ repeat_type: 'weekly' })); // Mondays only
    const [mon] = await getTasksForDate(MON);

    await moveTask(mon.id, TUE); // "Move to Tuesday"

    expect(await getTasksForDate(TUE)).toHaveLength(1);
    expect(await getTasksForDate(MON)).toHaveLength(0); // Monday should now be empty
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Conflict detection (pure functions, no database)
// ─────────────────────────────────────────────────────────────────────────────
function task(id: number, start_time: string, duration_hours: number): Task {
  return {
    id, date: MON, name: `Task ${id}`, start_time, duration_hours,
    pillar: 'work', completed: false, created_at: '',
    repeat_type: 'none', repeat_days: '', is_master: false, master_id: null,
    google_event_id: null, google_etag: null, google_updated: null,
    updated_at: '', sync_status: 'synced', origin: 'app',
  };
}

describe('findConflict', () => {
  const existing = [task(1, '09:00', 2)]; // 9:00 to 11:00

  test('overlapping the start, the end, or the middle is a conflict', () => {
    expect(findConflict(existing, '08:00', 2)?.id).toBe(1);   // 8-10 overlaps the start
    expect(findConflict(existing, '10:30', 1)?.id).toBe(1);   // 10:30-11:30 overlaps the end
    expect(findConflict(existing, '09:30', 0.5)?.id).toBe(1); // fully inside
    expect(findConflict(existing, '08:00', 4)?.id).toBe(1);   // fully surrounds
  });

  test('back-to-back tasks do NOT conflict (intervals are half-open)', () => {
    expect(findConflict(existing, '11:00', 1)).toBeNull(); // starts exactly when it ends
    expect(findConflict(existing, '08:00', 1)).toBeNull(); // ends exactly when it starts
  });

  test('a task never conflicts with itself while being edited', () => {
    expect(findConflict(existing, '09:00', 2, 1)).toBeNull();
  });

  test('no tasks, no conflict', () => {
    expect(findConflict([], '09:00', 2)).toBeNull();
  });
});

describe('getConflictingIds', () => {
  test('flags both tasks in every overlapping pair', () => {
    const ids = getConflictingIds([
      task(1, '09:00', 2),  // 9-11
      task(2, '10:00', 1),  // 10-11  overlaps 1
      task(3, '11:00', 1),  // 11-12  touches 1 and 2, overlaps neither
      task(4, '14:00', 1),  // alone
    ]);
    expect([...ids].sort()).toEqual([1, 2]);
  });

  test('a chain A-B-C flags all three even though A and C do not overlap', () => {
    const ids = getConflictingIds([
      task(1, '09:00', 2),   // 9-11
      task(2, '10:30', 2),   // 10:30-12:30
      task(3, '12:00', 1),   // 12-13
    ]);
    expect([...ids].sort()).toEqual([1, 2, 3]);
  });

  test('empty and single-task days have no conflicts', () => {
    expect(getConflictingIds([]).size).toBe(0);
    expect(getConflictingIds([task(1, '09:00', 1)]).size).toBe(0);
  });
});
