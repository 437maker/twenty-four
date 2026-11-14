# RUN_REPORT_WARDROBE.md — wearable items, renaming, and six breeds

Run date: 2026-11-14. Prompt: `WARDROBE_PROMPT.md`.

## Summary

Every phase is done. All 30 outfits and accessories can be worn, on six
breeds, in all four states. The name can be changed from Home. Owned houses
can be chosen for the yard, and Streak Shields show as a badge.

**Not checked: anything on a real phone.** There is no iPhone or simulator on
the Windows laptop. The drawings were reviewed as PNG renders and the logic by
tests. Whether a fully dressed dog animates smoothly is unknown until check W3
in `docs/MANUAL_CHECKS.md` is run.

This run started from a half-finished working folder: an earlier session had
written most of Phase A and parts of B, C, and D, and stopped before
committing. That work was checked, committed in six steps, and continued
(D40 in `docs/DECISIONS.md`).

## Results

| Check | Result |
|---|---|
| `tsc --noEmit` | clean |
| Tests | 414 passing, 9 suites (166 before the run) |
| `expo-doctor` | 20 of 20 checks passed |
| Published, after Phase A | update group `fa2b91db-a983-4447-8b9b-9384c6867bfb` |
| Published, end of run | update group `09e3c12f-d5b7-4fac-8d7b-371d8a024c89` |

To go back to the update from before this run:
`npx eas-cli update:republish --group b40b33db-969b-4176-8ccf-6902851350ef`

## Per phase

| Phase | Status | Commits |
|---|---|---|
| Architecture: shared skeleton, anchors, slots, draw order | done | `5044498` |
| Data: three new settings columns, equip / breed / house / rename queries | done | `f735145` |
| A. Equip system and all 30 items on the Maltese | done | `5044498`, `d79c457`, `cbd5a87`, `d1dfebb`, `8ea36c6` |
| B. Renaming from Home, Settings, and the Gallery | done | `f735145`, `cbd5a87` |
| C. Breed picker (Settings, and press and hold on Home) | done | `cbd5a87` |
| C. German Shepherd | done | `f867b15`, `bd1f152` |
| C. Golden Retriever | done | `71a2b99` |
| C. Corgi | done | `1349e50` |
| C. Shiba Inu | done | `9bf5bb5` |
| C. Pug | done | `99703bc` |
| D. Show in yard, and the shield badge | done | `d79c457`, `cbd5a87` |
| Tests | done | `3d5f205` |
| Docs | done | `1d7b63e`, and this report |

Nothing was skipped. Two things are partial by design, as the prompt asked:
- **Houses** change the yard stage, not the house drawing. The 15 houses do
  not have their own art.
- **The frame counter** in the Gallery only shows when running with
  `npx expo start`, not in a published update.

## Render sheets

Items, on the Maltese:
- [items-1.png](companion/items/items-1.png), [items-2.png](companion/items/items-2.png), [items-3.png](companion/items/items-3.png): every item, idle and happy
- [max-outfit.png](companion/items/max-outfit.png): one item in every slot, all four states, day and night
- [max-outfit-64.png](companion/items/max-outfit-64.png): the same at 64px

Breeds (each: every state on every background at 240px and 64px, and the max outfit):

| Breed | 240px | 64px | Max outfit |
|---|---|---|---|
| Maltese | [sheet](companion/breeds/maltese/sheet-240.png) | [sheet](companion/breeds/maltese/sheet-64.png) | [sheet](companion/breeds/maltese/max-outfit.png) |
| German Shepherd | [sheet](companion/breeds/german_shepherd/sheet-240.png) | [sheet](companion/breeds/german_shepherd/sheet-64.png) | [sheet](companion/breeds/german_shepherd/max-outfit.png) |
| Golden Retriever | [sheet](companion/breeds/golden_retriever/sheet-240.png) | [sheet](companion/breeds/golden_retriever/sheet-64.png) | [sheet](companion/breeds/golden_retriever/max-outfit.png) |
| Corgi | [sheet](companion/breeds/corgi/sheet-240.png) | [sheet](companion/breeds/corgi/sheet-64.png) | [sheet](companion/breeds/corgi/max-outfit.png) |
| Shiba Inu | [sheet](companion/breeds/shiba/sheet-240.png) | [sheet](companion/breeds/shiba/sheet-64.png) | [sheet](companion/breeds/shiba/max-outfit.png) |
| Pug | [sheet](companion/breeds/pug/sheet-240.png) | [sheet](companion/breeds/pug/sheet-64.png) | [sheet](companion/breeds/pug/max-outfit.png) |

