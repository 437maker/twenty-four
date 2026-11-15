// artKit.ts — the types and small helpers every item drawing uses.
//
// The drawings themselves live in itemArt.ts (the first 30 items),
// sportsArt.ts (sports gear) and heroArt.ts (hero suits). They all import
// from here, so none of them has to import another.

import { line, mirrorAll, path } from '../shapes';
import type { ItemFx, Shape } from '../shapes';

// A second piece of the same item, drawn on another layer. A hero suit is
// one item in the `outfit` slot, but it can bring its own cape (behind the
// body), goggles (over the eyes), and animated details on the chest.
export interface ItemExtra {
  // back = behind the body, at the back anchor (capes)
  // face = over the eyes, at the eyes anchor (goggles: outlines only, so the eyes show)
  // body = on the chest, at the chest anchor, in front of the fabric
  layer: 'back' | 'face' | 'body';
  shapes: Shape[];           // drawn around (0, 0), like every item
  fx?: ItemFx;               // a looping effect for just this piece
  clip?: boolean;            // body extras: clip to the body silhouette (a sheen on the fabric)
  at?: { x: number; y: number }; // body extras: where (0, 0) sits, measured from the chest anchor. Also the pivot a spin turns around
}

export interface ItemArt {
  shapes: Shape[];       // drawn at the slot's anchor
  front?: Shape[];       // back items only: drawn at the neck anchor, in front of the body
  clip?: boolean;        // true = clip to the body silhouette (outfits)
  coversKnot?: boolean;  // head items that replace hair on top of the head (the Maltese topknot)
  helmet?: boolean;      // head items that enclose the head: upright ears tuck inside, and the breed's helmetFit applies
  extras?: ItemExtra[];  // more pieces of the same item on other layers (outfits)
  fx?: ItemFx;           // a looping effect; stops under Reduce Motion
}

// Mirror around x = 0 (items are drawn around their own centre).
export const m = (list: Shape[]) => mirrorAll(list, 0);
export const pair = (list: Shape[]) => [...list, ...m(list)];

// ─── Outfit helpers ───────────────────────────────────────────────────────────
// A sheet of fabric from above the neck down to `hem`. The body clip trims it.
export function garment(fill: string, shade: string, hem: number): Shape[] {
  return [
    path(`M -90 -60 L 90 -60 L 90 ${hem} L -90 ${hem} Z`, { fill }),
    line(`M -90 ${hem} L 90 ${hem}`, shade, 3),
  ];
}
// A collar band that shows just under the chin.
export function collarBand(fill: string, stroke: string): Shape {
  return path('M -38 -30 Q 0 -8 38 -30 L 40 -20 Q 0 4 -40 -20 Z', { fill, stroke, sw: 1.8 });
}
// A cord or chain around the neck (neck items).
export const cord = (stroke: string, sw: number) => line('M -31 -7 Q 0 9 31 -7', stroke, sw);

// A cape seen from the front: it flares out behind both sides of the body
// and falls to the floor.
export function cape(fill: string, stroke: string, spread = 76): Shape[] {
  const s = spread;
  return [
    path(`M -30 -24 C -64 -26 ${-s - 2} 4 ${-s} 50 L ${s} 50 C ${s + 2} 4 64 -26 30 -24 Z`, { fill, stroke, sw: 2.5 }),
    ...pair([line(`M ${-s + 11} 8 L ${-s + 9} 46`, stroke, 2)]),
  ];
}

// The number 24, drawn as two strokes so no font is needed. (cx, cy) is the
// middle of the number; at size 1 it is about 21 units wide and 16 tall.
export function num24(cx: number, cy: number, size: number, color: string, sw: number): Shape[] {
  const r = (n: number) => Math.round(n * 100) / 100;
  const p = (x: number, y: number) => `${r(cx + x * size)} ${r(cy + y * size)}`;
  return [
    line(`M ${p(-10.5, -4.5)} Q ${p(-10.5, -8)} ${p(-6, -8)} Q ${p(-1.5, -8)} ${p(-1.5, -4)} Q ${p(-1.5, -0.5)} ${p(-10.5, 8)} L ${p(-1, 8)}`, color, sw),
    line(`M ${p(8, 8)} L ${p(8, -8)} L ${p(1.5, 3)} L ${p(11, 3)}`, color, sw),
  ];
}

export const WHITE = '#FFFFFF';
export const GOLD = '#F6B93B';
export const GOLD_D = '#C98F1B';
export const INK = '#2B2420';

// The app's own colors: the brand purple and the four pillars.
export const BRAND = '#3C3489';   // also the Work pillar
export const BRAND_D = '#2A2466';
export const PERSONAL = '#1D9E75';
export const CARE = '#D97706';
export const SLEEP = '#185FA5';

// ─── Hero helpers ─────────────────────────────────────────────────────────────
const r2 = (n: number) => Math.round(n * 100) / 100;

// A star-burst polygon: `n` points reaching `outer`, with valleys at `inner`
// (sun rays, a badge edge). `turn` rotates it, in degrees.
export function burst(cx: number, cy: number, inner: number, outer: number, n: number, turn = 0): string {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = ((i * 180) / n + turn - 90) * (Math.PI / 180);
    const r = i % 2 === 0 ? outer : inner;
    pts.push(`${r2(cx + Math.cos(a) * r)} ${r2(cy + Math.sin(a) * r)}`);
  }
  return `M ${pts.join(' L ')} Z`;
}

