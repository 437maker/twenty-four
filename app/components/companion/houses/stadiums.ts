// houses/stadiums.ts — four Tier-3 stadium houses.
//
// Each is a small toy-like venue centred on the door, drawn the way the
// other houses are: a building with a clear silhouette, a pitch under the
// dog, and a few small loops (lights, a crowd wave, a ball or a puck).
//
// Colors: the app's pillar palette (#3C3489 purple, #1D9E75 teal, #185FA5
// blue, #D97706 amber) plus neutrals. No real team names, logos, or league
// marks: the only text anywhere is the app's own "24" on the scoreboards.

import { sparkle } from '../shapes';
import type { Shape } from '../shapes';
import { arch, band, circle, cloud, doorway, ellipse, hill, line, path, poly, rect, sky } from './art';
import { DOG_SPOT, DOOR, DOOR_REST } from './tier1';
import type { HouseDef } from './types';

const PURPLE = '#3C3489';
const PURPLE_D = '#2A2470';
const PURPLE_L = '#5A4DB8';
const TEAL = '#1D9E75';
const TEAL_D = '#167A5A';
const TEAL_L = '#34B78D';
const BLUE = '#185FA5';
const BLUE_D = '#104680';
const BLUE_L = '#3A82C4';
const AMBER = '#D97706';
const AMBER_L = '#F6B93B';
const CREAM = '#FFF1CF';
const CREAM_D = '#C9A64B';
const BOARD = '#141424';
const STEEL = '#8A93A6';
const STEEL_D = '#5C6474';

// The part of the scene that counts as "the house" for a tap. The door
// (210, 160) is inside it, and it starts to the right of the dog's box.
const STADIUM_HIT = { x: 134, y: 30, w: 152, h: 132 };

const r1 = (n: number) => Math.round(n * 10) / 10;

// "24" in scoreboard segments. (x, y) is the top-left of the "2"; at s = 1
// the number is 22 wide and 14 tall.
function score24(x: number, y: number, s: number, color: string, sw: number): Shape[] {
  const p = (dx: number, dy: number) => `${r1(x + dx * s)} ${r1(y + dy * s)}`;
  return [
    line(`M ${p(0, 0)} L ${p(8, 0)} L ${p(8, 7)} L ${p(0, 7)} L ${p(0, 14)} L ${p(8, 14)}`, color, sw),
    line(`M ${p(14, 0)} L ${p(14, 7)} L ${p(22, 7)}`, color, sw),
    line(`M ${p(22, 0)} L ${p(22, 14)}`, color, sw),
  ];
}

// A scoreboard centred on cx with its top at `top`.
function scoreboard(cx: number, top: number, w: number, h: number, frame = AMBER): Shape[] {
  return [
    rect(cx - w / 2, top, w, h, { fill: BOARD, stroke: frame, sw: 2.5 }, 3.5),
    ...score24(cx - 11, top + (h - 14) / 2, 1, AMBER_L, 2.6),
    circle(cx - w / 2 + 5, top + 5, 1.3, { fill: '#FF8F6B' }),
    circle(cx + w / 2 - 5, top + 5, 1.3, { fill: '#8FF7D0' }),
  ];
}

// A light tower: a steel pole with a bank of lamps on top.
function lightTower(x: number, top: number, base: number): Shape[] {
  return [
    rect(x - 2, top + 12, 4, base - top - 12, { fill: STEEL, stroke: STEEL_D, sw: 1 }),
    rect(x - 11, top, 22, 14, { fill: '#2B2F45', stroke: STEEL_D, sw: 1.6 }, 2.5),
    ...[-6, 0, 6].flatMap((dx) => [
      circle(x + dx, top + 4.2, 2, { fill: '#FFF6D6' }),
      circle(x + dx, top + 9.8, 2, { fill: '#FFF6D6' }),
    ]),
  ];
}
const lampGlow = (x: number, top: number): Shape => ellipse(x, top + 7, 16, 12, { fill: '#FFE08A', op: 0.55 });

