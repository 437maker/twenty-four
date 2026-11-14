// houses/index.ts — the 15 houses, in shop order.
//
// To add a house: draw a HouseDef (see tier1.ts for the plainest example),
// add it here, and add the shop item with the same id to data/shopCatalog.ts.
// The yard, the Shop, the render script, and the tests read this list.

import { BEACH_SHACK, COZY_DEN, FOREST_CABIN } from './tier1';
import { DESERT_OASIS, MOUNTAIN_LODGE, TREEHOUSE } from './tier2';
import { CLOUD_CASTLE, SKY_TOWER, UNDERWATER_PALACE } from './tier3';
import { DRAGONS_LAIR, SPACE_STATION, TIME_FORTRESS } from './tier4';
import { COSMIC_SANCTUARY, DIMENSION_X, REALM_OF_GODS } from './tier5';
import type { HouseDef } from './types';

export const HOUSES: HouseDef[] = [
  COZY_DEN, BEACH_SHACK, FOREST_CABIN,
  TREEHOUSE, MOUNTAIN_LODGE, DESERT_OASIS,
  CLOUD_CASTLE, UNDERWATER_PALACE, SKY_TOWER,
  SPACE_STATION, DRAGONS_LAIR, TIME_FORTRESS,
  REALM_OF_GODS, COSMIC_SANCTUARY, DIMENSION_X,
];

const BY_ID: Record<string, HouseDef> = Object.fromEntries(HOUSES.map((h) => [h.id, h]));

// The drawing for a house item, or null for anything that is not a house.
export function getHouse(id: string | null | undefined): HouseDef | null {
  return (id && BY_ID[id]) || null;
}

export type { HouseDef } from './types';
