# FABLE_PROMPT.md — Finish "24" (run with Claude Fable 5.2 in Claude Code)

> **How to run:** open Claude Code in `C:\Users\salmu\Downloads\New folder\twenty-four`, pick Fable 5.2 with `/model`, and send:
> *"Read FABLE_PROMPT.md fully. Do Phase 0 only, then stop at its checkpoint and report."*
> Then send "Next phase" after each checkpoint. One phase per message.
>
> **Do these by hand first (5 min):**
> 1. Revoke the old GitHub token (see `SECURITY_NOTICE.md`): github.com → Settings → Developer settings → Tokens.
> 2. Copy this whole folder somewhere safe (e.g. a zip on OneDrive). Nothing since April is on GitHub yet.

---

## 0. Context

You are the lead engineer on **24**, a React Native time-balance app by Sahil (EE student, Windows laptop, iPhone, no Mac).

- **Stack:** Expo SDK 54, React Native 0.81, React 19, TypeScript (strict), expo-sqlite, Zustand, React Navigation, date-fns, jest + jest-expo.
- **Product:** each day is split into four pillars: Work, Personal, Care (optional), Sleep. Users plan, log, and see how closely reality matched the plan. Nova, a German Shepherd puppy, is the emotional anchor: streaks, treats, shop, yard upgrades.
- **Read first, fully:** `README.md`, `STATUS_REPORT.md`, `TESTING_NOTES.md`, `SPRINT_3_5_PROMPTS.md`, `App.tsx`, `app/types/index.ts`, `app/store/useAppStore.ts`, `app/db/database.ts`, `app/db/queries.ts`, `app/utils/*`.
- **State today:** Sprints 1–3 are built (journal, analytics, shop, treat economy, shields, weekly boxes, Google Calendar sync, 51 jest tests), **but uncommitted**. GitHub only has "Phase 1.0" from April.
- **Why it exists:** (1) Sahil uses it daily. (2) It is his portfolio centerpiece for an engineering co-op (Analog Devices). Interviewers value **modeling, analytics, data discipline, and measured outcomes** over cosmetics.

## 1. Hard rules

1. **$0 and Expo Go only.** The app must keep running in the Expo Go app on iPhone. No native modules outside the Expo Go set, no dev builds, no paid services, no Apple Developer account. If a task needs any of these, stop and tell Sahil.
2. **No API keys in the app.** Never use `EXPO_PUBLIC_*` for a secret; those ship inside the app bundle. (This is why "AI Nova" from `SPRINT_3_5_PROMPTS.md` is out of scope.)
3. **Never rewrite git history.** No force-push, no rebase of pushed commits. Never commit `.env`, tokens, or `node_modules`.
4. **Plan, then build.** Each phase starts with a plan under 15 lines in `docs/plans/phase-N.md`. Wait for Sahil's "go."
5. **Tests stay green.** `npx tsc --noEmit` and `npm test` must pass at the end of every phase. Any bug fix gets a test that fails before the fix and passes after.
6. **Small commits** with clear messages, one concern each. Push at the end of every phase.
7. **Stop and ask** if something is ambiguous, a requirement conflicts with the code, or a phase grows past 1.5× its plan. Don't use silent workarounds.
8. **Find bugs, report them.** If you find a bug outside the current phase, add it to `docs/BUGS.md` with file, line, repro, and impact. Don't fix it unasked.
9. **Explain as you go.** Sahil must be able to defend every change in an interview. After each phase, add a short entry to `docs/LEARNING_LOG.md`: what changed, why, and the one concept to understand (e.g. "why scaleX instead of width").

## 2. Phases

### Phase 0: Save the work (about 30 min)
1. Confirm with Sahil that the old token is revoked. Check `.git/config` has no credentials in the remote URL. Set up Git Credential Manager if `git push` can't authenticate.
2. Move files that don't belong to the app out of `app/` into `../ee-ai-toolkit/`: `EE-AI-Toolkit_*`, `evidence_plots/`, `run_tests.py`, `results.json`. Confirm nothing in `app/` imports them first.
3. Make sure `.gitignore` covers `node_modules/`, `.expo/`, `.env*`, `*.tsbuildinfo`, `coverage/`.
4. Commit the existing work as **4–6 logical commits** (e.g. Care pillar + repeat tasks; treat economy + shop; journal; analytics; Google Calendar sync; tests + Sentry). Do not change behavior.
5. Push to `origin/main`.

**Checkpoint:** `git status` clean, GitHub shows the commits, `npm test` passes (51 tests).

### Phase 1: Date and money correctness (about 1.5 h)
The app builds "today" with `toISOString()`, which is **UTC**. In Boston, after 7–8pm local time the app thinks it's tomorrow, so streaks can increment or reset on the wrong day.
1. Find every date-key site that uses UTC, including at least:
   - `app/store/useAppStore.ts` (`getTodayStr`, `getYesterdayStr`)
   - `app/utils/calculations.ts` (`getLastNDates`)
   - `app/db/queries.ts` (around line 569)
   - `app/screens/analytics/MonthlySection.tsx` (around line 94)
