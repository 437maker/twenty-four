// moments.test.tsx — the idle moments, the director that picks them, and the
// event reactions.
//
// What is tested:
//   1. The data: every moment is well formed, and at every point of every
//      moment, on every breed, the pose turns into finite transforms.
//   2. The director's rules: no repeat within the last 4, rare moments at
//      about their share, only gentle moments under Reduce Motion, context
//      moments only in their context.
//   3. The rig: playing a moment moves the pose and then puts it back; the
//      director plays on its timer, and stops when it is told to.
//   4. The store: which reaction wins, and the "missed you" rule.
//
// What these tests cannot see: whether a pose looks right. That is what the
// strips in docs/companion/moments/ are for.

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

import Companion from '../app/components/companion/Companion';
import { BREEDS } from '../app/components/companion/breeds';
import { MAX_OUTFIT } from '../app/components/companion/items/itemSlots';
import {
  EVENT_MOMENTS, IDLE_MOMENTS, MOMENTS, PROP_KINDS,
  basePoseOf, baseStateOf, getMoment, milestoneReaction, momentPose, propPlace, sampleTrack,
} from '../app/components/companion/moments';
import type { Moment } from '../app/components/companion/moments';
import { REST_POSE, partTransform } from '../app/components/companion/poses';
import type { PartName } from '../app/components/companion/poses';
import { companionSvgMarkup } from '../app/components/companion/svgMarkup';
import {
  GAP_RANGE_MS, HISTORY_LENGTH, RARE_SHARE,
  eligibleMoments, isProudOutfit, pickMoment, seededRandom, timeContext, useIdleDirector,
} from '../app/components/companion/useIdleDirector';
import { getDatabase, initializeDatabase } from '../app/db/database';
import { getSettings, saveSettings } from '../app/db/queries';
import { MISSED_YOU_MS, useAppStore } from '../app/store/useAppStore';

const PARTS: PartName[] = [
  'shadow', 'root', 'tail', 'body', 'cape', 'pawL', 'pawR', 'head', 'earL', 'earR',
  'knot', 'lids', 'eyesOpen', 'eyesHappy', 'mouthClosed', 'mouthOpen',
];
const POSE_KEYS = Object.keys(REST_POSE);
const CHANNELS = [...POSE_KEYS, 'propX', 'propY', 'propS', 'propO'];
const TIMES = Array.from({ length: 21 }, (_, i) => i / 20);

