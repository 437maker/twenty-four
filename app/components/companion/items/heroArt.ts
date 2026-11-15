// heroArt.ts — ten hero suits (Tiers 3 to 5).
//
// These heroes were made up for 24. None of them is, copies, or hints at a
// character from a comic, film, or game: no borrowed names, emblems, or
// signature color-and-symbol pairings. Keep it that way when editing: if a
// change makes a suit look like a hero you already know, undo it.
//
// What makes a suit read as a hero from across the room:
//   • two or three strong blocks of color, not a pattern on a shirt
//   • a chest emblem as large as the chest allows, on its own plate
//   • shoulder pieces that change the silhouette
//   • a cape with its own hem (stepped, finned, flame, leaf, icicle...)
//   • a mask with open eye holes, on the suits whose matching accessory is
//     not already worn on the face
//
// A suit is ONE item in the `outfit` slot. Its cape, mask, glow, or orbiting
// rings are `extras`: more pieces of the same item, drawn on other layers
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
// extras; the upper back for `back` extras; the point between the eyes for
// `face` extras. See the top of itemArt.ts.

import { circle, ellipse, line, path, placeShapes, sparkle } from '../shapes';
import type { Shape } from '../shapes';
import {
  BRAND, BRAND_D, CARE, GOLD, GOLD_D, MASKS, PERSONAL, SLEEP, WHITE,
  burst, collarBand, garment, heroCape, heroMask, pair,
} from './artKit';
import type { ItemArt } from './artKit';

const SILVER = '#D5DDE5';
const SILVER_D = '#8A98A8';

const shift = (shapes: Shape[], x: number, y: number): Shape[] => placeShapes(shapes, { x, y, rotation: 0, scale: 1 });