All six side by side, bare and fully dressed: [lineup.png](companion/breeds/lineup.png)

Regenerate any of them with `npm run render:companion`.

## What the render reviews changed

Each item sheet and each breed got two rounds: render, look, fix, render again.

| Where | Found | Fix |
|---|---|---|
| Party hat | the pom-pom poked out of the top of the drawing box and was cut off | hat made shorter |
| Held items, asleep | the staff stood straight up across her sleeping face | held items lean 14 degrees away while asleep |
| German Shepherd | nose and mouth vanished on the near-black muzzle; ear tips touched the top edge | muzzle a shade lighter; ears a little shorter |
| Golden Retriever | the tail read as a plain sausage | three feathered lobes, like the Maltese plume |
| Corgi | ear tips touched the top edge | ears a little shorter |
| Shiba Inu | the cream inside the tail curl looked like a hole | made smaller and moved |
| Pug | nose vanished on the mask; ears read as round discs | mask a shade lighter; a crease line on each ear |

One thing in the sheets is not a real problem: in the celebrating column the
hat or crown is cut off at the top. The sheet draws each dog in a fixed box
and she is at the top of her jump. On the phone the whole dog moves as one
piece and nothing is cut.

## One bug found by the tests

`f867b15` (German Shepherd) was committed and pushed with one test failing:
upright ears reported a rotation of negative zero at rest, which the test
treats as different from zero. It had no visible effect. It was fixed in the
next commit, `bd1f152`. After that, every commit went through a script that
refuses to commit unless types and tests pass.

## Tests

166 before, 414 after. The new tests are in `__tests__/wardrobe.test.tsx`:

- **Slots:** all 30 items are mapped to exactly one slot; houses and the
  shield are not wearable; every mapped item has a drawing.
- **Equip rules** (real SQLite): put on, take off, replace; an unowned item
  is refused; an item is refused in the wrong slot; all 30 items can be
  bought and worn; "Delete all my data" empties the wardrobe.
- **Migration** (real SQLite): a fresh install; a database that already has
  rows keeps its data and gets the columns; running it twice is harmless.
- **Breeds:** switching keeps the name and every item and costs nothing; an
  unknown breed is refused; for every breed, state, and anchor, the anchor is
  defined and inside the drawing (168 table rows); every breed has every
  part and renders in every state, bare and fully dressed.
- **Scene:** each slot lands on the layer of its body part; draw order;
  outfits are clipped to the body; the celebration hat rule.
- **Renaming:** the 1 to 20 character rule; a rename survives a restart;
  the pop-up refuses an empty name.
- **House:** only an owned house can be shown; the yard falls back to the
  best one owned.
- **Component:** items add layers; effects start no loops under Reduce
  Motion; press and hold calls its handler.

## Decisions

D28 to D41 in `docs/DECISIONS.md`. The ones worth knowing:

- **D30:** capes and cloaks are sold under "Outfits" but go in the `back`
  slot, and the two auras go in an `aura` slot. So a cape can be worn over a
  sweater.
- **D32:** Shop previews are a still picture, to keep the list light.
- **D33:** a worn hat or crown stays on during a celebration; the free party
  hat only appears on a bare head.
- **D34:** switching breed is free and unlimited. This is a product decision
  Sahil can change in one place (`setBreed()`).
- **D36:** "Show in yard" picks the yard stage, not a unique house drawing.

## Follow-ups

1. **Run the iPhone checks** W1 to W7 in `docs/MANUAL_CHECKS.md`. W3 (the max
   outfit animating smoothly) is the one most likely to show a problem. If it
   stutters, the first things to simplify are the wings and the two auras.
2. **Unique house art:** draw each of the 15 houses, so "Show in yard" changes
   the house itself and not only the yard stage.
3. **Breed unlock pricing:** decide whether breeds stay free or cost treats.
4. **Bow color:** let a shop item recolor the Maltese's bow.
5. **Held items on the tail side:** the staff and wand are drawn in front of
   the tail on every breed. It reads fine, but a left-paw option would show
   more of the Golden Retriever's and Shiba's tails.
6. `assets/images/cutout/` is still untracked and untouched (D26).
7. `docs/BUGS.md` was not touched, as instructed. Bug B0 is still open.
