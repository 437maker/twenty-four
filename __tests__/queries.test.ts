// __tests__/queries.test.ts
//
// Tests for the shop purchase functions in app/db/queries.ts.
// These are the "money" code paths — if they regress, users get
// charged treats they didn't spend or items they didn't pay for.
//
// We mock expo-sqlite with an in-memory store that tracks:
//   - settings.treat_count
//   - settings.shields_owned
//   - owned_items rows
//   - treat_history rows
// and pattern-matches on SQL prefixes to dispatch.

import { purchaseItem, purchaseShield } from '../app/db/queries';

// ── In-memory mockState for the mock DB ───────────────────────────────────────────
interface MockState {
  treat_count: number;
  shields_owned: number;
  owned_items: { item_id: string }[];
  treat_history: { event_type: string; delta: number; note: string }[];
  // Capture every SQL call for assertions
  calls: { sql: string; params: any[] }[];
}

let mockState: MockState;

function resetState(initial: Partial<MockState> = {}): void {
  mockState = {
    treat_count: 100,
    shields_owned: 0,
    owned_items: [],
    treat_history: [],
    calls: [],
    ...initial,
  };
}

// ── Mock expo-sqlite ──────────────────────────────────────────────────────────
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(async () => ({
    execAsync: jest.fn(async (_sql: string) => {
      // Schema setup happens through here — no-op for tests
    }),

    getFirstAsync: jest.fn(async (sql: string, _params: any[] = []) => {
      mockState.calls.push({ sql, params: _params });
      // Simulate the few SELECT shapes the purchase code uses.
      if (sql.includes('SELECT treat_count FROM settings')) {
        return { treat_count: mockState.treat_count };
      }
      if (sql.includes('SELECT id FROM owned_items')) {
        const itemId = _params[0];
        const found = mockState.owned_items.find((i) => i.item_id === itemId);
        return found ? { id: 1 } : null;
      }
      return null;
    }),

    runAsync: jest.fn(async (sql: string, params: any[] = []) => {
      mockState.calls.push({ sql, params });

      // Shield purchase — single combined UPDATE
      if (
        sql.includes('UPDATE settings') &&
        sql.includes('treat_count = treat_count - ?') &&
        sql.includes('shields_owned = shields_owned + 1')
      ) {
        mockState.treat_count -= params[0];
        mockState.shields_owned += 1;
        return { changes: 1, lastInsertRowId: 0 };
      }

      // Plain treat deduction
      if (
        sql.includes('UPDATE settings') &&
        sql.includes('treat_count = treat_count - ?')
      ) {
        mockState.treat_count -= params[0];
        return { changes: 1, lastInsertRowId: 0 };
      }

      // Owned item insert
      if (sql.includes('INSERT OR IGNORE INTO owned_items')) {
        const itemId = params[0];
        if (!mockState.owned_items.find((i) => i.item_id === itemId)) {
          mockState.owned_items.push({ item_id: itemId });
        }
        return { changes: 1, lastInsertRowId: mockState.owned_items.length };
      }

      // Treat history insert
      if (sql.includes('INSERT INTO treat_history')) {
        mockState.treat_history.push({
          event_type: params[0],
          delta: params[1],
          note: params[2],
        });
        return { changes: 1, lastInsertRowId: mockState.treat_history.length };
      }

      return { changes: 0, lastInsertRowId: 0 };
    }),

    getAllAsync: jest.fn(async () => []),
  })),
}));

// ── Reset mockState before each test ──────────────────────────────────────────────
beforeEach(() => {
  resetState();
});

