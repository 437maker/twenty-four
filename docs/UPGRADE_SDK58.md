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
