# Phase 2 plan: home screen redesign

1. Diff `_incoming/HomeScreen.tsx.pending` against the current `app/screens/HomeScreen.tsx`
   and list every behavior the old screen had that the new one does not.
2. Move both pending files into place with `git mv` (keeps history), drop `_incoming/`.
3. `npx tsc --noEmit` and `npm test` (expect 63 + 12 = 75).
4. Write the manual check list for Expo Go (`docs/MANUAL_CHECKS.md`).

## What the old screen did that the new one does not

Every Sprint 2 feature survives (both modals, both banners, gear, Plan Tomorrow,
pull to refresh, Google sync on focus, treat bounce, navigation taps). These
smaller behaviors changed. None was restored; say the word and any of them can be.

| # | Old behavior | New behavior |
|---|---|---|
| 1 | Nova sleeps from **9pm** to 7am | Nova sleeps from **10pm** to 7am |
| 2 | Streak badge pulses **all the time** while streak > 0 | Pulses **only when the streak goes up** |
| 3 | Nova stays "celebrating" until the milestone modal is closed | Celebrates in the yard for **5 seconds**, modal unchanged |
| 4 | Separate "Today's Tasks" card ("3 of 5 completed") | Folded into the bar card header ("3/5 tasks →") |
| 5 | Treat count is a small badge top-left of the header | Its own pink card with a Shop button |
| 6 | Header is a `LinearGradient` (sky blue → cream) | Flat sky color with yard art; gradient no longer used here |
| 7 | Pillar order: Work, Personal, Sleep, Care | Work, Personal, Care, Sleep |
| 8 | Bars cap at 100% and show "9.0 / 8h" | Overflow segment plus "+1h over" |
| 9 | Nova is "happy" only after a task is completed | Also happy when streak ≥ 3 |
| 10 | Nova drawn at 200pt with her name under the image | About 150pt in the yard; name moved to the row below |

`expo-linear-gradient` is still used by `ShopScreen.tsx`, so the package stays.
