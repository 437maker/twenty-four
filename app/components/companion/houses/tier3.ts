// houses/tier3.ts — Cloud Castle, Underwater Palace, Sky Tower.

import { sparkle } from '../shapes';
import type { Shape } from '../shapes';
import { arch, band, circle, cloud, doorway, ellipse, line, path, poly, rect, sky, tile } from './art';
import { DOG_SPOT, DOOR, DOOR_REST } from './tier1';
import type { HouseDef } from './types';

// ─── Cloud Castle ─────────────────────────────────────────────────────────────
// A lilac castle with pink roofs, standing on a bank of cloud. Clouds float by.
const cloudBank = (y: number, fill: string): Shape[] => [
  ...[-40, 10, 60, 110, 160, 210, 260, 310].map((x, i) => ellipse(x, y + (i % 2) * 4, 34, 16, { fill })),
  band(y + 6, 300, fill),
];
const tower = (x: number, top: number, w: number, roof: string): Shape[] => [
  rect(x - w / 2, top, w, 158 - top, { fill: '#C9B6F2', stroke: '#9A83D0', sw: 2.2 }, 2),
  poly([x - w / 2 - 4, top + 2, x, top - 26, x + w / 2 + 4, top + 2], { fill: roof, stroke: '#D9799F', sw: 2.2 }),
  arch(x - 4, top + 12, 8, 13, { fill: '#6F5AA8' }),
];

export const CLOUD_CASTLE: HouseDef = {
  id: 'house_cloud_castle',
  dark: false,
  backdrop: [
    sky('#A9D4F5'),
    band(84, 60, '#C6E2F8'),
    circle(98, 40, 13, { fill: '#FFF3C4' }),
    // A rainbow arc behind the castle
    path('M 120 140 C 130 40 290 40 300 140', { stroke: '#F7B7C8', sw: 5, op: 0.8 }),
    path('M 126 140 C 136 48 284 48 294 140', { stroke: '#FFE7A3', sw: 5, op: 0.8 }),
    path('M 132 140 C 142 56 278 56 288 140', { stroke: '#B7E3C0', sw: 5, op: 0.8 }),
    ...cloudBank(140, '#F4E9F7'),
    ...cloudBank(166, '#E9DDF3'),
  ],
  house: [
    ...tower(170, 84, 26, '#F2A7C3'),
    ...tower(250, 84, 26, '#F2A7C3'),
    // Keep
    rect(180, 96, 60, 62, { fill: '#D6C7F6', stroke: '#9A83D0', sw: 2.2 }, 2),
    // Battlements
    ...[180, 194, 208, 222].map((x) => rect(x, 88, 10, 10, { fill: '#D6C7F6', stroke: '#9A83D0', sw: 2 }, 1.5)),
    rect(232, 88, 8, 10, { fill: '#D6C7F6', stroke: '#9A83D0', sw: 2 }, 1.5),
    // Centre spire with a flag
    poly([198, 90, 210, 54, 222, 90], { fill: '#F2A7C3', stroke: '#D9799F', sw: 2.2 }),
    line('M 210 54 L 210 40', '#9A83D0', 2),
    poly([210, 40, 224, 44, 210, 49], { fill: '#FFD86B' }),
    ...doorway(190, 114, 40, 44, '#6F5AA8', '#FFD86B'),
    ...sparkle('#FFFFFF', 170, 52, 0.5),
    ...sparkle('#FFFFFF', 252, 50, 0.45),
    // Cloud puffs in front of the walls, so the castle sits in the cloud
    ellipse(168, 160, 18, 8, { fill: '#F4E9F7' }),
    ellipse(254, 160, 20, 8, { fill: '#F4E9F7' }),
  ],
  ambient: [
    { key: 'clouds-far', kind: 'scroll', shapes: tile([...cloud(40, 66, 0.8, '#FFFFFF', 0.9), ...cloud(210, 24, 0.6, '#FFFFFF', 0.85)], 360, 0), period: 60, dx: 360, dy: 0, behind: true },
    { key: 'cloud-near', kind: 'bob', shapes: cloud(136, 112, 0.7, '#FFFFFF', 0.95), period: 10, dx: 6, dy: 2, behind: true },
    { key: 'flag', kind: 'sway', shapes: sparkle('#FFE7A3', 286, 76, 0.7), period: 4, amount: 12, pivot: { x: 286, y: 76 } },
  ],
  dog: DOG_SPOT,
  door: DOOR,
  rest: DOOR_REST,
  hit: { x: 152, y: 38, w: 116, h: 124 },
};

