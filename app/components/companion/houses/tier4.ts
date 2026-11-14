// houses/tier4.ts — Space Station, Dragon's Lair, Time Fortress.

import { sparkle } from '../shapes';
import type { Shape } from '../shapes';
import { arch, band, circle, dots, doorway, ellipse, line, mountain, path, poly, rect, sky } from './art';
import { DOG_SPOT, DOOR, DOOR_REST } from './tier1';
import type { HouseDef } from './types';

// ─── Space Station ────────────────────────────────────────────────────────────
// A station on a grey moon. Stars twinkle and a ring of lights turns slowly
// around the dome. She rests in the dome window.
const STARS_A: [number, number, number][] = [
  [20, 24, 1.4], [70, 60, 1.1], [128, 18, 1.5], [160, 84, 1], [286, 96, 1.3], [42, 104, 1.1], [276, 20, 1.2],
];
const STARS_B: [number, number, number][] = [
  [52, 14, 1.1], [104, 92, 1.3], [144, 48, 1], [292, 56, 1.4], [14, 70, 1.2], [120, 122, 1], [258, 124, 1.1],
];
const ringLights: Shape[] = [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
  const a = (deg * Math.PI) / 180;
  const x = Math.round((210 + Math.cos(a) * 43) * 10) / 10;
  const y = Math.round((84 + Math.sin(a) * 43) * 10) / 10;
  return circle(x, y, deg % 90 === 0 ? 3 : 2, { fill: deg % 90 === 0 ? '#7FE3F2' : '#FFE7A3' });
});

export const SPACE_STATION: HouseDef = {
  id: 'house_space_station',
  dark: true,
  backdrop: [
    sky('#141B3C'),
    // A blue planet with a ring, low on the left
    circle(92, 48, 17, { fill: '#4F8FD9' }),
    path('M 80 40 Q 92 34 104 42', { stroke: '#8FC1F2', sw: 3, op: 0.8 }),
    path('M 79 54 Q 90 60 103 55', { stroke: '#3B74B8', sw: 3, op: 0.8 }),
    ellipse(92, 48, 27, 6, { stroke: '#C9D8F2', sw: 2, op: 0.8 }),
    // Moon surface
    path('M -300 140 Q 150 124 600 140 L 600 320 L -300 320 Z', { fill: '#7A8099' }),
    band(172, 150, '#6C728C'),
    ellipse(140, 176, 14, 4, { fill: '#5E647D' }),
    ellipse(262, 186, 18, 5, { fill: '#5E647D' }),
    ellipse(30, 160, 10, 3, { fill: '#5E647D' }),
  ],
  house: [
    // Legs
    line('M 184 150 L 174 162', '#8A93AD', 4),
    line('M 236 150 L 246 162', '#8A93AD', 4),
    // Solar panels on arms
    line('M 166 104 L 254 104', '#8A93AD', 3),
    rect(140, 92, 28, 24, { fill: '#3B5FC4', stroke: '#C9D8F2', sw: 2 }, 2),
    line('M 154 92 L 154 116', '#C9D8F2', 1.2),
    line('M 140 104 L 168 104', '#C9D8F2', 1.2),
    rect(252, 92, 28, 24, { fill: '#3B5FC4', stroke: '#C9D8F2', sw: 2 }, 2),
    line('M 266 92 L 266 116', '#C9D8F2', 1.2),
    line('M 252 104 L 280 104', '#C9D8F2', 1.2),
    // Main module
    rect(176, 96, 68, 58, { fill: '#E8EDF5', stroke: '#9AA7BD', sw: 2.4 }, 12),
    rect(176, 132, 68, 8, { fill: '#F2622E' }),
    // Dome window
    circle(210, 84, 30, { fill: '#E8EDF5', stroke: '#9AA7BD', sw: 2.4 }),
    circle(210, 84, 24, { fill: '#2A3566', stroke: '#7FE3F2', sw: 2.4 }),
    ellipse(210, 96, 16, 7, { fill: '#FFD98A', op: 0.2 }),
    path('M 194 72 Q 200 64 210 62', { stroke: '#FFFFFF', sw: 2, op: 0.5 }),
    // Hatch with a ramp
    rect(198, 136, 24, 22, { fill: '#4D5A78', stroke: '#F6C343', sw: 2 }, 3),
    poly([198, 158, 222, 158, 228, 164, 192, 164], { fill: '#C9D0DE', stroke: '#9AA7BD', sw: 1.6 }),
    // Antenna
    line('M 236 62 L 246 44', '#9AA7BD', 2.4),
    circle(247, 42, 3, { fill: '#FF6B8A' }),
  ],
  ambient: [
    { key: 'stars-a', kind: 'pulse', shapes: dots(STARS_A, '#FFFFFF'), period: 4, amount: 0.25, behind: true },
    { key: 'stars-b', kind: 'pulse', shapes: dots(STARS_B, '#FFF3C4'), period: 6, phase: 0.5, amount: 0.25, behind: true },
    { key: 'ring', kind: 'spin', shapes: ringLights, period: 30, pivot: { x: 210, y: 84 } },
  ],
  dog: DOG_SPOT,
  door: { x: 210, y: 166 },
  rest: { x: 210, y: 107, size: 44 },   // the dome window
  hit: { x: 140, y: 40, w: 142, h: 126 },
};

