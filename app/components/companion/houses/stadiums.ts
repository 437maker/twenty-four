// houses/stadiums.ts — four Tier-3 stadium houses.
// Colors: app pillar palette (#3C3489 purple, #1D9E75 teal, #185FA5 blue, #D97706 amber).
// No real team names, logos, or league marks.

import { sparkle } from '../shapes';
import type { Shape } from '../shapes';
import { band, circle, doorway, ellipse, line, path, poly, rect, sky, tile } from './art';
import { DOG_SPOT, DOOR, DOOR_REST } from './tier1';
import type { HouseDef } from './types';

// All four stadiums share this hit box — right-side structure, x 130–300, y 38–160.
// Guarantees: door (210,160) and rest-top (210,137) are inside; dog.x+size/2=130≤140.
const STADIUM_HIT = { x: 130, y: 38, w: 170, h: 122 };

// ─── Gridiron Stadium ─────────────────────────────────────────────────────────
// A football stadium with purple stands, amber goalposts, and a "24" scoreboard.
// The dog stands on the green field; she rests through the locker-room tunnel.
const crowdRow = (y: number, fill: string, op: number): Shape[] =>
  [0, 20, 40, 60, 80, 100, 120, 140].map((x) =>
    circle(x + 142, y, 2.8, { fill, op }),
  );

export const GRIDIRON_STADIUM: HouseDef = {
  id: 'house_football_stadium',
  dark: false,
  backdrop: [
    sky('#5A87A9'),
    band(100, 100, '#2D7D3A'),
    // End-zone tints (purple)
    path('M -300 100 L 62 100 L 62 200 L -300 200 Z', { fill: '#3C3489', op: 0.18 }),
    path('M 220 100 L 600 100 L 600 200 L 220 200 Z', { fill: '#3C3489', op: 0.18 }),
    // Yard lines across the field
    line('M 62 118 L 220 118', '#FFFFFF', 1.5, 0.55),
    line('M 62 133 L 220 133', '#FFFFFF', 1.5, 0.55),
    line('M 62 163 L 220 163', '#FFFFFF', 1.5, 0.55),
    line('M 62 178 L 220 178', '#FFFFFF', 1.5, 0.55),
    // 50-yard center line (thicker)
    line('M 62 148 L 220 148', '#FFFFFF', 2.4, 0.75),
    // Centre-field logo circle
    ellipse(140, 155, 22, 10, { stroke: '#FFFFFF', sw: 1.5, op: 0.35 }),
  ],
  house: [
    // Upper stands (purple block)
    poly([130, 100, 130, 40, 300, 40, 300, 100], { fill: '#3C3489', stroke: '#2A2470', sw: 2.2 }),
    line('M 134 54 L 298 54', '#2A2470', 1.4, 0.55),
    line('M 134 67 L 298 67', '#2A2470', 1.4, 0.55),
    line('M 134 80 L 298 80', '#2A2470', 1.4, 0.55),
    // Lower concourse wall (where the tunnel sits)
    rect(130, 100, 170, 60, { fill: '#2A2470', stroke: '#1A1870', sw: 2 }),
    // Scoreboard box
    rect(176, 44, 70, 32, { fill: '#141424', stroke: '#D97706', sw: 2.5 }, 3),
    // "2" — segmented display
    line('M 187 51 L 195 51', '#D97706', 2.4), line('M 195 51 L 195 58', '#D97706', 2.4),
    line('M 187 58 L 195 58', '#D97706', 2.4), line('M 187 58 L 187 65', '#D97706', 2.4),
    line('M 187 65 L 195 65', '#D97706', 2.4),
    // "4" — segmented display
    line('M 205 51 L 205 58', '#D97706', 2.4), line('M 213 51 L 213 66', '#D97706', 2.4),
    line('M 205 58 L 213 58', '#D97706', 2.4),
    // Goalpost (amber Y at the right end zone)
    rect(238, 94, 4, 46, { fill: '#D97706', stroke: '#B06015', sw: 1 }),
    rect(228, 90, 4, 28, { fill: '#D97706', stroke: '#B06015', sw: 1 }),
    rect(246, 90, 4, 28, { fill: '#D97706', stroke: '#B06015', sw: 1 }),
    rect(226, 90, 24, 4, { fill: '#D97706', stroke: '#B06015', sw: 1 }),
    // Locker-room tunnel entrance
    ...doorway(190, 118, 40, 42, '#1A1A3E', '#D97706'),
  ],
  ambient: [
    {
      key: 'lights',
      kind: 'pulse',
      shapes: [
        circle(148, 42, 5, { fill: '#FFE08A', op: 0.5 }),
        circle(176, 42, 5, { fill: '#FFE08A', op: 0.5 }),
        circle(208, 42, 5, { fill: '#FFE08A', op: 0.5 }),
        circle(240, 42, 5, { fill: '#FFE08A', op: 0.5 }),
        circle(272, 42, 5, { fill: '#FFE08A', op: 0.5 }),
      ],
      period: 4,
      amount: 0.1,
    },
    {
      key: 'crowd',
      kind: 'scroll',
      shapes: tile(
        [...crowdRow(52, '#6B5EC8', 0.75), ...crowdRow(65, '#5A4DB8', 0.65)],
        160, 0,
      ),
      period: 20,
      dx: 160,
      dy: 0,
    },
  ],
  dog: DOG_SPOT,
  door: DOOR,
  rest: DOOR_REST,
  hit: STADIUM_HIT,
};

