// houses/tier5.ts — Realm of the Gods, Cosmic Sanctuary, Dimension X.
//
// The top tier gets the most flourish: more light, more sparkle, a third loop.

import { sparkle } from '../shapes';
import type { Shape } from '../shapes';
import { band, circle, dots, doorway, ellipse, line, path, poly, rect, sky } from './art';
import { DOG_SPOT, DOOR, DOOR_REST } from './tier1';
import type { HouseDef } from './types';

// ─── Realm of the Gods ────────────────────────────────────────────────────────
// A marble temple above a golden sea of cloud. Rays of light fan out behind it.
const RAYS: Shape[] = [-64, -40, -18, 0, 18, 40, 64].map((deg) => {
  const a = ((deg - 90) * Math.PI) / 180;
  const b = ((deg - 90 + 7) * Math.PI) / 180;
  const p = (ang: number, r: number) => `${Math.round((210 + Math.cos(ang) * r) * 10) / 10} ${Math.round((96 + Math.sin(ang) * r) * 10) / 10}`;
  return path(`M 210 96 L ${p(a, 150)} L ${p(b, 150)} Z`, { fill: '#FFFFFF', op: 0.5 });
});
const goldCloud = (y: number, fill: string): Shape[] => [
  ...[-30, 24, 78, 132, 186, 240, 294].map((x, i) => ellipse(x, y + (i % 2) * 5, 36, 16, { fill })),
  band(y + 6, 300, fill),
];
const column = (x: number): Shape[] => [
  rect(x - 4, 108, 8, 46, { fill: '#FFFDF6', stroke: '#D9C99A', sw: 1.8 }),
  line(`M ${x} 111 L ${x} 151`, '#E8DCB8', 1.4),
  rect(x - 6, 104, 12, 5, { fill: '#F6C343', stroke: '#C9972A', sw: 1.2 }, 1.5),
];

export const REALM_OF_GODS: HouseDef = {
  id: 'house_realm_gods',
  dark: false,
  skyTop: '#FFD27A',
  backdrop: [
    sky('#FFE2A0'),
    band(-200, 240, '#FFD27A'),
    band(40, 60, '#FFE2A0'),
    band(96, 60, '#FFF0C9'),
    circle(210, 96, 46, { fill: '#FFF8E0', op: 0.8 }),
    // Far floating islands
    path('M 16 96 L 60 96 Q 52 112 38 116 Q 24 112 16 96 Z', { fill: '#E9C98A' }),
    ellipse(38, 95, 23, 5, { fill: '#B7D98A' }),
    path('M 110 70 L 138 70 Q 132 80 124 82 Q 116 80 110 70 Z', { fill: '#E9C98A' }),
    ellipse(124, 69.5, 15, 3.5, { fill: '#B7D98A' }),
    ...goldCloud(142, '#FFF6DC'),
    ...goldCloud(168, '#FFEEC2'),
  ],
  house: [
    // Steps
    rect(160, 152, 100, 8, { fill: '#F2E8CC', stroke: '#D9C99A', sw: 1.8 }, 1.5),
    rect(166, 146, 88, 7, { fill: '#FFFDF6', stroke: '#D9C99A', sw: 1.8 }, 1.5),
    // Back wall and doorway
    rect(176, 106, 68, 42, { fill: '#F7F0DC', stroke: '#D9C99A', sw: 1.8 }),
    ...doorway(190, 108, 40, 44, '#7A6A9A', '#F6C343'),
    // Columns
    ...column(174), ...column(186), ...column(234), ...column(246),
    // Entablature and pediment
    rect(164, 96, 92, 9, { fill: '#FFFDF6', stroke: '#D9C99A', sw: 2 }, 1.5),
    poly([160, 97, 210, 62, 260, 97], { fill: '#FFFDF6', stroke: '#D9C99A', sw: 2.2 }),
    poly([180, 92, 210, 71, 240, 92], { fill: '#F6C343', stroke: '#C9972A', sw: 1.4 }),
    ...sparkle('#FFFFFF', 210, 84, 0.9),
    // A flame on the roof peak
    path('M 210 46 Q 217 54 213.5 60 Q 210 64 206.5 60 Q 203 54 210 46 Z', { fill: '#FFC24A', stroke: '#F2912E', sw: 1.4 }),
    // Laurel urns
    circle(164, 142, 5, { fill: '#7FBF7A' }), rect(160.5, 144, 7, 8, { fill: '#F6C343', stroke: '#C9972A', sw: 1.2 }, 1.5),
    circle(256, 142, 5, { fill: '#7FBF7A' }), rect(252.5, 144, 7, 8, { fill: '#F6C343', stroke: '#C9972A', sw: 1.2 }, 1.5),
    // Cloud at the foot of the steps
    ellipse(160, 162, 18, 7, { fill: '#FFF6DC' }),
    ellipse(262, 162, 18, 7, { fill: '#FFF6DC' }),
  ],
  ambient: [
    { key: 'rays', kind: 'sway', shapes: RAYS, period: 12, amount: 5, pivot: { x: 210, y: 96 }, behind: true },
    { key: 'rays-glow', kind: 'pulse', shapes: [circle(210, 96, 60, { fill: '#FFFFFF', op: 0.35 })], period: 6, amount: 0.3, behind: true },
    { key: 'motes', kind: 'rise', shapes: [...sparkle('#FFFFFF', 176, 120, 0.5), ...sparkle('#FFF3C4', 244, 110, 0.45), ...sparkle('#FFFFFF', 150, 150, 0.4)], period: 6, dx: 0, dy: -34, pivot: { x: 210, y: 120 } },
  ],
  dog: DOG_SPOT,
  door: { x: 210, y: 162 },
  rest: { x: 210, y: 154, size: 46 },
  hit: { x: 158, y: 44, w: 104, h: 118 },
};