// ─── Underwater Palace ────────────────────────────────────────────────────────
// A shell-pink palace on the sea floor. Bubbles rise and kelp sways.
const BUBBLES: [number, number, number][] = [
  [24, 30, 3], [62, 120, 2.2], [104, 64, 2.6], [150, 168, 2.2], [176, 20, 2],
  [236, 90, 3], [270, 150, 2.2], [292, 44, 2.6], [128, 110, 1.8], [46, 180, 2.4],
];
const bubbles = (off: number): Shape[] =>
  BUBBLES.flatMap(([x, y, r]) => [
    circle(x + off, y, r, { stroke: '#DDF4FB', sw: 1.2, op: 0.9 }),
    circle(x + off - r * 0.3, y - r * 0.3, r * 0.3, { fill: '#FFFFFF', op: 0.9 }),
  ]);
const kelp = (x: number, h: number, fill: string): Shape[] => [
  path(
    `M ${x - 3} 196 C ${x - 9} ${196 - h * 0.3} ${x + 7} ${196 - h * 0.55} ${x - 2} ${196 - h} ` +
      `C ${x + 12} ${196 - h * 0.6} ${x - 3} ${196 - h * 0.3} ${x + 4} 196 Z`,
    { fill },
  ),
];
const dome = (x: number, y: number, w: number, h: number): Shape[] => [
  path(`M ${x - w / 2} ${y} C ${x - w / 2} ${y - h * 1.25} ${x + w / 2} ${y - h * 1.25} ${x + w / 2} ${y} Z`, { fill: '#F4A6B8', stroke: '#D97B93', sw: 2.2 }),
  line(`M ${x} ${y - h * 0.92} L ${x} ${y}`, '#D97B93', 1.4, 0.6),
  line(`M ${x - w * 0.24} ${y - h * 0.78} Q ${x - w * 0.3} ${y - h * 0.3} ${x - w * 0.28} ${y}`, '#D97B93', 1.4, 0.6),
  line(`M ${x + w * 0.24} ${y - h * 0.78} Q ${x + w * 0.3} ${y - h * 0.3} ${x + w * 0.28} ${y}`, '#D97B93', 1.4, 0.6),
];

export const UNDERWATER_PALACE: HouseDef = {
  id: 'house_underwater_pal',
  dark: true,
  skyTop: '#2F9BD1',
  backdrop: [
    sky('#1F86BD'),
    band(-200, 250, '#2F9BD1'),
    // Shafts of light from the surface
    poly([40, -10, 80, -10, 150, 140, 70, 140], { fill: '#FFFFFF', op: 0.1 }),
    poly([170, -10, 196, -10, 290, 140, 236, 140], { fill: '#FFFFFF', op: 0.08 }),
    // Far rocks
    path('M -40 150 Q 10 96 50 130 Q 80 108 110 150 Z', { fill: '#1A6E9C' }),
    path('M 250 150 Q 280 100 320 150 Z', { fill: '#1A6E9C' }),
    // Sea floor
    path('M -300 140 Q 150 126 600 140 L 600 320 L -300 320 Z', { fill: '#E3CE98' }),
    ellipse(140, 176, 16, 4, { fill: '#D1BA80' }),
    // Coral and a shell
    path('M 138 166 L 138 150 M 138 158 L 131 150 M 138 156 L 146 148', { stroke: '#F2917B', sw: 4 }),
    path('M 262 186 Q 270 174 278 186 Z', { fill: '#FFF1F4', stroke: '#D97B93', sw: 1.4 }),
  ],
  house: [
    // Side domes on round bases
    rect(160, 126, 30, 32, { fill: '#FFF1F4', stroke: '#D97B93', sw: 2.2 }, 3),
    rect(230, 126, 30, 32, { fill: '#FFF1F4', stroke: '#D97B93', sw: 2.2 }, 3),
    ...dome(175, 127, 34, 22),
    ...dome(245, 127, 34, 22),
    // Centre hall
    rect(182, 100, 56, 58, { fill: '#FFF1F4', stroke: '#D97B93', sw: 2.2 }, 3),
    ...dome(210, 101, 62, 34),
    // A pearl on top
    circle(210, 56, 5.5, { fill: '#FFFFFF', stroke: '#C9D8E8', sw: 1.4 }),
    // Round windows
    circle(175, 140, 6, { fill: '#7FD6E8', stroke: '#D97B93', sw: 2 }),
    circle(245, 140, 6, { fill: '#7FD6E8', stroke: '#D97B93', sw: 2 }),
    ...doorway(190, 114, 40, 44, '#3D5F8A', '#F6C343'),
    // Gold trim
    line('M 182 100 L 238 100', '#F6C343', 3),
  ],
  ambient: [
    { key: 'bubbles-a', kind: 'scroll', shapes: tile(bubbles(0), 0, -200), period: 12, dx: 0, dy: -200 },
    { key: 'bubbles-b', kind: 'scroll', shapes: tile(bubbles(-22), 0, -200), period: 20, phase: 0.5, dx: 0, dy: -200, behind: true },
    { key: 'kelp-a', kind: 'sway', shapes: [...kelp(150, 62, '#2FA36B'), ...kelp(160, 44, '#3FBF7F')], period: 5, amount: 5, pivot: { x: 154, y: 196 } },
    { key: 'kelp-b', kind: 'sway', shapes: [...kelp(280, 70, '#2FA36B'), ...kelp(290, 48, '#3FBF7F')], period: 6, phase: 0.4, amount: 5, pivot: { x: 284, y: 196 } },
  ],
  dog: DOG_SPOT,
  door: DOOR,
  rest: DOOR_REST,
  hit: { x: 156, y: 50, w: 108, h: 112 },
};