// The crowd: rows of small heads in the app's light tints. `set` 0 and 1
// are every other head, so two layers can bob out of step: a crowd wave.
const CROWD_TINTS = [CREAM, AMBER_L, '#9BE0C8', '#A9CDF0', '#CBC4FF'];
function crowdRow(x1: number, x2: number, yAt: (x: number) => number, set: 0 | 1, step = 9): Shape[] {
  const out: Shape[] = [];
  let i = 0;
  for (let x = x1; x <= x2; x += step, i++) {
    if (i % 2 !== set) continue;
    out.push(circle(x, r1(yAt(x)), 2.5, { fill: CROWD_TINTS[(i * 3 + set) % CROWD_TINTS.length] }));
  }
  return out;
}
// Three rows on the tilted stand the arenas share (x 152..268, y 62..96).
const standCrowd = (set: 0 | 1): Shape[] => [
  ...crowdRow(160, 260, () => 70, set),
  ...crowdRow(157, 263, () => 79, (1 - set) as 0 | 1),
  ...crowdRow(154, 266, () => 88, set),
];
// A dim crowd along a far wall, for the two indoor scenes.
const farCrowd = (y: number, shift: number, op: number): Shape[] => {
  const out: Shape[] = [];
  for (let x = -40 + shift, i = 0; x <= 340; x += 11, i++) {
    out.push(circle(x, y, 2.6, { fill: CROWD_TINTS[i % CROWD_TINTS.length], op }));
  }
  return out;
};

// Light and dark mowing stripes that narrow toward the horizon at `top`.
function mowStripes(top: number, fill: string): Shape[] {
  const out: Shape[] = [];
  for (let bx = -180; bx < 480; bx += 120) {
    const tx = (x: number) => r1(150 + (x - 150) * 0.42);
    out.push(poly([bx, 200, bx + 60, 200, tx(bx + 60), top, tx(bx), top], { fill }));
  }
  return out;
}

// ─── Gridiron Stadium ─────────────────────────────────────────────────────────
// A purple bowl with a cream rim, light towers that glow, a "24" scoreboard,
// and a crowd that does the wave. The dog stands on the striped field; the
// locker-room tunnel is the door.
const gridCrowd = (set: 0 | 1): Shape[] => [
  ...crowdRow(164, 256, (x) => 67 + ((x - 210) * (x - 210)) / 420, set),
  ...crowdRow(157, 263, (x) => 76 + ((x - 210) * (x - 210)) / 520, (1 - set) as 0 | 1),
];

