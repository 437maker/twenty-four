// houses/tier2.ts — Treehouse, Mountain Lodge, Desert Oasis.

import type { Shape } from '../shapes';
import {
  arch, band, circle, cloud, doorway, ellipse, ground, hill, line, mountain, palmFronds, palmTrunk, path, pine, poly, rect, sky, tile,
} from './art';
import { DOG_SPOT, DOOR, DOOR_REST } from './tier1';
import type { HouseDef } from './types';

// ─── Treehouse ────────────────────────────────────────────────────────────────
// A cabin on a platform in a big tree, reached by a ladder. She rests in the
// cabin doorway, up in the leaves.
const CANOPY_BACK: Shape[] = [
  ellipse(170, 62, 38, 30, { fill: '#4E9E62' }),
  ellipse(256, 60, 40, 32, { fill: '#4E9E62' }),
  ellipse(212, 38, 50, 30, { fill: '#58AB6C' }),
];
const CANOPY_FRONT: Shape[] = [
  ellipse(160, 50, 26, 18, { fill: '#6BBF7C' }),
  ellipse(214, 26, 34, 18, { fill: '#6BBF7C' }),
  ellipse(268, 48, 26, 18, { fill: '#6BBF7C' }),
  circle(176, 38, 2.6, { fill: '#F28C9B' }),
  circle(250, 30, 2.6, { fill: '#FFE08A' }),
];

export const TREEHOUSE: HouseDef = {
  id: 'house_treehouse',
  dark: false,
  backdrop: [
    sky('#CDEBFA'),
    circle(100, 42, 13, { fill: '#FFE08A' }),
    ...cloud(40, 70, 0.75, '#FFFFFF', 0.9),
    hill(-80, 180, 104, 150, '#A5D6A0'),
    ...ground(132, '#86C48A'),
    ...CANOPY_BACK,
  ],
  house: [
    // Trunk, widening into roots
    path('M 226 60 L 250 60 C 250 110 254 140 266 164 L 214 164 C 224 140 228 110 226 60 Z', { fill: '#9A6B43', stroke: '#6F4A2C', sw: 2.4 }),
    line('M 238 96 C 240 116 240 136 244 156', '#6F4A2C', 1.6, 0.5),
    // Platform and its braces
    line('M 172 114 L 226 134', '#6F4A2C', 3),
    rect(160, 110, 110, 7, { fill: '#C79A6B', stroke: '#6F4A2C', sw: 2 }, 2),
    // Cabin
    rect(176, 60, 72, 50, { fill: '#D9A86C', stroke: '#8A5A3C', sw: 2.4 }, 3),
    line('M 177 76 L 191 76', '#8A5A3C', 1.4, 0.6),
    line('M 233 76 L 247 76', '#8A5A3C', 1.4, 0.6),
    line('M 177 92 L 191 92', '#8A5A3C', 1.4, 0.6),
    line('M 233 92 L 247 92', '#8A5A3C', 1.4, 0.6),
    poly([168, 64, 212, 34, 256, 64], { fill: '#C8553D', stroke: '#9E3F2C', sw: 2.4 }),
    ...doorway(193, 68, 38, 42, '#6B4A36', '#8A5A3C'),
    // Railing
    line('M 162 110 L 162 98 L 176 98', '#8A5A3C', 2.2),
    line('M 268 110 L 268 98 L 248 98', '#8A5A3C', 2.2),
    // Ladder down to the grass
    line('M 180 117 L 174 164', '#8A5A3C', 3),
    line('M 196 117 L 192 164', '#8A5A3C', 3),
    ...[126, 138, 150].map((y) => line(`M ${179 - (y - 117) * 0.13} ${y} L ${195.5 - (y - 117) * 0.085} ${y}`, '#8A5A3C', 2.4)),
    // A rope swing
    line('M 262 117 L 262 146', '#D9B98A', 1.6),
    line('M 276 117 L 276 146', '#D9B98A', 1.6),
    rect(259, 145, 20, 4, { fill: '#C79A6B', stroke: '#6F4A2C', sw: 1.2 }, 1.5),
  ],
  ambient: [
    { key: 'canopy', kind: 'sway', shapes: CANOPY_FRONT, period: 5, amount: 1.6, pivot: { x: 214, y: 70 } },
    { key: 'canopy-bob', kind: 'bob', shapes: [ellipse(190, 44, 16, 10, { fill: '#7CCB8B' }), ellipse(240, 42, 16, 10, { fill: '#7CCB8B' })], period: 4, phase: 0.3, dx: 2, dy: 0.8 },
  ],
  dog: DOG_SPOT,
  door: { x: 184, y: 166 },             // the foot of the ladder
  rest: { x: 212, y: 112, size: 44 },   // the cabin doorway, up in the tree
  hit: { x: 150, y: 12, w: 136, h: 154 },
};

