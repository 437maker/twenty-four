// useCompanionRig.ts — the animation rig: every number that moves the dog.
//
// How it fits together
// --------------------
// A "pose" (poses.ts) is 15 numbers: ear angles, tail angle, eyelid, and so
// on. Each state has a key pose. On screen, the pose you see is
//
//     key pose (eased from the last state's pose)  +  loop offsets
//
// • The key pose lives in three shared values: `from`, `to`, and `mix`.
//   A state change copies the current pose into `from`, puts the new key pose
//   in `to`, and animates `mix` from 0 to 1. That is why states never snap.
// • Loop offsets are small shared values (breath, wag, hop, blink...) that
//   Reanimated animates on the UI thread with withRepeat / withSequence.
// • `pose` is a derived value that adds the two together every frame.
//   Each layer of <Companion> reads it and turns it into a transform.
//
// Nothing here calls setState while animating. JavaScript only *starts*
// animations (and schedules the random blink / ear-flop / head-tilt timers);
// the frames themselves are produced on the UI thread.

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { DerivedValue, SharedValue } from 'react-native-reanimated';

import type { NovaState } from '../../types';
import { POSES } from './poses';
import type { Pose } from './poses';

// ─── Timing constants (milliseconds unless noted) ─────────────────────────────
export const TRANSITION_MS = 340;        // ease between key poses (spec: 250–400)
export const BREATH_CYCLE_MS = 3200;     // idle breathing, one full in-and-out
export const SLEEP_BREATH_CYCLE_MS = 5000;
export const BLINK_HOLD_MS = 120;        // eyelids stay closed this long
export const BLINK_RANGE_MS: [number, number] = [2500, 6000];
export const REDUCED_BLINK_RANGE_MS: [number, number] = [10000, 14000];
export const EAR_FLOP_RANGE_MS: [number, number] = [6000, 10000];
export const HEAD_TILT_RANGE_MS: [number, number] = [7000, 12000];
export const WAG_HALF_MS = 166;          // happy wag: 3 full wags per second
export const PET_HOLD_MS = 1000;         // stroke her head this long to "pet"

type Frame = [value: number, duration: number, easing?: (t: number) => number];

const sine = Easing.inOut(Easing.sin);
const smooth = Easing.inOut(Easing.cubic);
const up = Easing.out(Easing.quad);
const down = Easing.in(Easing.quad);

// A little randomness so no two loops (or two dogs) move in lockstep.
function jitter(n: number, pct = 0.08): number {
  return n * (1 + (Math.random() * 2 - 1) * pct);
}
function between([min, max]: [number, number]): number {
  return min + Math.random() * (max - min);
}

function keyframes(frames: Frame[]) {
  const steps = frames.map(([v, d, e]) => withTiming(v, { duration: d, easing: e ?? sine }));
  return withSequence(...steps);
}

// Run `frames` forever. The value first eases to `rest`, and the frames must
// end on `rest`, because a non-reversing repeat restarts from where it began.
function loop(sv: SharedValue<number>, frames: Frame[], opts: { rest?: number; delay?: number } = {}) {
  const rest = opts.rest ?? 0;
  const repeating = withRepeat(keyframes(frames), -1, false);
  sv.value = withSequence(
    withTiming(rest, { duration: 200, easing: sine }),
    opts.delay ? withDelay(opts.delay, repeating) : repeating,
  );
}

// Swing back and forth between -amp and +amp forever.
function swing(sv: SharedValue<number>, amp: number, halfMs: number) {
  sv.value = withSequence(
    withTiming(-amp, { duration: halfMs / 2, easing: sine }),
    withRepeat(withTiming(amp, { duration: halfMs, easing: sine }), -1, true),
  );
}

function settle(sv: SharedValue<number>, to = 0, ms = 250) {
  sv.value = withTiming(to, { duration: ms, easing: sine });
}

function lerpPose(a: Pose, b: Pose, m: number): Pose {
  const out = {} as Pose;
  (Object.keys(a) as (keyof Pose)[]).forEach((k) => {
    out[k] = a[k] + (b[k] - a[k]) * m;
  });
  return out;
}

