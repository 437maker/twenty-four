# HOW_IT_WORKS.md — four things to be able to explain

One page each. Every claim points at code you can open, and most are pinned by
a test you can run. Line numbers are as of 2026-11-13; if they have drifted,
search for the function name.

1. [Conflict detection](#1-conflict-detection)
2. [Repeat tasks: the master / instance model](#2-repeat-tasks-the-master--instance-model)
3. [The streak / shield / weekly-box state machine](#3-the-streak--shield--weekly-box-state-machine)
4. [Why Zustand](#4-why-zustand)

---

## 1. Conflict detection

**The question:** do two tasks on the same day overlap in time?

**Where:** `app/db/queries.ts`
- `findConflict(tasks, startTime, durationHours, excludeId?)` (line 439): does a
  *proposed* time slot overlap any existing task? Used live in the add/edit
  form (`ScheduleScreen.tsx:473`) to show the yellow warning.
- `getConflictingIds(tasks)` (line 462): which existing tasks overlap each
  other? Used to draw the orange dot on task cards (`ScheduleScreen.tsx:391`).

**The model.** A task is an interval on a number line measured in minutes since
midnight: `start = h*60 + m`, `end = start + duration*60`. "09:00 for 2 hours"
is `[540, 660)`.

**The whole algorithm is one line:**

```ts
if (newStart < tEnd && tStart < newEnd) return task;   // overlap
```

Two intervals overlap exactly when *each one starts before the other ends*.
It is easier to see from the opposite side: A and B do **not** overlap when A
ends before B starts, or B ends before A starts. Negate that and you get the
line above (De Morgan's law).

**Why `<` and not `<=`.** The intervals are half-open: the start is included,
the end is not. A 9:00 to 10:00 task and a 10:00 to 11:00 task share the
instant 10:00 but do not conflict. With `<=` every back-to-back schedule would
light up orange.

**Details worth knowing.**
- `excludeId` stops a task from conflicting with itself while you edit it.
- A conflict is a *warning*, not a rule. Saving is still allowed, because real
  days have overlaps (a call during a commute).
- `getConflictingIds` compares every pair: `n(n-1)/2` comparisons, O(n²). A day
  has maybe 10 to 20 tasks, so about 100 to 200 comparisons. A sort-and-sweep
  would be O(n log n) and not worth the extra code at this size. Say that out
  loud in an interview: knowing *when not to optimize* is the point.
- Overlap is not transitive. If A overlaps B and B overlaps C, all three are
  flagged even when A and C never touch.

**Limits.** Tasks cannot cross midnight (a 23:00 task lasting 2 hours has
`end = 1500`, past the end of the day, and is not compared with tomorrow's
tasks). Conflicts are computed per day, in memory, from tasks already loaded;
SQL is not involved.

**Tests:** `__tests__/repeatAndConflicts.test.ts`, `findConflict` and
`getConflictingIds` blocks (7 tests: all four overlap shapes, back-to-back,
self-exclusion, the A-B-C chain).

---

## 2. Repeat tasks: the master / instance model

**The question:** "Gym, every weekday" is one thing the user said, but it must
show up as a separate, separately-completable task on hundreds of days.

**Where:** `app/db/queries.ts`
- `createTask` (line 213): if `repeat_type` is not `'none'`, the row is saved
  with `is_master = 1`.
- `doesRepeatFire` (line 118): pure rule, "does this pattern fire on this date?"
- `ensureRepeatInstances(date)` (line 145): creates the missing instance rows for one date.
- `getTasksForDate(date)` (line 175): calls `ensureRepeatInstances`, then reads `WHERE is_master = 0`.
- `deleteTaskSeries(masterId)` (line 294): `DELETE WHERE id = ? OR master_id = ?`.

**The model.** Both kinds of row live in the one `tasks` table:

| | `is_master` | `master_id` | `date` | Shown to the user? |
|---|---|---|---|---|
| One-off task | 0 | NULL | its day | yes |
| **Master** (the template) | 1 | NULL | the day it was created (start of the series) | **never** |
| **Instance** (one occurrence) | 0 | id of its master | its own day | yes |

The master stores the rule (`repeat_type`, `repeat_days`). An instance is an
ordinary task that remembers where it came from. Because an instance is a real
row, it has its own `completed` flag: ticking Monday's gym does not tick Tuesday's.

**Lazy materialization.** Instances are not created up front. When any screen
asks for a date, `ensureRepeatInstances` runs first:

```
for each master:
    if the pattern fires on this date        (doesRepeatFire)
    and no row exists with this master_id and date
        → INSERT an instance copied from the master
```

A daily task created today costs one row. Rows appear only for days someone
actually looks at.

**Why lazy and not "create the next 365 now"?**
- A repeat has no end date, so there is no correct number to generate.
- Nothing has to run in the background to "top up" future days.
- The check `master_id + date already exists` makes the operation
  **idempotent**: running it once or fifty times gives the same result. That is
  what makes it safe to call on every read.

**Why not compute occurrences on the fly and store nothing?** Because each
occurrence needs somewhere to keep its own state (completed or not, and later
its own edits). A row is the simplest place.

**The patterns** (`doesRepeatFire`). It parses the date at local noon
(`T12:00:00`) so the weekday cannot shift across a timezone or DST boundary, then:
`daily` always; `weekdays` Mon to Fri; `weekends` Sat and Sun; `weekly` the same
weekday as the master's date; `custom` any weekday listed in `repeat_days`
(`"1,3,5"`, 0 = Sunday). A pattern never fires before the master's own date.

**Analytics must not create data.** `getTasksForDateRaw` (line 187) reads
without materializing, and the analytics queries use it. Otherwise opening a
chart for last year would invent hundreds of "planned but not done" tasks and
wreck the adherence numbers.

**Known weaknesses (all in `docs/BUGS.md`).** The design has one real flaw:
"this occurrence does not exist yet" and "the user deleted this occurrence"
look identical, because both are *the absence of a row*.
- **B12:** delete one occurrence → it is re-created on the next read.
- **B13:** move one occurrence → the original day gets a new copy.
- **B7:** browsing far into the future creates rows forever.
- **B14:** `updateTask` cannot turn an existing task into a master.

The standard fix is to make the absence explicit: an exceptions table
(`master_id, date`) that `ensureRepeatInstances` checks before inserting. That
is how calendar formats handle it too (iCalendar's `EXDATE`).

**Tests:** `__tests__/repeatAndConflicts.test.ts` (13 passing tests on a real
SQLite database for the model and the four patterns, plus two `test.failing`
cases that reproduce B12 and B13).

---

## 3. The streak / shield / weekly-box state machine

**The question:** every time the app opens, decide exactly once what happened
since the last open, and pay out exactly once.

**Where:** `app/store/useAppStore.ts`, `checkStreakOnOpen` (line 188). It is
called from the bootstrap in `App.tsx` after the database is migrated and
settings are loaded. Reward amounts are pure functions in
`app/utils/calculations.ts`: `isStreakMilestone` (39), `milestoneBonus` (45),
`weeklyBoxTier` (117), `weeklyBoxReward` (123).

**State it reads and writes** (all in the single `settings` row):
`last_active_date`, `current_streak`, `longest_streak`, `shields_owned`,
`milestones_claimed` (a JSON array such as `"[7,30]"`), `app_start_date`,
`last_box_date`.

### Part A: the streak

One input decides everything: how `last_active_date` compares with today.

```
                         ┌───────────────────────────────────────────────┐
 last_active == today  ──┤ SAME DAY: change nothing                      │
                         └───────────────────────────────────────────────┘
                         ┌───────────────────────────────────────────────┐
 last_active ==        ──┤ CONSECUTIVE: streak + 1                       │
   yesterday             │   update longest_streak if beaten             │
                         │   if 7 / 30 / 100 / 365 and not yet claimed   │
                         │     → pay 15 / 35 / 70 / 130 treats,          │
                         │       write ledger row, record as claimed,    │
                         │       raise pendingCelebration                │
                         └───────────────────────────────────────────────┘
                         ┌───────────────────────────────────────────────┐
 anything else         ──┤ MISSED                                        │
 (older, or never)       │   shield owned and streak > 0?                │
                         │     yes → shields - 1, streak kept,           │
                         │           raise shieldConsumed                │
                         │     no  → log the old streak to               │
                         │           streak_history, streak = 0,         │
                         │           raise streakJustBroke               │
                         └───────────────────────────────────────────────┘
 In every branch that is not SAME DAY: last_active_date = today
```

**The idempotency key is `last_active_date`.** Writing "today" into it is what
turns a second open on the same day into a no-op. This is the single most
important line in the function: without it, every app open would add a day.

**Why the date *must* be the local day.** The comparison is between date
strings. Until Phase 1 they were cut from `toISOString()`, which is UTC. In
Boston at 11:30pm the UTC date is already tomorrow, so "today" and "yesterday"
were both one day ahead: a consecutive open looked like a missed day (streak
reset to 0), and a second open looked like a new day (streak + 1 twice). Now
they come from `dateHelpers.ts`. See `__tests__/localDates.test.ts`.

**Milestones pay once.** `milestones_claimed` is a second idempotency guard:
reaching 7 is only rewarded if 7 is not already in the list.

### Part B: the weekly accuracy box

Runs after Part A on every open. It pays when **both** are true:
- at least 7 days since `app_start_date`, and
- at least 7 days since `last_box_date` (or no box yet).

Then: read tasks for the last 7 local days (`getLastNDates(7)`), compute each
day's adherence = completed hours ÷ planned hours, average over the days that
had any tasks (`weeklyAdherence`), and map to a tier:

| 7-day adherence | Tier | Treats |
|---|---|---|
| ≥ 80% | Gold | 20 |
| ≥ 60% | Silver | 12 |
| below | Basic | 5 |

Pay the treats, write a ledger row, and set `last_box_date = today`, which is
this part's idempotency key.

### How the UI hears about it

The function sets one-shot flags in the store: `pendingCelebration`,
`streakJustBroke`, `shieldConsumed`, `pendingBoxReward`. `HomeScreen` watches
them, shows the modal or banner, and clears the flag. The state machine never
touches the UI and the UI contains no reward logic.

### Honest limits (all in `docs/BUGS.md`)
- The streak counts **opening the app**, not completing anything (B6).
- A shield covers a gap of any length, not one day (B5).
- A milestone can only ever be earned once (B4).
- Settings writes and treat payments are separate statements, not one
  transaction (B3 describes the same weakness for purchases).

**Tests:** `__tests__/useAppStore.test.ts` (13: first open, same day,
consecutive, 7 and 30 day milestones, no double award, shield, reset, box
gating, gold payout, no double payout) and `__tests__/localDates.test.ts`
(11: the same decisions at 11:30pm local time).

---

## 4. Why Zustand

**The question:** several screens need the same live data (settings, today's
tasks, treat count, "a streak just broke"). Where does it live?

**Where:** `app/store/useAppStore.ts` (the whole store is one file, about 320
lines). 10 files import it.

**What the store is, and is not.** SQLite is the **source of truth**. The store
is an in-memory **cache of what the UI is currently showing**, plus transient
UI signals. Every action follows the same shape:

```ts
updateSettings: async (updates) => {
  await saveSettings(updates);                 // 1. write to SQLite
  set({ settings: { ...current, ...updates }}) // 2. mirror into the store
}
```

Write the database first, then update memory. If the app is killed between the
two, the next launch reloads from SQLite and nothing is lost.

**Why a global store at all, instead of `useState`?** Home shows the treat
count, the Shop spends treats, the Journal awards them. With local state each
screen would hold its own copy and they would disagree until re-queried.

**Why Zustand rather than the alternatives:**

| Option | Why not here |
|---|---|
| **React Context** | Every component that reads a context re-renders when *any* part of its value changes. With settings, tasks and flags in one context, ticking a task would re-render the whole app. Fixing that means splitting into many contexts and memoizing by hand. |
| **Redux Toolkit** | Solves the same problem with more ceremony: slices, action creators, a Provider, thunks for async. Worth it for large teams and time-travel debugging; overhead for one developer and one store. |
| **Zustand** (chosen) | One `create()` call. No Provider wrapping the app. Actions are plain `async` functions, which fits a store whose actions are mostly "await SQLite, then set". Components can subscribe to a slice of state. About 1 kB. |

**Two properties that mattered in practice:**

1. **Usable outside React.** `useAppStore.getState()` works anywhere.
   `App.tsx` uses it in bootstrap, and the tests call
   `useAppStore.getState().checkStreakOnOpen()` directly and assert on the
   result, with no component rendered and no test renderer. That is why the
   most important logic in the app has the most tests.
2. **`set` and `get` make the state machine readable.** `checkStreakOnOpen`
   reads settings, makes decisions, writes the database, and calls `set` once
   per branch. There is no reducer or action type between the decision and the
   state change.

**What it costs, honestly.**
- Nothing enforces structure. It is on the developer to keep SQL out of
  components and to keep the store and the database in step.
- Six of the ten call sites (Home, Schedule, Settings and Shop among them) call
  `useAppStore()` with no selector, which subscribes them to the *entire* store, so the fine-grained subscription advantage is not
  actually being used yet. The fix is one line per screen:
  `const settings = useAppStore((s) => s.settings)`.
- The store and SQLite can drift if someone writes to the database without
  updating the store. `refreshTreatCount` (line 173) exists precisely because
  the Shop writes treats through `queries.ts` and then has to tell the store.

**The one-sentence version for an interview:** "SQLite is the source of truth,
Zustand is a thin cache of what's on screen, and I picked it over Redux because
my actions are just async database calls and I wanted to test the state machine
without rendering React."
