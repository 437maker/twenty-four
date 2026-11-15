// breeds/types.ts — what every breed has to provide.
//
// Shared skeleton, per-breed art. All breeds have the same part names, the
// same rig, and the same seven anchor points. A breed differs only in its
// drawing, its colors, where its pivots are, and where its anchors sit.
// Items (items/itemArt.ts) are drawn once and placed at an anchor, so every
// breed can wear every item.

import type { NovaState } from '../../../types';
import type { RigPivots } from '../poses';
import type { Anchor, Shape } from '../shapes';

export const BREED_IDS = ['maltese', 'german_shepherd', 'golden_retriever', 'corgi', 'shiba', 'pug'] as const;
export type BreedId = (typeof BREED_IDS)[number];

export const ANCHOR_NAMES = ['headTop', 'eyes', 'neck', 'chest', 'back', 'frontPaw', 'aura'] as const;
export type AnchorName = (typeof ANCHOR_NAMES)[number];

export const STATES: NovaState[] = ['idle', 'happy', 'celebrating', 'sleeping'];

export interface BreedPalette {
  fur: string;      // main coat
  shade: string;    // one shade tone for fold lines
  outline: string;  // soft outline (never black)
  second?: string;  // second coat color (markings), if the breed has one
  third?: string;   // third coat color, if any
}

export interface BreedParts {
  shadow: Shape[];
  tail: Shape[];
  bodyPath: string;      // body silhouette. Also the clip for outfits and body markings
  bodyMarks: Shape[];    // color patches, clipped to the body
  bodyDetail: Shape[];   // fold lines. Hidden under an outfit
  pawL: Shape[];
  pawR: Shape[];
  headPath: string;      // head silhouette. Also the clip for head markings
  headMarks: Shape[];    // color patches, clipped to the head
  headDetail: Shape[];   // fold lines, wrinkles
  face: Shape[];         // blush, muzzle, nose: the parts that never change
  eyesOpen: Shape[];
  lids: Shape[];
  eyesHappy: Shape[];
  mouthClosed: Shape[];
  mouthOpen: Shape[];
  earL: Shape[];
  earR: Shape[];
  knotTuft: Shape[];     // hair on top of the head that a hat replaces (Maltese topknot)
  knotBase: Shape[];     // what stays under a hat (Maltese bow)
}

export interface BreedDef {
  id: BreedId;
  displayName: string;
  blurb: string;         // one line for the breed picker
  palette: BreedPalette;
  parts: BreedParts;
  pivots: RigPivots;     // where the ears, tail, eyelids, and mouth hinge
  // Where items attach, for each state. Anchors ride on the part they belong
  // to (headTop on the head, back on the body, frontPaw on a paw), so these
  // are positions on the resting drawing; the rig carries them along.
  anchors: Record<NovaState, Record<AnchorName, Anchor>>;
  // How a helmet sits on this head, relative to the headTop anchor:
  // `scale` widens it for a wide head, `dy` moves it down (+) or up (-).
  // Upright ears always tuck inside a helmet. `tuckEars` does the same for
  // small folded ears that would otherwise stick out of its sides (the Pug).
  // Leave it all out for a head the size of the Maltese's.
  helmetFit?: { scale?: number; dy?: number; tuckEars?: boolean };
}

// Build the per-state anchor table from one base set plus optional per-state
// adjustments. Most breeds need no adjustments because anchors move with
// their parts.
export function anchorTable(
  base: Record<AnchorName, Anchor>,
  overrides: Partial<Record<NovaState, Partial<Record<AnchorName, Partial<Anchor>>>>> = {},
): Record<NovaState, Record<AnchorName, Anchor>> {
  const out = {} as Record<NovaState, Record<AnchorName, Anchor>>;
  for (const state of STATES) {
    const row = {} as Record<AnchorName, Anchor>;
    for (const name of ANCHOR_NAMES) {
      // Asleep, a held staff or wand leans away from her face instead of
      // standing straight up across it.
      const lean = state === 'sleeping' && name === 'frontPaw' ? { rotation: 14 } : {};
      row[name] = { ...base[name], ...lean, ...(overrides[state]?.[name] ?? {}) };
    }
    out[state] = row;
  }
  return out;
}

export const anchor = (x: number, y: number, scale = 1, rotation = 0): Anchor => ({ x, y, rotation, scale });