export const GRIDIRON_STADIUM: HouseDef = {
  id: 'house_football_stadium',
  dark: false,
  backdrop: [
    sky('#9CCBF0'),
    band(88, 18, '#C9E3F6'),
    ...cloud(54, 36, 0.8, '#FFFFFF', 0.92),
    ...cloud(118, 62, 0.5, '#FFFFFF', 0.85),
    hill(-60, 150, 84, 108, '#86BF93'),
    hill(220, 380, 86, 108, '#86BF93'),
    // The field: mowing stripes, a purple end zone, white yard lines
    band(104, 100, '#3E9B4F'),
    ...mowStripes(104, '#4BAC5E'),
    band(104, 9, PURPLE, 0.55),
    line('M -300 113 L 600 113', '#FFFFFF', 1.6, 0.85),
    line('M -300 127 L 600 127', '#FFFFFF', 1.6, 0.7),
    line('M -300 146 L 600 146', '#FFFFFF', 2, 0.7),
    line('M -300 171 L 600 171', '#FFFFFF', 2.4, 0.7),
    // Hash marks
    ...[30, 56, 82, 108].flatMap((x) => [
      line(`M ${x} 134 L ${x} 139`, '#FFFFFF', 1.6, 0.65),
      line(`M ${x - 6} 156 L ${x - 6} 162`, '#FFFFFF', 1.8, 0.65),
    ]),
    // A far goalpost in the end zone
    rect(30, 98, 3, 14, { fill: AMBER_L, stroke: AMBER, sw: 1 }),
    rect(19, 96, 25, 3, { fill: AMBER_L, stroke: AMBER, sw: 1 }),
    rect(19, 72, 3, 26, { fill: AMBER_L, stroke: AMBER, sw: 1 }),
    rect(41, 72, 3, 26, { fill: AMBER_L, stroke: AMBER, sw: 1 }),
  ],
  house: [
    ...lightTower(150, 30, 100),
    ...lightTower(270, 30, 100),
    // The far stand, seen over the rim
    path('M 146 92 Q 146 60 210 56 Q 274 60 274 92 Z', { fill: PURPLE_L, stroke: PURPLE_D, sw: 2.2 }),
    line('M 152 82 Q 210 62 268 82', PURPLE_D, 1.4, 0.5),
    line('M 148 90 Q 210 72 272 90', PURPLE_D, 1.4, 0.5),
    // Scoreboard on two posts
    rect(197, 56, 3, 8, { fill: STEEL_D }),
    rect(220, 56, 3, 8, { fill: STEEL_D }),
    ...scoreboard(210, 32, 48, 25),
    // The bowl wall
    path('M 138 160 L 138 102 Q 138 92 150 92 L 270 92 Q 282 92 282 102 L 282 160 Z', { fill: PURPLE, stroke: PURPLE_D, sw: 2.2 }),
    rect(138, 104, 144, 6, { fill: AMBER }),
    path('M 138 144 L 282 144 L 282 160 L 138 160 Z', { fill: PURPLE_D, op: 0.45 }),
    // Arched bays either side of the tunnel
    ...[146, 166, 240, 260].flatMap((x) => [
      arch(x, 118, 14, 24, { fill: PURPLE_D, stroke: PURPLE_L, sw: 1.4 }),
      line(`M ${x + 3.5} 126 L ${x + 3.5} 136`, '#8E86E0', 1.6, 0.7),
    ]),
    // Cream rim and base
    rect(134, 87, 152, 8, { fill: CREAM, stroke: CREAM_D, sw: 1.8 }, 4),
    rect(134, 155, 152, 6, { fill: '#CFC9EE', stroke: '#8E86C4', sw: 1.6 }, 2),
    // Locker-room tunnel
    ...doorway(190, 118, 40, 42, '#1A1A3E', AMBER_L),
    ...gridCrowd(0).map((s) => ({ ...s, op: 0.35 })),
    ...gridCrowd(1).map((s) => ({ ...s, op: 0.35 })),
  ],
  ambient: [
    { key: 'lights', kind: 'pulse', shapes: [lampGlow(150, 30), lampGlow(270, 30)], period: 4, amount: 0.35 },
    { key: 'crowd-a', kind: 'bob', shapes: gridCrowd(0), period: 3, dx: 0, dy: -2.2 },
    { key: 'crowd-b', kind: 'bob', shapes: gridCrowd(1), period: 3, phase: 0.5, dx: 0, dy: -2.2 },
  ],
  dog: DOG_SPOT,
  door: DOOR,
  rest: DOOR_REST,
  hit: STADIUM_HIT,
};

// ─── Diamond Ballpark ─────────────────────────────────────────────────────────
// A teal grandstand under a cream roof with pennants, a purple outfield wall
// with a foul pole, and the infield diamond in front of the dugout door. Now
// and then a ball sails over the wall.
const pennantFlag = (x: number, fill: string): Shape => poly([x, 34, x + 13, 38.5, x, 43], { fill, stroke: '#FFFFFF', sw: 0.8 });
const ballparkCrowd = (set: 0 | 1): Shape[] => [
  ...crowdRow(168, 252, () => 66, set),
  ...crowdRow(163, 257, () => 76, (1 - set) as 0 | 1),
];

