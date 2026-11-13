// parts.ts — the Maltese, as plain shape data.
//
// Each part of the dog is a short list of shapes in a 200 x 200 box. Keeping
// the drawing as data (instead of JSX) lets two renderers share it:
//   • MalteseSvg.tsx turns it into react-native-svg elements on the phone
//   • svgMarkup.ts turns it into an SVG string for the PNG render script
//
// Paths use only absolute M / L / C / Q / Z commands so mirrorPath() can flip
// them left-to-right. The dog faces the viewer, so the right ear, eye, and paw
// are mirror images of the left ones.

import { PALETTE } from './palette';

export type Shape =
  | { t: 'path'; d: string; fill?: string; stroke?: string; sw?: number; op?: number }
  | { t: 'ellipse'; cx: number; cy: number; rx: number; ry: number; fill?: string; stroke?: string; sw?: number; op?: number }
  | { t: 'circle'; cx: number; cy: number; r: number; fill?: string; stroke?: string; sw?: number; op?: number };

const P = PALETTE;
const LINE = 3.2; // outline width in drawing units

// Flip a path around the vertical centre line (x = 100).
export function mirrorPath(d: string): string {
  let isX = true;
  return d.replace(/[MLCQZ]|-?\d*\.?\d+/g, (tok) => {
    if (/[MLCQZ]/.test(tok)) { isX = true; return tok; }
    const out = isX ? String(Math.round((200 - parseFloat(tok)) * 100) / 100) : tok;
    isX = !isX;
    return out;
  });
}

function mirrorShape(s: Shape): Shape {
  if (s.t === 'path') return { ...s, d: mirrorPath(s.d) };
  return { ...s, cx: 200 - s.cx };
}

// ─── Body ─────────────────────────────────────────────────────────────────────

const SHADOW: Shape[] = [
  { t: 'ellipse', cx: 100, cy: 187, rx: 60, ry: 7.5, fill: P.shadow, op: P.shadowOpacity },
];

// Plume tail curled up over the back. Three soft lobes, like a feather duster.
const TAIL: Shape[] = [
  {
    t: 'path',
    d: 'M 128 168 C 146 176 168 166 174 148 C 182 148 188 136 180 128 C 185 116 173 106 163 113 C 160 102 145 102 142 114 C 133 112 127 122 132 131 C 126 142 128 158 128 168 Z',
    fill: P.fur, stroke: P.outline, sw: LINE,
  },
  { t: 'path', d: 'M 146 156 C 158 150 166 140 167 128', stroke: P.furShade, sw: 3 },
];

// Seated body: a pear shape with a scalloped coat hem that brushes the floor.
const BODY: Shape[] = [
  {
    t: 'path',
    d: 'M 70 120 C 56 134 46 158 46 176 C 46 185 53 190 60 186 C 65 192 74 192 78 187 L 122 187 C 126 192 135 192 140 186 C 147 190 154 185 154 176 C 154 158 144 134 130 120 Z',
    fill: P.fur, stroke: P.outline, sw: LINE,
  },
  // Chest fluff: two scallops under the chin
  { t: 'path', d: 'M 80 140 C 84 150 95 152 100 144 C 105 152 116 150 120 140', stroke: P.furShade, sw: 3 },
  // Coat hem: one soft fold on each side
  { t: 'path', d: 'M 57 164 C 58 174 64 180 71 179', stroke: P.furShade, sw: 3 },
  { t: 'path', d: mirrorPath('M 57 164 C 58 174 64 180 71 179'), stroke: P.furShade, sw: 3 },
];

const PAW_L: Shape[] = [
  { t: 'ellipse', cx: 84, cy: 184, rx: 12.5, ry: 7.5, fill: P.fur, stroke: P.outline, sw: LINE },
  { t: 'path', d: 'M 80 181 L 80 185', stroke: P.furShade, sw: 2.2 },
  { t: 'path', d: 'M 87 181 L 87 185', stroke: P.furShade, sw: 2.2 },
];
const PAW_R = PAW_L.map(mirrorShape);

