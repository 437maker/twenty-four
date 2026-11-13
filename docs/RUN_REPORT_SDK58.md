# RUN_REPORT_SDK58.md — Expo SDK 54 → 58

Run date: 2026-11-13. Ran unattended from `UPGRADE_PROMPT.md`.

## Result

**The project is on Expo SDK 58 and the update is published to channel `main`
with runtime `exposdk:58.0.0`.** Every check that can run on the laptop
passes. **Nothing was tested on an iPhone**: there is no device or iOS
simulator on the Windows laptop. Whether the app opens in Expo Go is the first
item in `docs/MANUAL_CHECKS.md`, and it is yours to run.

## Definition of done

| Item | Status | Evidence |
|---|---|---|
| `expo@~58`, every Expo package at the expected version | Done | `expo` 58.0.25 installed; `npx expo install --check` → "Dependencies are up to date" |
| `npx expo-doctor` reports no errors | Done | "20/20 checks passed. No issues detected!" (no warnings to log) |
| `npx tsc --noEmit` clean | Done | exit code 0 |
| `npm test` passes, same count or more | Done | 115 passed before, 115 passed after, 7 suites. Test files untouched |
| `test.failing` bug tests stay `test.failing` | Done, with a number correction | There are **3** `test.failing(...)` tests, not 6: B0 in `dataLifecycle.test.ts`, B12 and B13 in `repeatAndConflicts.test.ts`. (The word appears 6 times because of comments.) All 3 are unchanged |
| Every runtime dependency is in Expo Go for SDK 58 | Done, with two caveats | Table in `docs/UPGRADE_SDK58.md`. 14 packages carry the "Included in Expo Go" label. `expo-notifications` has no label but its page says local notifications remain available. `@sentry/react-native` is not labelled; it runs JS-only (read from its source, not run on a phone) |
| `npx expo export --platform ios` succeeds | Done | 5.6 MB Hermes bundle exported |
| `runtimeVersion: { policy: "sdkVersion" }` unchanged | Done | `expo config`: `sdkVersion 58.0.0`, policy `sdkVersion` |
| EAS Update on `main` with runtime `exposdk:58.0.0` | Done | See "Publish" below |
| `docs/DEPLOY.md` corrected | Done | See "Docs" below |
| Committed and pushed | Done | `origin/main` |

## SDK steps

| Step | Status | Commit | Versions | Breaking changes handled |
|---|---|---|---|---|
| 54 → 55 | Done | `d6166dc` | RN 0.81 → 0.83, React 19.1 → 19.2 | `eas update` needs `--environment` (ship script). `expo-font` added (peer of vector-icons). React Navigation 6 → 7 |
| 55 → 56 | Done, pushed | `0d3f970` | RN 0.85, TypeScript 6 | `types` added to `tsconfig.json`. Sentry 7 → 8.28 (7.x plugin cannot load). `splash` field removed from `app.json`. datetimepicker plugin entry removed. One `expo-doctor` check (Hermes regression) could only be cleared by going to 57 |
| 56 → 57 | Done | `d2460c6` | RN 0.86 | None in app code. npm `ERESOLVE` during install, worked around for one command |
| 57 → 58 | Done | `67262b8` | RN 0.88, React 19.3, jest 30, gesture-handler 3 | `File.write()` is async → `await`. Strict React Native ref types (3 files). datetimepicker plugin entry restored by 9.2.1 |

No hard stop was hit. No step needed more than one fix pass to get tests green
(the tests themselves passed at every step; the failures were in `tsc` and
`expo-doctor`).

App code changed across the whole run: 5 files, 13 lines added, 5 removed.
- `app/services/dataExport.ts`: `await file.write(...)`. The only logic change.
- `app/components/WheelPicker.tsx`, `app/screens/ScheduleScreen.tsx`: ref type.
- `app/screens/ShopScreen.tsx`: `null` → `undefined` for an empty list header.
- `App.tsx`: a comment that named RN 0.81.

## Tests and expo-doctor

```
Before (SDK 54):  Test Suites: 7 passed, 7 total   Tests: 115 passed, 115 total
After  (SDK 58):  Test Suites: 7 passed, 7 total   Tests: 115 passed, 115 total
```

```
$ npx expo-doctor@latest
Running 20 checks on your project...
20/20 checks passed. No issues detected!
```

`expo-doctor` by step: SDK 55 20/20, SDK 56 21/22 (decision D9), SDK 57
21/21, SDK 58 20/20.

## Publish

```
Branch           main
Runtime version  exposdk:58.0.0
Platform         ios
Update group ID  39a9e94e-f34c-49cb-8b6f-bf9b269c3f26
iOS update ID    01a1d680-72e1-7829-b006-ea3ac4615bb2
Message          Upgrade to Expo SDK 58
Commit           67262b864d1ef0f8372733af252aa9ac11650f25
```

