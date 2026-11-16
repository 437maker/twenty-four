// useIdleDirector.ts — decides which idle moment the dog plays next, and when.
//
// Every 6 to 14 seconds, while she is on screen and nothing else is playing,
// the director picks one moment from moments.ts and asks the rig to play it.
//
// The rules of a pick (pickMoment, a pure function the tests drive directly):
//   • never a moment that was one of the last 4
//   • rare moments (roll over, butterfly) come up about 5 times in 100 each
//   • everything else is a weighted draw; moments that fit the time of day,
//     the outfit, or the house weigh three times as much
//   • under Reduce Motion only the gentle moments are offered

import { useEffect, useRef } from 'react';

import { IDLE_MOMENTS } from './moments';
import type { Moment, MomentBase } from './moments';

export const HISTORY_LENGTH = 4;
export const RARE_SHARE = 0.05;
export const GAP_RANGE_MS: [number, number] = [6000, 14000];

export interface MomentContext {
  morning?: boolean;   // 5am to 10am
  evening?: boolean;   // 8pm onward
  proud?: boolean;     // wearing the raincoat or a hero suit
  inside?: boolean;    // resting inside the house
}

export interface PickOptions {
  base: MomentBase;
  reduceMotion: boolean;
  context?: MomentContext;
}

// Which moments could play right now, before looking at the history.
export function eligibleMoments(opts: PickOptions, pool: readonly Moment[] = IDLE_MOMENTS): Moment[] {
  const c = opts.context ?? {};
  return pool.filter((m) => {
    if (m.base !== opts.base || m.when === 'event') return false;
    if (opts.reduceMotion && !m.gentle) return false;
    if (m.when === 'morning') return !!c.morning;
    if (m.when === 'evening') return !!c.evening;
    if (m.when === 'proud') return !!c.proud;
    if (m.when === 'inside') return !!c.inside;
    return true; // 'always' and 'asleep'
  });
}

// One pick. `rand` returns a number in [0, 1); `history` is the ids of the
// moments already played, newest last.
export function pickMoment(
  rand: () => number,
  history: readonly string[],
  opts: PickOptions,
  pool: readonly Moment[] = IDLE_MOMENTS,
): Moment | null {
  const all = eligibleMoments(opts, pool);
  if (all.length === 0) return null;
  const recent = history.slice(-HISTORY_LENGTH);
  let fresh = all.filter((m) => !recent.includes(m.id));
  // With very few moments on offer (Reduce Motion, asleep) there may be
  // nothing unplayed left. Then only the one just played is ruled out.
  if (fresh.length === 0) {
    const last = recent[recent.length - 1];
    fresh = all.filter((m) => m.id !== last);
    if (fresh.length === 0) fresh = all;
  }

  const rare = fresh.filter((m) => m.rare);
  const common = fresh.filter((m) => !m.rare);
  const u = rand();
  if (common.length === 0 || u < rare.length * RARE_SHARE) {
    const list = rare.length ? rare : common;
    return list[Math.min(list.length - 1, Math.floor(u / RARE_SHARE))] ?? list[0];
  }
  const total = common.reduce((sum, m) => sum + m.weight, 0);
  let at = rand() * total;
  for (const m of common) {
    at -= m.weight;
    if (at < 0) return m;
  }
  return common[common.length - 1];
}

// A small seeded random number generator (mulberry32), so a test can make
// the same 10,000 picks every time.
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The time-of-day part of the context.
export function timeContext(now: Date): Pick<MomentContext, 'morning' | 'evening'> {
  const h = now.getHours();
  return { morning: h >= 5 && h < 10, evening: h >= 20 || h < 5 };
}

// The outfits she is proud of: the raincoat and the ten hero suits.
export function isProudOutfit(outfitId: string | undefined | null): boolean {
  return !!outfitId && (outfitId === 'outfit_raincoat' || outfitId.startsWith('outfit_hero_'));
}

export interface DirectorOptions extends PickOptions {
  enabled: boolean;                    // on screen, focused, and allowed to play
  isBusy: () => boolean;               // something else is playing (a reaction, a petting stroke)
  play: (moment: Moment) => void;
}

// Runs the picks on a timer. All of it is JavaScript timers that *start* an
// animation; the frames themselves are made on the UI thread by the rig.
export function useIdleDirector({ enabled, base, reduceMotion, context, isBusy, play }: DirectorOptions): void {
  const history = useRef<string[]>([]);
  const greeted = useRef(false);
  const live = useRef({ base, reduceMotion, context, isBusy, play });
  live.current = { base, reduceMotion, context, isBusy, play };

  useEffect(() => {
    if (!enabled) return undefined;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = (extra: number) => {
      const gap = GAP_RANGE_MS[0] + Math.random() * (GAP_RANGE_MS[1] - GAP_RANGE_MS[0]);
      timer = setTimeout(tick, gap + extra);
    };
    const tick = () => {
      const now = live.current;
      if (now.isBusy()) {
        schedule(0);
        return;
      }
      const opts = { base: now.base, reduceMotion: now.reduceMotion, context: now.context };
      let moment = pickMoment(Math.random, history.current, opts);
      // The first thing she does on a morning visit is the big stretch.
      if (!greeted.current && now.context?.morning && now.base === 'awake' && !now.reduceMotion) {
        moment = IDLE_MOMENTS.find((m) => m.id === 'morningStretch') ?? moment;
      }
      greeted.current = true;
      if (!moment) {
        schedule(0);
        return;
      }
      history.current = [...history.current, moment.id].slice(-HISTORY_LENGTH);
      now.play(moment);
      schedule(moment.ms); // the gap is counted from the end of the moment
    };
    schedule(0);
    return () => clearTimeout(timer);
  }, [enabled, base]);
}
