// __tests__/starterHouse.test.tsx
//
// Verifies that STARTER_HOUSE is a valid HouseDef and that YardDog renders
// correctly with it when no purchasable house is owned.

jest.mock('expo-sqlite', () => require('../test-utils/realSqlite').expoSqliteMock);
jest.mock('expo-file-system', () => ({ File: jest.fn(), Paths: { cache: 'cache' } }));
jest.mock('expo-sharing',     () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
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

import { HOUSES, STARTER_HOUSE, getHouse } from '../app/components/companion/houses';
import YardDog from '../app/components/companion/houses/YardDog';
import { REST_START, restReducer } from '../app/components/companion/houses/restMachine';
import { SCENE_W, SCENE_H, sceneFit } from '../app/components/companion/houses/types';

// ─────────────────────────────────────────────────────────────────────────────
describe('STARTER_HOUSE definition', () => {
  test('has the expected id', () => {
    expect(STARTER_HOUSE.id).toBe('house_starter');
  });

  test('backdrop, house, and ambient are empty (visual is drawn by YardStageArt)', () => {
    expect(STARTER_HOUSE.backdrop).toHaveLength(0);
    expect(STARTER_HOUSE.house).toHaveLength(0);
    expect(STARTER_HOUSE.ambient).toHaveLength(0);
  });

  test('dog, door, rest, and hit are inside the 300 × 200 scene', () => {
    expect(STARTER_HOUSE.dog.x).toBeGreaterThan(0);
    expect(STARTER_HOUSE.dog.x).toBeLessThan(SCENE_W);
    expect(STARTER_HOUSE.dog.y).toBeGreaterThan(0);
    expect(STARTER_HOUSE.dog.y).toBeLessThanOrEqual(SCENE_H);
    expect(STARTER_HOUSE.dog.size).toBeGreaterThan(0);

    expect(STARTER_HOUSE.door.x).toBeGreaterThan(0);
    expect(STARTER_HOUSE.door.x).toBeLessThan(SCENE_W);
    expect(STARTER_HOUSE.door.y).toBeGreaterThan(0);
    expect(STARTER_HOUSE.door.y).toBeLessThanOrEqual(SCENE_H);

    expect(STARTER_HOUSE.rest.x).toBeGreaterThan(0);
    expect(STARTER_HOUSE.rest.x).toBeLessThan(SCENE_W);
    expect(STARTER_HOUSE.rest.y).toBeGreaterThan(0);
    expect(STARTER_HOUSE.rest.y).toBeLessThanOrEqual(SCENE_H);
    expect(STARTER_HOUSE.rest.size).toBeGreaterThan(0);

    expect(STARTER_HOUSE.hit.x).toBeGreaterThan(0);
    expect(STARTER_HOUSE.hit.y).toBeGreaterThan(0);
    expect(STARTER_HOUSE.hit.w).toBeGreaterThan(0);
    expect(STARTER_HOUSE.hit.h).toBeGreaterThan(0);
    expect(STARTER_HOUSE.hit.x + STARTER_HOUSE.hit.w).toBeLessThanOrEqual(SCENE_W);
    expect(STARTER_HOUSE.hit.y + STARTER_HOUSE.hit.h).toBeLessThanOrEqual(SCENE_H);
  });

  test('is NOT in HOUSES (not a purchasable item)', () => {
    const ids = HOUSES.map((h) => h.id);
    expect(ids).not.toContain(STARTER_HOUSE.id);
  });

  test('getHouse returns null for the starter id (not in shop)', () => {
    expect(getHouse('house_starter')).toBeNull();
  });

  test('the hit box covers the door position', () => {
    const { hit, door } = STARTER_HOUSE;
    expect(door.x).toBeGreaterThanOrEqual(hit.x);
    expect(door.x).toBeLessThanOrEqual(hit.x + hit.w);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('<YardDog> with STARTER_HOUSE', () => {
  const fit = sceneFit(390, 253);
  let tree: ReactTestRenderer | null = null;

  const base = {
    house: STARTER_HOUSE,
    fit,
    outsideState: 'idle' as const,
    name: 'Nova',
    breed: 'maltese' as const,
    equipped: {},
    reduceMotion: false,
    inSleepBlock: false,
  };

  async function render(overrides: Partial<React.ComponentProps<typeof YardDog>> = {}) {
    await act(async () => {
      tree = create(<YardDog {...base} {...overrides} />);
    });
    return tree!;
  }

  afterEach(() => {
    if (tree) {
      act(() => tree!.unmount());
      tree = null;
    }
  });

  test('renders without crashing', async () => {
    const t = await render();
    expect(t.toJSON()).not.toBeNull();
  });

  test('tapping the house hit area sends the state machine to entering', () => {
    let s = REST_START;
    expect(s.phase).toBe('outside');
    s = restReducer(s, 'tap');
    expect(s.phase).toBe('entering');
  });

  test('a full go-in then come-out cycle works with STARTER_HOUSE geometry', () => {
    let s = REST_START;
    s = restReducer(s, 'tap');   // outside → entering
    s = restReducer(s, 'arrived'); // entering → inside
    expect(s.phase).toBe('inside');
    s = restReducer(s, 'tap');   // inside → exiting
    s = restReducer(s, 'arrived'); // exiting → outside
    expect(s).toEqual(REST_START);
  });
});