Confirmed two ways:
- `npx eas-cli update:list --branch main` lists the group above first, with
  `Runtime Version exposdk:58.0.0`. The older group is `exposdk:54.0.0`.
- A request to `https://u.expo.dev/243210fe-095e-480d-890e-75e62ada9de0` with
  the headers Expo Go sends (`expo-platform: ios`,
  `expo-runtime-version: exposdk:58.0.0`, `expo-channel-name: main`) returned
  HTTP 200 and the same update ID.

Dashboard: https://expo.dev/accounts/sahil_4/projects/twenty-four/updates/39a9e94e-f34c-49cb-8b6f-bf9b269c3f26

## Decisions logged in docs/DECISIONS.md

| # | Decision |
|---|---|
| D1 | React Navigation upgraded from v6 to v7 (v6 imports React Native private files that 0.87+ rejects) |
| D2 | `npm run ship` now passes `--environment production` |
| D3 | Config plugins that `expo install` added to `app.json` were kept |
| D4 | `expo-font` added as a direct dependency |
| D5 | `tsconfig.json` lists `"types": ["jest", "node"]` (TypeScript 6) |
| D6 | `@sentry/react-native` moved from 7.x to 8.28, two SDKs early |
| D7 | datetimepicker plugin entry removed at SDK 56, restored at SDK 58 |
| D8 | Top-level `splash` block removed from `app.json` |
| D9 | Went from SDK 56 to 57 with one `expo-doctor` check failing (it can only pass on 57) |
| D10 | `exportDataToFile()` awaits `file.write()` |
| D11 | Three type-only edits for React Native 0.88 |
| D12 | Foreground notification handler left as it is |
| D13 | Deprecated but working pieces (`@expo/vector-icons`, datetimepicker) not migrated |
| D14 | Published without a device test |

Two places where the run departed from the letter of the prompt:
- **Rule 2.4** (all checks pass before the next SDK): SDK 56 was left with one
  failing `expo-doctor` check. See D9.
- **"6 `test.failing` tests"**: the suite has 3. None were touched.

## Docs

- `docs/DEPLOY.md`: removed the "stops at SDK 54" claim, the "do not upgrade"
  rule, and the auto-update advice. Added the rule the phone showed (Expo Go on
  iOS only runs the latest SDK), the one-SDK-at-a-time upgrade routine, and
  the trade-off (own build, Apple Developer Program, about $99/yr). It also
  records that Expo's troubleshooting page still carried the stale SDK 54
  sentence on the day of the run.
- `docs/UPGRADE_SDK58.md`: per-SDK breaking changes with URLs, and the Expo Go
  dependency table.
- `docs/DECISIONS.md`: new file, D1–D14.
- `docs/MANUAL_CHECKS.md`: new section 0 at the top.
- `docs/LEARNING_LOG.md`: new entry, plus a correction note on the Phase 4 entry.
- `README.md`, `docs/SHOT_LIST.md`, `docs/BUGS.md` (V2), `TESTING_NOTES.md`:
  stale "SDK 54" statements corrected.

## What you must check on the iPhone

Full list: `docs/MANUAL_CHECKS.md`, section "SDK 58 upgrade". In order:

1. **Open the app from Expo Go, then add and complete a task.**
2. No "Project is incompatible" screen and no red error screen at launch.
3. **Your old data is still there** (streak, treats, tasks, journal). If it
   opens on onboarding, stop and note it before entering anything.
4. Settings → Export my data, save the file, and open it. It must be full
   JSON. This is both your backup and the test of the one logic line changed.
5. Tab bar: five tabs, icons above labels, nothing clipped at the bottom
   (React Navigation 7 draws it).
6. Schedule: the inline calendar, the time and duration wheels, and the
   "Move to" day row.
7. A scheduled notification arrives with the app closed, and shows a silent
   banner with the app open.
8. Replace any saved `exposdk:54.0.0` bookmark with the SDK 58 link from
   `docs/DEPLOY.md`.

## Known risks, most likely first

1. **Tab bar looks slightly different.** React Navigation 7 lays it out with
   its own code. The options are the same; the pixels may not be.
2. **Data continuity.** Expo Go should keep the same sandbox for the same
   account and slug across SDKs. Not verifiable from the laptop.
3. **Sentry in Expo Go.** Not on Expo's included list. Its code is written to
   run without the native module, and the app never calls `Sentry.init`
   without a DSN. If the app shows a red screen naming `RNSentry`, the fix is
   to remove Sentry (steps under D6).
4. **The next SDK.** When Expo Go moves to SDK 59, the "incompatible" screen
   comes back. `docs/DEPLOY.md` section 6 is the routine.
