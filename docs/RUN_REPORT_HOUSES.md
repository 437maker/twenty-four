# RUN_REPORT_HOUSES.md — Animated houses, chests, sports gear, and hero suits

Run date: 2026-11-14. Prompt: `HOUSES_PROMPT.md`.

## Summary

Every phase is done. 15 unique animated houses with backdrops appear in the
yard and can be previewed in the Shop. The dog walks inside to rest and comes
back out. Three chest tiers open with an animation and give treats or items.
20 new wearables (sports gear in Tier 2 and 10 original hero suits in Tiers
3–5) work on all six breeds in every pose.

**Not checked: anything on a real phone.** There is no iPhone or simulator on
the Windows laptop. All drawings were reviewed as PNG renders and all logic by
tests. Whether the houses animate smoothly, whether the dog walks in and out
cleanly, and whether a T5 house with a T5 suit stays at 60fps are all unknown
until checks H1–H9 in `docs/MANUAL_CHECKS.md` are run.

This run continued from an earlier session that had written the extras system,
the helmet ear-tuck logic, and the shimmer effect but stopped before committing.
Those files were kept and finished rather than discarded (D67 in
`docs/DECISIONS.md`).

## Results

| Check | Result |
|---|---|
| `tsc --noEmit` | clean |
| Tests | 673 passing, 12 suites (414 before the run) |
| `expo-doctor` | 20 of 20 checks passed |
| Published, end of Phase A | update group `09e3c12f-d5b7-4fac-8d7b-371d8a024c89` |
| Published, end of run | update group `3e1d507f-dbcb-4ef6-b8af-74552da73a81` |

To go back to the update from before this run:
`npx eas-cli update:republish --group b40b33db-969b-4176-8ccf-6902851350ef`

If the end-of-run update is broken on the phone, go back one step:
`npx eas-cli update:republish --group 09e3c12f-d5b7-4fac-8d7b-371d8a024c89`

## Per phase

| Phase | Status | Commits |
|---|---|---|
| A. 15 animated houses, yard, and Shop previews | done | `4629667`, `1565975`, `5157098`, `8937a16` |
| B. The dog goes inside to rest; auto-rest during Sleep | done | `c595f19` |
| C. Fix B3 (atomic purchases); three chest tiers | done | `362cd6c`, `9d0a7bb`, `bda90f0`, `5ae2e09`, `4ca15cd` |
| D. 20 new wearables (sports gear and hero suits) | done | `362e5fe`, `9aca2bd`, `9603ece` |

Nothing was skipped. One thing is partial by design: the frame-counter in the
Gallery only appears when running with `npx expo start`, not in a published
update (see H9 in `docs/MANUAL_CHECKS.md`).

## Render sheets

Houses (all 15, with the Maltese in front, all ambient states):
- [houses/houses.png](companion/houses/houses.png) — all 15 houses side by side
- [houses/house-<id>.png](companion/houses/) — one file per house (render sheets per house)

Regenerate with `npm run render:companion -- --only houses`.

Items, on the Maltese (all 50 wearables):
- [items/items-1.png](companion/items/items-1.png)
- [items/items-2.png](companion/items/items-2.png)
- [items/items-3.png](companion/items/items-3.png)
- [items/items-4.png](companion/items/items-4.png)
- [items/items-5.png](companion/items/items-5.png)

New items (the 20 sports and hero items on each of the six breeds):

| Breed | Sheet |
|---|---|
| Maltese | [items/new-maltese.png](companion/items/new-maltese.png) |
| German Shepherd | [items/new-german_shepherd.png](companion/items/new-german_shepherd.png) |
| Golden Retriever | [items/new-golden_retriever.png](companion/items/new-golden_retriever.png) |
| Corgi | [items/new-corgi.png](companion/items/new-corgi.png) |
| Shiba Inu | [items/new-shiba.png](companion/items/new-shiba.png) |
| Pug | [items/new-pug.png](companion/items/new-pug.png) |

Helmet and hero outfit sheets:
- [items/helmets.png](companion/items/helmets.png) — both helmets, every breed, every state
- [items/hero-outfit.png](companion/items/hero-outfit.png) — Titan of 24 + Football Helmet + Baseball Bat, all breeds, all states
- [items/hero-outfit-64.png](companion/items/hero-outfit-64.png) — same at 64px
- [items/max-outfit.png](companion/items/max-outfit.png) — one item in every slot, all four states
- [items/max-outfit-64.png](companion/items/max-outfit-64.png) — same at 64px

Regenerate with `npm run render:companion -- --only new` or `--only items`.

## Chest prices, odds, and EV

The spec requires that a chest's expected value in treats (items counted at 50%
of their catalog price) be 70–90% of the chest price. The pity rule forces an
item on the fifth consecutive no-item chest, raising the effective item chance
above the nominal rate.

| Tier | Price | Base item chance | Treat payout | EV share |
|---|---|---|---|---|
| Wooden | 14 treats | 25% | 3–7 | **74.7%** |
| Silver | 34 treats | 40% | 9–15 | **78.3%** |
| Gold | 85 treats | 60% | 16–24 | **77.6%** |

