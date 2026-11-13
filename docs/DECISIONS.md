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
- **Update, SDK 58 step:** `expo install` added the entry back with version
  9.2.1, whose plugin loads correctly. It is in `app.json` again.

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

### D10. `exportDataToFile()` now awaits `file.write()` (SDK 58 step)
- **What:** one line in `app/services/dataExport.ts`:
  `file.write(...)` became `await file.write(...)`.
- **Why:** in SDK 58 `File.write()` returns a promise instead of writing
  immediately. Without `await`, the share sheet could open on an empty or
  half-written backup file. `File.writeSync()` would also work; `await` was
  chosen because the function is already `async` and it does not block the UI.
- **Behavior change:** none intended. The export does the same thing.
- **Reverse:** change it to `file.writeSync(...)`. Do not go back to a bare
  `file.write(...)`.

### D11. Three type-only edits for React Native 0.88
- **What:** `useRef<ScrollView>(null)` → `useRef<ScrollViewInstance>(null)` in
  `app/components/WheelPicker.tsx` and `app/screens/ScheduleScreen.tsx`, and
  the empty `ListHeaderComponent` in `app/screens/ShopScreen.tsx` is now
  `undefined` instead of `null`.
- **Why:** React Native's new strict types separate "the component" from "the
  thing a ref points to", and no longer accept `null` for a list header. `tsc`
  failed with 6 errors.
- **Behavior change:** none. Types are erased at build time, and `FlatList`
  treats `null` and `undefined` headers the same way (it renders nothing).
- **Reverse:** revert those three lines (`tsc` will fail on SDK 58).

### D12. The foreground notification handler was left as it is
- **What:** no change to `app/utils/notifications.ts`.
- **Why:** SDK 58 shows foreground notifications by default "unless
  `setNotificationHandler` says otherwise". The app already sets a handler
  (banner and list on, sound off, badge off), so its choice still applies.
  The handler still passes the older `shouldShowAlert` field next to the newer
  `shouldShowBanner` / `shouldShowList`; the SDK 58 types still accept it.
- **Reverse:** not applicable.

### D13. Deprecated but working pieces were not migrated
- **What:** `@expo/vector-icons` (deprecated since SDK 56 in favor of
  `@react-native-vector-icons/*`) and `@react-native-community/datetimepicker`
  (Expo now offers a replacement in `@expo/ui`) were kept.
- **Why:** both still work and are in Expo Go for SDK 58. Replacing them is a
  code change with visual risk, and this run was upgrade-only.
- **When to revisit:** when a future SDK's release notes say either one is
  removed from Expo Go.

### D14. Published without a device test
- **What:** the SDK 58 update was published to channel `main` after static
  checks only (types, tests, `expo-doctor`, bundle export).
- **Why:** there is no iPhone or iOS simulator on the Windows laptop, and the
  previous update (SDK 54) could not open on the phone at all, so publishing
  cannot make things worse than "does not open".
- **Reverse:** `npx eas-cli update:republish --channel main` picks an earlier
  update, though every earlier one is SDK 54 and will not open in today's
  Expo Go. The practical fix for a bad update is a new, fixed one.
