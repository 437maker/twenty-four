// houses/houseMarkup.ts — draws a house scene as an SVG string.
//
// Used by scripts/render-companion.mjs to make the review sheets. It reads
// the same HouseDef the yard draws, with every ambient element frozen at its
// "still" phase (the one Reduce Motion and the Shop cards show).

import type { NovaState } from '../../../types';
import type { Equipped } from '../items/itemSlots';
import { companionInnerMarkup, shapesMarkup } from '../svgMarkup';
import { SCENE_H, SCENE_W, stillPose } from './types';
import type { Ambient, HouseDef } from './types';

const r2 = (n: number) => Math.round(n * 100) / 100;

function ambientMarkup(a: Ambient): string {
  const p = stillPose(a);
  const px = a.pivot?.x ?? SCENE_W / 2;
  const py = a.pivot?.y ?? SCENE_H / 2;
  const tf =
    `translate(${r2(p.tx)} ${r2(p.ty)}) rotate(${r2(p.rot)} ${px} ${py}) ` +
    `translate(${px} ${py}) scale(${r2(p.scale)}) translate(${-px} ${-py})`;
  return `<g transform="${tf}" opacity="${r2(p.opacity)}">${shapesMarkup(a.shapes)}</g>`;
}

export interface HouseMarkupOptions {
  dog?: {
    breed?: string | null;
    equipped?: Equipped;
    state?: NovaState;
    inside?: boolean;   // true = resting inside (sleeping, at the rest spot)
  } | null;
  idPrefix?: string;
  marks?: boolean;      // draw the door and rest anchors, for checking them
}

// The scene without the outer <svg>, in scene units (300 x 200).
export function houseInnerMarkup(def: HouseDef, opts: HouseMarkupOptions = {}): string {
  const behind = def.ambient.filter((a) => a.behind).map(ambientMarkup).join('');
  const front = def.ambient.filter((a) => !a.behind).map(ambientMarkup).join('');
  let dog = '';
  if (opts.dog) {
    const inside = !!opts.dog.inside;
    const spot = inside ? def.rest : def.dog;
    const s = spot.size / 200;
    dog =
      `<g transform="translate(${r2(spot.x - spot.size / 2)} ${r2(spot.y - spot.size)}) scale(${r2(s)})">` +
      companionInnerMarkup({
        state: inside ? 'sleeping' : opts.dog.state ?? 'idle',
        breed: opts.dog.breed,
        equipped: opts.dog.equipped,
        idPrefix: `${opts.idPrefix ?? 'h'}-dog`,
      }) +
      `</g>`;
  }
  const marks = opts.marks
    ? `<circle cx="${def.door.x}" cy="${def.door.y}" r="3" fill="#FF00FF"/>` +
      `<circle cx="${def.rest.x}" cy="${def.rest.y}" r="3" fill="#00FFFF"/>` +
      `<rect x="${def.hit.x}" y="${def.hit.y}" width="${def.hit.w}" height="${def.hit.h}" fill="none" stroke="#FF00FF" stroke-width="1" stroke-dasharray="4 3"/>`
    : '';
  return shapesMarkup(def.backdrop) + behind + shapesMarkup(def.house) + front + dog + marks;
}

export function houseSvgMarkup(def: HouseDef, width: number, opts: HouseMarkupOptions = {}): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${r2((width * SCENE_H) / SCENE_W)}" viewBox="0 0 ${SCENE_W} ${SCENE_H}">` +
    houseInnerMarkup(def, opts) +
    `</svg>`
  );
}
