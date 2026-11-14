// breeds/corgi.ts — the Corgi: enormous upright ears, a white blaze down the
// face, a white chest and paws on an orange coat, a wide low body, and a
// little nub of a tail.

import { line, mirrorAll, path } from '../shapes';
import type { Shape } from '../shapes';
import { GROUND_SHADOW, buildFace, paw, smoothBody, softMuzzle } from './common';
import { anchor, anchorTable } from './types';
import type { BreedDef } from './types';

const FUR = '#EE9C4C';      // orange
const SHADE = '#CC7B30';
const OUTLINE = '#96592A';
const WHITE = '#FFFDF8';
const WHITE_SHADE = '#E8DCCB';
const EAR_IN = '#F9CDBE';
const LINE = 3.2;

const BODY_PATH = smoothBody(1.1);

// A foxy head: wide at the cheeks, a little pointed at the chin.
const HEAD_PATH =
  'M 100 44 C 127 44 151 60 154 85 C 156 101 146 115 130 123 C 120 130 110 134 100 134 C 90 134 80 130 70 123 C 54 115 44 101 46 85 C 49 60 73 44 100 44 Z';

// The famous ears: tall, wide, and rounded at the tip, pink inside.
const EAR_L: Shape[] = [
  path('M 52 66 C 43 48 42 28 49 14 C 67 19 86 32 94 49 Z', { fill: FUR, stroke: OUTLINE, sw: LINE, ol: true }),
  path('M 58 55 C 53 44 52 33 55 25 C 66 29 78 38 84 48 Z', { fill: EAR_IN }),
  line('M 58 63 L 90 50', FUR, 9),
];

// A fluffy nub.
const TAIL: Shape[] = [
  path('M 150 160 C 156 152 168 152 171 160 C 174 168 166 175 157 173 C 152 172 148 166 150 160 Z', { fill: FUR, stroke: OUTLINE, sw: LINE, ol: true }),
];

const face = buildFace({
  eyeDX: 21, eyeY: 90, eyeR: 8.4, noseY: 106,
  lidColor: FUR,
  muzzle: [softMuzzle(106, WHITE, WHITE_SHADE, 1.05)],
  blushDX: 31,
});

export const CORGI: BreedDef = {
  id: 'corgi',
  displayName: 'Corgi',
  blurb: 'Big ears, short legs, enormous confidence',
  palette: { fur: FUR, shade: SHADE, outline: OUTLINE, second: WHITE },
  parts: {
    shadow: GROUND_SHADOW(64),
    tail: TAIL,
    bodyPath: BODY_PATH,
    bodyMarks: [
      // White chest bib, wide at the neck
      path('M 68 112 L 132 112 C 134 136 126 158 112 168 C 106 172 94 172 88 168 C 74 158 66 136 68 112 Z', { fill: WHITE }),
    ],
    bodyDetail: [
      line('M 84 142 C 88 150 96 152 100 146 C 104 152 112 150 116 142', WHITE_SHADE, 2.8),
    ],
    pawL: paw(84, 184, WHITE, OUTLINE, WHITE_SHADE),
    pawR: paw(116, 184, WHITE, OUTLINE, WHITE_SHADE),
    headPath: HEAD_PATH,
    headMarks: [
      // White blaze: a stripe down the forehead that opens into the muzzle and chin
      path('M 95 38 L 105 38 C 106 60 107 78 111 90 C 126 98 140 112 138 142 L 62 142 C 60 112 74 98 89 90 C 93 78 94 60 95 38 Z', { fill: WHITE }),
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
    earL: { x: 72, y: 54 },
    earR: { x: 128, y: 54 },
    tail: { x: 152, y: 166 },
    knot: { x: 100, y: 50 },
    lidY: face.lidY,
    mouthY: face.mouthY,
    earSign: -1,   // upright ears tip outward
    earGain: 0.45,
  },
  anchors: anchorTable({
    headTop: anchor(100, 50),
    eyes: anchor(100, 90, 1.04),
    neck: anchor(100, 135),
    chest: anchor(100, 152),
    back: anchor(100, 140, 1.04),
    frontPaw: anchor(116, 184),
    aura: anchor(100, 108),
  }),
};