// ─── Mountain Lodge ───────────────────────────────────────────────────────────
// An A-frame lodge under snowy peaks. Snow drifts down.
const SNOW: [number, number, number][] = [
  [14, 20, 1.8], [52, 78, 1.4], [88, 34, 1.6], [120, 120, 1.4], [150, 60, 1.8],
  [186, 14, 1.4], [214, 96, 1.6], [246, 44, 1.8], [278, 128, 1.4], [296, 70, 1.6],
  [30, 150, 1.6], [70, 180, 1.4], [164, 170, 1.6], [232, 186, 1.4], [108, 4, 1.4],
];
const snowflakes = (off: number): Shape[] => SNOW.map(([x, y, r]) => circle(x + off, y, r, { fill: '#FFFFFF', op: 0.95 }));

export const MOUNTAIN_LODGE: HouseDef = {
  id: 'house_mountain_lodge',
  dark: false,
  backdrop: [
    sky('#CFE2F5'),
    ...mountain(60, 140, 150, 96, '#8FA9C7', '#FFFFFF'),
    ...mountain(250, 140, 170, 112, '#7F9ABB', '#FFFFFF'),
    ...mountain(150, 140, 120, 70, '#A3B9D3', '#FFFFFF'),
    ...ground(130, '#E6EFF8'),
    band(176, 150, '#DCE8F4'),
    ...pine(140, 150, 1.1, '#3F7A66'),
    ...pine(284, 156, 1.3, '#356B5A'),
    // Snow on the nearer pine
    ellipse(284, 104, 6, 2.4, { fill: '#FFFFFF' }),
    ellipse(284, 120, 9, 2.6, { fill: '#FFFFFF' }),
  ],
  house: [
    // Stone base
    rect(158, 146, 104, 13, { fill: '#A8A39A', stroke: '#85807A', sw: 2 }, 2),
    // A-frame
    poly([154, 150, 210, 50, 266, 150], { fill: '#8A5A3C', stroke: '#5E3B25', sw: 2.4 }),
    // Front wall inside the frame
    poly([172, 150, 210, 82, 248, 150], { fill: '#C79A6B', stroke: '#8A5A3C', sw: 1.6 }),
    // Snow on the roof edges
    path('M 154 150 L 210 50 L 266 150 L 258 150 L 210 64 L 162 150 Z', { fill: '#FFFFFF', stroke: '#C9D8E8', sw: 1.4 }),
    // Round attic window, glowing
    circle(210, 96, 7.5, { fill: '#FFD27A', stroke: '#5E3B25', sw: 2 }),
    line('M 210 88.5 L 210 103.5', '#5E3B25', 1.4),
    line('M 202.5 96 L 217.5 96', '#5E3B25', 1.4),
    ...doorway(190, 114, 40, 44, '#5A3D28', '#5E3B25'),
    // Skis leaning by the door
    line('M 240 156 L 246 124', '#E11D48', 2.6),
    line('M 246 156 L 250 126', '#3B82F6', 2.6),
    // Chimney with a snow cap
    rect(236, 70, 12, 22, { fill: '#A8A39A', stroke: '#85807A', sw: 2 }),
    rect(233, 66, 18, 6, { fill: '#FFFFFF', stroke: '#C9D8E8', sw: 1.2 }, 2.5),
  ],
  ambient: [
    { key: 'snow-a', kind: 'scroll', shapes: tile(snowflakes(0), 20, 200), period: 12, dx: 20, dy: 200 },
    { key: 'snow-b', kind: 'scroll', shapes: tile(snowflakes(-34), -16, 200), period: 20, phase: 0.45, dx: -16, dy: 200 },
  ],
  dog: DOG_SPOT,
  door: DOOR,
  rest: DOOR_REST,
  hit: { x: 152, y: 48, w: 116, h: 114 },
};

