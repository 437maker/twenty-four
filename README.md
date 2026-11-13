# Twenty-Four — Time Balance Tracker

> A personal time-balance app built with React Native. It shows how closely your day matched the plan, across the four things a day is made of.

---

## What It Does

Most productivity apps track tasks. **Twenty-Four** tracks *balance*.

Your day is divided into four life pillars: **Work**, **Personal**, **Sleep**, and **Care** (optional). You plan your hours across those pillars, log your day, and the app shows how closely reality matched the plan. Over days, weeks, and months, patterns emerge that you can act on.

Nova, a German Shepherd puppy, is the emotional anchor: streaks, treats, a shop, and a yard that upgrades as you go.

---

## Engineering snapshot

Every number below was measured on **2026-11-13**. The command that produces it is next to it, so it can be re-checked.

| What | Value | How it was measured |
|---|---|---|
| Automated tests | **115** in 7 files, all green | `npm test` |
| of which assert working behavior | 112 | |
| of which mark known, unfixed bugs | 3 (`test.failing`, see [docs/BUGS.md](docs/BUGS.md)) | `grep -rn "test.failing(" __tests__` |
| Statement coverage, `app/db` | **68.9%** (lines 70.8%) | `npm run test:coverage` |
| Statement coverage, `app/store` | **64.0%** (lines 66.3%) | same |
| Statement coverage, `app/utils` | **26.7%** (lines 24.4%) | same |
| Statement coverage, all three | 52.8% (lines 55.1%) | same |
| App source | 12,352 lines in 31 TypeScript files (9,944 excluding blank and comment-only lines) | `git ls-files 'app/*.ts' 'app/*.tsx' App.tsx \| xargs cat \| wc -l` |
| Test source | 1,953 lines | `cat __tests__/*.ts test-utils/*.ts \| wc -l` |
| SQLite tables | 7 | `ALL_TABLES` in `app/db/queries.ts`, checked against `sqlite_master` by a test |
| Type errors | 0 (strict mode) | `npx tsc --noEmit` |

What the coverage numbers do **not** say: screens are not rendered in tests, `notifications.ts` is at 0%, and the Google sync services are outside the measured folders. Coverage is concentrated where a bug costs the most: streaks, purchases, dates, export, wipe, and repeat tasks.

### Bugs found and fixed with a failing test first

| Bug | Measured effect on the old code | Test |
|---|---|---|
| **Date keys were UTC, not local.** `toISOString()` gives the UTC day, which in Boston is already "tomorrow" from 7 or 8pm. | With the clock pinned to 11:30pm Eastern: a 3-day streak was **reset to 0**; a second open the same evening **incremented the streak twice**; the weekly reward read the wrong 7 days and could pay one evening early. 8 of 11 new tests failed. | `__tests__/localDates.test.ts` |
| **Double charge.** `purchaseItem` deducted treats for an item the user already owned; only the UI prevented it. | Two calls charged 50 treats for one 25-treat item. | `__tests__/queries.test.ts`, `__tests__/dataLifecycle.test.ts` |

### Bugs found and reported, not yet fixed

Fifteen entries in [docs/BUGS.md](docs/BUGS.md), each with file, repro, and impact. Three have an executable repro in the test suite. The most serious, found by running the real schema on a real SQLite engine in tests: a migration that silently fails on any database that already contains tasks (B0).

### How it works

[docs/HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md) explains conflict detection, the repeat-task master/instance model, the streak / shield / weekly-box state machine, and why Zustand, with code references.
[docs/LEARNING_LOG.md](docs/LEARNING_LOG.md) records what changed in each phase and the concept behind it.

---

## Features

### Home
- Compact yard scene with drifting clouds and a day/night sky; the yard upgrades with the best House item you own
- **Balance score** (0 to 100): reaching a target earns full credit, going over a target lowers the score
- Pillar bars with an **overflow segment**, so 10 hours of Work on an 8 hour target looks different from 8
- Streak badge, yesterday's adherence, treat count, "Plan Tomorrow" prompt

### Daily Schedule
- Build your day task by task, assigning each to a pillar with a start time and duration
- Check tasks off as you complete them
- Move a task to another day with the inline day strip
- Repeat tasks daily, on weekdays, weekends, weekly, or on custom days
- Conflict detection flags overlapping tasks
- Goal progress bar per pillar: planned vs completed vs target

### Analytics Dashboard
1. Rotating insights based on recent patterns
2. Summary cards: streak and average adherence
3. Weekly bar chart: last 7 days, tap a bar for a breakdown
4. Monthly dot grid: last 30 days, colour-coded by adherence
5. Pillar balance bar for the week
6. Streak history: your last 5 completed streaks
7. Daily breakdown: last 14 days, expandable
8. Monthly analytics: month navigator, weekly chart, pillar breakdown, calendar grid
9. Yearly overview: 12-month trend, pillar balance vs targets, 52×7 heatmap

