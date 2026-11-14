// scene.ts — decides what is drawn on each layer of the dog.
//
// Input: a breed, a state, and what she is wearing.
// Output: for every rig layer, the list of things to draw there, in order.
//
// All three renderers (the animated <Companion>, the static <CompanionSvg>,
// and the SVG text for the PNG script) call this one function, so they cannot
// disagree about what goes where.
//
// Draw order, back to front (the spec's order):
//   aura → back items → tail → body → outfit → neck items → paws → head →
//   face items → ears → head-top items → held items
//
// Each layer moves with one rig part, which is how an item stays attached:
//   aura      whole dog        back, body  the body
//   held      the right paw    face        the head
//   headItem  the topknot / top of the head (which itself rides on the head)

import type { NovaState } from '../../types';
import type { BreedDef } from './breeds/types';
import { itemArt } from './items/itemArt';
import type { Equipped } from './items/itemSlots';
import { path, placeShapes } from './shapes';
import type { Anchor, Drawable, ItemFx, Shape } from './shapes';

export const PARTY_HAT_ID = 'acc_party_hat';

export interface SceneLayers {
  shadow: Drawable[];
  aura: Drawable[];
  back: Drawable[];
  tail: Drawable[];
  body: Drawable[];
  pawL: Drawable[];
  pawR: Drawable[];
  head: Drawable[];
  eyesOpen: Drawable[];
  lids: Drawable[];
  eyesHappy: Drawable[];
  mouthClosed: Drawable[];
  mouthOpen: Drawable[];
  face: Drawable[];
  earL: Drawable[];
  earR: Drawable[];
  knotTuft: Drawable[];  // hair a hat replaces
  knotBase: Drawable[];  // stays under a hat (the Maltese bow)
  headItem: Drawable[];  // the equipped head item
  partyHat: Drawable[];  // the celebration hat (only offered when no head item is worn)
  held: Drawable[];
  // Facts the renderers need:
  tuftHidden: boolean;       // an equipped head item covers the tuft for good
  celebrationHat: boolean;   // this state shows the celebration hat
}

const d = (key: string, shapes: readonly Shape[]): Drawable[] => (shapes.length ? [{ key, shapes }] : []);

// An item's shapes, moved from "around (0, 0)" to the anchor it is worn at.
function worn(key: string, shapes: readonly Shape[], at: Anchor, extra: { clip?: string; fx?: ItemFx } = {}): Drawable {
  return { key, shapes: placeShapes(shapes, at), at, ...extra };
}

// The celebration puts a party hat on her, unless she already wears something
// on her head.
export function showsCelebrationHat(state: NovaState, equipped: Equipped): boolean {
  return state === 'celebrating' && !equipped.head;
}

export function buildScene(breed: BreedDef, state: NovaState, equipped: Equipped = {}): SceneLayers {
  const P = breed.parts;
  const A = breed.anchors[state];
  const ol = { stroke: breed.palette.outline, sw: 3.2, ol: true };

  const outfit = equipped.outfit ? itemArt(equipped.outfit) : null;
  const backItem = equipped.back ? itemArt(equipped.back) : null;
  const neckItem = equipped.neck ? itemArt(equipped.neck) : null;
  const headItem = equipped.head ? itemArt(equipped.head) : null;
  const faceItem = equipped.face ? itemArt(equipped.face) : null;
  const heldItem = equipped.held ? itemArt(equipped.held) : null;
  const auraItem = equipped.aura ? itemArt(equipped.aura) : null;
  const partyHat = itemArt(PARTY_HAT_ID)!;

  // ── Body: fill, markings, fold lines, outfit, then the outline on top ──
  const body: Drawable[] = [
    { key: 'body-fill', shapes: [path(P.bodyPath, { fill: breed.palette.fur })] },
  ];
  if (P.bodyMarks.length) body.push({ key: 'body-marks', shapes: P.bodyMarks, clip: P.bodyPath });
  if (outfit) {
    body.push(worn(`outfit-${equipped.outfit}`, outfit.shapes, A.chest, { clip: outfit.clip ? P.bodyPath : undefined }));
  } else if (P.bodyDetail.length) {
    body.push({ key: 'body-detail', shapes: P.bodyDetail });
  }
  body.push({ key: 'body-outline', shapes: [path(P.bodyPath, ol)] });
  if (backItem?.front) body.push(worn(`clasp-${equipped.back}`, backItem.front, A.neck));
  if (neckItem) body.push(worn(`neck-${equipped.neck}`, neckItem.shapes, A.neck));

  // ── Head: fill, markings, outline, fold lines, then the fixed face ──
  const head: Drawable[] = [
    { key: 'head-fill', shapes: [path(P.headPath, { fill: breed.palette.fur })] },
  ];
  if (P.headMarks.length) head.push({ key: 'head-marks', shapes: P.headMarks, clip: P.headPath });
  head.push({ key: 'head-outline', shapes: [path(P.headPath, ol), ...P.headDetail, ...P.face] });

  return {
    shadow: d('shadow', P.shadow),
    aura: auraItem ? [worn(`aura-${equipped.aura}`, auraItem.shapes, A.aura, { fx: auraItem.fx })] : [],
    back: backItem ? [worn(`back-${equipped.back}`, backItem.shapes, A.back, { fx: backItem.fx })] : [],
    tail: d('tail', P.tail),
    body,
    pawL: d('pawL', P.pawL),
    pawR: d('pawR', P.pawR),
    head,
    eyesOpen: d('eyesOpen', P.eyesOpen),
    lids: d('lids', P.lids),
    eyesHappy: d('eyesHappy', P.eyesHappy),
    mouthClosed: d('mouthClosed', P.mouthClosed),
    mouthOpen: d('mouthOpen', P.mouthOpen),
    face: faceItem ? [worn(`face-${equipped.face}`, faceItem.shapes, A.eyes, { fx: faceItem.fx })] : [],
    earL: d('earL', P.earL),
    earR: d('earR', P.earR),
    knotTuft: d('knotTuft', P.knotTuft),
    knotBase: d('knotBase', P.knotBase),
    headItem: headItem ? [worn(`head-${equipped.head}`, headItem.shapes, A.headTop, { fx: headItem.fx })] : [],
    partyHat: headItem ? [] : [worn('celebration-hat', partyHat.shapes, A.headTop)],
    held: heldItem ? [worn(`held-${equipped.held}`, heldItem.shapes, A.frontPaw, { fx: heldItem.fx })] : [],
    tuftHidden: !!headItem?.coversKnot,
    celebrationHat: showsCelebrationHat(state, equipped),
  };
}

// A stable string for "this exact look", for memoizing.
export function sceneKey(breedId: string, state: NovaState, equipped: Equipped): string {
  return `${breedId}|${state}|${JSON.stringify(equipped)}`;
}