// ─── Diamond Ballpark ─────────────────────────────────────────────────────────
// A baseball park with teal stands, an outfield wall, brown infield diamond,
// pennant flags along the top, and a ball that arcs over the wall.
const pennant = (x: number, fill: string): Shape[] => [
  line(`M ${x} 56 L ${x} 44`, '#B8B2CC', 1.6),
  poly([x, 44, x + 12, 48, x, 52], { fill }),
];
const PENNANT_SHAPES: Shape[] = [
  ...pennant(80, '#3C3489'),
  ...pennant(130, '#1D9E75'),
  ...pennant(220, '#D97706'),
  ...pennant(270, '#185FA5'),
];

export const DIAMOND_BALLPARK: HouseDef = {
  id: 'house_baseball_park',
  dark: false,
  backdrop: [
    sky('#A0CBEC'),
    band(80, 100, '#2D7D3A'),   // outfield
    band(80, 10, '#C4A87A'),    // warning track
    path('M -300 148 Q 150 134 600 148 L 600 320 L -300 320 Z', { fill: '#3D8B4E' }),
    // Infield dirt diamond
    poly([140, 148, 210, 108, 280, 148, 210, 188], { fill: '#B08040', op: 0.65 }),
    // Pitcher's mound
    ellipse(210, 148, 10, 6, { fill: '#B88040' }),
    // Bases
    rect(207, 105, 7, 7, { fill: '#FFFFFF', stroke: '#D0C0A0', sw: 1.2 }, 1),
    rect(136, 145, 7, 7, { fill: '#FFFFFF', stroke: '#D0C0A0', sw: 1.2 }, 1),
    rect(276, 145, 7, 7, { fill: '#FFFFFF', stroke: '#D0C0A0', sw: 1.2 }, 1),
  ],
  house: [
    // Right stands (teal block)
    poly([170, 72, 300, 72, 300, 40, 170, 40], { fill: '#1D9E75', stroke: '#167A5A', sw: 2.2 }),
    line('M 174 54 L 298 54', '#167A5A', 1.4, 0.55),
    line('M 174 64 L 298 64', '#167A5A', 1.4, 0.55),
    // Outfield wall
    rect(60, 72, 240, 12, { fill: '#3C3489', stroke: '#2A2470', sw: 2 }),
    // Right foul pole
    rect(272, 46, 4, 38, { fill: '#D97706' }),
    // Scoreboard
    rect(178, 42, 70, 26, { fill: '#141424', stroke: '#D97706', sw: 2.5 }, 3),
    line('M 189 48 L 197 48', '#D97706', 2.4), line('M 197 48 L 197 55', '#D97706', 2.4),
    line('M 189 55 L 197 55', '#D97706', 2.4), line('M 189 55 L 189 62', '#D97706', 2.4),
    line('M 189 62 L 197 62', '#D97706', 2.4),
    line('M 207 48 L 207 55', '#D97706', 2.4), line('M 215 48 L 215 63', '#D97706', 2.4),
    line('M 207 55 L 215 55', '#D97706', 2.4),
    // Right dugout wall
    rect(170, 118, 130, 44, { fill: '#2A5E48', stroke: '#167A5A', sw: 2 }),
    // Dugout door (rectangular — a tunnel ramp, not an arch)
    ...doorway(190, 118, 40, 42, '#1A3A2A', '#D97706', false),
  ],
  ambient: [
    {
      key: 'pennants',
      kind: 'sway',
      shapes: PENNANT_SHAPES,
      period: 5,
      amount: 10,
      pivot: { x: 175, y: 56 },
    },
    {
      key: 'ball',
      kind: 'rise',
      shapes: [
        circle(185, 72, 4, { fill: '#FFFFFF', stroke: '#D0C8B4', sw: 1.4 }),
      ],
      period: 10,
      dx: 24,
      dy: -40,
      pivot: { x: 185, y: 72 },
    },
  ],
  dog: DOG_SPOT,
  door: DOOR,
  rest: DOOR_REST,
  hit: STADIUM_HIT,
};

