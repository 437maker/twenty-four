// houses/art.ts — small drawing helpers shared by the house scenes.
//
// Same vocabulary as the dog (shapes.ts): flat color, one shade tone, a soft
// outline. Paths use only absolute M / L / C / Q / Z, written as "x y" pairs.

import { circle, ellipse, line, path, placeShapes } from '../shapes';
import type { Shape } from '../shapes';

type Paint = { fill?: string; stroke?: string; sw?: number; op?: number };

const r1 = (n: number) => Math.round(n * 10) / 10;

export function rect(x: number, y: number, w: number, h: number, paint: Paint, r = 0): Shape {
  if (r <= 0) return path(`M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`, paint);
  const R = x + w;
  const B = y + h;
  return path(
    `M ${x + r} ${y} L ${R - r} ${y} Q ${R} ${y} ${R} ${y + r} L ${R} ${B - r} Q ${R} ${B} ${R - r} ${B} ` +
      `L ${x + r} ${B} Q ${x} ${B} ${x} ${B - r} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`,
    paint,
  );
}

// A closed polygon from a flat list: poly([x1, y1, x2, y2, ...]).
export function poly(pts: number[], paint: Paint): Shape {
  const pairs: string[] = [];
  for (let i = 0; i < pts.length; i += 2) pairs.push(`${pts[i]} ${pts[i + 1]}`);
  return path(`M ${pairs.join(' L ')} Z`, paint);
}

// A doorway with a round top: (x, y) is its top-left corner.
export function arch(x: number, y: number, w: number, h: number, paint: Paint): Shape {
  const r = w / 2;
  return path(
    `M ${x} ${y + h} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Q ${x + w} ${y} ${x + w} ${y + r} L ${x + w} ${y + h} Z`,
    paint,
  );
}

// Sky and ground are painted far past the 300 x 200 box, so a view wider
// than the scene shows plain sky and ground instead of an empty strip.
export const sky = (fill: string): Shape => rect(-300, -200, 900, 500, { fill });
export const band = (y: number, h: number, fill: string, op?: number): Shape => rect(-300, y, 900, h, { fill, op });
// Ground with a gently curved horizon whose highest point is `y`.
export function ground(y: number, fill: string): Shape[] {
  return [
    path(`M -300 ${y + 10} Q 150 ${y - 10} 600 ${y + 10} L 600 320 L -300 320 Z`, { fill }),
  ];
}

// A rounded hill: a bump from x1 to x2 rising to `top`, sitting on `base`.
export function hill(x1: number, x2: number, top: number, base: number, fill: string): Shape {
  const mid = (x1 + x2) / 2;
  return path(`M ${x1} ${base} Q ${x1 + (mid - x1) * 0.4} ${top} ${mid} ${top} Q ${x2 - (x2 - mid) * 0.4} ${top} ${x2} ${base} Z`, { fill });
}

// A pointed mountain with an optional snow cap.
export function mountain(x: number, base: number, w: number, h: number, fill: string, cap?: string): Shape[] {
  const out: Shape[] = [poly([x - w / 2, base, x, base - h, x + w / 2, base], { fill })];
  if (cap) {
    const c = 0.3; // the top 30% is snow
    out.push(poly([
      x - (w / 2) * c, base - h * (1 - c), x, base - h, x + (w / 2) * c, base - h * (1 - c),
      x + (w / 2) * c * 0.4, r1(base - h * (1 - c) - 5), x, r1(base - h * (1 - c) + 2), x - (w / 2) * c * 0.5, r1(base - h * (1 - c) - 4),
    ], { fill: cap }));
  }
  return out;
}

// A three-puff cloud about 44 wide at s = 1, centred on (x, y).
export function cloud(x: number, y: number, s: number, fill: string, op?: number): Shape[] {
  return [
    ellipse(x - 13 * s, y + 3 * s, 11 * s, 7 * s, { fill, op }),
    ellipse(x, y - 2 * s, 14 * s, 10 * s, { fill, op }),
    ellipse(x + 14 * s, y + 3 * s, 11 * s, 7 * s, { fill, op }),
    rect(x - 14 * s, y + 2 * s, 29 * s, 8 * s, { fill, op }, 4 * s),
  ];
}