// ─── Desert Oasis ─────────────────────────────────────────────────────────────
// A round adobe house by a pool, with a palm. The air shimmers in the heat.
const shimmerRow = (y: number, off: number): Shape[] =>
  [-30, 40, 110, 180, 250].map((x) =>
    line(`M ${x + off} ${y} Q ${x + off + 12} ${y - 3} ${x + off + 24} ${y} Q ${x + off + 36} ${y + 3} ${x + off + 48} ${y}`, '#FFFFFF', 2.2, 0.45),
  );

export const DESERT_OASIS: HouseDef = {
  id: 'house_desert_oasis',
  dark: false,
  backdrop: [
    sky('#FBE3B5'),
    circle(92, 44, 18, { fill: '#FFF3C4' }),
    circle(92, 44, 12, { fill: '#FFD86B' }),
    hill(-120, 140, 96, 150, '#EFC88A'),
    hill(100, 420, 88, 150, '#E9BB78'),
    ...ground(132, '#F0CF94'),
    // The pool
    ellipse(152, 178, 30, 9, { fill: '#F7E3B5' }),
    ellipse(152, 178, 25, 6.5, { fill: '#4FB3D9' }),
    line('M 138 177 Q 144 174 150 177', '#BDE8F5', 1.6),
    // A cactus
    rect(280, 138, 8, 26, { fill: '#5FAE6B', stroke: '#3F8A4E', sw: 1.4 }, 4),
    path('M 280 150 L 274 150 L 274 142', { stroke: '#3F8A4E', sw: 5 }),
    path('M 280 150 L 274 150 L 274 142', { stroke: '#5FAE6B', sw: 3 }),
    ...palmTrunk(142, 160, 0.9),
  ],
  house: [
    // Dome
    path('M 158 158 L 158 118 C 158 84 180 68 210 68 C 240 68 262 84 262 118 L 262 158 Z', { fill: '#E9B98A', stroke: '#B98557', sw: 2.4 }),
    path('M 166 110 C 170 90 186 78 204 76', { stroke: '#F5D4AE', sw: 4, op: 0.8 }),
    // Blue trim band and a top knob
    path('M 158 118 Q 210 108 262 118', { stroke: '#3B82C4', sw: 3 }),
    circle(210, 66, 5, { fill: '#3B82C4', stroke: '#2A62A0', sw: 1.6 }),
    ...doorway(190, 114, 40, 44, '#6B4A36', '#3B82C4'),
    // Small arched windows
    arch(168, 126, 12, 16, { fill: '#6B4A36', stroke: '#B98557', sw: 1.8 }),
    arch(240, 126, 12, 16, { fill: '#6B4A36', stroke: '#B98557', sw: 1.8 }),
    // Clay pots
    path('M 266 158 C 262 150 264 144 270 144 C 276 144 278 150 274 158 Z', { fill: '#C8553D', stroke: '#9E3F2C', sw: 1.4 }),
  ],
  ambient: [
    { key: 'shimmer-a', kind: 'bob', shapes: shimmerRow(112, 0), period: 4, dx: 6, dy: 0, behind: true },
    { key: 'shimmer-b', kind: 'pulse', shapes: shimmerRow(100, 24), period: 5, phase: 0.3, amount: 0.2, behind: true },
    { key: 'palm', kind: 'sway', shapes: palmFronds(142, 160, 0.9), period: 6, amount: 4, pivot: { x: 152.4, y: 110.5 }, behind: true },
  ],
  dog: DOG_SPOT,
  door: DOOR,
  rest: DOOR_REST,
  hit: { x: 156, y: 60, w: 110, h: 102 },
};
