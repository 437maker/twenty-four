// svgMarkup.ts — draws the companion as an SVG string.
//
// Used by scripts/render-companion.mjs to make PNGs of every state, so the
// drawing can be reviewed on the laptop. It reads the same shape data and the
// same pose math as the animated rig, so what the PNG shows is what the phone
// draws at the key pose of each state.

import type { NovaState } from '../../types';
import { BACKDROPS, PALETTE } from './palette';
import type { BackdropName } from './palette';
import { PARTS, HEART, ZEE, sparkle } from './parts';
import type { Shape } from './parts';
import { POSES, accessoryLook, outlineScaleForSize, partTransform } from './poses';
import type { PartName, Pose } from './poses';

const r2 = (n: number) => Math.round(n * 100) / 100;

function shapeMarkup(s: Shape, outlineScale: number): string {
  const sw = (s.sw ?? 1) * (s.stroke === PALETTE.outline ? outlineScale : 1);
  const paint =
    ` fill="${s.fill ?? 'none'}"` +
    (s.stroke ? ` stroke="${s.stroke}" stroke-width="${r2(sw)}" stroke-linecap="round" stroke-linejoin="round"` : '') +
    (s.op !== undefined ? ` opacity="${s.op}"` : '');
  if (s.t === 'path') return `<path d="${s.d}"${paint}/>`;
  if (s.t === 'ellipse') return `<ellipse cx="${s.cx}" cy="${s.cy}" rx="${s.rx}" ry="${s.ry}"${paint}/>`;
  return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}"${paint}/>`;
}

// Set once per render by companionInnerMarkup (this module is synchronous).
let currentOutlineScale = 1;
const shapes = (list: readonly Shape[]) => list.map((s) => shapeMarkup(s, currentOutlineScale)).join('');

// One rig part: a <g> carrying the transform that the pose gives it.
function part(name: PartName, pose: Pose, inner: string): string {
  const t = partTransform(name, pose);
  if (t.opacity <= 0.001) return '';
  const tf =
    `translate(${r2(t.tx)} ${r2(t.ty)}) rotate(${r2(t.rot)} ${t.px} ${t.py}) ` +
    `translate(${t.px} ${t.py}) scale(${r2(t.sx)} ${r2(t.sy)}) translate(${-t.px} ${-t.py})`;
  const op = t.opacity < 0.999 ? ` opacity="${r2(t.opacity)}"` : '';
  return `<g data-part="${name}" transform="${tf}"${op}>${inner}</g>`;
}

function at(x: number, y: number, scale: number, opacity: number, inner: string): string {
  return `<g transform="translate(${x} ${y}) scale(${scale})" opacity="${opacity}">${inner}</g>`;
}

export interface MarkupOptions {
  state: NovaState;
  size: number;
  accessory?: string | null;
  backdrop?: BackdropName | null; // null = transparent
  pose?: Pose;                    // override the state's key pose
  effects?: boolean;              // draw the "z"s / sparkles (default true)
  outlineScale?: number;          // thicker outline for small sizes
}

// Just the dog, in drawing units, without the outer <svg>.
export function companionInnerMarkup(opts: Omit<MarkupOptions, 'size' | 'backdrop'>): string {
  const pose = opts.pose ?? POSES[opts.state];
  currentOutlineScale = opts.outlineScale ?? 1;
  const look = accessoryLook(opts.accessory, opts.state);

  const neck =
    look.neck === 'scarf' ? shapes(PARTS.scarf)
      : look.neck === 'bowTie' ? shapes(PARTS.bowTie)
        : look.neck === 'collar' ? shapes(PARTS.collar)
          : '';

  const head =
    shapes(PARTS.head) +
    shapes(PARTS.face) +
    part('eyesOpen', pose, shapes(PARTS.eyesOpen)) +
    part('lids', pose, shapes(PARTS.lids)) +
    part('eyesHappy', pose, shapes(PARTS.eyesHappy)) +
    part('mouthClosed', pose, shapes(PARTS.mouthClosed)) +
    part('mouthOpen', pose, shapes(PARTS.mouthOpen)) +
    part('earL', pose, shapes(PARTS.earL)) +
    part('earR', pose, shapes(PARTS.earR)) +
    part('knot', pose, (look.hat ? '' : shapes(PARTS.knotTuft)) + shapes(PARTS.bow) + (look.hat ? shapes(PARTS.hat) : ''));

  let effects = '';
  if (opts.effects !== false) {
    if (opts.state === 'sleeping') {
      effects =
        at(150, 74, 0.8, 0.55, shapes(ZEE)) +
        at(163, 54, 1.05, 0.8, shapes(ZEE)) +
        at(178, 31, 1.35, 1, shapes(ZEE));
    } else if (opts.state === 'celebrating') {
      const spots: [number, number, number][] = [
        [22, 60, 1.2], [38, 22, 0.9], [176, 52, 1.3], [160, 14, 0.8],
        [14, 118, 0.8], [186, 112, 1], [60, 8, 0.7], [140, 150, 0.6],
      ];
      effects = spots
        .map(([x, y, sc], i) => at(x, y, sc, 1, shapes(sparkle(PALETTE.sparkles[i % PALETTE.sparkles.length]))))
        .join('');
    }
  }

  return (
    part('shadow', pose, shapes(PARTS.shadow)) +
    part(
      'root',
      pose,
      part('tail', pose, shapes(PARTS.tail)) +
        part('body', pose, shapes(PARTS.body) + neck) +
        part('pawL', pose, shapes(PARTS.pawL)) +
        part('pawR', pose, shapes(PARTS.pawR)) +
        part('head', pose, head),
    ) +
    effects
  );
}

export function companionSvgMarkup(opts: MarkupOptions): string {
  let back = '';
  if (opts.backdrop) {
    const b = BACKDROPS[opts.backdrop];
    back =
      `<rect x="0" y="0" width="200" height="200" fill="${b.sky}"/>` +
      `<rect x="0" y="150" width="200" height="50" fill="${b.ground}"/>`;
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${opts.size}" height="${opts.size}" viewBox="0 0 200 200">` +
    back +
    companionInnerMarkup({ ...opts, outlineScale: opts.outlineScale ?? outlineScaleForSize(opts.size) }) +
    `</svg>`
  );
}

export { HEART };
