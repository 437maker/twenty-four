// houses/tier1.ts — Cozy Den, Beach Shack, Forest Cabin.
//
// Tier 1 houses are the plainest: one small building, two or three scenery
// shapes, one or two quiet loops.

import { sparkle } from '../shapes';
import type { Shape } from '../shapes';
import {
  arch, band, circle, cloud, doorway, ellipse, ground, hill, line, palmFronds, palmTrunk, path, pine, poly, rect, sky, tile,
} from './art';
import type { HouseDef } from './types';

export const DOG_SPOT = { x: 76, y: 193, size: 108 };
export const DOOR = { x: 210, y: 160 };
// Small enough that the sleeping dog sits inside a 40 x 44 doorway.
export const DOOR_REST = { x: 210, y: 160, size: 46 };

// ─── Cozy Den ─────────────────────────────────────────────────────────────────
// A cream cottage with a red roof on a green hill. Smoke curls from the chimney.
const smokePuff = (x: number, y: number, r: number): Shape[] => [
  circle(x, y, r, { fill: '#FFFFFF', op: 0.85 }),
  circle(x + r * 0.7, y - r * 0.5, r * 0.7, { fill: '#FFFFFF', op: 0.85 }),
];

export const COZY_DEN: HouseDef = {
  id: 'house_cozy_den',
  dark: false,
  backdrop: [
    sky('#BFE3F7'),
    circle(104, 44, 13, { fill: '#FFE08A' }),
    ...cloud(44, 74, 0.8, '#FFFFFF', 0.9),
    hill(-60, 150, 108, 150, '#A5D6A0'),
    hill(120, 380, 100, 150, '#97CC93'),
    ...ground(132, '#8BC98A'),
    // A stepping-stone path from the door toward the dog
    ellipse(196, 170, 9, 3.5, { fill: '#D8CDB8' }),
    ellipse(172, 178, 9, 3.5, { fill: '#D8CDB8' }),
    ellipse(146, 186, 9, 3.5, { fill: '#D8CDB8' }),
  ],
  house: [
    // Chimney (behind the roof)
    rect(234, 60, 15, 30, { fill: '#B06A4F', stroke: '#8A4E38', sw: 2 }),
    rect(231, 56, 21, 6, { fill: '#8A4E38' }, 2),
    // Walls
    rect(160, 100, 100, 58, { fill: '#F6E3C5', stroke: '#C9A77C', sw: 2.4 }, 3),
    // Roof
    poly([148, 104, 210, 58, 272, 104], { fill: '#C8553D', stroke: '#9E3F2C', sw: 2.4 }),
    line('M 170 96 L 250 96', '#9E3F2C', 2, 0.5),
    // Door and windows
    ...doorway(190, 114, 40, 44, '#6B4A36', '#8A5A3C'),
    circle(245, 124, 8, { fill: '#BFE3F7', stroke: '#C9A77C', sw: 2.4 }),
    line('M 245 116 L 245 132', '#C9A77C', 1.6),
    line('M 237 124 L 253 124', '#C9A77C', 1.6),
    circle(175, 124, 8, { fill: '#BFE3F7', stroke: '#C9A77C', sw: 2.4 }),
    line('M 175 116 L 175 132', '#C9A77C', 1.6),
    line('M 167 124 L 183 124', '#C9A77C', 1.6),
    // Bushes at the corners
    ellipse(158, 156, 12, 8, { fill: '#5FAE6B' }),
    ellipse(266, 156, 13, 9, { fill: '#5FAE6B' }),
    circle(262, 152, 2, { fill: '#F28C9B' }),
    circle(270, 157, 2, { fill: '#FFE08A' }),
  ],
  ambient: [
    { key: 'smoke-a', kind: 'rise', shapes: smokePuff(241, 50, 7), period: 6, dx: 10, dy: -34, pivot: { x: 241, y: 50 } },
    { key: 'smoke-b', kind: 'rise', shapes: smokePuff(241, 50, 6), period: 6, phase: 0.5, dx: 14, dy: -30, pivot: { x: 241, y: 50 } },
  ],
  dog: DOG_SPOT,
  door: DOOR,
  rest: DOOR_REST,
  hit: { x: 148, y: 56, w: 126, h: 106 },
};