// ─── Dragon's Lair ────────────────────────────────────────────────────────────
// A cave in dark rock shaped like a dragon's head, lit from inside by embers.
const ember = (x: number, y: number, r: number, fill: string): Shape => circle(x, y, r, { fill });

export const DRAGONS_LAIR: HouseDef = {
  id: 'house_dragons_lair',
  dark: true,
  backdrop: [
    sky('#3B2233'),
    band(60, 90, '#5A2B36'),
    band(104, 50, '#8A3A34'),
    circle(96, 52, 12, { fill: '#F6C78A', op: 0.9 }),
    // Far volcano with a lava streak
    ...mountain(54, 140, 140, 74, '#2E1C28'),
    poly([46, 68, 62, 68, 58, 76, 50, 76], { fill: '#F2622E' }),
    line('M 54 76 L 50 96 L 56 112', '#F2622E', 2.6),
    ...mountain(292, 140, 110, 60, '#2E1C28'),
    // Scorched ground
    path('M -300 140 Q 150 126 600 140 L 600 320 L -300 320 Z', { fill: '#4A3640' }),
    band(172, 150, '#402E38'),
    // Lava pool and cracks
    ellipse(146, 180, 20, 5.5, { fill: '#F2622E' }),
    ellipse(146, 180, 12, 3, { fill: '#FFC24A' }),
    line('M 250 180 L 264 174 L 276 182', '#F2622E', 2),
  ],
  house: [
    // Horns (behind the head)
    path('M 172 86 C 160 70 160 50 170 34 C 172 54 180 66 192 74 Z', { fill: '#D9C7A8', stroke: '#9A8A6E', sw: 2 }),
    path('M 248 86 C 260 70 260 50 250 34 C 248 54 240 66 228 74 Z', { fill: '#D9C7A8', stroke: '#9A8A6E', sw: 2 }),
    // The rock head
    path('M 150 160 C 146 120 158 84 186 70 C 200 62 220 62 234 70 C 262 84 274 120 270 160 Z', { fill: '#5C4954', stroke: '#32232D', sw: 2.6 }),
    // Brow ridge and glowing eyes
    path('M 166 100 Q 188 86 206 100', { stroke: '#32232D', sw: 3 }),
    path('M 214 100 Q 232 86 254 100', { stroke: '#32232D', sw: 3 }),
    path('M 176 104 Q 186 98 198 106 Q 186 110 176 104 Z', { fill: '#FFC24A' }),
    path('M 244 104 Q 234 98 222 106 Q 234 110 244 104 Z', { fill: '#FFC24A' }),
    // Cave mouth
    path('M 184 160 L 184 134 Q 184 114 210 114 Q 236 114 236 134 L 236 160 Z', { fill: '#3A1F22', stroke: '#32232D', sw: 2.6 }),
    // Teeth
    poly([190, 117, 196, 128, 201, 115], { fill: '#F5EBD2' }),
    poly([219, 115, 224, 128, 230, 117], { fill: '#F5EBD2' }),
    // Scales
    line('M 160 132 Q 166 126 172 132', '#32232D', 1.8, 0.7),
    line('M 248 132 Q 254 126 260 132', '#32232D', 1.8, 0.7),
    line('M 200 80 Q 210 74 220 80', '#32232D', 1.8, 0.7),
    // Gold at the door
    circle(244, 158, 3, { fill: '#F6C343' }), circle(250, 160, 3, { fill: '#F6C343' }), circle(247, 154, 3, { fill: '#FFD86B' }),
  ],
  ambient: [
    { key: 'glow', kind: 'pulse', shapes: [ellipse(210, 146, 22, 16, { fill: '#F2622E', op: 0.75 }), ellipse(210, 150, 13, 9, { fill: '#FFC24A', op: 0.8 })], period: 4, amount: 0.45 },
    { key: 'embers-a', kind: 'rise', shapes: [ember(200, 118, 1.8, '#FFC24A'), ember(222, 112, 1.4, '#F2622E')], period: 5, dx: -8, dy: -46, pivot: { x: 210, y: 116 } },
    { key: 'embers-b', kind: 'rise', shapes: [ember(214, 116, 1.6, '#FFC24A'), ember(146, 176, 1.6, '#FFC24A')], period: 6, phase: 0.5, dx: 10, dy: -40, pivot: { x: 210, y: 116 } },
  ],
  dog: DOG_SPOT,
  door: DOOR,
  rest: DOOR_REST,
  hit: { x: 148, y: 32, w: 124, h: 130 },
};