2. Replace them with the local-time helpers in `app/utils/dateHelpers.ts`. Keep ISO timestamps (`updated_at`, sync times) as they are; those *should* be UTC.
3. Add tests that pin the clock to **11:30pm America/New_York** and prove: the streak increments on the correct local day, yesterday's adherence reads the correct date, and the weekly box covers the correct 7 local days. Note that `TESTING_NOTES.md` says the existing streak tests use noon UTC; keep those passing too.
4. Fix the documented double-charge bug: `purchaseItem` must return `false` without charging if the item is already owned. Flip the "documents a bug" test into a real assertion.

**Checkpoint:** new tests fail on the old code and pass on the new code (show both runs).

### Phase 2: Home screen redesign (about 1 h)
Files are waiting in `_incoming/`. They end in `.pending` so that `tsc` and jest ignore them until they're moved:
- `_incoming/HomeScreen.tsx.pending` → `app/screens/HomeScreen.tsx`
- `_incoming/homeBalance.test.ts.pending` → `__tests__/homeBalance.test.ts`

The redesign keeps every Sprint 2 feature (modals, banners, gear, Plan Tomorrow, Google sync). It adds:
- a compact yard (30% of the screen) with drifting clouds and a day/night crossfade
- yard stages driven by the best House item owned
- a balance score next to Nova
- overflow segments on the pillar bars
- distinct streak, Care, and treat colors
- Animated-API-only animations

1. Diff against the current file. List anything the old screen did that the new one doesn't, and ask before dropping it.
2. Move the files into place (drop the `.pending` suffix), run `tsc` and the tests (expect 63+), then remove `_incoming/`.
3. Give Sahil a manual check list to run in Expo Go: day vs night (change the phone clock), buy a House item → yard crossfades, complete tasks → bars and balance update, go over a target → overflow segment, turn on Reduce Motion → no looping motion.

**Checkpoint:** Sahil confirms the manual checks on his iPhone.

### Phase 3: Ship-readiness that fits Expo Go (about 2.5 h)
Take items from Sprint 3 in `SPRINT_3_5_PROMPTS.md`, limited to what works in Expo Go:
1. **Dead code:** delete `AnalyticsPlaceholder.tsx`, `JournalPlaceholder.tsx`, `ShopPlaceholder.tsx` after confirming there are zero imports. Remove `lottie-react-native` if nothing uses it.
2. **Export my data:** a Settings button that writes `getAllTablesForExport()` as JSON and opens the share sheet (expo-file-system + expo-sharing, both included in Expo Go). Add a test for the export shape.
3. **Delete all my data:** a red button with two-step confirmation. It clears all tables and store state and returns to onboarding. Test the wipe.
4. **Accessibility pass** on Schedule and Journal (Home is already done): labels, roles, and 44×44pt touch targets.
5. **Verify, don't fix:** check whether Google sign-in (`expo-auth-session`) and `@sentry/react-native` actually work inside Expo Go on iOS. Report what works and what doesn't in `docs/BUGS.md`, with sources from the Expo docs.

**Checkpoint:** export a file on iPhone and open it; a wipe on a test account works.

### Phase 4: Free iPhone install, no laptop needed (about 1 h)
Goal: Sahil opens 24 from Expo Go anywhere, without `expo start` running.
1. Check the **current** Expo docs for EAS Update with Expo Go. Confirm that Expo Go can load updates for projects you own, and note any limits that apply to SDK 54. Cite the doc URLs in `docs/DEPLOY.md`.
2. Set up EAS Update (`eas update:configure`, a channel, `eas.json`) on the free plan. No EAS Build.
3. Write `docs/DEPLOY.md`: a 3-command publish routine Sahil runs from PowerShell, how to open the app in Expo Go on his iPhone, and what to do when Expo Go drops SDK 54 (upgrade path).
4. Do one real publish together. Sahil confirms it loads on his iPhone with the laptop off.

**Checkpoint:** the app opens on the iPhone from Expo Go with the laptop closed.

### Phase 5: Portfolio proof (about 1 h)
1. Update `README.md` with **verified numbers only**: test count, coverage on `app/utils`, `app/db`, and `app/store` (`npm run test:coverage`), lines of code, number of SQLite tables, and the bugs fixed in Phase 1. Don't claim anything you didn't measure.
2. Write `docs/HOW_IT_WORKS.md`: one page each on conflict detection, the repeat-task master/instance model, the streak/shield/box state machine, and why Zustand. Include code references so Sahil can study it before interviews.
3. Give Sahil a 2-minute screen-recording shot list for LinkedIn.

**Checkpoint:** README numbers match a fresh `npm test -- --coverage` run.

## 3. Out of scope (don't build these)
- AI Nova / Anthropic API calls: costs money, and the key would ship inside the app
- Home-screen widgets: need native code (no Expo Go)
- Supabase, accounts, cloud sync, RevenueCat / "24 Plus"
- New yard art, outfits, or Canva assets (Sahil does these by hand)
- Refactoring the DB layer or redesigning other screens

## 4. If time runs short, cut in this order
Phase 5 step 3 → Phase 3 step 4 → Phase 3 step 3 → Phase 4.
**Never cut:** Phase 0, Phase 1, or the tests.
