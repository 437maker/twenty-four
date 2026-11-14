// chests.test.tsx — the loot table, the chest economy, the database side
// (buying and opening, both atomic), the weekly box becoming a chest, and
// the opening animation.
//
// Database tests run the app's real schema and real queries against a real
// in-memory SQLite database (test-utils/realSqlite.ts).

jest.mock('expo-sqlite', () => require('../test-utils/realSqlite').expoSqliteMock);
jest.mock('expo-file-system', () => ({ File: jest.fn(), Paths: { cache: 'cache' } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('../app/services/calendarSync', () => ({
  runSync: jest.fn(),
  isSyncReady: jest.fn(async () => false),
}));

import React from 'react';
import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import * as Haptics from 'expo-haptics';

import { resetRealDb, rawDb } from '../test-utils/realSqlite';
import { initializeDatabase } from '../app/db/database';
import {
  ALL_TABLES, changeTreats, getAllTablesForExport, getChestCounts, getOwnedItems, getSettings, grantChest,
  openChest, purchaseChest, purchaseItem, saveSettings, deleteAllData,
} from '../app/db/queries';
import { SHOP_CATALOG, getCatalogItem } from '../app/data/shopCatalog';
import {
  CHESTS, CHEST_TIERS, DUPLICATE_REFUND, ITEM_VALUE, PITY_LIMIT, SHIELD_ID,
  averageBones, averageItemPrice, chestExpectedValue, chestForBoxTier, chestOdds, chestOddsLine,
  effectiveItemChance, isChestTier, maxItemTier, poolItems, rollChest, seededRng,
} from '../app/data/chestLoot';
import type { ChestRoll, ChestTier } from '../app/data/chestLoot';
import ChestOpenModal, { CHEST_OPEN_MS, ChestSvg } from '../app/components/chest/ChestOpenModal';
import { chestParts } from '../app/components/chest/chestArt';
import { useAppStore } from '../app/store/useAppStore';
import { weeklyBoxReward, weeklyBoxTier } from '../app/utils/calculations';
import { getTodayString, shiftDateString } from '../app/utils/dateHelpers';

const NOTHING_OWNED: ReadonlySet<string> = new Set();
const EVERYTHING_OWNED: ReadonlySet<string> = new Set(SHOP_CATALOG.map((i) => i.id));

// A random source that plays back a fixed list of numbers, then repeats the last.
function scripted(values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}
// Highest treats, and never an item (0.999 is above every item chance).
const NO_ITEM = () => 0.999;
// Lowest treats, an item, the first slice of the pool, its first item.
const FIRST_ITEM = () => 0;

function count(table: string): number {
  return Number(rawDb().prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n);
}
async function freshDb(): Promise<void> {
  resetRealDb();
  await initializeDatabase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Loot table
// ─────────────────────────────────────────────────────────────────────────────
describe('loot table', () => {
  test('there are three chests: Wooden, Silver, Gold, cheapest first', () => {
    expect([...CHEST_TIERS]).toEqual(['wooden', 'silver', 'gold']);
    expect(CHESTS.wooden.price).toBeLessThan(CHESTS.silver.price);
    expect(CHESTS.silver.price).toBeLessThan(CHESTS.gold.price);
    expect(isChestTier('gold')).toBe(true);
    expect(isChestTier('diamond')).toBe(false);
    expect(isChestTier(null)).toBe(false);
  });

  test.each(CHEST_TIERS.map((t) => [t]))('%s: the pool weights add up to 1 and every slice has items', (tier) => {
    const def = CHESTS[tier];
    expect(def.pool.reduce((s, e) => s + e.weight, 0)).toBeCloseTo(1, 10);
    for (const entry of def.pool) {
      expect(entry.weight).toBeGreaterThan(0);
      expect(poolItems(tier, entry.group).length).toBeGreaterThan(0);
    }
    expect(def.itemChance).toBeGreaterThan(0);
    expect(def.itemChance).toBeLessThan(1);
    expect(def.bones[0]).toBeGreaterThan(0);
    expect(def.bones[1]).toBeGreaterThan(def.bones[0]);
  });

  test('tier limits: Wooden gives tiers 1–2, Silver up to 3, Gold up to 5', () => {
    expect(maxItemTier('wooden')).toBe(2);
    expect(maxItemTier('silver')).toBe(3);
    expect(maxItemTier('gold')).toBe(5);
  });

  test('tier 5 from a Gold chest is rare: 3% of chests', () => {
    const odds = chestOdds('gold');
    expect(odds.rareTier).toBe(5);
    expect(odds.rarePct).toBe(3);
  });

  test('houses can drop from Silver and Gold chests, never from Wooden', () => {
    const hasHouse = (tier: ChestTier) =>
      CHESTS[tier].pool.some((e) => poolItems(tier, e.group).some((i) => i.category === 'house'));
    expect(hasHouse('wooden')).toBe(false);
    expect(hasHouse('silver')).toBe(true);
    expect(hasHouse('gold')).toBe(true);
  });

  test('the Streak Shield can drop from any chest', () => {
    for (const tier of CHEST_TIERS) {
      expect(CHESTS[tier].pool.some((e) => e.group === 'shield')).toBe(true);
      expect(poolItems(tier, 'shield').map((i) => i.id)).toEqual([SHIELD_ID]);
    }
  });

  test.each(CHEST_TIERS.map((t) => [t]))('%s: 3,000 seeded rolls only ever return valid ids inside the tier limit', (tier) => {
    const rng = seededRng(24);
    const def = CHESTS[tier];
    let pity = 0;
    let items = 0;
    const seenGroups = new Set<string>();
    for (let i = 0; i < 3000; i++) {
      const roll = rollChest(tier, { owned: NOTHING_OWNED, pity }, rng);
      pity = roll.pityAfter;
      expect(roll.tier).toBe(tier);
      expect(Number.isInteger(roll.bones)).toBe(true);
      expect(roll.bones).toBeGreaterThanOrEqual(def.bones[0]);
      expect(roll.bones).toBeLessThanOrEqual(def.bones[1]);
      expect(pity).toBeLessThanOrEqual(PITY_LIMIT);
      if (!roll.item) {
        expect(roll.totalBones).toBe(roll.bones);
        continue;
      }
      items += 1;
      const item = getCatalogItem(roll.item.id);
      expect(item).toBeDefined();
      if (item!.id === SHIELD_ID) {
        seenGroups.add('shield');
      } else {
        expect(['outfit', 'accessory', 'house']).toContain(item!.category);
        expect(item!.tier).toBeLessThanOrEqual(maxItemTier(tier));
        if (tier === 'wooden') expect(item!.category).not.toBe('house');
        seenGroups.add(String(item!.tier));
      }
      expect(roll.item.duplicate).toBe(false);
      expect(roll.item.refund).toBe(0);
    }
    // Every slice of the pool turned up at least once, and items arrived
    // about as often as the odds (with pity) say.
    expect(seenGroups.size).toBe(def.pool.length);
    expect(items / 3000).toBeGreaterThan(effectiveItemChance(tier) - 0.04);
    expect(items / 3000).toBeLessThan(effectiveItemChance(tier) + 0.04);
  });

  test('the same seed gives the same chests', () => {
    const open = (seed: number) => {
      const rng = seededRng(seed);
      return Array.from({ length: 25 }, () => rollChest('gold', { owned: NOTHING_OWNED, pity: 0 }, rng));
    };
    expect(open(7)).toEqual(open(7));
    expect(open(7)).not.toEqual(open(8));
  });

  test('a duplicate turns into treats worth half the item price', () => {
    const roll = rollChest('wooden', { owned: EVERYTHING_OWNED, pity: 0 }, FIRST_ITEM);
    const first = poolItems('wooden', CHESTS.wooden.pool[0].group)[0];
    expect(roll.item).toMatchObject({ id: first.id, duplicate: true, refund: Math.round(first.price * DUPLICATE_REFUND) });
    expect(roll.bones).toBe(CHESTS.wooden.bones[0]);
    expect(roll.totalBones).toBe(roll.bones + Math.round(first.price * 0.5));
  });

  test('a Streak Shield is never a duplicate (shields stack)', () => {
    // 0.99 picks the last slice of the pool, which is the shield in every chest.
    const rng = scripted([0, 0, 0.99, 0]);
    const roll = rollChest('silver', { owned: EVERYTHING_OWNED, pity: 0 }, rng);
    expect(roll.item).toMatchObject({ id: SHIELD_ID, duplicate: false, refund: 0 });
  });

  test('pity: after 4 chests in a row with no item, the 5th always has one', () => {
    let pity = 0;
    for (let i = 1; i <= PITY_LIMIT; i++) {
      const roll = rollChest('wooden', { owned: NOTHING_OWNED, pity }, NO_ITEM);
      expect(roll.item).toBeNull();
      expect(roll.pityUsed).toBe(false);
      pity = roll.pityAfter;
      expect(pity).toBe(i);
    }
    const fifth = rollChest('wooden', { owned: NOTHING_OWNED, pity }, NO_ITEM);
    expect(fifth.item).not.toBeNull();
    expect(fifth.pityUsed).toBe(true);
    expect(fifth.pityAfter).toBe(0);
  });

  test('getting an item by luck resets the pity count', () => {
    const roll = rollChest('gold', { owned: NOTHING_OWNED, pity: 3 }, FIRST_ITEM);
    expect(roll.item).not.toBeNull();
    expect(roll.pityUsed).toBe(false);
    expect(roll.pityAfter).toBe(0);
  });

  test('the odds shown on the card are the odds in the table', () => {
    for (const tier of CHEST_TIERS) {
      const odds = chestOdds(tier);
      expect(odds.itemPct).toBeCloseTo(CHESTS[tier].itemChance * 100, 5);
      expect(odds.rows.reduce((s, r) => s + r.pct, 0)).toBeCloseTo(odds.itemPct, 5);
      expect(odds.bones).toEqual(CHESTS[tier].bones);
    }
    expect(chestOddsLine('gold')).toBe('Item chance 60%. Tier 5 item 3%. An item is guaranteed after 4 chests without one.');
    expect(chestOddsLine('wooden')).toMatch(/^Item chance 25%\. Tier 2 item 7\.5%\./);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Economy
// ─────────────────────────────────────────────────────────────────────────────
describe('chest economy', () => {
  test('weekly box → chest: Basic → Wooden, Silver → Silver, Gold → Gold', () => {
    expect(chestForBoxTier('basic')).toBe('wooden');
    expect(chestForBoxTier('silver')).toBe('silver');
    expect(chestForBoxTier('gold')).toBe('gold');
    // The adherence rules did not change.
    expect(chestForBoxTier(weeklyBoxTier(59))).toBe('wooden');
    expect(chestForBoxTier(weeklyBoxTier(60))).toBe('silver');
    expect(chestForBoxTier(weeklyBoxTier(80))).toBe('gold');
  });

  test('the treats in an earned chest average what the old weekly box paid', () => {
    expect(averageBones('wooden')).toBe(weeklyBoxReward('basic'));
    expect(averageBones('silver')).toBe(weeklyBoxReward('silver'));
    expect(averageBones('gold')).toBe(weeklyBoxReward('gold'));
  });

  // The rule from the spec: a bought chest is a currency sink. Its expected
  // value in treats, with an item counted at 50% of its shop price, must be
  // 70% to 90% of what the chest costs.
  //
  //   value = average treats inside
  //         + (long-run item chance, pity included) × (average item price) × 50%
  //
  // A duplicate pays that same 50% in treats, so the value does not depend
  // on what the user already owns.
  test.each(CHEST_TIERS.map((t) => [t]))('%s: expected value is 70–90%% of the price', (tier) => {
    const def = CHESTS[tier];
    const p = def.itemChance;
    const longRunItemChance = p / (1 - Math.pow(1 - p, PITY_LIMIT + 1));
    const avgTreats = (def.bones[0] + def.bones[1]) / 2;
    const avgItemPrice = def.pool.reduce((sum, e) => {
      const items = poolItems(tier, e.group);
      return sum + e.weight * (items.reduce((s, i) => s + i.price, 0) / items.length);
    }, 0);
    const value = avgTreats + longRunItemChance * avgItemPrice * 0.5;

    // The helpers the app exports agree with this arithmetic.
    expect(ITEM_VALUE).toBe(0.5);
    expect(effectiveItemChance(tier)).toBeCloseTo(longRunItemChance, 10);
    expect(averageItemPrice(tier)).toBeCloseTo(avgItemPrice, 10);
    expect(chestExpectedValue(tier)).toBeCloseTo(value, 10);

    const share = value / def.price;
    expect(share).toBeGreaterThanOrEqual(0.7);
    expect(share).toBeLessThanOrEqual(0.9);
  });

  test.each(CHEST_TIERS.map((t) => [t]))('%s: 40,000 simulated chests land on the same value', (tier) => {
    const rng = seededRng(2026);
    let pity = 0;
    let total = 0;
    const N = 40_000;
    for (let i = 0; i < N; i++) {
      // Owning everything makes every item a duplicate, paid at 50%: the
      // same number the formula uses for an item's worth.
      const roll = rollChest(tier, { owned: EVERYTHING_OWNED, pity }, rng);
      pity = roll.pityAfter;
      total += roll.bones;
      if (roll.item) total += roll.item.id === SHIELD_ID ? getCatalogItem(SHIELD_ID)!.price * 0.5 : roll.item.refund;
    }
    const simulated = total / N;
    expect(Math.abs(simulated - chestExpectedValue(tier)) / chestExpectedValue(tier)).toBeLessThan(0.03);
    expect(simulated / CHESTS[tier].price).toBeGreaterThanOrEqual(0.7);
    expect(simulated / CHESTS[tier].price).toBeLessThanOrEqual(0.9);
  });

  test('a better chest is worth more', () => {
    expect(chestExpectedValue('wooden')).toBeLessThan(chestExpectedValue('silver'));
    expect(chestExpectedValue('silver')).toBeLessThan(chestExpectedValue('gold'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Migration
// ─────────────────────────────────────────────────────────────────────────────
describe('chest migration', () => {
  test('a fresh install has no chests and a pity count of 0', async () => {
    await freshDb();
    const s = await getSettings();
    expect(s).toMatchObject({ chests_wooden: 0, chests_silver: 0, chests_gold: 0, chest_pity: 0 });
    expect(await getChestCounts()).toEqual({ wooden: 0, silver: 0, gold: 0 });
    expect(count('chest_openings')).toBe(0);
    expect(ALL_TABLES).toContain('chest_openings');
  });

  test('a database that already has rows gets the columns and keeps its data', async () => {
    // The tables as they were in the first release, each with rows in it.
    resetRealDb();
    rawDb().exec(`
      CREATE TABLE settings (
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
      INSERT INTO settings (id, companion_name, current_streak, onboarded) VALUES (1, 'Rex', 12, 1);
      CREATE TABLE owned_items (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id      TEXT    NOT NULL UNIQUE,
        purchased_at TEXT    NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO owned_items (item_id) VALUES ('acc_party_hat');
    `);

    await initializeDatabase(); // today's migrations, over existing rows

    const columns = rawDb().prepare('PRAGMA table_info(settings)').all().map((c: any) => c.name);
    expect(columns).toEqual(expect.arrayContaining(['chests_wooden', 'chests_silver', 'chests_gold', 'chest_pity']));

    const s = await getSettings();
    expect(s?.companion_name).toBe('Rex');   // old data untouched
    expect(s?.current_streak).toBe(12);
    expect(s).toMatchObject({ chests_wooden: 0, chests_silver: 0, chests_gold: 0, chest_pity: 0 });
    expect(await getOwnedItems()).toHaveLength(1);

    // And the new feature works on the upgraded database.
    await grantChest('wooden');
    const roll = await openChest('wooden', FIRST_ITEM);
    expect(roll).not.toBeNull();
    expect((await getSettings())?.chests_wooden).toBe(0);
  });

  test('running the migration again keeps chests and the pity count', async () => {
    await freshDb();
    await grantChest('gold');
    await grantChest('gold');
    await saveSettings({ chest_pity: 3 });
    await initializeDatabase();
    await initializeDatabase();
    expect(await getSettings()).toMatchObject({ chests_gold: 2, chest_pity: 3 });
  });

  test('a damaged (negative) count is repaired on the next start', async () => {
    await freshDb();
    rawDb().exec(`UPDATE settings SET chests_silver = -2, chest_pity = -1 WHERE id = 1`);
    await initializeDatabase();
    expect(await getSettings()).toMatchObject({ chests_silver: 0, chest_pity: 0 });
  });

  test('export includes the openings, and "delete all my data" removes chests', async () => {
    await freshDb();
    await grantChest('silver');
    await grantChest('wooden');
    await openChest('silver', FIRST_ITEM);
    const tables = await getAllTablesForExport();
    expect(tables.chest_openings).toHaveLength(1);
    await deleteAllData();
    expect(count('chest_openings')).toBe(0);
    expect(await getChestCounts()).toEqual({ wooden: 0, silver: 0, gold: 0 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Buying
// ─────────────────────────────────────────────────────────────────────────────
describe('buying a chest', () => {
  beforeEach(freshDb);

  test('takes the price, adds one unopened chest, and writes the ledger', async () => {
    await changeTreats(100);
    expect(await purchaseChest('silver')).toBe(true);
    const s = await getSettings();
    expect(s?.treat_count).toBe(100 - CHESTS.silver.price);
    expect(s?.chests_silver).toBe(1);
    const ledger = rawDb().prepare('SELECT event_type, delta, note FROM treat_history').all();
    expect(ledger).toEqual([expect.objectContaining({ event_type: 'chest_purchase', delta: -CHESTS.silver.price, note: 'Bought: Silver Chest' })]);
  });

  test('chests stack', async () => {
    await changeTreats(CHESTS.wooden.price * 3);
    for (let i = 0; i < 3; i++) expect(await purchaseChest('wooden')).toBe(true);
    expect(await getSettings()).toMatchObject({ chests_wooden: 3, treat_count: 0 });
  });

  test('not enough treats: nothing is charged and nothing is granted', async () => {
    await changeTreats(CHESTS.gold.price - 1);
    expect(await purchaseChest('gold')).toBe(false);
    expect(await getSettings()).toMatchObject({ chests_gold: 0, treat_count: CHESTS.gold.price - 1 });
    expect(count('treat_history')).toBe(0);
  });

  test('an unknown tier is refused', async () => {
    await changeTreats(500);
    expect(await purchaseChest('diamond' as ChestTier)).toBe(false);
    expect((await getSettings())?.treat_count).toBe(500);
  });

  test('atomic: a failure half-way leaves no charge and no chest', async () => {
    await changeTreats(100);
    rawDb().exec(`
      CREATE TRIGGER forced_failure BEFORE INSERT ON treat_history
      BEGIN SELECT RAISE(ABORT, 'forced failure'); END;
    `);
    await expect(purchaseChest('wooden')).rejects.toThrow();
    expect(await getSettings()).toMatchObject({ chests_wooden: 0, treat_count: 100 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Opening
// ─────────────────────────────────────────────────────────────────────────────
describe('opening a chest', () => {
  beforeEach(freshDb);

  test('no chest of that tier: returns null and changes nothing', async () => {
    await grantChest('wooden');
    expect(await openChest('gold', FIRST_ITEM)).toBeNull();
    expect(await getSettings()).toMatchObject({ chests_wooden: 1, treat_count: 0 });
    expect(count('chest_openings')).toBe(0);
  });

  test('removes the chest, pays the treats, grants the item, and records the opening', async () => {
    await grantChest('wooden');
    const roll = (await openChest('wooden', FIRST_ITEM))!;
    const first = poolItems('wooden', CHESTS.wooden.pool[0].group)[0];
    expect(roll.item).toMatchObject({ id: first.id, duplicate: false });

    const s = await getSettings();
    expect(s?.chests_wooden).toBe(0);
    expect(s?.treat_count).toBe(roll.bones);
    expect(s?.chest_pity).toBe(0);
    expect((await getOwnedItems()).map((o) => o.item_id)).toEqual([first.id]);

    const opening = rawDb().prepare('SELECT * FROM chest_openings').all();
    expect(opening).toEqual([expect.objectContaining({ tier: 'wooden', bones: roll.bones, item_id: first.id, duplicate: 0, refund: 0, pity_used: 0 })]);
    const ledger = rawDb().prepare('SELECT event_type, delta, note FROM treat_history').all();
    expect(ledger).toEqual([expect.objectContaining({ event_type: 'chest_open', delta: roll.bones, note: `Opened: Wooden Chest + ${first.name}` })]);
  });

  test('a chest with no item pays treats only and raises the pity count', async () => {
    await grantChest('silver');
    const roll = (await openChest('silver', NO_ITEM))!;
    expect(roll.item).toBeNull();
    expect(roll.bones).toBe(CHESTS.silver.bones[1]);
    expect(await getSettings()).toMatchObject({ chests_silver: 0, treat_count: roll.bones, chest_pity: 1 });
    expect(await getOwnedItems()).toHaveLength(0);
    expect(rawDb().prepare('SELECT item_id FROM chest_openings').get().item_id).toBeNull();
  });

  test('a duplicate pays half the item price in treats and does not add a second copy', async () => {
    const first = poolItems('wooden', CHESTS.wooden.pool[0].group)[0];
    await changeTreats(first.price);
    expect(await purchaseItem(first.id, first.price, first.name)).toBe(true);
    await grantChest('wooden');

    const roll = (await openChest('wooden', FIRST_ITEM))!;
    expect(roll.item).toMatchObject({ id: first.id, duplicate: true, refund: Math.round(first.price * 0.5) });
    expect((await getSettings())?.treat_count).toBe(roll.bones + Math.round(first.price * 0.5));
    expect(await getOwnedItems()).toHaveLength(1);
    expect(rawDb().prepare('SELECT duplicate, refund FROM chest_openings').get()).toMatchObject({ duplicate: 1, refund: Math.round(first.price * 0.5) });
  });

  test('a Streak Shield from a chest goes into the shield stock', async () => {
    await grantChest('gold');
    const roll = (await openChest('gold', scripted([0, 0, 0.99, 0])))!;
    expect(roll.item?.id).toBe(SHIELD_ID);
    expect(await getSettings()).toMatchObject({ shields_owned: 1, chests_gold: 0 });
    expect(await getOwnedItems()).toHaveLength(0); // shields are a count, not an owned item
  });

  test('a house from a chest is owned and can be shown in the yard', async () => {
    await grantChest('silver');
    // Roll until the seeded source gives a house (bounded, so a bad table fails instead of hanging).
    const rng = seededRng(5);
    let got: ChestRoll | null = null;
    for (let i = 0; i < 400 && !(got?.item?.category === 'house'); i++) {
      got = await openChest('silver', rng);
      await grantChest('silver');
    }
    expect(got?.item?.category).toBe('house');
    expect((await getOwnedItems()).map((o) => o.item_id)).toContain(got!.item!.id);
  });

  test('pity through the database: four empty chests, then the fifth has an item', async () => {
    for (let i = 0; i < 5; i++) await grantChest('wooden');
    for (let i = 1; i <= PITY_LIMIT; i++) {
      const roll = (await openChest('wooden', NO_ITEM))!;
      expect(roll.item).toBeNull();
      expect((await getSettings())?.chest_pity).toBe(i);
    }
    const fifth = (await openChest('wooden', NO_ITEM))!;
    expect(fifth.item).not.toBeNull();
    expect(fifth.pityUsed).toBe(true);
    expect(await getSettings()).toMatchObject({ chest_pity: 0, chests_wooden: 0 });
    expect(rawDb().prepare('SELECT pity_used FROM chest_openings ORDER BY id DESC').get().pity_used).toBe(1);
  });

  test('the pity count is shared across chest tiers', async () => {
    await grantChest('wooden');
    await grantChest('silver');
    await openChest('wooden', NO_ITEM);
    await openChest('silver', NO_ITEM);
    expect((await getSettings())?.chest_pity).toBe(2);
  });

  test('a seeded random source gives the same chest on the same database', async () => {
    const run = async () => {
      await freshDb();
      for (let i = 0; i < 6; i++) await grantChest('gold');
      const rng = seededRng(99);
      const out: (ChestRoll | null)[] = [];
      for (let i = 0; i < 6; i++) out.push(await openChest('gold', rng));
      return out;
    };
    expect(await run()).toEqual(await run());
  });

  // The important one: opening is ONE transaction.
  test.each([
    ['recording the opening', 'chest_openings'],
    ['writing the ledger', 'treat_history'],
    ['granting the item', 'owned_items'],
  ])('atomic: a failure while %s leaves no partial grant', async (_what, table) => {
    await grantChest('wooden');
    await changeTreats(10);
    await saveSettings({ chest_pity: 2 });
    rawDb().exec(`
      CREATE TRIGGER forced_failure BEFORE INSERT ON ${table}
      BEGIN SELECT RAISE(ABORT, 'forced failure'); END;
    `);

    await expect(openChest('wooden', FIRST_ITEM)).rejects.toThrow();

    // Everything is exactly as it was: the chest is still there to open.
    expect(await getSettings()).toMatchObject({ chests_wooden: 1, treat_count: 10, chest_pity: 2, shields_owned: 0 });
    expect(await getOwnedItems()).toHaveLength(0);
    expect(count('chest_openings')).toBe(0);
    expect(count('treat_history')).toBe(0);

    // With the fault removed, the same chest opens normally.
    rawDb().exec('DROP TRIGGER forced_failure');
    expect(await openChest('wooden', FIRST_ITEM)).not.toBeNull();
    expect((await getSettings())?.chests_wooden).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The weekly box is a chest (real database, real store)
// ─────────────────────────────────────────────────────────────────────────────
describe('weekly box → chest, end to end', () => {
  beforeEach(async () => {
    await freshDb();
    useAppStore.setState({
      settings: null, isOnboarded: false, todaysTasks: [],
      pendingCelebration: false, milestoneStreak: 0, streakJustBroke: false,
      pendingBoxReward: null, shieldConsumed: false, isSyncing: false,
    });
  });

  test('a week with nothing completed earns a Wooden Chest, unopened, and no treats yet', async () => {
    const today = getTodayString();
    await saveSettings({ onboarded: true, app_start_date: shiftDateString(today, -14), last_active_date: today });
    await useAppStore.getState().loadSettings();

    await useAppStore.getState().checkStreakOnOpen();

    const s = await getSettings();
    expect(s).toMatchObject({ chests_wooden: 1, chests_silver: 0, chests_gold: 0, treat_count: 0, last_box_date: today });
    expect(useAppStore.getState().pendingBoxReward).toEqual({ tier: 'basic', chest: 'wooden', adherence: 0 });
    expect(useAppStore.getState().settings?.chests_wooden).toBe(1);

    // Opening it is what pays the treats.
    const roll = (await openChest('wooden', NO_ITEM))!;
    await useAppStore.getState().refreshTreatCount();
    expect(useAppStore.getState().settings).toMatchObject({ chests_wooden: 0, treat_count: roll.bones, chest_pity: 1 });
  });

  test('no second chest inside the same 7 days', async () => {
    const today = getTodayString();
    await saveSettings({ onboarded: true, app_start_date: shiftDateString(today, -14), last_active_date: today });
    await useAppStore.getState().checkStreakOnOpen();
    await useAppStore.getState().checkStreakOnOpen();
    expect((await getSettings())?.chests_wooden).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The opening animation
// ─────────────────────────────────────────────────────────────────────────────
describe('<ChestOpenModal>', () => {
  const impact = Haptics.impactAsync as unknown as jest.Mock;
  let tree: ReactTestRenderer | null = null;

  const rollOf = (tier: ChestTier, over: Partial<ChestRoll> = {}): ChestRoll => ({
    tier, bones: 7, item: null, totalBones: 7, pityUsed: false, pityAfter: 1, ...over,
  });
  async function show(props: Partial<React.ComponentProps<typeof ChestOpenModal>> & { tier: ChestTier | null }) {
    const onClose = jest.fn();
    await act(async () => {
      tree = create(<ChestOpenModal reduceMotion={false} breed="maltese" equipped={{}} onClose={onClose} {...props} />);
    });
    return onClose;
  }
  const has = (testID: string) => tree!.root.findAll((n) => n.props.testID === testID).length > 0;
  const text = () => {
    const out: string[] = [];
    tree!.root.findAll((n) => (n.type as unknown) === 'Text').forEach((n) => {
      const flat = (c: any): string => (Array.isArray(c) ? c.map(flat).join('') : c == null || typeof c === 'object' ? '' : String(c));
      out.push(flat(n.props.children));
    });
    return out.join(' | ');
  };
  const wait = (ms: number) => act(() => {
    jest.advanceTimersByTime(ms);
  });

  beforeEach(() => {
    jest.useFakeTimers();
    impact.mockClear();
  });
  afterEach(() => {
    if (tree) {
      act(() => tree!.unmount());
      tree = null;
    }
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('closed (no tier): renders nothing and opens nothing', async () => {
    const open = jest.fn();
    await show({ tier: null, open });
    expect(tree!.toJSON()).toBeNull();
    expect(open).not.toHaveBeenCalled();
  });

  test('the chest is opened in the database first; the reward shows after the animation; a haptic fires', async () => {
    const roll = rollOf('wooden');
    const open = jest.fn(async () => roll);
    const onClose = await show({ tier: 'wooden', open });

    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith('wooden');
    expect(has('chest-reward')).toBe(false); // still shaking
    expect(impact).not.toHaveBeenCalled();

    wait(CHEST_OPEN_MS * 0.6);
    expect(impact).toHaveBeenCalledTimes(1); // the lid popped
    expect(has('chest-reward')).toBe(false);

    wait(CHEST_OPEN_MS);
    expect(has('chest-reward')).toBe(true);
    expect(text()).toContain('+7 treats');
    expect(text()).toContain('No item this time.');

    act(() => {
      tree!.root.findAll((n) => n.props.testID === 'chest-collect' && typeof n.props.onPress === 'function')[0].props.onPress();
    });
    expect(onClose).toHaveBeenCalledWith(roll);
  });

  test('Reduce Motion: the reward card is shown directly', async () => {
    const open = jest.fn(async () => rollOf('silver', { bones: 12, totalBones: 12 }));
    await show({ tier: 'silver', open, reduceMotion: true });
    expect(has('chest-reward')).toBe(true); // no timers were advanced
    expect(text()).toContain('+12 treats');
    expect(impact).toHaveBeenCalledTimes(1);
  });

  test('an item, a duplicate, and a shield are each described', async () => {
    const sweater = getCatalogItem('outfit_cozy_sweater')!;
    const item = { id: sweater.id, name: sweater.name, tier: 1, category: sweater.category, duplicate: false, refund: 0 };
    await show({ tier: 'gold', reduceMotion: true, open: async () => rollOf('gold', { item, pityUsed: true }) });
    expect(text()).toContain('Cozy Sweater');
    expect(text()).toContain('New!');
    expect(text()).toContain('Guaranteed');
    act(() => tree!.unmount());

    await show({ tier: 'gold', reduceMotion: true, open: async () => rollOf('gold', { item: { ...item, duplicate: true, refund: 13 }, totalBones: 20 }) });
    expect(has('chest-reward-duplicate')).toBe(true);
    expect(text()).toContain('+13 treats');
    act(() => tree!.unmount());

    const house = getCatalogItem('house_cozy_den')!;
    await show({ tier: 'silver', reduceMotion: true, open: async () => rollOf('silver', { item: { id: house.id, name: house.name, tier: 1, category: 'house', duplicate: false, refund: 0 } }) });
    expect(has('house-still-house_cozy_den')).toBe(true);
    act(() => tree!.unmount());

    await show({ tier: 'wooden', reduceMotion: true, open: async () => rollOf('wooden', { item: { id: SHIELD_ID, name: 'Streak Shield', tier: 1, category: 'shield', duplicate: false, refund: 0 } }) });
    expect(text()).toContain('One more Streak Shield');
  });

  test('a Gold chest gets a sparkle burst; the others do not', async () => {
    const svgCount = () => tree!.root.findAllByType('RNSVGSvgView' as any).length;
    await show({ tier: 'silver', open: async () => rollOf('silver') });
    const plain = svgCount();
    act(() => tree!.unmount());
    await show({ tier: 'gold', open: async () => rollOf('gold') });
    expect(svgCount()).toBe(plain + 8);
  });

  test('nothing to open: says so, with a Close button', async () => {
    const onClose = await show({ tier: 'gold', open: async () => null });
    expect(has('chest-none')).toBe(true);
    expect(has('chest-reward')).toBe(false);
    act(() => {
      tree!.root.findAll((n) => n.props.testID === 'chest-collect' && typeof n.props.onPress === 'function')[0].props.onPress();
    });
    expect(onClose).toHaveBeenCalledWith(null);
  });

  test('a database error is shown as "nothing to open", not a crash', async () => {
    await show({ tier: 'gold', open: async () => { throw new Error('boom'); } });
    expect(has('chest-none')).toBe(true);
  });

  test('the still chest picture renders for every tier, and each tier is drawn', async () => {
    for (const tier of CHEST_TIERS) {
      const parts = chestParts(tier);
      expect(parts.body.length).toBeGreaterThan(0);
      expect(parts.lid.length).toBeGreaterThan(0);
      expect(parts.inside.length).toBeGreaterThan(0);
      await act(async () => {
        tree = create(<ChestSvg tier={tier} size={84} />);
      });
      expect(tree!.toJSON()).not.toBeNull();
      act(() => tree!.unmount());
      tree = null;
    }
  });
});
