// itemSlots.ts — which slot each wearable shop item goes in.
//
// One item per slot. Putting an item into an occupied slot replaces the item
// that was there. All 30 Outfit and Accessory items from the shop catalog are
// listed here exactly once. Houses and the Streak Shield are not wearable.
//
// Pure data: the database layer imports this to validate equips.

export const SLOTS = ['outfit', 'head', 'face', 'neck', 'back', 'held', 'aura'] as const;
export type Slot = (typeof SLOTS)[number];

// What the dog is wearing: at most one item id per slot.
export type Equipped = Partial<Record<Slot, string>>;

export const SLOT_LABELS: Record<Slot, string> = {
  outfit: 'Outfit',
  head: 'Head',
  face: 'Face',
  neck: 'Neck',
  back: 'Back',
  held: 'Held',
  aura: 'Aura',
};

export const ITEM_SLOTS: Record<string, Slot> = {
  // ── Outfits ──
  outfit_cozy_sweater: 'outfit',
  outfit_raincoat: 'outfit',
  outfit_beach_vest: 'outfit',
  outfit_space_suit: 'outfit',
  outfit_knight_armor: 'outfit',
  outfit_superhero_cape: 'back',    // a cape hangs behind her
  outfit_royal_robe: 'outfit',
  outfit_wizard_cloak: 'back',      // so does a cloak
  outfit_samurai_armor: 'outfit',
  outfit_dragon_scale: 'outfit',
  outfit_phoenix_coat: 'outfit',
  outfit_galaxy_suit: 'outfit',
  outfit_legendary_aura: 'aura',    // a glow around her, not clothing
  outfit_divine_vest: 'outfit',
  outfit_mythic_mantle: 'back',

  // ── Accessories ──
  acc_bow_tie: 'neck',
  acc_sunglasses: 'face',
  acc_party_hat: 'head',
  acc_golden_collar: 'neck',
  acc_crystal_pendant: 'neck',
  acc_flower_crown: 'head',
  acc_magic_wand: 'held',
  acc_dragon_charm: 'neck',
  acc_astral_crown: 'head',
  acc_cosmic_halo: 'head',
  acc_celestial_wings: 'back',
  acc_elemental_staff: 'held',
  acc_infinity_gem: 'neck',
  acc_omnipotent_orb: 'held',
  acc_arcane_matrix: 'aura',        // a rune circle behind her
};

export function slotForItem(itemId: string): Slot | null {
  return ITEM_SLOTS[itemId] ?? null;
}

export function isWearable(itemId: string): boolean {
  return itemId in ITEM_SLOTS;
}

// Read the JSON stored in settings.equipped_items. Anything that is not a
// known slot holding a known item for that slot is dropped, so a damaged
// value can never crash the dog.
export function parseEquipped(json: string | null | undefined): Equipped {
  if (!json) return {};
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return {};
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Equipped = {};
  for (const slot of SLOTS) {
    const id = (raw as Record<string, unknown>)[slot];
    if (typeof id === 'string' && ITEM_SLOTS[id] === slot) out[slot] = id;
  }
  return out;
}

// Put an item on (replacing whatever was in its slot). Returns a new map.
export function withItem(equipped: Equipped, itemId: string): Equipped {
  const slot = slotForItem(itemId);
  if (!slot) return equipped;
  return { ...equipped, [slot]: itemId };
}

// Take off whatever is in a slot. Returns a new map.
export function withoutSlot(equipped: Equipped, slot: Slot): Equipped {
  const out = { ...equipped };
  delete out[slot];
  return out;
}

export function isEquipped(equipped: Equipped, itemId: string): boolean {
  const slot = slotForItem(itemId);
  return !!slot && equipped[slot] === itemId;
}

// One item in every slot: the heaviest thing the rig can be asked to draw.
// Used by the Gallery's stress test and the render sheets.
export const MAX_OUTFIT: Equipped = {
  outfit: 'outfit_galaxy_suit',
  head: 'acc_astral_crown',
  face: 'acc_sunglasses',
  neck: 'acc_infinity_gem',
  back: 'acc_celestial_wings',
  held: 'acc_elemental_staff',
  aura: 'outfit_legendary_aura',
};
