// shopCatalog.ts — Hardcoded catalogue of all purchasable shop items.
// Sprint 2: 5 tiers × 3 items per category (Outfit, Accessory, House) + Shields.
// Houses run: 10 sports items (Tier 2) and 10 hero suits (Tiers 3–5). 66 items in all:
// 29 outfits, 21 accessories, 15 houses, 1 shield.

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

  // ── Sports jerseys (Tier 2). App colors and the number 24 only: no league or team names, marks, or colors. ──
  { id: 'outfit_football_jersey',   category: 'outfit', tier: 2, name: 'Football Jersey',   description: 'Number 24, ready for kickoff — every day is game day.',        price: 55,  emoji: '🏈' },
  { id: 'outfit_baseball_jersey',   category: 'outfit', tier: 2, name: 'Baseball Jersey',   description: 'Pinstripes and patience — step up to the plate.',              price: 50,  emoji: '⚾' },
  { id: 'outfit_basketball_jersey', category: 'outfit', tier: 2, name: 'Basketball Jersey', description: 'Light, quick, and always ready to take the shot.',             price: 50,  emoji: '🏀' },
  { id: 'outfit_hockey_jersey',     category: 'outfit', tier: 2, name: 'Hockey Jersey',     description: 'Cool under pressure — built for the long season.',             price: 55,  emoji: '🏒' },

  // ── Hero suits (Tiers 3–5). Original heroes made for 24; never model one on an existing character. ──
  { id: 'outfit_hero_circuit_spark',   category: 'outfit', tier: 3, name: 'Circuit Spark',   description: 'Wired for focus — one bright idea after another.',             price: 115, emoji: '🔌' },
  { id: 'outfit_hero_tide_guardian',   category: 'outfit', tier: 3, name: 'Tide Guardian',   description: 'Steady as the tide — calm comes back every time.',             price: 110, emoji: '🌊' },
  { id: 'outfit_hero_ember_comet',     category: 'outfit', tier: 3, name: 'Ember Comet',     description: 'A streak of fire across your to-do list.',                     price: 125, emoji: '☄️' },
  { id: 'outfit_hero_verdant_shield',  category: 'outfit', tier: 3, name: 'Verdant Shield',  description: 'Protects what grows — small habits, deep roots.',              price: 120, emoji: '🍃' },
  { id: 'outfit_hero_aurora_knight',   category: 'outfit', tier: 4, name: 'Aurora Knight',   description: 'Armor lit by northern lights — brave through the long night.', price: 210, emoji: '🌈' },
  { id: 'outfit_hero_gravity_warden',  category: 'outfit', tier: 4, name: 'Gravity Warden',  description: 'Keeps everything in orbit — nothing drifts off schedule.',     price: 220, emoji: '🪐' },
  { id: 'outfit_hero_frost_sentinel',  category: 'outfit', tier: 4, name: 'Frost Sentinel',  description: 'Crystal-clear focus that never melts under pressure.',         price: 205, emoji: '❄️' },
  { id: 'outfit_hero_solar_sovereign', category: 'outfit', tier: 5, name: 'Solar Sovereign', description: 'Radiant from sunrise to sunset — the day answers to you.',     price: 440, emoji: '☀️' },
  { id: 'outfit_hero_quantum_drift',   category: 'outfit', tier: 5, name: 'Quantum Drift',   description: 'In two places at once — and on time for both.',                price: 420, emoji: '⚛️' },
  { id: 'outfit_hero_titan_24',        category: 'outfit', tier: 5, name: 'Titan of 24',     description: 'Four pillars, twenty-four hours — the hero of the whole day.', price: 450, emoji: '🕛' },

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

  // ── Sports gear (Tier 2) ──
  { id: 'acc_football_helmet',   category: 'accessory', tier: 2, name: 'Football Helmet',  description: 'Head down, eyes up — tackle the day.',                       price: 50,  emoji: '🪖' },
  { id: 'acc_hockey_helmet',     category: 'accessory', tier: 2, name: 'Hockey Helmet',    description: 'Strapped in and ready for every face-off.',                  price: 48,  emoji: '⛑️' },
  { id: 'acc_basketball',        category: 'accessory', tier: 2, name: 'Basketball',       description: 'Keep the ball rolling — one bounce at a time.',              price: 42,  emoji: '🏀' },
  { id: 'acc_baseball_bat',      category: 'accessory', tier: 2, name: 'Baseball Bat',     description: 'Swing for the fences on every goal.',                        price: 45,  emoji: '🏏' },
  { id: 'acc_football',          category: 'accessory', tier: 2, name: 'Football',         description: 'Carry it over the line — every yard counts.',                price: 44,  emoji: '🏈' },
  { id: 'acc_hockey_stick',      category: 'accessory', tier: 2, name: 'Hockey Stick',     description: 'Keep your stick on the ice and your eye on the goal.',       price: 46,  emoji: '🏒' },

  // ── Stadium houses (Tier 3). App colors only; no real team names, logos, or league marks. ──
  { id: 'house_football_stadium', category: 'house', tier: 3, name: 'Gridiron Stadium',  description: 'Purple stands, amber goalposts, and a "24" on the scoreboard.',   price: 155, emoji: '🏈' },
  { id: 'house_baseball_park',    category: 'house', tier: 3, name: 'Diamond Ballpark',  description: 'Teal stands, pennant flags, and a ball arcing over the wall.',     price: 150, emoji: '⚾' },
  { id: 'house_basketball_arena', category: 'house', tier: 3, name: 'Hoop Arena',        description: 'Hardwood floors, a sweeping spotlight, and a "24" jumbotron.',     price: 150, emoji: '🏀' },
  { id: 'house_hockey_rink',      category: 'house', tier: 3, name: 'Ice Rink Arena',    description: 'Blue stands, white ice, and a puck gliding toward the net.',       price: 155, emoji: '🏒' },

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

// Convenience: get items by category, cheapest tier first. Within a tier the
// order is the order above (the sort is stable), so newer items of a tier
// follow the older ones.
export function getCatalogByCategory(category: string): ShopItemDef[] {
  return SHOP_CATALOG.filter((item) => item.category === category).sort((a, b) => a.tier - b.tier);
}

// Convenience: get a single item by ID
export function getCatalogItem(id: string): ShopItemDef | undefined {
  return SHOP_CATALOG.find((item) => item.id === id);
}
