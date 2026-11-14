// chestLoot.ts — what is inside a chest. Pure data and pure functions.
//
// A chest always gives some treats (the 🦴 currency) and has a chance of one
// item. There are three tiers. Chests are earned (the weekly box is a chest)
// or bought with treats in the Shop. No real money is involved anywhere, and
// the odds below are the odds the Shop shows on each chest card.
//
// Rules:
//   • Items only drop at or below the chest's tier:
//       Wooden  tiers 1–2      Silver  tiers 1–3      Gold  tiers 2–5 (tier 5 is rare)
//   • Outfits and accessories can drop from any chest. Houses can drop from
//     Silver and Gold chests. A Streak Shield can drop from any chest.
//   • A duplicate (an item already owned) turns into treats worth half its
//     shop price.
//   • Pity: after PITY_LIMIT chests in a row with no item, the next chest
//     always has one.
//
// Nothing here touches the database or Math.random. rollChest() takes the
// random source as an argument, so a test can pass a seeded one and get the
// same chest every time.

import { SHOP_CATALOG, getCatalogItem } from './shopCatalog';
import type { ShopItemDef } from '../types';

export const CHEST_TIERS = ['wooden', 'silver', 'gold'] as const;
export type ChestTier = (typeof CHEST_TIERS)[number];

export const SHIELD_ID = 'shield';
export const PITY_LIMIT = 4;            // after this many empty chests, the next has an item
export const DUPLICATE_REFUND = 0.5;    // share of the shop price paid out for a duplicate
export const ITEM_VALUE = 0.5;          // what an item is "worth" in treats when working out a chest's value

// One slice of a chest's item pool: either every eligible shop item of one
// tier, or the Streak Shield.
export type PoolGroup = 1 | 2 | 3 | 4 | 5 | 'shield';
export interface PoolEntry { group: PoolGroup; weight: number }

export interface ChestDef {
  tier: ChestTier;
  name: string;
  emoji: string;
  description: string;
  price: number;                 // treats, in the Shop
  bones: [number, number];       // treats inside: lowest and highest, every value equally likely
  itemChance: number;            // chance that the chest also holds an item (before pity)
  pool: PoolEntry[];             // if it holds an item: which kind. Weights add up to 1
  houses: boolean;               // can House items drop?
}

// The treats inside average exactly what the old weekly box paid
// (Basic 5, Silver 12, Gold 20), so earned income did not shrink.
export const CHESTS: Record<ChestTier, ChestDef> = {
  wooden: {
    tier: 'wooden',
    name: 'Wooden Chest',
    emoji: '📦',
    description: 'A sturdy little chest. A few treats, and now and then something to wear.',
    price: 14,
    bones: [3, 7],
    itemChance: 0.25,
    pool: [
      { group: 1, weight: 0.65 },
      { group: 2, weight: 0.30 },
      { group: 'shield', weight: 0.05 },
    ],
    houses: false,
  },
  silver: {
    tier: 'silver',
    name: 'Silver Chest',
    emoji: '🥈',
    description: 'More treats, better odds, and a chance of a house.',
    price: 34,
    bones: [9, 15],
    itemChance: 0.40,
    pool: [
      { group: 1, weight: 0.25 },
      { group: 2, weight: 0.40 },
      { group: 3, weight: 0.30 },
      { group: 'shield', weight: 0.05 },
    ],
    houses: true,
  },
  gold: {
    tier: 'gold',
    name: 'Gold Chest',
    emoji: '🥇',
    description: 'The best chest there is. Anything in the shop could be inside.',
    price: 85,
    bones: [16, 24],
    itemChance: 0.60,
    pool: [
      { group: 2, weight: 0.20 },
      { group: 3, weight: 0.40 },
      { group: 4, weight: 0.30 },
      { group: 5, weight: 0.05 },
      { group: 'shield', weight: 0.05 },
    ],
    houses: true,
  },
};

export function isChestTier(value: unknown): value is ChestTier {
  return typeof value === 'string' && (CHEST_TIERS as readonly string[]).includes(value);
}

// The weekly box became a chest: Basic → Wooden, Silver → Silver, Gold → Gold.
export function chestForBoxTier(box: 'gold' | 'silver' | 'basic'): ChestTier {
  return box === 'gold' ? 'gold' : box === 'silver' ? 'silver' : 'wooden';
}

// ─── The item pool ────────────────────────────────────────────────────────────
// Every shop item that can come out of one slice of a chest's pool.
export function poolItems(chest: ChestTier, group: PoolGroup): ShopItemDef[] {
  if (group === 'shield') {
    const shield = getCatalogItem(SHIELD_ID);
    return shield ? [shield] : [];
  }
  const def = CHESTS[chest];
  return SHOP_CATALOG.filter(
    (item) =>
      item.tier === group &&
      (item.category === 'outfit' || item.category === 'accessory' || (def.houses && item.category === 'house')),
  );
}

// The highest item tier a chest can give.
export function maxItemTier(chest: ChestTier): number {
  return Math.max(...CHESTS[chest].pool.map((p) => (p.group === 'shield' ? 0 : p.group)));
}

