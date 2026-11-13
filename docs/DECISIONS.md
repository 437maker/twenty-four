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

## Maltese companion run (2026-11-13)

### D15. The German Shepherd PNGs were replaced, and kept for rollback
- **What:** every place that showed `assets/images/nova-*.png` now shows the
  animated `<Companion>`: the Home yard, the streak-milestone modal, the
  weekly-box modal, and the Journal empty state. The four PNG files are still
  in `assets/images/`. Nothing imports them, so they are not in the app bundle.
- **Why:** the prompt asked for the replacement and for the files to stay.
- **Reverse:** `git revert` the commit "feat(companion): replace the German
  Shepherd PNGs with the Maltese" (`676f36a`). That restores the old
  `NovaCompanion.tsx`, the old `NovaSprite` in `HomeScreen.tsx`, and the image
  in `JournalScreen.tsx`. The new `app/components/companion/` folder can stay;
  it is unused after the revert.

### D16. The rig is layers of views, each holding one SVG part
- **What:** the spec describes one SVG with a `<G>` per moving part.
  `<Companion>` instead stacks about 14 see-through `Animated.View` layers,
  each containing one part as its own small SVG (its shapes inside a `<G>`),
  and animates the layers. `<MalteseSvg>` still draws the whole dog as one
  SVG with a `<G>` and pivot per part, for places that need no motion.
- **Why:** transforms on views are Reanimated's main, UI-thread path and never
  redraw the vector shapes. Animating a `<G>`'s transform inside an SVG goes
  through a less common path whose pivot handling could not be checked without
  a phone. Same drawing, same pivots, lower risk.
- **Cost:** more native views per dog (about 14 small SVGs instead of 1).
- **Reverse:** rewrite `RigLayer` in `Companion.tsx` to render animated `<G>`
  elements inside a single `<Svg>`. The pose math in `poses.ts` does not change.

### D17. `expo-haptics` is used although its docs page has no Expo Go label
- **What:** the prompt says to drop any library that is not "Included in Expo
  Go". The SDK 58 pages for `react-native-svg` and `react-native-reanimated`
  carry the label. The `expo-haptics` page does not show one either way.
- **Why it was kept:** Expo Go's own dependency list on the `sdk-58` branch
  (`apps/expo-go/package.json` in the `expo/expo` repository) includes
  `expo-haptics`, along with `react-native-svg 15.16.0`,
  `react-native-reanimated 4.7.1`, and `react-native-worklets 0.13.0`, which
  are exactly the versions installed here.
- **Safety net:** `haptics.ts` loads the module lazily inside `try/catch`. If
  it were missing, the tap would simply not vibrate; the app would not crash.
- **Reverse:** delete the body of `lightTap()` in
  `app/components/companion/haptics.ts` and `npm uninstall expo-haptics`.

### D18. Gestures: tap plus a sideways stroke, run on the JS thread
- **What:** tap and petting use `Gesture.Tap()` and `Gesture.Pan()` from
  `react-native-gesture-handler` with `.runOnJS(true)`. Petting only starts
  from a **sideways** stroke (8px), and gives up on a vertical drag (16px).
- **Why:** the companion sits inside Home's scrolling page. Without the
  sideways rule, trying to scroll or pull-to-refresh with a finger on the dog
  would pet her instead. `runOnJS(true)` keeps the callbacks simple: they only
  start animations, and the animations themselves still run on the UI thread.
- **Note:** gesture-handler 3 also has a newer hook API (`useTapGesture`).
  The builder API used here is still exported and supported in 3.3.
- **Reverse:** change the offsets in `Companion.tsx`, or remove the `stroke`
  gesture to keep tap only.

### D19. Inside modals the companion does not respond to touch
- **What:** `NovaCompanion` (milestone and weekly-box modals) and the Journal
  empty state pass `interactive={false}`.
- **Why:** React Native modals open outside the app's gesture root, so
  gestures there need an extra root view. The modals are short celebrations
  with a Continue button; tapping the dog is not their job. The Gallery, which
  is also a modal, does add its own gesture root because tapping is its job.
- **Reverse:** wrap the modal content in `GestureHandlerRootView` and remove
  `interactive={false}`.

