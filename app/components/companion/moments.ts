// moments.ts — the dog's short "moments": a yawn, a sneeze, a roll in the grass.
//
// A moment is 1 to 3 seconds of motion layered on top of whatever state she
// is in. It is pure data: for each pose number it moves (see poses.ts), a
// short list of keys, "at this point in the moment, be this far from rest".
// Nothing is drawn specially for a moment. The same rig, the same parts, and
// the same anchors do all of it, so every breed and every outfit works.
//
// This file has no React or React Native imports. The rig samples it on the
// UI thread, the render script samples it in Node to draw the review strips,
// and the tests sample it directly.

import type { NovaState } from '../../types';
import { POSES, REST_POSE } from './poses';
import type { Pose } from './poses';

// One key: [how far through the moment (0..1), offset from the key pose].
export type Key = readonly [t: number, v: number];

// The four numbers that place a moment's prop (a butterfly, a ball...), in
// drawing units. They use the same keys as the pose numbers.
export type PropChannel = 'propX' | 'propY' | 'propS' | 'propO';
export type Channel = keyof Pose | PropChannel;
export type Tracks = Partial<Record<Channel, readonly Key[]>>;

export type PropKind = 'butterfly' | 'ball' | 'puff' | 'dream';
export const PROP_KINDS: readonly PropKind[] = ['butterfly', 'ball', 'puff', 'dream'];

// Which key pose a moment is layered on.
//   awake      standing in the yard (idle or happy)
//   asleep     lying down asleep, outside at night or inside the house
//   celebrate  the streak celebration
export type MomentBase = 'awake' | 'asleep' | 'celebrate';

// When a moment is offered by the idle director.
//   always   any time she is awake
//   morning  5am to 10am            evening  8pm onward
//   proud    wearing the raincoat or a hero suit
//   asleep   asleep anywhere        inside   asleep inside the house
//   event    never picked at random: played when something happens
export type MomentWhen = 'always' | 'morning' | 'evening' | 'proud' | 'asleep' | 'inside' | 'event';

export interface Moment {
  id: string;
  label: string;       // for the Gallery and the review strips
  ms: number;
  base: MomentBase;
  when: MomentWhen;
  weight: number;      // share of the ordinary picks (rare moments ignore it)
  rare?: boolean;      // a surprise: about 5 picks in 100
  gentle?: boolean;    // nothing travels: allowed under Reduce Motion
  prop?: PropKind;
  tracks: Tracks;
}

// ─── Sampling ─────────────────────────────────────────────────────────────────
// A track starts at 0 and ends at 0 unless it has a key at t = 0 or t = 1.
// Between two keys the value eases in and out.
export function sampleTrack(keys: readonly Key[] | undefined, t: number): number {
  'worklet';
  if (!keys || keys.length === 0) return 0;
  let t0 = 0;
  let v0 = 0;
  for (let i = 0; i < keys.length; i++) {
    const kt = keys[i][0];
    const kv = keys[i][1];
    if (t <= kt) {
      if (kt <= t0) return kv;
      const u = (t - t0) / (kt - t0);
      return v0 + (kv - v0) * (u * u * (3 - 2 * u));
    }
    t0 = kt;
    v0 = kv;
  }
  if (t0 >= 1) return v0;
  const u = Math.min(1, (t - t0) / (1 - t0));
  return v0 * (1 - u * u * (3 - 2 * u));
}

// The pose at point `t` of a moment, on top of `base`.
export function momentPose(base: Pose, tracks: Tracks, t: number): Pose {
  const out = { ...base };
  (Object.keys(REST_POSE) as (keyof Pose)[]).forEach((k) => {
    out[k] = base[k] + sampleTrack(tracks[k], t);
  });
  out.lid = Math.max(0, Math.min(1, out.lid));
  out.happyEyes = Math.max(0, Math.min(1, out.happyEyes));
  out.mouthOpen = Math.max(0, out.mouthOpen);
  return out;
}

export interface PropPlace { x: number; y: number; scale: number; opacity: number }

export function propPlace(tracks: Tracks, t: number): PropPlace {
  'worklet';
  return {
    x: sampleTrack(tracks.propX, t),
    y: sampleTrack(tracks.propY, t),
    scale: tracks.propS ? sampleTrack(tracks.propS, t) : 1,
    opacity: Math.max(0, Math.min(1, sampleTrack(tracks.propO, t))),
  };
}