export const DIAMOND_BALLPARK: HouseDef = {
  id: 'house_baseball_park',
  dark: false,
  backdrop: [
    sky('#A9D8F5'),
    band(80, 12, '#D3EAF9'),
    circle(96, 32, 12, { fill: '#FFF3C4' }),
    ...cloud(40, 58, 0.7, '#FFFFFF', 0.92),
    ...cloud(124, 26, 0.5, '#FFFFFF', 0.85),
    // Outfield wall with a foul pole, then the warning track
    rect(-300, 86, 900, 16, { fill: PURPLE, stroke: PURPLE_D, sw: 2 }),
    line('M -300 87 L 600 87', AMBER_L, 2.4),
    ...[-20, 40, 100].map((x) => line(`M ${x} 90 L ${x} 101`, PURPLE_D, 1.4, 0.7)),
    rect(22, 46, 3.5, 56, { fill: AMBER_L, stroke: AMBER, sw: 1 }),
    band(102, 7, '#CFA672'),
    // Outfield grass, mown in bands
    band(109, 100, '#3E9B4F'),
    band(118, 10, '#4BAC5E'),
    band(140, 13, '#4BAC5E'),
    band(168, 16, '#4BAC5E'),
    // The infield: dirt diamond, chalk lines, mound, bases
    poly([210, 146, 272, 176, 210, 206, 148, 176], { fill: '#CFA672', stroke: '#B78C56', sw: 1.6 }),
    poly([210, 158, 247, 176, 210, 194, 173, 176], { fill: '#4BAC5E' }),
    line('M 148 176 L 210 206 L 272 176', '#FFFFFF', 1.6, 0.8),
    ellipse(210, 177, 8, 4, { fill: '#CFA672', stroke: '#B78C56', sw: 1.2 }),
    rect(144, 173, 8, 6, { fill: '#FFFFFF', stroke: '#C9B79A', sw: 1.2 }, 1),
    rect(268, 173, 8, 6, { fill: '#FFFFFF', stroke: '#C9B79A', sw: 1.2 }, 1),
  ],
  house: [
    // Upper deck, tilted back, under a cream roof
    poly([152, 88, 162, 56, 258, 56, 268, 88], { fill: TEAL_L, stroke: TEAL_D, sw: 2.2 }),
    line('M 160 71 L 260 71', TEAL_D, 1.4, 0.5),
    line('M 156 81 L 264 81', TEAL_D, 1.4, 0.5),
    // Pennant poles along the roof
    ...[154, 172, 248, 266].map((x) => line(`M ${x} 50 L ${x} 34`, STEEL_D, 1.8)),
    poly([142, 58, 278, 58, 272, 49, 148, 49], { fill: CREAM, stroke: CREAM_D, sw: 2 }),
    // Scoreboard on the roof
    ...scoreboard(210, 22, 48, 26),
    // The front of the park
    rect(146, 88, 128, 72, { fill: TEAL, stroke: TEAL_D, sw: 2.2 }, 3),
    rect(146, 94, 128, 6, { fill: CREAM }),
    ...[154, 172, 236, 254].flatMap((x) => [
      arch(x, 110, 12, 22, { fill: '#0F5F46', stroke: TEAL_L, sw: 1.4 }),
      line(`M ${x + 3} 117 L ${x + 3} 126`, '#7FD6BA', 1.5, 0.7),
    ]),
    rect(142, 155, 136, 6, { fill: '#CFEBE1', stroke: '#8FC4B2', sw: 1.6 }, 2),
    // Striped awning over the dugout door
    poly([182, 119, 238, 119, 243, 109, 177, 109], { fill: AMBER, stroke: '#B06015', sw: 1.6 }),
    ...[190, 203, 217, 230].map((x) => line(`M ${x} 110 L ${x} 118`, CREAM, 3.2)),
    ...doorway(190, 119, 40, 41, '#123B2E', AMBER_L, false),
    ...ballparkCrowd(0).map((s) => ({ ...s, op: 0.35 })),
    ...ballparkCrowd(1).map((s) => ({ ...s, op: 0.35 })),
  ],
  ambient: [
    {
      key: 'pennants', kind: 'bob', period: 2, dx: 1.8, dy: 0.6,
      shapes: [pennantFlag(154, PURPLE), pennantFlag(172, AMBER), pennantFlag(248, BLUE), pennantFlag(266, PURPLE)],
    },
    {
      key: 'ball', kind: 'rise', period: 10, dx: 34, dy: -54, pivot: { x: 96, y: 92 },
      shapes: [
        circle(96, 92, 4.4, { fill: '#FFFFFF', stroke: '#C9B79A', sw: 1.4 }),
        line('M 93.5 90 Q 96 92 93.5 94.5', '#D97706', 1),
        line('M 98.5 90 Q 96 92 98.5 94.5', '#D97706', 1),
      ],
    },
    { key: 'crowd-a', kind: 'bob', shapes: ballparkCrowd(0), period: 3, dx: 0, dy: -2.2 },
    { key: 'crowd-b', kind: 'bob', shapes: ballparkCrowd(1), period: 3, phase: 0.5, dx: 0, dy: -2.2 },
  ],
  dog: DOG_SPOT,
  door: DOOR,
  rest: DOOR_REST,
  hit: STADIUM_HIT,
};

// ─── Hoop Arena ───────────────────────────────────────────────────────────────
// Indoors and dark: glowing hardwood with a purple key, a hoop, banners in
// the rafters, spotlights that sweep the court, and a jumbotron that pulses
// "24". The locker-room tunnel is the door.
const banner = (x: number, fill: string): Shape[] => [
  poly([x, 0, x + 15, 0, x + 15, 24, x + 7.5, 18, x, 24], { fill, stroke: '#0F0F1F', sw: 1.2 }),
  line(`M ${x + 4} 6 L ${x + 11} 6`, CREAM, 1.6, 0.8),
  line(`M ${x + 4} 11 L ${x + 11} 11`, CREAM, 1.6, 0.8),
];