// ─── Cosmic Sanctuary ─────────────────────────────────────────────────────────
// A glass dome on a floating disc in deep violet space, under a drifting nebula.
const NEBULA_A: Shape[] = [
  ellipse(70, 50, 62, 26, { fill: '#8B5CF6', op: 0.35 }),
  ellipse(110, 36, 44, 18, { fill: '#EC4899', op: 0.3 }),
];
const NEBULA_B: Shape[] = [
  ellipse(236, 40, 58, 22, { fill: '#22D3EE', op: 0.22 }),
  ellipse(270, 62, 40, 16, { fill: '#8B5CF6', op: 0.3 }),
];
const C_STARS_A: [number, number, number][] = [[18, 20, 1.3], [60, 92, 1], [130, 66, 1.4], [150, 16, 1], [288, 100, 1.3], [250, 14, 1.1], [30, 124, 1]];
const C_STARS_B: [number, number, number][] = [[44, 60, 1.1], [96, 14, 1.3], [140, 110, 1], [282, 30, 1.4], [112, 86, 1.1], [270, 132, 1]];

export const COSMIC_SANCTUARY: HouseDef = {
  id: 'house_cosmic_sanct',
  dark: true,
  backdrop: [
    sky('#1B1440'),
    band(96, 60, '#241A52'),
    // A ringed moon
    circle(96, 50, 13, { fill: '#F5D0FE' }),
    circle(92, 46, 3, { fill: '#E9B6F5' }),
    // The floating disc she stands on, with crystals beneath
    path('M -300 146 Q 150 130 600 146 L 600 320 L -300 320 Z', { fill: '#4A3C8C' }),
    band(174, 150, '#3F327A'),
    line('M -300 150 Q 150 134 600 150', '#A78BFA', 2, 0.7),
    ...sparkle('#C4B5FD', 140, 178, 0.6),
    ...sparkle('#C4B5FD', 264, 186, 0.5),
    ...sparkle('#F5D0FE', 28, 168, 0.45),
  ],
  house: [
    // Gold base ring
    ellipse(210, 158, 60, 8, { fill: '#3F327A', stroke: '#F6C343', sw: 2.4 }),
    // Glass dome
    path('M 156 158 C 156 80 264 80 264 158 Z', { fill: '#5EEAD4', op: 0.28 }),
    path('M 156 158 C 156 80 264 80 264 158', { stroke: '#99F6E4', sw: 2.6 }),
    path('M 172 124 C 178 104 192 96 204 94', { stroke: '#FFFFFF', sw: 2.6, op: 0.55 }),
    // Ribs
    path('M 183 158 C 183 106 200 98 210 98 C 220 98 237 106 237 158', { stroke: '#99F6E4', sw: 1.6, op: 0.7 }),
    // The shrine inside: an arch of gold with a star above
    ...doorway(190, 114, 40, 44, '#2E2466', '#F6C343'),
    ...sparkle('#FDE68A', 210, 104, 1),
    // Crystals at the sides
    poly([164, 158, 168, 138, 174, 158], { fill: '#C084FC', stroke: '#9333EA', sw: 1.4 }),
    poly([172, 158, 177, 146, 181, 158], { fill: '#F0ABFC', stroke: '#C026D3', sw: 1.2 }),
    poly([246, 158, 252, 136, 257, 158], { fill: '#C084FC', stroke: '#9333EA', sw: 1.4 }),
    poly([239, 158, 243, 147, 247, 158], { fill: '#67E8F9', stroke: '#0EA5C4', sw: 1.2 }),
    // Finial
    line('M 210 99 L 210 88', '#F6C343', 2.4),
    circle(210, 86, 3.6, { fill: '#FDE68A', stroke: '#F6C343', sw: 1.2 }),
  ],
  ambient: [
    { key: 'nebula-a', kind: 'bob', shapes: NEBULA_A, period: 30, dx: 14, dy: 4, behind: true },
    { key: 'nebula-b', kind: 'bob', shapes: NEBULA_B, period: 20, phase: 0.4, dx: -12, dy: 3, behind: true },
    { key: 'stars-a', kind: 'pulse', shapes: dots(C_STARS_A, '#FFFFFF'), period: 4, amount: 0.2, behind: true },
    { key: 'stars-b', kind: 'pulse', shapes: dots(C_STARS_B, '#F5D0FE'), period: 6, phase: 0.5, amount: 0.2, behind: true },
    { key: 'halo', kind: 'pulse', shapes: [ellipse(210, 120, 62, 46, { fill: '#99F6E4', op: 0.16 })], period: 5, amount: 0.3 },
  ],
  dog: DOG_SPOT,
  door: DOOR,
  rest: DOOR_REST,
  hit: { x: 150, y: 80, w: 120, h: 86 },
};