// ─── Head ─────────────────────────────────────────────────────────────────────

// Big round head, a little wider at the cheeks, with a soft scalloped chin.
const HEAD: Shape[] = [
  {
    t: 'path',
    d: 'M 100 38 C 132 38 154 58 154 86 C 154 104 146 118 134 125 C 128 133 118 131 114 127 C 110 134 90 134 86 127 C 82 131 72 133 66 125 C 54 118 46 104 46 86 C 46 58 68 38 100 38 Z',
    fill: P.fur, stroke: P.outline, sw: LINE,
  },
  // Centre parting: hair swept to each side from the topknot
  { t: 'path', d: 'M 96 50 C 86 54 76 60 69 68', stroke: P.furShade, sw: 3 },
  { t: 'path', d: mirrorPath('M 96 50 C 86 54 76 60 69 68'), stroke: P.furShade, sw: 3 },
];

// Long silky ear hanging from high on the head, ending in three scallops.
const EAR_L: Shape[] = [
  {
    t: 'path',
    d: 'M 60 54 C 49 53 41 64 37 82 C 33 98 31 114 33 126 C 35 133 40 133 43 128 C 45 134 51 134 53 128 C 56 133 62 131 63 125 C 66 110 67 90 66 74 C 66 63 65 55 60 54 Z',
    fill: P.fur, stroke: P.outline, sw: LINE,
  },
  { t: 'path', d: 'M 52 70 C 46 88 44 104 45 120', stroke: P.furShade, sw: 3 },
  { t: 'path', d: 'M 59 84 C 56 98 55 108 56 118', stroke: P.furShade, sw: 2.4 },
  // A fur-colored patch over the top edge, so the ear reads as hair flowing
  // out of the head rather than a flap attached to it.
  { t: 'ellipse', cx: 60.5, cy: 59, rx: 7.5, ry: 6.5, fill: P.fur },
];
const EAR_R = EAR_L.map(mirrorShape);

// The whole face sits a little below the middle of the head. Features low
// on a big head is what reads as "puppy".
export const FACE_DY = 4;
function down(list: Shape[]): Shape[] {
  return list.map((s) =>
    s.t === 'path'
      ? { ...s, d: s.d.replace(/(-?d*.?d+) (-?d*.?d+)/g, (_m, x, y) => `${x} ${Math.round((parseFloat(y) + FACE_DY) * 100) / 100}`) }
      : { ...s, cy: s.cy + FACE_DY },
  );
}

// Blush, muzzle, and nose: the parts of the face that never change.
const FACE: Shape[] = [
  { t: 'ellipse', cx: 72, cy: 103, rx: 7.5, ry: 4.8, fill: P.blush, op: 0.85 },
  { t: 'ellipse', cx: 128, cy: 103, rx: 7.5, ry: 4.8, fill: P.blush, op: 0.85 },
  // Muzzle: two soft "moustache" lobes
  {
    t: 'path',
    d: 'M 100 96 C 110 94 121 100 121 109 C 121 117 112 121 105 118 C 103 121 97 121 95 118 C 88 121 79 117 79 109 C 79 100 90 94 100 96 Z',
    fill: P.fur, stroke: P.furShade, sw: 2.2,
  },
  // Button nose
  { t: 'path', d: 'M 92.5 97.5 Q 100 93 107.5 97.5 Q 108.5 104 100 106.5 Q 91.5 104 92.5 97.5 Z', fill: P.ink },
  { t: 'ellipse', cx: 97.5, cy: 98.6, rx: 2.4, ry: 1.3, fill: P.highlight, op: 0.55 },
];

const EYE_L_CX = 80;
const EYE_CY = 86;

