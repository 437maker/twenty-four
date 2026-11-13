# BUGS.md — found, not yet fixed

Bugs and risks found while working on other things. Per the project rules these
are **reported, not fixed** until Sahil asks. Each has file, repro, and impact.

Line numbers are as of the commit that added the entry.

## Open

### B0. HIGH: upgrading a database that already has tasks breaks task creation
- **Where:** `app/db/database.ts`, Sprint 3 migration:
  `ALTER TABLE tasks ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'))`.
- **Why:** SQLite refuses to add a column with a non-constant default
  (`datetime('now')`) to a table that **already has rows**. The error is
  swallowed by `tryExec`, so the column is silently never created. On an empty
  table (fresh install) the same statement succeeds, which is why this hides.
- **Repro:** install the April build, add one task, then update to the current
  code. `tasks.updated_at` does not exist. `createTask`, `toggleTaskComplete`,
  `updateTask`, and `moveTask` all write that column and throw
  `table tasks has no column named updated_at`.
- **Impact:** high for anyone who had tasks before the Google sync code landed:
  they cannot add, complete, edit, or move tasks. No effect on fresh installs.
  "Delete all my data" does not repair it (the schema is kept as is).
- **How to check your phone:** if you can add and complete tasks today, your
  database has the column and you are not affected.
- **Proof:** `__tests__/dataLifecycle.test.ts`, the `test.failing` case under
  "known bug B0". It runs the real migration on a real SQLite database.
- **Fix idea:** add the column with a constant default, then backfill:
  `ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''` followed by
  `UPDATE tasks SET updated_at = datetime('now') WHERE updated_at = ''`.
  More generally, `tryExec` should only swallow "duplicate column name" errors
  and re-throw everything else, so a failed migration can never be silent again.

### B1. Yearly "treats earned" uses the UTC year
- **Where:** `app/db/queries.ts`, `getTreatEarnedForYear` (`strftime('%Y', created_at)`).
- **Repro:** earn treats at 9pm Boston time on Dec 31. `created_at` is written by
  SQLite's `datetime('now')`, which is UTC, so the row is stamped Jan 1.
- **Impact:** low. A few hours of treats per year land in the wrong year on the Yearly screen.
- **Fix idea:** `strftime('%Y', created_at, 'localtime')`.

### B2. Target-change cooldown mixes a local date with a UTC parse
- **Where:** `app/screens/SettingsScreen.tsx:86`, `new Date(settings.targets_last_changed)`.
- **Repro:** `targets_last_changed` is a local "YYYY-MM-DD". `new Date('2026-05-15')` parses
  it as UTC midnight (8pm the previous evening in Boston), so the 7-day cooldown
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

### B6. Two different streak rules exist, and the one in use counts app opens
- **Where:** `app/store/useAppStore.ts` (`checkStreakOnOpen`) and
  `app/screens/ScheduleScreen.tsx` (`handleToggle`).
- **Repro 1:** open the app every day and complete nothing. The streak grows,
  because `checkStreakOnOpen` only looks at `last_active_date`.
- **Repro 2:** leave the app open past midnight (no cold start), then complete a
  task. `handleToggle` sees `last_active_date !== today` and applies a *second*
  rule, `calculateNewStreak`, which looks at completed tasks. A milestone hit
  on this path shows the celebration but pays **no treats** and does not record
  the milestone as claimed.
- **Impact:** product decision plus an inconsistency. The streak means
  "opened the app" on one path and "completed a task" on the other.
- **Fix idea:** pick one rule and put it in one function.

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

### B9. The journal bonus can be farmed by re-saving the same entry
- **Where:** `app/screens/JournalScreen.tsx`, `handleSave` (calls
  `incrementReflectionCount()` on every save).
- **Repro:** write today's reflection, then open it and tap Save nine more
  times. `reflection_count` reaches 10 and the "+25 treats" bonus is paid, with
  only one entry in the journal.
- **Impact:** medium for the treat economy. `reflection_count` also stops
  meaning "number of entries". `settings.last_reflection_bonus_count` exists for
  this purpose but is never read.
- **Fix idea:** only increment when the entry for that date is new.

### B10. `expo-auth-session` is one major version behind the SDK
- **Where:** `package.json`: `"expo-auth-session": "~6.0.0"` (6.0.3 installed).
- **Repro:** `npx expo install --check` reports
  `expo-auth-session@6.0.3 - expected version: ~7.0.11` for SDK 54. It also
  reports patch updates for `expo` and `jest-expo`.
- **Impact:** unknown at runtime; Expo warns the project "may not work
  correctly". Only the Google sign-in path uses it (see V1 below).
- **Fix:** `npx expo install --fix`.

### B11. Google setup guide and code comments describe a flow that no longer exists
- **Where:** `app/services/googleAuth.ts` header comment and
  `app/SETUP_GOOGLE_CALENDAR.md` ("running inside Expo Go", "Expo's auth proxy").
- **Impact:** documentation only, but it will cost time. See V1.

### B12. "Delete this occurrence" on a repeating task does not stick
- **Where:** `app/db/queries.ts`, `ensureRepeatInstances` (called by
  `getTasksForDate`), together with `deleteTask`.
- **Why:** an occurrence is "missing" if no row has that `master_id` and date,
  and a missing occurrence is created on the next read. A deleted occurrence
  looks exactly like one that was never created.
- **Repro:** create a daily task, open tomorrow, long-press it → "Delete this
  occurrence". The Schedule reloads the day and the task is back (as a new,
  uncompleted row).
- **Impact:** medium. A visible feature that does nothing. It also means an
  occurrence you completed and then deleted returns as not completed.