export interface RigOptions {
  state: NovaState;
  reduceMotion: boolean;
  paused: boolean;   // true while the screen is not focused
  hatOn: boolean;    // the celebration party hat is showing
  hasFx?: boolean;   // she is wearing an item with a looping effect (glow, halo, runes)
}

export interface CompanionRig {
  pose: DerivedValue<Pose>;
  fade: SharedValue<number>;    // whole-dog opacity, for the reduce-motion crossfade
  hat: SharedValue<number>;     // 0 = topknot tuft, 1 = party hat
  heart: SharedValue<number>;   // 0..1 progress of the tap heart (0 and 1 = hidden)
  sparks: SharedValue<number>;  // 0..1 looping progress of the celebration sparkles
  zzz: SharedValue<number>;     // 0..1 looping progress of the sleeping "z"s
  fx: SharedValue<number>;      // 0..1 looping progress for item effects (0 when still)
  tap: () => void;
  petStart: () => void;
  petMove: (side: number) => void; // -1 = finger at her left edge, +1 = right edge
  petEnd: () => void;
}

export const ITEM_FX_LOOP_MS = 6000;

export function useCompanionRig({ state, reduceMotion, paused, hatOn, hasFx = false }: RigOptions): CompanionRig {
  // ── Key pose ──
  const from = useSharedValue<Pose>(POSES[state]);
  const to = useSharedValue<Pose>(POSES[state]);
  const mix = useSharedValue(1);

  // ── Loop offsets ──
  const breath = useSharedValue(0);   // -1..1 → body scale ±2.5%
  const wag = useSharedValue(0);      // tail, degrees
  const hop = useSharedValue(0);      // whole dog, drawing units
  const squash = useSharedValue(0);   // body: + taller and thinner, - shorter and wider
  const spin = useSharedValue(0);     // whole dog, degrees
  const earL = useSharedValue(0);     // degrees
  const earR = useSharedValue(0);
  const knot = useSharedValue(0);     // topknot wobble, degrees
  const tilt = useSharedValue(0);     // head, degrees
  const blink = useSharedValue(0);    // 0..1 added to the eyelid

  // ── Reactions ──
  const tapSquash = useSharedValue(0);
  const tapSpin = useSharedValue(0);
  const lean = useSharedValue(0);     // head leans into the petting finger
  const pet = useSharedValue(0);      // 0..1 "being petted"
  const petWag = useSharedValue(0);

  // ── Effects ──
  const fade = useSharedValue(1);
  const hat = useSharedValue(hatOn ? 1 : 0);
  const heart = useSharedValue(0);
  const sparks = useSharedValue(0);
  const zzz = useSharedValue(0);
  const fx = useSharedValue(0);

  // Key pose + offsets, computed on the UI thread every frame.
  const pose = useDerivedValue<Pose>(() => {
    const a = from.value;
    const b = to.value;
    const m = mix.value;
    const sq = squash.value + tapSquash.value;
    const br = breath.value;
    return {
      hop: a.hop + (b.hop - a.hop) * m + hop.value,
      spin: a.spin + (b.spin - a.spin) * m + spin.value + tapSpin.value,
      bodySx: a.bodySx + (b.bodySx - a.bodySx) * m - sq * 0.7 - br * 0.012,
      bodySy: a.bodySy + (b.bodySy - a.bodySy) * m + sq + br * 0.025,
      headDx: a.headDx + (b.headDx - a.headDx) * m,
      headDy: a.headDy + (b.headDy - a.headDy) * m,
      headRot: a.headRot + (b.headRot - a.headRot) * m + tilt.value + lean.value,
      earL: a.earL + (b.earL - a.earL) * m + earL.value,
      earR: a.earR + (b.earR - a.earR) * m + earR.value,
      tail: a.tail + (b.tail - a.tail) * m + wag.value + petWag.value,
      knot: a.knot + (b.knot - a.knot) * m + knot.value,
      lid: Math.min(1, a.lid + (b.lid - a.lid) * m + blink.value),
      happyEyes: Math.max(a.happyEyes + (b.happyEyes - a.happyEyes) * m, pet.value),
      mouthOpen: a.mouthOpen + (b.mouthOpen - a.mouthOpen) * m,
      pawSpread: a.pawSpread + (b.pawSpread - a.pawSpread) * m,
    };
  });

  // Latest props for callbacks that should not be rebuilt on every change.
  const live = useRef({ reduceMotion, state });
  live.current = { reduceMotion, state };

  // ── State change: ease (or crossfade) to the new key pose ──
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const target = POSES[state];
    if (reduceMotion) {
      // Reduce Motion: nothing travels. Fade out, swap the pose, fade back in.
      fade.value = withTiming(0, { duration: 130 });
      const id = setTimeout(() => {
        from.value = target;
        to.value = target;
        mix.value = 1;
        hat.value = hatOn ? 1 : 0;
        fade.value = withTiming(1, { duration: 220 });
      }, 140);
      return () => {
        clearTimeout(id);
        fade.value = 1;
      };
    }
    // Each step below leaves the visible pose unchanged, so there is no jump:
    // freeze the current pose into `from`, rewind `mix`, then aim at the target.
    from.value = lerpPose(from.value, to.value, mix.value);
    mix.value = 0;
    to.value = target;
    mix.value = withTiming(1, { duration: TRANSITION_MS, easing: smooth });
    hat.value = withTiming(hatOn ? 1 : 0, { duration: TRANSITION_MS });
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, hatOn]);

  // ── Loops for the current state ──
  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();
    // Call `fn` again and again, waiting a random time in `range` between calls.
    const every = (range: [number, number], fn: () => void) => {
      const tick = () => {
        const id = setTimeout(() => {
          timers.delete(id);
          fn();
          tick();
        }, between(range));
        timers.add(id);
      };
      tick();
    };
    const doBlink = () => {
      blink.value = withSequence(
        withTiming(1, { duration: 70, easing: down }),
        withDelay(BLINK_HOLD_MS, withTiming(0, { duration: 90, easing: up })),
      );
    };
    const stopAll = () => {
      timers.forEach(clearTimeout);
      timers.clear();
      [breath, wag, hop, squash, spin, earL, earR, knot, tilt, blink, petWag].forEach((sv) => settle(sv));
      sparks.value = 0;
      zzz.value = 0;
      fx.value = 0;
    };

    if (paused) {
      stopAll();
      return undefined;
    }

    if (reduceMotion) {
      // No loops and no particles. A slow blink is the only sign of life.
      stopAll();
      if (state !== 'sleeping' && state !== 'celebrating') every(REDUCED_BLINK_RANGE_MS, doBlink);
      return stopAll;
    }

    // Item effects (glow pulse, halo bob, rune spin) run in every state, but
    // only while motion is allowed: this line is never reached under Reduce Motion.
    if (hasFx) {
      fx.value = 0;
      fx.value = withRepeat(withTiming(1, { duration: ITEM_FX_LOOP_MS, easing: Easing.linear }), -1, false);
    }

    if (state === 'idle') {
      swing(breath, 1, jitter(BREATH_CYCLE_MS / 2));
      swing(wag, 6, jitter(1150));
      every(BLINK_RANGE_MS, doBlink);
      every(EAR_FLOP_RANGE_MS, () => {
        // One ear flicks out, overshoots back, and settles.
        const ear = Math.random() < 0.5 ? earL : earR;
        ear.value = keyframes([[15, 130, up], [-5, 170], [2, 140], [0, 160]]);
      });
      every(HEAD_TILT_RANGE_MS, () => {
        const angle = (Math.random() < 0.5 ? -1 : 1) * jitter(6, 0.15);
        tilt.value = withSequence(
          withTiming(angle, { duration: 380, easing: smooth }),
          withDelay(jitter(1300, 0.3), withTiming(0, { duration: 420, easing: smooth })),
        );
        // Ears and topknot arrive a beat late (follow-through).
        knot.value = withDelay(90, keyframes([[-angle * 0.8, 300], [0, 380]]));
      });
    } else if (state === 'happy') {
      const rest = jitter(240, 0.3);
      swing(breath, 1, jitter(1300));
      swing(wag, 16, WAG_HALF_MS);
      // Hop: crouch (anticipation) → up → down → squash on landing → recover → rest.
      loop(hop, [[0, 120], [-9, 170, up], [0, 170, down], [0, 90], [0, 130], [0, rest]]);
      loop(squash, [[-0.06, 120], [0.05, 170, up], [0.02, 170, down], [-0.05, 90], [0, 130], [0, rest]]);
      // Ears and topknot follow the head a moment later.
      const ears: Frame[] = [[0, 120], [-2, 170], [12, 170], [16, 90], [-3, 130], [0, rest]];
      loop(earL, ears, { delay: 80 });
      loop(earR, ears, { delay: 110 });
      loop(knot, [[0, 120], [4, 170], [-6, 170], [-8, 90], [3, 130], [0, rest]], { delay: 60 });
      every(BLINK_RANGE_MS, doBlink);
    } else if (state === 'celebrating') {
      // The key pose is the top of the jump (hop = -14), so "on the ground"
      // is an offset of +14 and the peak goes a little above the key pose.
      const G = 14;
      swing(wag, 20, 150);
      loop(hop, [[G, 160], [-12, 240, up], [G, 230, down], [G, 90], [G, 170], [G, 160]], { rest: G });
      loop(squash, [[-0.1, 160], [0.08, 240, up], [0.03, 230, down], [-0.09, 90], [0, 170], [0, 160]]);
      // Wiggle in the air.
      loop(spin, [[0, 160], [-9, 120], [9, 120], [-6, 115], [5, 115], [0, 90], [0, 170], [0, 160]]);
      // Ears: pinned down on the ground, flying at the top, flopping on landing.
      const ears: Frame[] = [[-26, 160], [-30, 240], [2, 230], [8, 90], [-22, 170], [-26, 160]];
      loop(earL, ears, { rest: -26, delay: 70 });
      loop(earR, ears, { rest: -26, delay: 100 });
      loop(knot, [[0, 160], [5, 240], [-8, 230], [-10, 90], [4, 170], [0, 160]], { delay: 50 });
      sparks.value = 0;
      sparks.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.linear }), -1, false);
    } else {
      // sleeping
      swing(breath, 1, jitter(SLEEP_BREATH_CYCLE_MS / 2));
      settle(wag);
      zzz.value = 0;
      zzz.value = withRepeat(withTiming(1, { duration: 3600, easing: Easing.linear }), -1, false);
    }

    return stopAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, reduceMotion, paused, hasFx]);

  // ── Tap: squash, pop back with an overshoot, wiggle, and a heart ──
  const tap = useCallback(() => {
    heart.value = 0;
    heart.value = withTiming(1, { duration: 950, easing: Easing.out(Easing.quad) });
    if (live.current.reduceMotion) return;
    tapSquash.value = withSequence(
      withTiming(-0.13, { duration: 90, easing: up }),
      withTiming(0.08, { duration: 140, easing: up }),
      withSpring(0, { damping: 9, stiffness: 220 }),
    );
    if (live.current.state !== 'sleeping') {
      tapSpin.value = withDelay(200, keyframes([[-5, 70], [5, 90], [-3, 80], [0, 90]]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Petting: lean into the hand, smile with closed eyes, wag ──
  const petStart = useCallback(() => {
    pet.value = withTiming(1, { duration: 300, easing: smooth });
    if (!live.current.reduceMotion && live.current.state !== 'sleeping') swing(petWag, 12, 140);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const petMove = useCallback((side: number) => {
    if (live.current.reduceMotion) return;
    const clamped = Math.max(-1, Math.min(1, side));
    lean.value = withTiming(clamped * 9, { duration: 140, easing: sine });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const petEnd = useCallback(() => {
    pet.value = withTiming(0, { duration: 350, easing: smooth });
    lean.value = withTiming(0, { duration: 350, easing: smooth });
    settle(petWag);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(
    () => ({ pose, fade, hat, heart, sparks, zzz, fx, tap, petStart, petMove, petEnd }),
    // Shared values and callbacks are stable for the life of the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
}
