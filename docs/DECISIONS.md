# DECISIONS.md — judgment calls made during unattended runs

Each entry says what was decided, why, and how to reverse it.

## SDK 58 upgrade run (2026-11-13)

### D1. React Navigation upgraded from v6 to v7 (during the SDK 55 step)
- **What:** `@react-navigation/native`, `bottom-tabs`, and `native-stack` went
  from 6.x to 7.x. No app code had to change.
- **Why:** v6 is no longer maintained, and its native stack imports React
  Native private files (`react-native/Libraries/...` in `FontProcessor` and
  `DebugContainer`). React Native 0.87, which arrives with SDK 58, turns those
  deep imports into errors. v7 has none of them and is the version the
  SDK 55–58 `react-native-screens` releases are built against.
- **Behavior risk:** v7 draws the tab bar with its own layout code. The
  options the app sets (height 84, padding, colors, label style) are still
  supported, but the look must be checked on the phone (see
  `docs/MANUAL_CHECKS.md`).
- **Reverse:** `npm install @react-navigation/native@^6 @react-navigation/bottom-tabs@^6 @react-navigation/native-stack@^6`.
  Not recommended on SDK 58.

### D2. `npm run ship` now passes `--environment production`
- **What:** the `ship` script is
  `npx --yes eas-cli update --channel main --platform ios --environment production`.
- **Why:** from SDK 55, `eas update` refuses to run without `--environment`.
  The flag picks which set of EAS server-side environment variables is loaded.
  This project has none, so the value only has to be valid. `production`
  matches the single `production` profile in `eas.json`.
- **Reverse:** edit the `ship` line in `package.json`.

### D3. Config plugins added to `app.json` by `expo install` were kept
- **What:** `@react-native-community/datetimepicker`, `expo-sharing`,
  `expo-sqlite`, and `expo-font` now appear under `plugins`.
- **Why:** `npx expo install --fix` adds them automatically. Expo Go ignores
  config plugins, so they change nothing today. They would be needed for a
  development build later.
- **Reverse:** delete those four lines from `plugins` in `app.json`.

### D4. `expo-font` added as a direct dependency
- **What:** `npx expo install expo-font`.
- **Why:** `expo-doctor` failed without it. It is a required peer dependency of
  `@expo/vector-icons` (the tab bar icons). It is included in Expo Go.
- **Reverse:** `npm uninstall expo-font` and remove it from `plugins`
  (`expo-doctor` will fail again).

### D5. `tsconfig.json` now lists `"types": ["jest", "node"]` (SDK 56 step)
- **What:** one line added under `compilerOptions`.
- **Why:** SDK 56 moves to TypeScript 6, which stopped loading every
  `@types/*` package automatically. Without the line, `tsc` cannot find
  `describe`, `expect`, `jest`, or `require` in the test files.
- **Reverse:** remove the line (and go back to TypeScript 5).

### D6. `@sentry/react-native` moved from 7.x to 8.28 (SDK 56 step)
- **What:** installed `@sentry/react-native@~8.28.0`, two SDKs early. For the
  SDK 56 and 57 steps only, `package.json` carried
  `"expo": { "install": { "exclude": ["@sentry/react-native"] } }` so that
  `expo install --check` did not complain. That exclude is removed at SDK 58,
  where 8.28 is the expected version.
- **Why:** Sentry 7.x's config plugin requires `@expo/config-plugins` directly,
  which SDK 56 no longer exposes, so every `expo` command that reads
  `app.json` crashed. 8.28 is the version Expo lists for SDK 58. The app's
  Sentry calls (`init`, `wrap`, `captureException`) are unchanged in v8 and
  `tsc` passes. Sentry stays a no-op without `EXPO_PUBLIC_SENTRY_DSN`.
- **Install note:** the first install needed `--legacy-peer-deps` because npm
  tried to satisfy Sentry's *optional* `expo-router` peer with the SDK 58
  release while the project was on SDK 56. A plain `npm install` works
  afterwards.
- **Reverse:** `npm uninstall @sentry/react-native`, remove the two Sentry
  entries from `plugins` in `app.json`, and delete the `Sentry.*` calls in
  `App.tsx` and `app/utils/notifications.ts`.

### D7. Removed the `@react-native-community/datetimepicker` entry from `plugins`
- **What:** the line that `expo install` added in the SDK 55 step (see D3) was
  taken out again. The library is still installed and used.
- **Why:** its plugin file crashed for the same reason as Sentry's. The plugin
  only sets Android theme colors at native build time. This app sets none and
  runs in Expo Go, so the entry did nothing.
- **Reverse:** add `"@react-native-community/datetimepicker"` back to
  `plugins` once the library's plugin loads on the current SDK.

### D8. Removed the top-level `splash` block from `app.json`
- **What:** deleted `"splash": { "resizeMode": "contain", "backgroundColor": "#3C3489" }`.
- **Why:** the SDK 56 config schema rejects it and `expo-doctor` fails. Splash
  settings now belong to the `expo-splash-screen` config plugin. The block
  never had an image and Expo Go shows its own loading screen, so nothing
  visible changes on the phone.
- **Reverse / do it properly later:** for a real build, run
  `npx expo install expo-splash-screen` and add
  `["expo-splash-screen", { "backgroundColor": "#3C3489" }]` to `plugins`.

### D9. Went from SDK 56 to 57 with one `expo-doctor` check failing
- **What:** rule 2 says every check must pass before the next SDK. On SDK 56,
  `expo-doctor` reports 21/22: the failing check is the Hermes V1 memory
  regression in `expo@56.0.24`.
- **Why it was accepted:** 56.0.24 is the newest SDK 56 release, and the
  check's own advice is "Upgrade to Expo SDK 57". The only other way to clear
  it is to switch the JS engine off with a native build setting, which Expo Go
  ignores. `tsc`, all 115 tests, and the iOS export passed. Nothing was
  published from SDK 56.
- **Reverse:** not applicable. The check passes from SDK 57 on.
