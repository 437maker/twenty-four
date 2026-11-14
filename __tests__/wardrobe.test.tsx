// wardrobe.test.tsx — wearable items, the equip system, renaming, breeds,
// the shown house, and the database migration behind them.
//
// Database tests run the app's real schema and real queries against a real
// in-memory SQLite database (test-utils/realSqlite.ts).

jest.mock('expo-sqlite', () => require('../test-utils/realSqlite').expoSqliteMock);
jest.mock('expo-file-system', () => ({ File: jest.fn(), Paths: { cache: 'cache' } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
// HomeScreen is imported only for its pure helper; its Settings screen pulls in
// phone-only modules (notifications), so it is replaced with an empty one.
jest.mock('../app/screens/SettingsScreen', () => () => null);
jest.mock('../app/services/calendarSync', () => ({
  runSync: jest.fn(),
  isSyncReady: jest.fn(async () => false),
}));
// Keep the real Reanimated, but wrap withRepeat so a test can ask
// "did any endless loop start?".
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return { __esModule: true, ...actual, default: actual.default, withRepeat: jest.fn(actual.withRepeat) };
});

import React from 'react';
import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import * as Reanimated from 'react-native-reanimated';

import { resetRealDb, rawDb } from '../test-utils/realSqlite';
import { initializeDatabase } from '../app/db/database';
import {
  changeTreats,
  deleteAllData,
  equipItem,
  getEquipped,
  getSettings,
  purchaseItem,
  renameCompanion,
  setBreed,
  setShownHouse,
  unequipSlot,
} from '../app/db/queries';
import { SHOP_CATALOG, getCatalogItem } from '../app/data/shopCatalog';
import Companion from '../app/components/companion/Companion';
import CompanionSvg from '../app/components/companion/CompanionSvg';
import { BREEDS, DEFAULT_BREED, getBreed, isBreedAvailable } from '../app/components/companion/breeds';
import { ANCHOR_NAMES, BREED_IDS, STATES } from '../app/components/companion/breeds/types';
import { ITEM_ART } from '../app/components/companion/items/itemArt';
import {
  ITEM_SLOTS,
  MAX_OUTFIT,
  SLOTS,
  isEquipped,
  isWearable,
  parseEquipped,
  slotForItem,
  withItem,
  withoutSlot,
} from '../app/components/companion/items/itemSlots';
import { partTransform, REST_POSE } from '../app/components/companion/poses';
import { buildScene, showsCelebrationHat } from '../app/components/companion/scene';
import { placeShapes } from '../app/components/companion/shapes';
import type { Shape } from '../app/components/companion/shapes';
import { companionSvgMarkup } from '../app/components/companion/svgMarkup';
import RenameCompanionModal from '../app/components/RenameCompanionModal';
import BreedPickerScreen from '../app/screens/BreedPickerScreen';
import { houseTierToShow } from '../app/screens/HomeScreen';
import { useAppStore } from '../app/store/useAppStore';
import { MAX_NAME_LENGTH, cleanCompanionName, companionNameError } from '../app/utils/companionName';

const withRepeat = Reanimated.withRepeat as unknown as jest.Mock;
const gestures = (): { type: string; handlers: Record<string, (...a: any[]) => void> }[] => (globalThis as any).__gestures;

const WEARABLES = SHOP_CATALOG.filter((i) => i.category === 'outfit' || i.category === 'accessory');

async function freshDb(): Promise<void> {
  resetRealDb();
  await initializeDatabase();
}
// Give the user enough treats, then buy.
async function buy(itemId: string): Promise<void> {
  const item = getCatalogItem(itemId)!;
  await changeTreats(item.price);
  expect(await purchaseItem(item.id, item.price, item.name)).toBe(true);
}

let tree: ReactTestRenderer | null = null;
async function render(element: React.ReactElement): Promise<ReactTestRenderer> {
  await act(async () => {
    tree = create(element);
  });
  return tree!;
}
afterEach(() => {
  if (tree) {
    act(() => tree!.unmount());
    tree = null;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Item → slot mapping
// ─────────────────────────────────────────────────────────────────────────────
describe('item slots', () => {
  test('the shop has 15 outfits and 15 accessories, and all 30 are mapped', () => {
    expect(WEARABLES).toHaveLength(30);
    for (const item of WEARABLES) {
      expect(SLOTS).toContain(ITEM_SLOTS[item.id]);
    }
  });

  test('nothing is mapped that the shop does not sell as an outfit or accessory', () => {
    const sold = new Set(WEARABLES.map((i) => i.id));
    for (const id of Object.keys(ITEM_SLOTS)) expect(sold.has(id)).toBe(true);
    expect(Object.keys(ITEM_SLOTS)).toHaveLength(30);
  });

  test('houses and the streak shield are not wearable', () => {
    for (const item of SHOP_CATALOG.filter((i) => i.category === 'house' || i.category === 'shield')) {
      expect(isWearable(item.id)).toBe(false);
      expect(slotForItem(item.id)).toBeNull();
    }
  });

  test('every slot has at least one item, and every mapped item has a drawing', () => {
    for (const slot of SLOTS) {
      expect(Object.values(ITEM_SLOTS)).toContain(slot);
    }
    for (const id of Object.keys(ITEM_SLOTS)) {
      expect(ITEM_ART[id]).toBeDefined();
      expect(ITEM_ART[id].shapes.length).toBeGreaterThan(0);
    }
    expect(Object.keys(ITEM_ART).sort()).toEqual(Object.keys(ITEM_SLOTS).sort());
  });

  test('outfits are clipped to the body; nothing else is', () => {
    for (const [id, slot] of Object.entries(ITEM_SLOTS)) {
      expect(!!ITEM_ART[id].clip).toBe(slot === 'outfit');
    }
  });

  test('only back items have a front clasp', () => {
    for (const [id, slot] of Object.entries(ITEM_SLOTS)) {
      if (ITEM_ART[id].front) expect(slot).toBe('back');
    }
  });

  test('the max outfit fills every slot with an item that belongs there', () => {
    expect(Object.keys(MAX_OUTFIT).sort()).toEqual([...SLOTS].sort());
    for (const slot of SLOTS) expect(ITEM_SLOTS[MAX_OUTFIT[slot]!]).toBe(slot);
  });
});

describe('equipped map helpers', () => {
  test('withItem puts an item in its own slot and replaces what was there', () => {
    let e = withItem({}, 'acc_party_hat');
    expect(e).toEqual({ head: 'acc_party_hat' });
    e = withItem(e, 'acc_astral_crown');
    expect(e).toEqual({ head: 'acc_astral_crown' });
    e = withItem(e, 'acc_bow_tie');
    expect(e).toEqual({ head: 'acc_astral_crown', neck: 'acc_bow_tie' });
    expect(isEquipped(e, 'acc_bow_tie')).toBe(true);
    expect(isEquipped(e, 'acc_party_hat')).toBe(false);
  });

  test('withItem ignores things that cannot be worn', () => {
    expect(withItem({ neck: 'acc_bow_tie' }, 'house_cozy_den')).toEqual({ neck: 'acc_bow_tie' });
    expect(withItem({}, 'shield')).toEqual({});
  });

  test('withoutSlot empties one slot and leaves the rest', () => {
    const e = { head: 'acc_party_hat', neck: 'acc_bow_tie' };
    expect(withoutSlot(e, 'head')).toEqual({ neck: 'acc_bow_tie' });
    expect(withoutSlot(e, 'aura')).toEqual(e);
    expect(e).toEqual({ head: 'acc_party_hat', neck: 'acc_bow_tie' }); // not mutated
  });

  test('parseEquipped drops anything damaged or in the wrong slot', () => {
    expect(parseEquipped('{"head":"acc_party_hat","neck":"acc_bow_tie"}')).toEqual({ head: 'acc_party_hat', neck: 'acc_bow_tie' });
    expect(parseEquipped('{"head":"acc_bow_tie"}')).toEqual({});          // a bow tie is not a hat
    expect(parseEquipped('{"head":"no_such_item","tail":"x"}')).toEqual({});
    expect(parseEquipped('{"head":42}')).toEqual({});
    expect(parseEquipped('not json')).toEqual({});
    expect(parseEquipped('[]')).toEqual({});
    expect(parseEquipped('')).toEqual({});
    expect(parseEquipped(null)).toEqual({});
    expect(parseEquipped(undefined)).toEqual({});
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Database: migration
// ─────────────────────────────────────────────────────────────────────────────
describe('wardrobe migration', () => {
  test('a fresh install gets the three columns with their defaults', async () => {
    await freshDb();
    const s = await getSettings();
    expect(s?.equipped_items).toBe('{}');
    expect(s?.breed).toBe('maltese');
    expect(s?.shown_house).toBeNull();
  });

  test('a database that already has rows gets the columns and keeps its data', async () => {
    // The settings and owned_items tables as they were in the first release,
    // each with a row already in it.
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
    expect(columns).toEqual(expect.arrayContaining(['equipped_items', 'breed', 'shown_house']));

    const s = await getSettings();
    expect(s?.companion_name).toBe('Rex');      // old data untouched
    expect(s?.current_streak).toBe(12);
    expect(s?.equipped_items).toBe('{}');       // new columns filled with their defaults
    expect(s?.breed).toBe('maltese');
    expect(s?.shown_house).toBeNull();

    // And the new feature works on the upgraded database.
    expect(await equipItem('head', 'acc_party_hat')).toBe(true);
    expect(await getEquipped()).toEqual({ head: 'acc_party_hat' });
  });

  test('running the migration again changes nothing (it is safe on every app start)', async () => {
    await freshDb();
    await buy('acc_party_hat');
    await equipItem('head', 'acc_party_hat');
    await setBreed(BREEDS[BREEDS.length - 1].id);
    await initializeDatabase();
    await initializeDatabase();
    const s = await getSettings();
    expect(parseEquipped(s?.equipped_items)).toEqual({ head: 'acc_party_hat' });
    expect(s?.breed).toBe(BREEDS[BREEDS.length - 1].id);
  });

  test('an empty value left in the column is repaired on the next start', async () => {
    await freshDb();
    rawDb().exec(`UPDATE settings SET equipped_items = '', breed = '' WHERE id = 1`);
    await initializeDatabase();
    const s = await getSettings();
    expect(s?.equipped_items).toBe('{}');
    expect(s?.breed).toBe('maltese');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Database: equip, unequip, replace
// ─────────────────────────────────────────────────────────────────────────────
describe('equip system', () => {
  beforeEach(freshDb);

  test('an owned item can be put on and taken off', async () => {
    await buy('acc_party_hat');
    expect(await equipItem('head', 'acc_party_hat')).toBe(true);
    expect(await getEquipped()).toEqual({ head: 'acc_party_hat' });
    await unequipSlot('head');
    expect(await getEquipped()).toEqual({});
  });

  test('you cannot wear an item you do not own', async () => {
    expect(await equipItem('head', 'acc_party_hat')).toBe(false);
    expect(await getEquipped()).toEqual({});
    // Owning a different item does not help.
    await buy('acc_bow_tie');
    expect(await equipItem('head', 'acc_astral_crown')).toBe(false);
    expect(await getEquipped()).toEqual({});
  });

  test('an item only goes in its own slot', async () => {
    await buy('acc_party_hat');
    expect(await equipItem('neck', 'acc_party_hat')).toBe(false);
    expect(await equipItem('outfit', 'acc_party_hat')).toBe(false);
    expect(await getEquipped()).toEqual({});
  });

  test('things that are not wearable are refused, even when owned', async () => {
    await buy('house_cozy_den');
    expect(await equipItem('outfit', 'house_cozy_den')).toBe(false);
    expect(await equipItem('head', 'shield')).toBe(false);
    expect(await equipItem('head', 'no_such_item')).toBe(false);
    expect(await getEquipped()).toEqual({});
  });

  test('equipping into an occupied slot replaces the item that was there', async () => {
    await buy('acc_party_hat');
    await buy('acc_astral_crown');
    await equipItem('head', 'acc_party_hat');
    expect(await equipItem('head', 'acc_astral_crown')).toBe(true);
    expect(await getEquipped()).toEqual({ head: 'acc_astral_crown' });
  });

  test('different slots are independent: one item in every slot at once', async () => {
    for (const slot of SLOTS) {
      await buy(MAX_OUTFIT[slot]!);
      expect(await equipItem(slot, MAX_OUTFIT[slot]!)).toBe(true);
    }
    expect(await getEquipped()).toEqual(MAX_OUTFIT);
    await unequipSlot('face');
    const after = await getEquipped();
    expect(after.face).toBeUndefined();
    expect(Object.keys(after)).toHaveLength(SLOTS.length - 1);
  });

  test('taking off an empty slot is harmless', async () => {
    await unequipSlot('aura');
    expect(await getEquipped()).toEqual({});
  });

  test('a refused equip leaves what she is wearing untouched', async () => {
    await buy('acc_bow_tie');
    await equipItem('neck', 'acc_bow_tie');
    expect(await equipItem('neck', 'acc_infinity_gem')).toBe(false); // not owned
    expect(await getEquipped()).toEqual({ neck: 'acc_bow_tie' });
  });

  test('every one of the 30 items can be bought and worn in its slot', async () => {
    for (const item of WEARABLES) {
      await buy(item.id);
      expect(await equipItem(ITEM_SLOTS[item.id], item.id)).toBe(true);
      expect((await getEquipped())[ITEM_SLOTS[item.id]]).toBe(item.id);
    }
  });

  test('"Delete all my data" empties the wardrobe and resets the breed', async () => {
    await buy('acc_party_hat');
    await equipItem('head', 'acc_party_hat');
    await setBreed(BREEDS[BREEDS.length - 1].id);
    await deleteAllData();
    const s = await getSettings();
    expect(s?.equipped_items).toBe('{}');
    expect(s?.breed).toBe('maltese');
    expect(s?.shown_house).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Database: breed
// ─────────────────────────────────────────────────────────────────────────────
describe('breed', () => {
  beforeEach(freshDb);

  test('switching breed keeps the name and every equipped item', async () => {
    await renameCompanion('Biscuit');
    for (const slot of SLOTS) {
      await buy(MAX_OUTFIT[slot]!);
      await equipItem(slot, MAX_OUTFIT[slot]!);
    }
    for (const breed of BREEDS) {
      expect(await setBreed(breed.id)).toBe(true);
      const s = await getSettings();
      expect(s?.breed).toBe(breed.id);
      expect(s?.companion_name).toBe('Biscuit');
      expect(parseEquipped(s?.equipped_items)).toEqual(MAX_OUTFIT);
    }
  });

  test('switching is free: treats are not touched', async () => {
    await changeTreats(77);
    for (const breed of BREEDS) await setBreed(breed.id);
    expect((await getSettings())?.treat_count).toBe(77);
  });

  test('a breed the app does not have is refused', async () => {
    expect(await setBreed('dragon')).toBe(false);
    expect(await setBreed('')).toBe(false);
    expect((await getSettings())?.breed).toBe('maltese');
  });

  test('an unknown breed stored in the database falls back to the default dog', () => {
    expect(getBreed('dragon').id).toBe(DEFAULT_BREED);
    expect(getBreed(null).id).toBe(DEFAULT_BREED);
    expect(isBreedAvailable('dragon')).toBe(false);
    expect(isBreedAvailable('maltese')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Every breed: parts, pivots, anchors
// ─────────────────────────────────────────────────────────────────────────────
describe('breed definitions', () => {
  test('breed ids are unique and known', () => {
    const ids = BREEDS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(BREED_IDS).toContain(id);
    expect(ids).toContain(DEFAULT_BREED);
  });

  // The table test the spec asks for: every breed × every state × every anchor.
  const rows = BREEDS.flatMap((b) => STATES.flatMap((state) => ANCHOR_NAMES.map((name) => [b.id, state, name] as const)));
  test.each(rows)('%s / %s / %s anchor is defined and inside the drawing', (breedId, state, name) => {
    const a = getBreed(breedId).anchors[state][name];
    expect(a).toBeDefined();
    for (const v of [a.x, a.y, a.rotation, a.scale]) expect(Number.isFinite(v)).toBe(true);
    expect(a.x).toBeGreaterThanOrEqual(0);
    expect(a.x).toBeLessThanOrEqual(200);
    expect(a.y).toBeGreaterThanOrEqual(0);
    expect(a.y).toBeLessThanOrEqual(200);
    expect(a.scale).toBeGreaterThan(0.5);
    expect(a.scale).toBeLessThan(1.6);
  });

  test.each(BREEDS.map((b) => [b.id]))('%s has every part, a name, and finite pivots', (breedId) => {
    const b = getBreed(breedId);
    expect(b.displayName.length).toBeGreaterThan(0);
    expect(b.blurb.length).toBeGreaterThan(0);
    const P = b.parts;
    for (const key of ['shadow', 'tail', 'pawL', 'pawR', 'face', 'eyesOpen', 'lids', 'eyesHappy', 'mouthClosed', 'mouthOpen', 'earL', 'earR'] as const) {
      expect(P[key].length).toBeGreaterThan(0);
    }
    expect(P.bodyPath.startsWith('M')).toBe(true);
    expect(P.headPath.startsWith('M')).toBe(true);
    const pv = b.pivots;
    for (const v of [pv.earL.x, pv.earL.y, pv.earR.x, pv.earR.y, pv.tail.x, pv.tail.y, pv.knot.x, pv.knot.y, pv.lidY, pv.mouthY, pv.earSign, pv.earGain]) {
      expect(Number.isFinite(v)).toBe(true);
    }
    expect(Math.abs(pv.earSign)).toBe(1);
    // Ears are mirror images: the pivots sit the same distance from the centre line.
    expect(pv.earL.x + pv.earR.x).toBeCloseTo(200);
    expect(pv.earL.y).toBe(pv.earR.y);
  });

  test.each(BREEDS.map((b) => [b.id]))('%s: the rest pose leaves every part where it was drawn', (breedId) => {
    const pv = getBreed(breedId).pivots;
    for (const part of ['root', 'tail', 'body', 'pawL', 'pawR', 'head', 'earL', 'earR', 'knot'] as const) {
      const t = partTransform(part, REST_POSE, pv);
      expect([t.tx, t.ty, t.rot, t.sx, t.sy, t.opacity]).toEqual([0, 0, 0, 1, 1, 1]);
    }
  });

  test.each(BREEDS.map((b) => [b.id]))('%s renders in every state, bare and fully dressed', (breedId) => {
    for (const state of STATES) {
      const bare = companionSvgMarkup({ state, size: 240, breed: breedId, backdrop: 'day' });
      const dressed = companionSvgMarkup({ state, size: 240, breed: breedId, backdrop: 'day', equipped: MAX_OUTFIT });
      expect(bare.startsWith('<svg')).toBe(true);
      expect(dressed.length).toBeGreaterThan(bare.length);
      expect(bare).not.toContain('NaN');
      expect(dressed).not.toContain('NaN');
      expect(dressed).not.toContain('undefined');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scene: what is drawn on which layer
// ─────────────────────────────────────────────────────────────────────────────
describe('scene', () => {
  const maltese = getBreed('maltese');

  test('each slot lands on the layer of the body part it is attached to', () => {
    const scene = buildScene(maltese, 'idle', MAX_OUTFIT);
    const keys = (list: { key: string }[]) => list.map((d) => d.key);
    expect(keys(scene.aura)).toEqual([`aura-${MAX_OUTFIT.aura}`]);         // whole dog, behind everything
    expect(keys(scene.back)).toEqual([`back-${MAX_OUTFIT.back}`]);         // follows the body, behind it
    expect(keys(scene.body)).toContain(`outfit-${MAX_OUTFIT.outfit}`);     // on the body
    expect(keys(scene.body)).toContain(`neck-${MAX_OUTFIT.neck}`);
    expect(keys(scene.face)).toEqual([`face-${MAX_OUTFIT.face}`]);         // on the head
    expect(keys(scene.headItem)).toEqual([`head-${MAX_OUTFIT.head}`]);     // on top of the head
    expect(keys(scene.held)).toEqual([`held-${MAX_OUTFIT.held}`]);         // on the paw
  });

  test('body draw order: fur, outfit, outline, then neck items on top', () => {
    const keys = buildScene(maltese, 'idle', { outfit: 'outfit_cozy_sweater', neck: 'acc_bow_tie' }).body.map((d) => d.key);
    expect(keys).toEqual(['body-fill', 'outfit-outfit_cozy_sweater', 'body-outline', 'neck-acc_bow_tie']);
  });

  test('an outfit is clipped to the breed body, and hides the fold lines under it', () => {
    const bare = buildScene(maltese, 'idle', {});
    const dressed = buildScene(maltese, 'idle', { outfit: 'outfit_raincoat' });
    expect(bare.body.map((d) => d.key)).toContain('body-detail');
    expect(dressed.body.map((d) => d.key)).not.toContain('body-detail');
    expect(dressed.body.find((d) => d.key === 'outfit-outfit_raincoat')?.clip).toBe(maltese.parts.bodyPath);
  });

  test('a cape goes behind the body and its clasp in front', () => {
    const scene = buildScene(maltese, 'idle', { back: 'outfit_superhero_cape' });
    expect(scene.back.map((d) => d.key)).toEqual(['back-outfit_superhero_cape']);
    expect(scene.body.map((d) => d.key)).toContain('clasp-outfit_superhero_cape');
  });

  test('nothing equipped means no item layers at all', () => {
    const scene = buildScene(maltese, 'idle', {});
    expect([scene.aura, scene.back, scene.face, scene.headItem, scene.held].every((l) => l.length === 0)).toBe(true);
  });

  test('the celebration hat appears only when celebrating with a bare head', () => {
    expect(showsCelebrationHat('celebrating', {})).toBe(true);
    expect(showsCelebrationHat('celebrating', { head: 'acc_astral_crown' })).toBe(false);
    expect(showsCelebrationHat('happy', {})).toBe(false);
    expect(buildScene(maltese, 'celebrating', {}).celebrationHat).toBe(true);
    expect(buildScene(maltese, 'celebrating', { head: 'acc_flower_crown' }).partyHat).toEqual([]);
  });

  test('a crown covers the topknot; a flower crown and a halo do not', () => {
    expect(buildScene(maltese, 'idle', { head: 'acc_astral_crown' }).tuftHidden).toBe(true);
    expect(buildScene(maltese, 'idle', { head: 'acc_party_hat' }).tuftHidden).toBe(true);
    expect(buildScene(maltese, 'idle', { head: 'acc_flower_crown' }).tuftHidden).toBe(false);
    expect(buildScene(maltese, 'idle', { head: 'acc_cosmic_halo' }).tuftHidden).toBe(false);
  });

  test('items are placed at the breed anchor (same art, different place per breed)', () => {
    for (const breed of BREEDS) {
      const scene = buildScene(breed, 'idle', { head: 'acc_party_hat' });
      expect(scene.headItem[0].at).toEqual(breed.anchors.idle.headTop);
    }
  });

  test('effects are only on the items that should have them', () => {
    const fx = Object.entries(ITEM_ART).filter(([, a]) => a.fx).map(([id]) => id).sort();
    expect(fx).toEqual(['acc_arcane_matrix', 'acc_cosmic_halo', 'acc_omnipotent_orb', 'outfit_legendary_aura']);
  });
});

describe('placeShapes', () => {
  const dot: Shape = { t: 'circle', cx: 10, cy: 0, r: 2, stroke: '#000', sw: 2 };

  test('moves and scales', () => {
    const [s] = placeShapes([dot], { x: 100, y: 50, rotation: 0, scale: 2 });
    expect(s).toMatchObject({ t: 'circle', cx: 120, cy: 50, r: 4, sw: 4 });
  });

  test('rotates around the anchor', () => {
    const [s] = placeShapes([dot], { x: 100, y: 50, rotation: 90, scale: 1 });
    expect(s).toMatchObject({ cx: 100, cy: 60 }); // 10 to the right becomes 10 down
  });

  test('moves every point of a path', () => {
    const [s] = placeShapes([{ t: 'path', d: 'M 0 0 L 10 0 Q 10 10 0 10 Z' }], { x: 5, y: 5, rotation: 0, scale: 1 });
    expect(s).toMatchObject({ t: 'path', d: 'M 5 5 L 15 5 Q 15 15 5 15 Z' });
  });

  test('a rotated ellipse becomes a path; an unrotated one stays an ellipse', () => {
    const e: Shape = { t: 'ellipse', cx: 0, cy: 0, rx: 10, ry: 5 };
    expect(placeShapes([e], { x: 1, y: 1, rotation: 0, scale: 1 })[0].t).toBe('ellipse');
    expect(placeShapes([e], { x: 1, y: 1, rotation: 30, scale: 1 })[0].t).toBe('path');
  });

  test('the identity anchor changes nothing', () => {
    expect(placeShapes([dot], { x: 0, y: 0, rotation: 0, scale: 1 })).toEqual([dot]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Houses and shields
// ─────────────────────────────────────────────────────────────────────────────
describe('shown house', () => {
  beforeEach(freshDb);

  test('only an owned house can be shown', async () => {
    expect(await setShownHouse('house_cozy_den')).toBe(false); // not owned
    await buy('house_cozy_den');
    expect(await setShownHouse('house_cozy_den')).toBe(true);
    expect((await getSettings())?.shown_house).toBe('house_cozy_den');
  });

  test('things that are not houses are refused', async () => {
    await buy('acc_party_hat');
    expect(await setShownHouse('acc_party_hat')).toBe(false);
    expect(await setShownHouse('no_such_house')).toBe(false);
    expect((await getSettings())?.shown_house).toBeNull();
  });

  test('null goes back to "best house I own"', async () => {
    await buy('house_cozy_den');
    await setShownHouse('house_cozy_den');
    expect(await setShownHouse(null)).toBe(true);
    expect((await getSettings())?.shown_house).toBeNull();
  });

  test('the yard shows the chosen house, else the best one owned', () => {
    const owned = ['house_cozy_den', 'house_cloud_castle', 'acc_party_hat']; // tiers 1 and 3
    expect(houseTierToShow(owned, null)).toBe(3);                    // best owned
    expect(houseTierToShow(owned, 'house_cozy_den')).toBe(1);        // the chosen one, even though it is smaller
    expect(houseTierToShow(owned, 'house_dimension_x')).toBe(3);     // chosen but not owned → fall back
    expect(houseTierToShow(owned, 'acc_party_hat')).toBe(3);         // not a house → fall back
    expect(houseTierToShow([], null)).toBe(0);                       // no house at all
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Renaming
// ─────────────────────────────────────────────────────────────────────────────
describe('renaming', () => {
  beforeEach(freshDb);

  test('the name rule: trimmed, 1 to 20 characters', () => {
    expect(cleanCompanionName('  Biscuit  ')).toBe('Biscuit');
    expect(cleanCompanionName('')).toBeNull();
    expect(cleanCompanionName('     ')).toBeNull();
    expect(cleanCompanionName('a'.repeat(MAX_NAME_LENGTH))).toBe('a'.repeat(MAX_NAME_LENGTH));
    expect(cleanCompanionName('a'.repeat(MAX_NAME_LENGTH + 1))).toBeNull();
    expect(cleanCompanionName(null)).toBeNull();
    expect(MAX_NAME_LENGTH).toBe(20);
    expect(companionNameError('Nova')).toBeNull();
    expect(companionNameError('  ')).toMatch(/enter a name/i);
    expect(companionNameError('a'.repeat(21))).toMatch(/20 characters/);
  });

  test('a rename survives an app restart', async () => {
    expect(await renameCompanion('  Biscuit ')).toBe(true);
    // "Restart": the app runs its migrations again and reloads settings from disk.
    await initializeDatabase();
    useAppStore.setState({ settings: null });
    await useAppStore.getState().loadSettings();
    expect((await getSettings())?.companion_name).toBe('Biscuit');
    expect(useAppStore.getState().settings?.companion_name).toBe('Biscuit');
  });

  test('empty and over-length names are rejected and the old name is kept', async () => {
    await renameCompanion('Biscuit');
    expect(await renameCompanion('')).toBe(false);
    expect(await renameCompanion('    ')).toBe(false);
    expect(await renameCompanion('a'.repeat(21))).toBe(false);
    expect((await getSettings())?.companion_name).toBe('Biscuit');
  });

  test('a 20-character name is accepted', async () => {
    const name = 'Sir Barksalot the 3rd'.slice(0, 20);
    expect(name).toHaveLength(20);
    expect(await renameCompanion(name)).toBe(true);
    expect((await getSettings())?.companion_name).toBe(name);
  });

  test('the rename pop-up saves a valid name and closes', async () => {
    await useAppStore.getState().loadSettings();
    const onClose = jest.fn();
    const t = await render(<RenameCompanionModal visible onClose={onClose} />);
    const input = t.root.findAll((n) => n.props.testID === 'rename-input' && typeof n.props.onChangeText === 'function')[0];
    act(() => input.props.onChangeText('  Mochi '));
    const save = t.root.findAll((n) => n.props.testID === 'rename-save' && typeof n.props.onPress === 'function')[0];
    await act(async () => {
      await save.props.onPress();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect((await getSettings())?.companion_name).toBe('Mochi');
    expect(useAppStore.getState().settings?.companion_name).toBe('Mochi');
  });

  test('the rename pop-up refuses an empty name, shows why, and stays open', async () => {
    await useAppStore.getState().loadSettings();
    const onClose = jest.fn();
    const t = await render(<RenameCompanionModal visible onClose={onClose} />);
    const input = t.root.findAll((n) => n.props.testID === 'rename-input' && typeof n.props.onChangeText === 'function')[0];
    const save = () => t.root.findAll((n) => n.props.testID === 'rename-save' && typeof n.props.onPress === 'function')[0];
    act(() => input.props.onChangeText('   '));
    await act(async () => {
      await save().props.onPress();
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(JSON.stringify(t.toJSON())).toContain('Please enter a name.');
    act(() => input.props.onChangeText('a'.repeat(25)));
    await act(async () => {
      await save().props.onPress();
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(JSON.stringify(t.toJSON())).toContain('up to 20 characters');
    expect((await getSettings())?.companion_name).toBe('Nova');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────
describe('dressed companion', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    withRepeat.mockClear();
  });
  afterEach(() => {
    if (tree) {
      act(() => tree!.unmount());
      tree = null;
    }
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  const svgCount = (t: ReactTestRenderer) => t.root.findAllByType('RNSVGSvgView' as any).length;

  test.each(BREEDS.map((b) => [b.id]))('%s animates in every state wearing the max outfit', async (breedId) => {
    for (const state of STATES) {
      const t = await render(<Companion state={state} size={150} breed={breedId} equipped={MAX_OUTFIT} reduceMotion={false} />);
      expect(t.toJSON()).not.toBeNull();
      act(() => {
        jest.advanceTimersByTime(600);
      });
      act(() => t.unmount());
      tree = null;
    }
  });

  test('each equipped item adds layers; taking everything off removes them', async () => {
    const bare = await render(<Companion state="idle" size={150} reduceMotion={false} />);
    const bareCount = svgCount(bare);
    act(() => bare.unmount());
    tree = null;
    const dressed = await render(<Companion state="idle" size={150} equipped={MAX_OUTFIT} reduceMotion={false} />);
    expect(svgCount(dressed)).toBeGreaterThan(bareCount);
  });

  test('item effects do not start a loop under Reduce Motion', async () => {
    await render(<Companion state="idle" size={150} equipped={MAX_OUTFIT} reduceMotion />);
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(withRepeat).not.toHaveBeenCalled();
  });

  test('an item with an effect starts one more loop than the same dog without it', async () => {
    const plain = await render(<Companion state="sleeping" size={150} equipped={{ neck: 'acc_bow_tie' }} reduceMotion={false} />);
    const plainLoops = withRepeat.mock.calls.length;
    act(() => plain.unmount());
    tree = null;
    withRepeat.mockClear();
    await render(<Companion state="sleeping" size={150} equipped={{ aura: 'outfit_legendary_aura' }} reduceMotion={false} />);
    expect(withRepeat.mock.calls.length).toBe(plainLoops + 1);
  });

  test('press and hold calls onLongPress', async () => {
    const onLongPress = jest.fn();
    await render(<Companion state="idle" size={150} reduceMotion={false} onLongPress={onLongPress} />);
    const hold = gestures().filter((g) => g.type === 'longPress').pop()!;
    act(() => hold.handlers.onStart({}));
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  test('the still picture (used for Shop try-on) draws one SVG, dressed or not', async () => {
    const bare = await render(<CompanionSvg state="idle" size={104} />);
    expect(svgCount(bare)).toBe(1);
    act(() => bare.unmount());
    tree = null;
    for (const breed of BREEDS) {
      const dressed = await render(<CompanionSvg state="idle" size={104} breed={breed.id} equipped={MAX_OUTFIT} />);
      expect(svgCount(dressed)).toBe(1);
      act(() => dressed.unmount());
      tree = null;
    }
  });
});

describe('breed picker', () => {
  beforeEach(async () => {
    await freshDb();
    await useAppStore.getState().loadSettings();
  });

  test('shows every breed, each wearing what is equipped', async () => {
    await buy('acc_party_hat');
    await equipItem('head', 'acc_party_hat');
    await useAppStore.getState().loadSettings();
    const t = await render(<BreedPickerScreen visible onClose={() => {}} />);
    const dogs = t.root.findAllByType(Companion);
    expect(dogs.map((d) => d.props.breed)).toEqual(BREEDS.map((b) => b.id));
    for (const dog of dogs) expect(dog.props.equipped).toEqual({ head: 'acc_party_hat' });
  });

  test('"Choose" on the current dog is disabled', async () => {
    const t = await render(<BreedPickerScreen visible onClose={() => {}} />);
    const choose = t.root.findAll((n) => n.props.testID === 'breed-choose' && n.props.accessibilityRole === 'button')[0];
    expect(choose.props.disabled ?? choose.props.accessibilityState?.disabled).toBeTruthy();
  });
});
