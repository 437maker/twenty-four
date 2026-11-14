// breeds/germanShepherd.ts — the German Shepherd: tall pointed ears, a dark
// cap and muzzle on a tan face, tan eyebrow dots, a dark saddle over the
// shoulders, and a bushy dark-tipped tail. This is the app's original Nova,
// redrawn in the same style as the Maltese.

import { both, ellipse, line, mirrorAll, path } from '../shapes';
import type { Shape } from '../shapes';
import { GROUND_SHADOW, buildFace, paw, smoothBody, softMuzzle } from './common';
import { anchor, anchorTable } from './types';
import type { BreedDef } from './types';

const FUR = '#DDA35F';      // tan
const SHADE = '#BC8346';
const OUTLINE = '#6E4E36';
const DARK = '#54433B';     // the black parts, softened to a warm charcoal
const CREAM = '#F5DFBC';
const EAR_IN = '#E9B98C';
const LINE = 3.2;

const BODY_PATH = smoothBody(1);

// A broad head that narrows a little toward the chin.
const HEAD_PATH =
  'M 100 40 C 129 40 151 58 151 84 C 151 103 141 117 127 124 C 119 130 109 133 100 133 C 91 133 81 130 73 124 C 59 117 49 103 49 84 C 49 58 71 40 100 40 Z';

// Tall pointed ear: dark outside, tan inside. The thick dark line along the
// bottom hides the ear's lower outline so it grows out of the dark cap.
const EAR_L: Shape[] = [
  path('M 57 60 C 52 44 52 26 58 11 C 72 18 87 30 93 45 Z', { fill: DARK, stroke: OUTLINE, sw: LINE, ol: true }),
  path('M 63 50 C 60 40 60 31 63 23 C 71 29 79 37 84 45 Z', { fill: EAR_IN }),
  line('M 62 57 L 89 46', DARK, 8),
];

const TAIL_PATH =
  'M 128 172 C 146 180 168 172 175 152 C 179 139 175 126 166 119 C 163 133 153 146 140 150 C 131 154 126 163 128 172 Z';
const TAIL: Shape[] = [
  path(TAIL_PATH, { fill: FUR }),
  path('M 166 119 C 175 126 179 139 175 152 C 172 159 168 164 163 168 C 166 152 167 136 166 119 Z', { fill: DARK }),
  path(TAIL_PATH, { stroke: OUTLINE, sw: LINE, ol: true }),
];

const face = buildFace({
  eyeDX: 19, eyeY: 88, eyeR: 8.2, noseY: 105,
  lidColor: FUR,
  // A shade lighter than the cap, so the nose still shows on it.
  muzzle: [softMuzzle(105, '#77604F', DARK, 1.05)],
  mouthLine: CREAM,
  blushDX: 31,
  // The tan "eyebrow" dots every shepherd has.
  brows: both([ellipse(81, 73.5, 4.6, 3.2, { fill: CREAM })]),
});

export const GERMAN_SHEPHERD: BreedDef = {
  id: 'german_shepherd',
  displayName: 'German Shepherd',
  blurb: 'Tall ears, dark mask, loyal to the end',
  palette: { fur: FUR, shade: SHADE, outline: OUTLINE, second: DARK, third: CREAM },
  parts: {
    shadow: GROUND_SHADOW(60),
    tail: TAIL,
    bodyPath: BODY_PATH,
    bodyMarks: [
      // Dark saddle coming over each shoulder
      ...both([path('M 40 110 L 80 110 C 68 126 60 146 58 168 L 40 172 Z', { fill: DARK })]),
      // Cream chest
      path('M 82 118 L 118 118 C 124 136 122 158 112 170 L 88 170 C 78 158 76 136 82 118 Z', { fill: CREAM }),
    ],
    bodyDetail: [
      line('M 90 144 C 94 151 106 151 110 144', SHADE, 2.6),
    ],
    pawL: paw(84, 184, FUR, OUTLINE, SHADE),
    pawR: paw(116, 184, FUR, OUTLINE, SHADE),
    headPath: HEAD_PATH,
    headMarks: [
      // Dark cap with a widow's peak between the eyes
      path('M 40 30 L 160 30 L 153 62 C 138 50 116 52 100 64 C 84 52 62 50 47 62 Z', { fill: DARK }),
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
    earL: { x: 74, y: 50 },
    earR: { x: 126, y: 50 },
    tail: { x: 132, y: 164 },
    knot: { x: 100, y: 46 },
    lidY: face.lidY,
    mouthY: face.mouthY,
    earSign: -1,   // upright ears tip outward
    earGain: 0.4,  // and are stiff
  },
  anchors: anchorTable({
    headTop: anchor(100, 46),
    eyes: anchor(100, 88, 0.96),
    neck: anchor(100, 134),
    chest: anchor(100, 152),
    back: anchor(100, 140),
    frontPaw: anchor(116, 184),
    aura: anchor(100, 108),
  }),
};

