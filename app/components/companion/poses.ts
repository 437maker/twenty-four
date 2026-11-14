// poses.ts — what each state looks like when it is standing still, and how a
// pose turns into a transform for each part of the rig.
//
// This file has no React or React Native imports on purpose. The same numbers
// drive three things: the animated rig on the phone, the PNG render script on
// the laptop, and the unit tests.

import type { NovaState } from '../../types';

// All distances are in drawing units. The dog is drawn in a 200 x 200 box.
export const VIEWBOX = 200;

export interface Pose {
  hop: number;        // whole dog up (negative) or down, in units
  spin: number;       // whole dog rotation, degrees
  bodySx: number;     // body squash and stretch (1 = rest)
  bodySy: number;
  headDx: number;     // head offset from its rest position
  headDy: number;
  headRot: number;    // head tilt, degrees (positive = clockwise)
  earL: number;       // ear rotation, degrees (positive = swings outward)
  earR: number;
  tail: number;       // tail rotation, degrees (positive = droops down)
  knot: number;       // topknot wobble, degrees
  lid: number;        // 0 = eyes open, 1 = eyelids fully closed
  happyEyes: number;  // 0..1 crossfade to the smiling "^ ^" eyes
  mouthOpen: number;  // 0 = closed smile, 1 = open with tongue
  pawSpread: number;  // front paws slide outward, in units
}

export const REST_POSE: Pose = {
  hop: 0, spin: 0, bodySx: 1, bodySy: 1,
  headDx: 0, headDy: 0, headRot: 0,
  earL: 0, earR: 0, tail: 0, knot: 0,
  lid: 0, happyEyes: 0, mouthOpen: 0, pawSpread: 0,
};

// The key pose for each state. Loops (breathing, wagging, hopping) move
// around these values; a state change eases from one pose to the next.
export const POSES: Record<NovaState, Pose> = {
  // Calm, mouth closed, looking at you.
  idle: { ...REST_POSE },

  // Mouth open, tongue out, ears lifted a little, tail up.
  happy: {
    ...REST_POSE,
    mouthOpen: 1, earL: 7, earR: 7, tail: -12, headDy: -2,
  },

  // Top of a jump: stretched, ears flying, smiling eyes.
  celebrating: {
    ...REST_POSE,
    hop: -14, bodySx: 0.95, bodySy: 1.07,
    mouthOpen: 1, happyEyes: 1, earL: 30, earR: 30, tail: -22, knot: -6,
  },

  // Curled up: body flattened into a loaf, head resting low, eyes shut,
  // tail tucked along the ground, paws out in front.
  sleeping: {
    ...REST_POSE,
    bodySx: 1.14, bodySy: 0.7,
    headDx: -5, headDy: 20, headRot: -7,
    earL: 12, earR: 6, tail: 62, lid: 1, pawSpread: 9,
  },
};

// Small sprites need a proportionally thicker outline, or a white dog on a
// white screen fades out. Returns a multiplier for the outline width:
// 1 at 150px and above, rising to 1.7 at 64px and below.
export function outlineScaleForSize(size: number): number {
  if (size >= 150) return 1;
  if (size <= 64) return 1.7;
  return 1 + (0.7 * (150 - size)) / (150 - 64);
}

export function poseForState(state: NovaState): Pose {
  return POSES[state];
}

// ─── Pivots ───────────────────────────────────────────────────────────────────
// The point each part rotates or scales around, in drawing units.
// These are the same on every breed (the shared skeleton):
export const SKELETON = {
  root: { x: 100, y: 150 },    // spin: middle of the dog
  ground: { x: 100, y: 188 },  // body squash: where she touches the ground
  neck: { x: 100, y: 128 },    // head tilt
  shadow: { x: 100, y: 187 },
} as const;

// ...and these differ by breed (an upright ear hinges somewhere else than a
// hanging one). Each breed supplies its own; see breeds/*.ts.
export interface RigPivots {
  earL: { x: number; y: number };  // ear base
  earR: { x: number; y: number };
  tail: { x: number; y: number };  // tail base
  knot: { x: number; y: number };  // where a topknot or hat sits and wobbles
  lidY: number;                    // eyelid hinge: top edge of the eyes
  mouthY: number;                  // the mouth opens downward from here
  earSign: number;                 // +1 hanging ears swing outward, -1 upright ears tip outward
  earGain: number;                 // how much of the pose's ear angle this ear takes (stiff ears < 1)
}

