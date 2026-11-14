// breeds/goldenRetriever.ts — the Golden Retriever: a warm gold coat, soft
// drop ears a shade darker, a pale feathered chest, and a big plume tail.

import { both, ellipse, line, mirrorAll, path } from '../shapes';
import type { Shape } from '../shapes';
import { GROUND_SHADOW, buildFace, paw, softMuzzle } from './common';
import { anchor, anchorTable } from './types';
import type { BreedDef } from './types';

const FUR = '#F2BC5E';
const SHADE = '#D69B3A';
const OUTLINE = '#A2702E';
const EAR = '#E3A443';      // ears are a shade darker than the coat
const CREAM = '#FBE5B0';
const LINE = 3.2;
const O = { fill: FUR, stroke: OUTLINE, sw: LINE, ol: true };

// A fluffy seated body: wider than the short-haired dogs, with feathering
// that scallops out at the hem.
const BODY_PATH =
  'M 70 120 C 56 134 47 158 47 176 C 47 185 54 190 61 186 C 66 191 74 191 78 187 L 122 187 C 126 191 134 191 139 186 C 146 190 153 185 153 176 C 153 158 144 134 130 120 Z';

// Round, friendly head with full cheeks.
const HEAD_PATH =
  'M 100 40 C 131 40 153 60 153 86 C 153 106 143 120 129 126 C 121 131 110 134 100 134 C 90 134 79 131 71 126 C 57 120 47 106 47 86 C 47 60 69 40 100 40 Z';

// Soft drop ear: a rounded triangle hanging beside the cheek.
const EAR_L: Shape[] = [
  path('M 62 50 C 49 50 39 61 36 78 C 33 94 37 108 46 110 C 55 111 62 101 65 88 C 68 75 69 58 62 50 Z', { fill: EAR, stroke: OUTLINE, sw: LINE, ol: true }),
  line('M 50 68 C 45 82 45 94 48 102', SHADE, 2.8),
  // Blend the top of the ear into the head.
  ellipse(62, 56, 7, 6, { fill: FUR }),
];

// Feathered plume tail, swept up behind her.
const TAIL: Shape[] = [
  // Three feathery lobes along the top, like the fringe on a real golden's tail.
  path('M 128 170 C 146 178 168 168 175 150 C 184 150 190 138 182 129 C 187 117 175 106 164 113 C 160 102 146 103 143 115 C 134 113 128 123 133 132 C 127 143 127 159 128 170 Z', O),
  line('M 146 158 C 158 152 167 141 168 128', SHADE, 3),
  line('M 140 140 C 146 134 150 127 151 120', SHADE, 2.4),
];

const face = buildFace({
  eyeDX: 20, eyeY: 89, eyeR: 8.4, noseY: 105,
  lidColor: FUR,
  muzzle: [softMuzzle(105, CREAM, SHADE, 1.1)],
});

export const GOLDEN_RETRIEVER: BreedDef = {
  id: 'golden_retriever',
  displayName: 'Golden Retriever',
  blurb: 'Sunny gold coat and a tail that never stops',
  palette: { fur: FUR, shade: SHADE, outline: OUTLINE, second: EAR, third: CREAM },
  parts: {
    shadow: GROUND_SHADOW(60),
    tail: TAIL,
    bodyPath: BODY_PATH,
    bodyMarks: [
      // Pale feathered chest
      path('M 78 116 L 122 116 C 128 132 124 152 112 162 C 106 167 94 167 88 162 C 76 152 72 132 78 116 Z', { fill: CREAM }),
    ],
    bodyDetail: [
      line('M 82 142 C 86 151 96 153 100 146 C 104 153 114 151 118 142', SHADE, 2.8),
      ...both([line('M 58 164 C 59 173 65 179 71 178', SHADE, 2.8)]),
    ],
    pawL: paw(84, 184, FUR, OUTLINE, SHADE),
    pawR: paw(116, 184, FUR, OUTLINE, SHADE),
    headPath: HEAD_PATH,
    headMarks: [],
    headDetail: [
      // A little wave of hair on the forehead
      line('M 92 50 C 96 46 104 46 108 50', SHADE, 2.6),
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
    earL: { x: 60, y: 58 },
    earR: { x: 140, y: 58 },
    tail: { x: 132, y: 162 },
    knot: { x: 100, y: 46 },
    lidY: face.lidY,
    mouthY: face.mouthY,
    earSign: 1,    // hanging ears swing outward
    earGain: 0.8,
  },
  anchors: anchorTable({
    headTop: anchor(100, 46),
    eyes: anchor(100, 89),
    neck: anchor(100, 135),
    chest: anchor(100, 152),
    back: anchor(100, 140),
    frontPaw: anchor(116, 184),
    aura: anchor(100, 108),
  }),
};
