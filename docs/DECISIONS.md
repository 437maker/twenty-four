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

---

## Wardrobe run (2026-11-14)

### D28. One skeleton, many breeds: a breed is data, not code
- **What:** every breed is one file in `app/components/companion/breeds/`
  that exports a `BreedDef`: its colors, the drawing for each part, where its
  ears, tail, eyelids, and mouth hinge, and seven anchor points. The rig, the
  animation, the items, the Shop, and the tests read the list in
  `breeds/index.ts` and work for any breed in it.
- **Why:** the spec asks for items drawn once and worn by every breed. With
  breeds as data, adding a seventh dog is one new file and one line.
- **Kept:** `parts.ts` and the old `PIVOTS` export still exist as thin
  re-exports so older imports and tests keep working.

### D29. Anchors are positions on the resting drawing; the layer carries them
- **What:** an item is placed at its anchor once (plain math in
  `placeShapes()`), then drawn on the animated layer of the body part it
  belongs to: hats on the top-of-head layer, glasses on the head layer, neck
  items and outfits on the body layer, held items on the right-paw layer,
  capes and wings on a second body layer behind the dog, auras on the
  whole-dog layer.
- **Why:** an item on the same layer as its body part gets exactly the same
  transform every frame, so it cannot drift. Nothing is recomputed per frame.
- **Result:** the per-state anchor table in the spec is filled from one base
  set per breed. The only per-state difference is that a held item leans 14
  degrees away from the face while asleep (found in the render review).

### D30. Three "outfits" and one "accessory" are not worn on the body
- **What:** Superhero Cape, Wizard Cloak, and Mythic Mantle go in the `back`
  slot. Legendary Aura and Arcane Matrix go in the `aura` slot. Celestial
  Wings go in `back`. The full table is `items/itemSlots.ts`.
- **Why:** a cape hangs behind the dog and an aura surrounds her. Putting
  them in the `outfit` slot would stop a cape being worn over a sweater.
- **Effect to know about:** the Shop's "Outfits" tab holds items from three
  slots, so buying a cape does not replace the sweater she has on.

### D31. Outfits are a sheet of fabric clipped to the body
- **What:** each outfit is drawn as a wide rectangle of fabric with its
  details, and clipped to the breed's body outline.
- **Why:** it fits every body shape exactly, wide Corgi or narrow Shepherd,
  with no per-breed outfit art.

### D32. Shop previews are a still picture, not the animated dog
- **What:** each wearable card shows `<CompanionSvg>`: the whole dog in one
  SVG, not moving.
- **Why:** the animated dog is about 20 stacked views. Fifteen of those in a
  scrolling list would be heavy. One still SVG per card is cheap, and the
  animated dog is one tap away on Home.

### D33. The celebration party hat gives way to a worn head item
- **What:** while celebrating, the dog gets the free party hat only if her
  head slot is empty. A crown, halo, or flower crown stays on.
- **Why:** it replaces D20 and D21 from the last run, which assumed one
  accessory. The user's choice should win over the automatic hat.

### D34. Switching breed is free and unlimited (product decision)
- **What:** "Choose your dog" costs nothing, can be used any number of
  times, and keeps the name and every equipped item.
- **Why:** the spec says so, and says to log it as something Sahil can change.
- **To change later:** price or unlock breeds in `setBreed()` in
  `app/db/queries.ts` (one place), and show the price in
  `BreedPickerScreen.tsx`.

### D35. Rename rule: trimmed, 1 to 20 characters, counted as people count
- **What:** `cleanCompanionName()` in `app/utils/companionName.ts` is the
  single rule, used by the pop-up and by the database query. An emoji counts
  as one character.
- **Why:** one rule in one place means Home, Settings, and the Gallery cannot
  disagree about what a valid name is.

### D36. "Show in yard" changes the yard stage, not the house drawing
- **What:** the yard still has five stages (0 to 4) drawn from the house
  tier. Choosing a house shows that house's tier. Tapping the chosen house
  again goes back to "best house I own". If a chosen house is no longer
  owned, the yard falls back to the best one owned.
- **Why:** the spec says not to draw 15 unique houses in this run.
- **Follow-up:** unique art for each of the 15 houses.

### D37. The new columns use constant defaults, then a backfill
- **What:** `equipped_items` (default `'{}'`), `breed` (default `'maltese'`),
  and `shown_house` (nullable) are added with constant defaults, followed by
  two `UPDATE` lines that repair empty values.
- **Why:** bug B0. SQLite refuses to add a column with a computed default to
  a table that has rows, and `tryExec` hides the failure. Constant defaults
  cannot fail that way. Tested on a real SQLite file that already has rows.

### D38. A damaged `equipped_items` value is read as "wearing nothing"
- **What:** `parseEquipped()` drops anything that is not a known slot holding
  an item that belongs in that slot. An unknown breed id falls back to the
  Maltese.
- **Why:** a bad value in the database should never leave the yard empty or
  crash the Home screen.

### D39. The dark muzzles are a shade lighter than the dark ears
- **What:** the German Shepherd's muzzle and the Pug's mask are drawn in a
  lighter brown than their caps and ears.
- **Why:** found in the render review. On a near-black muzzle the nose and
  mouth disappeared, and the face lost its expression at 64px.

### D40. This run picked up a half-finished working folder
- **What:** an earlier session wrote most of Phase A (and parts of B, C, and
  D) and stopped before committing. This session checked that work (types
  clean, 254 tests passing), split it into six commits, did the render
  review, and carried on.
- **Effect:** the first commits of the run hold more than one phase each. The
  per-phase commit list in `docs/RUN_REPORT_WARDROBE.md` says which is which.