// A pine tree: trunk and three stacked triangles. (x, y) is the base.
export function pine(x: number, y: number, s: number, fill: string, trunk = '#7A5236'): Shape[] {
  return [
    rect(x - 2 * s, y - 8 * s, 4 * s, 8 * s, { fill: trunk }),
    poly([x - 13 * s, y - 6 * s, x, y - 24 * s, x + 13 * s, y - 6 * s], { fill }),
    poly([x - 10.5 * s, y - 17 * s, x, y - 33 * s, x + 10.5 * s, y - 17 * s], { fill }),
    poly([x - 7.5 * s, y - 27 * s, x, y - 41 * s, x + 7.5 * s, y - 27 * s], { fill }),
  ];
}

// A palm tree: a curved trunk leaning right and five fronds. (x, y) is the base.
// Returned in two parts so the fronds can sway on their own layer.
export function palmTrunk(x: number, y: number, s: number, fill = '#B98B5E', shade = '#94683F'): Shape[] {
  return [
    path(
      `M ${x - 3 * s} ${y} C ${x - 2 * s} ${y - 22 * s} ${x + 2 * s} ${y - 40 * s} ${x + 9 * s} ${y - 56 * s} ` +
        `L ${x + 14 * s} ${y - 54 * s} C ${x + 8 * s} ${y - 38 * s} ${x + 5 * s} ${y - 20 * s} ${x + 4 * s} ${y} Z`,
      { fill, stroke: shade, sw: 1.2 },
    ),
  ];
}
export function palmFronds(x: number, y: number, s: number, fill = '#3FA36B', shade = '#2C7F50'): Shape[] {
  const cx = x + 11.5 * s;
  const cy = y - 55 * s;
  const frond = (ex: number, ey: number, bend: number) =>
    path(
      `M ${cx} ${cy} Q ${r1(cx + ex * 0.5)} ${r1(cy + ey * 0.5 - bend)} ${r1(cx + ex)} ${r1(cy + ey)} ` +
        `Q ${r1(cx + ex * 0.5)} ${r1(cy + ey * 0.5 - bend + 7 * s)} ${cx} ${cy} Z`,
      { fill, stroke: shade, sw: 1 },
    );
  return [
    frond(-30 * s, 6 * s, 14 * s),
    frond(30 * s, 8 * s, 14 * s),
    frond(-22 * s, -14 * s, 8 * s),
    frond(24 * s, -12 * s, 8 * s),
    frond(2 * s, -24 * s, 4 * s),
    circle(cx, cy, 3 * s, { fill: '#8A5A3C' }),
  ];
}

// Small dots: stars([[x, y, r], ...], color).
export function dots(list: [number, number, number][], fill: string, op?: number): Shape[] {
  return list.map(([x, y, r]) => circle(x, y, r, { fill, op }));
}

// Move a drawing.
export function shift(shapes: readonly Shape[], dx: number, dy: number): Shape[] {
  return placeShapes(shapes, { x: dx, y: dy, rotation: 0, scale: 1 });
}

// For a 'scroll' loop that travels (dx, dy): the shapes plus a second copy
// one loop behind, so the wrap at the end of the loop cannot be seen.
export function tile(shapes: readonly Shape[], dx: number, dy: number): Shape[] {
  return [...shapes, ...shift(shapes, -dx, -dy)];
}

// The warm doorway most houses share: a dark opening with a soft lamp glow
// and a floor line, so a dark dog still shows against it. (x, y) = top-left.
export function doorway(x: number, y: number, w: number, h: number, inside: string, frame: string, round = true): Shape[] {
  const opening = round ? arch(x, y, w, h, { fill: inside, stroke: frame, sw: 3 }) : rect(x, y, w, h, { fill: inside, stroke: frame, sw: 3 }, 3);
  return [
    opening,
    ellipse(x + w / 2, y + h * 0.62, w * 0.36, h * 0.3, { fill: '#FFD98A', op: 0.22 }),
  ];
}

export { circle, ellipse, line, path };