// ─── Time Fortress ────────────────────────────────────────────────────────────
// A stone fortress whose keep is one big clock. The hands turn.
const hand = (len: number, w: number, fill: string): Shape[] => [
  path(`M ${210 - w} 82 L 210 ${82 - len} L ${210 + w} 82 Z`, { fill }),
];
const gear = (x: number, y: number, r: number, fill: string, stroke: string): Shape[] => [
  ...[0, 45, 90, 135].map((deg) => {
    const a = (deg * Math.PI) / 180;
    const dx = Math.round(Math.cos(a) * (r + 2.5) * 10) / 10;
    const dy = Math.round(Math.sin(a) * (r + 2.5) * 10) / 10;
    return line(`M ${x - dx} ${y - dy} L ${x + dx} ${y + dy}`, stroke, 4);
  }),
  circle(x, y, r, { fill, stroke, sw: 2 }),
  circle(x, y, r * 0.35, { fill: stroke }),
];

export const TIME_FORTRESS: HouseDef = {
  id: 'house_time_fortress',
  dark: false,
  skyTop: '#BBDCE4',
  backdrop: [
    sky('#CFE6EA'),
    band(-200, 260, '#BBDCE4'),
    band(96, 60, '#E3F0EC'),
    circle(96, 46, 14, { fill: '#FFF0C9' }),
    // Hourglass-shaped rocks and far towers
    poly([16, 140, 22, 96, 34, 96, 40, 140], { fill: '#A9C4CC' }),
    poly([282, 140, 286, 84, 298, 84, 302, 140], { fill: '#A9C4CC' }),
    poly([120, 140, 124, 108, 134, 108, 138, 140], { fill: '#A9C4CC' }),
    path('M -300 140 Q 150 126 600 140 L 600 320 L -300 320 Z', { fill: '#9DB7A8' }),
    band(172, 150, '#8FAB9B'),
    // A sundial on the lawn
    ellipse(146, 180, 14, 4.5, { fill: '#D9D2C0', stroke: '#A8A08A', sw: 1.4 }),
    poly([146, 180, 146, 168, 154, 180], { fill: '#D9A441' }),
  ],
  house: [
    // Side towers
    rect(158, 104, 24, 54, { fill: '#A7B2C6', stroke: '#6E7A92', sw: 2.2 }, 2),
    rect(238, 104, 24, 54, { fill: '#A7B2C6', stroke: '#6E7A92', sw: 2.2 }, 2),
    ...[158, 167, 176].map((x) => rect(x, 97, 6, 8, { fill: '#A7B2C6', stroke: '#6E7A92', sw: 1.8 }, 1)),
    ...[238, 247, 256].map((x) => rect(x, 97, 6, 8, { fill: '#A7B2C6', stroke: '#6E7A92', sw: 1.8 }, 1)),
    arch(166, 118, 8, 14, { fill: '#4D5A78' }),
    arch(246, 118, 8, 14, { fill: '#4D5A78' }),
    // Keep
    rect(178, 54, 64, 104, { fill: '#B9C3D6', stroke: '#6E7A92', sw: 2.4 }, 3),
    poly([172, 58, 210, 30, 248, 58], { fill: '#3C3489', stroke: '#2A2466', sw: 2.4 }),
    circle(210, 30, 3.4, { fill: '#D9A441' }),
    // Clock face
    circle(210, 82, 24, { fill: '#FFF8E7', stroke: '#D9A441', sw: 3.4 }),
    ...[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
      const a = (deg * Math.PI) / 180;
      const x = Math.round((210 + Math.cos(a) * 19) * 10) / 10;
      const y = Math.round((82 + Math.sin(a) * 19) * 10) / 10;
      return circle(x, y, deg % 90 === 0 ? 1.8 : 1, { fill: '#6E7A92' });
    }),
    ...doorway(190, 114, 40, 44, '#4D5A78', '#D9A441'),
    // Gears at the base
    ...gear(168, 152, 7, '#D9A441', '#A87A22'),
    ...gear(254, 154, 5.5, '#D9A441', '#A87A22'),
  ],
  ambient: [
    { key: 'hour-hand', kind: 'spin', shapes: hand(11, 2.6, '#3C3489'), period: 60, phase: 0.83, pivot: { x: 210, y: 82 } },
    { key: 'minute-hand', kind: 'spin', shapes: [...hand(18, 1.8, '#2B2420'), circle(210, 82, 2.8, { fill: '#D9A441' })], period: 12, phase: 0.15, pivot: { x: 210, y: 82 } },
    { key: 'sparkles', kind: 'pulse', shapes: [...sparkle('#FFFFFF', 174, 44, 0.5), ...sparkle('#FFF0C9', 250, 70, 0.4)], period: 4, amount: 0.1 },
  ],
  dog: DOG_SPOT,
  door: DOOR,
  rest: DOOR_REST,
  hit: { x: 156, y: 28, w: 108, h: 134 },
};