// The state whose key pose a moment is drawn over (for the review strips).
export function baseStateOf(m: Moment): NovaState {
  return m.base === 'asleep' ? 'sleeping' : m.base === 'celebrate' ? 'celebrating' : 'idle';
}
export const basePoseOf = (m: Moment): Pose => POSES[baseStateOf(m)];

// Which base the director should draw from in a given state.
export function baseForState(state: NovaState): MomentBase {
  return state === 'sleeping' ? 'asleep' : state === 'celebrating' ? 'celebrate' : 'awake';
}

// ─── Small builders, to keep the moments readable ─────────────────────────────
// Hold a value: ease to `v` by `from`, stay until `to`.
const hold = (from: number, to: number, v: number): Key[] => [[from, v], [to, v]];

// Swing between +amp and -amp `n` times between `from` and `to`, around
// `mid`. `fade` shrinks the swings toward the end (a shake dying down).
function osc(from: number, to: number, n: number, amp: number, mid = 0, fade = 0): Key[] {
  const keys: Key[] = [];
  const steps = n * 2;
  for (let i = 0; i < steps; i++) {
    const t = from + ((to - from) * (i + 0.5)) / steps;
    const a = amp * (1 - (fade * i) / steps);
    keys.push([r3(t), mid + (i % 2 === 0 ? a : -a)]);
  }
  keys.push([to, mid]);
  return keys;
}
const r3 = (n: number) => Math.round(n * 1000) / 1000;

// A jump: crouch, up to `height`, land with a squash. Returns hop and body keys.
function jump(from: number, to: number, height: number): { hop: Key[]; sy: Key[]; sx: Key[] } {
  const d = to - from;
  const at = (f: number) => r3(from + d * f);
  return {
    hop: [[at(0.2), 0], [at(0.55), -height], [at(0.85), 0]],
    sy: [[at(0.18), -0.1], [at(0.5), 0.07], [at(0.85), 0.02], [at(0.93), -0.08], [at(1), 0]],
    sx: [[at(0.18), 0.07], [at(0.5), -0.05], [at(0.85), 0], [at(0.93), 0.06], [at(1), 0]],
  };
}

// ─── The idle library ─────────────────────────────────────────────────────────
const j1 = jump(0.62, 0.95, 11);
const jTask = jump(0.05, 0.75, 30);

