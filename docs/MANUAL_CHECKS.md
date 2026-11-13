# MANUAL_CHECKS.md — things only a real iPhone can confirm

Jest cannot see pixels, animation, the share sheet, or iOS settings. Run these
in Expo Go on the iPhone and tick them off. Start the app with `npx expo start`
and scan the QR code.

## SDK 58 upgrade (2026-11-13): do these first

The upgrade from SDK 54 to 58 was checked on the laptop only (types, tests,
`expo-doctor`, bundle export). None of the items below could be run there.
If one fails, write down the exact words on screen and which step it was.

### 0. The app opens and the core loop works
- [ ] Open the app from Expo Go, then add and complete a task.
  (Expo Go → sign in as `sahil_4` → **twenty-four** → branch `main` → newest
  update, "Upgrade to Expo SDK 58". Then Schedule → add a task → tick it.)
- [ ] There is **no** "Project is incompatible with this version of Expo Go" screen.
- [ ] No red error screen at launch. (This also covers Sentry, which is not on
  Expo's "Included in Expo Go" list: if the app opens, its JS-only mode works.)
- [ ] **Your old data is still there**: streak, treats, tasks, journal. If the
  app starts on onboarding instead, stop and note it before entering anything.
- [ ] Settings → Export my data right away, and save the file. This also
  checks the one line of app logic the upgrade changed (the file write). Open
  the saved file in Files: it must be full JSON, not empty.

### 0a. Tab bar (React Navigation 6 → 7)
- [ ] Five tabs in this order: Home, Schedule, Analytics, Journal, Shop.
- [ ] Icons sit above the labels, the active tab is purple, and nothing is
  clipped by the home indicator at the bottom of the screen.
- [ ] Tapping each tab switches screens. Home's cards still jump to Schedule,
  Analytics, and Shop.
- [ ] The onboarding → main app change still fades (only visible after a
  "Delete all my data", so check it the next time you do item 8).

### 0b. Things that sit on upgraded native libraries
- [ ] Schedule → tap the date at the top → the inline calendar opens, and
  picking a day switches to it (datetimepicker 8 → 9).
- [ ] Schedule → add a task → the hour, minute, AM/PM and duration wheels
  scroll and snap, and tapping a value selects it (`WheelPicker`, one of the
  files with a type-only edit).
- [ ] Open an existing task: the "Move to" row of days starts scrolled near
  the task's current day (the other file with a type-only edit).
- [ ] Shop → the header gradient shows, and the Shields tab shows its info card
  while the other tabs do not.
- [ ] Notifications: Settings → set the evening notification time two minutes
  ahead and save → close the app → the notification arrives. Then repeat with the app **open**:
  a banner appears, with no sound. (Expo's notifications page has no
  "Included in Expo Go" label; it says local notifications remain available.)
- [ ] Status bar text (clock, battery) is readable on Home by day and by night.

### 0c. Update the bookmark
- [ ] If you saved the `exp://…runtime-version=exposdk:54.0.0` link, replace it
  with the SDK 58 one from `docs/DEPLOY.md` section 2.

Then run through items 1–9 below once. They were written for SDK 54 and every
one of them now runs on new versions of React Native and the native libraries.

## Phase 2: home screen

### 1. Day and night
- [ ] Open Home during the day. Sky is light blue, sun top right, clouds drift slowly left to right.
- [ ] iPhone Settings → General → Date & Time → turn off "Set Automatically" → set the time to 10:30 PM.
- [ ] Return to the app (wait up to one minute). Sky fades to dark blue over about a second, moon replaces the sun, grass darkens, Nova is asleep.
- [ ] Set the time to 7:05 AM. It fades back to day and Nova wakes.
- [ ] **Turn "Set Automatically" back on.** While the clock is wrong the streak logic sees the wrong day.

### 2. Yard follows the best House item
- [ ] With no House item owned, the yard shows the plain starter doghouse.
- [ ] Shop → House → buy the cheapest item. Go back to Home.
- [ ] The new yard (painted doghouse and bowl) fades in over the old one. It should not snap.
- [ ] Buy a higher tier House item if you have the treats. The yard upgrades again (flowers at stage 2, tree and fence at 3, pool at 4).

### 3. Bars and balance score
- [ ] Note the balance number top left of the yard.
- [ ] Schedule → complete one task → back to Home. Bars refill from the left, top bar first, and the matching bar is longer.
- [ ] The balance number went up.
- [ ] The card header shows the right "done/total tasks".

### 4. Overflow
- [ ] Add and complete Work tasks until Work is past its target (for example 9h on an 8h target).
- [ ] The Work bar shows a solid part, a thin dark tick at the target, and a lighter part after it.
- [ ] The label reads "8 / 8h  +1h over".
- [ ] The balance number went **down** compared with exactly hitting the target.

### 5. Reduce Motion
- [ ] iPhone Settings → Accessibility → Motion → Reduce Motion ON.
- [ ] Back in the app: clouds are still, Nova does not breathe or hop, bars appear already filled, the streak badge does not pulse.
- [ ] Turn Reduce Motion off again.

### 6. Nothing from Sprint 2 was lost
- [ ] Gear icon (top right of the yard) opens Settings.
- [ ] Pull down on Home refreshes.
- [ ] Tap the streak badge or "Yesterday N%" → Analytics.
- [ ] Tap the bar card → Schedule. Tap the treat card → Shop.
- [ ] With nothing planned for tomorrow, the green "Plan Tomorrow" card shows.
- [ ] VoiceOver (optional): each bar reads as "Work: 3 of 8 hours".

## Phase 3: export and wipe

### 7. Export my data
- [ ] Home → gear → scroll to "Your data" → "Export my data".
- [ ] The iOS share sheet opens with a file named `twenty-four-backup-YYYY-MM-DD.json`.
- [ ] "Save to Files", then open it in the Files app. It is readable JSON with `tables.tasks`, `tables.settings`, and so on.
- [ ] Check there are **no** Google tokens in the file (`google_sync_token` should say `[removed]` or be null).

### 8. Delete all my data
Do this only after a successful export, or on data you do not mind losing.
- [ ] Settings → "Delete all my data" → first alert → "Continue" → second alert → "Delete everything".
- [ ] The app returns to onboarding.
- [ ] Finish onboarding. Home shows streak 0, 0 treats, starter yard, no tasks, empty journal, empty analytics.
- [ ] Cancel at either alert leaves everything untouched.

### 9. Accessibility (Schedule and Journal)
- [ ] Turn on VoiceOver (triple-click side button if set up, or Settings → Accessibility → VoiceOver).
- [ ] Schedule: each task reads its name, time, duration, pillar, and done or not done. The checkbox is announced as a checkbox.
- [ ] Journal: the text box, exception-day switch, and Save button are all announced with a name and a role.

## Phase 4: updates without the laptop

### 10. Open from Expo Go with the laptop closed
- [ ] After `eas update`, close the laptop.
- [ ] Expo Go → sign in with the same Expo account → the project appears under your account → open the latest update on the `main` branch.
- [ ] The app opens and your data is there.