// ─── Beach Shack ──────────────────────────────────────────────────────────────
// A teal plank shack with a thatched roof on the sand, a palm, and the sea.
const waveRow = (y: number, off: number): Shape[] =>
  [-40, 20, 80, 140, 200, 260, 320].map((x) =>
    line(`M ${x + off} ${y} Q ${x + off + 10} ${y - 4} ${x + off + 20} ${y} Q ${x + off + 30} ${y + 4} ${x + off + 40} ${y}`, '#FFFFFF', 2, 0.7),
  );

export const BEACH_SHACK: HouseDef = {
  id: 'house_beach_shack',
  dark: false,
  backdrop: [
    sky('#BDE8F5'),
    circle(96, 42, 14, { fill: '#FFD86B' }),
    ...cloud(30, 78, 0.7, '#FFFFFF', 0.9),
    band(104, 40, '#4FB3D9'),
    band(104, 5, '#7CCBE6'),
    path('M -300 134 Q 150 120 600 134 L 600 320 L -300 320 Z', { fill: '#F3DDA8' }),
    // Shells and a starfish on the sand
    circle(150, 182, 2.4, { fill: '#F7B7A3' }),
    circle(252, 186, 2, { fill: '#FFFFFF' }),
    ...sparkle('#F2917B', 136, 170, 0.5),
    ...palmTrunk(256, 150, 0.95),
  ],
  house: [
    // Stilts
    rect(166, 150, 6, 12, { fill: '#94683F' }),
    rect(248, 150, 6, 12, { fill: '#94683F' }),
    // Plank walls
    rect(162, 100, 96, 56, { fill: '#3DB8A6', stroke: '#27877A', sw: 2.4 }, 2),
    line('M 163 114 L 257 114', '#27877A', 1.4, 0.6),
    line('M 163 128 L 190 128', '#27877A', 1.4, 0.6),
    line('M 230 128 L 257 128', '#27877A', 1.4, 0.6),
    line('M 163 142 L 190 142', '#27877A', 1.4, 0.6),
    line('M 230 142 L 257 142', '#27877A', 1.4, 0.6),
    // Thatched roof
    poly([150, 104, 172, 66, 248, 66, 270, 104], { fill: '#D9B36C', stroke: '#B08945', sw: 2.4 }),
    line('M 166 78 L 254 78', '#B08945', 1.6, 0.7),
    line('M 159 91 L 261 91', '#B08945', 1.6, 0.7),
    ...doorway(190, 114, 40, 44, '#3E5E66', '#F5EBD2', false),
    // A window with a shutter
    rect(238, 116, 14, 14, { fill: '#BDE8F5', stroke: '#F5EBD2', sw: 2 }, 2),
    // A surfboard leaning on the wall
    path('M 176 158 C 168 138 168 116 176 104 C 184 116 184 138 176 158 Z', { fill: '#FF8FB1', stroke: '#D96C8F', sw: 1.6 }),
    line('M 176 110 L 176 152', '#FFFFFF', 1.6, 0.8),
  ],
  ambient: [
    { key: 'waves-a', kind: 'bob', shapes: waveRow(114, 0), period: 5, dx: 7, dy: 0, behind: true },
    { key: 'waves-b', kind: 'bob', shapes: waveRow(124, 20), period: 6, phase: 0.4, dx: -8, dy: 0, behind: true },
    { key: 'palm', kind: 'sway', shapes: palmFronds(256, 150, 0.95), period: 6, amount: 4, pivot: { x: 266.9, y: 97.8 } },
  ],
  dog: DOG_SPOT,
  door: DOOR,
  rest: DOOR_REST,
  hit: { x: 150, y: 64, w: 122, h: 98 },
};

// ─── Forest Cabin ─────────────────────────────────────────────────────────────
// A log cabin with a green roof among pines. Autumn leaves drift down.
const leaf = (x: number, y: number, fill: string, tilt: number): Shape =>
  path(`M ${x} ${y} Q ${x + 4} ${y - 4 + tilt} ${x + 8} ${y} Q ${x + 4} ${y + 4 + tilt} ${x} ${y} Z`, { fill });
