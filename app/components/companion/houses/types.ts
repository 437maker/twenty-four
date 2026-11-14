// houses/types.ts — what every house has to provide, and the math shared by
// the three renderers (animated yard, still Shop card, PNG script).
//
// A house is a small scene drawn in a 300 x 200 box:
//
//   backdrop   sky, ground, and a few scenery shapes. Never moves.
//   house      the building itself. Never moves.
//   ambient    1 to 3 kinds of small looping motion (smoke, waves, snow...).
//              Each ambient element is its own layer, moved by a transform.
//   dog        where the dog stands outside (bottom-centre of her box, and
//              how big the box is, in scene units)
//   door       where she walks to when she goes inside
//   rest       where she is seen resting inside (a doorway or a window)
//
// No React or React Native imports here: the render script loads this file
// directly in Node.

import type { Shape } from '../shapes';

export const SCENE_W = 300;
export const SCENE_H = 200;

// The clock every ambient loop reads runs 0..1 once a minute. A loop's
// period must divide 60 seconds so it joins up when the clock wraps.
export const AMBIENT_CLOCK_SECONDS = 60;
export const ALLOWED_PERIODS = [2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60] as const;

export type AmbientKind =
  | 'rise'    // drifts by (dx, dy) while fading in and out, growing a little (smoke, embers)
  | 'scroll'  // slides by (dx, dy) and wraps. Draw the shapes with tile() so the wrap is invisible (snow, leaves, bubbles, clouds)
  | 'sway'    // rocks +/- `amount` degrees around `pivot` (palms, kelp, canopy, light rays)
  | 'spin'    // turns a full circle around `pivot`; amount -1 = anticlockwise (clock hands, portal)
  | 'pulse'   // opacity breathes between `amount` and 1 (beacon, embers, stars)
  | 'bob';    // slides back and forth by (dx, dy) (waves, floating things, heat shimmer)

export interface Ambient {
  key: string;
  kind: AmbientKind;
  shapes: Shape[];
  period: number;                   // seconds per loop; one of ALLOWED_PERIODS
  phase?: number;                   // 0..1 head start, so two layers do not move in step
  pivot?: { x: number; y: number }; // sway, spin, rise (the point it grows from)
  dx?: number;                      // rise, scroll, bob: travel in scene units
  dy?: number;
  amount?: number;                  // sway: degrees. pulse: lowest opacity. spin: 1 or -1
  behind?: boolean;                 // true = drawn behind the house (default: in front of it)
}

export interface Spot { x: number; y: number; size: number }

export interface HouseDef {
  id: string;                       // the shop item id, e.g. "house_cozy_den"
  dark: boolean;                    // the scene is already night or space, so the yard adds no night tint
  skyTop?: string;                  // the color at the very top, if it differs from the first backdrop shape
  backdrop: Shape[];
  house: Shape[];
  ambient: Ambient[];
  dog: Spot;                        // outside: bottom-centre of the dog's box, and the box size
  door: { x: number; y: number };   // she walks here to go in
  rest: Spot;                       // inside: bottom-centre of her (smaller) box
  hit: { x: number; y: number; w: number; h: number }; // the part of the scene that counts as "the house" for a tap
}

// ─── Ambient motion ───────────────────────────────────────────────────────────
export interface AmbientPose { tx: number; ty: number; rot: number; scale: number; opacity: number }

// Where an ambient element is at phase `ph` (0..1) of its loop, in scene units.
// A worklet, so the yard can call it on the UI thread every frame; in Node
// the directive is just an unused string.
export function ambientPose(
  kind: AmbientKind, ph: number, dx: number, dy: number, amount: number,
): AmbientPose {
  'worklet';
  const wave = Math.sin(ph * Math.PI * 2);
  if (kind === 'rise') {
    return { tx: dx * ph, ty: dy * ph, rot: 0, scale: 0.7 + 0.6 * ph, opacity: Math.sin(Math.PI * ph) };
  }
  if (kind === 'scroll') return { tx: dx * ph, ty: dy * ph, rot: 0, scale: 1, opacity: 1 };
  if (kind === 'sway') return { tx: 0, ty: 0, rot: amount * wave, scale: 1, opacity: 1 };
  if (kind === 'spin') return { tx: 0, ty: 0, rot: 360 * ph * (amount < 0 ? -1 : 1), scale: 1, opacity: 1 };
  if (kind === 'pulse') return { tx: 0, ty: 0, rot: 0, scale: 1, opacity: amount + (1 - amount) * (0.5 + 0.5 * wave) };
  return { tx: dx * wave, ty: dy * wave, rot: 0, scale: 1, opacity: 1 }; // bob
}

// The phase a loop is at when `clock` (0..1 per minute) has the given value.
export function ambientPhase(clock: number, period: number, phase: number): number {
  'worklet';
  return (clock * (AMBIENT_CLOCK_SECONDS / period) + phase) % 1;
}

// The phase used when nothing moves (Reduce Motion, Shop cards, PNG sheets):
// smoke part-way up, lights at their brightest, everything else at rest.
export function stillPhase(a: Ambient): number {
  if (a.kind === 'rise') return ((a.phase ?? 0) * 0.5 + 0.3) % 1;
  if (a.kind === 'pulse') return 0.25;
  if (a.kind === 'spin') return a.phase ?? 0;
  return 0;
}

export function stillPose(a: Ambient): AmbientPose {
  return ambientPose(a.kind, stillPhase(a), a.dx ?? 0, a.dy ?? 0, a.amount ?? defaultAmount(a.kind));
}

export function defaultAmount(kind: AmbientKind): number {
  return kind === 'sway' ? 3 : kind === 'pulse' ? 0.35 : 1;
}

// ─── Fitting the scene into a view ────────────────────────────────────────────
// The scene fills the view's width and height, anchored to the bottom, the
// way "cover" works for a photo. On a short, wide view that would cut the top
// off the house, so the crop is limited to the top 50 units; past that the
// scene stops growing and the extra width shows plain sky and ground (every
// backdrop paints those far past the box edges).
export interface SceneFit {
  k: number;     // pixels per scene unit
  vx: number;    // the scene coordinate at the view's left edge
  vy: number;    // the scene coordinate at the view's top edge
  vw: number;    // visible width, scene units
  vh: number;    // visible height, scene units
}

export const MAX_TOP_CROP = 50;

export function sceneFit(width: number, height: number): SceneFit {
  const cover = Math.max(width / SCENE_W, height / SCENE_H);
  const k = Math.min(cover, height / (SCENE_H - MAX_TOP_CROP));
  const vw = width / k;
  const vh = height / k;
  return { k, vw, vh, vx: (SCENE_W - vw) / 2, vy: SCENE_H - vh };
}

// A scene point in view pixels.
export function scenePoint(fit: SceneFit, x: number, y: number): { x: number; y: number } {
  return { x: (x - fit.vx) * fit.k, y: (y - fit.vy) * fit.k };
}
