// sportsArt.ts — sports gear (Tier 2): four jerseys, two helmets, and four
// things to hold (a basketball, a football, a baseball bat, a hockey stick).
//
// Everything uses the app's own colors (the brand purple, the four pillar
// colors, gold) and the number 24. There are no league or team names, marks,
// or color schemes here, and none may be added.
//
// Where (0, 0) is for each slot is explained at the top of itemArt.ts.

import { circle, line, path } from '../shapes';
import {
  BRAND, BRAND_D, CARE, GOLD, GOLD_D, PERSONAL, SLEEP, WHITE,
  collarBand, garment, num24, pair,
} from './artKit';
import type { ItemArt } from './artKit';

const CREAM = '#FFF8EA';
const STEEL = '#D5DDE5';
const STEEL_D = '#8A98A8';

export const SPORTS_ART: Record<string, ItemArt> = {
  // ═══ JERSEYS (outfit slot) ══════════════════════════════════════════════════

  // Purple, with white shoulders, gold stripes and a big white 24.
  outfit_football_jersey: {
    clip: true,
    shapes: [
      ...garment(BRAND, BRAND_D, 30),
      // Wide padded shoulders in white, edged with a gold stripe
      ...pair([
        path('M -90 -60 L -30 -60 L -37 -3 L -90 6 Z', { fill: WHITE }),
        line('M -37 -3 L -90 6', GOLD, 3.4),
      ]),
      line('M -90 24 L 90 24', GOLD, 3),
      ...num24(0, 9, 1.05, WHITE, 3.6),
      // V collar
      path('M -38 -30 Q 0 -8 38 -30 L 40 -22 L 0 2 L -40 -22 Z', { fill: WHITE, stroke: '#D9D4EE', sw: 1.6 }),
    ],
  },

  // Cream with purple pinstripes, a buttoned front, and an orange 24 on the chest.
  outfit_baseball_jersey: {
    clip: true,
    shapes: [
      ...garment(CREAM, '#E2D6BE', 30),
      ...[-46, -35, -24, -13, 13, 24, 35, 46].map((x) => line(`M ${x} -40 L ${x} 30`, BRAND, 1.2, 0.5)),
      // Sleeve cuffs
      ...pair([line('M -56 -2 L -40 -12', BRAND, 3.4)]),
      // Button placket
      line('M 0 -14 L 0 30', '#E2D6BE', 2.6),
      circle(0, 0, 2, { fill: BRAND }), circle(0, 10, 2, { fill: BRAND }), circle(0, 20, 2, { fill: BRAND }),
      ...num24(23, 8, 0.82, CARE, 3),
      collarBand(BRAND, BRAND_D),
    ],
  },

  // A green sleeveless jersey with white trim and a white 24. The shoulders
  // are bare, so the coat shows there.
  outfit_basketball_jersey: {
    clip: true,
    shapes: [
      path('M -27 -60 L 27 -60 C 27 -26 34 -8 54 -2 L 90 -2 L 90 31 L -90 31 L -90 -2 L -54 -2 C -34 -8 -27 -26 -27 -60 Z', { fill: PERSONAL }),
      // Armhole trim
      ...pair([line('M -27 -40 C -27 -24 -34 -8 -54 -2 L -90 -2', WHITE, 2.6)]),
      line('M -90 31 L 90 31', '#157A5B', 3),
      // Side stripes
      ...pair([line('M -45 2 L -49 31', WHITE, 2.4)]),
      ...num24(0, 11, 1, WHITE, 3.4),
      // Scoop neck
      line('M -27 -24 Q 0 2 27 -24', WHITE, 3),
    ],
  },

  // A long blue jersey with a broad white band, gold piping, a white 24 and
  // a laced collar.
  outfit_hockey_jersey: {
    clip: true,
    shapes: [
      ...garment(SLEEP, '#11477D', 35),
      path('M -90 17 L 90 17 L 90 27 L -90 27 Z', { fill: WHITE }),
      line('M -90 15.5 L 90 15.5', GOLD, 2),
      line('M -90 28.5 L 90 28.5', GOLD, 2),
      // Shoulder yoke
      ...pair([line('M -58 -4 L -34 -15', WHITE, 3.4)]),
      ...num24(0, 3.5, 0.95, WHITE, 3.2),
      collarBand(WHITE, '#C9D6E4'),
      // Laces
      line('M -3.5 -9 L 3.5 -4', SLEEP, 1.4),
      line('M 3.5 -9 L -3.5 -4', SLEEP, 1.4),
    ],
  },

  // ═══ HELMETS (head slot) ════════════════════════════════════════════════════
  // (0, 0) is the top of the head; the eyes are about 44 units below it. A
  // helmet is a shell over the forehead with a guard down each cheek. Upright
  // ears tuck inside it (scene.ts); hanging ears come out underneath.

  // A gold shell with a purple stripe and a steel face mask.
  acc_football_helmet: {
    coversKnot: true,
    helmet: true,
    shapes: [
      path('M -59 38 C -63 0 -38 -15 0 -15 C 38 -15 63 0 59 38 L 56 60 Q 50 69 42 62 L 40 32 Q 0 20 -40 32 L -42 62 Q -50 69 -56 60 Z', { fill: GOLD, stroke: GOLD_D, sw: 2.4 }),
      // Centre stripe
      path('M -5.5 -15 L 5.5 -15 L 6.5 26 L -6.5 26 Z', { fill: BRAND }),
      // Ear hole on each side
      ...pair([circle(-50, 40, 3.2, { fill: GOLD_D })]),
      // Face mask: one bar under the nose, one under the mouth, and two
      // uprights. The eyes, nose and mouth all show between them.
      line('M -42 59 Q 0 73 42 59', STEEL_D, 4.2),
      line('M -42 59 Q 0 73 42 59', STEEL, 2.2),
      line('M -43 69 Q 0 91 43 69', STEEL_D, 4.2),
      line('M -43 69 Q 0 91 43 69', STEEL, 2.2),
      ...pair([line('M -25 64 L -26 77', STEEL_D, 3.4), line('M -25 64 L -26 77', STEEL, 1.6)]),
    ],
  },

  // A white shell with a blue stripe, vents on top, and a chin strap.
  acc_hockey_helmet: {
    coversKnot: true,
    helmet: true,
    shapes: [
      // Chin strap first, so the shell overlaps its ends
      line('M -52 50 C -50 82 -22 91 0 91 C 22 91 50 82 52 50', '#3A4350', 3),
      path('M -58 36 C -62 2 -40 -13 0 -13 C 40 -13 62 2 58 36 L 55 54 Q 49 60 43 54 L 42 29 Q 0 25 -42 29 L -43 54 Q -49 60 -55 54 Z', { fill: '#F4F6F8', stroke: '#9AA7B5', sw: 2.4 }),
      // Brow band
      path('M -42 29 Q 0 25 42 29 L 42 22 Q 0 18 -42 22 Z', { fill: SLEEP }),
      // Vents
      ...pair([
        line('M -8 -5 L -8 7', '#9AA7B5', 3),
        line('M -22 -2 L -24 9', '#9AA7B5', 3),
      ]),
      // Ear guard on each side
      ...pair([
        circle(-50, 40, 5.4, { fill: '#DDE3E9', stroke: '#9AA7B5', sw: 1.6 }),
        circle(-50, 40, 1.8, { fill: '#9AA7B5' }),
      ]),
    ],
  },

  // ═══ HELD ═══════════════════════════════════════════════════════════════════
  // (0, 0) is the right front paw.

  // An orange ball with dark seams, resting by her paw.
  acc_basketball: {
    shapes: [
      circle(25, -11, 15.5, { fill: '#E9792B', stroke: '#9A4A14', sw: 2.2 }),
      line('M 9.5 -11 L 40.5 -11', '#9A4A14', 1.6),
      line('M 25 -26.5 L 25 4.5', '#9A4A14', 1.6),
      line('M 14 -22 Q 21 -11 14 0', '#9A4A14', 1.6),
      line('M 36 -22 Q 29 -11 36 0', '#9A4A14', 1.6),
      line('M 15.5 -18 Q 18 -22 22 -23.5', WHITE, 1.8, 0.6),
    ],
  },

  // A brown leather ball with white laces, lying by her paw.
  acc_football: {
    shapes: [
      path('M 8 -10 Q 25 -28 42 -10 Q 25 8 8 -10 Z', { fill: '#9A5530', stroke: '#5C2E17', sw: 2.2 }),
      line('M 15.5 -16.5 Q 13 -10 15.5 -3.5', WHITE, 2),
      line('M 34.5 -16.5 Q 37 -10 34.5 -3.5', WHITE, 2),
      line('M 19.5 -12 L 30.5 -12', WHITE, 1.8),
      line('M 22 -14.5 L 22 -9.5', WHITE, 1.6),
      line('M 25 -14.5 L 25 -9.5', WHITE, 1.6),
      line('M 28 -14.5 L 28 -9.5', WHITE, 1.6),
    ],
  },

  // A wooden stick with a taped blade and grip, and a puck on the ground.
  acc_hockey_stick: {
    shapes: [
      line('M 13 -1 L 31 -72', '#A8713A', 5.6),
      line('M 13 -1 L 31 -72', '#E2B074', 3),
      // Blade
      line('M 13 0 L 32 2.5', '#2F3742', 7),
      line('M 19 0.8 L 19 0.9', WHITE, 2.2, 0.7),
      line('M 25 1.6 L 25 1.7', WHITE, 2.2, 0.7),
      // Grip tape
      line('M 28.6 -62.5 L 31 -72', BRAND, 5.8),
      // Puck
      path('M 37 1.5 Q 37 -1 43 -1 Q 49 -1 49 1.5 L 49 3.5 Q 49 6 43 6 Q 37 6 37 3.5 Z', { fill: '#2B2420', stroke: '#55606E', sw: 1 }),
    ],
  },

  // A wooden bat with a purple grip, leaning up from her paw.
  acc_baseball_bat: {
    shapes: [
      path('M 1.9 -0.8 L 13.3 -32.4 L 24.4 -72.1 Q 32.4 -79 35.6 -67.9 L 18.1 -30.6 L 6.1 0.8 Z', { fill: '#E2B074', stroke: '#A8713A', sw: 2 }),
      // Grip tape
      line('M 6 -5.5 L 11.5 -20.5', BRAND, 5.4),
      // Knob
      circle(4, 0, 3.8, { fill: '#E2B074', stroke: '#A8713A', sw: 2 }),
      // A ring near the barrel, and a little shine
      line('M 19.4 -44 L 24.2 -42.2', CARE, 2.4),
      line('M 26 -66 L 21.5 -52', WHITE, 1.6, 0.55),
    ],
  },
};
