# Claude Code Prompts — Sprints 3, 4, 5
*Paste each prompt into Claude Code from the `twenty-four/` repo root. They assume the Sprint 2 work is committed first (do that before running anything else).*

## How to use these prompts

Each sprint below is a self-contained brief for Claude Code with full context, acceptance criteria, and an explicit "do not do this" list. The goal is that Claude Code can execute the sprint mostly autonomously and stop you to ask only the questions that genuinely need a human decision. They are deliberately verbose — that's the format that produces better results.

Before any sprint, run this once:

```
Commit the current uncommitted work as Sprint 2. Read STATUS_REPORT.md
for context on what's in flight. Group changes into 3–5 logical commits
with descriptive messages (e.g. "feat(shop): add 4-category, 5-tier
cosmetics catalog with shield mechanic", "feat(analytics): add monthly
and yearly analytics sections", etc.). Do not change behavior — just
commit what's there. After committing, push to origin/main.
```

Also rotate the GitHub PAT inside `.git/config` before you push — that token is currently exposed.

---

## Sprint 3 — Ship-Readiness

**Goal of this sprint.** Take the app from "works on my phone" to "I would let strangers use this." No new user-facing features. Tests, error tracking, data export, account-deletion flow, accessibility pass, app store assets, EAS Build setup, and removal of dead code.

**Why this order.** Every additional feature you build before this work makes Sprint 4 and 5 harder. Tech debt compounds. Ship-readiness work is also the cheapest insurance you can buy against a launch-day disaster.

### Prompt to paste into Claude Code

