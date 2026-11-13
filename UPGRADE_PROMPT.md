# UPGRADE_PROMPT.md — Move 24 from Expo SDK 54 to SDK 58 (run with Fable 5.2)

> **How to run:** in PowerShell, `cd "C:\Users\salmu\Downloads\New folder\twenty-four"`, then `claude`, confirm the model is Fable 5.2, and send:
> *"Read UPGRADE_PROMPT.md fully and execute it. Do not stop for approval."*

---

## 0. Why this run exists

On 2026-11-13, Sahil installed Expo Go from the App Store and opened the published update. The phone showed:

> "Project is incompatible with this version of Expo Go. The installed version of Expo Go is for **SDK 58.0.0**. The project you opened uses **SDK 54**. … It is not possible to install an older version of Expo Go for iOS devices, only the latest version is supported."

So **`docs/DEPLOY.md` was wrong.** It claims the App Store Expo Go stops at SDK 54 and tells Sahil never to upgrade. The real device says otherwise, and the device wins. Until the project runs on SDK 58, the app can't open on his iPhone at all, from the laptop or from EAS Update.

## 1. Goal and definition of done

The project runs on **Expo SDK 58**, and Sahil can open it in the App Store Expo Go on his iPhone with the laptop closed.

Done means all of these are true:
- [ ] `package.json` is on `expo@~58`, and every Expo package is at the version `npx expo install --check` expects for SDK 58
- [ ] `npx expo-doctor` reports no errors (warnings are logged in `docs/DECISIONS.md` with a reason)
- [ ] `npx tsc --noEmit` is clean
- [ ] `npm test` passes, with the same number of passing tests or more (115 today). The 6 `test.failing` bug tests stay as `test.failing`.
- [ ] Every runtime dependency is included in Expo Go for SDK 58 (check each one's "Included in Expo Go" label on docs.expo.dev or its own docs). List them in `docs/UPGRADE_SDK58.md`.
- [ ] `npx expo export --platform ios` succeeds (proves the bundle builds)
- [ ] `app.json` still uses `runtimeVersion: { policy: "sdkVersion" }`, now producing `exposdk:58.0.0`
- [ ] An EAS Update is published to channel `main`, and `eas update:list` shows runtime `exposdk:58.0.0`
- [ ] `docs/DEPLOY.md` is corrected (section 5 below)
- [ ] Everything is committed and pushed

## 2. Rules (same as FABLE_PROMPT.md, plus these)

1. **Run unattended.** Don't wait for approval. Log every judgment call in `docs/DECISIONS.md` (what, why, how to reverse).
2. **One SDK at a time: 54 → 55 → 56 → 57 → 58.** Expo's guidance is to upgrade one SDK version at a time. For each step:
   1. Read that SDK's release notes and upgrade guide on expo.dev (changelog + "upgrading" docs). Write the breaking changes that touch this app into `docs/UPGRADE_SDK58.md`, citing URLs.
   2. Run `npx expo install expo@^5X.0.0 --fix`, then `npx expo install --check`.
   3. Fix breaking changes in the code.
   4. Run `tsc`, `npm test`, and `npx expo-doctor`. All must pass before the next SDK.
   5. Commit: `chore(sdk): upgrade to Expo SDK 5X`.
3. **Things to check at every step:**
   - `expo-sqlite`: any API or behavior changes, and whether the real-SQLite test harness (`test-utils/realSqlite.ts`) still matches
   - React Navigation: if SDK 55+ needs v7, upgrade `@react-navigation/*` and fix the navigator code. Keep the same 5 tabs and behavior.
   - React / React Native version bumps and the New Architecture
   - `expo-notifications`, `expo-file-system` (its API changed across recent SDKs; export must still work), `expo-sharing`, `expo-secure-store`, `expo-auth-session`, `expo-web-browser`, `expo-updates`, `@react-native-community/datetimepicker`, `react-native-gesture-handler`, `react-native-screens`, `react-native-safe-area-context`
   - `@sentry/react-native`: upgrade to a version that supports SDK 58. If none does, remove it (it is a no-op without a DSN anyway) and log the decision.
   - jest: keep `jest-expo` matched to the SDK
4. **Don't change behavior.** This run is an upgrade only. No bug fixes from `docs/BUGS.md` (the next run handles those), no redesigns. If an upgrade forces a behavior change, log it.
5. **Never rewrite git history.** Push at the end, and also after SDK 56 so progress is saved.

## 3. Hard stops
- **A step can't get tests green after 3 honest attempts:** commit nothing for that step, write exactly what broke into `docs/UPGRADE_SDK58.md`, push the last green state, and stop. Don't publish a broken update.
- **A required library has no SDK 58 version that runs in Expo Go:** find a replacement that does, or isolate the feature behind a guard so the rest of the app works. Log it. Stop only if the app's core (tasks, pillars, streaks, journal, analytics, shop) can't run.

## 4. Publish
Once everything in section 1 passes except publishing: `npm run ship -- --message "Upgrade to Expo SDK 58"`. Then confirm with `npx eas-cli update:list` that the runtime is `exposdk:58.0.0`.

## 5. Fix docs/DEPLOY.md
- Remove every claim that the App Store Expo Go stops at SDK 54, and the "Do not upgrade the Expo SDK" rule.
- Replace them with what the device showed: **Expo Go on iOS only runs the latest SDK, and old versions can't be reinstalled.** So when Expo ships a new SDK and Expo Go updates, the project has to be upgraded again before it opens on the phone.
- Add "How to upgrade when Expo Go moves to a new SDK": the same one-SDK-at-a-time loop from section 2.
- Add the honest trade-off: the only way to stop chasing Expo Go versions is your own build (a development build or TestFlight). On iOS that needs the Apple Developer Program (about $99/yr).
- Remove the advice to turn off App Store auto-updates; it doesn't help, because a fresh install always gets the newest Expo Go.

## 6. Final report
Write `docs/RUN_REPORT_SDK58.md` and print it:
- Each SDK step: done or blocked, commit hash, breaking changes handled
- Test count before and after; `expo-doctor` output
- Every entry added to `docs/DECISIONS.md`
- Anything Sahil must check on the iPhone (add to `docs/MANUAL_CHECKS.md`). The first line must be: open the app from Expo Go, then add and complete a task.
