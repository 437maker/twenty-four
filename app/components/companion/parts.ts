// parts.ts — kept for older imports.
//
// The drawing used to live here as one Maltese. It now lives in
// breeds/<breed>.ts (one file per breed), items/itemArt.ts (things she wears),
// and shapes.ts (the shared shape vocabulary). This file re-exports the
// pieces older code and tests still import by their old names.

import { MALTESE } from './breeds/maltese';

export type { Shape } from './shapes';
export { HEART, ZEE, mirrorPath, sparkle } from './shapes';

// The Maltese's parts, under the old name.
export const PARTS = MALTESE.parts;
