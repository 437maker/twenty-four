// test-utils/realSqlite.ts
//
// A real SQLite engine for tests.
//
// The older tests fake expo-sqlite by pattern-matching SQL strings, so a typo
// in a query would still pass. This adapter runs the app's actual SQL against
// an in-memory SQLite database (Node's built-in `node:sqlite`, Node 22.5+),
// exposed through the same async methods expo-sqlite has. No extra dependency.
//
// Usage in a test file:
//   jest.mock('expo-sqlite', () => require('../test-utils/realSqlite').expoSqliteMock);
//   beforeEach(() => resetRealDb());

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DatabaseSync } = require('node:sqlite');

let current: any = new DatabaseSync(':memory:');

/** Throw away the database and start with an empty one. */
export function resetRealDb(): void {
  try { current.close(); } catch { /* already closed */ }
  current = new DatabaseSync(':memory:');
}

/** Direct access for test setup and assertions (synchronous). */
export function rawDb(): any {
  return current;
}

// expo-sqlite accepts params as one array or as separate arguments.
function normalize(params: any[]): any[] {
  const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
  return flat.map((p: any) => (p === undefined ? null : p));
}

// The handle delegates to `current` on every call, so the app's cached
// database object keeps working after resetRealDb().
const handle = {
  async execAsync(sql: string): Promise<void> {
    current.exec(sql);
  },
  async runAsync(sql: string, ...params: any[]) {
    const res = current.prepare(sql).run(...normalize(params));
    return { changes: Number(res.changes), lastInsertRowId: Number(res.lastInsertRowid) };
  },
  async getFirstAsync(sql: string, ...params: any[]) {
    const row = current.prepare(sql).get(...normalize(params));
    return row === undefined ? null : { ...row };
  },
  async getAllAsync(sql: string, ...params: any[]) {
    return current.prepare(sql).all(...normalize(params)).map((r: any) => ({ ...r }));
  },
  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    current.exec('BEGIN');
    try {
      await task();
      current.exec('COMMIT');
    } catch (err) {
      current.exec('ROLLBACK');
      throw err;
    }
  },
};

export const expoSqliteMock = {
  openDatabaseAsync: async () => handle,
};