// ─── Hoop Arena ───────────────────────────────────────────────────────────────
// An indoor basketball arena with hardwood floor, a sweeping spotlight, and a
// pulsing "24" jumbotron. The dog is court-side; she rests in the locker room.
export const HOOP_ARENA: HouseDef = {
  id: 'house_basketball_arena',
  dark: true,
  skyTop: '#1A1A2E',
  backdrop: [
    sky('#1A1A2E'),
    band(120, 80, '#8B5E2F'),   // hardwood base
    path('M -300 134 Q 150 118 600 134 L 600 320 L -300 320 Z', { fill: '#C4873A' }),
    // Floor-plank lines
    line('M -300 128 L 600 128', '#7A5428', 1, 0.4),
    line('M -300 140 L 600 140', '#7A5428', 1, 0.4),
    line('M -300 152 L 600 152', '#7A5428', 1, 0.4),
    line('M -300 164 L 600 164', '#7A5428', 1, 0.4),
    line('M -300 176 L 600 176', '#7A5428', 1, 0.4),
    line('M -300 188 L 600 188', '#7A5428', 1, 0.4),
    // Court boundary
    rect(50, 128, 220, 72, { stroke: '#FFFFFF', sw: 1.6, op: 0.5 }),
    // Centre circle
    ellipse(160, 164, 28, 10, { stroke: '#FFFFFF', sw: 1.6, op: 0.55 }),
    // Three-point arc (left side)
    path('M 50 136 Q 94 118 138 136', { stroke: '#FFFFFF', sw: 1.4, op: 0.5 }),
  ],
  house: [
    // Right wall (dark stands above, deeper below)
    rect(190, 40, 110, 80, { fill: '#2A2470', stroke: '#1A1430', sw: 2.2 }),
    rect(190, 118, 110, 44, { fill: '#1A1430', stroke: '#1A1430', sw: 2 }),
    // Jumbotron
    rect(174, 42, 86, 46, { fill: '#141424', stroke: '#D97706', sw: 2.5 }, 3),
    line('M 185 50 L 193 50', '#D97706', 2.4), line('M 193 50 L 193 57', '#D97706', 2.4),
    line('M 185 57 L 193 57', '#D97706', 2.4), line('M 185 57 L 185 64', '#D97706', 2.4),
    line('M 185 64 L 193 64', '#D97706', 2.4),
    line('M 203 50 L 203 57', '#D97706', 2.4), line('M 211 50 L 211 65', '#D97706', 2.4),
    line('M 203 57 L 211 57', '#D97706', 2.4),
    // Backboard and hoop
    rect(224, 108, 18, 14, { fill: '#E8E8E8', stroke: '#C0C0C0', sw: 1.6 }),
    ellipse(226, 123, 8, 2.5, { stroke: '#D97706', sw: 2.4 }),
    line('M 232 108 L 232 90', '#9AA7BD', 2.4),
    // Locker-room door
    ...doorway(190, 118, 40, 42, '#1A1A3E', '#D97706'),
  ],
  ambient: [
    {
      key: 'spotlight',
      kind: 'sway',
      shapes: [
        poly([206, 42, 214, 42, 240, 110, 190, 110], { fill: '#FFE08A', op: 0.12 }),
      ],
      period: 10,
      amount: 20,
      pivot: { x: 210, y: 42 },
    },
    {
      key: 'jumbotron',
      kind: 'pulse',
      shapes: [
        rect(174, 42, 86, 46, { fill: '#D97706', op: 0.18 }, 3),
      ],
      period: 3,
      amount: 0.1,
    },
  ],
  dog: DOG_SPOT,
  door: DOOR,
  rest: DOOR_REST,
  hit: STADIUM_HIT,
};

