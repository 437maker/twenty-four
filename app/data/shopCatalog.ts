// shopCatalog.ts — Hardcoded catalogue of all purchasable shop items.
// Sprint 2: 5 tiers × 3 items per category (Outfit, Accessory, House) + Shields.

import { ShopItemDef } from '../types';

export const SHOP_CATALOG: ShopItemDef[] = [
  // ── Outfits ──────────────────────────────────────────────────────────────────
  { id: 'outfit_cozy_sweater',   category: 'outfit', tier: 1, name: 'Cozy Sweater',       description: 'A warm knit sweater — perfect for cozy study sessions.',     price: 25,  emoji: '🧶' },
  { id: 'outfit_raincoat',       category: 'outfit', tier: 1, name: 'Raincoat',            description: 'A bright yellow raincoat for rainy day productivity.',        price: 30,  emoji: '🌧️' },
  { id: 'outfit_beach_vest',     category: 'outfit', tier: 1, name: 'Beach Vest',          description: 'Laid-back and light — a summertime favourite.',               price: 28,  emoji: '🏖️' },
  { id: 'outfit_space_suit',     category: 'outfit', tier: 2, name: 'Space Suit',          description: 'Explore the cosmos in style.',                               price: 60,  emoji: '🚀' },
  { id: 'outfit_knight_armor',   category: 'outfit', tier: 2, name: 'Knight Armor',        description: 'Brave as a knight, disciplined as a champion.',              price: 65,  emoji: '⚔️' },
  { id: 'outfit_superhero_cape', category: 'outfit', tier: 2, name: 'Superhero Cape',      description: 'Every habit hero deserves a cape.',                          price: 55,  emoji: '🦸' },
  { id: 'outfit_royal_robe',     category: 'outfit', tier: 3, name: 'Royal Robe',          description: 'Commanding and elegant — fit for royalty.',                  price: 120, emoji: '👑' },
  { id: 'outfit_wizard_cloak',   category: 'outfit', tier: 3, name: 'Wizard Cloak',        description: 'Channel mystical wisdom and deep focus.',                    price: 110, emoji: '🧙' },
  { id: 'outfit_samurai_armor',  category: 'outfit', tier: 3, name: 'Samurai Armor',       description: 'Honour, discipline, and precision — in every task.',         price: 130, emoji: '🥷' },
  { id: 'outfit_dragon_scale',   category: 'outfit', tier: 4, name: 'Dragon Scale Coat',   description: 'Legendary durability forged from dragon scales.',             price: 200, emoji: '🐉' },
  { id: 'outfit_phoenix_coat',   category: 'outfit', tier: 4, name: 'Phoenix Feather Coat',description: 'Rise from any setback — reborn and unstoppable.',            price: 220, emoji: '🦅' },
  { id: 'outfit_galaxy_suit',    category: 'outfit', tier: 4, name: 'Galaxy Suit',         description: 'The universe is your training ground.',                      price: 210, emoji: '🌌' },
  { id: 'outfit_legendary_aura', category: 'outfit', tier: 5, name: 'Legendary Aura',      description: 'An ethereal aura that radiates pure achievement.',           price: 400, emoji: '✨' },
  { id: 'outfit_divine_vest',    category: 'outfit', tier: 5, name: 'Divine Vestments',    description: 'Worn by those who have mastered the art of living.',         price: 450, emoji: '🌟' },
  { id: 'outfit_mythic_mantle',  category: 'outfit', tier: 5, name: 'Mythic Mantle',       description: 'A mantle reserved for the most legendary companions.',       price: 425, emoji: '💫' },

  // ── Accessories ───────────────────────────────────────────────────────────────
  { id: 'acc_bow_tie',           category: 'accessory', tier: 1, name: 'Bow Tie',          description: 'Sharp and dapper — a classic finishing touch.',              price: 20,  emoji: '🎀' },
  { id: 'acc_sunglasses',        category: 'accessory', tier: 1, name: 'Sunglasses',       description: 'Cool, confident, and ready to crush goals.',                 price: 22,  emoji: '😎' },
  { id: 'acc_party_hat',         category: 'accessory', tier: 1, name: 'Party Hat',        description: 'Celebrate every win, big or small.',                        price: 18,  emoji: '🎉' },
  { id: 'acc_golden_collar',     category: 'accessory', tier: 2, name: 'Golden Collar',    description: 'A symbol of hard-earned achievement.',                       price: 50,  emoji: '🏅' },
  { id: 'acc_crystal_pendant',   category: 'accessory', tier: 2, name: 'Crystal Pendant',  description: 'Clarity and focus, crystallised.',                           price: 55,  emoji: '💎' },
  { id: 'acc_flower_crown',      category: 'accessory', tier: 2, name: 'Flower Crown',     description: 'Bloom where you are planted.',                               price: 45,  emoji: '🌸' },
  { id: 'acc_magic_wand',        category: 'accessory', tier: 3, name: 'Magic Wand',       description: 'Transform your intentions into reality.',                    price: 100, emoji: '🪄' },
  { id: 'acc_dragon_charm',      category: 'accessory', tier: 3, name: 'Dragon Charm',     description: 'Ancient power, worn close to your heart.',                   price: 95,  emoji: '🔮' },
  { id: 'acc_astral_crown',      category: 'accessory', tier: 3, name: 'Astral Crown',     description: 'Rule your goals with cosmic authority.',                     price: 105, emoji: '👸' },
  { id: 'acc_cosmic_halo',       category: 'accessory', tier: 4, name: 'Cosmic Halo',      description: 'Transcend the ordinary — shine universally.',                price: 180, emoji: '😇' },
  { id: 'acc_celestial_wings',   category: 'accessory', tier: 4, name: 'Celestial Wings',  description: 'Rise above every obstacle.',                                 price: 190, emoji: '🕊️' },
  { id: 'acc_elemental_staff',   category: 'accessory', tier: 4, name: 'Elemental Staff',  description: 'Command the elements — fire, water, earth, air.',            price: 185, emoji: '⚡' },
  { id: 'acc_infinity_gem',      category: 'accessory', tier: 5, name: 'Infinity Gem',     description: 'Limitless potential, captured in a single stone.',           price: 380, emoji: '🔯' },
  { id: 'acc_omnipotent_orb',    category: 'accessory', tier: 5, name: 'Omnipotent Orb',   description: 'Wisdom beyond measure — earned by the most dedicated.',      price: 400, emoji: '🌐' },
  { id: 'acc_arcane_matrix',     category: 'accessory', tier: 5, name: 'Arcane Matrix',    description: 'The pinnacle of mystical craftsmanship.',                    price: 390, emoji: '🧿' },

  // ── House ─────────────────────────────────────────────────────────────────────
  { id: 'house_cozy_den',        category: 'house', tier: 1, name: 'Cozy Den',             description: 'A snug little home for well-deserved rest.',                 price: 30,  emoji: '🏠' },
  { id: 'house_beach_shack',     category: 'house', tier: 1, name: 'Beach Shack',          description: 'Sun, sand, and a life in balance.',                          price: 28,  emoji: '🏝️' },
  { id: 'house_forest_cabin',    category: 'house', tier: 1, name: 'Forest Cabin',         description: 'Quiet, grounded, and close to nature.',                      price: 32,  emoji: '🌲' },
  { id: 'house_treehouse',       category: 'house', tier: 2, name: 'Treehouse',            description: 'Above the noise, in the canopy of calm.',                    price: 75,  emoji: '🌳' },
  { id: 'house_mountain_lodge',  category: 'house', tier: 2, name: 'Mountain Lodge',       description: 'High altitude, high ambition.',                              price: 80,  emoji: '⛰️' },
  { id: 'house_desert_oasis',    category: 'house', tier: 2, name: 'Desert Oasis',         description: 'A serene sanctuary in the middle of chaos.',                 price: 70,  emoji: '🌵' },
  { id: 'house_cloud_castle',    category: 'house', tier: 3, name: 'Cloud Castle',         description: 'Dream big — your home floats above the rest.',               price: 150, emoji: '🏰' },
  { id: 'house_underwater_pal',  category: 'house', tier: 3, name: 'Underwater Palace',    description: 'Deep focus, deep beauty.',                                   price: 160, emoji: '🐠' },
  { id: 'house_sky_tower',       category: 'house', tier: 3, name: 'Sky Tower',            description: 'Reach for the skies — literally.',                           price: 145, emoji: '🗼' },
  { id: 'house_space_station',   category: 'house', tier: 4, name: 'Space Station',        description: 'A home among the stars for the truly out-of-this-world.',    price: 280, emoji: '🛸' },
  { id: 'house_dragons_lair',    category: 'house', tier: 4, name: "Dragon's Lair",        description: 'Majestic, fierce, and unmistakably yours.',                  price: 300, emoji: '🔥' },
  { id: 'house_time_fortress',   category: 'house', tier: 4, name: 'Time Fortress',        description: 'Master of your schedule — master of time.',                  price: 290, emoji: '⏰' },
  { id: 'house_realm_gods',      category: 'house', tier: 5, name: 'Realm of the Gods',    description: 'A home bestowed upon the most legendary achievers.',         price: 500, emoji: '⚡' },
  { id: 'house_cosmic_sanct',    category: 'house', tier: 5, name: 'Cosmic Sanctuary',     description: 'Infinite peace across infinite space.',                      price: 550, emoji: '🌠' },
  { id: 'house_dimension_x',     category: 'house', tier: 5, name: 'Dimension X',          description: 'Beyond reality — the ultimate home for ultimate achievers.', price: 525, emoji: '🌀' },

  // ── Shields (special) ─────────────────────────────────────────────────────────
  { id: 'shield',                category: 'shield', tier: 1, name: 'Streak Shield',        description: 'Protects your streak for one missed day. Stackable!',       price: 50,  emoji: '🛡️' },
];

// Convenience: get items by category
export function getCatalogByCategory(category: string): ShopItemDef[] {
  return SHOP_CATALOG.filter((item) => item.category === category);
}

// Convenience: get a single item by ID
export function getCatalogItem(id: string): ShopItemDef | undefined {
  return SHOP_CATALOG.find((item) => item.id === id);
}
