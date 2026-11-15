# Run report: delivery fix and art polish (2026-11-15)

## 1. Treat deliveries

| Item | Status |
|---|---|
| Bug: a forced delivery showed no recommendation | Fixed (D71) |
| Every content id renders a non-empty card | Tested: all ids, in the component |
| Data threshold (7 days, 10 tasks, 3 journals) and progress hint | Done (D72) |
| Tester "Force delivery" bypasses the threshold | Done, tested |
| Opening animation, Reduce Motion shows the card directly | Done (D73) |

**The bug.** The prompt's description of what the phone showed was left as a
placeholder, so the cause was found by reading the code. Tapping the box
marked the row opened; the store then re-read only unopened rows; the card
unmounted before its content was ever drawn. What the phone showed was a box,
then nothing (and +3 bones). If what you saw was different, say what it was
and that path gets its own look.

One thing was left as it is on purpose: if a journal entry in the last 7 days
contains crisis language, a delivery (forced or scheduled) is the support
card, not a recommendation. If the phone was tested right after the support
card check in MANUAL_CHECKS, that entry would still have been in range.

New tests: `__tests__/deliveryCard.test.tsx`, 30 tests.

## 2. Art

Three review rounds, each rendered and looked at on all six breeds and at
the smallest size.

| Round | Found | Changed |
|---|---|---|
| 0 (as it was) | Stadiums: flat slabs cut off at the right edge, goalpost and hoop drawn over the door, crowd dots drifting into the sky, nothing that read as a building next to the other 15 houses. Suits: a pattern on a shirt, small emblems, no masks, capes on only half and those square-cut. Aurora Helm was a blue blob on the topknot; Orbit Gauntlet was a staff; Phase Mask and Spark Visor hid the eyes; Clock Shield covered the Titan emblem; the Solar cape vanished on a pale background. | Everything redrawn |
| 1 | Ballpark roof crowded (towers, flags, scoreboard). Rink blue line ran along the building's edge. Aurora Helm's plume clipped at the top and the helm too small. Orbit Gauntlet's star sat on the chest emblem. Solar suit plain. Phase Mask read as glasses. | Towers off the ballpark, flags moved out; line moved; helm lowered, enlarged, plume shortened; star moved outside; a halo of rays behind the sunburst; no rims round the Phase Mask's eye holes |
| 2 | Rink goal and crease ran off the right edge. Gold rims round the Titan mask's eyes read as glasses. | Goal moved left; gold on the outer edge only |
| 3 | Titan suit with a helmet and bat, all four states, six breeds: nothing clips. | None needed |

Sheets:
- `docs/companion/houses/stadiums.png`, `stadiums-small.png`, and one large
  picture per stadium (`house_football_stadium.png`, `house_baseball_park.png`,
  `house_basketball_arena.png`, `house_hockey_rink.png`)
- `docs/companion/items/hero-sets-<breed>.png` for all six breeds, and
  `hero-sets-64.png`
- Every older sheet that shows a stadium or a hero item was re-rendered.

What I did not like about the suits (the prompt left this blank too, so this
is my own list): they read as printed T-shirts; emblems were about 10 units
across on a 90-unit chest; half had no cape; none had a mask; three of the
face accessories covered the eyes, which is most of what makes the dog cute.

## 3. Checks

- `tsc --noEmit`: clean
- `jest`: 790 tests in 19 suites, all passing (760 before this run)
- iPhone checks added: MANUAL_CHECKS E1 to E6. Not run on a device in this run.

## 4. Published

- Update group `1e22b7a1-6201-43e7-867c-7cafab3929af` (branch main, iOS, runtime exposdk:58.0.0), from commit `19dbc1f`.
- To roll back: `npx eas-cli update:republish --group 6c6b2cc4-9793-4fcc-a1b3-044ec7459ea2`