export const HOOP_ARENA: HouseDef = {
  id: 'house_basketball_arena',
  dark: true,
  skyTop: '#17172B',
  backdrop: [
    sky('#17172B'),
    // The far stands, dim, full of people
    band(42, 54, '#232143'),
    band(42, 3, '#34315F'),
    ...farCrowd(54, 0, 0.3),
    ...farCrowd(66, 5, 0.34),
    ...farCrowd(78, 0, 0.38),
    ...farCrowd(89, 5, 0.42),
    band(94, 8, '#0F0F1F'),
    // Banners in the rafters
    ...banner(26, TEAL),
    ...banner(50, AMBER),
    ...banner(74, BLUE),
    ...banner(98, PURPLE_L),
    // Hardwood, brighter in the middle, with plank seams
    band(102, 100, '#B9783A'),
    ellipse(140, 168, 190, 52, { fill: '#D99A52' }),
    ellipse(120, 176, 110, 26, { fill: '#E8B36C', op: 0.7 }),
    ...[112, 124, 138, 154, 172, 192].map((y) => line(`M -300 ${y} L 600 ${y}`, '#8F5A28', 1, 0.4)),
    // Court paint: the key in front of the tunnel, the arc, the far circle
    poly([178, 160, 242, 160, 262, 200, 158, 200], { fill: PURPLE, op: 0.9 }),
    line('M 178 160 L 158 200', '#FFFFFF', 1.8, 0.85),
    line('M 242 160 L 262 200', '#FFFFFF', 1.8, 0.85),
    path('M 96 200 Q 110 136 210 132 Q 310 136 324 200', { stroke: '#FFFFFF', sw: 2, op: 0.8 }),
    ellipse(22, 180, 44, 13, { stroke: '#FFFFFF', sw: 2, op: 0.7 }),
    line('M -300 106 L 600 106', '#FFFFFF', 1.6, 0.6),
  ],
  house: [
    // Stands above the tunnel
    poly([140, 98, 152, 62, 268, 62, 280, 98], { fill: PURPLE, stroke: '#17153F', sw: 2.2 }),
    line('M 148 74 L 272 74', '#17153F', 1.4, 0.6),
    line('M 145 83 L 275 83', '#17153F', 1.4, 0.6),
    line('M 142 92 L 278 92', '#17153F', 1.4, 0.6),
    rect(140, 98, 140, 62, { fill: PURPLE_D, stroke: '#17153F', sw: 2.2 }, 3),
    rect(136, 94, 148, 7, { fill: CREAM, stroke: CREAM_D, sw: 1.6 }, 3.5),
    // Lit boards on the wall
    rect(146, 108, 36, 11, { fill: TEAL, stroke: '#0F5F46', sw: 1.4 }, 2.5),
    line('M 152 113.5 L 176 113.5', '#BFF3E1', 2, 0.9),
    rect(146, 126, 36, 11, { fill: AMBER, stroke: '#B06015', sw: 1.4 }, 2.5),
    line('M 152 131.5 L 168 131.5', CREAM, 2, 0.9),
    rect(238, 138, 36, 11, { fill: BLUE, stroke: BLUE_D, sw: 1.4 }, 2.5),
    line('M 244 143.5 L 268 143.5', '#CFE4F7', 2, 0.9),
    ...doorway(190, 118, 40, 42, '#1A1A3E', AMBER_L),
    // The jumbotron, hung from the roof
    line('M 192 -40 L 192 18', STEEL_D, 2),
    line('M 228 -40 L 228 18', STEEL_D, 2),
    ...scoreboard(210, 16, 62, 34),
    rect(186, 50, 48, 4, { fill: AMBER, stroke: '#B06015', sw: 1 }, 2),
    // The hoop: pole, arm, backboard, rim and net
    rect(284, 104, 4.5, 82, { fill: STEEL, stroke: STEEL_D, sw: 1.2 }),
    rect(276, 184, 21, 7, { fill: STEEL_D }, 2.5),
    line('M 286 110 L 272 110', STEEL, 3.4),
    rect(244, 96, 31, 25, { fill: '#F4F6F8', stroke: '#9AA7B5', sw: 2 }, 2.5),
    rect(253, 104, 13, 10, { stroke: AMBER, sw: 1.8 }),
    path('M 251.5 123.5 L 254.5 136 L 264.5 136 L 267.5 123.5', { stroke: '#FFFFFF', sw: 1.4, op: 0.9 }),
    line('M 256 124 L 258 136', '#FFFFFF', 1.1, 0.8),
    line('M 263 124 L 261 136', '#FFFFFF', 1.1, 0.8),
    line('M 253 129.5 L 266 129.5', '#FFFFFF', 1.1, 0.8),
    ellipse(259.5, 123, 9.5, 3.2, { stroke: AMBER, sw: 2.8 }),
    ...standCrowd(0).map((s) => ({ ...s, op: 0.85 })),
    ...standCrowd(1).map((s) => ({ ...s, op: 0.85 })),
  ],
  ambient: [
    {
      key: 'spot-left', kind: 'sway', behind: true, period: 10, amount: 9, pivot: { x: 96, y: -10 },
      shapes: [poly([89, -10, 103, -10, 158, 170, 34, 170], { fill: '#FFE9A8', op: 0.14 })],
    },
    {
      key: 'spot-right', kind: 'sway', behind: true, period: 10, phase: 0.5, amount: 7, pivot: { x: 262, y: -10 },
      shapes: [poly([255, -10, 269, -10, 306, 160, 206, 160], { fill: '#CBC4FF', op: 0.12 })],
    },
    {
      key: 'jumbotron', kind: 'pulse', period: 3, amount: 0.25,
      shapes: [rect(176, 12, 68, 42, { fill: AMBER_L, op: 0.22 }, 6)],
    },
    {
      key: 'flashes', kind: 'pulse', period: 2, phase: 0.4, amount: 0.05,
      shapes: [
        ...sparkle('#FFFFFF', 18, 60, 0.42),
        ...sparkle('#FFFFFF', 122, 72, 0.36),
        ...sparkle('#FFFFFF', 150, 54, 0.3),
        ...sparkle('#FFFFFF', 296, 68, 0.36),
      ],
    },
  ],
  dog: DOG_SPOT,
  door: DOOR,
  rest: DOOR_REST,
  hit: STADIUM_HIT,
};