export const HERO_ART: Record<string, ItemArt> = {
  // ═══ TIER 3 ═════════════════════════════════════════════════════════════════

  // Circuit Spark — navy with lime side panels and circuit traces, angular
  // shoulder plates, a hexagon chest plate carrying a pulse trace, and a
  // short cape whose hem is cut in pixel steps.
  outfit_hero_circuit_spark: {
    clip: true,
    shapes: [
      ...garment('#16224F', '#0D1638', 31),
      ...pair([
        // Lime side panel
        path('M -90 -60 L -52 -60 L -45 -8 L -53 31 L -90 31 Z', { fill: '#B6F23C' }),
        line('M -52 -40 L -45 -8 L -53 31', '#0D1638', 2),
        // Traces ending in solder points
        line('M -42 19 L -34 19 L -28 13 L -21 13', '#B6F23C', 1.9),
        circle(-21, 13, 2.4, { fill: '#DFFF8A' }),
        line('M -41 -4 L -32 -4 L -27 1', '#B6F23C', 1.9),
        circle(-27, 1, 2.4, { fill: '#DFFF8A' }),
        // Shoulder plate
        path('M -60 -9 L -57 -25 L -33 -27 L -27 -13 L -40 -4 Z', { fill: '#263C8C', stroke: '#B6F23C', sw: 1.9 }),
        line('M -52 -17 L -38 -19', '#DFFF8A', 1.8),
        circle(-34, -13, 1.8, { fill: '#DFFF8A' }),
      ]),
      // Belt
      path('M -90 22 L 90 22 L 90 28.5 L -90 28.5 Z', { fill: '#0D1638' }),
      line('M -90 22 L 90 22', '#B6F23C', 1.8),
      collarBand('#0D1638', '#B6F23C'),
    ],
    extras: [
      {
        layer: 'body', at: { x: 0, y: 6 }, fx: 'pulse',
        shapes: [
          path('M -14.5 0 L -7.5 -12.5 L 7.5 -12.5 L 14.5 0 L 7.5 12.5 L -7.5 12.5 Z', { fill: '#0D1638', stroke: '#B6F23C', sw: 2.4 }),
          path('M -10 0 L -5 -8.5 L 5 -8.5 L 10 0 L 5 8.5 L -5 8.5 Z', { fill: '#1C3A2A' }),
          line('M -10.5 0 L -7 0 L -4.5 -6.5 L -1.5 6.5 L 1.5 -6.5 L 4.5 4.5 L 7 0 L 10.5 0', '#DFFF8A', 2.2),
          circle(-10.5, 0, 1.8, { fill: '#DFFF8A' }),
          circle(10.5, 0, 1.8, { fill: '#DFFF8A' }),
        ],
      },
      {
        layer: 'back',
        shapes: [
          ...heroCape('#16224F', '#B6F23C', '#0D1638', { spread: 74, drop: 46, hem: 'steps' }),
          ...pair([circle(-64, 30, 2.2, { fill: '#DFFF8A' }), line('M -64 30 L -64 20 L -58 14', '#B6F23C', 1.8)]),
        ],
      },
    ],
  },

  // Tide Guardian — teal scale mail over a sandy wave-edged lower half, shell
  // shoulder guards, a wave crest on a sand disc, a finned cape, and a teal
  // mask rimmed in sand.
  outfit_hero_tide_guardian: {
    clip: true,
    shapes: [
      ...garment('#1E9AA0', '#14757A', 32),
      // Scale mail
      ...pair([
        line('M -56 -5 Q -49 3 -42 -5 Q -35 3 -28 -5 Q -21 3 -14 -5', '#14757A', 2),
        line('M -49 5 Q -42 13 -35 5 Q -28 13 -21 5', '#14757A', 2),
      ]),
      // Sandy lower half with a foam line
      path('M -90 17 Q -75 9 -60 17 Q -45 25 -30 17 Q -15 9 0 17 Q 15 25 30 17 Q 45 9 60 17 Q 75 25 90 17 L 90 40 L -90 40 Z', { fill: '#E9D8A6' }),
      line('M -90 17 Q -75 9 -60 17 Q -45 25 -30 17 Q -15 9 0 17 Q 15 25 30 17 Q 45 9 60 17 Q 75 25 90 17', WHITE, 2.2, 0.9),
      // Shell shoulder guards
      ...pair([
        path('M -61 -7 C -64 -22 -50 -31 -33 -27 C -28 -18 -31 -8 -39 -2 Z', { fill: '#F4E9C6', stroke: '#CDB97C', sw: 1.9 }),
        line('M -39 -3 L -57 -16', '#CDB97C', 1.5),
        line('M -39 -3 L -50 -26', '#CDB97C', 1.5),
        line('M -39 -3 L -38 -26', '#CDB97C', 1.5),
      ]),
      // Crest: a curling wave on a sand disc
      circle(0, 5, 13.5, { fill: '#F4E9C6', stroke: '#0F6E78', sw: 2.4 }),
      line('M -8.5 10.5 C -10 -1 -1.5 -7.5 5.5 -3 C 9.5 0 6.5 6 2 3.5', '#14757A', 3),
      line('M -9.5 12 Q -4 9 1.5 12 Q 6 14 10 11.5', '#1E9AA0', 2.2),
      circle(8.5, -5.5, 1.7, { fill: '#1E9AA0' }),
      collarBand('#E9D8A6', '#CDB97C'),
    ],
    extras: [
      {
        layer: 'back',
        shapes: pair([
          path('M 0 -24 L -30 -24 C -62 -26 -80 -4 -83 34 L -74 27 L -71 46 L -62 35 L -58 53 L -48 40 L -36 47 L 0 47 Z', { fill: '#0F6E78', stroke: '#0A4F57', sw: 2.5 }),
          line('M -77 16 Q -71 9 -67 17 Q -63 25 -57 18', '#5ECFD4', 2.2),
          line('M -61 0 L -62 26', '#0A4F57', 2),
        ]),
      },
      {
        layer: 'face',
        shapes: [
          heroMask('#14757A', '#F4E9C6', 'round', 2),
          line('M -5 -7.5 Q 0 -3.5 5 -7.5', '#7DE8EE', 1.8),
        ],
      },
    ],
  },

  // Ember Comet — a charcoal flight suit with flame panels up both sides, a
  // comet streaking across the chest, ember cuffs, and a flame-edged cape.
  outfit_hero_ember_comet: {
    clip: true,
    shapes: [
      ...garment('#33333D', '#1F1F27', 31),
      ...pair([
        // Flame panel: orange, then a paler tongue inside it
        path('M -90 31 L -90 -60 L -53 -60 C -45 -40 -52 -25 -44 -11 C -38 1 -46 12 -36 31 Z', { fill: '#F2622E' }),
        path('M -90 31 L -90 -22 L -63 -22 C -55 -9 -60 3 -54 13 C -50 21 -52 26 -48 31 Z', { fill: '#FFB347' }),
        // Shoulder flare
        path('M -60 -9 C -61 -24 -47 -31 -32 -27 L -29 -15 C -38 -13 -41 -7 -44 -2 Z', { fill: '#26262E', stroke: '#FFB347', sw: 1.9 }),
        line('M -53 -15 Q -45 -22 -36 -20', '#F2622E', 2),
        // Ember cuff above each front paw
        path('M -29 31 L -29 22 L -25 14 L -21 21 L -16.5 10 L -12 21 L -8 14 L -4 22 L -4 31 Z', { fill: '#F2622E' }),
        path('M -24 31 L -24 24 L -21 20 L -16.5 26 L -12 20 L -9 24 L -9 31 Z', { fill: '#FFD166' }),
      ]),
      // The comet's tail, streaming up and away from the head
      path('M 14 5 C 2 -5 -13 -13 -31 -17 C -18 -6 -8 5 5 17 Z', { fill: '#F2622E' }),
      path('M 13 7.5 C 3 0 -8 -6 -21 -9.5 C -11 -1 -3 7 7 15.5 Z', { fill: '#FFB347' }),
      line('M 4 13 L -11 2', '#FFE9A8', 1.8),
      collarBand('#1F1F27', '#F2622E'),
    ],
    extras: [
      {
        // The comet's head
        layer: 'body', at: { x: 10, y: 11.5 },
        shapes: [
          circle(0, 0, 8, { fill: '#FFE9A8', stroke: '#F2622E', sw: 2.2 }),
          circle(-1.6, -1.6, 3.2, { fill: WHITE }),
          ...sparkle(WHITE, 5.5, 5.5, 0.34),
        ],
      },
      { layer: 'back', shapes: heroCape('#C23B1B', '#FFB347', '#7A1F0C', { spread: 78, drop: 48, hem: 'flame' }) },
    ],
  },

  // Verdant Shield — moss-green plate edged in gold, leaf shoulder guards, a
  // leaf on a gold shield, a cloak made of three big leaves, and a leaf mask.
  outfit_hero_verdant_shield: {
    clip: true,
    shapes: [
      ...garment('#5E8C3A', '#456B28', 30),
      // Breastplate
      path('M -31 -60 L 31 -60 L 33 3 Q 0 27 -33 3 Z', { fill: '#79AB4C', stroke: '#456B28', sw: 1.9 }),
      line('M -90 26.5 L 90 26.5', GOLD, 3),
      ...pair([
        // Two overlapping leaves on each shoulder
        path('M -63 -6 C -65 -22 -51 -31 -34 -28 C -32 -14 -42 -4 -63 -6 Z', { fill: '#3F7A2A', stroke: GOLD, sw: 1.9 }),
        line('M -61 -8 L -37 -26', '#B5DE7C', 1.5),
        path('M -57 7 C -61 -6 -51 -14 -38 -13 C -36 -3 -44 6 -57 7 Z', { fill: '#4E8F33', stroke: GOLD, sw: 1.7 }),
        line('M -56 6 L -40 -11', '#B5DE7C', 1.3),
        // Vine
        line('M -48 25 C -41 19 -47 13 -39 9', '#2F4F1A', 1.9),
        ellipse(-46, 17, 3.5, 2.1, { fill: '#B5DE7C' }),
        ellipse(-38, 12, 2.8, 1.7, { fill: '#B5DE7C' }),
      ]),
      // Crest: a leaf on a gold shield
      path('M -13.5 -6.5 L 13.5 -6.5 L 13.5 6 Q 13.5 17 0 23.5 Q -13.5 17 -13.5 6 Z', { fill: GOLD, stroke: GOLD_D, sw: 2.2 }),
      path('M 0 -3 Q 9.5 6 0 20 Q -9.5 6 0 -3 Z', { fill: '#3F7A2A', stroke: '#2F4F1A', sw: 1 }),
      line('M 0 0.5 L 0 17', '#B5DE7C', 1.5),
      line('M 0 6 L 4 3', '#B5DE7C', 1.2),
      line('M 0 10.5 L -4 7.5', '#B5DE7C', 1.2),
      collarBand(GOLD, GOLD_D),
    ],
    extras: [
      {
        layer: 'back',
        shapes: pair([
          path(
            'M 0 -24 L -30 -24 C -60 -26 -78 -8 -86 20 C -80 19 -75 21 -73 25 C -80 32 -83 41 -82 52 C -74 45 -67 45 -63 48 C -62 53 -57 55 -51 54 L -36 46 L 0 46 Z',
            { fill: '#2F5E22', stroke: '#1E4216', sw: 2.5 },
          ),
          line('M -40 -12 C -57 -4 -70 6 -82 19', '#6FA84A', 2),
          line('M -44 6 C -58 16 -70 30 -79 48', '#6FA84A', 2),
          line('M -44 26 C -50 34 -52 42 -53 51', '#6FA84A', 2),
        ]),
      },
      {
        layer: 'face',
        shapes: [
          heroMask('#3F7A2A', GOLD, 'leaf', 2),
          ...pair([line('M -44 -8 L -33 -5', '#B5DE7C', 1.5)]),
        ],
      },
    ],
  },

  // ═══ TIER 4 ═════════════════════════════════════════════════════════════════

  // Aurora Knight — violet armor with a silver breastplate and big studded
  // pauldrons, a north star on the chest, and a night-sky cape that northern
  // lights drift across.
  outfit_hero_aurora_knight: {
    clip: true,
    shapes: [
      ...garment('#6D3FC4', '#4C2A91', 29),
      // Plate skirt
      path('M -90 18 L 90 18 L 90 40 L -90 40 Z', { fill: '#4C2A91' }),
      path('M -90 18 L 90 18 L 90 24.5 L -90 24.5 Z', { fill: SILVER }),
      ...pair([line('M -30 25 L -33 40', SILVER, 2), line('M -52 25 L -57 40', SILVER, 2)]),
      // Breastplate
      path('M -27 -60 L 27 -60 L 29 6 Q 0 24 -29 6 Z', { fill: SILVER, stroke: SILVER_D, sw: 2 }),
      line('M -22 -8 Q 0 -20 22 -8', SILVER_D, 1.6, 0.8),
      ...pair([
        // Pauldron: a wide silver cap with a violet stud
        ellipse(-44, -15, 19, 11.5, { fill: '#EAF0F5', stroke: SILVER_D, sw: 2 }),
        line('M -60 -11 Q -44 -3 -28 -11', SILVER_D, 1.6),
        circle(-44, -17, 3.4, { fill: '#6D3FC4', stroke: '#C4B5FD', sw: 1.2 }),
        circle(-35, 12, 2, { fill: SILVER }),
      ]),
      // The north star on a dark roundel
      circle(0, 3, 12.5, { fill: '#33206F', stroke: WHITE, sw: 2.4 }),
      ...sparkle('#8FF7D0', 0, 3, 1.5),
      ...sparkle(WHITE, 0, 3, 0.6),
      collarBand('#EAF0F5', SILVER_D),
    ],
    extras: [
      {
        layer: 'back',
        shapes: [
          ...heroCape('#2A1A5E', '#6D3FC4', '#1A1040', { spread: 82, hem: 'wave' }),
          ...pair([circle(-68, 30, 1.5, { fill: '#C4B5FD' }), circle(-58, 12, 1.2, { fill: '#C4B5FD' })]),
        ],
      },
      {
        layer: 'back', fx: 'shimmer',
        shapes: pair([
          line('M -77 44 C -80 22 -75 2 -60 -12', '#5EF2B8', 4.6, 0.85),
          line('M -69 45 C -71 28 -67 12 -57 0', '#7CC7FF', 3.4, 0.8),
          line('M -62 45 C -63 36 -61 28 -57 20', '#F5A3E0', 2.6, 0.8),
        ]),
      },
    ],
  },

  // Gravity Warden — deep indigo under a lilac yoke, ringed-planet shoulders,
  // a dark core in a tilted ring with two moons circling it, a star-specked
  // cape with a pointed hem, and an indigo mask.
  outfit_hero_gravity_warden: {
    clip: true,
    shapes: [
      ...garment('#2A2470', '#1A1650', 31),
      // Lilac yoke
      path('M -90 -60 L 90 -60 L 90 -22 L 42 -15 L 0 -1 L -42 -15 L -90 -22 Z', { fill: '#7B6FE0' }),
      line('M -90 -22 L -42 -15 L 0 -1 L 42 -15 L 90 -22', '#C9C2FF', 1.8),
      // Orbit lines across the suit
      ellipse(0, 7, 34, 12, { stroke: '#5A50C8', sw: 1.6 }),
      ellipse(0, 7, 49, 19, { stroke: '#4840AE', sw: 1.6 }),
      path('M -90 22.5 L 90 22.5 L 90 28.5 L -90 28.5 Z', { fill: '#A99CFF' }),
      ...pair([
        // A ringed planet on each shoulder
        circle(-44, -15, 10.5, { fill: '#A99CFF', stroke: '#1A1650', sw: 1.9 }),
        line('M -52 -18 Q -44 -14 -36 -18', '#7B6FE0', 2),
        ellipse(-44, -14, 16.5, 4.6, { stroke: '#6EE7F9', sw: 2 }),
        circle(-45, 16, 1.5, { fill: '#C9C2FF' }),
      ]),
      // The core
      circle(0, 7, 9.5, { fill: '#0F0C2E', stroke: '#A99CFF', sw: 2.2 }),
      ellipse(0, 7, 15.5, 5, { stroke: '#6EE7F9', sw: 2.2 }),
      circle(0, 7, 3.2, { fill: '#6EE7F9' }),
      collarBand('#1A1650', '#A99CFF'),
    ],
    extras: [
      {
        layer: 'body', at: { x: 0, y: 7 }, fx: 'spin',
        shapes: [
          circle(-13.5, -8, 3.1, { fill: '#FDE68A', stroke: '#1A1650', sw: 1.4 }),
          circle(13.5, 8, 2.6, { fill: WHITE, stroke: '#1A1650', sw: 1.4 }),
        ],
      },
      {
        layer: 'back',
        shapes: [
          ...heroCape('#15123F', '#A99CFF', '#0C0A2A', { spread: 80, hem: 'points' }),
          ...pair([
            ...sparkle('#C9C2FF', -68, 26, 0.42),
            circle(-60, 8, 1.4, { fill: '#C9C2FF' }),
            circle(-72, 40, 1.3, { fill: '#6EE7F9' }),
          ]),
        ],
      },
      {
        layer: 'face',
        shapes: [
          heroMask('#2A2470', '#A99CFF', 'wing', 2),
          ...sparkle('#6EE7F9', 0, -4.5, 0.5),
        ],
      },
    ],
  },

  // Frost Sentinel — deep-water blue under ice-crystal plates, icicle
  // shoulders, a snowflake on a hexagon of ice, an icicle-hemmed cape, a
  // jagged ice mask, and frost that glints on and off.
  outfit_hero_frost_sentinel: {
    clip: true,
    shapes: [
      ...garment('#2F7FB0', '#1F5F8A', 31),
      path('M -90 23 L 90 23 L 90 31 L -90 31 Z', { fill: WHITE }),
      line('M -90 23 L 90 23', '#8FD3EC', 1.8),
      ...pair([
        // Crystal plates
        path('M -54 -1 L -39 -12 L -28 4 L -41 18 Z', { fill: '#C9EEFA', stroke: '#1F5F8A', sw: 1.6 }),
        line('M -39 -12 L -41 18', '#6FB9D6', 1.3),
        path('M -28 4 L -18 12 L -27 22 L -41 18 Z', { fill: '#8FD3EC', stroke: '#1F5F8A', sw: 1.6 }),
        // Icicle shoulder
        path('M -63 -6 L -65 -31 L -55 -17 L -49 -35 L -42 -18 L -33 -31 L -31 -11 L -44 -3 Z', { fill: '#E3F7FD', stroke: '#4FA3C6', sw: 1.7 }),
        line('M -49 -30 L -47 -9', '#8FD3EC', 1.3),
      ]),
      // A snowflake on a hexagon of ice
      path('M 0 -9.5 L 12.5 -2.5 L 12.5 12 L 0 19.5 L -12.5 12 L -12.5 -2.5 Z', { fill: '#E3F7FD', stroke: '#1F5F8A', sw: 2.2 }),
      line('M 0 -5 L 0 15', '#2F7FB0', 2.2),
      line('M -8.5 0 L 8.5 10', '#2F7FB0', 2.2),
      line('M 8.5 0 L -8.5 10', '#2F7FB0', 2.2),
      line('M -2.6 -2.5 L 0 0 L 2.6 -2.5', '#2F7FB0', 1.5),
      line('M -2.6 12.5 L 0 10 L 2.6 12.5', '#2F7FB0', 1.5),
      circle(0, 5, 2.2, { fill: WHITE, stroke: '#2F7FB0', sw: 1.2 }),
      collarBand(WHITE, '#6FB9D6'),
    ],
    extras: [
      {
        layer: 'body', clip: true, fx: 'shimmer',
        shapes: [
          ...sparkle(WHITE, -41, 2, 0.6),
          ...sparkle(WHITE, 37, -6, 0.5),
          ...sparkle(WHITE, 30, 16, 0.45),
          ...sparkle(WHITE, -22, 20, 0.4),
          ...sparkle(WHITE, 6, -4, 0.45),
        ],
      },
      { layer: 'back', shapes: heroCape('#CDEFFA', WHITE, '#3E8FB8', { spread: 79, hem: 'points' }) },
      { layer: 'face', shapes: [heroMask('#E3F7FD', '#2F7FB0', 'shard', 1.9)] },
    ],
  },

  // ═══ TIER 5 ═════════════════════════════════════════════════════════════════

  // Solar Sovereign — white and gold: a great sunburst on the chest, sun-disc
  // shoulders, a collar of rays that glows, and a deep gold cape with a cream
  // lining whose edge shines.
  outfit_hero_solar_sovereign: {
    clip: true,
    shapes: [
      ...garment('#FFFDF5', '#E8DDBE', 32),
      path('M -90 24 L 90 24 L 90 32 L -90 32 Z', { fill: GOLD }),
      line('M -90 24 L 90 24', GOLD_D, 1.4),
      ...pair([
        path('M -90 -60 L -48 -60 L -43 24 L -90 24 Z', { fill: GOLD }),
        line('M -48 -40 L -43 24', GOLD_D, 1.8),
        // A sun disc on each shoulder
        path(burst(-44, -15, 9.5, 15.5, 10), { fill: GOLD, stroke: GOLD_D, sw: 1.4 }),
        circle(-44, -15, 7.6, { fill: '#FFE38A', stroke: GOLD_D, sw: 1.4 }),
      ]),
      // The sunburst, on a pale halo of long rays
      path(burst(0, 8, 15, 36, 16, 11.25), { fill: '#FFE9A8' }),
      path(burst(0, 8, 10, 18.5, 12), { fill: GOLD, stroke: GOLD_D, sw: 1.5 }),
      circle(0, 8, 9.6, { fill: '#FFE38A', stroke: GOLD_D, sw: 1.8 }),
      circle(0, 8, 5, { fill: '#FFF7D6' }),
      collarBand(GOLD, GOLD_D),
    ],
    extras: [
      {
        // The rays of the collar
        layer: 'body', at: { x: 0, y: -14 }, fx: 'pulse',
        shapes: [
          ...pair([
            path('M -20 2.5 L -23 16 L -11.5 5 Z', { fill: GOLD, stroke: GOLD_D, sw: 1.1 }),
            path('M -32 -2 L -40 9.5 L -24.5 1 Z', { fill: GOLD, stroke: GOLD_D, sw: 1.1 }),
          ]),
        ],
      },
      { layer: 'back', shapes: heroCape('#E8A21A', '#FFF3CC', '#A86F0F', { spread: 82, hem: 'wave' }) },
      {
        // The shine along the cape's edge
        layer: 'back', fx: 'shimmer',
        shapes: pair([
          line('M -84 36 C -82 6 -64 -22 -34 -23', '#FFE38A', 5.5, 0.9),
          line('M -84 36 C -82 6 -64 -22 -34 -23', WHITE, 2, 0.9),
        ]),
      },
    ],
  },

  // Quantum Drift — one half teal, the other violet, split down a zigzag
  // seam; a prism on each shoulder; two diamonds out of step on the chest;
  // and a dark cape with a cyan and a pink copy of itself drifting either side,
  // as if she were in two places at once.
  outfit_hero_quantum_drift: {
    clip: true,
    shapes: [
      ...garment('#0E3B43', '#08262C', 31),
      // The two halves
      path('M -90 -60 L -4 -60 L -4 -12 L 4 -4 L -4 4 L 4 12 L -4 20 L 4 28 L 4 40 L -90 40 Z', { fill: '#0F6570' }),
      path('M 90 -60 L -4 -60 L -4 -12 L 4 -4 L -4 4 L 4 12 L -4 20 L 4 28 L 4 40 L 90 40 Z', { fill: '#4A2380' }),
      line('M -4 -40 L -4 -12 L 4 -4 L -4 4 L 4 12 L -4 20 L 4 28 L 4 40', WHITE, 1.6, 0.85),
      // Glitch bars: cyan on her right side, pink on her left
      path('M -56 9 L -34 9 L -34 13 L -56 13 Z', { fill: '#5EEAD4' }),
      path('M -50 16 L -24 16 L -24 19 L -50 19 Z', { fill: '#5EEAD4', op: 0.7 }),
      path('M 34 3 L 56 3 L 56 7 L 34 7 Z', { fill: '#F0ABFC' }),
      path('M 26 10 L 50 10 L 50 13 L 26 13 Z', { fill: '#F0ABFC', op: 0.7 }),
      // Shoulder prisms
      path('M -61 -8 L -53 -29 L -34 -25 L -29 -11 L -44 -2 Z', { fill: '#5EEAD4', stroke: '#08262C', sw: 1.8 }),
      line('M -53 -29 L -44 -2', '#08262C', 1.3),
      path('M 61 -8 L 53 -29 L 34 -25 L 29 -11 L 44 -2 Z', { fill: '#F0ABFC', stroke: '#2A1050', sw: 1.8 }),
      line('M 53 -29 L 44 -2', '#2A1050', 1.3),
      path('M -90 23 L 90 23 L 90 28.5 L -90 28.5 Z', { fill: '#08262C' }),
      // Two diamonds, out of step, on a dark plate
      path('M 0 -11 L 16 5.5 L 0 22 L -16 5.5 Z', { fill: '#08262C', stroke: WHITE, sw: 1.4 }),
      path('M -3 -6 L 7.5 5.5 L -3 17 L -13.5 5.5 Z', { stroke: '#F0ABFC', sw: 2.4 }),
      path('M 3 -6 L 13.5 5.5 L 3 17 L -7.5 5.5 Z', { stroke: '#5EEAD4', sw: 2.4 }),
      path('M 0 0 L 4.5 5.5 L 0 11 L -4.5 5.5 Z', { fill: WHITE }),
      collarBand('#08262C', '#5EEAD4'),
    ],
    extras: [
      {
        // The sheen
        layer: 'body', clip: true, fx: 'shimmer',
        shapes: [
          path('M -90 14 L -38 -60 L -18 -60 L -90 40 Z', { fill: '#A78BFA', op: 0.36 }),
          path('M -34 40 L 38 -60 L 54 -60 L -12 40 Z', { fill: '#5EEAD4', op: 0.28 }),
          path('M 36 40 L 90 -34 L 90 -8 L 56 40 Z', { fill: '#F0ABFC', op: 0.36 }),
        ],
      },
      {
        // The two copies of the cape, drifting either side of it
        layer: 'back', fx: 'shimmer',
        shapes: [
          ...shift(heroCape('#5EEAD4', '#5EEAD4', '#2CB5A0', { spread: 76, drop: 46, hem: 'steps' }), -7, -2),
          ...shift(heroCape('#F0ABFC', '#F0ABFC', '#C36BD6', { spread: 76, drop: 46, hem: 'steps' }), 7, 2),
        ],
      },
      { layer: 'back', shapes: heroCape('#0B2F36', '#5EEAD4', '#051A1F', { spread: 76, drop: 46, hem: 'steps' }) },
    ],
  },

  // Titan of 24 — the app's own hero. The emblem is a day cut into four, one
  // quarter per pillar (Work, Personal, Care, Sleep), with a clock hand that
  // goes round. Gold shoulders, a brand-purple cape marked like a clock face,
  // and a purple mask rimmed in gold.
  outfit_hero_titan_24: {
    clip: true,
    shapes: [
      ...garment('#2B2670', '#18153F', 31),
      path('M -90 23 L 90 23 L 90 29 L -90 29 Z', { fill: GOLD }),
      line('M -90 23 L 90 23', GOLD_D, 1.4),
      // Cream chevron across the chest
      path('M -90 -30 L -40 -19 L 0 -4 L 40 -19 L 90 -30 L 90 -22 L 40 -11 L 0 4 L -40 -11 L -90 -22 Z', { fill: '#FFF1CF' }),
      ...pair([
        line('M -37 -8 L -46 23', '#FFF1CF', 3),
        // Gold shoulder cap
        ellipse(-44, -15, 19, 11.5, { fill: GOLD, stroke: GOLD_D, sw: 2 }),
        line('M -60 -11 Q -44 -3 -28 -11', GOLD_D, 1.6),
      ]),
      circle(-44, -17, 3.6, { fill: PERSONAL, stroke: WHITE, sw: 1.2 }),
      circle(44, -17, 3.6, { fill: CARE, stroke: WHITE, sw: 1.2 }),
      // The four pillars
      circle(0, 7, 15.2, { fill: GOLD, stroke: GOLD_D, sw: 1.4 }),
      path('M 0 7 L 0 -5.5 Q -12.5 -5.5 -12.5 7 Z', { fill: BRAND }),
      path('M 0 7 L 12.5 7 Q 12.5 -5.5 0 -5.5 Z', { fill: PERSONAL }),
      path('M 0 7 L 0 19.5 Q 12.5 19.5 12.5 7 Z', { fill: CARE }),
      path('M 0 7 L -12.5 7 Q -12.5 19.5 0 19.5 Z', { fill: SLEEP }),
      circle(0, 7, 12.6, { stroke: '#FFF1CF', sw: 2.4 }),
      collarBand('#FFF1CF', '#C9A64B'),
    ],
    extras: [
      {
        // The clock hand
        layer: 'body', at: { x: 0, y: 7 }, fx: 'spin',
        shapes: [line('M 0 0 L 0 -9', WHITE, 2.2), circle(0, 0, 2.2, { fill: WHITE })],
      },
      {
        // The clock-face cape: gold hour marks around its rim
        layer: 'back',
        shapes: [
          ...heroCape(BRAND, '#FFF1CF', BRAND_D, { spread: 82, hem: 'wave' }),
          ...pair([
            line('M -62 6 L -71 4', GOLD, 2.8),
            line('M -64 23 L -74 24', GOLD, 2.8),
            line('M -62 38 L -72 42', GOLD, 2.8),
          ]),
        ],
      },
      {
        // A soft glow behind the emblem
        layer: 'body', clip: true, at: { x: 0, y: 7 }, fx: 'pulse',
        shapes: [circle(0, 0, 19, { fill: '#FFF1CF', op: 0.24 })],
      },
      {
        layer: 'face',
        shapes: [
          heroMask(BRAND, '#FFF1CF', 'round', 1),
          path(MASKS.round, { stroke: GOLD, sw: 2.2 }),
          circle(0, -5, 1.8, { fill: GOLD }),
        ],
      },
    ],
  },
};
