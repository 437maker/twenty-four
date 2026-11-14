// yardRest.test.tsx — the dog going into her house: the rest state machine,
// auto-rest during a Sleep block, the walk math, and the animated component.

import React from 'react';
import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';

import Companion from '../app/components/companion/Companion';
import { HOUSES } from '../app/components/companion/houses';
import YardDog from '../app/components/companion/houses/YardDog';
import {
  DOOR_FADE_MS, REST_START, WALK_MS, currentSleepBlock, isInsideOrGoing, restReducer, walkPose,
} from '../app/components/companion/houses/restMachine';
import type { RestEvent, RestState, WalkPoints } from '../app/components/companion/houses/restMachine';
import { sceneFit } from '../app/components/companion/houses/types';
import type { Equipped } from '../app/components/companion/items/itemSlots';

const run = (events: RestEvent[], from: RestState = REST_START): RestState => events.reduce(restReducer, from);

// ─────────────────────────────────────────────────────────────────────────────
describe('rest state machine', () => {
  test('a tap takes her outside → entering → inside, and another tap brings her back', () => {
    let s = REST_START;
    expect(s.phase).toBe('outside');
    s = restReducer(s, 'tap');
    expect(s.phase).toBe('entering');
    s = restReducer(s, 'arrived');
    expect(s.phase).toBe('inside');
    s = restReducer(s, 'tap');
    expect(s.phase).toBe('exiting');
    s = restReducer(s, 'arrived');
    expect(s.phase).toBe('outside');
    expect(s).toEqual(REST_START);
  });

  test('"arrived" does nothing when she is not walking', () => {
    expect(restReducer(REST_START, 'arrived')).toBe(REST_START);
    const inside = run(['tap', 'arrived']);
    expect(restReducer(inside, 'arrived')).toBe(inside);
  });

  test('a tap in the middle of a walk turns her around', () => {
    expect(run(['tap', 'tap']).phase).toBe('exiting');
    expect(run(['tap', 'arrived', 'tap', 'tap']).phase).toBe('entering');
  });

  test('auto-rest: a Sleep block sends her in, and its end brings her out', () => {
    let s = restReducer(REST_START, 'sleepStart');
    expect(s).toMatchObject({ phase: 'entering', auto: true, inSleep: true });
    s = restReducer(s, 'arrived');
    expect(s.phase).toBe('inside');
    s = restReducer(s, 'sleepEnd');
    expect(s).toMatchObject({ phase: 'exiting', inSleep: false });
    s = restReducer(s, 'arrived');
    expect(s).toEqual(REST_START);
  });

  test('a tap interrupts auto-rest, and she stays out for the rest of that Sleep block', () => {
    let s = run(['sleepStart', 'arrived']);
    s = restReducer(s, 'tap');
    expect(s).toMatchObject({ phase: 'exiting', dismissed: true, inSleep: true });
    s = restReducer(s, 'arrived');
    expect(s.phase).toBe('outside');
    // The block is still running (the yard reports it again on every re-render).
    s = restReducer(s, 'sleepStart');
    expect(s.phase).toBe('outside');
    // The next Sleep block sends her in again.
    s = run(['sleepEnd', 'sleepStart'], s);
    expect(s).toMatchObject({ phase: 'entering', auto: true, dismissed: false });
  });

  test('a tap also interrupts her on the way in', () => {
    const s = run(['sleepStart', 'tap']);
    expect(s).toMatchObject({ phase: 'exiting', dismissed: true });
  });

  test('if the user sent her in, the end of a Sleep block does not bring her out', () => {
    const s = run(['tap', 'arrived', 'sleepStart', 'sleepEnd']);
    expect(s.phase).toBe('inside');
    expect(s.inSleep).toBe(false);
  });

  test('a Sleep block that starts while she is already inside leaves her there', () => {
    const s = run(['tap', 'arrived', 'sleepStart']);
    expect(s).toMatchObject({ phase: 'inside', auto: false, inSleep: true });
  });

  test('the user can send her back in after bringing her out', () => {
    const s = run(['sleepStart', 'arrived', 'tap', 'arrived', 'tap']);
    expect(s).toMatchObject({ phase: 'entering', dismissed: false, auto: false });
  });

  test('sleepEnd with no Sleep block running changes nothing', () => {
    expect(restReducer(REST_START, 'sleepEnd')).toBe(REST_START);
  });

  test('isInsideOrGoing', () => {
    expect(isInsideOrGoing('inside')).toBe(true);
    expect(isInsideOrGoing('entering')).toBe(true);
    expect(isInsideOrGoing('outside')).toBe(false);
    expect(isInsideOrGoing('exiting')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('currentSleepBlock', () => {
  const sleep = (date: string, start_time: string, duration_hours: number) => ({ date, start_time, duration_hours, pillar: 'sleep' });
  const at = (iso: string) => new Date(iso);

  test('inside a Sleep block: returns when it ends', () => {
    const block = currentSleepBlock([sleep('2026-05-15', '13:00', 1.5)], at('2026-05-15T13:30:00'));
    expect(block?.endsAt).toEqual(at('2026-05-15T14:30:00'));
  });

  test('before it starts and at the minute it ends: no block', () => {
    const tasks = [sleep('2026-05-15', '13:00', 1)];
    expect(currentSleepBlock(tasks, at('2026-05-15T12:59:00'))).toBeNull();
    expect(currentSleepBlock(tasks, at('2026-05-15T13:00:00'))).not.toBeNull();
    expect(currentSleepBlock(tasks, at('2026-05-15T14:00:00'))).toBeNull();
  });

  test('a block from yesterday evening still counts after midnight', () => {
    const tasks = [sleep('2026-05-14', '23:00', 8)];
    expect(currentSleepBlock(tasks, at('2026-05-15T03:00:00'))?.endsAt).toEqual(at('2026-05-15T07:00:00'));
    expect(currentSleepBlock(tasks, at('2026-05-15T07:30:00'))).toBeNull();
  });

  test('other pillars never count', () => {
    const tasks = [{ date: '2026-05-15', start_time: '09:00', duration_hours: 8, pillar: 'work' }];
    expect(currentSleepBlock(tasks, at('2026-05-15T10:00:00'))).toBeNull();
  });

  test('overlapping Sleep blocks: the latest end wins', () => {
    const tasks = [sleep('2026-05-15', '13:00', 1), sleep('2026-05-15', '13:30', 2)];
    expect(currentSleepBlock(tasks, at('2026-05-15T13:45:00'))?.endsAt).toEqual(at('2026-05-15T15:30:00'));
  });

  test('a damaged row is skipped', () => {
    const tasks = [sleep('2026-05-15', 'oops', 1), sleep('2026-05-15', '13:00', 0)];
    expect(currentSleepBlock(tasks, at('2026-05-15T13:10:00'))).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('walk math', () => {
  const w: WalkPoints = { ax: 100, ay: 250, dx: 270, dy: 210, rx: 272, ry: 150, restScale: 0.4 };

  test('0 = at her spot, full size and visible', () => {
    expect(walkPose(0, w)).toEqual({ x: 100, y: 250, scale: 1, opacity: 1 });
  });
  test('1 = at the door, small and invisible', () => {
    const d = walkPose(1, w);
    expect(d.x).toBeCloseTo(270);
    expect(d.y).toBeCloseTo(210);
    expect(d.scale).toBeCloseTo(0.4);
    expect(d.opacity).toBeCloseTo(0);
  });
  test('2 = at the rest spot, small and visible', () => {
    expect(walkPose(2, w)).toEqual({ x: 272, y: 150, scale: 0.4, opacity: 1 });
    expect(walkPose(1.5, w).opacity).toBeCloseTo(0.5);
  });
  test('she walks most of the way before she starts to fade', () => {
    expect(walkPose(0.6, w).opacity).toBe(1);
    expect(walkPose(0.4, w).scale).toBe(1);
    let last = 100;
    for (let i = 1; i <= 10; i++) {
      const x = walkPose(i / 10, w).x;
      expect(x).toBeGreaterThanOrEqual(last);
      last = x;
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('<YardDog>', () => {
  const house = HOUSES[0];
  const fit = sceneFit(390, 253);
  const WORN: Equipped = { head: 'acc_party_hat', neck: 'acc_bow_tie' };

  let tree: ReactTestRenderer | null = null;
  const base = {
    house, fit, name: 'Nova', breed: 'corgi', equipped: WORN, reduceMotion: false, inSleepBlock: false,
  };
  async function render(props: Partial<React.ComponentProps<typeof YardDog>> = {}): Promise<ReactTestRenderer> {
    await act(async () => {
      tree = create(<YardDog outsideState="idle" {...base} {...props} />);
    });
    return tree!;
  }
  async function update(props: Partial<React.ComponentProps<typeof YardDog>>): Promise<void> {
    await act(async () => {
      tree!.update(<YardDog outsideState="idle" {...base} {...props} />);
    });
  }
  const dog = () => tree!.root.findByType(Companion).props as React.ComponentProps<typeof Companion>;
  const press = (testID: string) => act(() => {
    tree!.root.findAll((n) => n.props.testID === testID && typeof n.props.onPress === 'function')[0].props.onPress();
  });
  const wait = (ms: number) => act(() => {
    jest.advanceTimersByTime(ms);
  });
  const buttonLabel = () =>
    tree!.root.findAll((n) => n.props.testID === 'yard-rest-button' && typeof n.props.onPress === 'function')[0].props.accessibilityLabel;

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    if (tree) {
      act(() => tree!.unmount());
      tree = null;
    }
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('outside she does what the yard says, wearing her items', async () => {
    await render({ outsideState: 'happy' });
    expect(dog().state).toBe('happy');
    expect(dog().equipped).toBe(WORN);
    expect(dog().breed).toBe('corgi');
    expect(buttonLabel()).toBe('Send Nova inside to rest');
  });

  test('tap the house: she walks in, then sleeps inside with her items still on', async () => {
    await render();
    press('yard-house');
    expect(dog().state).toBe('happy'); // trotting to the door
    expect(buttonLabel()).toBe('Wake Nova');
    wait(WALK_MS - 50);
    expect(dog().state).toBe('happy');
    wait(60);
    expect(dog().state).toBe('sleeping'); // through the door
    wait(DOOR_FADE_MS + 50);
    expect(dog().state).toBe('sleeping');
    expect(dog().label).toMatch(/resting inside/);
    expect(dog().equipped).toBe(WORN);
    expect(dog().size).toBeCloseTo(house.dog.size * fit.k); // same dog; only the view is scaled
  });

  test('tap again: she comes back out', async () => {
    await render({ outsideState: 'idle' });
    press('yard-rest-button');
    wait(WALK_MS + DOOR_FADE_MS + 50);
    expect(dog().state).toBe('sleeping');
    press('yard-house');
    wait(DOOR_FADE_MS + 20);
    expect(dog().state).toBe('happy'); // walking back
    wait(WALK_MS + 50);
    expect(dog().state).toBe('idle');
    expect(buttonLabel()).toBe('Send Nova inside to rest');
  });

  test('tapping the resting dog wakes her', async () => {
    await render();
    press('yard-house');
    wait(WALK_MS + DOOR_FADE_MS + 50);
    act(() => {
      dog().onPress!();
    });
    wait(DOOR_FADE_MS + WALK_MS + 50);
    expect(dog().state).toBe('idle');
  });

  test('auto-rest: she goes in when a Sleep block starts and comes out when it ends', async () => {
    await render({ inSleepBlock: false });
    expect(dog().state).toBe('idle');
    await update({ inSleepBlock: true });
    wait(WALK_MS + DOOR_FADE_MS + 50);
    expect(dog().state).toBe('sleeping');
    await update({ inSleepBlock: false });
    wait(DOOR_FADE_MS + WALK_MS + 50);
    expect(dog().state).toBe('idle');
  });

  test('opening the app during a Sleep block: she goes in by herself', async () => {
    await render({ inSleepBlock: true });
    wait(WALK_MS + DOOR_FADE_MS + 50);
    expect(dog().state).toBe('sleeping');
  });

  test('a tap interrupts auto-rest and she stays out while the block is still running', async () => {
    await render({ inSleepBlock: true });
    wait(WALK_MS + DOOR_FADE_MS + 50);
    press('yard-house');
    wait(DOOR_FADE_MS + WALK_MS + 50);
    expect(dog().state).toBe('idle');
    // The yard re-renders every minute with the block still on.
    await update({ inSleepBlock: true, outsideState: 'happy' });
    wait(WALK_MS + DOOR_FADE_MS + 50);
    expect(dog().state).toBe('happy');
    expect(buttonLabel()).toBe('Send Nova inside to rest');
  });

  test('Reduce Motion: no walk, she simply appears inside and outside', async () => {
    await render({ reduceMotion: true });
    press('yard-house');
    wait(400); // far less than the walk
    expect(dog().state).toBe('sleeping');
    expect(dog().label).toMatch(/resting inside/);
    press('yard-house');
    wait(400);
    expect(dog().state).toBe('idle');
  });

  test.each(HOUSES.map((h) => [h.id, h] as const))('%s: she can go in and come out', async (_id, h) => {
    await render({ house: h });
    press('yard-house');
    wait(WALK_MS + DOOR_FADE_MS + 50);
    expect(dog().state).toBe('sleeping');
    press('yard-house');
    wait(WALK_MS + DOOR_FADE_MS + 50);
    expect(dog().state).toBe('idle');
  });
});