```
You are working on the "24" habit tracker app — a React Native / Expo
SDK 54 / TypeScript / SQLite local-first app. Sprint 1 and Sprint 2
are committed. Read App.tsx, app/store/useAppStore.ts, app/db/queries.ts,
app/utils/calculations.ts, app/utils/notifications.ts and app/types/index.ts
fully before writing anything. Read STATUS_REPORT.md and FINANCIAL_SUMMARY.md
in the repo root for context on the product and the scope decisions.

Sprint 3 is ship-readiness. There are NO new user-facing features.
Do all of the following, in order, in small commits:

1. Test harness setup.
   - Add jest + jest-expo + @testing-library/react-native as devDependencies.
   - Configure jest.config.js with the jest-expo preset, set up
     transformIgnorePatterns for RN packages, add a basic setup file.
   - Add an `npm test` script and `npm run test:watch`.
   - Verify a trivial smoke test passes: `expect(1).toBe(1)`.

2. Unit tests for the high-risk pure logic. Aim for ~80% branch coverage
   on these files, no less:
   - app/utils/calculations.ts: calculatePlanAdherence, getHoursPerPillar,
     isStreakMilestone, milestoneBonus, weeklyBoxTier, weeklyBoxReward,
     getDatesForMonth, getCalendarWeeksForMonth, buildDayAnalytics,
     weeklyAdherence, mostBalancedDay, leastBalancedDay.
   - app/utils/dateHelpers.ts: every export.
   - app/db/queries.ts: findConflict, getConflictingIds, doesRepeatFire
     (extract if needed to make testable — it's currently a private fn).
   Use date-fns mocking or Date.now() stubs where needed. No DB needed —
   these are all pure functions.

3. Integration tests for the streak/shield/box state machine. Mock
   getDatabase() with an in-memory better-sqlite3 instance and run:
   - First-open ever (no last_active_date): sets app_start_date, doesn't
     touch streak.
   - Consecutive day: increments streak, awards milestone bonus once at
     7/30/100/365 and never re-awards.
   - Skipped day with no shield, streak > 0: logs streak end, resets
     to 0, sets streakJustBroke true.
   - Skipped day with shield owned: consumes one shield, preserves
     streak, sets shieldConsumed true.
   - Same-day re-open: no streak change.
   - Weekly box fires once per 7 days based on adherence; never fires
     before app_start_date + 7 days.

4. Sentry crash reporting.
   - Install sentry-expo, follow the EAS-managed setup, gate on
     __DEV__ so it's disabled in dev.
   - Add Sentry.captureException calls inside the catch blocks in
     notifications.ts and in App.tsx bootstrap.
   - Do NOT add an opt-out toggle in this sprint — Sentry sends only
     stack traces and device metadata, no user content. Document this
     in the privacy policy stub (see step 8).

5. Data export from Settings.
   - Add an "Export my data" button to SettingsScreen.
   - Calls getAllTablesForExport(), JSON.stringify(result, null, 2),
     writes to FileSystem.documentDirectory + 'twenty-four-export-{date}.json',
     and shares via expo-sharing.
   - Show a one-line "Exported to Files / share sheet" confirmation.
   - Test: tap the button, verify the file appears in the share sheet.

6. Delete-my-data flow.
   - Add a destructive "Delete all my data" button to SettingsScreen
     (red, requires a 2-step confirmation modal with the text
     "I understand this cannot be undone").
   - Drops and recreates all tables, clears Zustand state, navigates
     back to onboarding.
   - This is required by App Store guidelines for any app that
     persists user data, even locally.

7. Dead code cleanup.
   - Delete AnalyticsPlaceholder.tsx, JournalPlaceholder.tsx,
     ShopPlaceholder.tsx (the real screens have replaced them).
   - Verify no imports reference these — run `grep -r "Placeholder"
     app/` and confirm zero hits in production code.
   - Remove lottie-react-native from package.json since nothing uses it.
   - Remove scheduleDailyNotification legacy shim from notifications.ts
     after confirming nothing imports it.

8. Privacy policy + app metadata.
   - Generate a privacy policy markdown file at PRIVACY.md describing:
     all data stays on device, Sentry collects crash stacks only, no
     analytics, no third-party data sharing. Plain English, no legal
     filler.
   - Add app/store-listing/ with three files: short_description.md
     (170 chars max), long_description.md (~300 words), keywords.md
     (50 ASO-relevant keywords or fewer, comma-separated).
   - Update app.json with proper bundleIdentifier (com.salmu.twentyfour),
     proper version (1.0.0), proper iOS infoPlist permissions strings
     for notifications.

9. Accessibility pass on the three highest-traffic screens
   (HomeScreen, ScheduleScreen, JournalScreen).
   - Add accessibilityLabel and accessibilityHint to every TouchableOpacity.
   - Add accessibilityRole where missing.
   - Audit color contrast: any text on the LinearGradient header must
     pass 4.5:1 against the lightest stop color. Fix anything that
     fails; do not just change the gradient.
   - Audit touch targets: minimum 44×44 pt on iOS, 48×48 dp on Android.

10. EAS Build setup.
    - Run `eas init` to create eas.json.
    - Configure three profiles: development (internal), preview
      (testflight + internal android), production.
    - Do NOT submit a build yet — the goal is the config exists.

After each of the 10 steps, commit with a clear message. Stop and ask
me before touching anything that is not in this list. In particular:
do not refactor the DB layer, do not redesign screens, do not add
features. If you find a bug while writing tests, stop and report it —
do not fix and continue. We want a clean diff per concern.

Definition of done for the sprint:
- `npm test` passes with the new tests.
- A development build runs on a physical iPhone via Expo Go.
- The data export and delete-my-data flows are demoable.
- The repo has a privacy policy, app store metadata folder, and an
  EAS config.
- No placeholders, no unused dependencies, no dead imports.
```

---

## Sprint 4 — Differentiation via AI Nova + Smart Quality-of-Life

**Goal of this sprint.** Make 24 feel materially smarter than any other habit tracker. Use Claude Haiku 4.5 to give Nova actual personality, generate personalized journal prompts, and produce a weekly insight. Add iOS/Android home-screen widgets so 24 shows up even when the app isn't open. Calendar integration so users don't have to re-enter their existing schedule.

**Why this is sprint 4, not sprint 3.** AI Nova has a real per-user cost. Don't build it until the safety net is in place and you can gate it behind a paywall later if needed.

### Prompt to paste into Claude Code

