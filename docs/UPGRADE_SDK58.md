# UPGRADE_SDK58.md — Expo SDK 54 → 58, one SDK at a time

Run date: 2026-11-13. Reason: the App Store Expo Go is now SDK 58 only, so the
SDK 54 project stopped opening on the iPhone.

Each step followed the same loop: read the release notes, run
`npx expo install expo@^5X.0.0 --fix`, run `npx expo install --check`, fix the
code, then run `npx tsc --noEmit`, `npm test`, `npx expo-doctor@latest`, and
`npx expo export --platform ios`. Nothing moved to the next SDK until all of
those passed.

Baseline before the run (SDK 54): `tsc` clean, 115 tests passing in 7 suites.

---

## SDK 55

Sources:
- https://expo.dev/changelog/sdk-55
- https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/

Versions: React 19.1 → 19.2, React Native 0.81 → 0.83. Expo packages now use
the SDK number as their major version (`expo-sqlite@~55`, and so on).

| Breaking change in the release notes | Touches this app? | What was done |
|---|---|---|
| Legacy Architecture removed; `newArchEnabled` removed from app.json | No. `app.json` never set it, and Expo Go already ran the New Architecture. | Nothing |
| `eas update` now requires `--environment` | **Yes.** `npm run ship` would fail. | Added `--environment production` to the `ship` script (decision D2) |
| `notification` and `edgeToEdgeEnabled` app.json fields removed | No, neither is set | Nothing |
| `expo-status-bar`: `backgroundColor`, `translucent`, `networkActivityIndicatorVisible` deprecated | No. `App.tsx` only uses `<StatusBar style="auto" />` | Nothing |
| `removeSubscription` deprecated in Expo modules | No, not used | Nothing |
| `expo-notifications`: push in Expo Go on Android now throws | No. The app only schedules **local** notifications and targets iOS | Nothing |
| `expo-av` removed from Expo Go, `expo-video`, `expo-clipboard`, `expo-router`, `expo-blur` changes | No, none are installed | Nothing |
| `expo-sqlite`: new inspector and tagged-template API, no breaking change | No | Test harness `test-utils/realSqlite.ts` unchanged |
| `expo-file-system`: `append` option added, no breaking change | No | Nothing |

Other changes in this step:
- `expo install --fix` added four config plugins to `app.json`:
  `@react-native-community/datetimepicker`, `expo-sharing`, `expo-sqlite`, and
  later `expo-font`. Config plugins only matter for native builds; Expo Go
  ignores them. Kept, so a future development build works without extra setup.
- `expo-doctor` failed two checks: `expo-font` missing (it is a peer dependency
  of `@expo/vector-icons`) and a duplicate `expo-font`. Fixed with
  `npx expo install expo-font`.
- **React Navigation 6 → 7** (decision D1). v6's native stack imports React
  Native private files (`react-native/Libraries/...`), which React Native is
  removing. v7 does not. The navigator code compiled unchanged: same five
  tabs, same stack, same `navigation.navigate(...)` calls.
- `@sentry/react-native` 7.2 → 7.11 (the version `expo install` picks for SDK 55).

Result: `tsc` clean, 115/115 tests, `expo-doctor` 20/20, iOS export OK.

---

## SDK 56

Source: https://expo.dev/changelog/sdk-56

Versions: React 19.2.0 → 19.2.3, React Native 0.83 → 0.85, TypeScript 5.9 →
6.0, minimum iOS 15.1 → 16.4. Hermes v1 becomes the default JavaScript engine.

| Breaking change in the release notes | Touches this app? | What was done |
|---|---|---|
| `expo-file-system`: `copy()` and `move()` are now async | No. `dataExport.ts` uses `create()` and `write()` only | Nothing |
| `expo` no longer depends on `@expo/vector-icons` | No. It was already a direct dependency (tab icons) | Nothing |
| `@expo/vector-icons` deprecated in favor of `@react-native-vector-icons/*` | Deprecated, still works | Left alone. Migrating is a code change with no user benefit today |
| `expo-sqlite`: blob columns return `ArrayBuffer` | No. The schema has no BLOB columns | Test harness unchanged |
| `expo/fetch` becomes the global `fetch` | Possibly: `googleCalendar.ts` calls `fetch`. Same API, different engine | Nothing. Google sign-in does not work in Expo Go anyway (V1 in `BUGS.md`) |
| Hermes bytecode diffing on by default in `expo-updates` | No action. It only makes update downloads smaller | Nothing |
| `expo-router` drops React Navigation | No, the app does not use `expo-router` | Nothing |
| "Expo Go for SDK 56 is not available on the Apple App Store" | Only matters if you stop here. We do not | Nothing |

Things the release notes did not warn about, found by running the checks:

1. **TypeScript 6 no longer loads `@types/*` packages automatically.** `tsc`
   reported 400+ "Cannot find name 'describe'" errors in the test files. Fixed
   by adding `"types": ["jest", "node"]` to `tsconfig.json` (decision D5).
