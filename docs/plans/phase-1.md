# Phase 1 plan: date and money correctness

Problem: date keys built with `toISOString()` are UTC. In Boston the UTC date
rolls over at 7pm (EST) or 8pm (EDT), so the app thinks it is tomorrow.

1. Pin jest to `America/New_York` (globalSetup) so date tests mean the same thing on any machine.
2. Write failing tests first, clock at 11:30pm local:
   streak increments on the local day, same-day reopen does not double count,
   weekly box covers the 7 local days, yesterday helper returns the local date,
   and a source guard that bans `toISOString().split('T')` in `app/`.
3. Replace UTC date keys with `dateHelpers` in: `useAppStore.ts`, `calculations.ts`
   (`getLastNDates`), `queries.ts` (`logStreakEnd`), `MonthlySection.tsx`, `HomeScreen.tsx`.
4. Leave real timestamps (`updated_at`, sync times, Google API params) in UTC.
5. `purchaseItem`: return `false` before charging if the item is already owned;
   flip the "documents a bug" test into a real assertion.
6. Show the red run on old code and the green run on new code.