```
Sprint 3 is committed. Now add intelligence and convenience.
Read STATUS_REPORT.md, FINANCIAL_SUMMARY.md, and the existing
useAppStore.ts, HomeScreen.tsx, JournalScreen.tsx, AnalyticsScreen.tsx
before starting.

Sprint 4 ships three things, in order:

1. AI Nova via Anthropic API (Claude Haiku 4.5).
   - Add anthropic-ai/sdk as a dependency.
   - Create app/services/anthropic.ts with a single exported function
     callNova(systemPrompt, userPrompt) that returns a string.
     Read API key from process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY.
     Wrap in try/catch — every failure path falls back to a hardcoded
     default string (do not show errors to user).
   - Add a settings toggle "AI-powered Nova" (default OFF in this
     sprint — explicit opt-in). When OFF, use existing hardcoded
     prompt arrays.
   - Three integration points:
     a. JournalScreen prompt: when user opens journal and no entry
        for today exists, call Nova with the user's last 7 journal
        entries + current streak as context to generate ONE
        personalized reflection prompt. Cache it for the day —
        do not regenerate on re-open.
     b. HomeScreen morning greeting: replace static "Good morning"
        banner with a 1-sentence Nova-voiced greeting based on
        streak + yesterday's adherence + completed tasks count.
        Cache for the day.
     c. Weekly insight: every Monday morning, generate a 2-sentence
        analysis of last week's adherence per pillar and one
        suggestion. Show in a dismissable card on Home.
   - Cost guard: hard-cap calls to 5/day per user. Store call count
     in settings. If over, fall back to hardcoded prompts silently.
   - Each prompt must include system instructions to keep Nova's
     voice warm, encouraging, dog-themed (paw emojis OK), and
     never therapeutic-clinical.

2. iOS and Android home-screen widgets.
   - Use expo-config-plugins to set up a native widget extension.
   - iOS: a Small + Medium widget showing today's streak, treats,
     and a single Nova illustration.
   - Android: an equivalent widget via WidgetProvider XML.
   - Widget refreshes once per hour via TimelineProvider (iOS) /
     AlarmManager (Android).
   - Tapping the widget deep-links to the Home tab.
   - Widget reads from a shared App Group container (iOS) and
     SharedPreferences (Android). The app writes streak/treats
     into the shared store on every save.
   - This is the heaviest task in the sprint. If it takes more
     than 3 days of work, ship iOS-only and defer Android.

3. Calendar import (iOS EventKit + Android Calendar Provider).
   - Add expo-calendar.
   - In SettingsScreen, add "Import from Calendar" that:
     - Requests read-only calendar permissions.
     - Lists available calendars with checkboxes.
     - Imports events from the next 7 days as tasks, mapping the
       calendar event's start/duration into 24's Task model.
     - Defaults pillar to "work" but lets user pick a default
       pillar per calendar.
     - Does NOT auto-sync — this is one-time import only. Auto-sync
       creates duplicate-detection complexity we don't want yet.
   - Show a summary "Imported N tasks from M calendars" toast.

Testing requirements:
- Mock the Anthropic SDK in tests; do not call the real API in CI.
- Add tests for the cost-cap logic: 6th call in a day must return
  the fallback string.
- Add a test that calendar-import handles the empty case (no
  calendars granted access) gracefully.

Out of scope for this sprint (do NOT add):
- Cloud sync.
- User accounts / authentication.
- Paywall / RevenueCat integration.
- Push notifications powered by Nova (the daily 8am/8pm scheduled
  ones from Sprint 2 are enough).
- Apple Watch / Wear OS companion app.

Definition of done:
- AI Nova toggle works end-to-end on a real device with a real
  API key.
- Widgets show streak + treats on the home screen on both platforms
  (or iOS-only if Android was deferred).
- Calendar import demoably brings in real events.
- Tests added for cost-cap, calendar-empty, and the prompt-cache
  logic.
```

---

## Sprint 5 — Cloud Sync, Auth, and Pro Tier (the monetization sprint)

**Goal of this sprint.** Turn 24 into a business. Add Supabase-backed cloud sync (so users can switch phones), email-passwordless auth, and a $4.99/mo or $39.99/yr Pro tier that unlocks AI Nova, cloud sync, and a few cosmetic exclusives.

**Why this is sprint 5, not sprint 3 or 4.** You need to know users care before you charge them. By the time you start this sprint, you should have ~30 days of usage data and a clear retention number from Sprint 3's launch. If D7 retention is below 20%, **do not start this sprint** — go back and fix the product.

### Prompt to paste into Claude Code

