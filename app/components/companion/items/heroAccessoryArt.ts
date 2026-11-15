// heroAccessoryArt.ts — one signature accessory per hero suit (Tiers 3–5).
//
// Each accessory is designed to complement its matching suit's colors and motif.
// All are original to 24; no borrowed characters or trademark designs.
//
// Slots:  face (visor / goggles / mask)  |  head (helm / crown)
//         held (trident / shield / gauntlet)  |  neck (medallion)

import { circle, ellipse, line, path, sparkle } from '../shapes';
import { BRAND, CARE, GOLD, cord, num24, pair } from './artKit';
import type { ItemArt } from './artKit';

const WHITE = '#FFFFFF';

export const HERO_ACC_ART: Record<string, ItemArt> = {
  // ═══ TIER 3 ═════════════════════════════════════════════════════════════════

  // Spark Visor — a sleek one-band visor in Circuit Spark navy and lime.
  // Face slot: drawn around (0, 0) = the point between the eyes (±20 each side).
  acc_hero_spark_visor: {
    shapes: [
      path(
        'M -34 2 L -34 -6 Q -34 -12 -28 -12 L 28 -12 Q 34 -12 34 -6 L 34 2 Q 28 5 0 5 Q -28 5 -34 2 Z',
        { fill: '#1B2A5C', stroke: '#B6F23C', sw: 1.8 },
      ),
      line('M -26 -4 L -10 -4', '#B6F23C', 1.4, 0.8),
      line('M 10 -4 L 26 -4', '#B6F23C', 1.4, 0.8),
      line('M -6 -4 L 6 -4', '#1B2A5C', 2.2),
      circle(0, -4, 2, { fill: '#B6F23C' }),
      circle(-28, -4, 2.2, { fill: '#B6F23C' }),
      circle(28, -4, 2.2, { fill: '#B6F23C' }),
    ],
  },

  // Tide Trident — a three-pronged teal trident with water-drop tips.
  // Held slot: (0, 0) = right front paw; shaft rises diagonally.
  acc_hero_tide_trident: {
    shapes: [
      line('M 4 2 L 20 -58', '#14757A', 4.4),
      line('M 14 -50 L 26 -50', '#1E9AA0', 2.8),
      line('M 20 -58 L 20 -72', '#1E9AA0', 3.2),
      line('M 14 -55 L 11 -68', '#1E9AA0', 2.6),
      line('M 26 -55 L 29 -68', '#1E9AA0', 2.6),
      circle(20, -72, 3, { fill: '#7DE8EE', stroke: '#14757A', sw: 1 }),
      circle(11, -68, 2.4, { fill: '#7DE8EE', stroke: '#14757A', sw: 1 }),
      circle(29, -68, 2.4, { fill: '#7DE8EE', stroke: '#14757A', sw: 1 }),
    ],
  },

  // Comet Goggles — round amber flight goggles with ember sparks at the temples.
  acc_hero_comet_goggles: {
    shapes: [
      ...pair([line('M -32 -1 L -40 -1', '#7C3A02', 2.6)]),
      line('M -8 -1 L 8 -1', '#7C3A02', 2.6),
      ...pair([
        circle(-20, -1, 12, { fill: '#F97316', op: 0.9, stroke: '#7C3A02', sw: 2 }),
        circle(-20, -1, 8, { fill: '#FCD34D', op: 0.7 }),
        line('M -26 -5 L -23 -7', WHITE, 1.6, 0.8),
        ...sparkle('#FFAD28', -44, -6, 0.3),
      ]),
    ],
  },

  // Leaf Shield — a broad leaf-shaped shield with veins, in Verdant Shield green.
  acc_hero_leaf_shield: {
    shapes: [
      line('M 2 2 L 14 -34', '#2F6540', 3.6),
      path(
        'M 2 2 C 0 -14 8 -38 22 -58 C 30 -66 36 -58 32 -44 C 36 -38 36 -22 28 -12 C 22 -4 12 2 2 2 Z',
        { fill: '#3A7E50', stroke: '#2F6540', sw: 2 },
      ),
      line('M 2 2 L 22 -58', '#2F6540', 1.4, 0.8),
      line('M 14 -20 L 24 -16', '#2F6540', 1.2, 0.6),
      line('M 18 -34 L 28 -30', '#2F6540', 1.2, 0.6),
      line('M 20 -46 L 28 -44', '#2F6540', 1.2, 0.6),
      ...sparkle('#A8E6BA', 22, -60, 0.3),
    ],
  },

  // ═══ TIER 4 ═════════════════════════════════════════════════════════════════

  // Aurora Helm — an Aurora Knight helmet with a dark visor and northern-light
  // traces across the crown.
  acc_hero_aurora_helm: {
    coversKnot: true,
    shapes: [
      path(
        'M -24 2 Q -26 -20 -14 -30 Q 0 -38 14 -30 Q 26 -20 24 2 Q 12 6 0 7 Q -12 6 -24 2 Z',
        { fill: '#1E6AAA', stroke: '#1046A0', sw: 2.2 },
      ),
      path(
        'M -14 -8 Q 0 -4 14 -8 Q 14 2 0 5 Q -14 2 -14 -8 Z',
        { fill: '#1A1A3E', stroke: '#7DD3FC', sw: 1.4 },
      ),
      path('M -20 -18 Q -8 -26 8 -20', { stroke: '#3DFFD8', sw: 2.4, op: 0.8 }),
      path('M -16 -28 Q 0 -36 16 -26', { stroke: '#7CFFBB', sw: 2, op: 0.7 }),
      line('M -8 -6 L -4 -4', '#7DD3FC', 1.6, 0.8),
      ...sparkle('#A8F0D8', -16, -32, 0.35),
      ...sparkle('#7CFFBB', 16, -28, 0.3),
    ],
  },

  // Orbit Gauntlet — a Gravity Warden staff topped with an orbital core: a
  // deep-indigo orb ringed by a floating amber orbital and a small moon-dot.
  acc_hero_orbit_gauntlet: {
    fx: 'pulse',
    shapes: [
      line('M 4 2 L 16 -48', BRAND, 4.4),
      circle(18, -52, 9, { fill: '#4A3D9A', stroke: BRAND, sw: 2 }),
      circle(18, -52, 5.5, { fill: '#8B7CE0', op: 0.8 }),
      ellipse(18, -52, 18, 6, { stroke: CARE, sw: 2.2 }),
      circle(18, -46, 3.5, { fill: CARE, stroke: '#B06015', sw: 1.4 }),
      ...sparkle('#C4B5FD', 30, -62, 0.3),
      ...sparkle(CARE, 6, -62, 0.28),
    ],
  },

  // Frost Crown — an ice-spike crown with crystal gems in Frost Sentinel pale blue.
  acc_hero_frost_crown: {
    coversKnot: true,
    shapes: [
      path('M -20 2 Q 0 -2 20 2 L 18 -6 Q 0 -10 -18 -6 Z', { fill: '#D1E8F8', stroke: '#7DD3FC', sw: 1.6 }),
      path('M -3 -6 L 0 -26 L 3 -6 Z', { fill: '#E8F4FC', stroke: '#7DD3FC', sw: 1.4 }),
      path('M -13 -4 L -11 -20 L -8 -4 Z', { fill: '#D4EDFF', stroke: '#7DD3FC', sw: 1.4 }),
      path('M 8 -4 L 11 -20 L 13 -4 Z', { fill: '#D4EDFF', stroke: '#7DD3FC', sw: 1.4 }),
      circle(0, -8, 3.2, { fill: '#BAE6FD', stroke: '#7DD3FC', sw: 1.2 }),
      circle(-11, -6, 2, { fill: '#E0F2FE' }),
      circle(11, -6, 2, { fill: '#E0F2FE' }),
      ...sparkle(WHITE, 0, -28, 0.4),
      ...sparkle('#BAE6FD', -13, -22, 0.28),
      ...sparkle('#BAE6FD', 13, -22, 0.28),
    ],
  },

  // ═══ TIER 5 ═════════════════════════════════════════════════════════════════

  // Sun Medallion — a glowing gold sun disk on a cord, pulsing gently.
  // Neck slot: (0, 0) = throat; item hangs downward (+y).
  acc_hero_sun_medallion: {
    fx: 'pulse',
    shapes: [
      circle(0, 18, 18, { fill: '#FEF3C7', op: 0.3 }),
      cord(CARE, 3),
      circle(0, 18, 11, { fill: '#F59E0B', stroke: CARE, sw: 2 }),
      circle(0, 18, 7.5, { fill: '#FDE68A' }),
      // 8 sun rays
      line('M 0 7 L 0 2', CARE, 2),
      line('M 5.7 10.3 L 9.5 6.5', CARE, 2),
      line('M 11 18 L 16 18', CARE, 2),
      line('M 5.7 25.7 L 9.5 29.5', CARE, 2),
      line('M 0 29 L 0 34', CARE, 2),
      line('M -5.7 25.7 L -9.5 29.5', CARE, 2),
      line('M -11 18 L -16 18', CARE, 2),
      line('M -5.7 10.3 L -9.5 6.5', CARE, 2),
      ...sparkle('#FEF3C7', -16, 6, 0.4),
      ...sparkle('#FEF3C7', 16, 30, 0.35),
    ],
  },

  // Phase Mask — a holographic half-mask in Quantum Drift midnight teal and indigo.
  acc_hero_phase_mask: {
    fx: 'shimmer',
    shapes: [
      ...pair([
        path(
          'M -34 4 L -34 -12 Q -34 -14 -32 -14 L -6 -14 Q -4 -14 -4 -12 L -4 4 Q -4 6 -6 6 L -34 4 Z',
          { fill: '#312E81', stroke: '#818CF8', sw: 1.6 },
        ),
        ellipse(-20, -4, 12, 8, { fill: '#4F46E5', op: 0.7 }),
        line('M -34 -4 L -8 -4', '#818CF8', 1.4, 0.6),
      ]),
      path('M -4 -8 Q 0 -11 4 -8', { stroke: '#A5B4FC', sw: 2.4 }),
      circle(-28, -4, 2, { fill: '#E0E7FF', op: 0.9 }),
      circle(28, -4, 2, { fill: '#E0E7FF', op: 0.9 }),
      ...sparkle('#818CF8', -40, -14, 0.35),
      ...sparkle('#818CF8', 40, -14, 0.3),
    ],
  },

  // Clock Shield — a round shield whose face shows the four pillars and "24",
  // pulsing like a heartbeat. Titan of 24's matching piece.
  acc_hero_clock_shield: {
    fx: 'pulse',
    shapes: [
      line('M 4 2 L 8 -18', '#1A1864', 4.4),
      circle(18, -40, 24, { fill: BRAND, stroke: '#2A2466', sw: 2.6 }),
      circle(18, -40, 20, { fill: '#1A1864' }),
      circle(18, -40, 16, { stroke: GOLD, sw: 2 }),
      ...num24(18, -40, 0.78, GOLD, 2),
      // Hour markers (12, 3, 6, 9)
      line('M 18 -24 L 18 -27', GOLD, 2.4),
      line('M 18 -53 L 18 -56', GOLD, 2.4),
      line('M 2 -40 L 5 -40', GOLD, 2.4),
      line('M 31 -40 L 34 -40', GOLD, 2.4),
      ...sparkle('#C4B5FD', 36, -58, 0.4),
      ...sparkle(GOLD, 2, -58, 0.35),
    ],
  },
};
