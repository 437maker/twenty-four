// svgMarkup.ts — draws the companion as an SVG string.
//
// Used by scripts/render-companion.mjs to make PNGs of every breed, state,
// and item, so the drawings can be reviewed on the laptop. It reads the same
// scene (scene.ts), shape data, and pose math as the animated rig, so what
// the PNG shows is what the phone draws at the key pose of each state.

import type { NovaState } from '../../types';
import { getBreed } from './breeds/index';
import type { BreedDef } from './breeds/types';
import type { Equipped } from './items/itemSlots';
import { BACKDROPS, PALETTE } from './palette';
import type { BackdropName } from './palette';
import { POSES, outlineScaleForSize, partTransform } from './poses';
import type { PartName, Pose } from './poses';
import { buildScene } from './scene';
import { ZEE, sparkle } from './shapes';
import type { Drawable, Shape } from './shapes';

const r2 = (n: number) => Math.round(n * 100) / 100;

// Per-render state (this module is synchronous, so module variables are safe).
let outlineScale = 1;
let clipDefs: string[] = [];
let clipCount = 0;
let clipPrefix = 'c';

function shapeMarkup(s: Shape): string {
  const sw = (s.sw ?? 1) * (s.ol ? outlineScale : 1);
  const paint =
    ` fill="${s.fill ?? 'none'}"` +
    (s.stroke ? ` stroke="${s.stroke}" stroke-width="${r2(sw)}" stroke-linecap="round" stroke-linejoin="round"` : '') +
    (s.op !== undefined ? ` opacity="${s.op}"` : '');
  if (s.t === 'path') return `<path d="${s.d}"${paint}/>`;
  if (s.t === 'ellipse') return `<ellipse cx="${s.cx}" cy="${s.cy}" rx="${s.rx}" ry="${s.ry}"${paint}/>`;
  return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}"${paint}/>`;
}

const shapes = (list: readonly Shape[]) => list.map(shapeMarkup).join('');
// The same, for other drawings (the house scenes).
export const shapesMarkup = shapes;

function drawable(dr: Drawable): string {
  let inner = shapes(dr.shapes); // already placed at its anchor by scene.ts
  if (dr.clip) {
    const id = `${clipPrefix}${clipCount++}`;
    clipDefs.push(`<clipPath id="${id}"><path d="${dr.clip}"/></clipPath>`);
    inner = `<g clip-path="url(#${id})">${inner}</g>`;
  }
  return inner;
}

const drawables = (list: readonly Drawable[]) => list.map(drawable).join('');

// One rig part: a <g> carrying the transform that the pose gives it.
function part(name: PartName, pose: Pose, breed: BreedDef, inner: string): string {
  if (!inner) return '';
  const t = partTransform(name, pose, breed.pivots);
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
  breed?: string | null;          // breed id (default: Maltese)
  equipped?: Equipped;            // what she is wearing
  backdrop?: BackdropName | null; // null = transparent
  pose?: Pose;                    // override the state's key pose
  effects?: boolean;              // draw the "z"s / sparkles (default true)
  outlineScale?: number;          // thicker outline for small sizes
  idPrefix?: string;              // makes clip ids unique when several dogs share one SVG
}

// Just the dog, in drawing units, without the outer <svg>.
export function companionInnerMarkup(opts: Omit<MarkupOptions, 'size' | 'backdrop'>): string {
  const breed = getBreed(opts.breed);
  const pose = opts.pose ?? POSES[opts.state];
  const scene = buildScene(breed, opts.state, opts.equipped ?? {});
  outlineScale = opts.outlineScale ?? 1;
  clipDefs = [];
  clipCount = 0;
  clipPrefix = `${opts.idPrefix ?? 'c'}-`;
  const p = (name: PartName, inner: string) => part(name, pose, breed, inner);

  const knot =
    (scene.tuftHidden || scene.celebrationHat ? '' : drawables(scene.knotTuft)) +
    drawables(scene.knotBase) +
    drawables(scene.headItem) +
    (scene.celebrationHat ? drawables(scene.partyHat) : '');

  const head =
    drawables(scene.head) +
    p('eyesOpen', drawables(scene.eyesOpen)) +
    p('lids', drawables(scene.lids)) +
    p('eyesHappy', drawables(scene.eyesHappy)) +
    p('mouthClosed', drawables(scene.mouthClosed)) +
    p('mouthOpen', drawables(scene.mouthOpen)) +
    drawables(scene.face) +
    p('earL', drawables(scene.earL)) +
    p('earR', drawables(scene.earR)) +
    p('knot', knot);

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

  const dog =
    p('shadow', drawables(scene.shadow)) +
    p(
      'root',
      drawables(scene.aura) +
        p('body', drawables(scene.back)) +
        p('tail', drawables(scene.tail)) +
        p('body', drawables(scene.body)) +
        p('pawL', drawables(scene.pawL)) +
        p('pawR', drawables(scene.pawR)) +
        p('head', head) +
        p('pawR', drawables(scene.held)),
    ) +
    effects;

  return (clipDefs.length ? `<defs>${clipDefs.join('')}</defs>` : '') + dog;
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