// ─────────────────────────────────────────────────────────────────────────────
// purchaseItem
// ─────────────────────────────────────────────────────────────────────────────
describe('purchaseItem', () => {
  test('successful purchase deducts treats, adds owned item, logs event', async () => {
    resetState({ treat_count: 100 });

    const ok = await purchaseItem('outfit_cozy_sweater', 25, 'Cozy Sweater');

    expect(ok).toBe(true);
    expect(mockState.treat_count).toBe(75);
    expect(mockState.owned_items).toEqual([{ item_id: 'outfit_cozy_sweater' }]);
    expect(mockState.treat_history).toEqual([
      { event_type: 'shop_purchase', delta: -25, note: 'Bought: Cozy Sweater' },
    ]);
  });

  test('returns false and changes nothing when treats are insufficient', async () => {
    resetState({ treat_count: 10 });

    const ok = await purchaseItem('outfit_cozy_sweater', 25, 'Cozy Sweater');

    expect(ok).toBe(false);
    expect(mockState.treat_count).toBe(10);
    expect(mockState.owned_items).toEqual([]);
    expect(mockState.treat_history).toEqual([]);
  });

  test('returns false when treats are exactly one less than price', async () => {
    resetState({ treat_count: 24 });

    const ok = await purchaseItem('outfit_cozy_sweater', 25, 'Cozy Sweater');

    expect(ok).toBe(false);
    expect(mockState.treat_count).toBe(24);
  });

  test('succeeds when treats exactly equal price (boundary)', async () => {
    resetState({ treat_count: 25 });

    const ok = await purchaseItem('outfit_cozy_sweater', 25, 'Cozy Sweater');

    expect(ok).toBe(true);
    expect(mockState.treat_count).toBe(0);
  });

  test('already-owned item: returns false and does not charge again', async () => {
    // First purchase succeeds.
    resetState({ treat_count: 100 });
    const first = await purchaseItem('outfit_cozy_sweater', 25, 'Cozy Sweater');
    expect(first).toBe(true);
    expect(mockState.treat_count).toBe(75);
    expect(mockState.owned_items).toHaveLength(1);

    // Second purchase of the SAME item must be rejected before any money moves.
    // (Before Phase 1 this charged a second 25 treats: the ownership check
    // lived only in the shop UI, not in the function that takes the money.)
    const second = await purchaseItem('outfit_cozy_sweater', 25, 'Cozy Sweater');
    expect(second).toBe(false);
    expect(mockState.treat_count).toBe(75);          // not charged again
    expect(mockState.owned_items).toHaveLength(1);   // still one row
    expect(mockState.treat_history).toHaveLength(1); // no second ledger entry
  });

  test('already-owned item is rejected even when the user can afford it twice', async () => {
    resetState({ treat_count: 500, owned_items: [{ item_id: 'house_tent' }] });

    const ok = await purchaseItem('house_tent', 40, 'Tent');

    expect(ok).toBe(false);
    expect(mockState.treat_count).toBe(500);
    expect(mockState.treat_history).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// purchaseShield
// ─────────────────────────────────────────────────────────────────────────────
describe('purchaseShield', () => {
  test('successful purchase deducts treats, increments shields, logs event', async () => {
    resetState({ treat_count: 100, shields_owned: 0 });

    const ok = await purchaseShield(50);

    expect(ok).toBe(true);
    expect(mockState.treat_count).toBe(50);
    expect(mockState.shields_owned).toBe(1);
    expect(mockState.treat_history).toEqual([
      { event_type: 'shop_purchase', delta: -50, note: 'Bought: Streak Shield' },
    ]);
  });

  test('shields stack — buying twice produces 2 shields', async () => {
    resetState({ treat_count: 200, shields_owned: 0 });

    await purchaseShield(50);
    await purchaseShield(50);

    expect(mockState.shields_owned).toBe(2);
    expect(mockState.treat_count).toBe(100);
    expect(mockState.treat_history).toHaveLength(2);
  });

  test('returns false and changes nothing when treats insufficient', async () => {
    resetState({ treat_count: 10, shields_owned: 3 });

    const ok = await purchaseShield(50);

    expect(ok).toBe(false);
    expect(mockState.treat_count).toBe(10);
    expect(mockState.shields_owned).toBe(3);
    expect(mockState.treat_history).toEqual([]);
  });

  test('boundary: treats exactly equal to price succeeds', async () => {
    resetState({ treat_count: 50 });

    const ok = await purchaseShield(50);

    expect(ok).toBe(true);
    expect(mockState.treat_count).toBe(0);
    expect(mockState.shields_owned).toBe(1);
  });
});