// The Maltese pivots, used when no breed is given.
export const DEFAULT_PIVOTS: RigPivots = {
  earL: { x: 58, y: 62 },
  earR: { x: 142, y: 62 },
  tail: { x: 132, y: 160 },
  knot: { x: 100, y: 46 },
  lidY: 81,
  mouthY: 113,
  earSign: 1,
  earGain: 1,
};

// Kept for older call sites and tests.
export const PIVOTS = {
  ...SKELETON,
  earL: DEFAULT_PIVOTS.earL,
  earR: DEFAULT_PIVOTS.earR,
  tail: DEFAULT_PIVOTS.tail,
  knot: DEFAULT_PIVOTS.knot,
  lid: { x: 100, y: DEFAULT_PIVOTS.lidY },
  mouth: { x: 100, y: DEFAULT_PIVOTS.mouthY },
} as const;

export type PartName =
  | 'shadow' | 'root' | 'tail' | 'body' | 'pawL' | 'pawR' | 'head'
  | 'earL' | 'earR' | 'knot' | 'lids' | 'eyesOpen' | 'eyesHappy'
  | 'mouthClosed' | 'mouthOpen';

export interface PartTransform {
  tx: number; ty: number;   // translate, drawing units
  rot: number;              // degrees, around the pivot
  sx: number; sy: number;   // scale, around the pivot
  opacity: number;
  px: number; py: number;   // the pivot itself
}

// Turns a pose into the transform for one part.
// Marked as a worklet so the rig can call it on the UI thread every frame;
// in Node (render script, tests) the directive is just an unused string.
export function partTransform(part: PartName, p: Pose, pv: RigPivots = DEFAULT_PIVOTS): PartTransform {
  'worklet';
  const t: PartTransform = { tx: 0, ty: 0, rot: 0, sx: 1, sy: 1, opacity: 1, px: 100, py: 100 };
  switch (part) {
    case 'shadow': {
      // Shadow shrinks and fades as she leaves the ground.
      const lift = Math.min(1, Math.abs(Math.min(0, p.hop)) / 40);
      t.px = 100; t.py = 187;
      t.sx = (1 - 0.35 * lift) * (0.6 + 0.4 * p.bodySx);
      t.sy = 1 - 0.35 * lift;
      t.opacity = 1 - 0.5 * lift;
      break;
    }
    case 'root':
      t.px = 100; t.py = 150;
      t.ty = p.hop; t.rot = p.spin;
      break;
    case 'tail':
      t.px = pv.tail.x; t.py = pv.tail.y;
      t.rot = p.tail;
      break;
    case 'body':
      t.px = 100; t.py = 188;
      t.sx = p.bodySx; t.sy = p.bodySy;
      break;
    case 'pawL':
      t.tx = 0 - p.pawSpread;
      break;
    case 'pawR':
      t.tx = p.pawSpread;
      break;
    case 'head':
      // The head rides on the body: when the body squashes, the head sinks
      // with it (60 units between the ground and the neck).
      t.px = 100; t.py = 128;
      t.tx = p.headDx;
      t.ty = p.headDy + (1 - p.bodySy) * 60;
      t.rot = p.headRot;
      break;
    case 'earL':
      t.px = pv.earL.x; t.py = pv.earL.y;
      t.rot = 0 + p.earL * pv.earSign * pv.earGain; // "0 +" turns a negative zero into plain zero
      break;
    case 'earR':
      t.px = pv.earR.x; t.py = pv.earR.y;
      t.rot = 0 - p.earR * pv.earSign * pv.earGain; // mirrored ear swings the other way
      break;
    case 'knot':
      t.px = pv.knot.x; t.py = pv.knot.y;
      t.rot = p.knot;
      break;
    case 'lids':
      t.px = 100; t.py = pv.lidY;
      t.sy = p.lid;
      t.opacity = p.lid > 0.02 ? 1 : 0;
      break;
    case 'eyesOpen':
      t.opacity = 1 - p.happyEyes;
      break;
    case 'eyesHappy':
      t.opacity = p.happyEyes;
      break;
    case 'mouthClosed':
      t.opacity = 1 - p.mouthOpen;
      break;
    case 'mouthOpen':
      t.px = 100; t.py = pv.mouthY;
      t.sy = 0.4 + 0.6 * p.mouthOpen;
      t.opacity = p.mouthOpen;
      break;
  }
  return t;
}
