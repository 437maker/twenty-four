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