Charts are built from plain `View`s. There is no charting library.

### Streaks and reward economy
- Daily streak with milestone bonuses at 7, 30, 100, and 365 days (15 / 35 / 70 / 130 treats)
- Weekly accuracy box from 7-day adherence: Gold (≥80%, 20 treats), Silver (≥60%, 12), Basic (5)
- Journal bonus: 25 treats per 10 reflections
- Streak Shields absorb a missed day
- Shop with 46 items across outfits, accessories, houses, and shields; every earn and spend is written to a ledger table

### Journal
- One reflection per day with a rotating prompt
- Mark a day as an exception day (sick day, holiday)

### Settings and your data
- Target hours per pillar, Care pillar on/off, morning and evening reminders
- **Export my data:** one JSON file with every table, via the share sheet
- **Delete all my data:** two confirmations, one transaction, back to onboarding

### Accessibility
- Schedule, Journal, and Home: spoken labels, roles, and states for VoiceOver; 44×44pt touch targets
- All looping animation stops when the phone's Reduce Motion setting is on

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.88 + Expo SDK 58 (runs in Expo Go) |
| Language | TypeScript, strict mode |
| Database | SQLite via `expo-sqlite`: fully local, no backend, no account |
| State | Zustand |
| Navigation | React Navigation (native stack + bottom tabs) |
| Dates | date-fns |
| Charts | Custom, `View` + `StyleSheet` |
| Animations | React Native `Animated` API with the native driver |
| Testing | Jest + jest-expo; database tests run on a real SQLite engine (`node:sqlite`) |
| Delivery | EAS Update to Expo Go (no native build) |

---

## Project Structure

```
App.tsx                    # Bootstrap: migrate DB, load settings, streak check, notifications
app/
├── components/            # TaskCard, WheelPicker, PillarSelector, CustomSlider, NovaCompanion
├── data/                  # shopCatalog.ts, journalPrompts.ts
├── db/
│   ├── database.ts        # Schema and idempotent migrations
│   └── queries.ts         # Every SQL statement in the app
├── screens/
│   ├── analytics/         # MonthlySection.tsx, YearlySection.tsx
│   ├── onboarding/
│   ├── HomeScreen.tsx  ScheduleScreen.tsx  AnalyticsScreen.tsx
│   ├── JournalScreen.tsx  ShopScreen.tsx  SettingsScreen.tsx
│   └── CalendarSettingsScreen.tsx  MainTabs.tsx
├── services/
│   ├── dataExport.ts      # Build the export file and open the share sheet
│   ├── googleAuth.ts  googleCalendar.ts  calendarSync.ts
├── store/useAppStore.ts   # Zustand store: settings, today's tasks, streak state machine
├── types/index.ts
└── utils/                 # calculations.ts, dateHelpers.ts, notifications.ts
__tests__/                 # 7 test files
test-utils/realSqlite.ts   # Real in-memory SQLite behind the expo-sqlite API
docs/                      # HOW_IT_WORKS, BUGS, LEARNING_LOG, DEPLOY, MANUAL_CHECKS, plans/
```

---

## Running Locally

**Prerequisites:** Node.js 22.5 or newer (the tests use the built-in `node:sqlite`), npm, and Expo Go on your phone.

```bash
npm install
npx expo start        # scan the QR code with the iPhone camera
```

```bash
npm test              # 115 tests
npm run test:coverage
npx tsc --noEmit
```

The project is on **Expo SDK 58**. Expo Go on iOS only runs the newest SDK, so the project has to be upgraded each time Expo Go moves on. The routine is in [docs/DEPLOY.md](docs/DEPLOY.md), and the record of the 54 → 58 upgrade is in [docs/UPGRADE_SDK58.md](docs/UPGRADE_SDK58.md).

To publish an over-the-air update that opens in Expo Go without the laptop: `npm run ship -- --message "what changed"` ([docs/DEPLOY.md](docs/DEPLOY.md)).

---

## Google Calendar Sync (built, not usable in Expo Go)

The repository contains a two-way sync engine (`app/services/calendarSync.ts`): push pending tasks, pull changes with a sync token, tombstones for deletes, last-write-wins on conflicts.

**It cannot be signed in to from Expo Go.** Expo's documentation states that Google authentication needs a development build, and this project deliberately stays on Expo Go with no paid accounts. The app works fully without it: sync is a no-op when no account is connected. Details and sources: V1 in [docs/BUGS.md](docs/BUGS.md).

---

## Built With

This project was developed collaboratively with **[Claude](https://claude.ai) (Anthropic)** as an AI development partner. Writing precise technical briefs, reviewing generated code, making architecture decisions, and directing the build is itself a skill, and this project was a hands-on exercise in developing it.

---

## License

MIT