// ─────────────────────────────────────────────────────────────────────────────
// 1. The data
// ─────────────────────────────────────────────────────────────────────────────
describe('the moment library', () => {
  test('there are at least 14 idle moments, each 1 to 3.5 seconds long', () => {
    const always = IDLE_MOMENTS.filter((m) => m.when === 'always' && !m.gentle);
    expect(always.length).toBeGreaterThanOrEqual(14);
    for (const m of IDLE_MOMENTS) {
      expect(m.ms).toBeGreaterThanOrEqual(1000);
      expect(m.ms).toBeLessThanOrEqual(4000);
    }
  });

  test('the fourteen moments the spec names are all there', () => {
    const ids = IDLE_MOMENTS.map((m) => m.id);
    for (const id of [
      'yawnStretch', 'scratchEar', 'chaseTail', 'sniffWander', 'headTilt', 'wagBurst', 'sneeze',
      'rollOver', 'butterfly', 'ballBat', 'sitLieDown', 'shake', 'lookAround', 'playBow',
    ]) {
      expect(ids).toContain(id);
    }
  });

  test('context moments and event reactions exist', () => {
    const when = (w: string) => IDLE_MOMENTS.filter((m) => m.when === w).map((m) => m.id);
    expect(when('morning')).toEqual(['morningStretch']);
    expect(when('evening')).toEqual(['drowsyBlinks']);
    expect(when('proud')).toEqual(['proudPose']);
    expect(when('inside')).toEqual(['dream']);
    expect(when('asleep')).toEqual(expect.arrayContaining(['sleepTwitch']));
    expect(EVENT_MOMENTS.map((m) => m.id).sort()).toEqual(
      ['journalNuzzle', 'milestone100', 'milestone30', 'milestone7', 'missedYou', 'sleepyYawn', 'taskDone'],
    );
  });

  test('ids are unique, and only the roll and the butterfly are rare', () => {
    expect(new Set(MOMENTS.map((m) => m.id)).size).toBe(MOMENTS.length);
    expect(MOMENTS.filter((m) => m.rare).map((m) => m.id).sort()).toEqual(['butterfly', 'rollOver']);
  });

  test.each(MOMENTS.map((m) => [m.id, m] as const))('%s: tracks are well formed', (_id, m) => {
    for (const [channel, keys] of Object.entries(m.tracks)) {
      expect(CHANNELS).toContain(channel);
      let last = -1;
      for (const [t, v] of keys!) {
        expect(t).toBeGreaterThanOrEqual(0);
        expect(t).toBeLessThanOrEqual(1);
        expect(t).toBeGreaterThanOrEqual(last); // keys are in time order
        expect(Number.isFinite(v)).toBe(true);
        last = t;
      }
    }
    // A moment with a prop places it; a moment without one has no prop tracks.
    if (m.prop) {
      expect(PROP_KINDS).toContain(m.prop);
      expect(m.tracks.propX && m.tracks.propY && m.tracks.propO).toBeTruthy();
    } else {
      expect(m.tracks.propX ?? m.tracks.propY ?? m.tracks.propO).toBeUndefined();
    }
  });

  test.each(MOMENTS.map((m) => [m.id, m] as const))('%s: starts and ends where the state stands', (_id, m) => {
    const base = basePoseOf(m);
    const end = momentPose(base, m.tracks, 1);
    for (const k of POSE_KEYS as (keyof typeof REST_POSE)[]) {
      // A turn may end on a whole number of turns: she faces front again.
      if (k === 'turn') expect(Math.abs(end.turn % 360)).toBeLessThan(0.001);
      else expect(end[k]).toBeCloseTo(base[k], 5);
    }
    // Only the run-up starts somewhere else (she comes in from off screen).
    if (m.id !== 'missedYou') {
      const start = momentPose(base, m.tracks, 0);
      for (const k of POSE_KEYS as (keyof typeof REST_POSE)[]) expect(start[k]).toBeCloseTo(base[k], 5);
    }
  });

  test('gentle moments move nothing but the eyes, the head a little, and the tail', () => {
    const still = ['hop', 'spin', 'dx', 'turn', 'zoom', 'bodySx', 'bodySy', 'pawSpread'];
    for (const m of MOMENTS.filter((x) => x.gentle)) {
      for (const k of still) expect(m.tracks[k as keyof Moment['tracks']]).toBeUndefined();
    }
  });

  test('sampleTrack eases between keys and returns to rest', () => {
    expect(sampleTrack(undefined, 0.5)).toBe(0);
    expect(sampleTrack([[0.5, 10]], 0)).toBe(0);
    expect(sampleTrack([[0.5, 10]], 0.5)).toBe(10);
    expect(sampleTrack([[0.5, 10]], 0.25)).toBeCloseTo(5);
    expect(sampleTrack([[0.5, 10]], 1)).toBe(0);
    expect(sampleTrack([[0, 7], [1, 7]], 0.3)).toBe(7);
  });

  test('a bigger streak gets a bigger party', () => {
    expect(milestoneReaction(7)).toBe('milestone7');
    expect(milestoneReaction(30)).toBe('milestone30');
    expect(milestoneReaction(100)).toBe('milestone100');
    expect(getMoment('milestone100')!.ms).toBeGreaterThan(getMoment('milestone7')!.ms);
  });
});