- **Proof:** `__tests__/repeatAndConflicts.test.ts`, `test.failing` B12.
- **Fix idea:** record skipped dates (a `repeat_exceptions` table of
  `master_id, date`, or a `deleted` flag on the instance row) and have
  `ensureRepeatInstances` respect it.

### B13. Moving one occurrence of a repeating task leaves a copy behind
- **Where:** same mechanism as B12, with `moveTask`.
- **Repro:** create a weekly task on Monday, open it, "Move to" Tuesday. Tuesday
  now has the task. Go back to Monday: it has been re-created there too.
- **Impact:** medium. "Move" behaves like "copy" for repeating tasks, which
  inflates planned hours and lowers adherence.
- **Proof:** `__tests__/repeatAndConflicts.test.ts`, `test.failing` B13.
- **Fix idea:** the same exception record as B12 (moving = skip the original date).

### B14. Turning repeat on while editing an existing task does nothing
- **Where:** `app/db/queries.ts`, `updateTask` (only `createTask` sets `is_master`).
- **Repro (read from code, not run):** create a one-off task, edit it, choose
  Repeat → Daily, Save. `repeat_type` is updated but `is_master` stays 0, so
  `ensureRepeatInstances` never sees it and nothing repeats.
- **Impact:** low to medium. The form offers an option that silently has no effect.

## Verified, not fixed (Phase 3 step 5)

Neither of these could be run on a phone from this session. Each verdict below
says what it is based on.

### V1. Google sign-in in Expo Go on iOS: expect it NOT to work
**Verdict: not supported, by Expo's own documentation. Not device-tested.**

What the docs say:
- Expo's Google authentication guide covers two native libraries and states:
  "These libraries can't be used in Expo Go because they require custom native
  code." and "you'll need to use a config plugin in the app config and build a
  development build."
  Source: https://docs.expo.dev/guides/google-authentication/
- The `expo-auth-session` reference for SDK 54 marks the Google provider types
  as "Deprecated: See Google authentication" and says: "Where available, we
  recommend using a library supplied by your identity provider".
  Source: https://docs.expo.dev/versions/v54.0.0/sdk/auth-session/

What the installed code does (read, not run):
- `node_modules/expo-auth-session/build/providers/Google.js` builds the redirect
  URI from `Application.applicationId` plus `:/oauthredirect`. Inside Expo Go
  the application id is Expo Go's own, not this app's.
- `app/services/googleAuth.ts` passes a **Web** client ID. Google's Web clients
  only accept `https://` redirect URIs, so a custom-scheme redirect is refused.
- The header comment in `googleAuth.ts` says the flow uses "Expo's auth proxy
  (auth.expo.io)". `Google.useAuthRequest` in the installed version does not
  route through that proxy.

What this means: tapping "Connect Google Calendar" in Expo Go will most likely
end in a Google error page (redirect URI mismatch) instead of a sign-in. The
rest of the app is unaffected: `syncWithGoogle()` is a no-op when not connected.
The sync engine itself (`calendarSync.ts`, `googleCalendar.ts`) is plain `fetch`
and would work once a token exists.

What would make it work: a development build with
`@react-native-google-signin/google-signin`. That needs EAS Build and, on iOS,
an Apple Developer account, which breaks hard rule 1. **So Google Calendar sync
is not achievable under the $0 / Expo Go rule.** Decision for Sahil: keep the
code for the portfolio (it is a real two-way sync engine with tombstones and
conflict resolution) and hide the Settings button, or leave it as is.

To confirm on the phone (2 minutes): Settings → Connect Google Calendar, and
note the exact error text.

### V2. `@sentry/react-native` in Expo Go on iOS: JavaScript errors only
**Verdict: the SDK loads and can report JS errors; native crash reporting is
off. Based on the installed SDK source. Not device-tested, and neither Sentry's
nor Expo's setup page states the Expo Go limits directly.**

What the docs say:
- Sentry's Expo setup page: "You need Expo SDK 50 or newer." (SDK 54 qualifies.)
  It does not mention Expo Go.
  Source: https://docs.sentry.io/platforms/react-native/manual-setup/expo/
- Expo's Sentry guide does not mention Expo Go either, and its verification
  step is "Create a new release build of your app".
  Source: https://docs.expo.dev/guides/using-sentry/

> Update 2026-11-13: the SDK 58 upgrade moved Sentry to 8.28.0. The same
> reading holds there: the native module is looked up with a non-throwing
> `TurboModuleRegistry.get('RNSentry')` and the `isExpoGo()` guards are still
> present. Still read, not run on a phone.

What the installed code does (`@sentry/react-native` 7.2.0, read not run):
- The SDK has an explicit `isExpoGo()` check and uses it in several places.
  `dist/js/options.js` turns off the "native SDK not available" warning when
  running in Expo Go, and `dist/js/playground/modal.js` computes
  `isNativeCrashDisabled = isWeb() || isExpoGo() || __DEV__`.
- So the SDK is written to run in Expo Go without its native half.

What this means for 24:
- With `EXPO_PUBLIC_SENTRY_DSN` unset (today), `Sentry.init` is never called and
  `Sentry.wrap` / `captureException` do nothing. Nothing to break.
- With a DSN set, JS exceptions (including the `captureException` in
  `App.tsx` bootstrap) should be reported from Expo Go. Native crashes, app
  hangs, and symbolicated release stack traces will not.
- The `@sentry/react-native/expo` entry in `app.json` `plugins` is a config
  plugin. Config plugins only run when a native build is made, so in Expo Go it
  does nothing (see B8).
- A Sentry DSN is **not a secret** (it only allows sending events), so reading
  it from `EXPO_PUBLIC_SENTRY_DSN` does not break hard rule 2.

To confirm on the phone: follow "Sentry verification" in `TESTING_NOTES.md`.

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
