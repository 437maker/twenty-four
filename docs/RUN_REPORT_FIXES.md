# RUN_REPORT_FIXES.md — Phase A + B + C fixes

**Date:** 2026-11-16  
**Commits:** `639039b` (Phase B), plus this session (Phase A + C)

---

## Phase B: Bug fixes

Bugs fixed and committed in `639039b`:

| Bug | Description | Fix |
|-----|-------------|-----|
| B0 | Migration fails on existing DB | Constant default + backfill; `tryExec` only swallows "duplicate column name" |
| B1 | Treats earned uses UTC year | Added `'localtime'` to `strftime` in `getTreatEarnedForYear` |
| B2 | Target cooldown uses UTC parse | `new Date(targets_last_changed + 'T12:00:00')` |
| B4 | Milestones can't be re-earned | `milestones_claimed` cleared on streak reset |
| B5 | Shield covers any gap | `missedDays === 1` guard before consuming shield |
| B6 | Streak counts app opens | `last_app_open_date` guards `checkStreakOnOpen`; only `handleToggle` sets `last_active_date` |
| B7 | Repeat instances created for any date | 60-day cap in `ensureRepeatInstances` |
| B9 | Journal bonus farmable by re-saving | `isNewEntry` check; uses `last_reflection_bonus_count` |
| B12 | "Delete occurrence" does not stick | `repeat_exceptions` table; `deleteTask` writes exception |
| B13 | Moving occurrence leaves copy behind | `moveTask` writes exception for original date |
| B14 | Turning repeat on while editing does nothing | `updateTask` sets `is_master = 1` when `repeat_type` changes |

All have tests that were `test.failing` before the fix and are plain `test` after.

---

## Phase A: Future days never count as missed

**Changes:**

- `app/utils/dateHelpers.ts`: added `dayStatus(date, now?)` returning `'past' | 'today' | 'future'` using local calendar (Boston-safe).
- `app/utils/calculations.ts`:
  - `buildDayAnalytics`: sets `isFuture = true` and `adherence = 0` for future dates.
  - `weeklyAdherence`: excludes future days AND today (in-progress) from averages.
  - `mostBalancedDay` / `leastBalancedDay`: skip future days and today.
  - Added `getCurrentWeekDates(now?)`: returns Mon–Sun of the current calendar week (may include future days).
- `app/types/index.ts`: added `isFuture?: boolean` to `DayAnalytics`.
- `app/screens/AnalyticsScreen.tsx`:
  - Loads Mon–Sun of the current week (`daysThisWeek`) separately from the last-30-days data.
  - Weekly bar chart: future bars are outlined in soft purple ("planned"), today gets an amber in-progress ring.
  - Monthly dot grid: future dots are transparent with a soft border.
  - `daysWithTasks7` for pillar hours excludes future days and today.
  - Insight picker skips future days and today from the day-of-week analysis.
- `app/screens/analytics/MonthlySection.tsx`:
  - Future calendar cells get outlined circle, soft purple border.
  - Monthly summary cards (best day, worst day, avg adherence, streak) use past-only data.
  - Weekly bar chart: future week buckets render as outlined planned bars.
  - Tooltip shows "Planned: X tasks, Yh" for future days.
  - Navigation extended to allow viewing 1 month ahead.
  - Legend entry for "Planned" added.
- `app/screens/analytics/YearlySection.tsx`:
  - Heatmap cells for future dates render as outlined planned cells.
  - Aggregated stats (totalDaysTracked, overallAdherence, avgPillarHours) use `pastAnalytics` (future excluded).
  - Legend entry for "Planned" added.

**Tests added** (`__tests__/calculations.test.ts`):
- Future days excluded from `weeklyAdherence`.
- A week fully planned ahead does not lower the average.
- `dayStatus` with injected clocks, including Boston 11:30 PM edge case.
- `getCurrentWeekDates` Mon–Sun correctness on Mon / Wed / Sun inputs.
- `buildDayAnalytics` marks future dates with `isFuture = true`.

---

## Phase C: Export / Import

- `app/services/dataExport.ts`: added `importDataFromFile()` and `validateImportPayload()`.
  - User picks a `.json` file via `expo-document-picker`.
  - File is validated: checks `app: 'twenty-four'`, `format_version`, all required tables.
  - Restore runs in one SQLite transaction (atomic).
  - Returns a summary string "Restored: X tasks, Y journal entries".
- `app/screens/SettingsScreen.tsx`: added "Restore from backup" button with two-step confirmation.
- `expo-document-picker` added via `npx expo install expo-document-picker`.
- `docs/RELEASE_CHECKLIST.md`: created with tester menu removal steps and other pre-build checks.

---

## Status

- `tsc`: clean.
- Jest: 1013 tests, all green.
- `expo-doctor`: not run this session (run before ship).
