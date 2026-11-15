// houses/starter.ts — the starter doghouse scene descriptor.
//
// Defines STARTER_HOUSE: the HouseDef used when no house item is owned yet.
// The visual doghouse is drawn by YardStageArt (stage 0, React Native views)
// in HomeScreen.tsx. This HouseDef only carries the interaction geometry:
// where the dog stands, the door she walks to, and the hit area that counts
// as "the house" for a tap. backdrop, house, and ambient are intentionally
// empty so HouseScene renders nothing on top of the view-based art.
//
// Scene coordinates were derived from the stage-0 view positions
// (bottom: '24%', right: '8%', 76 × 46px walls) on a typical 390 × 253px
// yard where sceneFit gives k ≈ 1.265, vx ≈ -4.15, vy = 0:
//   house centre x  =  (390 - 390·0.08 - 76/2) / 1.265 + (-4.15) ≈ 249
//   house walls bottom y  =  (253 - 253·0.24) / 1.265 ≈ 152
//   house top y (incl. roof h = 46·0.6)  =  (walls_bottom_px - 73.6) / 1.265 ≈ 94
// Dog spot matches the tier-1 house layout so the dog size is consistent.

import type { HouseDef } from './types';

export const STARTER_HOUSE: HouseDef = {
  id:      'house_starter',
  dark:    false,
  backdrop: [],
  house:    [],
  ambient:  [],
  // Dog stands left, same position as the tier-1 houses (see tier1.ts DOG_SPOT).
  dog:  { x: 76, y: 193, size: 108 },
  // The entrance is at the centre-bottom of the stage-0 doghouse walls.
  door: { x: 249, y: 152 },
  rest: { x: 249, y: 152, size: 46 },
  // Tap target covers the full doghouse (walls + roof), in scene units.
  hit:  { x: 219, y: 94, w: 60, h: 58 },
};
