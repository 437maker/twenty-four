// breeds/shiba.ts — the Shiba Inu: fluffy cheeks, small pointed ears, cream
// cheeks, brows, and chest on a red-orange coat, and a tail curled into a
// ring over the back.

import { both, ellipse, line, mirrorAll, path } from '../shapes';
import type { Shape } from '../shapes';
import { GROUND_SHADOW, buildFace, paw, smoothBody, softMuzzle } from './common';
import { anchor, anchorTable } from './types';
import type { BreedDef } from './types';

const FUR = '#DC8B3F';      // red-orange, deeper than the Corgi
const SHADE = '#B96B26';
const OUTLINE = '#8A4F22';
const CREAM = '#FFF2DA';
const CREAM_SHADE = '#EAD6B4';
const LINE = 3.2;

const BODY_PATH = smoothBody(1.02);

// A wide head with cheek fluff that sticks out past the jaw.
const HEAD_PATH =
  'M 100 43 C 124 43 143 56 149 76 C 161 88 160 110 141 120 C 129 130 114 134 100 134 C 86 134 71 130 59 120 C 40 110 39 88 51 76 C 57 56 76 43 100 43 Z';

// Small, thick triangle ears set wide apart.
const EAR_L: Shape[] = [
  path('M 55 64 C 51 48 53 32 59 20 C 73 26 86 38 91 51 Z', { fill: FUR, stroke: OUTLINE, sw: LINE, ol: true }),
  path('M 61 55 C 59 45 60 37 63 31 C 71 36 78 43 82 50 Z', { fill: CREAM }),
  line('M 60 61 L 88 51', FUR, 8),
];

// Tail curled into a ring, cream on the inside of the curl.
const TAIL_PATH =
  'M 128 170 C 141 174 153 170 160 161 C 174 157 181 141 175 128 C 169 115 152 112 143 121 C 135 129 137 143 146 148 C 137 152 129 160 128 170 Z';
const TAIL: Shape[] = [
  path(TAIL_PATH, { fill: FUR, stroke: OUTLINE, sw: LINE, ol: true }),
  ellipse(158, 137, 7.5, 7, { fill: CREAM }),
  line('M 163 148 C 170 140 167 127 157 126 C 150 126 146 133 150 139', SHADE, 2.8),
];

const face = buildFace({
  eyeDX: 20, eyeY: 88, eyeR: 7.6, noseY: 105,
  lidColor: FUR,
  muzzle: [softMuzzle(105, CREAM, CREAM_SHADE, 1.05)],
  blushDX: 33,
  // Cream brow dots
  brows: both([ellipse(80, 75, 4.4, 3, { fill: CREAM })]),
});

export const SHIBA: BreedDef = {
  id: 'shiba',
  displayName: 'Shiba Inu',
  blurb: 'Fluffy cheeks and a curly tail',
  palette: { fur: FUR, shade: SHADE, outline: OUTLINE, second: CREAM },
  parts: {
    shadow: GROUND_SHADOW(60),
    tail: TAIL,
    bodyPath: BODY_PATH,
    bodyMarks: [
      // Cream chest and belly
      path('M 74 112 L 126 112 C 132 136 128 160 114 172 L 86 172 C 72 160 68 136 74 112 Z', { fill: CREAM }),
    ],
    bodyDetail: [
      line('M 86 142 C 90 150 96 152 100 146 C 104 152 110 150 114 142', CREAM_SHADE, 2.8),
    ],
    pawL: paw(84, 184, CREAM, OUTLINE, CREAM_SHADE),
    pawR: paw(116, 184, CREAM, OUTLINE, CREAM_SHADE),
    headPath: HEAD_PATH,
    headMarks: [
      // Cream cheeks and chin: the lower half of the face, rising at each side
      path('M 34 100 C 52 90 72 96 84 107 C 92 99 108 99 116 107 C 128 96 148 90 166 100 L 166 142 L 34 142 Z', { fill: CREAM }),
    ],
    headDetail: [],
    face: face.face,
    eyesOpen: face.eyesOpen,
    lids: face.lids,
    eyesHappy: face.eyesHappy,
    mouthClosed: face.mouthClosed,
    mouthOpen: face.mouthOpen,
    earL: EAR_L,
    earR: mirrorAll(EAR_L),
    knotTuft: [],
    knotBase: [],
  },
  pivots: {
    earL: { x: 73, y: 56 },
    earR: { x: 127, y: 56 },
    tail: { x: 132, y: 164 },
    knot: { x: 100, y: 49 },
    lidY: face.lidY,
    mouthY: face.mouthY,
    earSign: -1,
    earGain: 0.35,
  },
  anchors: anchorTable({
    headTop: anchor(100, 49),
    eyes: anchor(100, 88),
    neck: anchor(100, 135),
    chest: anchor(100, 152),
    back: anchor(100, 140),
    frontPaw: anchor(116, 184),
    aura: anchor(100, 108),
  }),
};
