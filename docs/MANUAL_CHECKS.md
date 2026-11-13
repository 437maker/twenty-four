# MANUAL_CHECKS.md — things only a real iPhone can confirm

Jest cannot see pixels, animation, the share sheet, or iOS settings. Run these
in Expo Go on the iPhone and tick them off. Start the app with `npx expo start`
and scan the QR code.

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