EV formula (from `chests.test.tsx`):

```
longRunItemChance = p / (1 − (1−p)^5)
EV = avgTreats + longRunItemChance × avgItemPrice × 0.5
share = EV / price
```

All three land in [0.70, 0.90]. The 40,000-roll simulation in the same test
agrees with the formula to within 3%.

A fourth-chest-with-no-item pity counter is stored per tier so it survives
app restarts (migration `addUnopened`, constant default 0).

## What the render reviews changed

Each item and house sheet had at least two rounds: render, look, fix, re-render.

| Where | Found | Fix |
|---|---|---|
| Football face mask | bars sat across the eyes and nose | moved bars down to sit under nose and mouth |
| Pug + helmet | small folded ears poked out of the helmet shell sides | added `helmetFit: { scale: 1.05, tuckEars: true }` to `pug.ts` |
| Quantum Drift back extra | overlapping ellipses were at 0.45 opacity, barely visible | raised to 0.6 |

## Tests

414 before the run, 673 after. The new suites are in
`__tests__/houses.test.tsx`, `__tests__/chests.test.tsx`, and
`__tests__/sportsAndHeroes.test.tsx`:

- **Houses:** all 15 house ids are in the catalog; each house renders a unique
  backdrop; door and rest anchors are defined and within the drawing box;
  ambient animation counts by tier; `tuckEars`, `helmetFit.scale`, and
  `helmetFit.dy` checked for all breeds; docs D42–D47.
- **Chests:** pool weights sum to 1; tier limits on item drops; pity triggers on
  the 5th consecutive no-item chest; duplicate items refund at 50%; EV range
  70–90% (analytic and 40,000-roll simulation); weekly box → chest mapping;
  atomic open on the real-SQLite harness (forced mid-open failure leaves no
  partial grant); docs D52–D58.
- **Sports and heroes:** 20 new items and 50 total wearables mapped; all new ids
  in catalog, slots, and art; tier price bands; no banned league or publisher
  names in catalog text; chests include new items; hero suit extras (spin pivot
  on chest, shimmer stays on body, back extra opacity); helmet ear-tuck by
  breed; helmet shell wider than head; all 20 items render in-box; animated all
  breeds in `HERO_OUTFIT`; Reduce Motion stops all effects; one loop per suit
  regardless of moving pieces.

## Decisions

D42–D68 in `docs/DECISIONS.md`. The ones worth knowing:

- **D44:** house scenes are drawn from atomic `HouseDef` shapes; no per-breed
  redrawing. The dog is placed in front at the door anchor.
- **D54:** the EV window was deliberately set to 70–90% (not tighter) to leave
  room for more items in the pool without repricing chests.
- **D59:** the spec says "20 new wearables" and "50 total" but its item table
  has only 18 entries (8 sports + 10 heroes). Two held items were added
  (Football, Hockey Stick) to reach 20 and pass the named test.
- **D60:** a hero suit draws on multiple layers through an `extras` list on
  `ItemArt`. It still takes only the `outfit` slot; a separate back item can be
  worn over its cape.
- **D61:** helmets hide upright ears (German Shepherd, Corgi, Shiba) by
  returning `[]` for `earL`/`earR`. Breeds can set `helmetFit.tuckEars` for
  folded ears (Pug).
- **D62:** `shimmer` is a fourth `ItemFx` value that changes only opacity, so
  clipped overlays stay on the fabric. It rests at 55% under Reduce Motion.
- **D63:** the ten hero suits are original to this app. `heroArt.ts` opens with
  a no-borrow comment and a test fails on any banned name in the catalog.
- **D65:** `getCatalogByCategory()` now sorts by tier so Tier 2 jerseys appear
  before Tier 5 items in the Shop.

## Follow-ups

1. **Run the iPhone checks** H1–H9 in `docs/MANUAL_CHECKS.md`. H9 (the max
   outfit animating smoothly with a T5 house) is the highest risk. If it
   drops frames, simplify the extras on Titan of 24 or the house ambient loops.
2. **Look at the hero suits** in `docs/companion/items/hero-outfit.png` and
   the breed sheets. If any suit reminds you of an existing character, add it
   to the follow-up list and redesign that suit.
3. **Brain games:** the prompt defers this to a future run. The EV test
   uses a stable loot pool; adding a new category would require repricing.
4. **Economy simulation:** no simulation was done. The 70–90% EV window is a
   proxy. A model of weekly chests vs. treats earned would show whether the
   store empties before a user reaches T5.
5. **Item unlock cost for houses in chests:** houses can drop from Silver and
   Gold chests, but nothing stops a user from buying every T1–T2 item and
   finding houses in the Silver pool. Consider gating by tier owned.
6. `assets/images/cutout/` is still untracked and untouched (D26).
7. `docs/BUGS.md` was not touched. Bug B0 is still open.
