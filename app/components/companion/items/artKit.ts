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
