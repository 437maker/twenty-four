// __tests__/dataLifecycle.test.ts
//
// Phase 3: "Export my data" and "Delete all my data".
//
// Unlike queries.test.ts (which pattern-matches SQL strings), these tests run
// the app's real schema and real queries against a real in-memory SQLite
// database (see test-utils/realSqlite.ts). A typo in the SQL fails here.

jest.mock('expo-sqlite', () => require('../test-utils/realSqlite').expoSqliteMock);

// Phone-only modules that dataExport.ts and the store import. The functions
// under test never call them.
jest.mock('expo-file-system', () => ({ File: jest.fn(), Paths: { cache: 'cache' } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('../app/services/calendarSync', () => ({
  runSync: jest.fn(),
  isSyncReady: jest.fn(async () => false),
}));

import { resetRealDb, rawDb } from '../test-utils/realSqlite';
import { initializeDatabase } from '../app/db/database';
import {
  ALL_TABLES,
  createTask,
  toggleTaskComplete,
  saveJournalEntry,
  changeTreats,
  purchaseItem,
  purchaseShield,
  logStreakEnd,
  saveSettings,
  getSettings,
  getTasksForDate,
  getOwnedItems,
  getAllTablesForExport,
  deleteAllData,
} from '../app/db/queries';
import {
  buildExportPayload,
  exportFileName,
  EXPORT_FORMAT_VERSION,
  REDACTED_PLACEHOLDER,
} from '../app/services/dataExport';
import { useAppStore } from '../app/store/useAppStore';

const DAY = '2026-05-15';

function count(table: string): number {
  return Number(rawDb().prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n);
}

// Put at least one row in every table, the way a real user would.
async function seedUsedApp(): Promise<void> {
  await saveSettings({
    companion_name: 'Rex',
    onboarded: true,
    care_enabled: true,
    current_streak: 12,
    longest_streak: 30,
    last_active_date: DAY,
    app_start_date: '2026-04-01',
    shields_owned: 0,
    google_account_email: 'someone@example.com',
    google_sync_token: 'sync-token-abc',
    google_sync_enabled: true,
  });
  await changeTreats(300);

  const id = await createTask({ date: DAY, name: 'Lab report', start_time: '09:00', duration_hours: 2, pillar: 'work' });
  await toggleTaskComplete(id, true);
  await createTask({ date: DAY, name: 'Gym', start_time: '18:00', duration_hours: 1, pillar: 'personal', repeat_type: 'daily' });
  await getTasksForDate(DAY); // materializes the repeat instance

  await saveJournalEntry({
    date: DAY, reflection_text: 'Good day', prompt_used: 'How did it go?',
    is_exception_day: false, exception_reason: '', word_count: 2,
  });
  await logStreakEnd('2026-03-10', 5);
  await purchaseItem('outfit_cozy_sweater', 25, 'Cozy Sweater');
  await purchaseShield(50);
  rawDb().prepare(`INSERT INTO task_tombstones (google_event_id) VALUES ('evt_123')`).run();
  rawDb().prepare(`INSERT INTO chest_openings (tier, bones) VALUES ('wooden', 5)`).run();
  rawDb().prepare(`INSERT INTO deliveries (delivered_on, card_type, content_id, why_line) VALUES ('${DAY}', 'quote', 'q01', 'Test delivery')`).run();
}

beforeEach(async () => {
  resetRealDb();
  await initializeDatabase();
  useAppStore.setState({
    settings: null, isOnboarded: false, todaysTasks: [],
    pendingCelebration: false, milestoneStreak: 0, streakJustBroke: false,
    pendingBoxReward: null, shieldConsumed: false, isSyncing: false,
    pendingDeliveries: [],
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────
describe('schema', () => {
  test('ALL_TABLES matches the tables the schema really creates', () => {
    const real = rawDb()
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`)
      .all()
      .map((r: any) => r.name)
      .sort();
    expect([...ALL_TABLES].sort()).toEqual(real);
  });

  test('a fresh install has exactly one settings row and is not onboarded', async () => {
    expect(count('settings')).toBe(1);
    const s = await getSettings();
    expect(s?.onboarded).toBe(false);
    expect(s?.companion_name).toBe('Nova');
  });

  test('running migrations twice is harmless (idempotent)', async () => {
    await createTask({ date: DAY, name: 'Keep me', start_time: '09:00', duration_hours: 1, pillar: 'work' });
    await initializeDatabase();
    expect(count('tasks')).toBe(1);
    expect(count('settings')).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Purchases against real SQL (the mock-based tests can't catch SQL typos)
// ─────────────────────────────────────────────────────────────────────────────
describe('purchases on a real database', () => {
  test('buying the same item twice charges once and writes one ledger row', async () => {
    await changeTreats(100);

    expect(await purchaseItem('outfit_cozy_sweater', 25, 'Cozy Sweater')).toBe(true);
    expect(await purchaseItem('outfit_cozy_sweater', 25, 'Cozy Sweater')).toBe(false);

    expect((await getSettings())?.treat_count).toBe(75);
    expect(await getOwnedItems()).toHaveLength(1);
    expect(count('treat_history')).toBe(1);
  });

  // Bug B3 (fixed): a purchase is three statements (deduct treats, grant the
  // item, write the ledger row). They now run in one transaction, so if the
  // app dies between them nothing is kept. Here the third statement is made
  // to fail, which is the same thing as far as the database can tell.
  function breakTheLedger(): void {
    rawDb().exec(`
      CREATE TRIGGER forced_failure BEFORE INSERT ON treat_history
      BEGIN SELECT RAISE(ABORT, 'forced failure'); END;
    `);
  }

  test('B3: an item purchase that fails half-way charges nothing and grants nothing', async () => {
    await changeTreats(100);
    breakTheLedger();

    await expect(purchaseItem('outfit_cozy_sweater', 25, 'Cozy Sweater')).rejects.toThrow();

    expect((await getSettings())?.treat_count).toBe(100);
    expect(await getOwnedItems()).toHaveLength(0);
  });

  test('B3: a shield purchase that fails half-way charges nothing and grants nothing', async () => {
    await changeTreats(100);
    breakTheLedger();

    await expect(purchaseShield(50)).rejects.toThrow();

    const s = await getSettings();
    expect(s?.treat_count).toBe(100);
    expect(s?.shields_owned).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────
describe('export', () => {
  test('getAllTablesForExport returns every table, each as an array of rows', async () => {
    await seedUsedApp();
    const tables = await getAllTablesForExport();

    expect(Object.keys(tables).sort()).toEqual([...ALL_TABLES].sort());
    for (const name of ALL_TABLES) {
      expect(Array.isArray(tables[name])).toBe(true);
      expect(tables[name].length).toBeGreaterThan(0); // seed touched every table
    }
  });

  test('payload has the documented shape', async () => {
    await seedUsedApp();
    const now = new Date('2026-05-15T18:00:00Z');
    const payload = buildExportPayload(await getAllTablesForExport(), now);

    expect(Object.keys(payload).sort()).toEqual(
      ['app', 'export_date', 'exported_at', 'format_version', 'row_counts', 'tables'],
    );
    expect(payload.app).toBe('twenty-four');
    expect(payload.format_version).toBe(EXPORT_FORMAT_VERSION);
    expect(payload.exported_at).toBe('2026-05-15T18:00:00.000Z');
    expect(payload.export_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // row_counts agrees with the rows actually in the file
    for (const name of ALL_TABLES) {
      expect(payload.row_counts[name]).toBe(payload.tables[name].length);
    }
    // master + its materialized instance + the one-off task
    expect(payload.row_counts.tasks).toBe(3);
    expect(payload.row_counts.settings).toBe(1);
    expect(payload.row_counts.journal_entries).toBe(1);
    expect(payload.row_counts.owned_items).toBe(1);
    expect(payload.row_counts.treat_history).toBe(2); // item + shield
  });

  test('user content survives the round trip through JSON', async () => {
    await seedUsedApp();
    const payload = buildExportPayload(await getAllTablesForExport());
    const parsed = JSON.parse(JSON.stringify(payload));

    expect(parsed.tables.settings[0].companion_name).toBe('Rex');
    expect(parsed.tables.settings[0].treat_count).toBe(225); // 300 - 25 - 50
    expect(parsed.tables.journal_entries[0].reflection_text).toBe('Good day');
    expect(parsed.tables.tasks.map((t: any) => t.name)).toEqual(
      expect.arrayContaining(['Lab report', 'Gym']),
    );
    expect(parsed.tables.streak_history[0]).toMatchObject({
      start_date: '2026-03-06', end_date: '2026-03-10', length: 5,
    });
  });

  test('the Google sync token is removed; the source rows are not mutated', async () => {
    await seedUsedApp();
    const tables = await getAllTablesForExport();
    const payload = buildExportPayload(tables);

    expect(payload.tables.settings[0].google_sync_token).toBe(REDACTED_PLACEHOLDER);
    expect(JSON.stringify(payload)).not.toContain('sync-token-abc');
    expect(tables.settings[0].google_sync_token).toBe('sync-token-abc'); // input untouched
  });

  test('an empty app still exports a complete, valid file', async () => {
    const payload = buildExportPayload(await getAllTablesForExport());

    expect(payload.row_counts.settings).toBe(1);
    expect(payload.row_counts.tasks).toBe(0);
    expect(payload.tables.settings[0].google_sync_token).toBeNull(); // null stays null
    expect(() => JSON.stringify(payload)).not.toThrow();
  });

  test('file name carries the local date', () => {
    expect(exportFileName()).toMatch(/^twenty-four-backup-\d{4}-\d{2}-\d{2}\.json$/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Delete all data
// ─────────────────────────────────────────────────────────────────────────────
describe('deleteAllData', () => {
  test('empties every table and leaves one default settings row', async () => {
    await seedUsedApp();
    for (const name of ALL_TABLES) expect(count(name)).toBeGreaterThan(0);

    await deleteAllData();

    for (const name of ALL_TABLES) {
      expect(count(name)).toBe(name === 'settings' ? 1 : 0);
    }
  });

  test('settings are back to fresh-install defaults', async () => {
    await seedUsedApp();
    await deleteAllData();

    const s = await getSettings();
    expect(s).toMatchObject({
      companion_name: 'Nova',
      onboarded: false,
      care_enabled: false,
      treat_count: 0,
      current_streak: 0,
      longest_streak: 0,
      last_active_date: null,
      app_start_date: null,
      last_box_date: null,
      milestones_claimed: '[]',
      shields_owned: 0,
      reflection_count: 0,
      google_account_email: null,
      google_calendar_id: null,
      google_sync_token: null,
      google_sync_enabled: false,
    });
  });

  test('ids restart at 1 and the app is fully usable afterwards', async () => {
    await seedUsedApp();
    await deleteAllData();

    const id = await createTask({ date: DAY, name: 'First again', start_time: '08:00', duration_hours: 1, pillar: 'work' });
    expect(id).toBe(1);
    expect(await getTasksForDate(DAY)).toHaveLength(1); // no ghost repeat instances

    await changeTreats(30);
    expect(await purchaseItem('outfit_cozy_sweater', 25, 'Cozy Sweater')).toBe(true); // ownership was wiped
  });

  test('the schema is left intact (tables and indexes still exist)', async () => {
    await seedUsedApp();
    await deleteAllData();

    const objects = rawDb()
      .prepare(`SELECT name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'`)
      .all()
      .map((r: any) => r.name);
    for (const name of ALL_TABLES) expect(objects).toContain(name);
    expect(objects).toContain('idx_tasks_date');
  });

  test('is all-or-nothing: a failure part-way rolls everything back', async () => {
    await seedUsedApp();
    const before = await getAllTablesForExport();

    // Make the last statement of the wipe fail: a trigger that refuses the
    // re-insert of the settings row.
    rawDb().exec(`
      CREATE TRIGGER block_settings_insert BEFORE INSERT ON settings
      BEGIN SELECT RAISE(ABORT, 'simulated failure'); END;
    `);

    await expect(deleteAllData()).rejects.toThrow('simulated failure');

    rawDb().exec('DROP TRIGGER block_settings_insert');
    expect(await getAllTablesForExport()).toEqual(before); // nothing was lost
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Store: resetAllData returns the app to onboarding
// ─────────────────────────────────────────────────────────────────────────────
describe('useAppStore.resetAllData', () => {
  test('wipes the database and resets every piece of store state', async () => {
    await seedUsedApp();
    await useAppStore.getState().loadSettings();
    await useAppStore.getState().loadTodaysTasks(DAY);
    useAppStore.setState({
      pendingCelebration: true, milestoneStreak: 7, streakJustBroke: true,
      shieldConsumed: true, pendingBoxReward: { tier: 'gold', chest: 'gold', adherence: 90 },
    });
    expect(useAppStore.getState().isOnboarded).toBe(true);
    expect(useAppStore.getState().todaysTasks.length).toBeGreaterThan(0);

    await useAppStore.getState().resetAllData();

    const state = useAppStore.getState();
    expect(state.isOnboarded).toBe(false); // App.tsx shows onboarding on this flag
    expect(state.todaysTasks).toEqual([]);
    expect(state.pendingCelebration).toBe(false);
    expect(state.milestoneStreak).toBe(0);
    expect(state.streakJustBroke).toBe(false);
    expect(state.shieldConsumed).toBe(false);
    expect(state.pendingBoxReward).toBeNull();
    expect(state.settings).toMatchObject({
      companion_name: 'Nova', onboarded: false, treat_count: 0, current_streak: 0,
    });
    expect(count('tasks')).toBe(0);
    expect(count('journal_entries')).toBe(0);
  });

  test('after a wipe the streak clock restarts from today, like a first launch', async () => {
    await seedUsedApp();
    await useAppStore.getState().resetAllData();

    const s = await getSettings();
    expect(s?.app_start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(s?.last_active_date).toBe(s?.app_start_date);
    expect(s?.current_streak).toBe(0);
    expect(useAppStore.getState().settings?.last_active_date).toBe(s?.last_active_date);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// KNOWN BUG (docs/BUGS.md, B0) — reported, not fixed
// ─────────────────────────────────────────────────────────────────────────────
// `test.failing` means: this test is EXPECTED to fail today. Jest reports it as
// passing while the bug exists, and as failing the moment the bug is fixed, at
// which point change `test.failing` to `test`.
describe('known bug B0: upgrading a database that already has tasks', () => {
  test.failing('the Sprint 3 migration adds tasks.updated_at and tasks can still be created', async () => {
    // Build the April ("Phase 1.0") tasks table with one existing row.
    resetRealDb();
    rawDb().exec(`
      CREATE TABLE tasks (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        date           TEXT    NOT NULL,
        name           TEXT    NOT NULL,
        start_time     TEXT    NOT NULL DEFAULT '09:00',
        duration_hours REAL    NOT NULL DEFAULT 1.0,
        pillar         TEXT    NOT NULL DEFAULT 'work',
        completed      INTEGER NOT NULL DEFAULT 0,
        created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO tasks (date, name) VALUES ('2026-04-30', 'task from April');
    `);

    await initializeDatabase(); // run today's migrations over it

    const columns = rawDb().prepare(`PRAGMA table_info(tasks)`).all().map((c: any) => c.name);
    expect(columns).toContain('updated_at');
    await createTask({ date: DAY, name: 'new task', start_time: '09:00', duration_hours: 1, pillar: 'work' });
  });
});
