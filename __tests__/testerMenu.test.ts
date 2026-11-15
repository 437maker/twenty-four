// __tests__/testerMenu.test.ts
//
// Verifies the three tester-menu actions use the correct atomic DB functions
// and that the store's resetRestState increments restResetToken.
//
// REMOVE THIS FILE BEFORE APP STORE RELEASE (see docs/DECISIONS.md D69).

jest.mock('expo-sqlite', () => require('../test-utils/realSqlite').expoSqliteMock);

jest.mock('expo-file-system', () => ({ File: jest.fn(), Paths: { cache: 'cache' } }));
jest.mock('expo-sharing',     () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('../app/services/calendarSync', () => ({
  runSync: jest.fn(),
  isSyncReady: jest.fn(async () => false),
}));

import { resetRealDb } from '../test-utils/realSqlite';
import { initializeDatabase } from '../app/db/database';
import { changeTreats, grantChest, getSettings } from '../app/db/queries';
import { useAppStore } from '../app/store/useAppStore';

beforeEach(async () => {
  resetRealDb();
  await initializeDatabase();
});

describe('tester menu — +500 bones', () => {
  it('adds 500 to treat_count', async () => {
    const before = (await getSettings())?.treat_count ?? 0;
    await changeTreats(500);
    const after = (await getSettings())?.treat_count ?? 0;
    expect(after).toBe(before + 500);
  });

  it('never goes below 0 when subtracting more than available', async () => {
    await changeTreats(-9999);
    const s = await getSettings();
    expect(s?.treat_count).toBe(0);
  });
});

describe('tester menu — +1 of each chest tier', () => {
  it('grants one wooden chest', async () => {
    const before = (await getSettings())?.chests_wooden ?? 0;
    await grantChest('wooden');
    const after = (await getSettings())?.chests_wooden ?? 0;
    expect(after).toBe(before + 1);
  });

  it('grants one silver chest', async () => {
    const before = (await getSettings())?.chests_silver ?? 0;
    await grantChest('silver');
    const after = (await getSettings())?.chests_silver ?? 0;
    expect(after).toBe(before + 1);
  });

  it('grants one gold chest', async () => {
    const before = (await getSettings())?.chests_gold ?? 0;
    await grantChest('gold');
    const after = (await getSettings())?.chests_gold ?? 0;
    expect(after).toBe(before + 1);
  });

  it('grants all three tiers independently', async () => {
    await grantChest('wooden');
    await grantChest('silver');
    await grantChest('gold');
    const s = await getSettings();
    expect(s?.chests_wooden).toBe(1);
    expect(s?.chests_silver).toBe(1);
    expect(s?.chests_gold).toBe(1);
  });
});

describe('tester menu — reset rest state', () => {
  it('increments restResetToken in the store', () => {
    const before = useAppStore.getState().restResetToken;
    useAppStore.getState().resetRestState();
    expect(useAppStore.getState().restResetToken).toBe(before + 1);
  });

  it('increments again on each call', () => {
    useAppStore.getState().resetRestState();
    useAppStore.getState().resetRestState();
    expect(useAppStore.getState().restResetToken).toBeGreaterThanOrEqual(2);
  });
});
