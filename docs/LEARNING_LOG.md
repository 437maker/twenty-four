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

---

## Phase 3: ship-readiness that fits Expo Go

**What changed.**
- Deleted three dead placeholder screens and the unused `lottie-react-native`.
- **Export my data:** Settings writes all 7 tables to
  `twenty-four-backup-YYYY-MM-DD.json` and opens the share sheet
  (`app/services/dataExport.ts`). The old button passed the JSON as share
  *text*, which cannot be saved as a file.
- **Delete all my data:** red button, two confirmations, one transaction
  (`deleteAllData` in `queries.ts`, `resetAllData` in the store).
- **Accessibility** on Schedule and Journal: every control has a role and a
  spoken label, toggles announce their state, and small targets were raised to
  44×44pt. `TaskCard` was restructured (see below).
- **Tests:** 18 new (75 → 93), running on a real SQLite engine.
- **Verified, not fixed:** Google sign-in and Sentry in Expo Go. Verdicts and
  sources are in `docs/BUGS.md` (V1, V2).

**Why.** A user must be able to take their data out and to erase it. App Store
review requires the second, and both are what "data discipline" looks like in
practice.

**Concept 1: one list, two uses.** Export and wipe both loop over the same
`ALL_TABLES` constant. If they each had their own list, someone would add a
table to one and forget the other, and "delete all my data" would quietly leave
data behind. A test compares `ALL_TABLES` with `sqlite_master` (the tables
SQLite really has), so forgetting to register a new table fails the build.

**Concept 2: a transaction is all-or-nothing.** `deleteAllData` runs its
deletes inside `withTransactionAsync`. If the app dies half-way, SQLite rolls
back to the state before the first delete. The test proves it: a trigger forces
the last statement to fail, and afterwards every row is still there.

**Concept 3: test against the real thing when it is cheap.** The earlier shop
tests fake the database by matching SQL strings, so they prove the right
statements are *issued*, not that they *work*. Node 22.5+ ships a SQLite engine
(`node:sqlite`). `test-utils/realSqlite.ts` wraps it in the four async methods
expo-sqlite exposes, so the tests run the app's actual schema and queries with
no new dependency. The first time it ran, it found a real bug the mocks could
never see: the `updated_at` migration fails on any database that already has
tasks (B0 in `docs/BUGS.md`). It is reported, with a `test.failing` case that
will flip the day it is fixed.

**Concept 4: accessibility is structure, not decoration.** The old `TaskCard`
was a checkbox nested inside a button. VoiceOver treats a button as a single
element and hides its children, so a blind user could open a task but never
tick it. The fix was structural: the body and the checkbox are now siblings,
each with its own role (`button`, `checkbox`) and state (`checked`). Adding a
label alone would not have helped.

The wheel pickers use the `adjustable` role with increment/decrement actions,
which is how native iOS pickers present themselves: VoiceOver says
"Start hour, 9, adjustable" and a swipe up or down changes the value.

**Why 44×44pt.** Apple's Human Interface Guidelines give 44pt as the minimum
comfortable touch target. The visible checkbox is still a 28pt circle; the
*touchable* area around it is 44pt.

**Not verified by me.** The share sheet, the wipe-to-onboarding transition, and
how VoiceOver actually reads the screens. I confirmed the code type-checks,
the tests pass, and the iOS bundle builds (`npx expo export --platform ios`).
The device checks are sections 7 to 9 of `docs/MANUAL_CHECKS.md`.

---

## Phase 4: free iPhone install, no laptop needed

**What changed.** The project is linked to EAS (`@sahil_4/twenty-four`, free
plan) and one update is published to the `main` channel. `app.json` gained
`updates.url`, `extra.eas.projectId`, `owner`, and a `runtimeVersion` policy.
`eas.json` and an `npm run ship` script were added. `docs/DEPLOY.md` has the
routine, the sources, and the upgrade path.

**Why.** With `expo start`, the phone downloads the JavaScript bundle from the
laptop, so the laptop must be on and on the same network. EAS Update puts the
same bundle on Expo's servers instead.

**Concept: an app is two parts, and only one of them can be updated over the air.**
- The **native runtime**: compiled Swift/Objective-C/Kotlin, the JavaScript
  engine, and every native module (SQLite, notifications, secure storage).
  It can only change by installing a new app binary.
- The **JavaScript bundle**: all the code in `app/`, plus images. It is just a
  file the runtime loads at startup.

Expo Go *is* a prebuilt native runtime (the one for SDK 54). `eas update`
uploads a new JavaScript bundle. That is why this is free and needs no Apple
account: no new binary is ever built. It is also the reason for hard rule 1.
A library with its own native code would need a new runtime, and Expo Go's
runtime is fixed.

**Concept: the runtime version is the compatibility contract.** A bundle
written for one runtime can crash on another (it may call a native module that
is not there). So every update is tagged with a *runtime version*, and a
runtime only downloads updates with a matching tag. Expo Go for SDK 54
identifies itself as `exposdk:54.0.0`. The default policy (`appVersion`) would
tag updates `1.0.0`, which Expo Go would ignore. The `sdkVersion` policy tags
them `exposdk:54.0.0`.

**Concept: channel vs branch.** A *branch* is a list of updates (like a git
branch). A *channel* is a name the app asks for, and it points at a branch.
Here both are called `main`. The indirection exists so a production app can be
re-pointed to a different branch without rebuilding; this project does not
need it yet.

**The finding that matters.** Expo's docs say the App Store Expo Go is frozen
at SDK 54 and that SDK 55+ on a real iPhone requires `eas go` plus an Apple
Developer membership. The project is on SDK 54. So the usual advice ("keep
your SDK up to date") is wrong here: upgrading would end the $0 path. Being
able to explain *why you deliberately did not upgrade* is a better interview
answer than having upgraded.

**How it was verified.** From the laptop: the publish succeeded, and a request
to the update server with the headers Expo Go sends (runtime `exposdk:54.0.0`,
channel `main`, platform `ios`) returned HTTP 200 with the new update's ID.
**Not verified:** opening it on the iPhone with the laptop closed (section 2 of
`docs/DEPLOY.md`), and whether the app opened that way sees the same local data
as the one opened from the laptop. Export a backup before trying.