const IDLE: Moment[] = [
  {
    // Front paws slide forward and out, head and chest go down, rear and tail
    // stay up, and the mouth opens wide with the eyes shut.
    id: 'yawnStretch', label: 'Yawn and stretch', ms: 2800, base: 'awake', when: 'always', weight: 1,
    tracks: {
      pawSpread: hold(0.16, 0.68, 8),
      pawLDy: hold(0.16, 0.68, 3), pawRDy: hold(0.16, 0.68, 3),
      headDy: [[0.2, 15], [0.66, 16], [0.84, -3]],
      bodySy: [[0.2, -0.17], [0.66, -0.18], [0.84, 0.04]],
      bodySx: hold(0.2, 0.66, 0.1),
      tail: hold(0.2, 0.66, -28),
      mouthOpen: [[0.24, 0], [0.36, 1.9], [0.56, 1.9], [0.7, 0]],
      lid: [[0.24, 0], [0.34, 1], [0.6, 1], [0.72, 0]],
      earL: hold(0.3, 0.6, -9), earR: hold(0.3, 0.6, -9),
      headRot: [[0.36, -5], [0.56, -4]],
    },
  },
  {
    // Head tips to one side, that ear flaps fast, the paw on that side
    // drums, and she shuts her eyes with pleasure. The left side, so
    // something held in the right paw stays still.
    id: 'scratchEar', label: 'Scratch behind the ear', ms: 2400, base: 'awake', when: 'always', weight: 1,
    tracks: {
      headRot: hold(0.14, 0.8, -15),
      headDx: hold(0.14, 0.8, -5),
      headDy: hold(0.14, 0.8, 7),
      spin: hold(0.14, 0.8, -4),
      earL: [[0.16, 8], ...osc(0.2, 0.78, 7, 13, 12)],
      pawLDy: [[0.16, -9], ...osc(0.2, 0.78, 7, 4, -10)],
      pawLDx: hold(0.16, 0.78, -5),
      happyEyes: hold(0.22, 0.76, 1),
      knot: osc(0.2, 0.78, 7, 4),
      tail: hold(0.2, 0.8, 14),
    },
  },
  {
    // Two quick turns on the spot after her own tail, then a dizzy wobble.
    id: 'chaseTail', label: 'Chase her tail', ms: 2800, base: 'awake', when: 'always', weight: 1,
    tracks: {
      turn: [[0.08, 0], [0.4, 360], [0.72, 720], [1, 720]],
      hop: [[0.08, 0], ...osc(0.1, 0.72, 4, 2.5, -2.5)],
      headRot: [[0.1, 12], [0.7, 12], [0.78, -7], [0.86, 6], [0.93, -3]],
      headDx: hold(0.1, 0.7, 5),
      tail: osc(0.08, 0.74, 8, 18, -10),
      mouthOpen: hold(0.12, 0.9, 1),
      earL: hold(0.12, 0.7, 14), earR: hold(0.12, 0.7, 14),
      spin: [[0.72, 0], [0.79, -5], [0.87, 4], [0.94, -2]],
    },
  },
  {
    // Nose to the ground, a step to one side with a bob for each paw, a
    // sniff, and back.
    id: 'sniffWander', label: 'Sniff and wander', ms: 3000, base: 'awake', when: 'always', weight: 1,
    tracks: {
      headDy: [[0.14, 15], ...osc(0.2, 0.76, 6, 1.6, 15), [0.8, 15]],
      headRot: [[0.16, -6], [0.44, -7], [0.6, 6], [0.78, 5]],
      bodySy: hold(0.14, 0.8, -0.05),
      dx: [[0.16, 0], [0.44, -20], [0.56, -20], [0.82, 0]],
      hop: [[0.16, 0], ...osc(0.18, 0.44, 2, 1.5, -1.5), [0.56, 0], ...osc(0.58, 0.82, 2, 1.5, -1.5)],
      pawLDy: [[0.16, 0], ...osc(0.18, 0.44, 2, 2.5, -2.5), [0.56, 0], ...osc(0.58, 0.82, 2, -2.5, -2.5)],
      pawRDy: [[0.16, 0], ...osc(0.18, 0.44, 2, -2.5, -2.5), [0.56, 0], ...osc(0.58, 0.82, 2, 2.5, -2.5)],
      lid: hold(0.16, 0.78, 0.3),
      tail: osc(0.14, 0.82, 3, 8),
      earL: hold(0.16, 0.78, 8), earR: hold(0.16, 0.78, 8),
    },
  },
  {
    // A big, slow tilt one way, a pause, then the other way, leaning in.
    id: 'headTilt', label: 'Head tilt', ms: 2200, base: 'awake', when: 'always', weight: 1,
    tracks: {
      headRot: [[0.18, 15], [0.42, 15], [0.6, -12], [0.82, -12]],
      knot: [[0.24, -9], [0.44, 0], [0.66, 8], [0.84, 0]],
      earL: [[0.22, 9], [0.42, 6], [0.6, -3], [0.82, -3]],
      earR: [[0.22, -3], [0.42, -3], [0.64, 9], [0.82, 6]],
      zoom: hold(0.2, 0.82, 0.04),
      headDy: hold(0.2, 0.82, -2),
    },
  },
  {
    // The tail goes like a propeller and the whole dog wiggles with it.
    id: 'wagBurst', label: 'Wag burst', ms: 1700, base: 'awake', when: 'always', weight: 1,
    tracks: {
      tail: osc(0.06, 0.9, 9, 22, -12),
      spin: osc(0.06, 0.9, 9, 2.5),
      bodySx: osc(0.06, 0.9, 9, 0.02),
      mouthOpen: hold(0.08, 0.86, 1),
      earL: hold(0.1, 0.86, 6), earR: hold(0.1, 0.86, 6),
      hop: [[0.3, 0], [0.38, -3], [0.46, 0], [0.6, 0], [0.68, -3], [0.76, 0]],
    },
  },
  {
    // A slow wind-up with the nose in the air, then the whole head snaps
    // down, ears flying, and a little puff comes out.
    id: 'sneeze', label: 'Sneeze', ms: 1700, base: 'awake', when: 'always', weight: 1, prop: 'puff',
    tracks: {
      headDy: [[0.36, -7], [0.44, -8], [0.52, 12], [0.64, 6], [0.8, 0]],
      headRot: [[0.36, -6], [0.44, -7], [0.52, 4], [0.7, -4], [0.82, 3], [0.92, 0]],
      lid: [[0.3, 0.55], [0.44, 0.7], [0.5, 1], [0.66, 1], [0.78, 0]],
      bodySy: [[0.4, 0.05], [0.52, -0.08], [0.7, 0]],
      hop: [[0.46, 0], [0.54, -4], [0.64, 0]],
      earL: [[0.44, -6], [0.54, 30], [0.68, -6], [0.8, 3], [0.9, 0]],
      earR: [[0.44, -6], [0.56, 30], [0.7, -6], [0.82, 3], [0.92, 0]],
      knot: [[0.44, 4], [0.56, -14], [0.7, 6], [0.84, 0]],
      mouthOpen: [[0.44, 0], [0.5, 0.9], [0.6, 0]],
      propX: [[0, 96], [0.5, 96], [0.8, 46], [1, 36]],
      propY: [[0, 122], [0.5, 122], [0.8, 150], [1, 154]],
      propS: [[0, 0.6], [0.5, 0.6], [0.62, 1.5], [0.85, 2.3], [1, 2.5]],
      propO: [[0.49, 0], [0.54, 1], [0.7, 1], [0.9, 0]],
    },
  },
  {
    // Flops onto her side, wiggles on her back with her paws going, and
    // rolls back up.
    id: 'rollOver', label: 'Roll over and wiggle', ms: 3200, base: 'awake', when: 'always', weight: 1, rare: true,
    tracks: {
      spin: [[0.1, -6], [0.3, 96], ...osc(0.34, 0.74, 4, 7, 98), [0.78, 96], [0.94, -4]],
      dx: [[0.1, 0], [0.3, -22], [0.78, -22], [0.94, 0]],
      hop: [[0.1, 0], [0.2, -12], [0.3, -18], [0.78, -18], [0.88, -12], [0.96, 0]],
      bodySy: [[0.1, -0.08], [0.3, 0], [0.78, 0], [0.94, -0.06]],
      pawSpread: osc(0.34, 0.74, 4, 4, 4),
      pawLDy: osc(0.34, 0.74, 4, 3),
      pawRDy: osc(0.34, 0.74, 4, -3),
      happyEyes: hold(0.3, 0.8, 1),
      mouthOpen: hold(0.3, 0.8, 1),
      tail: osc(0.32, 0.76, 6, 16),
      earL: hold(0.3, 0.78, 16), earR: hold(0.3, 0.78, -10),
      headRot: osc(0.34, 0.74, 4, -5),
    },
  },
  {
    // A butterfly drifts across in front of her. Her head follows it, and
    // she gives one hopeful little hop as it passes.
    id: 'butterfly', label: 'Watch a butterfly', ms: 3400, base: 'awake', when: 'always', weight: 1, rare: true, prop: 'butterfly',
    tracks: {
      propX: [[0, -6], [0.5, 100], [1, 210]],
      propY: [[0, 64], [0.14, 44], [0.3, 60], [0.5, 30], [0.66, 46], [0.84, 26], [1, 40]],
      propS: [[0, 1.4], [1, 1.4]],
      propO: [[0.04, 1], [0.94, 1]],
      headRot: [[0.1, -13], [0.5, 0], [0.86, 13]],
      headDx: [[0.1, -6], [0.5, 0], [0.86, 6]],
      headDy: [[0.1, -2], [0.5, -6], [0.86, -3]],
      earL: [[0.12, 8], [0.5, -4], [0.86, -2]],
      earR: [[0.12, -2], [0.5, -4], [0.86, 8]],
      hop: [[0.42, 0], [0.5, -9], [0.58, 0]],
      bodySy: [[0.4, -0.06], [0.5, 0.05], [0.58, -0.04], [0.64, 0]],
      mouthOpen: hold(0.44, 0.9, 1),
      tail: osc(0.1, 0.9, 5, 10, -8),
    },
  },
  {
    // A ball rolls in from the left, she pats it with a paw, and it bounces
    // away again.
    id: 'ballBat', label: 'Bat at a ball', ms: 2800, base: 'awake', when: 'always', weight: 1, prop: 'ball',
    tracks: {
      propX: [[0, -12], [0.36, 56], [0.44, 58], [0.7, 10], [1, -16]],
      propY: [[0, 178], [0.44, 178], [0.56, 142], [0.7, 178], [0.8, 162], [0.9, 178], [1, 178]],
      propS: [[0, 1.35], [1, 1.35]],
      propO: [[0.04, 1], [0.94, 1]],
      headRot: [[0.14, -10], [0.44, -12], [0.74, -9]],
      headDx: hold(0.14, 0.76, -5),
      headDy: [[0.3, 4], [0.44, 5], [0.56, -2]],
      bodySy: [[0.3, -0.06], [0.42, -0.07], [0.5, 0.03], [0.6, 0]],
      pawLDx: [[0.3, 0], [0.38, -6], [0.45, -20], [0.58, -4]],
      pawLDy: [[0.3, 0], [0.38, -14], [0.45, -6], [0.58, 0]],
      tail: osc(0.2, 0.9, 7, 14, -10),
      mouthOpen: hold(0.46, 0.9, 1),
      earL: [[0.44, 4], [0.5, 14], [0.6, 2]],
    },
  },
  {
    // Settles down onto her tummy with her chin low, rests, and gets up.
    id: 'sitLieDown', label: 'Sit, then lie down', ms: 3400, base: 'awake', when: 'always', weight: 1,
    tracks: {
      bodySy: [[0.14, -0.08], [0.24, -0.08], [0.42, -0.27], [0.78, -0.27], [0.92, 0.03]],
      bodySx: [[0.14, 0.03], [0.24, 0.03], [0.42, 0.12], [0.78, 0.12]],
      headDy: [[0.24, 0], [0.42, 15], [0.78, 16], [0.92, -2]],
      headRot: hold(0.42, 0.78, -5),
      pawSpread: hold(0.42, 0.78, 8),
      tail: hold(0.42, 0.78, 40),
      lid: [[0.4, 0], [0.52, 0.5], [0.76, 0.6], [0.84, 0]],
      earL: hold(0.42, 0.78, 9), earR: hold(0.42, 0.78, 5),
    },
  },
  {
    // The wet-dog shake: everything loose swings, biggest first.
    id: 'shake', label: 'Shake', ms: 1700, base: 'awake', when: 'always', weight: 1,
    tracks: {
      spin: osc(0.1, 0.82, 6, 7, 0, 0.7),
      headRot: [[0.06, 0], ...osc(0.12, 0.86, 6, -10, 0, 0.7)],
      earL: osc(0.1, 0.86, 6, 24, 6, 0.6),
      earR: osc(0.1, 0.86, 6, -24, 6, 0.6),
      knot: osc(0.12, 0.88, 6, 12, 0, 0.6),
      tail: osc(0.1, 0.86, 6, 16, 0, 0.6),
      bodySx: osc(0.1, 0.82, 6, 0.035, 0, 0.7),
      lid: [[0.08, 1], [0.8, 1], [0.9, 0]],
    },
  },
  {
    // Sits up tall and looks left, then right.
    id: 'lookAround', label: 'Look around', ms: 2800, base: 'awake', when: 'always', weight: 1,
    tracks: {
      headDx: [[0.14, -9], [0.4, -9], [0.56, 9], [0.82, 9]],
      headRot: [[0.14, -8], [0.4, -8], [0.56, 8], [0.82, 8]],
      headDy: hold(0.12, 0.84, -4),
      bodySy: hold(0.12, 0.84, 0.03),
      earL: [[0.16, 10], [0.4, 8], [0.56, -3], [0.82, -3]],
      earR: [[0.16, -3], [0.4, -3], [0.58, 10], [0.82, 8]],
      knot: [[0.2, 6], [0.4, 0], [0.62, -6], [0.84, 0]],
      tail: hold(0.12, 0.84, -8),
    },
  },
  {
    // The "play with me" bow: chest down, tail up and wagging, then a spring
    // back onto her feet.
    id: 'playBow', label: 'Playful bow', ms: 2000, base: 'awake', when: 'always', weight: 1,
    tracks: {
      headDy: [[0.18, 14], [0.58, 14], [0.7, -2]],
      headRot: hold(0.18, 0.58, 8),
      bodySy: [[0.18, -0.13], [0.58, -0.13], ...j1.sy],
      bodySx: [[0.18, 0.08], [0.58, 0.08], ...j1.sx],
      pawSpread: hold(0.18, 0.58, 9),
      pawLDy: hold(0.18, 0.58, 3), pawRDy: hold(0.18, 0.58, 3),
      tail: [[0.14, -30], ...osc(0.18, 0.6, 5, 14, -32)],
      mouthOpen: hold(0.2, 0.94, 1),
      hop: j1.hop,
      earL: [[0.6, 0], [0.76, 16], [0.9, -3]], earR: [[0.6, 0], [0.78, 16], [0.92, -3]],
    },
  },

  // ── Gentle moments: nothing travels, so they are allowed under Reduce Motion ──
  {
    id: 'slowBlink', label: 'Slow blink', ms: 1500, base: 'awake', when: 'always', weight: 0.5, gentle: true,
    tracks: { lid: [[0.14, 1], [0.34, 1], [0.48, 0], [0.6, 1], [0.74, 1], [0.9, 0]] },
  },
  {
    id: 'smallWag', label: 'Small wag', ms: 1400, base: 'awake', when: 'always', weight: 0.5, gentle: true,
    tracks: { tail: osc(0.08, 0.92, 3, 7) },
  },

  // ── Context moments ──
  {
    // Morning: reaches up tall first, then a long stretch down, then a shake.
    id: 'morningStretch', label: 'Morning: big stretch', ms: 3400, base: 'awake', when: 'morning', weight: 3,
    tracks: {
      bodySy: [[0.14, 0.1], [0.24, 0.1], [0.4, -0.13], [0.68, -0.13], [0.8, 0.03]],
      bodySx: [[0.14, -0.05], [0.24, -0.05], [0.4, 0.07], [0.68, 0.07]],
      headDy: [[0.14, -7], [0.24, -7], [0.4, 14], [0.68, 14], [0.8, -2]],
      headRot: [[0.16, -6], [0.26, -6], [0.4, 0], [0.8, 0], ...osc(0.82, 0.98, 2, 6)],
      pawSpread: hold(0.38, 0.68, 9),
      pawLDy: hold(0.38, 0.68, 3), pawRDy: hold(0.38, 0.68, 3),
      tail: hold(0.38, 0.68, -30),
      mouthOpen: [[0.1, 0], [0.18, 1.6], [0.3, 1.6], [0.4, 0]],
      lid: [[0.1, 0], [0.16, 1], [0.62, 1], [0.74, 0]],
      earL: [[0.4, -8], [0.68, -8], ...osc(0.82, 0.98, 2, 14)],
      earR: [[0.4, -8], [0.68, -8], ...osc(0.82, 0.98, 2, -14)],
    },
  },
  {
    // Evening: heavy eyelids, a nod that sinks, a start awake, and again.
    id: 'drowsyBlinks', label: 'Evening: drowsy blinks', ms: 3400, base: 'awake', when: 'evening', weight: 3, gentle: true,
    tracks: {
      lid: [[0.12, 0.55], [0.3, 1], [0.44, 1], [0.5, 0.2], [0.62, 0.6], [0.78, 1], [0.86, 1], [0.94, 0]],
      headDy: [[0.12, 2], [0.42, 9], [0.5, 0], [0.62, 2], [0.84, 8], [0.94, 0]],
      headRot: [[0.42, 4], [0.5, 0], [0.84, -4], [0.94, 0]],
    },
  },
  {
    // In the raincoat or a hero suit: chest out, chin up, tail high.
    id: 'proudPose', label: 'Proud pose', ms: 2600, base: 'awake', when: 'proud', weight: 3,
    tracks: {
      bodySy: [[0.1, -0.05], [0.22, 0.07], [0.78, 0.07]],
      bodySx: [[0.1, 0.03], [0.22, 0.03], [0.78, 0.03]],
      headDy: [[0.22, -6], [0.78, -6]],
      headRot: [[0.22, -5], [0.5, -5], [0.62, 5], [0.78, 5]],
      spin: [[0.22, -3], [0.5, -3], [0.62, 3], [0.78, 3]],
      tail: hold(0.2, 0.8, -24),
      zoom: hold(0.22, 0.78, 0.06),
      happyEyes: hold(0.3, 0.72, 1),
      earL: hold(0.22, 0.78, 6), earR: hold(0.22, 0.78, 6),
      knot: [[0.26, -6], [0.4, 0], [0.66, 6], [0.8, 0]],
    },
  },
  {
    // Asleep: half opens her eyes, looks, and drifts off again.
    id: 'drowsyPeek', label: 'Asleep: drowsy peek', ms: 3000, base: 'asleep', when: 'asleep', weight: 1, gentle: true,
    tracks: {
      lid: [[0.14, 0], [0.26, -0.5], [0.44, -0.4], [0.56, -0.1], [0.66, -0.45], [0.84, 0]],
      earL: [[0.2, 0], [0.26, 8], [0.34, 0]],
    },
  },
  {
    // Asleep: an ear flicks, a paw paddles, the tail thumps once.
    id: 'sleepTwitch', label: 'Asleep: twitches', ms: 2400, base: 'asleep', when: 'asleep', weight: 1.5,
    tracks: {
      earL: [[0.08, 0], [0.13, 12], [0.2, 0], [0.5, 0], [0.55, 9], [0.62, 0]],
      earR: [[0.26, 0], [0.31, 10], [0.38, 0]],
      pawRDx: [[0.34, 0], ...osc(0.36, 0.6, 3, 2.5)],
      pawLDx: [[0.4, 0], ...osc(0.42, 0.64, 3, -2.5)],
      tail: [[0.66, 0], [0.72, -12], [0.8, 0], [0.86, -7], [0.92, 0]],
      headRot: [[0.34, 0], [0.42, 2], [0.56, -1], [0.66, 0]],
    },
  },
  {
    // Inside the house: a dream bubble floats up while her paws run.
    id: 'dream', label: 'Inside: a dream', ms: 3800, base: 'asleep', when: 'inside', weight: 3, prop: 'dream',
    tracks: {
      propX: [[0, 56], [1, 40]],
      propY: [[0, 62], [1, 14]],
      propS: [[0, 0.8], [0.3, 1.9], [1, 2.3]],
      propO: [[0.1, 1], [0.8, 1]],
      pawRDx: [[0.3, 0], ...osc(0.32, 0.7, 5, 2.5)],
      pawLDx: [[0.3, 0], ...osc(0.34, 0.72, 5, -2.5)],
      earL: [[0.4, 0], [0.45, 9], [0.52, 0]],
      tail: [[0.5, 0], ...osc(0.52, 0.78, 3, 6, -5)],
    },
  },
];

