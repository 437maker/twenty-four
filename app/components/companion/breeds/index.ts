// breeds/index.ts — the list of breeds the app can show.
//
// To add a breed: write breeds/<name>.ts exporting a BreedDef, then add it
// here. Everything else (the rig, the items, the picker, the tests) reads
// this list.

import { GERMAN_SHEPHERD } from './germanShepherd';
import { MALTESE } from './maltese';
import type { BreedDef, BreedId } from './types';

export const BREEDS: BreedDef[] = [MALTESE, GERMAN_SHEPHERD];

export const DEFAULT_BREED: BreedId = 'maltese';

export function isBreedAvailable(id: string | null | undefined): id is BreedId {
  return !!id && BREEDS.some((b) => b.id === id);
}

// Never fails: an unknown or missing id falls back to the default breed, so a
// bad value in the database cannot leave the yard empty.
export function getBreed(id: string | null | undefined): BreedDef {
  return BREEDS.find((b) => b.id === id) ?? BREEDS.find((b) => b.id === DEFAULT_BREED)!;
}

export type { BreedDef, BreedId } from './types';
