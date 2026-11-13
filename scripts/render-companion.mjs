// scripts/render-companion.mjs — renders the companion to PNG files.
//
// Why: the dog is drawn in code and nobody can see code. This script draws the
// key pose of every state on each of the app's three backgrounds, at 64px and
// 240px, so the drawing can be looked at and criticised on the laptop.
//
// Run:   node scripts/render-companion.mjs            (writes docs/companion/)
//        node scripts/render-companion.mjs some/dir   (writes somewhere else)
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

const outDir = path.resolve(root, process.argv[2] ?? 'docs/companion');
mkdirSync(outDir, { recursive: true });

const STATES = ['idle', 'happy', 'celebrating', 'sleeping'];
const BACKS = ['warmWhite', 'day', 'night'];
const SIZES = [64, 240];

function png(svg, width) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();
}

let count = 0;
function save(name, svg, width) {
  writeFileSync(path.join(outDir, name), png(svg, width));
  count += 1;
}

// 1. One PNG per state, background, and size.
for (const state of STATES) {
  for (const backdrop of BACKS) {
    for (const size of SIZES) {
      save(`${state}-${backdrop}-${size}.png`, companionSvgMarkup({ state, size, backdrop }), size);
    }
  }
}

// 2. Contact sheets: every state (columns) on every background (rows).
function sheet(cell) {
  const cols = STATES.length;
  const rows = BACKS.map((b) => ({ backdrop: b }));
  let inner = '';
  rows.forEach((row, r) => {
    STATES.forEach((state, c) => {
      const b = BACKDROPS[row.backdrop];
      inner +=
        `<svg x="${c * 200}" y="${r * 200}" width="200" height="200" viewBox="0 0 200 200">` +
        `<rect width="200" height="200" fill="${b.sky}"/><rect y="150" width="200" height="50" fill="${b.ground}"/>` +
        companionInnerMarkup({ state, outlineScale: outlineScaleForSize(cell) }) +
        `</svg>`;
    });
  });
  const w = cols * 200;
  const h = rows.length * 200;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`;
  return { svg, width: cols * cell };
}

const big = sheet(240);
save('sheet-240.png', big.svg, big.width);
const small = sheet(64);
save('sheet-64.png', small.svg, small.width);

// 3. Accessories the rig can draw, on the idle pose.
const ACCESSORIES = ['acc_party_hat', 'outfit_cozy_sweater', 'acc_bow_tie', 'acc_golden_collar'];
let accInner = '';
ACCESSORIES.forEach((id, c) => {
  accInner +=
    `<svg x="${c * 200}" y="0" width="200" height="200" viewBox="0 0 200 200">` +
    `<rect width="200" height="200" fill="${BACKDROPS.day.sky}"/><rect y="150" width="200" height="50" fill="${BACKDROPS.day.ground}"/>` +
    companionInnerMarkup({ state: c === 1 ? 'happy' : 'idle', accessory: id }) +
    `</svg>`;
});
save(
  'accessories.png',
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="200" viewBox="0 0 800 200">${accInner}</svg>`,
  ACCESSORIES.length * 240,
);

console.log(`Wrote ${count} PNG files to ${path.relative(root, outDir) || '.'}`);