// ─── Sky Tower ────────────────────────────────────────────────────────────────
// A tall tower over an evening city, with a round lookout window near the top
// and a beacon that blinks. She rests in the lookout.
const building = (x: number, w: number, h: number, fill: string): Shape[] => [
  rect(x, 140 - h, w, h + 4, { fill }),
  ...[0, 1, 2].flatMap((row) =>
    [0, 1].map((col) => rect(x + 4 + col * (w - 12), 140 - h + 6 + row * 11, 4, 5, { fill: '#FFE7A3', op: 0.8 })),
  ),
];

export const SKY_TOWER: HouseDef = {
  id: 'house_sky_tower',
  dark: false,
  skyTop: '#F6B79B',
  backdrop: [
    sky('#F9C9A4'),
    band(-200, 250, '#F6B79B'),
    band(50, 50, '#F9C9A4'),
    band(96, 60, '#FBDDBA'),
    circle(96, 60, 16, { fill: '#FFF0C9' }),
    ...cloud(40, 40, 0.7, '#FFFFFF', 0.7),
    // City skyline
    ...building(-6, 26, 40, '#8E7FB8'),
    ...building(24, 22, 58, '#7F70AB'),
    ...building(120, 24, 46, '#8E7FB8'),
    ...building(266, 24, 62, '#7F70AB'),
    ...building(288, 26, 38, '#8E7FB8'),
    path('M -300 142 Q 150 130 600 142 L 600 320 L -300 320 Z', { fill: '#B7A9D6' }),
    band(170, 150, '#A99BCB'),
    // Plaza lines
    line('M 120 172 L 300 172', '#C9BEE3', 1.6, 0.7),
    line('M 104 186 L 300 186', '#C9BEE3', 1.6, 0.7),
  ],
  house: [
    // Shaft
    poly([196, 160, 202, 96, 218, 96, 224, 160], { fill: '#E8EDF5', stroke: '#9AA7BD', sw: 2.2 }),
    line('M 210 100 L 210 122', '#9AA7BD', 1.4, 0.6),
    // Base hall with the entrance
    rect(180, 132, 60, 28, { fill: '#D5DDEA', stroke: '#9AA7BD', sw: 2.2 }, 4),
    ...doorway(197, 138, 26, 22, '#4D5A78', '#F6C343', false),
    // Lookout pod
    ellipse(210, 70, 40, 30, { fill: '#E8EDF5', stroke: '#9AA7BD', sw: 2.4 }),
    ellipse(210, 70, 31, 22, { fill: '#4D5A78', stroke: '#F6C343', sw: 2.4 }),
    ellipse(210, 80, 20, 8, { fill: '#FFD98A', op: 0.22 }),
    // Mast
    line('M 210 40 L 210 18', '#9AA7BD', 3),
    line('M 202 28 L 218 28', '#9AA7BD', 2),
    circle(210, 16, 3.4, { fill: '#B8324F' }),
  ],
  ambient: [
    { key: 'beacon', kind: 'pulse', shapes: [circle(210, 16, 9, { fill: '#FF6B8A', op: 0.45 }), circle(210, 16, 4, { fill: '#FF3D66' })], period: 2, amount: 0.05 },
    { key: 'clouds', kind: 'scroll', shapes: tile([...cloud(70, 84, 0.6, '#FFFFFF', 0.75), ...cloud(250, 30, 0.5, '#FFFFFF', 0.7)], 360, 0), period: 60, dx: 360, dy: 0, behind: true },
    { key: 'windows', kind: 'pulse', shapes: [rect(28, 96, 4, 5, { fill: '#FFFFFF' }), rect(270, 92, 4, 5, { fill: '#FFFFFF' }), rect(124, 112, 4, 5, { fill: '#FFFFFF' })], period: 6, phase: 0.2, amount: 0.1, behind: true },
  ],
  dog: DOG_SPOT,
  door: { x: 210, y: 162 },
  rest: { x: 210, y: 93, size: 50 },   // the lookout window
  hit: { x: 168, y: 10, w: 84, h: 152 },
};
