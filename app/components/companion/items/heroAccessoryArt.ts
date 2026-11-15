// heroAccessoryArt.ts — one signature accessory per hero suit (Tiers 3–5).
//
// Each accessory finishes its suit's look in the suit's own colors and motif.
// All are original to 24; no borrowed characters or trademark designs.
//
// Slots:  face (visor / goggles / mask)  |  head (helm / crown)
//         held (trident / shield / gauntlet)  |  neck (medallion)
//
// The three face pieces never hide the eyes: the visor and the goggles are
// tinted glass, and the mask has open eye holes.

import { circle, ellipse, line, path, placeShapes, sparkle } from '../shapes';
import type { Shape } from '../shapes';
import { BRAND, BRAND_D, CARE, EYE_HOLES, GOLD, GOLD_D, MASKS, PERSONAL, SLEEP, burst, cord, num24, pair } from './artKit';
import type { ItemArt } from './artKit';

const WHITE = '#FFFFFF';
const SILVER = '#D5DDE5';
const SILVER_D = '#8A98A8';

const shift = (shapes: Shape[], x: number, y: number): Shape[] => placeShapes(shapes, { x, y, rotation: 0, scale: 1 });

export const HERO_ACC_ART: Record<string, ItemArt> = {
  // ═══ TIER 3 ═════════════════════════════════════════════════════════════════

  // Spark Visor — a wraparound band of lime glass in a navy frame, with an
  // emitter at each temple and a row of lights along the brow.
  // Face slot: drawn around (0, 0) = the point between the eyes (±20 each side).
  acc_hero_spark_visor: {
    shapes: [
      // The glass: see-through, so the eyes still show
      path('M -39 -11 Q 0 -16 39 -11 L 37 7 Q 22 13 7 7 Q 0 4 -7 7 Q -22 13 -37 7 Z', { fill: '#B6F23C', op: 0.4 }),
      path('M -39 -11 Q 0 -16 39 -11 L 37 7 Q 22 13 7 7 Q 0 4 -7 7 Q -22 13 -37 7 Z', { stroke: '#16224F', sw: 2.6 }),
      // Brow bar with lights
      path('M -40 -16 Q 0 -22 40 -16 L 39 -10 Q 0 -15 -39 -10 Z', { fill: '#16224F', stroke: '#0D1638', sw: 1.4 }),
      ...[-24, -12, 0, 12, 24].map((x) => circle(x, -15.5 + Math.abs(x) * 0.07, 1.5, { fill: '#DFFF8A' })),
      // A glint on each lens
      ...pair([line('M -30 -6 L -24 -8', WHITE, 2, 0.85)]),
      // Temple emitters
      ...pair([
        circle(-40, -3, 4.6, { fill: '#16224F', stroke: '#B6F23C', sw: 1.8 }),
        circle(-40, -3, 1.8, { fill: '#DFFF8A' }),
      ]),
    ],
  },

  // Tide Trident — a tall teal trident with three barbed, sea-glass tips and
  // a sand-gold collar under the head.
  // Held slot: (0, 0) = right front paw; the shaft rises almost straight up.
  acc_hero_tide_trident: {
    shapes: [
      line('M 5 3 L 19 -57', '#0F6E78', 5.4),
      line('M 6.5 -2 L 18 -52', '#5ECFD4', 1.6, 0.9),
      // The fork
      path('M 7 -63 Q 7 -53 20 -55 Q 33 -53 33 -63', { stroke: '#14757A', sw: 4.4 }),
      line('M 7 -63 L 7 -72', '#14757A', 4.4),
      line('M 33 -63 L 33 -72', '#14757A', 4.4),
      line('M 20 -55 L 20 -76', '#14757A', 4.8),
      // Barbed tips
      path('M 20 -90 L 26.5 -77 L 20 -80 L 13.5 -77 Z', { fill: '#7DE8EE', stroke: '#0F6E78', sw: 1.4 }),
      path('M 7 -83 L 12 -72 L 7 -74.5 L 2 -72 Z', { fill: '#7DE8EE', stroke: '#0F6E78', sw: 1.4 }),
      path('M 33 -83 L 38 -72 L 33 -74.5 L 28 -72 Z', { fill: '#7DE8EE', stroke: '#0F6E78', sw: 1.4 }),
      // Collar
      circle(19.6, -55.5, 5, { fill: '#F4E9C6', stroke: '#CDB97C', sw: 1.6 }),
      circle(19.6, -55.5, 1.8, { fill: '#1E9AA0' }),
    ],
  },

  // Comet Goggles — big brass flight goggles with amber glass, a leather
  // strap, and an ember spark at each temple.
  acc_hero_comet_goggles: {
    shapes: [
      ...pair([line('M -33 -2 L -47 -5', '#5A2A06', 4.2)]),
      line('M -8 -3 Q 0 -7 8 -3', '#7C3A02', 3.4),
      ...pair([
        // Amber glass: see-through, so the eyes still show
        circle(-20, 0, 12.6, { fill: '#FFB347', op: 0.42 }),
        circle(-20, 0, 13.2, { stroke: '#7C3A02', sw: 3.6 }),
        circle(-20, 0, 13.2, { stroke: GOLD, sw: 1.4 }),
        line('M -28 -5 Q -25 -9 -20 -9.5', WHITE, 2.2, 0.9),
        ...sparkle('#FF8A2A', -46, -13, 0.42),
      ]),
    ],
  },

  // Leaf Shield — a shield in the shape of a broad leaf: gold rim, a raised
  // midrib, and a gold boss.
  acc_hero_leaf_shield: {
    shapes: [
      path('M 26 -55 C 41 -50 48 -37 46 -22 C 44 -8 36 1 26 8 C 16 1 8 -8 6 -22 C 4 -37 11 -50 26 -55 Z', { fill: '#3F7A2A', stroke: GOLD, sw: 3 }),
      path('M 26 -47 C 36 -43 41 -34 40 -23 C 39 -12 33 -5 26 0 C 19 -5 13 -12 12 -23 C 11 -34 16 -43 26 -47 Z', { fill: '#5E9C3C' }),
      line('M 26 -50 L 26 3', '#B5DE7C', 2.2),
      ...[-36, -25, -14].flatMap((y) => [
        line(`M 26 ${y} L 36 ${y - 7}`, '#B5DE7C', 1.5, 0.9),
        line(`M 26 ${y} L 16 ${y - 7}`, '#B5DE7C', 1.5, 0.9),
      ]),
      circle(26, -24, 4.6, { fill: GOLD, stroke: GOLD_D, sw: 1.4 }),
      ...sparkle(WHITE, 38, -44, 0.36),
    ],
  },

  // ═══ TIER 4 ═════════════════════════════════════════════════════════════════

  // Aurora Helm — a silver knight's half-helm: a violet crest ridge, a brow
  // band with a green gem, a feathered wing at each side in northern-light
  // colors, and a plume on top.
  // Head slot: (0, 0) = the top of the head.
  acc_hero_aurora_helm: {
    coversKnot: true,
    shapes: placeShapes([
      // Wings first, so the dome overlaps their roots
      ...pair([
        path('M -24 -2 C -34 -8 -42 -17 -46 -30 C -38 -27 -33 -25 -30 -21 C -32 -28 -32 -34 -30 -39 C -24 -32 -21 -25 -20 -16 Z', { fill: '#5EF2B8', stroke: '#1F8E6C', sw: 1.6 }),
        line('M -25 -8 L -40 -27', '#1F8E6C', 1.3),
        line('M -23 -14 L -29 -34', '#7CC7FF', 1.6),
      ]),
      // Plume
      path('M -3 -27 C -8 -35 -2 -41 7 -42 C 4 -38 7 -35 11 -35 C 7 -31 5 -29 3 -27 Z', { fill: '#F5A3E0', stroke: '#B45FA0', sw: 1.5 }),
      // Dome
      path('M -27 4 C -29 -16 -17 -29 0 -29 C 17 -29 29 -16 27 4 Q 0 -3 -27 4 Z', { fill: SILVER, stroke: SILVER_D, sw: 2.2 }),
      path('M -4.5 -29 L 4.5 -29 L 5 -1 L -5 -1 Z', { fill: '#6D3FC4', stroke: '#4C2A91', sw: 1.4 }),
      line('M -19 -13 Q -15 -22 -8 -25', WHITE, 2.2, 0.85),
      // Brow band and gem
      path('M -28 4 Q 0 -4 28 4 L 27 10 Q 0 2 -27 10 Z', { fill: '#EAF0F5', stroke: SILVER_D, sw: 1.8 }),
      circle(0, 3, 4, { fill: '#8FF7D0', stroke: '#1F8E6C', sw: 1.4 }),
      ...pair([circle(-17, 4.5, 1.6, { fill: '#6D3FC4' })]),
    ], { x: 0, y: 7, rotation: 0, scale: 1.14 }),
  },

  // Orbit Gauntlet — an armored indigo cuff on the paw, with a small dark
  // star floating above it inside a tilted ring, and a moon in orbit.
  acc_hero_orbit_gauntlet: {
    fx: 'pulse',
    shapes: [
      // The pull between cuff and star
      line('M 2 -19 Q 8 -25 14 -29', '#A99CFF', 1.6, 0.75),
      line('M 9 -19 Q 14 -22 18 -27', '#A99CFF', 1.6, 0.75),
      // Cuff
      path('M -10 0 L -12.5 -17 L 12.5 -17 L 10 0 Z', { fill: '#4A3D9A', stroke: '#1A1650', sw: 2.2 }),
      path('M -12.5 -17 L 12.5 -17 L 12 -12 L -12 -12 Z', { fill: '#A99CFF', stroke: '#1A1650', sw: 1.4 }),
      line('M -9.5 -5 L 9.5 -5', '#A99CFF', 1.6),
      circle(0, -9, 2.4, { fill: '#6EE7F9', stroke: '#1A1650', sw: 1 }),
      // The star and its ring
      path('M 7 -41 Q 24 -32 41 -37', { stroke: CARE, sw: 2.6 }),
      circle(24, -40, 10.5, { fill: '#15123F', stroke: '#A99CFF', sw: 2.2 }),
      circle(24, -40, 4.4, { fill: '#6EE7F9' }),
      path('M 7 -41 Q 24 -48 41 -37', { stroke: CARE, sw: 2.6 }),
      circle(41, -46, 3.2, { fill: '#FDE68A', stroke: '#1A1650', sw: 1.3 }),
      ...sparkle('#C9C2FF', 9, -54, 0.38),
    ],
  },

  // Frost Crown — five shards of ice on a band, edged in deep blue so it
  // shows on a white coat, with three blue gems.
  acc_hero_frost_crown: {
    coversKnot: true,
    shapes: [
      path('M -5.5 -6 L 0 -36 L 5.5 -6 Z', { fill: '#E8F7FD', stroke: '#2F7FB0', sw: 1.7 }),
      line('M 0 -32 L 0 -8', '#8FD3EC', 1.3),
      ...pair([
        path('M -15.5 -5 L -12 -27 L -7 -6 Z', { fill: '#CDEFFA', stroke: '#2F7FB0', sw: 1.7 }),
        path('M -24 -3 L -23 -18 L -17 -5 Z', { fill: '#E8F7FD', stroke: '#2F7FB0', sw: 1.7 }),
      ]),
      path('M -25 5 Q 0 -1 25 5 L 23 -6 Q 0 -11 -23 -6 Z', { fill: '#E3F7FD', stroke: '#2F7FB0', sw: 2 }),
      circle(0, -2.5, 3.6, { fill: '#2F7FB0', stroke: WHITE, sw: 1.2 }),
      ...pair([circle(-13, -1.5, 2.3, { fill: '#4FA3C6', stroke: WHITE, sw: 1 })]),
      ...sparkle(WHITE, 0, -39, 0.5),
      ...sparkle('#8FD3EC', -15, -31, 0.34),
      ...sparkle('#8FD3EC', 15, -31, 0.34),
    ],
  },

  // ═══ TIER 5 ═════════════════════════════════════════════════════════════════

  // Sun Medallion — a rayed gold sun with an amber heart, on a chain. It
  // hangs exactly where the Solar Sovereign's sunburst is, so worn together
  // the suit's rays fan out behind it.
  // Neck slot: (0, 0) = throat; the item hangs downward (+y).
  acc_hero_sun_medallion: {
    fx: 'pulse',
    shapes: [
      cord(GOLD_D, 3.2),
      line('M 0 1 L 0 13', GOLD_D, 2.6),
      circle(0, 26, 19, { fill: '#FFE38A', op: 0.32 }),
      path(burst(0, 26, 10.5, 16, 12, 15), { fill: '#F59E0B', stroke: '#B45309', sw: 1.4 }),
      circle(0, 26, 10.2, { fill: '#FDE68A', stroke: '#B45309', sw: 2 }),
      circle(0, 26, 5.4, { fill: '#F97316', stroke: '#B45309', sw: 1.2 }),
      circle(-1.8, 24.2, 1.6, { fill: WHITE, op: 0.9 }),
      ...sparkle(WHITE, -15, 13, 0.4),
      ...sparkle(WHITE, 15, 38, 0.34),
    ],
  },

  // Phase Mask — a hard-edged dark mask with open eye holes, and a pink and a
  // cyan copy of itself slipping out either side: in two places at once.
  acc_hero_phase_mask: {
    fx: 'shimmer',
    shapes: [
      ...shift([path(`${MASKS.angular} ${EYE_HOLES}`, { fill: '#F0ABFC', op: 0.85 })], 4, -2.5),
      ...shift([path(`${MASKS.angular} ${EYE_HOLES}`, { fill: '#5EEAD4', op: 0.85 })], -4, 2.5),
      path(`${MASKS.angular} ${EYE_HOLES}`, { fill: '#0B2F36' }),
      path(MASKS.angular, { stroke: WHITE, sw: 1.6 }),
      line('M -30 -11.5 L -10 -11.5', '#5EEAD4', 1.8),
      line('M 10 -11.5 L 30 -11.5', '#F0ABFC', 1.8),
      path('M 0 -6 L 2.6 -2 L 0 2 L -2.6 -2 Z', { fill: WHITE }),
    ],
  },

  // Clock Shield — a round shield whose face is the day in four pillars with
  // "24" across it and gold hour marks round the rim. Titan of 24's piece.
  acc_hero_clock_shield: {
    fx: 'pulse',
    shapes: [
      circle(31, -29, 22.5, { fill: GOLD, stroke: GOLD_D, sw: 2.2 }),
      circle(31, -29, 18.6, { fill: BRAND, stroke: BRAND_D, sw: 1.6 }),
      // The four pillars, faint, behind the number
      path('M 31 -29 L 31 -44 Q 16 -44 16 -29 Z', { fill: '#5A4DB8' }),
      path('M 31 -29 L 46 -29 Q 46 -44 31 -44 Z', { fill: PERSONAL, op: 0.75 }),
      path('M 31 -29 L 31 -14 Q 46 -14 46 -29 Z', { fill: CARE, op: 0.8 }),
      path('M 31 -29 L 16 -29 Q 16 -14 31 -14 Z', { fill: SLEEP, op: 0.85 }),
      circle(31, -29, 15.2, { stroke: '#FFF1CF', sw: 1.6 }),
      ...num24(31, -29, 0.86, '#18153F', 4.6),
      ...num24(31, -29, 0.86, WHITE, 2.4),
      // Hour marks at 12, 3, 6, 9
      line('M 31 -50 L 31 -46.5', '#18153F', 2.4),
      line('M 31 -11.5 L 31 -8', '#18153F', 2.4),
      line('M 10 -29 L 13.5 -29', '#18153F', 2.4),
      line('M 48.5 -29 L 52 -29', '#18153F', 2.4),
      ...sparkle(WHITE, 46, -45, 0.4),
    ],
  },
};
