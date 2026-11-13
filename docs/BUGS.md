# BUGS.md — found, not yet fixed

Bugs and risks found while working on other things. Per the project rules these
are **reported, not fixed** until Sahil asks. Each has file, repro, and impact.

Line numbers are as of the commit that added the entry.

## Open

### B1. Yearly "treats earned" uses the UTC year
- **Where:** `app/db/queries.ts`, `getTreatEarnedForYear` (`strftime('%Y', created_at)`).
- **Repro:** earn treats at 9pm Boston time on Dec 31. `created_at` is written by
  SQLite's `datetime('now')`, which is UTC, so the row is stamped Jan 1.
- **Impact:** low. A few hours of treats per year land in the wrong year on the Yearly screen.
- **Fix idea:** `strftime('%Y', created_at, 'localtime')`.

### B2. Target-change cooldown mixes a local date with a UTC parse
- **Where:** `app/screens/SettingsScreen.tsx:86`, `new Date(settings.targets_last_changed)`.
- **Repro:** `targets_last_changed` is a local "YYYY-MM-DD". `new Date('2026-05-15')` parses
  it as UTC midnight (8pm the previous evening in Boston), so the 4-day cooldown
  ends 4 to 5 hours early.
- **Impact:** low. The cooldown is slightly short.
- **Fix idea:** parse with `T12:00:00` like the rest of the app, or compare date strings.

### B3. Purchases are not atomic
- **Where:** `app/db/queries.ts`, `purchaseItem` and `purchaseShield`.
- **Repro:** the function runs three separate statements (deduct treats, insert
  owned item, write ledger row). Kill the app between the first and second.
- **Impact:** medium, rare. Treats are gone but the item is not owned and the
  ledger has no record.
- **Fix idea:** wrap the three statements in `db.withTransactionAsync`.

### B4. Milestone bonuses can never be re-earned
- **Where:** `app/store/useAppStore.ts`, `checkStreakOnOpen` (`milestones_claimed`).
- **Repro:** reach a 7-day streak (bonus paid), break it, build to 7 again. No bonus.
- **Impact:** product decision, not a crash. Documented by the test
  "does not re-award an already-claimed milestone".
- **Question for Sahil:** is this intended? If not, clear `milestones_claimed` on reset.

### B5. One shield covers a gap of any length
- **Where:** `app/store/useAppStore.ts`, missed-day branch of `checkStreakOnOpen`.
- **Repro:** hold a 10-day streak and one shield, stay away for a month, open the app.
  The streak is still 10 and one shield is gone.
- **Impact:** product decision. A shield is described as absorbing "a missed day".
- **Fix idea:** consume one shield per missed day, or cap the gap a shield can cover.

### B6. The streak counts app opens, not completed work
- **Where:** `app/store/useAppStore.ts`, `checkStreakOnOpen`.
- **Repro:** open the app every day and complete nothing. The streak grows.
- **Impact:** product decision. `calculateNewStreak` in `calculations.ts` (which
  looks at completed tasks) exists but nothing calls it.

### B7. Repeat instances are created for any date you look at
- **Where:** `app/db/queries.ts`, `ensureRepeatInstances` (called by `getTasksForDate`).
- **Repro:** create a daily task, then browse the Schedule far into the future.
  Every date visited gets a permanent row.
- **Impact:** low. Slow growth of the tasks table, plus one query per master per date.
- **Fix idea:** cap how far ahead instances are materialized.

### B8. Sentry plugin config is a placeholder and listed twice
- **Where:** `app.json`, `plugins`.
- **Repro:** read the file. `organization` is `REPLACE_WITH_YOUR_SENTRY_ORG_SLUG`,
  and both `@sentry/react-native/expo` and `@sentry/react-native` are listed.
- **Impact:** none in Expo Go (config plugins only run in native builds). It would
  matter for a real build.

## Fixed

### F1. Date keys used the UTC day (fixed in Phase 1)
- **Where it was:** `useAppStore.ts` (`getTodayStr`, `getYesterdayStr`), `calculations.ts`
  (`getLastNDates`), `queries.ts` (`logStreakEnd`), `MonthlySection.tsx` (`todayStr`),
  `HomeScreen.tsx` (yesterday's adherence).
- **Repro on the old code:** open the app at 11:30pm in Boston with a 3-day streak
  last active yesterday. The app computed "today" as tomorrow's date and
  "yesterday" as today's, did not recognise the consecutive day, and **reset the
  streak to 0**. A second open the same evening after a morning open
  **incremented the streak twice in one day**. The weekly box read the wrong
  seven days and could pay out one evening early.
- **Tests:** `__tests__/localDates.test.ts` (8 of 11 failed before, all pass after).

### F2. `purchaseItem` double-charged for an owned item (fixed in Phase 1)
- **Where it was:** `app/db/queries.ts`, `purchaseItem`.
- **Repro on the old code:** call `purchaseItem` twice with the same id. Treats
  were deducted twice; only one row was inserted (`INSERT OR IGNORE`).
- **Tests:** `__tests__/queries.test.ts`, two "already-owned item" tests (both
  failed before, both pass after).
