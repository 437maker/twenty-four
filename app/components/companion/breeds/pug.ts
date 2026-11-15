// breeds/pug.ts — the Pug: a wide round head, big eyes set far apart, a dark
// mask over a flat muzzle, small dark folded ears, forehead wrinkles, a stocky
// fawn body, and a tight little curl of a tail.

import { both, ellipse, line, mirrorAll, path } from '../shapes';
import type { Shape } from '../shapes';
import { GROUND_SHADOW, buildFace, paw, smoothBody } from './common';
import { anchor, anchorTable } from './types';
import type { BreedDef } from './types';

const FUR = '#EBCB9B';      // fawn
const SHADE = '#CFA872';
const OUTLINE = '#9A7850';
const DARK = '#5A4840';     // mask and ears
const DARK_EDGE = '#43352F';
const LINE = 3.2;

const BODY_PATH = smoothBody(1.1);

// Wide and round, almost as broad as the body.
const HEAD_PATH =
  'M 100 42 C 133 42 157 61 157 88 C 157 108 145 122 129 128 C 121 132 110 134 100 134 C 90 134 79 132 71 128 C 55 122 43 108 43 88 C 43 61 67 42 100 42 Z';

// Small folded "button" ear, flopping forward at the corner of the head.
const EAR_L: Shape[] = [
  path('M 64 48 C 52 44 41 51 39 63 C 38 75 45 83 54 80 C 63 76 70 66 71 57 C 71 52 68 49 64 48 Z', { fill: DARK, stroke: DARK_EDGE, sw: LINE, ol: true }),
  // The crease where the ear folds over
  line('M 47 58 C 52 55 59 55 65 58', '#7A6558', 2.4),
];

// A tight curl sitting on her hip.
const TAIL: Shape[] = [
  path('M 150 160 C 150 148 161 141 170 146 C 179 151 178 164 169 168 C 161 171 152 168 150 160 Z', { fill: FUR, stroke: OUTLINE, sw: LINE, ol: true }),
  line('M 171 157 C 171 151 163 150 161 155 C 160 159 164 161 166 158', SHADE, 2.6),
];

const face = buildFace({
  eyeDX: 25, eyeY: 88, eyeR: 9.6, noseY: 104,
  lidColor: FUR,
  // The mask: a dark oval across the flat muzzle
  // (a shade lighter than the ears, so the nose still shows on it)
  muzzle: [ellipse(100, 109, 23, 16, { fill: '#75604F', stroke: DARK, sw: 2.2 })],
  mouthLine: FUR,
  blushDX: 36,
  noseScale: 0.9,
});

export const PUG: BreedDef = {
  id: 'pug',
  displayName: 'Pug',
  blurb: 'Big eyes, squishy face, curly tail',
  palette: { fur: FUR, shade: SHADE, outline: OUTLINE, second: DARK },
  parts: {
    shadow: GROUND_SHADOW(64),
    tail: TAIL,
    bodyPath: BODY_PATH,
    bodyMarks: [],
    bodyDetail: [
      // A chubby chest fold
      line('M 82 144 C 88 152 112 152 118 144', SHADE, 2.8),
      ...both([line('M 56 166 C 58 174 63 178 69 177', SHADE, 2.6)]),
    ],
    pawL: paw(84, 184, FUR, OUTLINE, SHADE),
    pawR: paw(116, 184, FUR, OUTLINE, SHADE),
    headPath: HEAD_PATH,
    headMarks: [],
    headDetail: [
      // Forehead wrinkles
      line('M 85 61 Q 100 54 115 61', SHADE, 2.8),
      line('M 90 70 Q 100 65 110 70', SHADE, 2.6),
    ],
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
    earL: { x: 62, y: 52 },
    earR: { x: 138, y: 52 },
    tail: { x: 154, y: 162 },
    knot: { x: 100, y: 48 },
    lidY: face.lidY,
    mouthY: face.mouthY,
    earSign: 1,
    earGain: 0.5,
  },
  anchors: anchorTable({
    headTop: anchor(100, 48),
    eyes: anchor(100, 88, 1.2),   // eyes are further apart, so glasses are wider
    neck: anchor(100, 135),
    chest: anchor(100, 152),
    back: anchor(100, 140, 1.04),
    frontPaw: anchor(116, 184),
    aura: anchor(100, 108),
  }),
  helmetFit: { scale: 1.05, tuckEars: true },   // a wide head, and ears that would stick out of the shell
};