// ─── Ice Rink Arena ───────────────────────────────────────────────────────────
// White ice with a soft shine, boards and glass all the way round, a blue
// stand with a hung scoreboard, and a goal net by the bench door. Frost
// sparkles, and a puck glides across now and then.
const NET_GRID: Shape[] = [
  ...[242, 250, 258, 266].map((x) => line(`M ${x} 157 L ${x} 187`, '#9AA7B5', 1, 0.8)),
  ...[163, 171, 179].map((y) => line(`M 235 ${y} L 273 ${y}`, '#9AA7B5', 1, 0.8)),
];

export const ICE_RINK_ARENA: HouseDef = {
  id: 'house_hockey_rink',
  dark: false,
  backdrop: [
    sky('#C4D8EE'),
    // The far stands behind the glass
    band(40, 46, '#A9C2E0'),
    band(40, 3, '#8FAFD4'),
    ...farCrowd(52, 0, 0.55),
    ...farCrowd(63, 5, 0.6),
    ...farCrowd(74, 0, 0.65),
    band(58, 28, '#FFFFFF', 0.2),
    ...[-12, 44, 100, 300].map((x) => line(`M ${x} 58 L ${x} 86`, '#FFFFFF', 1.6, 0.6)),
    // Boards: blue rail, white board, amber kick plate
    band(84, 5, BLUE),
    rect(-300, 89, 900, 15, { fill: '#FFFFFF', stroke: '#B0B8C8', sw: 1.4 }),
    ...[-30, 30, 90].map((x) => rect(x, 92, 34, 8, { fill: [TEAL, AMBER, PURPLE_L][((x + 30) / 60) % 3], op: 0.85 }, 2)),
    band(104, 4, AMBER_L),
    // Ice, with shine
    band(108, 100, '#E6F1FA'),
    poly([-6, 200, 26, 200, 74, 108, 56, 108], { fill: '#FFFFFF', op: 0.75 }),
    poly([40, 200, 52, 200, 92, 108, 86, 108], { fill: '#FFFFFF', op: 0.6 }),
    poly([286, 200, 310, 200, 262, 108, 250, 108], { fill: '#FFFFFF', op: 0.55 }),
    // Lines: blue line, amber centre line, a face-off circle, the crease
    line('M 116 108 L 96 200', BLUE, 3.4, 0.8),
    line('M -8 108 L -40 200', AMBER, 3.4, 0.75),
    ellipse(70, 164, 36, 13, { stroke: AMBER, sw: 2.2, op: 0.7 }),
    circle(70, 164, 3.4, { fill: AMBER, op: 0.75 }),
    path('M 220 192 Q 224 166 254 166 Q 284 166 288 192 Z', { fill: '#9DC3EA', op: 0.55, stroke: AMBER, sw: 1.6 }),
  ],
  house: [
    // The stand above the bench
    poly([140, 98, 152, 62, 268, 62, 280, 98], { fill: BLUE, stroke: BLUE_D, sw: 2.2 }),
    line('M 148 74 L 272 74', BLUE_D, 1.4, 0.6),
    line('M 145 83 L 275 83', BLUE_D, 1.4, 0.6),
    line('M 142 92 L 278 92', BLUE_D, 1.4, 0.6),
    // Bench boards: white, with a blue cap and an amber kick plate
    rect(140, 98, 140, 62, { fill: '#F6FAFD', stroke: '#9AA7B5', sw: 2.2 }, 3),
    rect(141.5, 151, 137, 7.5, { fill: AMBER_L }),
    rect(136, 94, 148, 7, { fill: BLUE_L, stroke: BLUE_D, sw: 1.6 }, 3.5),
    rect(146, 108, 36, 12, { fill: PURPLE, stroke: PURPLE_D, sw: 1.4 }, 2.5),
    line('M 152 114 L 176 114', '#CBC4FF', 2, 0.9),
    rect(238, 108, 36, 12, { fill: TEAL, stroke: '#0F5F46', sw: 1.4 }, 2.5),
    line('M 244 114 L 268 114', '#BFF3E1', 2, 0.9),
    rect(146, 128, 36, 12, { fill: AMBER, stroke: '#B06015', sw: 1.4 }, 2.5),
    line('M 152 134 L 168 134', CREAM, 2, 0.9),
    ...doorway(190, 118, 40, 42, '#16233A', BLUE_L, false),
    // Scoreboard hung over the ice
    line('M 192 -40 L 192 18', STEEL_D, 2),
    line('M 228 -40 L 228 18', STEEL_D, 2),
    ...scoreboard(210, 16, 62, 34, BLUE_L),
    rect(186, 50, 48, 4, { fill: BLUE_L, stroke: BLUE_D, sw: 1 }, 2),
    // The goal: white mesh in an amber frame
    rect(235, 157, 38, 30, { fill: '#FFFFFF', op: 0.7 }, 5),
    ...NET_GRID,
    path('M 234 189 L 234 163 Q 234 155 242 155 L 266 155 Q 274 155 274 163 L 274 189', { stroke: AMBER, sw: 3.6 }),
    ...standCrowd(0).map((s) => ({ ...s, op: 0.4 })),
    ...standCrowd(1).map((s) => ({ ...s, op: 0.4 })),
  ],
  ambient: [
    {
      key: 'puck', kind: 'bob', period: 10, dx: 30, dy: 0,
      shapes: [
        ellipse(178, 186, 7, 2.8, { fill: '#1A1A2E', stroke: '#3A3A52', sw: 1.2 }),
        line('M 152 186 L 166 186', '#B8CDE4', 1.6, 0.7),
      ],
    },
    {
      key: 'frost', kind: 'pulse', period: 4, amount: 0.15,
      shapes: [
        ...sparkle('#FFFFFF', 30, 124, 0.5),
        ...sparkle('#8FC1EC', 138, 126, 0.42),
        ...sparkle('#FFFFFF', 154, 172, 0.38),
        ...sparkle('#8FC1EC', 292, 128, 0.42),
        ...sparkle('#FFFFFF', 12, 190, 0.4),
      ],
    },
    { key: 'crowd-a', kind: 'bob', shapes: standCrowd(0), period: 3, dx: 0, dy: -2.2 },
    { key: 'crowd-b', kind: 'bob', shapes: standCrowd(1), period: 3, phase: 0.5, dx: 0, dy: -2.2 },
  ],
  dog: DOG_SPOT,
  door: DOOR,
  rest: DOOR_REST,
  hit: STADIUM_HIT,
};