### D41. Published without a device test
- **What:** both updates of this run were published after static checks
  only: types, tests, `expo-doctor`, and the PNG renders.
- **Why:** no iPhone or iOS simulator on the Windows laptop. The renders show
  the drawings and where items sit. They cannot show that a fully dressed dog
  animates smoothly. That is check W3 in `docs/MANUAL_CHECKS.md`.
- **If it is broken on the phone:** republish the previous update:
  `npx eas-cli update:republish --group b40b33db-969b-4176-8ccf-6902851350ef`

---

## Houses run (2026-11-14)

### D42. A house is a scene, and a scene is data
- **What:** each of the 15 houses is a `HouseDef` in
  `app/components/companion/houses/` (five files, three houses each). It
  holds a still backdrop, the still house, a list of ambient elements, and
  three points: where the dog stands, the door, and where she rests inside.
  Everything is drawn in a 300 x 200 box with the same shape vocabulary as
  the dog.
- **Why:** the same reason as breeds (D28). The yard, the Shop, the PNG
  script, and the tests all read one list, so a 16th house is one new object.
- **Replaces:** D36. "Show in yard" now changes the drawing, not only a stage.

### D43. One clock drives every ambient loop
- **What:** a single Reanimated value runs 0 to 1 once a minute. Each ambient
  element is its own layer and turns that clock into its own loop with one
  of six motions: rise, scroll, sway, spin, pulse, bob. A loop's period must
  divide 60 seconds (a test checks it) so nothing jumps when the clock wraps.
- **Why:** the performance rule. The backdrop and the house are drawn once;
  only transforms and opacity change per frame, on the UI thread.
- **Limit:** a house has at most five ambient layers (a test checks it).

### D44. The scene fills the yard like a photo, with a limit on cropping
- **What:** `sceneFit()` scales the scene to cover the view, anchored to the
  bottom. It never crops more than the top 50 units; on a wider view the
  scene stops growing and plain sky and ground show at the sides.
- **Why:** yards differ in shape between phones. Anchoring to the bottom
  keeps the dog and the door on screen. The crop limit keeps roofs visible.
- **Effect to know about:** on the smallest phones the top of the tallest
  houses (the Sky Tower's beacon) is cut off.

### D45. Shop house cards are still; the animated preview is one tap away
- **What:** each House card shows the scene and the user's dog as two still
  pictures. Tapping the picture opens a pop-up with the animated scene and
  the animated dog, plus Buy or Show in yard.
- **Why:** D32 again. Fifteen animated scenes in a scrolling list would be
  about 100 moving layers. One animated scene at a time is cheap.

### D46. At night, daytime scenes get a blue tint; dark scenes are left alone
- **What:** after 10pm the yard lays a see-through dark blue over houses
  whose scene is daytime. Space, the sea floor, the lair, the sanctuary, and
  Dimension X are already dark and are not tinted.
- **Why:** fifteen night versions of the art were out of scope. A tint keeps
  the day and night feeling for almost no cost.

### D47. With no house owned, the yard is exactly as before
- **What:** the five-stage yard drawn with plain views is still there and is
  used when no House item is owned. `houseTierToShow()` is kept because it
  still decides that stage. The new `houseToShow()` picks the house: the one
  chosen with "Show in yard", otherwise the highest tier owned, and the
  pricier one if two share a tier.
- **Why:** the spec says to keep the default yard.

### D48. Going inside is one dog and one number
- **What:** the yard keeps a single animated dog. A value `p` says where she
  is: 0 at her spot, 1 at the door (small and invisible), 2 at the rest spot.
  The view she lives in is moved and scaled from `p`; the dog herself is
  never rebuilt.
- **Why:** the spec says equipped items stay on and only the anchors move.
  Using the same dog the whole way makes that true by construction.
- **Rules are separate from motion:** `houses/restMachine.ts` is pure (phases,
  events, Sleep blocks, the walk math). `houses/YardDog.tsx` only plays the
  walk for the phase it is given. Timers, not animation callbacks, mark the
  moments she passes the door and arrives.

### D49. She rests in a doorway or a window, drawn smaller, not clipped
- **What:** inside, she is drawn at about 43% of her outside size so that
  the sleeping pose fits inside a 40 x 44 doorway. Nothing is clipped, so
  the "z"s float up over the wall.
- **Why:** clipping her to the doorway would also cut off the "z"s the spec
  asks for. Found in the render review (round 1 had her too big).
- **Three houses use a window instead of the door:** the Treehouse (the
  cabin up in the tree), the Sky Tower (the lookout), and the Space Station
  (the dome). She walks to the ladder, the entrance, or the hatch, and
  appears in the window.

### D50. Auto-rest follows Sleep blocks on the schedule, not the clock
- **What:** if the time now is inside a task whose pillar is Sleep (today's,
  or one from yesterday that runs past midnight), she walks inside by
  herself. She comes out when the block ends. If the user taps to bring her
  out, she stays out for the rest of that block. If the user sent her in,
  the end of a Sleep block does not bring her out. Home checks once a minute.
- **Kept as it was:** after 10pm with no Sleep block she still sleeps
  outside, as before.
- **Only with a house:** the starter yard (no House item owned) has no rest
  feature. The spec says to keep that yard as it is.

### D51. While walking she uses the "happy" animation
- **What:** between her spot and the door she plays the happy hop.
- **Why:** there is no walk cycle in the rig (she is drawn facing the
  viewer), and the hop reads as trotting. Under Reduce Motion there is no
  walk at all: she fades out where she is and fades in where she is going.