// ─── Ice Rink Arena ───────────────────────────────────────────────────────────
// A hockey rink with white ice, center red line, blue lines, a goal net, and
// a gliding puck. The dog is at the left boards; she rests in the bench tunnel.
export const ICE_RINK_ARENA: HouseDef = {
  id: 'house_hockey_rink',
  dark: false,
  backdrop: [
    sky('#BDD0E8'),
    band(78, 122, '#E8F0F8'),   // ice surface
    // Top boards
    rect(50, 76, 240, 10, { fill: '#FFFFFF', stroke: '#B0B8C8', sw: 2.2 }, 2),
    // Center red line
    line('M 150 86 L 150 200', '#D97706', 2.2, 0.75),
    // Blue lines
    line('M 100 86 L 100 200', '#185FA5', 2, 0.7),
    line('M 220 86 L 220 200', '#185FA5', 2, 0.7),
    // Face-off circles
    ellipse(150, 148, 24, 10, { stroke: '#D97706', sw: 2, op: 0.5 }),
    ellipse(76, 140, 16, 7, { stroke: '#D97706', sw: 1.6, op: 0.4 }),
    ellipse(228, 140, 16, 7, { stroke: '#D97706', sw: 1.6, op: 0.4 }),
    circle(150, 148, 4, { fill: '#D97706', op: 0.4 }),
  ],
  house: [
    // Right stand block (blue)
    rect(230, 40, 70, 90, { fill: '#185FA5', stroke: '#1046A0', sw: 2.2 }),
    line('M 234 56 L 298 56', '#1046A0', 1.4, 0.55),
    line('M 234 70 L 298 70', '#1046A0', 1.4, 0.55),
    // Scoreboard
    rect(176, 42, 70, 30, { fill: '#141424', stroke: '#D97706', sw: 2.5 }, 3),
    line('M 187 49 L 195 49', '#D97706', 2.4), line('M 195 49 L 195 56', '#D97706', 2.4),
    line('M 187 56 L 195 56', '#D97706', 2.4), line('M 187 56 L 187 63', '#D97706', 2.4),
    line('M 187 63 L 195 63', '#D97706', 2.4),
    line('M 205 49 L 205 56', '#D97706', 2.4), line('M 213 49 L 213 64', '#D97706', 2.4),
    line('M 205 56 L 213 56', '#D97706', 2.4),
    // Right side boards / glass
    rect(230, 86, 70, 76, { fill: '#D0DCE8', stroke: '#B0B8C8', sw: 1.8, op: 0.55 }),
    // Goal net
    rect(234, 130, 24, 20, { fill: '#1A1A2E', stroke: '#D97706', sw: 2 }, 2),
    line('M 234 130 L 258 130', '#D97706', 2.4),
    // Bench / locker-room entrance (rectangular bench gate)
    ...doorway(190, 118, 40, 42, '#1A1A3E', '#185FA5', false),
  ],
  ambient: [
    {
      key: 'puck',
      kind: 'bob',
      shapes: [
        ellipse(94, 172, 8, 3, { fill: '#1A1A2E', stroke: '#2A2A3E', sw: 1.4 }),
      ],
      period: 10,
      dx: 70,
      dy: 0,
    },
    {
      key: 'frost',
      kind: 'pulse',
      shapes: [
        ...sparkle('#A8C8E8', 54, 128, 0.3),
        ...sparkle('#A8C8E8', 170, 148, 0.25),
        ...sparkle('#A8C8E8', 240, 118, 0.25),
      ],
      period: 4,
      amount: 0.1,
    },
  ],
  dog: DOG_SPOT,
  door: DOOR,
  rest: DOOR_REST,
  hit: STADIUM_HIT,
};
