// chestArt.ts — the drawing of a chest, as shape data in a 100 x 100 box.
//
// Three parts, so the lid can lift on its own layer:
//   body    the box and its lock plate
//   inside  the dark opening and the glow that shows once the lid is up
//   lid     the rounded top
//
// Same flat style as the dog and the houses: one base tone, one shade tone,
// a soft outline. The three tiers share the drawing and differ in color.

import { circle, ellipse, line, path, sparkle } from '../companion/shapes';
import type { Shape } from '../companion/shapes';
import type { ChestTier } from '../../data/chestLoot';

export const CHEST_BOX = 100;

interface ChestPalette {
  wood: string;      // main color
  shade: string;     // darker tone of it
  outline: string;
  trim: string;      // the metal bands
  trimShade: string;
  lock: string;
  glow: string;      // the light inside
}

export const CHEST_PALETTES: Record<ChestTier, ChestPalette> = {
  wooden: { wood: '#B8804A', shade: '#96643A', outline: '#6F4A2C', trim: '#8E8A84', trimShade: '#6E6A64', lock: '#E8E2D0', glow: '#FFE7A3' },
  silver: { wood: '#D3DBE6', shade: '#AEB9CA', outline: '#6E7A92', trim: '#7F8CA6', trimShade: '#5E6A84', lock: '#F6C343', glow: '#DDF4FB' },
  gold:   { wood: '#F6C343', shade: '#DDA52E', outline: '#A8741C', trim: '#C9862A', trimShade: '#A8741C', lock: '#FF6B8A', glow: '#FFF3C4' },
};

export interface ChestParts { body: Shape[]; inside: Shape[]; lid: Shape[] }

export function chestParts(tier: ChestTier): ChestParts {
  const c = CHEST_PALETTES[tier];
  const body: Shape[] = [
    // Ground shadow
    ellipse(50, 90, 40, 5, { fill: '#2B2420', op: 0.14 }),
    // The box
    path('M 14 50 L 86 50 L 86 82 Q 86 88 80 88 L 20 88 Q 14 88 14 82 Z', { fill: c.wood, stroke: c.outline, sw: 2.6 }),
    path('M 15.5 70 L 84.5 70 L 84.5 82 Q 84.5 86.5 80 86.5 L 20 86.5 Q 15.5 86.5 15.5 82 Z', { fill: c.shade }),
    // Plank line
    line('M 16 62 L 84 62', c.shade, 1.8),
    // Metal bands
    path('M 24 50 L 32 50 L 32 88 L 24 88 Z', { fill: c.trim, stroke: c.trimShade, sw: 1.2 }),
    path('M 68 50 L 76 50 L 76 88 L 68 88 Z', { fill: c.trim, stroke: c.trimShade, sw: 1.2 }),
    circle(28, 58, 1.6, { fill: c.trimShade }), circle(28, 80, 1.6, { fill: c.trimShade }),
    circle(72, 58, 1.6, { fill: c.trimShade }), circle(72, 80, 1.6, { fill: c.trimShade }),
    // Lock plate
    path('M 43 50 L 57 50 L 57 61 Q 57 67 50 67 Q 43 67 43 61 Z', { fill: c.lock, stroke: c.outline, sw: 1.8 }),
    circle(50, 57, 2.2, { fill: c.outline }),
    line('M 50 58 L 50 62', c.outline, 1.8),
  ];
  const inside: Shape[] = [
    ellipse(50, 50, 35, 7, { fill: '#3A2A22' }),
    ellipse(50, 49, 27, 9, { fill: c.glow, op: 0.9 }),
    ellipse(50, 46, 16, 9, { fill: '#FFFFFF', op: 0.7 }),
  ];
  const lid: Shape[] = [
    path('M 12 51 L 12 42 Q 12 22 50 22 Q 88 22 88 42 L 88 51 Z', { fill: c.wood, stroke: c.outline, sw: 2.6 }),
    path('M 18 40 Q 20 27 44 25', { stroke: '#FFFFFF', sw: 3, op: 0.35 }),
    // Bands that carry on from the body
    path('M 24 51 L 24 29 Q 28 27 32 26 L 32 51 Z', { fill: c.trim, stroke: c.trimShade, sw: 1.2 }),
    path('M 68 51 L 68 26 Q 72 27 76 29 L 76 51 Z', { fill: c.trim, stroke: c.trimShade, sw: 1.2 }),
    // Rim
    path('M 12 46 L 88 46 L 88 51 L 12 51 Z', { fill: c.shade, stroke: c.outline, sw: 1.6 }),
    // The top half of the lock
    path('M 44 44 L 56 44 L 56 52 L 44 52 Z', { fill: c.lock, stroke: c.outline, sw: 1.6 }),
  ];
  if (tier === 'gold') {
    lid.push(...sparkle('#FFFFFF', 40, 33, 0.5));
    body.push(...sparkle('#FFFFFF', 60, 76, 0.4));
  }
  if (tier === 'silver') lid.push(...sparkle('#FFFFFF', 60, 32, 0.4));
  return { body, inside, lid };
}