const EYES_OPEN: Shape[] = [
  { t: 'circle', cx: EYE_L_CX, cy: EYE_CY, r: 8.6, fill: P.ink },
  { t: 'circle', cx: EYE_L_CX - 2.8, cy: EYE_CY - 3, r: 2.9, fill: P.highlight },
  { t: 'circle', cx: 200 - EYE_L_CX, cy: EYE_CY, r: 8.6, fill: P.ink },
  { t: 'circle', cx: 200 - EYE_L_CX - 2.8, cy: EYE_CY - 3, r: 2.9, fill: P.highlight },
];

// Eyelids: a fur-colored cover hinged at the top of each eye, with a dark
// lash line along its lower edge. Scaling it from 0 to 1 closes the eye.
const LID_L: Shape[] = [
  { t: 'circle', cx: 80, cy: 86.6, r: 10.4, fill: P.fur },
  { t: 'path', d: 'M 71.5 89.5 Q 80 98 88.5 89.5', stroke: P.ink, sw: 2.8 },
];
const LIDS: Shape[] = [...LID_L, ...LID_L.map(mirrorShape)];

// Smiling eyes: an upward arc over a fur patch that hides the open eye.
const HAPPY_EYE_L: Shape[] = [
  { t: 'circle', cx: EYE_L_CX, cy: EYE_CY, r: 9.6, fill: P.fur },
  { t: 'path', d: 'M 72 89.5 Q 80 79 88 89.5', stroke: P.ink, sw: 3.2 },
];
const EYES_HAPPY: Shape[] = [...HAPPY_EYE_L, ...HAPPY_EYE_L.map(mirrorShape)];

const MOUTH_CLOSED: Shape[] = [
  { t: 'path', d: 'M 100 106 L 100 109.5', stroke: P.ink, sw: 2.2 },
  { t: 'path', d: 'M 100 109.5 Q 96 114.5 91 111.5', stroke: P.ink, sw: 2.2 },
  { t: 'path', d: 'M 100 109.5 Q 104 114.5 109 111.5', stroke: P.ink, sw: 2.2 },
];

const MOUTH_OPEN: Shape[] = [
  { t: 'path', d: 'M 90.5 109.5 Q 100 112.5 109.5 109.5 Q 108 122 100 122 Q 92 122 90.5 109.5 Z', fill: P.mouth },
  { t: 'path', d: 'M 94.5 114 Q 100 111.5 105.5 114 Q 106 125.5 100 125.5 Q 94 125.5 94.5 114 Z', fill: P.tongue },
  { t: 'path', d: 'M 100 115.5 L 100 121', stroke: '#D96C80', sw: 1.4 },
];

// Topknot: a little fountain of hair above the bow.
const KNOT_TUFT: Shape[] = [
  {
    t: 'path',
    d: 'M 100 47 C 91 45 84 36 86 27 C 87 21 93 22 94 27 C 94 19 98 13 100 13 C 102 13 106 19 106 27 C 107 22 113 21 114 27 C 116 36 109 45 100 47 Z',
    fill: P.fur, stroke: P.outline, sw: LINE,
  },
  { t: 'path', d: 'M 100 22 L 100 38', stroke: P.furShade, sw: 2.4 },
];

const BOW: Shape[] = [
  { t: 'path', d: 'M 99 46 L 83 37.5 Q 79 46 83 54.5 Z', fill: P.bow, stroke: P.bowLight, sw: 1.2 },
  { t: 'path', d: mirrorPath('M 99 46 L 83 37.5 Q 79 46 83 54.5 Z'), fill: P.bow, stroke: P.bowLight, sw: 1.2 },
  { t: 'circle', cx: 100, cy: 46, r: 4.6, fill: P.bow, stroke: P.bowLight, sw: 1.2 },
];

// ─── Accessories ──────────────────────────────────────────────────────────────

