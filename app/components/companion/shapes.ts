// shapes.ts — the small vocabulary every drawing in the companion is made of.
//
// A drawing is a list of Shapes (paths, circles, ellipses) in a 200 x 200 box.
// A Drawable is a list of shapes plus where to put it (an anchor), an optional
// clip, and an optional effect. Breeds, items, and all three renderers
// (animated layers, static SVG, SVG text for the PNG script) speak only this.
//
// No React or React Native imports here: the render script loads this file
// directly in Node.

export type Shape = (
  | { t: 'path'; d: string }
  | { t: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { t: 'circle'; cx: number; cy: number; r: number }
) & {
  fill?: string;
  stroke?: string;
  sw?: number;   // stroke width, drawing units
  op?: number;   // opacity
  ol?: boolean;  // true = this stroke is the dog's soft outline (thickened at small sizes)
};

// A point on the dog where an item is attached.
//   x, y      position in the 200 x 200 drawing box
//   rotation  degrees, clockwise
//   scale     1 = the size the item was drawn at (the Maltese)
export interface Anchor { x: number; y: number; rotation: number; scale: number }

// Looping effects an item can have. All of them stop under Reduce Motion.
//   pulse    glows: fades a little and swells a little
//   bob      floats up and down
//   spin     turns a full circle (rune rings, orbiting dots)
//   shimmer  fades in and out without moving (a sheen on fabric, an aurora)
export type ItemFx = 'pulse' | 'bob' | 'spin' | 'shimmer';

export interface Drawable {
  key: string;
  shapes: readonly Shape[];
  at?: Anchor;      // the anchor these shapes were placed at (already applied; kept as the pivot for effects)
  clip?: string;    // an SVG path, in drawing-box coordinates, to clip to
  fx?: ItemFx;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

// Flip a path around the vertical centre line (x = `axis`, default 100).
// Paths must use only absolute M / L / C / Q / Z commands.
export function mirrorPath(d: string, axis = 100): string {
  let isX = true;
  return d.replace(/[MLCQZ]|-?\d*\.?\d+/g, (tok) => {
    if (/[MLCQZ]/.test(tok)) { isX = true; return tok; }
    const out = isX ? String(r2(2 * axis - parseFloat(tok))) : tok;
    isX = !isX;
    return out;
  });
}

export function mirrorShape(s: Shape, axis = 100): Shape {
  if (s.t === 'path') return { ...s, d: mirrorPath(s.d, axis) };
  return { ...s, cx: 2 * axis - s.cx };
}

export const mirrorAll = (list: readonly Shape[], axis = 100): Shape[] => list.map((s) => mirrorShape(s, axis));

// A shape and its mirror image.
export const both = (list: readonly Shape[], axis = 100): Shape[] => [...list, ...mirrorAll(list, axis)];

// ─── Tiny constructors, to keep the drawings readable ─────────────────────────
type Paint = { fill?: string; stroke?: string; sw?: number; op?: number; ol?: boolean };

export const path = (d: string, paint: Paint = {}): Shape => ({ t: 'path', d, ...paint });
export const circle = (cx: number, cy: number, r: number, paint: Paint = {}): Shape => ({ t: 'circle', cx, cy, r, ...paint });
export const ellipse = (cx: number, cy: number, rx: number, ry: number, paint: Paint = {}): Shape => ({ t: 'ellipse', cx, cy, rx, ry, ...paint });
// A stroke with no fill (fold lines, mouth lines).
export const line = (d: string, stroke: string, sw: number, op?: number): Shape => ({ t: 'path', d, stroke, sw, op });

// ─── Effects (drawn around 0,0 in their own small box) ────────────────────────
export const HEART: Shape[] = [
  path('M 0 7 C -11 -1 -9 -10 -4.5 -10 C -2 -10 0 -8 0 -5.5 C 0 -8 2 -10 4.5 -10 C 9 -10 11 -1 0 7 Z', {
    fill: '#F2607A', stroke: '#FFFFFF', sw: 1.4,
  }),
];

// The letter "z" as a path, so no font is needed.
export const ZEE: Shape[] = [
  line('M -5 -5 L 5 -5 L -5 5 L 5 5', '#8FA6CC', 4.6),
  line('M -5 -5 L 5 -5 L -5 5 L 5 5', '#FFFFFF', 2.4),
];

export const SPARKLE_PATH = 'M 0 -7 Q 1.4 -1.4 7 0 Q 1.4 1.4 0 7 Q -1.4 1.4 -7 0 Q -1.4 -1.4 0 -7 Z';

// Four-point sparkle, optionally moved and resized.
export function sparkle(color: string, x = 0, y = 0, scale = 1): Shape[] {
  if (x === 0 && y === 0 && scale === 1) return [path(SPARKLE_PATH, { fill: color })];
  const d = SPARKLE_PATH.replace(/(-?\d*\.?\d+) (-?\d*\.?\d+)/g, (_m, px, py) =>
    `${r2(parseFloat(px) * scale + x)} ${r2(parseFloat(py) * scale + y)}`);
  return [path(d, { fill: color })];
}

// ─── Placing shapes at an anchor ──────────────────────────────────────────────
// Items are drawn around (0, 0). placeShapes() moves, scales, and rotates
// them to an anchor and returns ordinary shapes in drawing-box coordinates.
// Doing this once, in plain math, means no renderer needs nested transforms,
// and the result can be checked in a unit test.
function ellipseAsPath(cx: number, cy: number, rx: number, ry: number): string {
  const k = 0.5523; // control-point distance that makes four curves look like a circle
  const ox = rx * k;
  const oy = ry * k;
  return (
    `M ${cx - rx} ${cy} C ${cx - rx} ${cy - oy} ${cx - ox} ${cy - ry} ${cx} ${cy - ry} ` +
    `C ${cx + ox} ${cy - ry} ${cx + rx} ${cy - oy} ${cx + rx} ${cy} ` +
    `C ${cx + rx} ${cy + oy} ${cx + ox} ${cy + ry} ${cx} ${cy + ry} ` +
    `C ${cx - ox} ${cy + ry} ${cx - rx} ${cy + oy} ${cx - rx} ${cy} Z`
  );
}

export function placeShapes(shapes: readonly Shape[], at: Anchor): Shape[] {
  if (at.x === 0 && at.y === 0 && at.scale === 1 && at.rotation === 0) return [...shapes];
  const rad = (at.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const pt = (x: number, y: number): [number, number] => [
    r2((x * cos - y * sin) * at.scale + at.x),
    r2((x * sin + y * cos) * at.scale + at.y),
  ];
  const movePath = (d: string) =>
    d.replace(/(-?\d*\.?\d+) (-?\d*\.?\d+)/g, (_m, px, py) => pt(parseFloat(px), parseFloat(py)).join(' '));

  return shapes.map((s) => {
    const sw = s.sw !== undefined ? r2(s.sw * at.scale) : undefined;
    if (s.t === 'path') return { ...s, d: movePath(s.d), sw };
    if (s.t === 'circle') {
      const [cx, cy] = pt(s.cx, s.cy);
      return { ...s, cx, cy, r: r2(s.r * at.scale), sw };
    }
    if (at.rotation === 0) {
      const [cx, cy] = pt(s.cx, s.cy);
      return { ...s, cx, cy, rx: r2(s.rx * at.scale), ry: r2(s.ry * at.scale), sw };
    }
    // A rotated ellipse cannot stay an <ellipse>; turn it into a path first.
    const { cx, cy, rx, ry, t: _t, ...paint } = s;
    return { t: 'path' as const, ...paint, d: movePath(ellipseAsPath(cx, cy, rx, ry)), sw };
  });
}