2. **`@expo/config-plugins` is no longer reachable from the project root.**
   Two config plugins still `require` it and crashed `expo config`, which made
   `expo-doctor` and `expo export` unusable:
   - `@sentry/react-native` 7.11 (the version `expo install` still suggests for
     SDK 56 and 57). No 7.x release fixes it. Moved to **8.28**, the version
     SDK 58 expects, and told `expo install` to skip it for now (decision D6).
   - `@react-native-community/datetimepicker` 9.1.0. Its `plugins` entry had
     been auto-added during the SDK 55 step and was removed again (decision D7).
     The picker itself is unaffected.
3. **The top-level `splash` field in `app.json` is no longer allowed.**
   `expo-doctor` failed the schema check. Removed it (decision D8).

`expo-doctor` result on SDK 56: **21 of 22 checks pass.** The one failure is
"Hermes V1 regression: expo@56.0.24 is affected by a known memory regression",
and its own advice is "Upgrade to Expo SDK 57". There is no SDK 56 release that
passes this check, so it was accepted for this intermediate step (decision D9).
It is gone after the SDK 57 step.

Result: `tsc` clean, 115/115 tests, iOS export OK.

---

## SDK 57

Source: https://expo.dev/changelog/sdk-57

Versions: React Native 0.85 → 0.86 ("intended to have no breaking changes from
0.85"), React stays at 19.2.3, `react-native-gesture-handler` 2.31 → 2.32.

| Change in the release notes | Touches this app? | What was done |
|---|---|---|
| No breaking changes, deprecations, or removed APIs are listed | No | Nothing |
| `expo prebuild` now cleans the native folders by default | No, there are no native folders | Nothing |
| Hermes V1 memory regression fixed in `expo@57.0.9`, startup regression fixed in `57.0.17` | Installed `expo@57.0.33`, past both | The SDK 56 `expo-doctor` failure is gone |
| "The SDK 57 Expo Go build is not yet on the App Store" | Only matters if you stop here | Nothing |

No app code changed in this step.

One install problem: `npx expo install expo@^57.0.0 --fix` stopped half way
with an npm `ERESOLVE` error. Cause: Sentry 8 lists `expo-router` as an
*optional* peer, and npm tried to line it up with the SDK 58 `expo-router`
while the project was on SDK 57. Finished the install with
`npm_config_legacy_peer_deps=true npx expo install --fix`, then ran a plain
`npm install` to confirm the lockfile resolves normally. The setting was used
for that one command only and is not saved anywhere.

Result: `tsc` clean, 115/115 tests, `expo-doctor` 21/21, iOS export OK.

---

## SDK 58

Source: https://expo.dev/changelog/sdk-58

Versions: React 19.2.3 → 19.3.0, React Native 0.86 → 0.88,
`react-native-gesture-handler` 2.32 → **3.3**, `react-native-screens` 4.26 →
4.30, `react-native-safe-area-context` 5.7 → 5.11, datetimepicker 9.1.0 →
9.2.1, jest 29 → **30**, `@types/jest` 29 → 30.

| Breaking change in the release notes | Touches this app? | What was done |
|---|---|---|
| `expo-file-system`: `File.write()` is now async and returns a promise | **Yes.** `exportDataToFile()` wrote the backup, then opened the share sheet straight away | `app/services/dataExport.ts` now does `await file.write(...)` (decision D10) |
| React Native 0.87 Strict TypeScript API: some ref types became instance types | **Yes.** 6 type errors in 3 files | `useRef<ScrollView>` → `useRef<ScrollViewInstance>` in `WheelPicker.tsx` and `ScheduleScreen.tsx`; `null` → `undefined` for an empty `ListHeaderComponent` in `ShopScreen.tsx` (decision D11). Types only, no runtime change |
| React Native removed `InteractionManager`, the `Touchable` root export, `NativeMethods`, the `Modal` `animated` prop, and three `StatusBar` props | No. Searched `App.tsx` and `app/`: none are used. Also searched the exported JS bundle: the only matches are Sentry's and gesture-handler's own internal names, not React Native's | Nothing |
| `ImageBackground` deprecated | No, not used | Nothing |
| `expo-notifications`: foreground notifications show by default unless `setNotificationHandler` says otherwise | No. `app/utils/notifications.ts` already sets a handler (banner and list on, sound and badge off), so the app's choice still wins | Nothing |
| `expo-sqlite`: libSQL support removed | No. The app uses plain local SQLite (`openDatabaseAsync`, `execAsync`, `runAsync`, `getFirstAsync`, `getAllAsync`, `withTransactionAsync`) | Test harness `test-utils/realSqlite.ts` still mirrors those six methods. Unchanged |
| iOS scene life cycle, Android R8, `NODE_ENV` handling, `expo login` in the browser | No. These affect native builds or the CLI, not an Expo Go project | Nothing |
| `expo-router`, `@expo/ui`, `expo-localization`, `expo-media-library`, `expo-location` changes | No, none are installed | Nothing |
| "The new Expo Go supports only SDK 58" | **This is the reason for the run** | Project is now on SDK 58 |

Other changes in this step:
- The Sentry exclude from decision D6 was removed. `expo install --check`
  now validates `@sentry/react-native@~8.28.0` like every other package.
- `expo install` added the `@react-native-community/datetimepicker` plugin
  entry back to `app.json`. Version 9.2.1's plugin loads correctly, so it
  stays (this closes decision D7).
- `react-native-gesture-handler` 3 is a major version. The app uses exactly
  one thing from it, `GestureHandlerRootView` in `App.tsx`, which still exists.
- jest 30 ran the existing suite without config changes.

Result: `tsc` clean, 115/115 tests (6 `test.failing` bug tests still marked
`test.failing`), `expo-doctor` 20/20, `expo install --check` "Dependencies are
up to date", iOS export OK, `expo config` reports `sdkVersion 58.0.0` with
`runtimeVersion: { policy: "sdkVersion" }`.

---

## Runtime dependencies and Expo Go (SDK 58)

Checked 2026-11-13 against the SDK 58 reference pages. "Label" means the page
shows the "Included in Expo Go" badge.

| Package | Installed | In Expo Go? | Source |
|---|---|---|---|
| `expo-sqlite` | ~58.0.17 | Yes, label | https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/ |
| `expo-file-system` | ~58.0.13 | Yes, label | https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/ |
| `expo-sharing` | ~58.0.23 | Yes, label | https://docs.expo.dev/versions/v58.0.0/sdk/sharing/ |
| `expo-secure-store` | ~58.0.3 | Yes, label | https://docs.expo.dev/versions/v58.0.0/sdk/securestore/ |
| `expo-auth-session` | ~58.0.18 | Yes, label (Google sign-in still blocked, see V1 in `BUGS.md`) | https://docs.expo.dev/versions/v58.0.0/sdk/auth-session/ |
| `expo-web-browser` | ~58.0.8 | Yes, label | https://docs.expo.dev/versions/v58.0.0/sdk/webbrowser/ |
| `expo-updates` | ~58.0.22 | Yes, label. "most of the Updates API is unavailable when running in Expo Go"; the app calls none of it | https://docs.expo.dev/versions/v58.0.0/sdk/updates/ |
| `expo-linear-gradient` | ~58.0.4 | Yes, label | https://docs.expo.dev/versions/v58.0.0/sdk/linear-gradient/ |
| `expo-status-bar` | ~58.0.5 | Yes, label | https://docs.expo.dev/versions/v58.0.0/sdk/status-bar/ |
| `expo-font` | ~58.0.12 | Yes, label | https://docs.expo.dev/versions/v58.0.0/sdk/font/ |
| `@react-native-community/datetimepicker` | 9.2.1 | Yes, label | https://docs.expo.dev/versions/v58.0.0/sdk/date-time-picker/ |
| `react-native-gesture-handler` | ~3.3.0 | Yes, label | https://docs.expo.dev/versions/v58.0.0/sdk/gesture-handler/ |
| `react-native-screens` | ~4.30.1 | Yes, label | https://docs.expo.dev/versions/v58.0.0/sdk/screens/ |
| `react-native-safe-area-context` | ~5.11.1 | Yes, label | https://docs.expo.dev/versions/v58.0.0/sdk/safe-area-context/ |
| `expo-notifications` | ~58.1.9 | **No label on the page.** It says "Local notifications (in-app notifications) remain available in Expo Go", and local notifications are all this app uses | https://docs.expo.dev/versions/v58.0.0/sdk/notifications/ |
| `@sentry/react-native` | ~8.28.0 | **Not labelled, and Expo's Sentry guide does not mention Expo Go.** The JavaScript half runs without the native half: the installed code looks the native module up with a non-throwing `TurboModuleRegistry.get('RNSentry')` and has `isExpoGo()` guards. Read, not run on a phone. With no DSN set the app never calls `Sentry.init` | https://docs.expo.dev/guides/using-sentry/ |
| `@expo/vector-icons` | ^15.0.3 | JavaScript plus font files, loaded through `expo-font`. No native code of its own | — |
| `@react-navigation/*` 7.x, `zustand`, `date-fns`, `tslib` | — | JavaScript only. Nothing to include | — |
| `react`, `react-native`, `expo` | 19.3.0, 0.88.1, ^58.0.0 | These *are* Expo Go's runtime for SDK 58 | https://expo.dev/changelog/sdk-58 |

The two rows without a label are the reason `docs/MANUAL_CHECKS.md` starts
with "open the app" and includes a notification check.

## What could not be checked from the laptop

No iPhone, no iOS simulator (Windows). Everything above is static: types,
tests, `expo-doctor`, and a successful bundle export. Whether the app actually
opens and behaves in Expo Go for SDK 58 is the first item in
`docs/MANUAL_CHECKS.md`.
