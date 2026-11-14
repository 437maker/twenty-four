// breeds/common.ts — pieces every breed shares.
//
// All breeds use the same eyes, eyelids, nose, and mouth, built here from a
// few numbers (where the eyes sit, how big they are, where the nose is). That
// keeps the family look consistent and means the blink, the smile, and the
// open mouth work the same way on every dog.

import { PALETTE } from '../palette';
import { both, circle, ellipse, line, path } from '../shapes';
import type { Shape } from '../shapes';

const INK = PALETTE.ink;

export interface FaceSpec {
  eyeDX: number;        // each eye's distance from the centre line
  eyeY: number;         // eye centre height
  eyeR: number;         // eye radius
  noseY: number;        // nose centre height
  lidColor: string;     // the fur color around the eyes (eyelids are drawn in it)
  muzzle: Shape[];      // drawn under the nose
  mouthLine?: string;   // color of the closed-mouth line (light on a dark muzzle)
  blush?: boolean;
  blushDX?: number;
  noseScale?: number;   // 1 = Maltese nose
  brows?: Shape[];      // optional eyebrow dots, drawn above the eyes
}

export interface BuiltFace {
  face: Shape[];
  eyesOpen: Shape[];
  lids: Shape[];
  eyesHappy: Shape[];
  mouthClosed: Shape[];
  mouthOpen: Shape[];
  lidY: number;    // eyelid hinge: the top edge of the eyes
  mouthY: number;  // the mouth opens downward from here
}

// The two-lobed "moustache" muzzle used by the long-haired breeds.
export function softMuzzle(noseY: number, fill: string, stroke: string, widen = 1): Shape {
  const N = noseY;
  const w = (dx: number) => 100 + dx * widen;
  return path(
    `M 100 ${N - 4} C ${w(10)} ${N - 6} ${w(21)} ${N} ${w(21)} ${N + 9} C ${w(21)} ${N + 17} ${w(12)} ${N + 21} ${w(5)} ${N + 18} ` +
      `C ${w(3)} ${N + 21} ${w(-3)} ${N + 21} ${w(-5)} ${N + 18} C ${w(-12)} ${N + 21} ${w(-21)} ${N + 17} ${w(-21)} ${N + 9} ` +
      `C ${w(-21)} ${N} ${w(-10)} ${N - 6} 100 ${N - 4} Z`,
    { fill, stroke, sw: 2.2 },
  );
}

