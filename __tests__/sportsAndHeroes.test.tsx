// sportsAndHeroes.test.tsx — the 20 wearables added in the houses run:
// ten pieces of sports gear (Tier 2) and ten hero suits (Tiers 3 to 5).
//
// What is checked: every item is in the catalog, the slot table and the art
// table; prices sit in their tier's band; a hero suit is one outfit that
// brings its own cape and moving details; helmets hide the ears they would
// collide with; and nothing moves under Reduce Motion.

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

import { SHOP_CATALOG, getCatalogByCategory, getCatalogItem } from '../app/data/shopCatalog';
import { CHEST_TIERS, maxItemTier, poolItems, CHESTS } from '../app/data/chestLoot';
import Companion from '../app/components/companion/Companion';
import CompanionSvg from '../app/components/companion/CompanionSvg';
import { BREEDS, getBreed } from '../app/components/companion/breeds';
import { STATES } from '../app/components/companion/breeds/types';
import { ITEM_ART } from '../app/components/companion/items/itemArt';
import { HERO_ACC_ART } from '../app/components/companion/items/heroAccessoryArt';
import { HERO_ART } from '../app/components/companion/items/heroArt';
import { SPORTS_ART } from '../app/components/companion/items/sportsArt';
import { num24 } from '../app/components/companion/items/artKit';
import { HERO_OUTFIT, HERO_SUIT_PAIRS, ITEM_SLOTS, SLOTS, parseEquipped, withItem } from '../app/components/companion/items/itemSlots';
import { buildScene } from '../app/components/companion/scene';
import type { SceneLayers } from '../app/components/companion/scene';
import type { Drawable } from '../app/components/companion/shapes';
import { companionSvgMarkup } from '../app/components/companion/svgMarkup';

const withRepeat = Reanimated.withRepeat as unknown as jest.Mock;

const WEARABLES = SHOP_CATALOG.filter((i) => i.category === 'outfit' || i.category === 'accessory');

// The spec's tables, as data. id → [slot, tier, price].
const SPORTS: Record<string, [string, number, number]> = {
  outfit_football_jersey: ['outfit', 2, 55],
  outfit_baseball_jersey: ['outfit', 2, 50],
  outfit_basketball_jersey: ['outfit', 2, 50],
  outfit_hockey_jersey: ['outfit', 2, 55],
  acc_football_helmet: ['head', 2, 50],
  acc_hockey_helmet: ['head', 2, 48],
  acc_basketball: ['held', 2, 42],
  acc_baseball_bat: ['held', 2, 45],
  // Two more, added so the run delivers the 20 items the spec counts (D59).
  acc_football: ['held', 2, 44],
  acc_hockey_stick: ['held', 2, 46],
};
const HEROES: Record<string, [string, number, number]> = {
  outfit_hero_circuit_spark: ['Circuit Spark', 3, 115],
  outfit_hero_tide_guardian: ['Tide Guardian', 3, 110],
  outfit_hero_ember_comet: ['Ember Comet', 3, 125],
  outfit_hero_verdant_shield: ['Verdant Shield', 3, 120],
  outfit_hero_aurora_knight: ['Aurora Knight', 4, 210],
  outfit_hero_gravity_warden: ['Gravity Warden', 4, 220],
  outfit_hero_frost_sentinel: ['Frost Sentinel', 4, 205],
  outfit_hero_solar_sovereign: ['Solar Sovereign', 5, 440],
  outfit_hero_quantum_drift: ['Quantum Drift', 5, 420],
  outfit_hero_titan_24: ['Titan of 24', 5, 450],
};
const HERO_ACCS: Record<string, [string, number, number]> = {
  acc_hero_spark_visor:    ['face', 3, 80],
  acc_hero_tide_trident:   ['held', 3, 78],
  acc_hero_comet_goggles:  ['face', 3, 85],
  acc_hero_leaf_shield:    ['held', 3, 84],
  acc_hero_aurora_helm:    ['head', 4, 150],
  acc_hero_orbit_gauntlet: ['held', 4, 155],
  acc_hero_frost_crown:    ['head', 4, 145],
  acc_hero_sun_medallion:  ['neck', 5, 310],
  acc_hero_phase_mask:     ['face', 5, 295],
  acc_hero_clock_shield:   ['held', 5, 315],
};

