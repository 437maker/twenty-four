// itemArt.ts — the drawing for every wearable shop item. Each item is drawn
// ONCE, here, around the point (0, 0), at the size that fits the Maltese.
// A breed never redraws an item: it only says where each anchor is and how
// big items should be there (breeds/*.ts).
//
// Where (0, 0) is, per slot:
//   outfit  the middle of the chest. Outfits are drawn as a big sheet of
//           fabric and then clipped to the breed's body shape, so they fit
//           every body exactly. x runs about -54..54, y about -32 (neck)..38 (floor).
//   back    the upper back. Drawn behind the body (capes, cloaks, wings).
//           `front` is an optional clasp drawn at the neck, in front.
//   neck    the throat, just under the chin. Things hang downward (+y).
//   head    the top of the head. Things rise upward (-y).
//   face    the point between the eyes. The eyes are 20 units to each side.
//   held    the right front paw. Things rise up and to the right.
//   aura    the middle of the dog. Drawn behind everything.
//
// Style rules: flat color, one shade tone as the edge, readable at 64px.
// Higher tiers get a little more (a glow, a few sparkles).

import { circle, ellipse, line, path, sparkle } from '../shapes';
import { GOLD, GOLD_D, INK, WHITE, cape, collarBand, cord, garment, pair } from './artKit';
import type { ItemArt } from './artKit';
import { HERO_ART } from './heroArt';
import { SPORTS_ART } from './sportsArt';

export type { ItemArt, ItemExtra } from './artKit';