export function buildFace(spec: FaceSpec): BuiltFace {
  const { eyeDX, eyeY: ey, eyeR, noseY: N } = spec;
  const ex = 100 - eyeDX;              // left eye centre x
  const f = eyeR / 8.6;                // scale for lids and smile arcs
  const ns = spec.noseScale ?? 1;
  const nx = (dx: number) => 100 + dx * ns;
  const ny = (dy: number) => N + dy * ns;
  const mouth = spec.mouthLine ?? INK;

  const face: Shape[] = [];
  if (spec.blush !== false) {
    const bx = spec.blushDX ?? 28;
    face.push(ellipse(100 - bx, N + 3, 7.5, 4.8, { fill: PALETTE.blush, op: 0.85 }));
    face.push(ellipse(100 + bx, N + 3, 7.5, 4.8, { fill: PALETTE.blush, op: 0.85 }));
  }
  face.push(...spec.muzzle);
  // Button nose
  face.push(
    path(
      `M ${nx(-7.5)} ${ny(-2.5)} Q 100 ${ny(-7)} ${nx(7.5)} ${ny(-2.5)} Q ${nx(8.5)} ${ny(4)} 100 ${ny(6.5)} Q ${nx(-8.5)} ${ny(4)} ${nx(-7.5)} ${ny(-2.5)} Z`,
      { fill: INK },
    ),
  );
  face.push(ellipse(nx(-2.5), ny(-1.4), 2.4 * ns, 1.3 * ns, { fill: PALETTE.highlight, op: 0.55 }));
  if (spec.brows) face.push(...spec.brows);

  const eyesOpen = both([
    circle(ex, ey, eyeR, { fill: INK }),
    circle(ex - 2.8 * f, ey - 3 * f, 2.9 * f, { fill: PALETTE.highlight }),
  ]);

  // Eyelids: a fur-colored cover a little bigger than the eye, with a dark
  // lash line along its lower edge. Scaling it from 0 to 1 from the top edge
  // of the eye closes the eye.
  const lids = both([
    circle(ex, ey + 0.6 * f, eyeR + 1.8 * f, { fill: spec.lidColor }),
    line(`M ${ex - 8.5 * f} ${ey + 3.5 * f} Q ${ex} ${ey + 12 * f} ${ex + 8.5 * f} ${ey + 3.5 * f}`, INK, 2.8),
  ]);

  // Smiling eyes: an upward arc over a fur patch that hides the open eye.
  const eyesHappy = both([
    circle(ex, ey, eyeR + 1 * f, { fill: spec.lidColor }),
    line(`M ${ex - 8 * f} ${ey + 3.5 * f} Q ${ex} ${ey - 7 * f} ${ex + 8 * f} ${ey + 3.5 * f}`, INK, 3.2),
  ]);

  const top = ny(6.5); // bottom of the nose
  const mouthClosed: Shape[] = [
    line(`M 100 ${top - 0.5} L 100 ${top + 3}`, mouth, 2.2),
    line(`M 100 ${top + 3} Q 96 ${top + 8} 91 ${top + 5}`, mouth, 2.2),
    line(`M 100 ${top + 3} Q 104 ${top + 8} 109 ${top + 5}`, mouth, 2.2),
  ];
  const mouthOpen: Shape[] = [
    path(`M 90.5 ${top + 3} Q 100 ${top + 6} 109.5 ${top + 3} Q 108 ${top + 15.5} 100 ${top + 15.5} Q 92 ${top + 15.5} 90.5 ${top + 3} Z`, { fill: PALETTE.mouth }),
    path(`M 94.5 ${top + 7.5} Q 100 ${top + 5} 105.5 ${top + 7.5} Q 106 ${top + 19} 100 ${top + 19} Q 94 ${top + 19} 94.5 ${top + 7.5} Z`, { fill: PALETTE.tongue }),
    line(`M 100 ${top + 9} L 100 ${top + 14.5}`, '#D96C80', 1.4),
  ];

  return { face, eyesOpen, lids, eyesHappy, mouthClosed, mouthOpen, lidY: ey - eyeR - 0.4, mouthY: top + 2.5 };
}

// A round front paw with two toe lines.
export function paw(cx: number, cy: number, fill: string, outline: string, toe: string): Shape[] {
  return [
    ellipse(cx, cy, 12.5, 7.5, { fill, stroke: outline, sw: 3.2, ol: true }),
    line(`M ${cx - 4} ${cy - 3} L ${cx - 4} ${cy + 1}`, toe, 2.2),
    line(`M ${cx + 3} ${cy - 3} L ${cx + 3} ${cy + 1}`, toe, 2.2),
  ];
}

export const GROUND_SHADOW = (rx = 60): Shape[] => [
  ellipse(100, 187, rx, 7.5, { fill: PALETTE.shadow, op: PALETTE.shadowOpacity }),
];

// The smooth, short-haired seated body used by most breeds. `w` widens it.
export function smoothBody(w = 1): string {
  const x = (dx: number) => 100 + dx * w;
  return (
    `M ${x(-29)} 120 C ${x(-43)} 134 ${x(-51)} 158 ${x(-50)} 176 C ${x(-49)} 185 ${x(-41)} 189 ${x(-30)} 188 ` +
    `L ${x(30)} 188 C ${x(41)} 189 ${x(49)} 185 ${x(50)} 176 C ${x(51)} 158 ${x(43)} 134 ${x(29)} 120 Z`
  );
}
