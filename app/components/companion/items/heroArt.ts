// heroArt.ts — ten hero suits (Tiers 3 to 5).
//
// These heroes were made up for 24. None of them is, copies, or hints at a
// character from a comic, film, or game: no borrowed names, emblems, or
// signature color-and-symbol pairings. Keep it that way when editing: if a
// change makes a suit look like a hero you already know, undo it.
//
// A suit is ONE item in the `outfit` slot. Its cape, glow, or orbiting rings
// are `extras`: more pieces of the same item, drawn on other layers
// (scene.ts). Take the suit off and they go with it.
//
// Moving parts, by tier:
//   Tier 3   one small pulse at most
//   Tier 4   one shimmer or one orbit
//   Tier 5   two moving pieces
// All of it runs off the rig's one shared effect clock and stands still
// under Reduce Motion.
//
// Where (0, 0) is: the middle of the chest for the suit and for `body`
// extras; the upper back for `back` extras. See the top of itemArt.ts.

import { circle, ellipse, line, path, sparkle } from '../shapes';
import {
  BRAND, CARE, GOLD, GOLD_D, PERSONAL, SLEEP, WHITE,
  cape, collarBand, garment, pair,
} from './artKit';
import type { ItemArt } from './artKit';

const SILVER = '#D5DDE5';
const SILVER_D = '#8A98A8';

