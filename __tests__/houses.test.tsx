// houses.test.tsx — the 15 house scenes: their data, the fitting math, the
// ambient loops, which house the yard shows, and that they render.

jest.mock('expo-sqlite', () => require('../test-utils/realSqlite').expoSqliteMock);
jest.mock('expo-file-system', () => ({ File: jest.fn(), Paths: { cache: 'cache' } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('../app/screens/SettingsScreen', () => () => null);
jest.mock('../app/services/calendarSync', () => ({
  runSync: jest.fn(),
  isSyncReady: jest.fn(async () => false),
}));
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return { __esModule: true, ...actual, default: actual.default, withRepeat: jest.fn(actual.withRepeat) };
});

import React from 'react';
import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import * as Reanimated from 'react-native-reanimated';

import { SHOP_CATALOG } from '../app/data/shopCatalog';
import { HOUSES, getHouse } from '../app/components/companion/houses';
import { HouseScene, HouseStill, dogFrame, skyColor } from '../app/components/companion/houses/HouseScene';
import { houseInnerMarkup, houseSvgMarkup } from '../app/components/companion/houses/houseMarkup';
import {
  ALLOWED_PERIODS, MAX_TOP_CROP, SCENE_H, SCENE_W, ambientPhase, ambientPose, defaultAmount, sceneFit, scenePoint, stillPose,
} from '../app/components/companion/houses/types';
import type { Shape } from '../app/components/companion/shapes';
import { houseToShow } from '../app/screens/HomeScreen';

const withRepeat = Reanimated.withRepeat as unknown as jest.Mock;
const HOUSE_ITEMS = SHOP_CATALOG.filter((i) => i.category === 'house');

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

// Every number in a shape, so a NaN or a stray "undefined" in a path is caught.
function numbersOf(s: Shape): number[] {
  if (s.t === 'path') return (s.d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
  if (s.t === 'circle') return [s.cx, s.cy, s.r];
  return [s.cx, s.cy, s.rx, s.ry];
}

// ─────────────────────────────────────────────────────────────────────────────
describe('house definitions', () => {
  test('every House item in the shop has a drawing, and nothing else does', () => {
    expect(HOUSE_ITEMS).toHaveLength(15);
    expect(HOUSES).toHaveLength(15);
    expect(HOUSES.map((h) => h.id).sort()).toEqual(HOUSE_ITEMS.map((i) => i.id).sort());
    for (const item of HOUSE_ITEMS) expect(getHouse(item.id)?.id).toBe(item.id);
    expect(getHouse('outfit_cozy_sweater')).toBeNull();
    expect(getHouse('shield')).toBeNull();
    expect(getHouse(null)).toBeNull();
  });

  test.each(HOUSES.map((h) => [h.id, h] as const))('%s is drawn with valid shapes', (_id, house) => {
    const all = [...house.backdrop, ...house.house, ...house.ambient.flatMap((a) => a.shapes)];
    expect(house.backdrop.length).toBeGreaterThanOrEqual(3); // sky, ground, and scenery
    expect(house.house.length).toBeGreaterThan(0);
    for (const s of all) {
      for (const n of numbersOf(s)) expect(Number.isFinite(n)).toBe(true);
      if (s.t === 'path') {
        expect(s.d).not.toMatch(/NaN|undefined/);
        expect(s.d).toMatch(/^M /);
        expect(s.d.replace(/[MLCQZ]|-?\d*\.?\d+|\s/g, '')).toBe(''); // only M L C Q Z and numbers
      }
      expect(s.fill ?? s.stroke).toBeTruthy();
    }
  });

  test.each(HOUSES.map((h) => [h.id, h] as const))('%s has 1 to 3 kinds of ambient motion, each a clean loop', (_id, house) => {
    const kinds = new Set(house.ambient.map((a) => a.kind));
    expect(kinds.size).toBeGreaterThanOrEqual(1);
    expect(kinds.size).toBeLessThanOrEqual(3);
    expect(house.ambient.length).toBeLessThanOrEqual(5); // each is one animated view
    expect(new Set(house.ambient.map((a) => a.key)).size).toBe(house.ambient.length);
    for (const a of house.ambient) {
      expect(ALLOWED_PERIODS).toContain(a.period);
      expect(a.shapes.length).toBeGreaterThan(0);
      if (a.kind === 'sway' || a.kind === 'spin') expect(a.pivot).toBeDefined();
      if (a.kind === 'scroll' || a.kind === 'rise' || a.kind === 'bob') {
        expect(Math.abs(a.dx ?? 0) + Math.abs(a.dy ?? 0)).toBeGreaterThan(0);
      }
      // The loop joins up when the one-minute clock wraps.
      const start = ambientPhase(0, a.period, a.phase ?? 0);
      const end = ambientPhase(1, a.period, a.phase ?? 0);
      expect(Math.min(Math.abs(end - start), 1 - Math.abs(end - start))).toBeLessThan(1e-9);
    }
  });

  test.each(HOUSES.map((h) => [h.id, h] as const))('%s keeps the dog, the door, and the rest spot inside the scene', (_id, house) => {
    const inBox = (x: number, y: number) => x >= 0 && x <= SCENE_W && y >= 0 && y <= SCENE_H;
    expect(inBox(house.door.x, house.door.y)).toBe(true);
    for (const spot of [house.dog, house.rest]) {
      expect(inBox(spot.x - spot.size / 2, spot.y - spot.size)).toBe(true);
      expect(inBox(spot.x + spot.size / 2, spot.y)).toBe(true);
    }
    // She is smaller inside than outside, and the outside spot is left of the house.
    expect(house.rest.size).toBeLessThan(house.dog.size);
    expect(house.dog.x + house.dog.size / 2).toBeLessThanOrEqual(house.hit.x + 10);
    // The door and the rest spot are part of what counts as "the house".
    const inHit = (x: number, y: number) =>
      x >= house.hit.x && x <= house.hit.x + house.hit.w && y >= house.hit.y - 1 && y <= house.hit.y + house.hit.h + 1;
    expect(inHit(house.door.x, house.door.y)).toBe(true);
    expect(inHit(house.rest.x, house.rest.y - house.rest.size / 2)).toBe(true);
    expect(skyColor(house)).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  test('the tiers get richer: tier 5 houses have at least as many loops as tier 1', () => {
    const loops = (tier: number) =>
      HOUSE_ITEMS.filter((i) => i.tier === tier).reduce((n, i) => n + getHouse(i.id)!.ambient.length, 0);
    expect(loops(5)).toBeGreaterThanOrEqual(loops(1));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('ambient motion', () => {
  test('scroll moves by exactly one tile over a loop', () => {
    expect(ambientPose('scroll', 0, 60, 200, 1)).toMatchObject({ tx: 0, ty: 0, opacity: 1 });
    expect(ambientPose('scroll', 0.5, 60, 200, 1)).toMatchObject({ tx: 30, ty: 100 });
    expect(ambientPose('scroll', 1, 60, 200, 1)).toMatchObject({ tx: 60, ty: 200 });
  });

  test('rise fades in and out and ends invisible', () => {
    expect(ambientPose('rise', 0, 10, -30, 1).opacity).toBeCloseTo(0);
    expect(ambientPose('rise', 0.5, 10, -30, 1).opacity).toBeCloseTo(1);
    expect(ambientPose('rise', 1, 10, -30, 1).opacity).toBeCloseTo(0);
    expect(ambientPose('rise', 0.5, 10, -30, 1).ty).toBeCloseTo(-15);
  });

  test('sway and bob return to rest; spin goes all the way round', () => {
    expect(ambientPose('sway', 0, 0, 0, 4).rot).toBeCloseTo(0);
    expect(ambientPose('sway', 0.25, 0, 0, 4).rot).toBeCloseTo(4);
    expect(ambientPose('sway', 0.75, 0, 0, 4).rot).toBeCloseTo(-4);
    expect(ambientPose('bob', 0.25, 6, 2, 1)).toMatchObject({ tx: 6, ty: 2 });
    expect(ambientPose('spin', 0.5, 0, 0, 1).rot).toBeCloseTo(180);
    expect(ambientPose('spin', 0.5, 0, 0, -1).rot).toBeCloseTo(-180);
  });

  test('pulse stays between its lowest opacity and 1', () => {
    for (let i = 0; i <= 20; i++) {
      const o = ambientPose('pulse', i / 20, 0, 0, 0.3).opacity;
      expect(o).toBeGreaterThanOrEqual(0.3 - 1e-9);
      expect(o).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  test('the still pose (Reduce Motion, Shop cards) shows every element', () => {
    for (const house of HOUSES) {
      for (const a of house.ambient) {
        const p = stillPose(a);
        expect(p.opacity).toBeGreaterThan(0.2);
        expect(Number.isFinite(p.tx + p.ty + p.rot + p.scale)).toBe(true);
      }
    }
    expect(defaultAmount('sway')).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('fitting the scene into a view', () => {
  test('an exact 3:2 view shows the whole scene', () => {
    const fit = sceneFit(300, 200);
    expect(fit).toMatchObject({ k: 1, vx: 0, vy: 0, vw: 300, vh: 200 });
    expect(scenePoint(fit, 150, 200)).toEqual({ x: 150, y: 200 });
  });

  test('the yard on an iPhone fills the width and keeps the ground at the bottom', () => {
    const fit = sceneFit(390, 253);
    expect(fit.k).toBeCloseTo(1.3);
    expect(fit.vx).toBeCloseTo(0);
    expect(fit.vy + fit.vh).toBeCloseTo(SCENE_H);
    expect(fit.vy).toBeGreaterThanOrEqual(0);
    expect(fit.vy).toBeLessThanOrEqual(MAX_TOP_CROP);
  });

  test('a very wide view never crops more than the allowed strip off the top', () => {
    const fit = sceneFit(1024, 300);
    expect(fit.vy).toBeCloseTo(MAX_TOP_CROP);
    expect(fit.vw).toBeGreaterThan(SCENE_W); // plain sky and ground show at the sides
    expect(fit.vx).toBeLessThan(0);
  });

  test('dogFrame puts the bottom-centre of the dog box on the spot', () => {
    const fit = sceneFit(390, 253);
    const house = HOUSES[0];
    const box = dogFrame(fit, house.dog);
    const foot = scenePoint(fit, house.dog.x, house.dog.y);
    expect(box.left + box.size / 2).toBeCloseTo(foot.x);
    expect(box.top + box.size).toBeCloseTo(foot.y);
    expect(box.size).toBeCloseTo(house.dog.size * fit.k);
    expect(box.left).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('which house the yard shows', () => {
  test('no house owned: null, so the starter yard stays', () => {
    expect(houseToShow([], null)).toBeNull();
    expect(houseToShow(['outfit_cozy_sweater', 'acc_bow_tie'], null)).toBeNull();
  });

  test('with no choice made, the best house owned is shown', () => {
    expect(houseToShow(['house_cozy_den'], null)).toBe('house_cozy_den');
    expect(houseToShow(['house_cozy_den', 'house_sky_tower', 'house_treehouse'], null)).toBe('house_sky_tower');
    // Same tier: the pricier one.
    expect(houseToShow(['house_beach_shack', 'house_forest_cabin', 'house_cozy_den'], null)).toBe('house_forest_cabin');
  });

  test('"Show in yard" wins while that house is owned', () => {
    expect(houseToShow(['house_cozy_den', 'house_sky_tower'], 'house_cozy_den')).toBe('house_cozy_den');
  });

  test('a chosen house that is not owned, or is not a house, is ignored', () => {
    expect(houseToShow(['house_cozy_den'], 'house_dimension_x')).toBe('house_cozy_den');
    expect(houseToShow(['house_cozy_den', 'acc_bow_tie'], 'acc_bow_tie')).toBe('house_cozy_den');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('rendering', () => {
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

  test.each(HOUSES.map((h) => [h.id, h] as const))('%s renders animated, and each ambient element is its own layer', async (_id, house) => {
    const t = await render(<HouseScene def={house} width={390} height={253} reduceMotion={false} />);
    expect(t.toJSON()).not.toBeNull();
    // backdrop + house + one per ambient element
    expect(svgCount(t)).toBe(2 + house.ambient.length);
    expect(withRepeat).toHaveBeenCalledTimes(1); // one clock drives every loop
    act(() => {
      jest.advanceTimersByTime(1000);
    });
  });

  test('Reduce Motion starts no loop', async () => {
    for (const house of HOUSES) {
      const t = await render(<HouseScene def={house} width={390} height={253} reduceMotion />);
      expect(t.toJSON()).not.toBeNull();
      act(() => t.unmount());
      tree = null;
    }
    expect(withRepeat).not.toHaveBeenCalled();
  });

  test('a paused scene (screen not focused) starts no loop', async () => {
    await render(<HouseScene def={HOUSES[4]} width={390} height={253} reduceMotion={false} paused />);
    expect(withRepeat).not.toHaveBeenCalled();
  });

  test('the night tint is only laid over daytime scenes', async () => {
    const day = HOUSES.find((h) => !h.dark)!;
    const dark = HOUSES.find((h) => h.dark)!;
    const tinted = (t: ReactTestRenderer) =>
      t.root.findAll((n) => {
        const st = n.props?.style;
        return Array.isArray(st) && st.some((x: any) => x && x.backgroundColor === 'rgba(24, 34, 78, 0.45)');
      }).length > 0;
    const a = await render(<HouseScene def={day} width={390} height={253} reduceMotion night />);
    expect(tinted(a)).toBe(true);
    act(() => a.unmount());
    const b = await render(<HouseScene def={dark} width={390} height={253} reduceMotion night />);
    expect(tinted(b)).toBe(false);
    act(() => b.unmount());
    const c = await render(<HouseScene def={day} width={390} height={253} reduceMotion />);
    expect(tinted(c)).toBe(false);
  });

  test('the still card version is a single picture', async () => {
    for (const house of HOUSES) {
      const t = await render(<HouseStill def={house} width={135} height={90} />);
      expect(svgCount(t)).toBe(1);
      act(() => t.unmount());
      tree = null;
    }
  });

  test('the SVG text for the render sheets is well formed', () => {
    for (const house of HOUSES) {
      const outside = houseSvgMarkup(house, 600, { dog: { breed: 'corgi', state: 'happy' } });
      const inside = houseInnerMarkup(house, { dog: { breed: 'pug', inside: true }, marks: true });
      for (const svg of [outside, inside]) {
        expect(svg).not.toMatch(/NaN|undefined/);
        expect((svg.match(/<g/g) ?? []).length).toBe((svg.match(/<\/g>/g) ?? []).length);
      }
      expect(outside.startsWith('<svg')).toBe(true);
      expect(outside.endsWith('</svg>')).toBe(true);
    }
  });
});