// Party hat: a striped cone that replaces the topknot tuft. The bow stays.
const HAT: Shape[] = [
  { t: 'path', d: 'M 80 44 L 103 2 L 122 44 Q 101 50 80 44 Z', fill: P.hat, stroke: P.outline, sw: 2 },
  { t: 'path', d: 'M 88.5 29 Q 100 33 115 28.5 L 111.5 20.5 Q 101 24 93 20.5 Z', fill: P.hatStripe },
  { t: 'circle', cx: 103, cy: 3.5, r: 5.5, fill: P.hatPom, stroke: P.outline, sw: 1.6 },
];

// Scarf (the "Cozy Sweater" item): a band under the chin and one hanging end.
const SCARF: Shape[] = [
  { t: 'path', d: 'M 66 126 Q 100 144 134 126 L 137 136 Q 100 156 63 136 Z', fill: P.scarf, stroke: P.scarfShade, sw: 2 },
  { t: 'path', d: 'M 112 142 L 126 138 L 131 164 L 124 161 L 120 167 L 115 163 Z', fill: P.scarf, stroke: P.scarfShade, sw: 2 },
  { t: 'path', d: 'M 117 150 L 127 147', stroke: P.scarfShade, sw: 2 },
  { t: 'path', d: 'M 118 157 L 128 154', stroke: P.scarfShade, sw: 2 },
];

const BOW_TIE: Shape[] = [
  { t: 'path', d: 'M 99 140 L 84 132 Q 81 140 84 148 Z', fill: P.bowTie },
  { t: 'path', d: mirrorPath('M 99 140 L 84 132 Q 81 140 84 148 Z'), fill: P.bowTie },
  { t: 'circle', cx: 100, cy: 140, r: 4.4, fill: P.bowTie, stroke: '#B0153A', sw: 1.2 },
];

const COLLAR: Shape[] = [
  { t: 'path', d: 'M 68 128 Q 100 144 132 128 L 134 135 Q 100 152 66 135 Z', fill: P.gold, stroke: P.goldShade, sw: 1.8 },
  { t: 'circle', cx: 100, cy: 147, r: 5.2, fill: P.gold, stroke: P.goldShade, sw: 1.8 },
];

// ─── Effects (drawn in their own small boxes, centred on 0,0) ─────────────────

export const HEART: Shape[] = [
  {
    t: 'path',
    d: 'M 0 7 C -11 -1 -9 -10 -4.5 -10 C -2 -10 0 -8 0 -5.5 C 0 -8 2 -10 4.5 -10 C 9 -10 11 -1 0 7 Z',
    fill: P.heart, stroke: P.highlight, sw: 1.4,
  },
];

// The letter "z" as a path, so no font is needed.
export const ZEE: Shape[] = [
  { t: 'path', d: 'M -5 -5 L 5 -5 L -5 5 L 5 5', stroke: P.zzzOutline, sw: 4.6 },
  { t: 'path', d: 'M -5 -5 L 5 -5 L -5 5 L 5 5', stroke: P.zzz, sw: 2.4 },
];

// Four-point sparkle
export function sparkle(color: string): Shape[] {
  return [
    { t: 'path', d: 'M 0 -7 Q 1.4 -1.4 7 0 Q 1.4 1.4 0 7 Q -1.4 1.4 -7 0 Q -1.4 -1.4 0 -7 Z', fill: color },
  ];
}

export const PARTS = {
  shadow: SHADOW,
  tail: TAIL,
  body: BODY,
  pawL: PAW_L,
  pawR: PAW_R,
  head: HEAD,
  earL: EAR_L,
  earR: EAR_R,
  face: down(FACE),
  eyesOpen: down(EYES_OPEN),
  lids: down(LIDS),
  eyesHappy: down(EYES_HAPPY),
  mouthClosed: down(MOUTH_CLOSED),
  mouthOpen: down(MOUTH_OPEN),
  knotTuft: KNOT_TUFT,
  bow: BOW,
  hat: HAT,
  scarf: SCARF,
  bowTie: BOW_TIE,
  collar: COLLAR,
} as const;

export type ShapeListName = keyof typeof PARTS;