const LEAVES: Shape[] = [
  leaf(20, 18, '#E8833A', 1), leaf(66, 62, '#D9A441', -1), leaf(118, 30, '#C8553D', 0),
  leaf(158, 96, '#E8833A', -1), leaf(204, 12, '#D9A441', 1), leaf(250, 70, '#C8553D', 0),
  leaf(284, 132, '#E8833A', 1), leaf(92, 140, '#D9A441', 0), leaf(34, 110, '#C8553D', -1),
  leaf(228, 150, '#E8833A', 0),
];

export const FOREST_CABIN: HouseDef = {
  id: 'house_forest_cabin',
  dark: false,
  backdrop: [
    sky('#D5EBDD'),
    // Far tree line, then nearer pines
    hill(-80, 130, 84, 140, '#9CC7A4'),
    hill(90, 380, 78, 140, '#9CC7A4'),
    ...pine(18, 136, 1.5, '#5E9C72'),
    ...pine(128, 134, 1.2, '#5E9C72'),
    ...pine(284, 138, 1.7, '#4E8A63'),
    ...pine(150, 140, 1.5, '#3F7A56'),
    ...ground(132, '#7FB069'),
    // A stump and a mushroom
    rect(132, 170, 14, 9, { fill: '#9A6B43', stroke: '#7A5236', sw: 1.4 }, 2),
    ellipse(139, 170, 7, 2.6, { fill: '#D9B98A' }),
    rect(270, 180, 3, 6, { fill: '#F5EBD2' }),
    ellipse(271.5, 180, 6, 3.4, { fill: '#D9534F' }),
  ],
  house: [
    // Stone chimney
    rect(236, 62, 14, 34, { fill: '#A8A39A', stroke: '#85807A', sw: 2 }),
    // Log walls
    rect(160, 100, 100, 58, { fill: '#9A6B43', stroke: '#6F4A2C', sw: 2.4 }, 3),
    ...[112, 124, 136, 148].flatMap((y) => [
      line(`M 161 ${y} L 189 ${y}`, '#6F4A2C', 1.6, 0.7),
      line(`M 231 ${y} L 259 ${y}`, '#6F4A2C', 1.6, 0.7),
    ]),
    // Log ends at the corners
    ...[106, 118, 130, 142, 154].flatMap((y) => [
      circle(160, y, 3.4, { fill: '#C79A6B', stroke: '#6F4A2C', sw: 1.2 }),
      circle(260, y, 3.4, { fill: '#C79A6B', stroke: '#6F4A2C', sw: 1.2 }),
    ]),
    // Roof
    poly([146, 104, 210, 60, 274, 104], { fill: '#3F6B4A', stroke: '#2C4E35', sw: 2.4 }),
    line('M 164 96 L 256 96', '#2C4E35', 2, 0.5),
    ...doorway(190, 114, 40, 44, '#5A3D28', '#C79A6B'),
    // Window glowing warm
    rect(238, 116, 14, 14, { fill: '#FFD98A', stroke: '#6F4A2C', sw: 2 }, 2),
    line('M 245 116 L 245 130', '#6F4A2C', 1.4),
    // Woodpile
    circle(166, 154, 4, { fill: '#C79A6B', stroke: '#6F4A2C', sw: 1.2 }),
    circle(174, 154, 4, { fill: '#C79A6B', stroke: '#6F4A2C', sw: 1.2 }),
    circle(170, 147, 4, { fill: '#C79A6B', stroke: '#6F4A2C', sw: 1.2 }),
  ],
  ambient: [
    { key: 'leaves', kind: 'scroll', shapes: tile(LEAVES, 60, 200), period: 20, dx: 60, dy: 200 },
    { key: 'leaves-sway', kind: 'bob', shapes: [leaf(110, 176, '#E8833A', 0), leaf(248, 168, '#D9A441', 1)], period: 4, dx: 3, dy: 0 },
  ],
  dog: DOG_SPOT,
  door: DOOR,
  rest: DOOR_REST,
  hit: { x: 146, y: 58, w: 130, h: 104 },
};