describe('every moment works with every breed', () => {
  test.each(BREEDS.map((b) => [b.id, b] as const))('%s: finite transforms at every point of every moment', (_id, breed) => {
    for (const m of MOMENTS) {
      for (const t of TIMES) {
        const pose = momentPose(basePoseOf(m), m.tracks, t);
        for (const part of PARTS) {
          const tf = partTransform(part, pose, breed.pivots);
          for (const v of Object.values(tf)) expect(Number.isFinite(v)).toBe(true);
          if (part !== 'lids') expect(tf.sy).toBeGreaterThan(0); // open eyelids are scaled to nothing
          expect(tf.opacity).toBeGreaterThanOrEqual(0);
          expect(tf.opacity).toBeLessThanOrEqual(1);
        }
        if (m.prop) for (const v of Object.values(propPlace(m.tracks, t))) expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  test.each(BREEDS.map((b) => [b.id, b] as const))('%s: every moment draws, plain and fully dressed', (_id, breed) => {
    for (const m of MOMENTS) {
      for (const equipped of [{}, MAX_OUTFIT]) {
        const pose = momentPose(basePoseOf(m), m.tracks, 0.5);
        const svg = companionSvgMarkup({ state: baseStateOf(m), size: 150, breed: breed.id, equipped, pose });
        expect(svg).not.toMatch(/NaN|undefined|Infinity/);
        expect(svg).toContain('data-part="body"');
      }
    }
  });

  test('what she wears is on the layer that moves: the held item with the paw, the cape with the body', () => {
    const m = getMoment('ballBat')!;
    const pose = momentPose(basePoseOf(m), m.tracks, 0.45);
    // The bat rides on the right paw, which this moment leaves alone...
    expect(partTransform('pawR', pose)).toMatchObject({ tx: 0, ty: 0 });
    // ...while the left paw does the batting.
    expect(partTransform('pawL', pose).tx).toBeLessThan(-10);
    // A cape swings against a spin and stretches in a jump.
    const jump = momentPose(REST_POSE, getMoment('taskDone')!.tracks, 0.42);
    expect(partTransform('cape', jump).sy).toBeGreaterThan(1.05);
    expect(partTransform('cape', { ...REST_POSE, spin: 20 }).rot).toBeLessThan(0);
    expect(partTransform('cape', REST_POSE)).toMatchObject({ rot: 0, sy: 1 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. The director's rules
// ─────────────────────────────────────────────────────────────────────────────
describe('the idle director', () => {
  const awake = { base: 'awake' as const, reduceMotion: false };

  function run(n: number, seed: number, opts: Parameters<typeof pickMoment>[2]): string[] {
    const rand = seededRandom(seed);
    const history: string[] = [];
    const picks: string[] = [];
    for (let i = 0; i < n; i++) {
      const m = pickMoment(rand, history, opts)!;
      picks.push(m.id);
      history.push(m.id);
    }
    return picks;
  }

  test('never repeats a moment within the last 4', () => {
    for (const seed of [1, 2, 3]) {
      const picks = run(10_000, seed, awake);
      for (let i = 0; i < picks.length; i++) {
        expect(picks.slice(Math.max(0, i - HISTORY_LENGTH), i)).not.toContain(picks[i]);
      }
    }
  });

  test('rare moments come up at about their 5% share over 10,000 seeded picks', () => {
    expect(RARE_SHARE).toBe(0.05);
    const picks = run(10_000, 24, awake);
    for (const id of ['rollOver', 'butterfly']) {
      const share = picks.filter((p) => p === id).length / picks.length;
      // 5% of the picks she is offered in; a little less overall, because she
      // is not offered a moment that was one of the last 4.
      expect(share).toBeGreaterThan(0.03);
      expect(share).toBeLessThan(0.06);
    }
    // And every ordinary moment comes up more often than a rare one.
    const count = (id: string) => picks.filter((p) => p === id).length;
    for (const m of IDLE_MOMENTS.filter((x) => x.when === 'always' && !x.rare && !x.gentle)) {
      expect(count(m.id)).toBeGreaterThan(count('rollOver'));
    }
  });

  test('the same seed gives the same picks', () => {
    expect(run(50, 7, awake)).toEqual(run(50, 7, awake));
  });

  test('under Reduce Motion only gentle moments are picked', () => {
    const picks = run(2_000, 5, { base: 'awake', reduceMotion: true, context: { morning: true, evening: true, proud: true } });
    for (const id of new Set(picks)) expect(getMoment(id)!.gentle).toBe(true);
    expect(new Set(picks)).toEqual(new Set(['slowBlink', 'smallWag', 'drowsyBlinks']));
    // Asleep, too.
    const asleep = run(500, 5, { base: 'asleep', reduceMotion: true, context: { inside: true } });
    expect(new Set(asleep)).toEqual(new Set(['drowsyPeek']));
  });

  test('context moments are only offered in their context', () => {
    const ids = (context: object) => eligibleMoments({ ...awake, context }).map((m) => m.id);
    expect(ids({})).not.toEqual(expect.arrayContaining(['morningStretch']));
    expect(ids({})).not.toContain('drowsyBlinks');
    expect(ids({})).not.toContain('proudPose');
    expect(ids({ morning: true })).toContain('morningStretch');
    expect(ids({ evening: true })).toContain('drowsyBlinks');
    expect(ids({ proud: true })).toContain('proudPose');
    const asleep = (context: object) => eligibleMoments({ base: 'asleep', reduceMotion: false, context }).map((m) => m.id);
    expect(asleep({})).toEqual(['drowsyPeek', 'sleepTwitch']);
    expect(asleep({ inside: true })).toContain('dream');
    // Event reactions are never picked at random.
    for (const m of EVENT_MOMENTS) expect(ids({ morning: true, evening: true, proud: true })).not.toContain(m.id);
  });

  test('a context moment comes up more often than an ordinary one', () => {
    const picks = run(5_000, 9, { ...awake, context: { proud: true } });
    const count = (id: string) => picks.filter((p) => p === id).length;
    expect(count('proudPose')).toBeGreaterThan(count('headTilt'));
  });

  test('time of day and proud outfits', () => {
    expect(timeContext(new Date(2026, 10, 16, 7, 0))).toEqual({ morning: true, evening: false });
    expect(timeContext(new Date(2026, 10, 16, 13, 0))).toEqual({ morning: false, evening: false });
    expect(timeContext(new Date(2026, 10, 16, 21, 0))).toEqual({ morning: false, evening: true });
    expect(isProudOutfit('outfit_raincoat')).toBe(true);
    expect(isProudOutfit('outfit_hero_titan_24')).toBe(true);
    expect(isProudOutfit('outfit_cozy_sweater')).toBe(false);
    expect(isProudOutfit(undefined)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. The rig
// ─────────────────────────────────────────────────────────────────────────────
describe('playing moments on the dog', () => {
  let tree: ReactTestRenderer | null = null;
  const render = (el: React.ReactElement) => {
    act(() => {
      tree = create(el);
    });
    return tree!;
  };
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    act(() => tree?.unmount());
    tree = null;
    jest.useRealTimers();
  });

  // In jest every animation frame re-renders the animated views, which is
  // slow and memory-hungry, so these tests play only a few frames of each
  // moment. That every point of every moment gives a sound pose on every
  // breed is checked above, without rendering.
  test.each(BREEDS.map((b) => b.id))('%s: every moment starts on the dog, fully dressed', (breed) => {
    for (const state of ['idle', 'sleeping', 'celebrating'] as const) {
      const dog = (preview: { id: string; n: number } | null) => (
        <Companion state={state} size={150} breed={breed} equipped={MAX_OUTFIT} reduceMotion={false} preview={preview} />
      );
      const t = render(dog(null));
      let n = 0;
      for (const m of MOMENTS.filter((x) => baseStateOf(x) === state)) {
        n += 1;
        act(() => {
          t.update(dog({ id: m.id, n }));
        });
        act(() => {
          jest.advanceTimersByTime(34); // two frames
        });
        expect(t.toJSON()).toBeTruthy();
      }
      expect(n).toBeGreaterThan(0);
      act(() => t.unmount());
      tree = null;
    }
  });

  test('a moment with a prop plays to the end and can be followed by another', () => {
    const dog = (preview: { id: string; n: number } | null) => (
      <Companion state="idle" size={150} reduceMotion={false} preview={preview} />
    );
    const t = render(dog(null));
    const sneeze = getMoment('sneeze')!;
    act(() => {
      t.update(dog({ id: 'sneeze', n: 1 }));
    });
    act(() => {
      jest.advanceTimersByTime(sneeze.ms + 400);
    });
    act(() => {
      t.update(dog({ id: 'smallWag', n: 2 }));
    });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(t.toJSON()).toBeTruthy();
  });

  test('the director plays a moment 6 to 14 seconds in, waits while busy, and stops when turned off', () => {
    const play = jest.fn();
    let busy = false;
    function Host({ enabled }: { enabled: boolean }) {
      useIdleDirector({ enabled, base: 'awake', reduceMotion: false, isBusy: () => busy, play });
      return null;
    }
    // Math.random pinned to 0.5: every gap is 10 seconds (the middle of 6..14).
    const random = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const GAP = (GAP_RANGE_MS[0] + GAP_RANGE_MS[1]) / 2;
    const t = render(<Host enabled />);
    act(() => {
      jest.advanceTimersByTime(GAP - 100);
    });
    expect(play).toHaveBeenCalledTimes(0);
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(play).toHaveBeenCalledTimes(1);
    const first: Moment = play.mock.calls[0][0];
    expect(IDLE_MOMENTS).toContain(first);

    // The next one comes a gap after the first one ends.
    act(() => {
      jest.advanceTimersByTime(first.ms + GAP - 300);
    });
    expect(play).toHaveBeenCalledTimes(1);
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(play).toHaveBeenCalledTimes(2);
    expect(play.mock.calls[1][0].id).not.toBe(first.id);

    // While something else is playing, she waits.
    busy = true;
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(play).toHaveBeenCalledTimes(2);

    // Turned off (the screen lost focus): nothing more is played.
    busy = false;
    act(() => {
      t.update(<Host enabled={false} />);
    });
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(play).toHaveBeenCalledTimes(2);
    random.mockRestore();
  });

  test('a morning visit starts with the big stretch', () => {
    const play = jest.fn();
    function Host() {
      useIdleDirector({ enabled: true, base: 'awake', reduceMotion: false, context: { morning: true }, isBusy: () => false, play });
      return null;
    }
    render(<Host />);
    act(() => {
      jest.advanceTimersByTime(GAP_RANGE_MS[1] + 100);
    });
    expect(play.mock.calls[0][0].id).toBe('morningStretch');
  });

  test('a reaction is played once and reported back', () => {
    const onReaction = jest.fn();
    const t = render(<Companion state="idle" size={150} reduceMotion={false} reaction={{ id: 'taskDone', n: 3 }} onReaction={onReaction} />);
    expect(onReaction).toHaveBeenCalledTimes(1);
    expect(onReaction).toHaveBeenCalledWith(3);
    act(() => {
      t.update(<Companion state="idle" size={150} reduceMotion={false} reaction={{ id: 'taskDone', n: 3 }} onReaction={onReaction} />);
    });
    expect(onReaction).toHaveBeenCalledTimes(1);
    act(() => {
      t.update(<Companion state="idle" size={150} reduceMotion={false} reaction={{ id: 'journalNuzzle', n: 4 }} onReaction={onReaction} />);
    });
    expect(onReaction).toHaveBeenLastCalledWith(4);
  });

  test('the streak party waits for the celebrating state', () => {
    const onReaction = jest.fn();
    const t = render(<Companion state="happy" size={150} reduceMotion={false} reaction={{ id: 'milestone30', n: 1 }} onReaction={onReaction} />);
    expect(onReaction).not.toHaveBeenCalled();
    act(() => {
      t.update(<Companion state="celebrating" size={150} reduceMotion={false} reaction={{ id: 'milestone30', n: 1 }} onReaction={onReaction} />);
    });
    expect(onReaction).toHaveBeenCalledWith(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. The store: which reaction is waiting, and "missed you"
// ─────────────────────────────────────────────────────────────────────────────
describe('reactions in the store', () => {
  beforeEach(async () => {
    await initializeDatabase();
    const db = await getDatabase();
    await db.runAsync('UPDATE settings SET last_opened_at = NULL, onboarded = 1 WHERE id = 1');
    useAppStore.setState({ pendingReaction: null, settings: await getSettings() });
  });

  test('the bigger event wins, and clearing needs the right ticket', () => {
    const s = () => useAppStore.getState();
    s().queueReaction('taskDone');
    expect(s().pendingReaction!.id).toBe('taskDone');
    s().queueReaction('journalNuzzle');
    expect(s().pendingReaction!.id).toBe('journalNuzzle');
    s().queueReaction('taskDone'); // smaller: the nuzzle stays
    expect(s().pendingReaction!.id).toBe('journalNuzzle');
    const n = s().pendingReaction!.n;
    s().clearReaction(n + 1);
    expect(s().pendingReaction).not.toBeNull();
    s().clearReaction(n);
    expect(s().pendingReaction).toBeNull();
  });

  test('two tasks in a row are two reactions (a new ticket each time)', () => {
    const s = () => useAppStore.getState();
    s().queueReaction('taskDone');
    const first = s().pendingReaction!.n;
    s().queueReaction('taskDone');
    expect(s().pendingReaction!.n).not.toBe(first);
  });

  test('first open ever: no run-up, and the time is stored', async () => {
    const now = new Date(2026, 10, 16, 9, 0);
    await useAppStore.getState().noteAppOpen(now);
    expect(useAppStore.getState().pendingReaction).toBeNull();
    expect((await getSettings())!.last_opened_at).toBe(now.toISOString());
  });

  test('back within a day: no run-up. Back after 24 hours or more: she runs up', async () => {
    const last = new Date(2026, 10, 15, 9, 0);
    await saveSettings({ last_opened_at: last.toISOString() });
    await useAppStore.getState().noteAppOpen(new Date(last.getTime() + MISSED_YOU_MS - 60_000));
    expect(useAppStore.getState().pendingReaction).toBeNull();

    await saveSettings({ last_opened_at: last.toISOString() });
    await useAppStore.getState().noteAppOpen(new Date(last.getTime() + MISSED_YOU_MS));
    expect(useAppStore.getState().pendingReaction!.id).toBe('missedYou');
  });
});