// ─── Opening a chest ──────────────────────────────────────────────────────────
export interface ChestItem {
  id: string;
  name: string;
  tier: number;
  category: ShopItemDef['category'];
  duplicate: boolean;   // already owned: paid out as treats instead
  refund: number;       // the treats paid for a duplicate (0 otherwise)
}

export interface ChestRoll {
  tier: ChestTier;
  bones: number;            // the treats that were in the chest
  item: ChestItem | null;
  totalBones: number;       // bones + any duplicate refund: what is added to the balance
  pityUsed: boolean;        // the item was guaranteed by the pity rule
  pityAfter: number;        // the new count of chests in a row with no item
}

export interface ChestContext {
  owned: ReadonlySet<string>;   // item ids already owned
  pity: number;                 // chests opened in a row with no item, before this one
}

// `rng` returns a number from 0 (included) to 1 (not included), like Math.random.
export function rollChest(tier: ChestTier, ctx: ChestContext, rng: () => number): ChestRoll {
  const def = CHESTS[tier];
  const [lo, hi] = def.bones;
  const bones = lo + Math.min(hi - lo, Math.floor(rng() * (hi - lo + 1)));

  const pityUsed = ctx.pity >= PITY_LIMIT;
  const hasItem = pityUsed || rng() < def.itemChance;
  if (!hasItem) {
    return { tier, bones, item: null, totalBones: bones, pityUsed: false, pityAfter: ctx.pity + 1 };
  }

  // Which slice of the pool, by weight...
  let pick = rng();
  let group: PoolGroup = def.pool[def.pool.length - 1].group;
  for (const entry of def.pool) {
    if (pick < entry.weight) {
      group = entry.group;
      break;
    }
    pick -= entry.weight;
  }
  // ...then one item from that slice, all equally likely.
  const candidates = poolItems(tier, group);
  const chosen = candidates[Math.min(candidates.length - 1, Math.floor(rng() * candidates.length))];

  // Shields stack, so a shield is never a duplicate.
  const duplicate = chosen.id !== SHIELD_ID && ctx.owned.has(chosen.id);
  const refund = duplicate ? Math.round(chosen.price * DUPLICATE_REFUND) : 0;
  return {
    tier,
    bones,
    item: { id: chosen.id, name: chosen.name, tier: chosen.tier, category: chosen.category, duplicate, refund },
    totalBones: bones + refund,
    pityUsed,
    pityAfter: 0,
  };
}

// A small seeded random source (mulberry32), for tests and simulations.
// The same seed always gives the same sequence.
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Odds and value ───────────────────────────────────────────────────────────
// The real long-run chance of an item per chest, once the pity rule is
// counted: with chance p per chest and a guarantee after PITY_LIMIT misses,
// one item arrives every (1 - (1-p)^(PITY_LIMIT+1)) / p chests on average.
export function effectiveItemChance(tier: ChestTier): number {
  const p = CHESTS[tier].itemChance;
  return p / (1 - Math.pow(1 - p, PITY_LIMIT + 1));
}

export function averageBones(tier: ChestTier): number {
  const [lo, hi] = CHESTS[tier].bones;
  return (lo + hi) / 2;
}

// The average shop price of an item, given that the chest holds one.
export function averageItemPrice(tier: ChestTier): number {
  return CHESTS[tier].pool.reduce((sum, entry) => {
    const items = poolItems(tier, entry.group);
    if (items.length === 0) return sum;
    return sum + entry.weight * (items.reduce((s, i) => s + i.price, 0) / items.length);
  }, 0);
}

// What a chest is worth in treats, with an item valued at ITEM_VALUE (half)
// of its shop price. A duplicate pays exactly that half in treats, so the
// answer does not depend on what the user already owns.
export function chestExpectedValue(tier: ChestTier): number {
  return averageBones(tier) + effectiveItemChance(tier) * averageItemPrice(tier) * ITEM_VALUE;
}

// The odds shown on a chest card, as percentages of all chests opened
// (before pity). "rare" is the chest's highest item tier.
export interface ChestOdds {
  bones: [number, number];
  itemPct: number;
  rows: { label: string; pct: number }[];
  rarePct: number;
  rareTier: number;
}

// To two decimals, so the rows add up to the item chance exactly (16.25 + 7.5 + 1.25 = 25).
const pct = (n: number) => Math.round(n * 10000) / 100;

export function chestOdds(tier: ChestTier): ChestOdds {
  const def = CHESTS[tier];
  const top = maxItemTier(tier);
  const rows = def.pool.map((entry) => ({
    label: entry.group === 'shield' ? 'Streak Shield' : `Tier ${entry.group} item`,
    pct: pct(def.itemChance * entry.weight),
  }));
  const rare = def.pool.find((e) => e.group === top);
  return {
    bones: def.bones,
    itemPct: pct(def.itemChance),
    rows,
    rarePct: rare ? pct(def.itemChance * rare.weight) : 0,
    rareTier: top,
  };
}

// One line for the chest card, e.g.
// "Item chance 60%. Tier 5 item 3%. An item is guaranteed after 4 chests without one."
export function chestOddsLine(tier: ChestTier): string {
  const o = chestOdds(tier);
  return `Item chance ${o.itemPct}%. Tier ${o.rareTier} item ${o.rarePct}%. An item is guaranteed after ${PITY_LIMIT} chests without one.`;
}
