// scripts/render-companion.mjs — renders the companion to PNG files.
//
// Why: the dogs and everything they wear are drawn in code, and nobody can
// see code. This script draws them so the art can be looked at and criticised
// on the laptop.
//
// What it writes (into docs/companion/ by default):
//   <state>-<background>-<size>.png   the Maltese, one image per combination
//   sheet-240.png, sheet-64.png       the Maltese: every state on every background
//   items/items-1..3.png              every wearable item on the Maltese, idle and happy
//   items/max-outfit.png              one item in every slot, all four states
//   breeds/<breed>/sheet-240.png      each breed: every state on every background
//   breeds/<breed>/sheet-64.png       the same at the smallest size
//   breeds/<breed>/max-outfit.png     each breed fully dressed, all four states
//   houses/houses.png                 all 15 houses with the Maltese in front
//   houses/houses-inside.png          the same, with her resting inside
//   houses/houses-small.png           the Shop card size
//   houses/<house id>.png             one large picture per house
//   chests.png                        the three chests, closed and open
//
// Run:   npm run render:companion
//        node scripts/render-companion.mjs some/dir            (write elsewhere)
//        node scripts/render-companion.mjs some/dir items      (only the item sheets)
//        node scripts/render-companion.mjs some/dir corgi      (only one breed)
//        node scripts/render-companion.mjs some/dir houses     (only the house sheets)
//
// Needs Node 22.15+ (it imports the app's TypeScript files directly; Node
// strips the types). The only package it uses is @resvg/resvg-js, a
// devDependency that turns SVG text into PNG pixels. It never ships in the app.

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

// The app's source files import each other without a file extension
// ("./palette"). Node needs one, so try ".ts" when a relative import misses.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && context.parentURL && !path.extname(specifier)) {
      const candidate = new URL(specifier + '.ts', context.parentURL);
      if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
    }
    return nextResolve(specifier, context);
  },
});

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fromApp = (p) => import(pathToFileURL(path.join(root, 'app/components/companion', p)).href);

const { companionSvgMarkup, companionInnerMarkup } = await fromApp('svgMarkup.ts');
const { BACKDROPS } = await fromApp('palette.ts');
const { outlineScaleForSize } = await fromApp('poses.ts');
const { BREEDS } = await fromApp('breeds/index.ts');
const { ITEM_SLOTS, MAX_OUTFIT } = await fromApp('items/itemSlots.ts');
const { HOUSES } = await fromApp('houses/index.ts');
const { houseInnerMarkup, houseSvgMarkup } = await fromApp('houses/houseMarkup.ts');
const { shapesMarkup } = await fromApp('svgMarkup.ts');
const { chestParts } = await fromApp('../chest/chestArt.ts');

const outDir = path.resolve(root, process.argv[2] ?? 'docs/companion');
const only = process.argv[3] ?? 'all'; // 'all' | 'items' | a breed id

const STATES = ['idle', 'happy', 'celebrating', 'sleeping'];
const BACKS = ['warmWhite', 'day', 'night'];
const SIZES = [64, 240];

let count = 0;
function save(name, svg, width) {
  const file = path.join(outDir, name);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng());
  count += 1;
}

