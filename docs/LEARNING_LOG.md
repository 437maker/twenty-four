# LEARNING_LOG.md

One entry per phase: what changed, why, and the one concept to be able to
explain in an interview.

---

## Phase 0: save the work

**What changed.** Seven commits took the repo from "Phase 1.0" (April) to the
full Sprint 1-3 code. Toolkit files that had nothing to do with the app moved
out of `app/`. `.gitignore` now covers `.env*` and `coverage/`.

**Why.** Months of work existed only on one laptop. Nothing else matters until
that is fixed.

**How the commits were split.** By layer, in dependency order: config → data
layer → Google sync → store and bootstrap → screens → tests → docs. Each commit
only depends on the ones before it. The honest caveat: the sprints were written
into the same files over time, so the commits are grouped by *layer*, not by
*sprint*, and the middle commits were not individually compiled.

**Concept: a commit is a unit of explanation.** `git log` should read like a
table of contents. "Add data layer", "Add sync", "Add tests" tells a reviewer
how the system is built before they open a file. One 7,000-line commit tells
them nothing.

---

## Phase 1: date and money correctness

**What changed.**
- Every date key ("YYYY-MM-DD") now comes from `app/utils/dateHelpers.ts`, which
  formats in local time. Five sites used `toISOString().split('T')[0]` before.
- `purchaseItem` checks ownership before it touches the treat balance.
- Jest is pinned to `America/New_York` (`jest.global-setup.js`).
- 12 new tests (51 → 63).

**Why.** `toISOString()` always returns UTC. Boston is UTC-4 or UTC-5, so from
7 or 8pm until midnight the UTC date is already tomorrow. The app keyed streaks
by that date. Measured on the old code with the clock pinned to 11:30pm: a 3-day
streak was reset to 0, and a same-evening reopen incremented the streak twice.

**Concept: an instant is not a calendar day.** A `Date` is an instant (a number
of milliseconds since 1970). "May 15" is a label that depends on where you are
standing. Converting an instant to a day *requires* a timezone, and
`toISOString()` silently picks UTC. The rule used in this codebase:
- **Date keys** (which day does this task or streak belong to?) → local time, via `dateHelpers`.
- **Timestamps** (when exactly did this row change?) → UTC ISO strings. `updated_at`
  and sync times stay UTC on purpose, because they are compared with Google's
  UTC timestamps and must not depend on where the phone is.

**Second concept: put the guard next to the money.** The shop screen already hid
the Buy button for owned items, so users never saw the double charge. But the
function that deducts treats trusted its caller. A rule enforced only in the UI
is a rule any new caller can break. The check now lives inside `purchaseItem`.

**How the tests prove it.** Tests were written first and run against the old
code (10 failed), then against the fix (all pass). One test scans the source of
`app/` for the UTC date-key pattern, because screens are not rendered in jest
and the bug could otherwise come back in a screen file unnoticed.

**Still open.** `purchaseItem` is three separate SQL statements, not a
transaction. See B3 in `docs/BUGS.md`.

---

## Phase 2: home screen redesign

**What changed.** `app/screens/HomeScreen.tsx` was replaced by the redesign that
was waiting in `_incoming/`: a compact yard (30% of the screen) with drifting
clouds and a day/night crossfade, five yard stages driven by the best House item
owned, a balance score next to Nova, overflow segments on the pillar bars, and
separate colors for streak (rose), Care (amber) and treats (pink). 12 new tests
(63 → 75) cover the three pure helpers the screen exports. The ten small
behaviors that changed are listed in `docs/plans/phase-2.md`.

**Why.** The old bars capped at 100%, so 12 hours of Work on an 8 hour target
looked the same as 8. For an app about *balance*, overwork has to be visible.
The balance score makes that a number: reaching a target earns 1 point, and
every 100% over the target costs half a point (capped), averaged over the
active pillars. Work 12/8 and Sleep 8/8 scores 88, not 100.

**Concept: why `scaleX` instead of `width`.** React Native runs your JavaScript
on one thread and draws the screen on another (the native UI thread). An
animation can be driven from either side:
- `useNativeDriver: false`: JavaScript computes every frame and sends it across.
  If JS is busy (a SQLite read, a Google sync), frames arrive late and the
  animation stutters.
- `useNativeDriver: true`: the whole animation is handed to the native side once,
  up front. It keeps running at 60fps even while JS is blocked.

The catch: the native driver can only animate properties that do not change
layout, which means `transform` and `opacity`. `width` changes layout (it can
push siblings around), so it is not allowed. The bars therefore have a fixed
width and grow by `transform: [{ scaleX }]` from 0 to 1, with
`transformOrigin: 'left'` so they grow from the left edge instead of the middle.
The old bar animated `width` with `useNativeDriver: false`.

**Second concept: keep logic out of components.** `calculateBalanceScore`,
`yardStageFromHouseTier` and `isNightTime` are plain functions exported from the
screen file. They take numbers and return numbers, so they are tested without
rendering anything. The component only wires them to state.

**Not verified by me.** Everything visual. Jest does not render pixels. The
check list in `docs/MANUAL_CHECKS.md` (section "Phase 2") has to be run on the
iPhone.