// A round hole for a mask. It is wound the opposite way to the mask's own
// outline, so the fill leaves it open and the eye shows through.
function hole(cx: number, cy: number, r: number): string {
  const k = r2(r * 0.5523);
  return (
    `M ${cx - r} ${cy} C ${cx - r} ${cy + k} ${cx - k} ${cy + r} ${cx} ${cy + r} ` +
    `C ${cx + k} ${cy + r} ${cx + r} ${cy + k} ${cx + r} ${cy} ` +
    `C ${cx + r} ${cy - k} ${cx + k} ${cy - r} ${cx} ${cy - r} ` +
    `C ${cx - k} ${cy - r} ${cx - r} ${cy - k} ${cx - r} ${cy} Z`
  );
}
// The eyes sit 20 units either side of the face anchor. The holes are wider
// than the biggest eye (the Pug's), so the eyes always show whole.
export const EYE_HOLES = `${hole(-20, 0, 10.5)} ${hole(20, 0, 10.5)}`;

// Mask outlines, drawn around the point between the eyes. Each runs
// clockwise (left, over the top, right, back along the bottom).
export const MASKS = {
  // The plain domino
  round:
    'M -37 -1 C -37 -11 -30 -15 -20 -15 C -11 -15 -6 -11 0 -11 C 6 -11 11 -15 20 -15 C 30 -15 37 -11 37 -1 ' +
    'C 37 8 30 13 21 13 C 12 13 7 7 0 5 C -7 7 -12 13 -21 13 C -30 13 -37 8 -37 -1 Z',
  // Outer corners swept up into points
  wing:
    'M -35 4 L -45 -18 C -35 -13 -27 -15 -20 -15 C -11 -15 -6 -11 0 -11 C 6 -11 11 -15 20 -15 C 27 -15 35 -13 45 -18 L 35 4 ' +
    'C 32 10 27 13 21 13 C 12 13 7 7 0 5 C -7 7 -12 13 -21 13 C -27 13 -32 10 -35 4 Z',
  // A jagged top edge, like broken ice
  shard:
    'M -37 0 L -44 -12 L -34 -11 L -32 -22 L -22 -14.5 L -12 -20 L -6 -11.5 L 0 -13 L 6 -11.5 L 12 -20 L 22 -14.5 L 32 -22 L 34 -11 L 44 -12 L 37 0 ' +
    'C 36 8 30 13 21 13 C 12 13 7 7 0 5 C -7 7 -12 13 -21 13 C -30 13 -36 8 -37 0 Z',
  // Two leaves, tips pointing out
  leaf:
    'M -47 -9 C -37 -19 -25 -17 -17 -15 C -10 -13 -5 -10.5 0 -10.5 C 5 -10.5 10 -13 17 -15 C 25 -17 37 -19 47 -9 ' +
    'C 41 6 31 13 21 13 C 12 13 6 7 0 5 C -6 7 -12 13 -21 13 C -31 13 -41 6 -47 -9 Z',
  // Straight edges and corners
  angular:
    'M -39 -6 L -32 -15.5 L -8 -15.5 L -2.5 -9 L 2.5 -9 L 8 -15.5 L 32 -15.5 L 39 -6 L 34 9 L 25 13.5 L 12.5 13.5 L 4 5 L -4 5 L -12.5 13.5 L -25 13.5 L -34 9 Z',
} as const;

// A mask with open eye holes: one filled path, edged all round.
export function heroMask(fill: string, stroke: string, outline: keyof typeof MASKS = 'round', sw = 1.8): Shape {
  return path(`${MASKS[outline]} ${EYE_HOLES}`, { fill, stroke, sw });
}

// A hero cape seen from the front. Only the part outside the body shows, so
// the shape that matters is the two wings and the hem. It is drawn as two
// mirrored halves (their seam is hidden behind the body), with a lining
// stripe along the outer edge and one fold line.
export type CapeHem = 'wave' | 'points' | 'flame' | 'steps';
export function heroCape(
  fill: string, lining: string, stroke: string,
  o: { spread?: number; drop?: number; hem?: CapeHem } = {},
): Shape[] {
  const s = o.spread ?? 80;
  const b = o.drop ?? 50;
  const x0 = -s - 3;
  const hems: Record<CapeHem, string> = {
    wave: `Q ${x0 + 2} ${b + 5} ${x0 + 11} ${b + 1} Q ${x0 + 17} ${b - 6} ${x0 + 24} ${b} Q ${x0 + 30} ${b + 5} ${x0 + 37} ${b - 2}`,
    points: `L ${x0 + 5} ${b + 6} L ${x0 + 11} ${b - 5} L ${x0 + 18} ${b + 7} L ${x0 + 25} ${b - 5} L ${x0 + 32} ${b + 5} L ${x0 + 38} ${b - 4}`,
    flame:
      `Q ${x0 - 3} ${b - 2} ${x0 + 4} ${b + 7} Q ${x0 + 8} ${b - 4} ${x0 + 13} ${b - 6} Q ${x0 + 14} ${b + 2} ${x0 + 21} ${b + 6} ` +
      `Q ${x0 + 24} ${b - 3} ${x0 + 29} ${b - 6} Q ${x0 + 31} ${b} ${x0 + 37} ${b + 3}`,
    steps: `L ${x0} ${b + 3} L ${x0 + 9} ${b + 3} L ${x0 + 9} ${b - 4} L ${x0 + 18} ${b - 4} L ${x0 + 18} ${b + 4} L ${x0 + 27} ${b + 4} L ${x0 + 27} ${b - 3}`,
  };
  return pair([
    path(`M 0 -24 L -30 -24 C -62 -26 ${-s} -2 ${x0} ${b - 12} ${hems[o.hem ?? 'wave']} L -36 ${b - 3} L 0 ${b - 3} Z`, { fill, stroke, sw: 2.5 }),
    line(`M -37 -19 C -60 -18 ${-s + 6} 0 ${x0 + 6} ${b - 14}`, lining, 4.5),
    line(`M ${-s + 19} 6 L ${-s + 17} ${b - 10}`, stroke, 2),
  ]);
}