export const ITEM_ART: Record<string, ItemArt> = {
  // ═══ OUTFITS ═════════════════════════════════════════════════════════════════

  // Tier 1 — a warm knit sweater: red with cream stripes and a ribbed hem.
  outfit_cozy_sweater: {
    clip: true,
    shapes: [
      ...garment('#D9534F', '#B8423F', 26),
      path('M -90 17 L 90 17 L 90 26 L -90 26 Z', { fill: '#B8423F' }),
      line('M -90 -4 L 90 -4', '#FFE9C7', 5),
      line('M -90 6 L 90 6', '#FFE9C7', 2.4),
      collarBand('#B8423F', '#8F2F2D'),
    ],
  },

  // Tier 1 — a bright yellow raincoat with a zip, toggles, and pocket flaps.
  outfit_raincoat: {
    clip: true,
    shapes: [
      ...garment('#F5C518', '#D4A60F', 30),
      line('M 0 -14 L 0 30', '#D4A60F', 2.6),
      circle(0, -1, 3, { fill: '#7A5C12' }),
      circle(0, 13, 3, { fill: '#7A5C12' }),
      ...pair([path('M -42 8 L -22 8 L -22 14 Q -32 19 -42 14 Z', { fill: '#E3B50F', stroke: '#D4A60F', sw: 1.4 })]),
      collarBand('#E3B50F', '#D4A60F'),
    ],
  },

  // Tier 1 — an open teal vest with little flowers. The chest fur shows.
  outfit_beach_vest: {
    clip: true,
    shapes: [
      ...pair([
        path('M -90 -60 L -12 -60 Q -22 0 -10 28 L -90 28 Z', { fill: '#2BB5A0' }),
        line('M -12 -40 Q -22 0 -10 28', '#1F8F7E', 2.6),
        line('M -90 28 L -10 28', '#1F8F7E', 3),
      ]),
      circle(-34, 0, 4.4, { fill: '#FF8FB1' }), circle(-34, 0, 1.7, { fill: GOLD }),
      circle(-28, 16, 3.6, { fill: '#FFE08A' }), circle(-28, 16, 1.4, { fill: '#F2622E' }),
      circle(34, -4, 3.6, { fill: '#FFE08A' }), circle(34, -4, 1.4, { fill: '#F2622E' }),
      circle(30, 14, 4.4, { fill: '#FF8FB1' }), circle(30, 14, 1.7, { fill: GOLD }),
    ],
  },

  // Tier 2 — a white space suit with a control panel and a metal collar ring.
  outfit_space_suit: {
    clip: true,
    shapes: [
      ...garment('#E8EDF2', '#B9C4CF', 31),
      path('M -90 21 L 90 21 L 90 27 L -90 27 Z', { fill: '#B9C4CF' }),
      path('M -16 -8 L 16 -8 Q 19 -8 19 -5 L 19 9 Q 19 12 16 12 L -16 12 Q -19 12 -19 9 L -19 -5 Q -19 -8 -16 -8 Z', { fill: '#3B6FD4', stroke: '#2A4F9C', sw: 1.6 }),
      circle(-9, 2, 3, { fill: '#EF4444' }),
      circle(0, 2, 3, { fill: GOLD }),
      circle(9, 2, 3, { fill: '#35C46B' }),
      ...pair([line('M -40 -6 L -40 20', '#B9C4CF', 2.4)]),
      collarBand('#B9C4CF', '#8E9BA8'),
    ],
  },

  // Tier 2 — steel plate armor with shoulder guards, rivets, and a gold crest.
  outfit_knight_armor: {
    clip: true,
    shapes: [
      ...garment('#B8C4D0', '#8A98A8', 24),
      path('M -90 17 L 90 17 L 90 24 L -90 24 Z', { fill: '#8A98A8' }),
      line('M 0 -14 L 0 17', '#8A98A8', 2.4),
      ...pair([
        ellipse(-42, -16, 17, 10, { fill: '#D5DDE5', stroke: '#8A98A8', sw: 1.8 }),
        circle(-14, 10, 2, { fill: '#8A98A8' }),
        circle(-26, -2, 2, { fill: '#8A98A8' }),
      ]),
      path('M -7 -4 L 7 -4 L 7 3 Q 0 11 -7 3 Z', { fill: GOLD, stroke: GOLD_D, sw: 1.4 }),
      collarBand('#D5DDE5', '#8A98A8'),
    ],
  },

  // Tier 2 — a red cape with a gold clasp. (Back slot.)
  outfit_superhero_cape: {
    shapes: cape('#E11D48', '#B0153A'),
    front: [cord('#E11D48', 5), circle(0, 3, 5.5, { fill: GOLD, stroke: GOLD_D, sw: 1.6 })],
  },

  // Tier 3 — a purple robe with white ermine trim and a gold hem.
  outfit_royal_robe: {
    clip: true,
    shapes: [
      ...garment('#6B2FA0', '#4E2177', 35),
      line('M -90 31 L 90 31', GOLD, 3),
      path('M -9 -60 L 9 -60 L 9 35 L -9 35 Z', { fill: WHITE }),
      circle(-3, -4, 1.7, { fill: INK }), circle(3, 5, 1.7, { fill: INK }),
      circle(-3, 14, 1.7, { fill: INK }), circle(3, 23, 1.7, { fill: INK }),
      collarBand(WHITE, '#DDD3C7'),
      circle(-18, -17, 1.6, { fill: INK }), circle(18, -17, 1.6, { fill: INK }),
    ],
  },

  // Tier 3 — a deep blue cloak scattered with stars, held by a star clasp. (Back slot.)
  outfit_wizard_cloak: {
    shapes: [
      ...cape('#2D3A8C', '#1F2866', 74),
      ...sparkle('#F6D365', -62, 18, 0.7),
      ...sparkle('#F6D365', 64, 34, 0.6),
      ...sparkle('#FDE68A', -66, 40, 0.45),
      ...sparkle('#FDE68A', 62, 6, 0.5),
    ],
    front: [cord('#2D3A8C', 5), ...sparkle('#F6D365', 0, 4, 1.15)],
  },

  // Tier 3 — dark red lacquered plates laced with gold, with shoulder guards.
  outfit_samurai_armor: {
    clip: true,
    shapes: [
      ...garment('#9B2C2C', '#6E1D1D', 28),
      line('M -90 25 L 90 25', '#E0A82E', 3),
      line('M -90 -4 L 90 -4', '#6E1D1D', 2),
      line('M -90 6 L 90 6', '#6E1D1D', 2),
      line('M -90 16 L 90 16', '#6E1D1D', 2),
      ...[-18, 0, 18].flatMap((x) => [circle(x, 1, 1.9, { fill: '#E0A82E' }), circle(x, 11, 1.9, { fill: '#E0A82E' })]),
      ...pair([path('M -58 -26 L -30 -26 L -28 -6 L -60 -3 Z', { fill: '#7A2323', stroke: '#E0A82E', sw: 1.8 })]),
      collarBand('#6E1D1D', '#E0A82E'),
    ],
  },

  // Tier 4 — green dragon scales with a golden belly.
  outfit_dragon_scale: {
    clip: true,
    shapes: [
      ...garment('#2F9E63', '#237A4B', 31),
      path('M -16 -60 L 16 -60 L 18 31 L -18 31 Z', { fill: '#F2D675' }),
      line('M -17 -2 L 17 -2', '#D9B84A', 2), line('M -17 8 L 17 8', '#D9B84A', 2), line('M -18 18 L 18 18', '#D9B84A', 2),
      ...pair([
        line('M -50 0 Q -42 8 -34 0 Q -26 8 -18 0', '#237A4B', 2.2),
        line('M -54 12 Q -46 20 -38 12 Q -30 20 -22 12', '#237A4B', 2.2),
        line('M -54 24 Q -46 32 -38 24 Q -30 32 -22 24', '#237A4B', 2.2),
      ]),
      collarBand('#237A4B', '#1A5C38'),
      ...sparkle('#FDE68A', -40, -10, 0.4),
      ...sparkle('#FDE68A', 42, -8, 0.4),
    ],
  },

  // Tier 4 — a fiery coat that ends in a hem of flames.
  outfit_phoenix_coat: {
    clip: true,
    shapes: [
      path('M -90 12 L -64 34 L -50 16 L -36 36 L -24 16 L -12 34 L 0 16 L 12 34 L 24 16 L 36 36 L 50 16 L 64 34 L 90 12 Z', { fill: GOLD }),
      path('M -90 -60 L 90 -60 L 90 14 L 64 24 L 50 10 L 36 26 L 24 10 L 12 24 L 0 10 L -12 24 L -24 10 L -36 26 L -50 10 L -64 24 L -90 14 Z', { fill: '#F2622E' }),
      path('M 0 -8 Q 8 0 4.5 8 Q 0 13 -4.5 8 Q -8 0 0 -8 Z', { fill: '#FFE08A', stroke: GOLD, sw: 1.4 }),
      collarBand(GOLD, GOLD_D),
      ...sparkle('#FFE08A', -38, -4, 0.45),
      ...sparkle('#FFE08A', 40, 0, 0.4),
    ],
  },

  // Tier 4 — deep-space indigo with a nebula across the chest and stars.
  outfit_galaxy_suit: {
    clip: true,
    shapes: [
      ...garment('#2B2A6B', '#1C1B4A', 31),
      line('M -90 28 L 90 28', '#22D3EE', 2.6),
      path('M -46 6 C -30 -10 -6 4 8 -4 C 26 -14 44 -2 50 10 C 30 6 14 18 -4 14 C -20 10 -34 22 -46 6 Z', { fill: '#8B5CF6', op: 0.8 }),
      path('M -20 15 C -8 7 6 17 22 11 C 14 21 -6 25 -20 15 Z', { fill: '#EC4899', op: 0.7 }),
      circle(-34, -8, 1.6, { fill: WHITE }), circle(30, 20, 1.5, { fill: WHITE }), circle(-14, 22, 1.3, { fill: WHITE }),
      circle(40, -10, 1.3, { fill: WHITE }), circle(-44, 16, 1.2, { fill: WHITE }),
      ...sparkle(WHITE, 26, -6, 0.5),
      ...sparkle(WHITE, -30, 4, 0.35),
      collarBand('#22D3EE', '#0EA5C4'),
    ],
  },

  // Tier 5 — a golden glow all around her. (Aura slot.)
  outfit_legendary_aura: {
    fx: 'pulse',
    shapes: [
      ellipse(0, 0, 97, 93, { fill: '#F6D365', op: 0.24 }),
      ellipse(0, 0, 80, 77, { fill: '#FFE9A8', op: 0.32 }),
      ...sparkle(GOLD, -86, -40, 0.9), ...sparkle(GOLD, 88, -22, 0.7),
      ...sparkle('#FDE68A', -72, 58, 0.6), ...sparkle(GOLD, 76, 54, 0.8),
      ...sparkle('#FDE68A', 4, -92, 0.8), ...sparkle(GOLD, -44, -82, 0.5), ...sparkle('#FDE68A', 50, -78, 0.55),
    ],
  },

  // Tier 5 — cream vestments with gold bands and a sun on the chest.
  outfit_divine_vest: {
    clip: true,
    shapes: [
      ...garment('#FFF6DC', '#E8D9A8', 31),
      line('M -90 28 L 90 28', '#E0A82E', 3),
      ...pair([path('M -25 -60 L -14 -60 L -12 31 L -23 31 Z', { fill: '#E0A82E' })]),
      ...[0, 45, 90, 135].flatMap((deg) => {
        const a = (deg * Math.PI) / 180;
        const x = Math.round(Math.cos(a) * 11 * 10) / 10;
        const y = Math.round(Math.sin(a) * 11 * 10) / 10;
        return [line(`M ${-x} ${5 - y} L ${x} ${5 + y}`, GOLD, 2)];
      }),
      circle(0, 5, 6, { fill: GOLD, stroke: GOLD_D, sw: 1.4 }),
      collarBand('#E0A82E', GOLD_D),
      ...sparkle(WHITE, -40, 12, 0.5),
      ...sparkle(WHITE, 40, 16, 0.45),
    ],
  },

  // Tier 5 — a two-layer mantle, teal over violet, with a gem clasp. (Back slot.)
  outfit_mythic_mantle: {
    shapes: [
      ...cape('#0F766E', '#0B524C', 82),
      path('M -30 -24 C -60 -26 -72 0 -72 26 Q -60 20 -52 28 L 52 28 Q 60 20 72 26 C 72 0 60 -26 30 -24 Z', { fill: '#7C3AED', stroke: '#5B21B6', sw: 2.2 }),
      ...sparkle('#FDE68A', -76, 40, 0.6),
      ...sparkle('#FDE68A', 78, 38, 0.55),
      ...sparkle('#F5D0FE', -62, 12, 0.4),
      ...sparkle('#F5D0FE', 64, 10, 0.4),
    ],
    front: [
      cord(GOLD, 4),
      path('M 0 -3 L 7 5 L 0 14 L -7 5 Z', { fill: '#22D3EE', stroke: '#0EA5C4', sw: 1.6 }),
      line('M -3 4 L 0 0', WHITE, 1.4, 0.8),
    ],
  },

  // ═══ ACCESSORIES ═════════════════════════════════════════════════════════════

  // Tier 1 — a red bow tie under the chin.
  acc_bow_tie: {
    shapes: [
      ...pair([path('M -1 6 L -16 -2 Q -19 6 -16 14 Z', { fill: '#E11D48', stroke: '#B0153A', sw: 1.2 })]),
      circle(0, 6, 4.4, { fill: '#E11D48', stroke: '#B0153A', sw: 1.2 }),
    ],
  },

  // Tier 1 — dark sunglasses with a little shine.
  acc_sunglasses: {
    shapes: [
      ...pair([line('M -34 -5 L -47 -8', '#111827', 2.6)]),
      ...pair([
        path('M -33 -8 L -9 -8 Q -6 -8 -6 -4 L -7 4 Q -9 11 -17 11 L -24 11 Q -32 11 -34 3 L -35 -5 Q -35 -8 -33 -8 Z', { fill: '#1F2937', stroke: '#111827', sw: 1.6 }),
      ]),
      line('M -6 -5 Q 0 -8 6 -5', '#111827', 2.8),
      line('M -30 -3 L -24 -3', WHITE, 2, 0.75),
      line('M 10 -3 L 16 -3', WHITE, 2, 0.75),
    ],
  },

  // Tier 1 — a striped party hat with a pom-pom.
  acc_party_hat: {
    coversKnot: true,
    shapes: [
      // Kept short enough that the pom-pom stays inside the drawing box.
      path('M -20 0 L 3 -36 L 22 0 Q 1 6 -20 0 Z', { fill: GOLD, stroke: GOLD_D, sw: 2 }),
      path('M -12 -13 Q 0 -9 15.5 -13.5 L 12 -20.5 Q 1 -17 -7.5 -20.5 Z', { fill: '#3C3489' }),
      circle(3, -34.5, 5.5, { fill: '#F28C9B', stroke: '#D96C80', sw: 1.6 }),
    ],
  },

  // Tier 2 — a gold collar with a tag.
  acc_golden_collar: {
    shapes: [
      path('M -32 -6 Q 0 10 32 -6 L 34 1 Q 0 18 -34 1 Z', { fill: '#E0A82E', stroke: '#B9861C', sw: 1.8 }),
      circle(0, 13, 5.2, { fill: '#E0A82E', stroke: '#B9861C', sw: 1.8 }),
    ],
  },

  // Tier 2 — a clear blue crystal on a silver cord.
  acc_crystal_pendant: {
    shapes: [
      cord('#9AA7B5', 2.2),
      path('M 0 3 L 7 10 L 0 25 L -7 10 Z', { fill: '#67E8F9', stroke: '#0EA5C4', sw: 1.6 }),
      line('M -7 10 L 7 10', '#0EA5C4', 1.2),
      line('M -2.5 8.5 L 0 5.5', WHITE, 1.4, 0.9),
    ],
  },

  // Tier 2 — a band of leaves with five flowers.
  acc_flower_crown: {
    shapes: [
      line('M -31 7 Q 0 -9 31 7', '#3F9B5F', 4.2),
      ...[[-27, 4, '#FF8FB1'], [-14, -3, '#FFE08A'], [0, -6, '#FFFFFF'], [14, -3, '#FFE08A'], [27, 4, '#FF8FB1']].flatMap(
        ([x, y, color]) => [
          circle(x as number, y as number, 5.4, { fill: color as string, stroke: '#E7A9B9', sw: 1 }),
          circle(x as number, y as number, 2, { fill: '#F2A20C' }),
        ],
      ),
    ],
  },

  // Tier 3 — a wand with a star on the end and a trail of sparkles.
  acc_magic_wand: {
    shapes: [
      line('M 5 -2 L 24 -52', INK, 4.2),
      line('M 24 -52 L 26.5 -58.5', WHITE, 4.2),
      ...sparkle('#F6D365', 28, -63, 1.6),
      ...sparkle(WHITE, 41, -50, 0.4),
      ...sparkle('#F6D365', 15, -72, 0.35),
    ],
  },

  // Tier 3 — a red charm with a golden dragon's eye, on a red cord.
  acc_dragon_charm: {
    shapes: [
      cord('#B91C1C', 2.6),
      circle(0, 14, 8.4, { fill: '#B91C1C', stroke: '#7F1D1D', sw: 1.8 }),
      ellipse(0, 14, 4.8, 3.2, { fill: GOLD }),
      ellipse(0, 14, 1.3, 3.2, { fill: INK }),
      ...sparkle('#FDE68A', 10, 4, 0.32),
    ],
  },

  // Tier 3 — a gold crown with jewels and a star at each point.
  acc_astral_crown: {
    coversKnot: true,
    shapes: [
      path('M -20 3 L -23 -16 L -11 -7 L 0 -22 L 11 -7 L 23 -16 L 20 3 Q 0 -2 -20 3 Z', { fill: GOLD, stroke: GOLD_D, sw: 2 }),
      circle(0, -5, 3.2, { fill: '#7C3AED', stroke: '#5B21B6', sw: 1 }),
      circle(-12, -1.5, 2.1, { fill: '#22D3EE' }),
      circle(12, -1.5, 2.1, { fill: '#22D3EE' }),
      ...sparkle(WHITE, 0, -25, 0.5),
      ...sparkle(WHITE, -23, -19, 0.32),
      ...sparkle(WHITE, 23, -19, 0.32),
    ],
  },

  // Tier 4 — a glowing ring that floats above her head.
  acc_cosmic_halo: {
    fx: 'bob',
    shapes: [
      ellipse(0, -27, 26, 10, { fill: '#FDE68A', op: 0.28 }),
      ellipse(0, -27, 20, 6.5, { stroke: '#F6C343', sw: 4.6 }),
      ellipse(0, -27, 20, 6.5, { stroke: '#FFF7D6', sw: 1.6, op: 0.9 }),
      ...sparkle('#FFF7D6', -25, -34, 0.35),
      ...sparkle('#FFF7D6', 26, -20, 0.3),
    ],
  },

  // Tier 4 — white feathered wings spread behind her. (Back slot.)
  acc_celestial_wings: {
    shapes: [
      ...pair([
        path('M -30 2 C -54 -40 -76 -84 -98 -90 C -93 -76 -98 -64 -92 -58 C -98 -48 -94 -36 -87 -32 C -92 -22 -85 -12 -77 -12 C -79 -2 -69 6 -59 4 C -50 12 -38 10 -30 2 Z', { fill: WHITE, stroke: '#8FA6C8', sw: 2.6 }),
        line('M -44 -14 C -60 -38 -76 -60 -90 -72', '#B9C9DE', 2),
        line('M -48 -4 C -62 -18 -76 -30 -86 -36', '#B9C9DE', 2),
      ]),
      ...sparkle('#FFFFFF', -80, -96, 0.5),
      ...sparkle('#FFFFFF', 84, -98, 0.45),
    ],
  },

  // Tier 4 — a staff topped with an orb of fire, water, earth, and air.
  acc_elemental_staff: {
    shapes: [
      line('M 6 0 L 29 -76', '#8B5A2B', 5),
      path('M 32 -88 L 42 -88 Q 42 -98 32 -98 Z', { fill: '#EF4444' }),
      path('M 32 -88 L 32 -98 Q 22 -98 22 -88 Z', { fill: '#E5E7EB' }),
      path('M 32 -88 L 22 -88 Q 22 -78 32 -78 Z', { fill: '#22C55E' }),
      path('M 32 -88 L 32 -78 Q 42 -78 42 -88 Z', { fill: '#3B82F6' }),
      circle(32, -88, 10.4, { stroke: '#E0A82E', sw: 2.6 }),
      ...sparkle('#FDE68A', 47, -100, 0.4),
      ...sparkle('#FDE68A', 17, -99, 0.3),
    ],
  },

  // Tier 5 — a violet gem on a gold chain, with an infinity sign inside.
  acc_infinity_gem: {
    shapes: [
      circle(0, 14, 15, { fill: '#C084FC', op: 0.3 }),
      cord('#E0A82E', 3),
      path('M 0 4 L 9 9 L 9 19 L 0 24 L -9 19 L -9 9 Z', { fill: '#A855F7', stroke: GOLD, sw: 2 }),
      line('M -4.5 14 C -4.5 10.5 0 10.5 0 14 C 0 17.5 4.5 17.5 4.5 14 C 4.5 10.5 0 10.5 0 14 C 0 17.5 -4.5 17.5 -4.5 14', WHITE, 1.5),
      ...sparkle('#F5D0FE', 14, 3, 0.4),
      ...sparkle('#F5D0FE', -14, 23, 0.3),
    ],
  },

  // Tier 5 — an orb that floats beside her, ringed in gold.
  acc_omnipotent_orb: {
    fx: 'bob',
    shapes: [
      circle(30, -42, 21, { fill: '#93C5FD', op: 0.3 }),
      circle(30, -42, 13, { fill: '#4F46E5', stroke: '#C7D2FE', sw: 2 }),
      line('M 22 -46 Q 30 -54 38 -46', WHITE, 1.8, 0.75),
      ellipse(30, -42, 19.5, 5.5, { stroke: '#FDE68A', sw: 2.2 }),
      ...sparkle(WHITE, 47, -58, 0.4),
      ...sparkle('#FDE68A', 13, -60, 0.3),
    ],
  },

  // Tier 5 — a slowly turning circle of runes behind her. (Aura slot.)
  acc_arcane_matrix: {
    fx: 'spin',
    shapes: [
      circle(0, 0, 88, { fill: '#8B5CF6', op: 0.1 }),
      circle(0, 0, 88, { stroke: '#A78BFA', sw: 2.6, op: 0.95 }),
      circle(0, 0, 74, { stroke: '#C4B5FD', sw: 1.6, op: 0.9 }),
      path('M 0 -88 L 88 0 L 0 88 L -88 0 Z', { stroke: '#7C3AED', sw: 1.8, op: 0.7 }),
      ...[[0, -88], [62, -62], [88, 0], [62, 62], [0, 88], [-62, 62], [-88, 0], [-62, -62]].flatMap(([x, y]) =>
        sparkle('#F5D0FE', x, y, 0.62),
      ),
    ],
  },

  // The 20 items added in the houses run live in their own files.
  ...SPORTS_ART,
  ...HERO_ART,
};

export function itemArt(itemId: string): ItemArt | null {
  return ITEM_ART[itemId] ?? null;
}