let cellId = 0;
// One dog in a 200 x 200 cell at (col, row) of a grid.
function cell(col, row, backdrop, opts) {
  const b = BACKDROPS[backdrop];
  return (
    `<svg x="${col * 200}" y="${row * 200}" width="200" height="200" viewBox="0 0 200 200">` +
    `<rect width="200" height="200" fill="${b.sky}"/><rect y="150" width="200" height="50" fill="${b.ground}"/>` +
    companionInnerMarkup({ ...opts, idPrefix: `k${cellId++}` }) +
    `</svg>`
  );
}
function grid(cols, rows, inner, cellPx) {
  const w = cols * 200;
  const h = rows * 200;
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`,
    width: cols * cellPx,
  };
}

// Every state (columns) on every background (rows).
function stateSheet(breed, cellPx) {
  let inner = '';
  BACKS.forEach((backdrop, r) => {
    STATES.forEach((state, c) => {
      inner += cell(c, r, backdrop, { state, breed, outlineScale: outlineScaleForSize(cellPx) });
    });
  });
  return grid(STATES.length, BACKS.length, inner, cellPx);
}

// One item in every slot, all four states, on day and night.
function maxOutfitSheet(breed) {
  let inner = '';
  ['day', 'night'].forEach((backdrop, r) => {
    STATES.forEach((state, c) => {
      inner += cell(c, r, backdrop, { state, breed, equipped: MAX_OUTFIT });
    });
  });
  return grid(STATES.length, 2, inner, 240);
}

// ── The Maltese's own images (docs/companion/*.png) ──
if (only === 'all' || only === 'maltese') {
  for (const state of STATES) {
    for (const backdrop of BACKS) {
      for (const size of SIZES) {
        save(`${state}-${backdrop}-${size}.png`, companionSvgMarkup({ state, size, backdrop }), size);
      }
    }
  }
  const big = stateSheet('maltese', 240);
  save('sheet-240.png', big.svg, big.width);
  const small = stateSheet('maltese', 64);
  save('sheet-64.png', small.svg, small.width);
}

// ── Every item on the Maltese: idle and happy side by side ──
if (only === 'all' || only === 'items') {
  const ids = Object.keys(ITEM_SLOTS);
  const PER_SHEET = 10; // 10 items = 20 cells = 4 columns x 5 rows
  for (let sheet = 0; sheet * PER_SHEET < ids.length; sheet++) {
    const batch = ids.slice(sheet * PER_SHEET, (sheet + 1) * PER_SHEET);
    let inner = '';
    batch.forEach((id, i) => {
      const equipped = { [ITEM_SLOTS[id]]: id };
      const row = Math.floor(i / 2);
      const col = (i % 2) * 2;
      inner += cell(col, row, 'day', { state: 'idle', equipped });
      inner += cell(col + 1, row, 'day', { state: 'happy', equipped });
    });
    const g = grid(4, Math.ceil(batch.length / 2), inner, 180);
    save(`items/items-${sheet + 1}.png`, g.svg, g.width);
  }
  const max = maxOutfitSheet('maltese');
  save('items/max-outfit.png', max.svg, max.width);
  // The smallest size, fully dressed: does it still read?
  let tiny = '';
  STATES.forEach((state, c) => {
    tiny += cell(c, 0, 'day', { state, equipped: MAX_OUTFIT, outlineScale: outlineScaleForSize(64) });
  });
  const t = grid(4, 1, tiny, 64);
  save('items/max-outfit-64.png', t.svg, t.width);
}

// ── Every breed ──
for (const breed of BREEDS) {
  if (only !== 'all' && only !== breed.id) continue;
  const big = stateSheet(breed.id, 240);
  save(`breeds/${breed.id}/sheet-240.png`, big.svg, big.width);
  const small = stateSheet(breed.id, 64);
  save(`breeds/${breed.id}/sheet-64.png`, small.svg, small.width);
  const max = maxOutfitSheet(breed.id);
  save(`breeds/${breed.id}/max-outfit.png`, max.svg, max.width);
}

// ── All breeds side by side (idle, day) ──
if (only === 'all' || only === 'lineup') {
  let inner = '';
  BREEDS.forEach((breed, c) => {
    inner += cell(c, 0, 'day', { state: 'idle', breed: breed.id });
    inner += cell(c, 1, 'day', { state: 'happy', breed: breed.id, equipped: MAX_OUTFIT });
  });
  const g = grid(BREEDS.length, 2, inner, 200);
  save('breeds/lineup.png', g.svg, g.width);
}

// ── The houses: each scene with a dog in front, and with her resting inside ──
if (only === 'all' || only === 'houses') {
  const W = 300;
  const H = 200;
  const COLS = 3;
  // `dogFor(i)` picks the dog for house number i; `px` is the width of one scene.
  const sheet = (name, dogFor, px, marks = false) => {
    let inner = '';
    HOUSES.forEach((house, i) => {
      const x = (i % COLS) * W;
      const y = Math.floor(i / COLS) * H;
      inner +=
        `<svg x="${x}" y="${y}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
        houseInnerMarkup(house, { dog: dogFor(i), idPrefix: `hs${cellId++}`, marks }) +
        `</svg>`;
    });
    const rows = Math.ceil(HOUSES.length / COLS);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${COLS * W}" height="${rows * H}" viewBox="0 0 ${COLS * W} ${rows * H}">${inner}</svg>`;
    save(`houses/${name}.png`, svg, COLS * px);
  };
  sheet('houses', () => ({ breed: 'maltese', state: 'idle' }), 420);
  sheet('houses-inside', () => ({ breed: 'maltese', inside: true }), 420, true);
  // A different breed in each scene, dressed, to check contrast with dark coats.
  sheet('houses-breeds', (i) => ({ breed: BREEDS[i % BREEDS.length].id, state: 'happy', equipped: i % 2 ? MAX_OUTFIT : {} }), 420);
  sheet('houses-breeds-inside', (i) => ({ breed: BREEDS[(i + 1) % BREEDS.length].id, inside: true }), 420);
  sheet('houses-small', () => ({ breed: 'maltese', state: 'idle' }), 140);
  for (const house of HOUSES) {
    save(`houses/${house.id}.png`, houseSvgMarkup(house, 600, { dog: { breed: 'maltese', state: 'idle' }, idPrefix: house.id }), 600);
  }
}

// ── The chests: closed (top row) and with the lid popped (bottom row) ──
if (only === 'all' || only === 'chests') {
  let inner = '<rect width="300" height="230" fill="#FFFFFF"/>';
  ['wooden', 'silver', 'gold'].forEach((tier, i) => {
    const parts = chestParts(tier);
    inner +=
      `<g transform="translate(${i * 100} 0)">${shapesMarkup(parts.body)}${shapesMarkup(parts.lid)}</g>` +
      `<g transform="translate(${i * 100} 130)">${shapesMarkup(parts.inside)}${shapesMarkup(parts.body)}` +
      `<g transform="translate(0 -24) rotate(-14 12 50)">${shapesMarkup(parts.lid)}</g></g>`;
  });
  save('chests.png', `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="230" viewBox="0 0 300 230">${inner}</svg>`, 600);
}

console.log(`Wrote ${count} PNG files to ${path.relative(root, outDir) || '.'}`);
