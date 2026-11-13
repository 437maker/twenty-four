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