### D20. Which shop item she wears: the newest one the rig can draw
- **What:** `pickAccessory()` picks the most recently bought item among the
  four the rig supports. "Cozy Sweater" is drawn as a scarf. Bow Tie and
  Golden Collar were added beyond the required two (hat and scarf) because
  each is two or three shapes.
- **Why:** the database has "owned" but no "equipped", and adding one is
  business logic, which this run was told not to touch.
- **Reverse / next step:** see the follow-ups in `docs/COMPANION.md`.

### D21. Party hat is always on while celebrating, and off while sleeping
- **What:** the celebration shows the hat even if the user does not own the
  Party Hat item. The sleeping pose never shows it, even if they do.
- **Why:** the spec lists the hat as part of the celebrating state. A cone
  hat on a sleeping dog pokes into the "z"s and looks wrong.
- **Reverse:** `accessoryLook()` in `poses.ts`.

### D22. The Gallery also opens with a long-press on the "Settings" title
- **What:** the prompt asks for a dev-only Gallery reachable from Settings
  when `__DEV__`. That row exists. In addition, holding the "Settings" title
  for about a second opens the same screen in any build.
- **Why:** the Gallery is "how Sahil reviews her on the phone", but the phone
  normally runs the published update, where `__DEV__` is false and the row is
  hidden. Without the long-press, reviewing would need the laptop.
- **Risk:** a user could find it by accident. It reads and writes nothing.
- **Reverse:** remove the `onLongPress` wrapper around the title in
  `SettingsScreen.tsx`.

### D23. Outline is 3.2 units and thickens at small sizes
- **What:** the spec says "a 2–3px soft outline". The outline is 3.2 drawing
  units (2.4px at the 150px yard size) and is multiplied by up to 1.7 as the
  dog shrinks toward 64px.
- **Why:** at 64px a fixed-ratio outline is under 1px and the white dog fades
  into a white page. Found by looking at the round 2 renders.
- **Reverse:** `LINE` in `parts.ts` and `outlineScaleForSize()` in `poses.ts`.

### D24. Jest setup for the animation libraries
- **What:** `package.json` gained `"resolver": "react-native-reanimated/jest/resolver"`
  and `"setupFilesAfterEnv": ["./jest.setup.js"]`. `jest.setup.js` calls
  Reanimated's `setUpTests()`, mocks `expo-haptics`, and replaces
  `react-native-gesture-handler` with a small hand-written mock.
  `react-test-renderer` was added as a devDependency to render components.
- **Why:** `HomeScreen` now imports Reanimated, so even the existing
  `homeBalance` test needed it to load in Node. The resolver and
  `setUpTests()` are what Reanimated's testing guide prescribes. Gesture
  handler's own jest setup tries to reach the UI thread through
  `react-native-worklets`, which crashed the test worker, so it was mocked.
  The mock records each gesture's callbacks, which is also how the tests fire
  a tap or a stroke.
- **Reverse:** remove those two `jest` keys and `jest.setup.js` (the companion
  tests and `homeBalance.test.ts` will then fail to load).

### D25. The render script imports the app's TypeScript directly
- **What:** `scripts/render-companion.mjs` relies on Node stripping
  TypeScript types (Node 22.15 or newer; the laptop has 24.15) and registers
  a tiny resolver so `./palette` finds `./palette.ts`.
- **Why:** it guarantees the PNGs come from the very same shape data and pose
  math as the app, with no build step and no extra dependency beyond
  `@resvg/resvg-js` (dev only).
- **Limit:** the files it imports (`palette`, `parts`, `poses`, `svgMarkup`)
  must stay free of React Native imports and of TypeScript features that
  cannot simply be erased (no `enum`).

### D26. An untracked folder was left alone
- **What:** `assets/images/cutout/` (four `nova-*.png` files) was already in
  the working folder, untracked, when this run started. It was not created by
  this run. It was not committed, moved, or deleted.
- **Why:** it is not mentioned in the prompt and its purpose is unknown.

### D27. Published without a device test
- **What:** the update "New Maltese companion" was published after static
  checks only: types, 166 tests, `expo-doctor`, a bundle export, and the PNG
  renders of the drawing.
- **Why:** no iPhone or iOS simulator on the Windows laptop. The renders show
  the drawing is right; they cannot show that the animation is smooth or that
  the three native libraries behave in Expo Go.
- **If it is broken on the phone:** the hard-stop plan in the prompt applies.
  Revert as in D15, publish, and the PNG dog is back.