// ─── Event reactions ──────────────────────────────────────────────────────────
// A streak celebration: `jumps` high jumps in a row, each with a full turn.
function milestone(id: string, label: string, jumps: number, height: number): Moment {
  const hop: Key[] = [];
  const sy: Key[] = [];
  const sx: Key[] = [];
  const turn: Key[] = [[0, 0]];
  const zoom: Key[] = [];
  const span = 0.9 / jumps;
  for (let i = 0; i < jumps; i++) {
    const j = jump(0.02 + i * span, 0.02 + (i + 1) * span, height);
    hop.push(...j.hop);
    sy.push(...j.sy);
    sx.push(...j.sx);
    turn.push([r3(0.02 + i * span + span * 0.2), i * 360], [r3(0.02 + i * span + span * 0.85), (i + 1) * 360]);
    zoom.push([r3(0.02 + i * span + span * 0.55), 0.1], [r3(0.02 + (i + 1) * span), 0]);
  }
  turn.push([1, jumps * 360]);
  return {
    id, label, ms: 700 + jumps * 900, base: 'celebrate', when: 'event', weight: 0,
    tracks: { hop, bodySy: sy, bodySx: sx, turn, zoom, tail: osc(0.02, 0.96, jumps * 4, 14) },
  };
}

const EVENTS: Moment[] = [
  {
    // A task is ticked off: crouch, a high jump with a full turn, land.
    id: 'taskDone', label: 'Task done: jump and spin', ms: 1800, base: 'awake', when: 'event', weight: 0,
    tracks: {
      hop: jTask.hop, bodySy: jTask.sy, bodySx: jTask.sx,
      turn: [[0.18, 0], [0.62, 360], [1, 360]],
      happyEyes: hold(0.1, 0.9, 1),
      mouthOpen: hold(0.1, 0.94, 1),
      earL: [[0.18, -10], [0.42, 26], [0.66, 8], [0.76, -4]],
      earR: [[0.2, -10], [0.44, 26], [0.68, 8], [0.78, -4]],
      knot: [[0.2, 5], [0.44, -10], [0.7, 6], [0.82, 0]],
      tail: osc(0.06, 0.96, 8, 16, -14),
    },
  },
  {
    // A Sleep task is ticked off: one long yawn, then heavy eyes.
    id: 'sleepyYawn', label: 'Sleep task done: a yawn', ms: 2400, base: 'awake', when: 'event', weight: 0,
    tracks: {
      mouthOpen: [[0.1, 0], [0.28, 1.7], [0.52, 1.7], [0.66, 0]],
      lid: [[0.1, 0], [0.24, 1], [0.6, 1], [0.72, 0.5], [0.9, 0.5]],
      headDy: [[0.28, -5], [0.52, -5], [0.72, 4], [0.9, 4]],
      headRot: [[0.28, -6], [0.52, -6], [0.72, 3]],
      bodySy: [[0.28, 0.04], [0.52, 0.04], [0.72, -0.04], [0.9, -0.04]],
      earL: hold(0.28, 0.52, -8), earR: hold(0.28, 0.52, -8),
      tail: hold(0.6, 0.9, 16),
    },
  },
  {
    // A journal entry is saved: she trots up close and nuzzles.
    id: 'journalNuzzle', label: 'Journal saved: trot over and nuzzle', ms: 3000, base: 'awake', when: 'event', weight: 0,
    tracks: {
      zoom: [[0.3, 0.2], [0.8, 0.2]],
      hop: [...osc(0.02, 0.3, 3, 2.5, -2.5), [0.8, 0], ...osc(0.8, 0.98, 2, 2, -2)],
      pawLDy: osc(0.02, 0.3, 3, 2.5, -2.5),
      pawRDy: osc(0.02, 0.3, 3, -2.5, -2.5),
      headRot: [[0.32, 0], ...osc(0.36, 0.76, 3, 9)],
      headDx: [[0.32, 0], ...osc(0.36, 0.76, 3, 4)],
      headDy: hold(0.34, 0.78, 4),
      happyEyes: hold(0.34, 0.8, 1),
      tail: osc(0.04, 0.94, 10, 14, -8),
      earL: [[0.32, 0], ...osc(0.36, 0.76, 3, 6, 6)],
      earR: [[0.32, 0], ...osc(0.36, 0.76, 3, -6, 6)],
    },
  },
  {
    // Back after a day or more away: she runs in from the side, small and
    // far off, right up to you, and wiggles all over.
    id: 'missedYou', label: 'Missed you: run-up', ms: 3200, base: 'awake', when: 'event', weight: 0,
    tracks: {
      dx: [[0, -92], [0.42, 0]],
      zoom: [[0, -0.4], [0.42, 0.16], [0.82, 0.16]],
      hop: [[0, 0], ...osc(0.02, 0.42, 4, 4, -4), [0.5, 0], [0.58, -10], [0.66, 0], [0.74, -7], [0.82, 0]],
      pawLDy: osc(0.02, 0.42, 4, 3, -3),
      pawRDy: osc(0.02, 0.42, 4, -3, -3),
      spin: [[0.42, 0], ...osc(0.44, 0.9, 5, 5)],
      tail: [[0, -14], ...osc(0.02, 0.96, 12, 20, -14)],
      mouthOpen: [[0, 1], [0.94, 1]],
      happyEyes: hold(0.46, 0.9, 1),
      earL: [[0, 20], [0.42, 16], [0.5, 4], [0.58, 18], [0.66, 2]],
      earR: [[0, 20], [0.42, 16], [0.52, 4], [0.6, 18], [0.68, 2]],
      bodySy: [[0.5, -0.06], [0.58, 0.05], [0.66, -0.05], [0.74, 0.04], [0.82, -0.04], [0.88, 0]],
    },
  },
  milestone('milestone7', 'Streak of 7: celebration', 2, 26),
  milestone('milestone30', 'Streak of 30: celebration', 3, 32),
  milestone('milestone100', 'Streak of 100: celebration', 4, 38),
];

export const IDLE_MOMENTS: readonly Moment[] = IDLE;
export const EVENT_MOMENTS: readonly Moment[] = EVENTS;
export const MOMENTS: readonly Moment[] = [...IDLE, ...EVENTS];

const BY_ID = new Map(MOMENTS.map((m) => [m.id, m]));
export const getMoment = (id: string): Moment | undefined => BY_ID.get(id);

// The event reactions the app can ask for.
export type ReactionId = 'taskDone' | 'sleepyYawn' | 'journalNuzzle' | 'missedYou' | 'milestone7' | 'milestone30' | 'milestone100';

// The bigger the streak, the bigger the party.
export function milestoneReaction(streak: number): ReactionId {
  return streak >= 100 ? 'milestone100' : streak >= 30 ? 'milestone30' : 'milestone7';
}