export const HERO_ART: Record<string, ItemArt> = {
  // ═══ TIER 3 ═════════════════════════════════════════════════════════════════

  // Circuit Spark — navy, with lime circuit traces and a glowing chest plate
  // that carries a zigzag trace between two solder points.
  outfit_hero_circuit_spark: {
    clip: true,
    shapes: [
      ...garment('#1B2A5C', '#121D42', 31),
      line('M -90 27 L 90 27', '#B6F23C', 2.2),
      ...pair([
        line('M -54 2 L -40 2 L -33 9 L -33 21', '#B6F23C', 1.8),
        circle(-33, 21, 2.3, { fill: '#B6F23C' }),
        line('M -48 -12 L -37 -12 L -31 -6 L -23 -6', '#B6F23C', 1.8),
        circle(-23, -6, 2.3, { fill: '#B6F23C' }),
      ]),
      collarBand('#121D42', '#B6F23C'),
    ],
    extras: [
      {
        layer: 'body', at: { x: 0, y: 9 }, fx: 'pulse',
        shapes: [
          path('M -14 0 L -8 -9 L 8 -9 L 14 0 L 8 9 L -8 9 Z', { fill: '#121D42', stroke: '#B6F23C', sw: 1.8 }),
          line('M -9.5 0 L -6.5 0 L -4.5 -4.5 L -1.5 4.5 L 1.5 -4.5 L 4.5 4.5 L 6.5 0 L 9.5 0', '#DFFF8A', 1.9),
          circle(-9.5, 0, 1.6, { fill: '#DFFF8A' }),
          circle(9.5, 0, 1.6, { fill: '#DFFF8A' }),
        ],
      },
    ],
  },

  // Tide Guardian — teal scales over a sandy, wave-edged lower half, a wave
  // crest on the chest, and a short cape with a finned edge.
  outfit_hero_tide_guardian: {
    clip: true,
    shapes: [
      ...garment('#1E9AA0', '#14757A', 32),
      ...pair([
        line('M -54 -4 Q -47 3 -40 -4 Q -33 3 -26 -4', '#14757A', 2),
        line('M -50 6 Q -43 13 -36 6 Q -29 13 -22 6', '#14757A', 2),
      ]),
      path('M -90 17 Q -75 9 -60 17 Q -45 25 -30 17 Q -15 9 0 17 Q 15 25 30 17 Q 45 9 60 17 Q 75 25 90 17 L 90 40 L -90 40 Z', { fill: '#E9D8A6' }),
      line('M -90 17 Q -75 9 -60 17 Q -45 25 -30 17 Q -15 9 0 17 Q 15 25 30 17 Q 45 9 60 17 Q 75 25 90 17', '#FFFFFF', 1.8, 0.85),
      // Crest: a curling wave on a sand disc
      circle(0, 2, 10, { fill: '#F4E9C6', stroke: '#CDB97C', sw: 1.6 }),
      line('M -6.5 6 C -7 -2 0 -6 4.5 -2.5 C 7 0 4.5 4 1.5 2', '#14757A', 2.2),
      line('M -7 7 L 7 7', '#14757A', 1.8),
      collarBand('#E9D8A6', '#CDB97C'),
    ],
    extras: [
      {
        layer: 'back',
        shapes: [
          path('M -30 -24 C -60 -26 -75 -4 -75 22 L -68 15 L -64 29 L -56 20 L -51 32 L 51 32 L 56 20 L 64 29 L 68 15 L 75 22 C 75 -4 60 -26 30 -24 Z', { fill: '#0F6E78', stroke: '#0A4F57', sw: 2.5 }),
          ...pair([line('M -66 -2 L -67 12', '#0A4F57', 2)]),
        ],
      },
    ],
  },

  // Ember Comet — a charcoal flight suit with orange side panels, a comet on
  // the chest, and a cuff of embers above each front paw.
  outfit_hero_ember_comet: {
    clip: true,
    shapes: [
      ...garment('#3A3A44', '#26262E', 31),
      ...pair([
        path('M -90 -60 L -45 -60 L -39 31 L -90 31 Z', { fill: '#F2622E' }),
        line('M -45 -40 L -39 31', '#FFB347', 1.8),
        // Ember cuff
        path('M -29 31 L -29 22 L -25 14 L -21 21 L -16.5 10 L -12 21 L -8 14 L -4 22 L -4 31 Z', { fill: '#F2622E' }),
        path('M -24 31 L -24 24 L -21 20 L -16.5 26 L -12 20 L -9 24 L -9 31 Z', { fill: '#FFD166' }),
      ]),
      // Comet: a bright head with a tail streaming up and away
      line('M 3 3 L -12 -8', '#F2622E', 3),
      line('M 1 6 L -15 0', '#FFB347', 2.2),
      line('M 5.5 0.5 L -6 -12', '#FFB347', 1.8),
      circle(5, 5, 5.2, { fill: '#FFD166', stroke: '#F2622E', sw: 1.6 }),
      collarBand('#26262E', '#F2622E'),
    ],
  },

  // Verdant Shield — moss-green plates edged in gold, vines climbing each
  // side, and a leaf on a small gold shield.
  outfit_hero_verdant_shield: {
    clip: true,
    shapes: [
      ...garment('#5E8C3A', '#456B28', 30),
      line('M -90 27 L 90 27', GOLD, 2.6),
      // Armor plates
      line('M -90 0 Q 0 12 90 0', '#456B28', 2.2),
      line('M -90 13 Q 0 25 90 13', '#456B28', 2.2),
      ...pair([
        ellipse(-42, -16, 17, 10, { fill: '#76A84A', stroke: GOLD, sw: 1.8 }),
        // Vine and leaves
        line('M -47 25 C -40 19 -46 12 -38 8 C -31 4 -37 -2 -31 -6', '#2F4F1A', 1.8),
        ellipse(-45, 16, 3.4, 2, { fill: '#B5DE7C' }),
        ellipse(-33, 5, 3.4, 2, { fill: '#B5DE7C' }),
        ellipse(-36, 13, 2.6, 1.6, { fill: '#B5DE7C' }),
      ]),
      // Crest
      path('M -9.5 -3 L 9.5 -3 L 9.5 5 Q 9.5 13 0 18 Q -9.5 13 -9.5 5 Z', { fill: GOLD, stroke: GOLD_D, sw: 1.6 }),
      path('M 0 0 Q 6.5 5 0 14.5 Q -6.5 5 0 0 Z', { fill: '#3F7A2A' }),
      line('M 0 2.5 L 0 12', '#B5DE7C', 1.2),
      collarBand(GOLD, GOLD_D),
    ],
  },

  // ═══ TIER 4 ═════════════════════════════════════════════════════════════════

  // Aurora Knight — violet armor with a silver breastplate, and a dark cape
  // that northern lights drift across.
  outfit_hero_aurora_knight: {
    clip: true,
    shapes: [
      ...garment('#6D3FC4', '#4C2A91', 29),
      path('M -90 20 L 90 20 L 90 26 L -90 26 Z', { fill: SILVER }),
      path('M -25 -60 L 25 -60 L 27 6 Q 0 22 -27 6 Z', { fill: SILVER, stroke: SILVER_D, sw: 1.8 }),
      line('M 0 -14 L 0 13', SILVER_D, 1.8),
      ...pair([
        ellipse(-43, -15, 17, 10, { fill: '#E6ECF2', stroke: SILVER_D, sw: 1.8 }),
        circle(-34, 12, 1.9, { fill: SILVER }),
      ]),
      circle(0, 1, 6.2, { fill: '#4C2A91', stroke: '#C4B5FD', sw: 1.4 }),
      ...sparkle('#8FF7D0', 0, 1, 0.75),
      collarBand('#E6ECF2', SILVER_D),
    ],
    extras: [
      { layer: 'back', shapes: cape('#33206F', '#221452', 79) },
      {
        layer: 'back', fx: 'shimmer',
        shapes: pair([
          line('M -72 45 C -75 22 -70 2 -57 -12', '#5EF2B8', 4.4, 0.8),
          line('M -64 46 C -66 28 -62 12 -53 0', '#7CC7FF', 3.2, 0.75),
          line('M -57 46 C -58 36 -56 28 -53 20', '#F5A3E0', 2.4, 0.75),
        ]),
      },
    ],
  },

  // Gravity Warden — deep indigo crossed by faint orbit lines, with two
  // small rings circling the dark core on the chest.
  outfit_hero_gravity_warden: {
    clip: true,
    shapes: [
      ...garment('#2A2470', '#1A1650', 31),
      line('M -90 27 L 90 27', '#A99CFF', 2.2),
      ellipse(0, 7, 31, 11, { stroke: '#5A50C8', sw: 1.6 }),
      ellipse(0, 7, 47, 18, { stroke: '#4840AE', sw: 1.6 }),
      ...pair([circle(-41, -8, 1.5, { fill: '#C9C2FF' }), circle(-47, 20, 1.3, { fill: '#C9C2FF' })]),
      circle(0, 7, 7, { fill: '#0F0C2E', stroke: '#A99CFF', sw: 1.8 }),
      circle(0, 7, 2.4, { fill: '#6EE7F9' }),
      collarBand('#1A1650', '#A99CFF'),
    ],
    extras: [
      {
        layer: 'body', at: { x: 0, y: 7 }, fx: 'spin',
        shapes: [
          circle(-13, 0, 2.8, { fill: '#2A2470', stroke: '#6EE7F9', sw: 1.6 }),
          circle(13, 0, 2.8, { fill: '#2A2470', stroke: '#FDE68A', sw: 1.6 }),
        ],
      },
    ],
  },

  // Frost Sentinel — ice-blue crystal plates with white trim, and frost that
  // glints on and off.
  outfit_hero_frost_sentinel: {
    clip: true,
    shapes: [
      ...garment('#A8E1F5', '#6FB9D6', 31),
      path('M -90 23 L 90 23 L 90 31 L -90 31 Z', { fill: WHITE }),
      line('M -90 23 L 90 23', '#6FB9D6', 1.6),
      ...pair([
        path('M -53 -2 L -38 -13 L -27 3 L -40 17 Z', { fill: '#C9EEFA', stroke: '#6FB9D6', sw: 1.5 }),
        line('M -38 -13 L -40 17', '#6FB9D6', 1.2),
        path('M -27 3 L -17 12 L -27 23 L -40 17 Z', { fill: '#8FD3EC', stroke: '#6FB9D6', sw: 1.5 }),
      ]),
      // Centre crystal
      path('M 0 -13 L 15 2 L 0 22 L -15 2 Z', { fill: '#E3F7FD', stroke: '#4FA3C6', sw: 1.8 }),
      line('M -15 2 L 15 2', '#4FA3C6', 1.3),
      line('M 0 -13 L -5 2 L 0 22 L 5 2 Z', '#8FD3EC', 1.3),
      collarBand(WHITE, '#6FB9D6'),
    ],
    extras: [
      {
        layer: 'body', clip: true, fx: 'shimmer',
        shapes: [
          ...sparkle(WHITE, -40, 2, 0.6),
          ...sparkle(WHITE, 36, -6, 0.5),
          ...sparkle(WHITE, 30, 16, 0.45),
          ...sparkle(WHITE, -22, 20, 0.4),
          ...sparkle(WHITE, 5, -3, 0.5),
        ],
      },
    ],
  },

  // ═══ TIER 5 ═════════════════════════════════════════════════════════════════

  // Solar Sovereign — white and gold, a collar of sun rays that glows, and a
  // pale cape whose edge shines.
  outfit_hero_solar_sovereign: {
    clip: true,
    shapes: [
      ...garment('#FFFDF5', '#E8DDBE', 32),
      path('M -90 24 L 90 24 L 90 32 L -90 32 Z', { fill: GOLD }),
      ...pair([
        path('M -90 -60 L -47 -60 L -42 24 L -90 24 Z', { fill: GOLD }),
        line('M -47 -40 L -42 24', GOLD_D, 1.6),
      ]),
      // A small sun low on the chest
      circle(0, 15, 4.2, { fill: GOLD, stroke: GOLD_D, sw: 1.3 }),
      collarBand(GOLD, GOLD_D),
    ],
    extras: [
      {
        // The rays of the collar
        layer: 'body', at: { x: 0, y: -14 }, fx: 'pulse',
        shapes: [
          path('M -4.8 6 L 0 21 L 4.8 6 Z', { fill: GOLD, stroke: GOLD_D, sw: 1.1 }),
          ...pair([
            path('M -20 2.5 L -22.5 17 L -11.5 5 Z', { fill: GOLD, stroke: GOLD_D, sw: 1.1 }),
            path('M -32 -2 L -39.5 10 L -24.5 1 Z', { fill: GOLD, stroke: GOLD_D, sw: 1.1 }),
          ]),
        ],
      },
      { layer: 'back', shapes: cape('#FFF3CC', GOLD_D, 80) },
      {
        // The shine along the cape's edge
        layer: 'back', fx: 'shimmer',
        shapes: pair([
          line('M -79 48 C -81 6 -64 -22 -34 -23', '#FFE38A', 5.5, 0.9),
          line('M -79 48 C -81 6 -64 -22 -34 -23', WHITE, 2, 0.9),
        ]),
      },
    ],
  },

  // Quantum Drift — midnight teal with a sheen that slides between violet,
  // cyan and pink, and a doubled outline as if she were in two places at once.
  outfit_hero_quantum_drift: {
    clip: true,
    shapes: [
      ...garment('#0E3B43', '#08262C', 31),
      line('M -90 27 L 90 27', '#5EEAD4', 2.2),
      ...pair([
        line('M -52 18 L -34 0', '#1F6B76', 2),
        line('M -46 -6 L -36 -16', '#1F6B76', 2),
      ]),
      // Two diamonds, slightly out of step
      path('M -2.5 -5 L 6.5 6 L -2.5 17 L -11.5 6 Z', { stroke: '#F0ABFC', sw: 1.8 }),
      path('M 2.5 -5 L 11.5 6 L 2.5 17 L -6.5 6 Z', { stroke: '#5EEAD4', sw: 1.8 }),
      collarBand('#08262C', '#5EEAD4'),
    ],
    extras: [
      {
        // The sheen
        layer: 'body', clip: true, fx: 'shimmer',
        shapes: [
          path('M -90 14 L -38 -60 L -18 -60 L -90 40 Z', { fill: '#A78BFA', op: 0.42 }),
          path('M -34 40 L 38 -60 L 54 -60 L -12 40 Z', { fill: '#5EEAD4', op: 0.34 }),
          path('M 36 40 L 90 -34 L 90 -8 L 56 40 Z', { fill: '#F0ABFC', op: 0.4 }),
        ],
      },
      {
        // The doubled edge, behind her
        layer: 'back', fx: 'shimmer',
        shapes: [
          ellipse(-9, 14, 59, 39, { fill: '#5EEAD4', op: 0.6 }),
          ellipse(9, 14, 59, 39, { fill: '#F0ABFC', op: 0.6 }),
        ],
      },
    ],
  },

  // Titan of 24 — the app's own hero. The emblem is a day cut into four, one
  // quarter per pillar (Work, Personal, Care, Sleep), with a clock hand that
  // goes round. The cape is a clock face.
  outfit_hero_titan_24: {
    clip: true,
    shapes: [
      ...garment('#26225E', '#18153F', 31),
      line('M -90 27 L 90 27', GOLD, 2.6),
      ...pair([line('M -36 -14 L -45 27', '#FFF1CF', 3)]),
      // The four pillars
      path('M 0 7 L 0 -4 Q -11 -4 -11 7 Z', { fill: BRAND }),
      path('M 0 7 L 11 7 Q 11 -4 0 -4 Z', { fill: PERSONAL }),
      path('M 0 7 L 0 18 Q 11 18 11 7 Z', { fill: CARE }),
      path('M 0 7 L -11 7 Q -11 18 0 18 Z', { fill: SLEEP }),
      circle(0, 7, 11.4, { stroke: '#FFF1CF', sw: 2.4 }),
      collarBand('#FFF1CF', '#C9A64B'),
    ],
    extras: [
      {
        // The clock hand
        layer: 'body', at: { x: 0, y: 7 }, fx: 'spin',
        shapes: [line('M 0 0 L 0 -8', WHITE, 2), circle(0, 0, 2, { fill: WHITE })],
      },
      {
        // The clock-face cape: hour marks around its rim
        layer: 'back',
        shapes: [
          ...cape('#FFF1CF', '#C9A64B', 80),
          ...pair([
            line('M -55 3 L -64 1', BRAND, 2.6),
            line('M -56 23 L -66 25', BRAND, 2.6),
            line('M -52 39 L -61 44', BRAND, 2.6),
          ]),
        ],
      },
      {
        // A soft glow behind the emblem
        layer: 'body', clip: true, at: { x: 0, y: 7 }, fx: 'pulse',
        shapes: [circle(0, 0, 16.5, { fill: '#FFF1CF', op: 0.22 })],
      },
    ],
  },
};
