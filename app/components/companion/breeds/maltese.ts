// breeds/maltese.ts — the Maltese: white floor-length coat, long silky ears,
// a topknot tied with a bow, and a plume tail.

import { PALETTE } from '../palette';
import { both, circle, ellipse, line, mirrorAll, mirrorPath, path } from '../shapes';
import type { Shape } from '../shapes';
import { GROUND_SHADOW, buildFace, paw, softMuzzle } from './common';
import { anchor, anchorTable } from './types';
import type { BreedDef } from './types';

const FUR = '#FFFDF8';
const SHADE = '#EDE4D6';
const OUTLINE = '#CBBFAE';
const LINE = 3.2;
const O = { fill: FUR, stroke: OUTLINE, sw: LINE, ol: true };

const BODY_PATH =
  'M 70 120 C 56 134 46 158 46 176 C 46 185 53 190 60 186 C 65 192 74 192 78 187 L 122 187 C 126 192 135 192 140 186 C 147 190 154 185 154 176 C 154 158 144 134 130 120 Z';

// Big round head, a little wider at the cheeks, with a soft scalloped chin.
const HEAD_PATH =
  'M 100 38 C 132 38 154 58 154 86 C 154 104 146 118 134 125 C 128 133 118 131 114 127 C 110 134 90 134 86 127 C 82 131 72 133 66 125 C 54 118 46 104 46 86 C 46 58 68 38 100 38 Z';

// Plume tail curled up over the back. Three soft lobes, like a feather duster.
const TAIL: Shape[] = [
  path('M 128 168 C 146 176 168 166 174 148 C 182 148 188 136 180 128 C 185 116 173 106 163 113 C 160 102 145 102 142 114 C 133 112 127 122 132 131 C 126 142 128 158 128 168 Z', O),
  line('M 146 156 C 158 150 166 140 167 128', SHADE, 3),
];

// Long silky ear hanging from high on the head, ending in three scallops.
const EAR_L: Shape[] = [
  path('M 60 54 C 49 53 41 64 37 82 C 33 98 31 114 33 126 C 35 133 40 133 43 128 C 45 134 51 134 53 128 C 56 133 62 131 63 125 C 66 110 67 90 66 74 C 66 63 65 55 60 54 Z', O),
  line('M 52 70 C 46 88 44 104 45 120', SHADE, 3),
  line('M 59 84 C 56 98 55 108 56 118', SHADE, 2.4),
  // A fur-colored patch over the top edge, so the ear reads as hair flowing
  // out of the head rather than a flap attached to it.
  ellipse(60.5, 59, 7.5, 6.5, { fill: FUR }),
];

const face = buildFace({
  eyeDX: 20, eyeY: 90, eyeR: 8.6, noseY: 104,
  lidColor: FUR,
  muzzle: [softMuzzle(104, FUR, SHADE)],
});

const BOW_HALF = 'M 99 46 L 83 37.5 Q 79 46 83 54.5 Z';

export const MALTESE: BreedDef = {
  id: 'maltese',
  displayName: 'Maltese',
  blurb: 'Silky white coat, topknot and bow',
  palette: { fur: FUR, shade: SHADE, outline: OUTLINE },
  parts: {
    shadow: GROUND_SHADOW(60),
    tail: TAIL,
    bodyPath: BODY_PATH,
    bodyMarks: [],
    bodyDetail: [
      // Chest fluff: two scallops under the chin
      line('M 80 140 C 84 150 95 152 100 144 C 105 152 116 150 120 140', SHADE, 3),
      // Coat hem: one soft fold on each side
      ...both([line('M 57 164 C 58 174 64 180 71 179', SHADE, 3)]),
    ],
    pawL: paw(84, 184, FUR, OUTLINE, SHADE),
    pawR: paw(116, 184, FUR, OUTLINE, SHADE),
    headPath: HEAD_PATH,
    headMarks: [],
    headDetail: [
      // Centre parting: hair swept to each side from the topknot
      ...both([line('M 96 50 C 86 54 76 60 69 68', SHADE, 3)]),
    ],
    face: face.face,
    eyesOpen: face.eyesOpen,
    lids: face.lids,
    eyesHappy: face.eyesHappy,
    mouthClosed: face.mouthClosed,
    mouthOpen: face.mouthOpen,
    earL: EAR_L,
    earR: mirrorAll(EAR_L),
    // Topknot: a little fountain of hair above the bow.
    knotTuft: [
      path('M 100 47 C 91 45 84 36 86 27 C 87 21 93 22 94 27 C 94 19 98 13 100 13 C 102 13 106 19 106 27 C 107 22 113 21 114 27 C 116 36 109 45 100 47 Z', O),
      line('M 100 22 L 100 38', SHADE, 2.4),
    ],
    knotBase: [
      path(BOW_HALF, { fill: PALETTE.bow, stroke: PALETTE.bowLight, sw: 1.2 }),
      path(mirrorPath(BOW_HALF), { fill: PALETTE.bow, stroke: PALETTE.bowLight, sw: 1.2 }),
      circle(100, 46, 4.6, { fill: PALETTE.bow, stroke: PALETTE.bowLight, sw: 1.2 }),
    ],
  },
  pivots: {
    earL: { x: 58, y: 62 },
    earR: { x: 142, y: 62 },
    tail: { x: 132, y: 160 },
    knot: { x: 100, y: 46 },
    lidY: face.lidY,
    mouthY: face.mouthY,
    earSign: 1,   // hanging ears swing outward
    earGain: 1,
  },
  anchors: anchorTable({
    headTop: anchor(100, 44),
    eyes: anchor(100, 90),
    neck: anchor(100, 134),
    chest: anchor(100, 152),
    back: anchor(100, 140),
    frontPaw: anchor(116, 184),
    aura: anchor(100, 108),
  }),
};