```
Sprint 3 and 4 are committed and shipped. We have ~30 days of usage
data showing a retention curve that justifies investing in sync and
monetization. Read STATUS_REPORT.md, FINANCIAL_SUMMARY.md, and the
current state of useAppStore, db/queries.ts, db/database.ts before
starting.

Sprint 5 has three pillars, each a discrete sub-phase:

PHASE A — Supabase backend + auth.
1. Set up a Supabase project (you'll need me to provision it; ask
   me for the project URL and anon key).
2. Schema: mirror the local SQLite tables on Postgres, plus a
   `users` table linked to Supabase auth.users via FK. Use RLS
   policies so a user can only read/write their own rows.
3. Add @supabase/supabase-js as a dependency.
4. Auth flow: magic-link email auth via Supabase. Add a sign-in
   screen reached from Settings → "Sync & Backup" → "Enable sync."
   Anonymous-to-authenticated upgrade: when a user signs in for the
   first time, upload all their local data to their new account.
5. Sign-out flow: keep local data intact, just disconnect from
   server. Sign-out does NOT wipe local data.

PHASE B — Sync engine.
6. Add a sync_status column to every table (clean/pending/conflict)
   plus updated_at as ms-since-epoch on every row.
7. Push: every time a row is created/updated/deleted locally,
   set sync_status='pending' and enqueue. A background sync task
   (started in App.tsx bootstrap after auth) drains the queue.
8. Pull: every app open AND every 5 minutes while foregrounded,
   fetch rows where updated_at > last_sync_timestamp.
9. Conflict resolution: last-writer-wins by updated_at, but log
   conflicts to a new local table for the user to review later
   (do not auto-merge — Settings should show "N conflicts to
   review" if any exist).
10. Offline-first: every write succeeds locally regardless of
    network. Sync resumes when network returns.

PHASE C — Paywall + Pro tier.
11. Add react-native-purchases (RevenueCat).
12. Three SKUs in App Store Connect + Google Play Console (I'll
    create them; you scaffold the code):
    - twentyfour.pro.monthly — $4.99/mo
    - twentyfour.pro.annual — $39.99/yr (save 33%)
    - twentyfour.pro.lifetime — $79.99 one-time
13. Pro entitlement unlocks:
    - AI Nova (the Sprint 4 toggle, now Pro-gated).
    - Cloud sync (the Phase A/B feature, now Pro-gated).
    - 3 Pro-only cosmetic tiers in the shop (mark as "Pro" in
      shopCatalog.ts; non-Pro users see them but can't buy).
14. Paywall screen: simple, one screen with the three SKUs and a
    "Maybe later" dismiss. Reachable from any Pro-gated feature
    via "Unlock with Pro" CTA.
15. Restore Purchases button in Settings (App Store requirement).

Testing requirements:
- Sandbox StoreKit tests for the three purchase paths.
- Sync conflict test: edit the same task on two devices offline,
  go online, verify the later-edited version wins and the earlier
  edit is logged to conflicts.
- Auth test: sign-out preserves local data; sign-in to a fresh
  account uploads correctly.

Critical: do NOT enable sync by default. Existing users should see
a one-time "Want to sync across devices? Try Pro free for 7 days"
prompt the first time they open the post-Sprint-5 build, dismissable
once and never shown again.

Definition of done:
- A test user can install on iPhone, create 5 tasks, complete one,
  sign up via magic link on the same device, then install on a
  fresh iPhone, sign in, and see the same 5 tasks with the same
  completion status — all within 30 seconds of sign-in.
- Pro purchase via the App Store sandbox unlocks AI Nova + sync +
  Pro shop items immediately.
- Sign-out preserves local data and re-shows the Pro upsell.
- Conflict log table works and shows in Settings under "Sync
  status."
```

---

## What I'd ask you to verify before running any of these

Three things that are decisions, not implementation details. They will be in Claude Code's questions to you, and answering them yourself first will save a round trip:

The first is whether you actually want AI Nova or whether the hardcoded prompt pools are part of the product's appeal. There's a real case for "everything stays on your phone, nothing goes to a cloud LLM" as a positioning. If that's the vision, kill the AI Nova sprint and put that effort into widgets, calendar, and watchOS instead.

The second is the price points in Sprint 5. $4.99/mo / $39.99/yr is a reasonable starting place for a habit tracker, but it's at the low end. Streaks app charges $4.99/mo and has done well; Stoic charges $35/yr. Look at your actual competitors and pick a price that reflects the value you believe you deliver. Underpricing your product is more common than overpricing, especially for solo founders.

The third is the cloud sync timing. If you have any reason to believe early users will care about switching phones (e.g. they're young and upgrade often, or they use both iPhone + iPad), pull sync forward into Sprint 4. If they're privacy-conscious adults who want a local-first quiet habit tool, sync may never be the right call and the Pro tier should unlock AI + cosmetics + premium themes only.

Answer those three yourself before pasting Sprint 4 or Sprint 5 into Claude Code.