// ─── Dimension X ──────────────────────────────────────────────────────────────
// Nowhere in particular: a glowing grid floor, floating shards, and a doorway
// that is a slowly turning portal.
const SWIRL: Shape[] = [
  path('M 210 96 C 232 96 244 116 240 136 C 236 122 226 112 210 112 Z', { fill: '#22D3EE', op: 0.9 }),
  path('M 250 126 C 250 148 230 160 210 156 C 224 152 234 142 234 126 Z', { fill: '#A855F7', op: 0.9 }),
  path('M 210 166 C 188 166 176 146 180 126 C 184 140 194 150 210 150 Z', { fill: '#EC4899', op: 0.9 }),
  path('M 170 126 C 170 104 190 92 210 96 C 196 100 186 110 186 126 Z', { fill: '#FDE68A', op: 0.9 }),
];
const shard = (x: number, y: number, s: number, fill: string, stroke: string): Shape =>
  poly([x, y - 9 * s, x + 5 * s, y, x, y + 9 * s, x - 5 * s, y], { fill, stroke, sw: 1.2 });

export const DIMENSION_X: HouseDef = {
  id: 'house_dimension_x',
  dark: true,
  backdrop: [
    sky('#12062B'),
    band(60, 50, '#1E0A45'),
    band(100, 44, '#2C0F5E'),
    // A wireframe sun
    circle(96, 52, 18, { stroke: '#EC4899', sw: 2 }),
    line('M 79 46 L 113 46', '#EC4899', 1.6, 0.8),
    line('M 78 54 L 114 54', '#EC4899', 1.6, 0.8),
    line('M 82 62 L 110 62', '#EC4899', 1.6, 0.8),
    // The grid floor
    band(142, 200, '#1A0B3B'),
    line('M -300 142 L 600 142', '#22D3EE', 2),
    ...[152, 166, 184].map((y) => line(`M -300 ${y} L 600 ${y}`, '#22D3EE', 1.4, 0.6)),
    ...[-260, -150, -40, 70, 150, 230, 340, 450, 560].map((x) => line(`M ${150 + (x - 150) * 0.36} 142 L ${x} 200`, '#22D3EE', 1.4, 0.6)),
  ],
  house: [
    // An impossible frame: two offset squares joined at the corners
    rect(160, 76, 100, 86, { stroke: '#A855F7', sw: 3 }, 2),
    rect(172, 64, 100, 86, { stroke: '#7C3AED', sw: 2, op: 0.7 }, 2),
    line('M 160 76 L 172 64', '#A855F7', 2.4),
    line('M 260 76 L 272 64', '#A855F7', 2.4),
    line('M 260 162 L 272 150', '#A855F7', 2.4),
    // Portal ring
    circle(210, 126, 40, { fill: '#0B0420', stroke: '#F0ABFC', sw: 3.4 }),
    circle(210, 126, 45, { stroke: '#22D3EE', sw: 1.6, op: 0.8 }),
  ],
  ambient: [
    { key: 'swirl', kind: 'spin', shapes: SWIRL, period: 20, pivot: { x: 210, y: 126 } },
    { key: 'core', kind: 'pulse', shapes: [circle(210, 126, 15, { fill: '#0B0420' }), circle(210, 126, 9, { fill: '#F5D0FE', op: 0.9 }), ...sparkle('#FFFFFF', 210, 126, 0.9)], period: 4, amount: 0.55 },
    { key: 'shards-a', kind: 'bob', shapes: [shard(148, 96, 1, '#22D3EE', '#0EA5C4'), shard(284, 112, 0.8, '#F0ABFC', '#C026D3')], period: 6, dx: 0, dy: 5 },
    { key: 'shards-b', kind: 'bob', shapes: [shard(136, 60, 0.7, '#FDE68A', '#D9A441'), shard(288, 44, 1, '#A855F7', '#7C3AED')], period: 10, phase: 0.5, dx: 2, dy: -6, behind: true },
  ],
  dog: DOG_SPOT,
  door: { x: 210, y: 166 },
  rest: { x: 210, y: 160, size: 52 },   // inside the portal
  hit: { x: 156, y: 62, w: 118, h: 106 },
};