const NEW_IDS = [...Object.keys(SPORTS), ...Object.keys(HEROES)];
const HELMETS = ['acc_football_helmet', 'acc_hockey_helmet'];

// Price bands per tier. Tier 2 starts at 42 (Basketball); hero accessories
// set new lower bounds for Tiers 3–5 (trident 78, frost crown 145, mask 295).
const BANDS: Record<number, [number, number]> = {
  1: [18, 32],
  2: [42, 80],
  3: [78, 160],
  4: [145, 300],
  5: [295, 550],
};

const LAYERS: (keyof SceneLayers)[] = ['aura', 'back', 'body', 'face', 'headItem', 'held'];
const allDrawables = (scene: SceneLayers): Drawable[] => LAYERS.flatMap((l) => scene[l] as Drawable[]);
const keys = (list: Drawable[]) => list.map((d) => d.key);

let tree: ReactTestRenderer | null = null;
async function render(element: React.ReactElement): Promise<ReactTestRenderer> {
  await act(async () => {
    tree = create(element);
  });
  return tree!;
}

// ─────────────────────────────────────────────────────────────────────────────
// Catalog, slots, art
// ─────────────────────────────────────────────────────────────────────────────
describe('the 20 new wearables', () => {
  test('there are 20 of them, and 60 wearables in all (Phase B adds 10 hero accessories)', () => {
    expect(NEW_IDS).toHaveLength(20);
    expect(new Set(NEW_IDS).size).toBe(20);
    expect(WEARABLES).toHaveLength(60);
    expect(SHOP_CATALOG.filter((i) => i.category === 'outfit')).toHaveLength(29);
    expect(SHOP_CATALOG.filter((i) => i.category === 'accessory')).toHaveLength(31);
    expect(SHOP_CATALOG).toHaveLength(80);
  });

  test('the item → slot mapping covers all 60 wearables, and nothing else', () => {
    expect(Object.keys(ITEM_SLOTS).sort()).toEqual(WEARABLES.map((i) => i.id).sort());
    for (const item of WEARABLES) expect(SLOTS).toContain(ITEM_SLOTS[item.id]);
  });

  test.each(NEW_IDS.map((id) => [id]))('%s is in the catalog, the slots, and the art', (id) => {
    const item = getCatalogItem(id);
    expect(item).toBeDefined();
    expect(item!.name.length).toBeGreaterThan(0);
    expect(item!.description.length).toBeGreaterThan(10);
    expect(item!.emoji.length).toBeGreaterThan(0);
    expect(ITEM_SLOTS[id]).toBeDefined();
    expect(ITEM_ART[id]).toBeDefined();
    expect(ITEM_ART[id].shapes.length).toBeGreaterThan(0);
  });

  test('the art tables hold exactly the new items', () => {
    expect(Object.keys(SPORTS_ART).sort()).toEqual(Object.keys(SPORTS).sort());
    expect(Object.keys(HERO_ART).sort()).toEqual(Object.keys(HEROES).sort());
    expect(Object.keys(HERO_ACC_ART).sort()).toEqual(Object.keys(HERO_ACCS).sort());
    expect(Object.keys(ITEM_ART)).toHaveLength(60);
  });

  test('catalog ids are unique', () => {
    const ids = SHOP_CATALOG.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('sports gear: slot, tier and price match the spec', () => {
    for (const [id, [slot, tier, price]] of Object.entries(SPORTS)) {
      const item = getCatalogItem(id)!;
      expect(ITEM_SLOTS[id]).toBe(slot);
      expect(item.tier).toBe(tier);
      expect(item.price).toBe(price);
      expect(item.category).toBe(id.startsWith('outfit_') ? 'outfit' : 'accessory');
    }
  });

  test('hero suits: name, tier and price match the spec, and each takes only the outfit slot', () => {
    for (const [id, [name, tier, price]] of Object.entries(HEROES)) {
      const item = getCatalogItem(id)!;
      expect(item.name).toBe(name);
      expect(item.tier).toBe(tier);
      expect(item.price).toBe(price);
      expect(item.category).toBe('outfit');
      expect(ITEM_SLOTS[id]).toBe('outfit');
      expect(ITEM_ART[id].clip).toBe(true);
    }
  });

  test('every wearable is priced inside its tier band', () => {
    for (const item of WEARABLES) {
      const [lo, hi] = BANDS[item.tier];
      expect(item.price).toBeGreaterThanOrEqual(lo);
      expect(item.price).toBeLessThanOrEqual(hi);
    }
  });

  test('houses are priced inside their tier band too', () => {
    for (const item of SHOP_CATALOG.filter((i) => i.category === 'house')) {
      const [lo, hi] = BANDS[item.tier];
      expect(item.price).toBeGreaterThanOrEqual(lo);
      expect(item.price).toBeLessThanOrEqual(hi);
    }
  });

  test('a more expensive tier never undercuts a cheaper one', () => {
    for (let tier = 1; tier < 5; tier++) {
      const top = Math.max(...WEARABLES.filter((i) => i.tier === tier).map((i) => i.price));
      const next = Math.min(...WEARABLES.filter((i) => i.tier === tier + 1).map((i) => i.price));
      expect(next).toBeGreaterThan(top);
    }
  });

  test('the Shop lists a category cheapest tier first, keeping catalog order inside a tier', () => {
    for (const category of ['outfit', 'accessory', 'house']) {
      const list = getCatalogByCategory(category);
      const tiers = list.map((i) => i.tier);
      expect(tiers).toEqual([...tiers].sort((a, b) => a - b));
      for (let tier = 1; tier <= 5; tier++) {
        const inList = list.filter((i) => i.tier === tier).map((i) => i.id);
        const inCatalog = SHOP_CATALOG.filter((i) => i.category === category && i.tier === tier).map((i) => i.id);
        expect(inList).toEqual(inCatalog);
      }
    }
    // The jerseys sit with the other Tier 2 outfits, not after the Tier 5 ones.
    const outfits = getCatalogByCategory('outfit').map((i) => i.id);
    expect(outfits.indexOf('outfit_football_jersey')).toBeLessThan(outfits.indexOf('outfit_royal_robe'));
    // Sorting returns a copy: the catalog itself keeps its order.
    expect(SHOP_CATALOG[0].id).toBe('outfit_cozy_sweater');
  });

  test('no league, team or published-hero names appear in the catalog text', () => {
    const banned = [
      'nfl', 'nba', 'mlb', 'nhl', 'fifa', 'super bowl', 'world series', 'stanley',
      'marvel', 'dc comics', 'avenger', 'justice league',
      'superman', 'batman', 'spider', 'iron man', 'captain america', 'wonder woman', 'flash', 'thor',
      'hulk', 'aquaman', 'green lantern', 'x-men', 'wolverine', 'black panther',
    ];
    for (const id of NEW_IDS) {
      const item = getCatalogItem(id)!;
      const text = `${item.id} ${item.name} ${item.description}`.toLowerCase();
      for (const word of banned) expect(text).not.toContain(word);
    }
  });

  test('chests can drop the new items, and only at or below the chest tier', () => {
    const droppable = new Set<string>();
    for (const tier of CHEST_TIERS) {
      for (const entry of CHESTS[tier].pool) {
        for (const item of poolItems(tier, entry.group)) {
          droppable.add(item.id);
          if (item.category !== 'shield') expect(item.tier).toBeLessThanOrEqual(maxItemTier(tier));
        }
      }
    }
    for (const id of NEW_IDS) expect(droppable.has(id)).toBe(true);
  });

  test('a stored outfit with new items is read back unchanged', () => {
    expect(parseEquipped(JSON.stringify(HERO_OUTFIT))).toEqual(HERO_OUTFIT);
    for (const slot of Object.keys(HERO_OUTFIT) as (keyof typeof HERO_OUTFIT)[]) {
      expect(ITEM_SLOTS[HERO_OUTFIT[slot]!]).toBe(slot);
    }
    // A hero suit replaces another outfit; it does not take the back slot.
    const worn = withItem({ outfit: 'outfit_cozy_sweater', back: 'acc_celestial_wings' }, 'outfit_hero_titan_24');
    expect(worn).toEqual({ outfit: 'outfit_hero_titan_24', back: 'acc_celestial_wings' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hero accessories (Phase B)
// ─────────────────────────────────────────────────────────────────────────────
describe('hero accessories', () => {
  const ACC_IDS = Object.keys(HERO_ACCS);

  test('each accessory is in the catalog, the slot table, and the art table', () => {
    for (const id of ACC_IDS) {
      const item = getCatalogItem(id);
      expect(item).toBeDefined();
      expect(item!.name.length).toBeGreaterThan(0);
      expect(item!.description.length).toBeGreaterThan(10);
      expect(item!.emoji.length).toBeGreaterThan(0);
      expect(item!.category).toBe('accessory');
      expect(ITEM_SLOTS[id]).toBeDefined();
      expect(ITEM_ART[id]).toBeDefined();
      expect(ITEM_ART[id].shapes.length).toBeGreaterThan(0);
    }
  });

  test('slot, tier and price match the spec', () => {
    for (const [id, [slot, tier, price]] of Object.entries(HERO_ACCS)) {
      const item = getCatalogItem(id)!;
      expect(ITEM_SLOTS[id]).toBe(slot);
      expect(item.tier).toBe(tier);
      expect(item.price).toBe(price);
    }
  });

  test('each accessory maps to exactly one hero suit, and all ten suits are covered', () => {
    const coveredSuits = new Set(Object.values(HERO_SUIT_PAIRS));
    for (const id of ACC_IDS) {
      expect(HERO_SUIT_PAIRS[id]).toBeDefined();
      expect(ITEM_SLOTS[HERO_SUIT_PAIRS[id]]).toBe('outfit');
    }
    for (const suitId of Object.keys(HEROES)) {
      expect(coveredSuits.has(suitId)).toBe(true);
    }
  });

  test('no accessory uses the outfit slot, and suits are not in HERO_SUIT_PAIRS', () => {
    for (const id of ACC_IDS) expect(ITEM_SLOTS[id]).not.toBe('outfit');
    for (const suitId of Object.keys(HEROES)) expect(HERO_SUIT_PAIRS[suitId]).toBeUndefined();
  });

  test('every shape in every accessory art has a fill or stroke', () => {
    for (const [id, art] of Object.entries(HERO_ACC_ART)) {
      for (const s of art.shapes) {
        const hasPaint = (s as { fill?: string; stroke?: string }).fill ?? (s as { fill?: string; stroke?: string }).stroke;
        expect(hasPaint).toBeTruthy();
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The number 24
// ─────────────────────────────────────────────────────────────────────────────
describe('num24', () => {
  test('is two strokes with no fill, centred where asked', () => {
    const shapes = num24(0, 0, 1, '#FFFFFF', 3);
    expect(shapes).toHaveLength(2);
    for (const s of shapes) {
      expect(s.t).toBe('path');
      expect(s.fill).toBeUndefined();
      expect(s.stroke).toBe('#FFFFFF');
    }
    const xs = shapes.flatMap((s) => (s.t === 'path' ? [...s.d.matchAll(/(-?\d*\.?\d+) (-?\d*\.?\d+)/g)].map((m) => parseFloat(m[1])) : []));
    expect(Math.min(...xs)).toBeCloseTo(-10.5);
    expect(Math.max(...xs)).toBeCloseTo(11);
  });

  test('every jersey carries it', () => {
    const digits = num24(0, 0, 1, '#000', 1).length;
    for (const id of Object.keys(SPORTS).filter((i) => i.endsWith('_jersey'))) {
      const strokes = ITEM_ART[id].shapes.filter((s) => s.t === 'path' && !s.fill && /Q .* Q .* Q /.test(s.d));
      expect(strokes.length).toBeGreaterThanOrEqual(digits - 1); // the "2" has three curves
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hero suits: one item, several layers
// ─────────────────────────────────────────────────────────────────────────────
describe('hero suits in the scene', () => {
  const maltese = getBreed('maltese');

  test('a suit puts its cape behind the body and its details on the body', () => {
    const id = 'outfit_hero_titan_24';
    const scene = buildScene(maltese, 'idle', { outfit: id });
    expect(keys(scene.back)).toEqual([`outfit-${id}-back-0`]);
    const body = keys(scene.body);
    expect(body).toContain(`outfit-${id}`);
    expect(body).toContain(`outfit-${id}-body-0`);
    // The fabric and anything clipped to it sit under the outline; the rest sits over it.
    const outline = body.indexOf('body-outline');
    expect(body.indexOf(`outfit-${id}`)).toBeLessThan(outline);
    expect(body.indexOf(`outfit-${id}-body-1`)).toBeLessThan(outline);   // the clipped glow
    expect(body.indexOf(`outfit-${id}-body-0`)).toBeGreaterThan(outline); // the clock hand
  });

  test('a separate back item is still worn, over the cape of the suit', () => {
    const scene = buildScene(maltese, 'idle', { outfit: 'outfit_hero_aurora_knight', back: 'acc_celestial_wings' });
    const back = keys(scene.back);
    expect(back[back.length - 1]).toBe('back-acc_celestial_wings');
    expect(back.length).toBe(3); // cape, aurora, wings
  });

  test('taking the suit off takes its extras with it', () => {
    const scene = buildScene(maltese, 'idle', { head: 'acc_party_hat' });
    expect(scene.back).toEqual([]);
    expect(keys(scene.body).some((k) => k.startsWith('outfit-'))).toBe(false);
  });

  test('clipped extras are clipped to the breed body; the others are not', () => {
    for (const breed of BREEDS) {
      for (const id of Object.keys(HEROES)) {
        const scene = buildScene(breed, 'idle', { outfit: id });
        const extras = ITEM_ART[id].extras ?? [];
        for (const layer of ['back', 'body'] as const) {
          const drawn = (scene[layer] as Drawable[]).filter((d) => d.key.startsWith(`outfit-${id}-${layer}-`));
          const wanted = extras.filter((e) => e.layer === layer);
          expect(drawn).toHaveLength(wanted.length);
        }
        for (const d of scene.body.filter((x) => x.key.startsWith(`outfit-${id}-body-`))) {
          const index = Number(d.key.split('-').pop());
          const extra = extras.filter((e) => e.layer === 'body')[index];
          expect(d.clip).toBe(extra.clip ? breed.parts.bodyPath : undefined);
          expect(d.fx).toBe(extra.fx);
        }
      }
    }
  });

  test('a spinning detail turns around its own spot on the chest', () => {
    for (const breed of BREEDS) {
      const chest = breed.anchors.idle.chest;
      const scene = buildScene(breed, 'idle', { outfit: 'outfit_hero_gravity_warden' });
      const rings = scene.body.find((d) => d.fx === 'spin')!;
      expect(rings.at!.x).toBeCloseTo(chest.x);
      expect(rings.at!.y).toBeCloseTo(chest.y + 7 * chest.scale);
    }
  });

  test('only outfits have extras, and extras only use the three layers', () => {
    for (const [id, art] of Object.entries(ITEM_ART)) {
      if (!art.extras) continue;
      expect(ITEM_SLOTS[id]).toBe('outfit');
      for (const e of art.extras) {
        expect(['back', 'face', 'body']).toContain(e.layer);
        expect(e.shapes.length).toBeGreaterThan(0);
        if (e.clip || e.at) expect(e.layer).toBe('body');
      }
    }
  });

  test('higher tiers move more: Tier 3 at most one piece, Tier 4 one, Tier 5 two or more', () => {
    for (const id of Object.keys(HEROES)) {
      const moving = (ITEM_ART[id].extras ?? []).filter((e) => e.fx).length;
      const tier = getCatalogItem(id)!.tier;
      if (tier === 3) expect(moving).toBeLessThanOrEqual(1);
      if (tier === 4) expect(moving).toBe(1);
      if (tier === 5) expect(moving).toBeGreaterThanOrEqual(2);
    }
  });

  test('the suit itself never has a top-level effect (the fabric must not move)', () => {
    for (const id of NEW_IDS) expect(ITEM_ART[id].fx).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Helmets and ears
// ─────────────────────────────────────────────────────────────────────────────
describe('helmets', () => {
  test('both helmets are marked as helmets and cover the topknot', () => {
    for (const id of HELMETS) {
      expect(ITEM_ART[id].helmet).toBe(true);
      expect(ITEM_ART[id].coversKnot).toBe(true);
    }
    const others = Object.entries(ITEM_ART).filter(([, a]) => a.helmet).map(([id]) => id).sort();
    expect(others).toEqual([...HELMETS].sort());
  });

  test('upright ears (Shepherd, Corgi, Shiba) and the Pug ears tuck inside; long ears stay out', () => {
    const tucked: Record<string, boolean> = {
      maltese: false, golden_retriever: false,
      german_shepherd: true, corgi: true, shiba: true, pug: true,
    };
    for (const breed of BREEDS) {
      for (const id of HELMETS) {
        for (const state of STATES) {
          const scene = buildScene(breed, state, { head: id });
          expect(scene.earL.length === 0).toBe(tucked[breed.id]);
          expect(scene.earR.length === 0).toBe(tucked[breed.id]);
          expect(scene.tuftHidden).toBe(true);
        }
      }
    }
  });

  test('other head items never hide the ears', () => {
    for (const breed of BREEDS) {
      for (const id of ['acc_party_hat', 'acc_astral_crown', 'acc_flower_crown', 'acc_cosmic_halo']) {
        const scene = buildScene(breed, 'idle', { head: id });
        expect(scene.earL.length).toBeGreaterThan(0);
        expect(scene.headItem[0].at).toEqual(breed.anchors.idle.headTop);
      }
    }
  });

  test('a breed can widen a helmet; the helmet stays centred on the head', () => {
    for (const breed of BREEDS) {
      const top = breed.anchors.idle.headTop;
      const at = buildScene(breed, 'idle', { head: 'acc_football_helmet' }).headItem[0].at!;
      expect(at.x).toBe(top.x);
      expect(at.scale).toBeCloseTo(top.scale * (breed.helmetFit?.scale ?? 1));
      expect(at.y).toBeCloseTo(top.y + (breed.helmetFit?.dy ?? 0));
    }
    expect(getBreed('shiba').helmetFit?.scale).toBeGreaterThan(1);
    expect(getBreed('pug').helmetFit?.tuckEars).toBe(true);
  });

  test('the shell is wider than every head it sits on', () => {
    // Half-width of the shell at size 1 is 59 units (see sportsArt.ts).
    for (const breed of BREEDS) {
      const xs = [...breed.parts.headPath.matchAll(/(-?\d*\.?\d+) (-?\d*\.?\d+)/g)].map((m) => parseFloat(m[1]));
      const headHalf = (Math.max(...xs) - Math.min(...xs)) / 2;
      const scale = breed.anchors.idle.headTop.scale * (breed.helmetFit?.scale ?? 1);
      expect(59 * scale).toBeGreaterThan(headHalf);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────────────────
describe('drawing the new items', () => {
  test.each(BREEDS.map((b) => [b.id]))('%s: every new item draws in every state, inside the picture', (breedId) => {
    const breed = getBreed(breedId);
    for (const id of NEW_IDS) {
      const equipped = { [ITEM_SLOTS[id]]: id };
      for (const state of STATES) {
        const bare = companionSvgMarkup({ state, size: 240, breed: breedId, backdrop: 'day' });
        const dressed = companionSvgMarkup({ state, size: 240, breed: breedId, backdrop: 'day', equipped });
        // Not "longer": a helmet takes the ear drawings away, so the picture can shrink.
        expect(dressed).not.toBe(bare);
        expect(dressed).not.toContain('NaN');
        expect(dressed).not.toContain('undefined');
      }
      // Nothing is placed far outside the 200 x 200 drawing box (outfit
      // fabric is a big sheet on purpose; it is clipped to the body).
      for (const dr of allDrawables(buildScene(breed, 'idle', equipped))) {
        if (dr.clip) continue;
        for (const s of dr.shapes) {
          const pts = s.t === 'path'
            ? [...s.d.matchAll(/(-?\d*\.?\d+) (-?\d*\.?\d+)/g)].map((m) => [parseFloat(m[1]), parseFloat(m[2])])
            : [[s.cx, s.cy]];
          for (const [x, y] of pts) {
            expect(x).toBeGreaterThanOrEqual(0);
            expect(x).toBeLessThanOrEqual(200);
            expect(y).toBeGreaterThanOrEqual(0);
            expect(y).toBeLessThanOrEqual(200);
          }
        }
      }
    }
  });

  describe('animated', () => {
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

    test.each(BREEDS.map((b) => [b.id]))('%s animates in every state in a hero suit, a helmet and a bat', async (breedId) => {
      for (const state of STATES) {
        const t = await render(<Companion state={state} size={150} breed={breedId} equipped={HERO_OUTFIT} reduceMotion={false} />);
        expect(t.toJSON()).not.toBeNull();
        act(() => {
          jest.advanceTimersByTime(600);
        });
        act(() => t.unmount());
        tree = null;
      }
    });

    test.each(Object.keys(HEROES).map((id) => [id]))('%s animates on the Corgi', async (id) => {
      const t = await render(<Companion state="happy" size={150} breed="corgi" equipped={{ outfit: id }} reduceMotion={false} />);
      expect(t.toJSON()).not.toBeNull();
      act(() => {
        jest.advanceTimersByTime(600);
      });
    });

    test('nothing on a hero suit starts a loop under Reduce Motion', async () => {
      for (const id of Object.keys(HEROES)) {
        const t = await render(<Companion state="idle" size={150} equipped={{ outfit: id }} reduceMotion />);
        act(() => {
          jest.advanceTimersByTime(3000);
        });
        act(() => t.unmount());
        tree = null;
      }
      expect(withRepeat).not.toHaveBeenCalled();
    });

    test('a suit with moving pieces starts exactly one more loop, however many pieces move', async () => {
      const plain = await render(<Companion state="sleeping" size={150} equipped={{ outfit: 'outfit_cozy_sweater' }} reduceMotion={false} />);
      const plainLoops = withRepeat.mock.calls.length;
      act(() => plain.unmount());
      tree = null;
      for (const id of ['outfit_hero_gravity_warden', 'outfit_hero_titan_24', 'outfit_hero_solar_sovereign']) {
        withRepeat.mockClear();
        const t = await render(<Companion state="sleeping" size={150} equipped={{ outfit: id }} reduceMotion={false} />);
        expect(withRepeat.mock.calls.length).toBe(plainLoops + 1);
        act(() => t.unmount());
        tree = null;
      }
    });

    test('a suit with no moving pieces, and all sports gear, start no extra loop', async () => {
      const plain = await render(<Companion state="sleeping" size={150} reduceMotion={false} />);
      const plainLoops = withRepeat.mock.calls.length;
      act(() => plain.unmount());
      tree = null;
      const looks = [
        { outfit: 'outfit_hero_ember_comet' },
        { outfit: 'outfit_football_jersey', head: 'acc_football_helmet', held: 'acc_football' },
        { outfit: 'outfit_hockey_jersey', head: 'acc_hockey_helmet', held: 'acc_hockey_stick' },
      ];
      for (const equipped of looks) {
        withRepeat.mockClear();
        const t = await render(<Companion state="sleeping" size={150} equipped={equipped} reduceMotion={false} />);
        expect(withRepeat.mock.calls.length).toBe(plainLoops);
        act(() => t.unmount());
        tree = null;
      }
    });

    test('each moving piece gets its own layer, so the fabric is never redrawn', async () => {
      const still = await render(<Companion state="idle" size={150} equipped={{ outfit: 'outfit_hero_ember_comet' }} reduceMotion={false} />);
      const stillCount = svgCount(still);
      act(() => still.unmount());
      tree = null;
      const moving = await render(<Companion state="idle" size={150} equipped={{ outfit: 'outfit_hero_titan_24' }} reduceMotion={false} />);
      expect(svgCount(moving)).toBeGreaterThan(stillCount);
    });

    test('the still picture (Shop try-on) draws one SVG for every new item', async () => {
      for (const id of NEW_IDS) {
        const t = await render(<CompanionSvg state="idle" size={104} breed="german_shepherd" equipped={{ [ITEM_SLOTS[id]]: id }} />);
        expect(svgCount(t)).toBe(1);
        act(() => t.unmount());
        tree = null;
      }
    });
  });
});
