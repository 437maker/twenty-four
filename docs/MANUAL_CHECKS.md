# MANUAL_CHECKS.md — things only a real iPhone can confirm

Jest cannot see pixels, animation, the share sheet, or iOS settings. Run these
in Expo Go on the iPhone and tick them off. Start the app with `npx expo start`
and scan the QR code.

## Houses run: houses, resting inside, chests, sports gear, hero suits (2026-11-14)

Everything here was checked on the laptop only: drawings by looking at PNG
renders (`docs/companion/houses/`, `docs/companion/items/`,
`docs/companion/chests.png`), logic by tests. Open the newest published
update in Expo Go. If the app does not open, note the exact error text, then
on the laptop run
`npx eas-cli update:republish --group 09e3c12f-d5b7-4fac-8d7b-371d8a024c89`
to go back to the update before this run.

Tip: you need treats to try things. Earn them, or open chests.

### H1. Each house's preview in the Shop
- [ ] Shop → Houses. All 15 cards show a different scene (sky, ground,
  scenery, house) with your dog standing in front. No two look the same.
- [ ] The cards are in order of tier, cheapest first.
- [ ] Tap the picture on a card. A pop-up opens with the scene moving and
  your dog animated, with **Buy** (or **Show in yard** if you own it).
- [ ] Do this for all 15. Tick each one when its preview opens and nothing
  is cut off or badly placed:
  - [ ] Cozy Den  - [ ] Beach Shack  - [ ] Forest Cabin
  - [ ] Treehouse  - [ ] Mountain Lodge  - [ ] Desert Oasis
  - [ ] Cloud Castle  - [ ] Underwater Palace  - [ ] Sky Tower
  - [ ] Space Station  - [ ] Dragon's Lair  - [ ] Time Fortress
  - [ ] Realm of the Gods  - [ ] Cosmic Sanctuary  - [ ] Dimension X
- [ ] Scrolling the Houses list is smooth.

### H2. Show in yard
- [ ] With no house owned, Home shows the same starter yard as before.
- [ ] Buy a house. Home now shows that house and its backdrop.
- [ ] Own two houses. Shop → Houses → **Show in yard** on the cheaper one.
  Home shows the cheaper one. Close Expo Go fully and reopen: still that one.
- [ ] The dog and the door are fully on screen. (On a small phone the very
  top of the tallest houses may be cut off. Note which house if it looks bad.)

### H3. The ambient animations
- [ ] On Home, each house you own has something moving: smoke, waves and a
  palm, leaves, a canopy, snow, shimmer, clouds, bubbles and kelp, a beacon,
  stars, an ember glow, clock hands, light rays, a nebula, a portal.
- [ ] The movement is slow and smooth, and nothing jumps once a minute.
- [ ] After 10pm, daytime houses get a blue tint. Dark scenes (space, sea
  floor, lair, sanctuary, Dimension X) look the same as in the day.
- [ ] Settings → Accessibility → Motion → Reduce Motion on. Reopen Home:
  nothing in the scene moves.

### H4. The dog goes in and out
- [ ] With a house shown, tap the house (or the Rest button by it). She hops
  to the door, shrinks and fades through it, and appears inside, curled up
  asleep, small, with "z"s floating up.
- [ ] Tap again. She comes back out to her spot.
- [ ] She is still wearing everything she had on, inside and outside.
- [ ] Treehouse, Sky Tower, Space Station: she appears in the window (the
  cabin, the lookout, the dome), not in the door.
- [ ] Tap quickly several times while she is walking. She never gets stuck,
  doubles, or disappears.
- [ ] Reduce Motion on: no walk. She fades out outside and fades in inside.

### H5. Auto-rest during a Sleep block
- [ ] Schedule a task with the **Sleep** pillar that covers the time right
  now. Within a minute she walks inside by herself.
- [ ] Tap to bring her out. She stays out for the rest of that block.
- [ ] Make another Sleep block that ends in two minutes. She goes in, and
  comes out by herself within a minute of the end.
- [ ] Send her in by hand when no Sleep block is on. She stays in until you
  tap.

### H6. Opening each chest tier
- [ ] Shop → Chests. Three chests: Wooden 14, Silver 34, Gold 85 treats.
- [ ] Buy a Wooden Chest. Your treats go down by 14 and the count of
  unopened Wooden Chests goes up by 1.
- [ ] Open it. The chest shakes, the lid pops, the reward floats up, and the
  phone taps (a haptic). The reward is treats, sometimes with an item.
- [ ] The same for a Silver Chest.
- [ ] The same for a Gold Chest, which also gets a burst of sparkles.
- [ ] After opening, the treats on the Shop header match what the reward
  card said, and a won item is in your owned items.
- [ ] Win an item you already own (or keep opening until it happens): the
  card says it was a duplicate and pays half its price in treats.
- [ ] Reduce Motion on: no shake or pop. The reward card shows directly.
- [ ] Close the app in the middle of an opening animation and reopen. The
  chest is gone and the reward is there (it is saved before the animation).
- [ ] At the end of a week with enough adherence, Home offers a chest
  instead of the old weekly treat box.

### H7. The odds shown
- [ ] Each chest card shows its item chance and a line per kind of item:
  Wooden 25%, Silver 40%, Gold 60%.
- [ ] Each card says an item is guaranteed after 4 chests without one, and
  that a duplicate pays half its price.
- [ ] Nowhere in the Shop is there a way to pay real money or watch an ad.

### H8. Sports gear and hero suits on two or more breeds
- [ ] Shop → Outfits. Four jerseys sit with the other Tier 2 outfits, each
  with a 24 on it. Ten hero suits sit in Tiers 3 to 5.
- [ ] Shop → Accessories. Two helmets, a basketball, a football, a baseball
  bat, and a hockey stick sit in Tier 2.
- [ ] Every card shows your dog wearing the item before you buy it.
- [ ] Wear a jersey, a helmet, and a ball. All three show together on Home.
- [ ] Wear a helmet on the **Corgi** and on the **German Shepherd** (press
  and hold the dog to switch). The tall ears are tucked inside the helmet
  and nothing pokes through. Take the helmet off: the ears are back.
- [ ] Wear a helmet on the Maltese or Golden Retriever. The long ears hang
  out below the helmet, and you can see her eyes, nose, and mouth.
- [ ] The football helmet's bars do not cover her eyes on any breed.
- [ ] Wear a hero suit with a cape (Tide Guardian, Aurora Knight, Solar
  Sovereign, Titan of 24) on two breeds. The cape is behind her, and the
  suit fills the body with no fur-colored gaps.
- [ ] Wear a hero suit and the Celestial Wings together. Both show.
- [ ] Take the suit off. Its cape goes with it.
- [ ] Look at each suit. If any of them reminds you of a hero you already
  know from a comic or film, write down which one. They are meant to be new.

### H9. The max outfit animates smoothly
- [ ] Home → gear → hold the word **Settings** → Gallery. Under "Wearing"
  tap **Hero outfit** (Titan of 24, a football helmet, a baseball bat).
- [ ] All four dogs move smoothly. With `npx expo start` the frame counter
  should stay near 60.
- [ ] On Titan of 24 the clock hand on the emblem goes round and a soft glow
  pulses behind it. Try Gravity Warden (two rings orbit the chest), Aurora
  Knight (lights drift on the cape), Frost Sentinel (frost glints), Solar
  Sovereign (the sun collar glows), Quantum Drift (the sheen fades in and
  out).
- [ ] The moving pieces stay on the suit when she hops or curls up to sleep.
- [ ] Turn on Reduce Motion (the switch in the Gallery). Every one of those
  stops.
- [ ] The hardest case: on Home, show a Tier 5 house (Realm of the Gods,
  Cosmic Sanctuary, or Dimension X) and wear a Tier 5 suit, a helmet, and a
  held item. Scroll, tap her, send her inside and out. It should stay smooth.
- [ ] If anything stutters, write down which house, which suit, and which
  phone.

## Wardrobe: items, renaming, breeds (2026-11-14)

Everything here was checked on the laptop only: drawings by looking at PNG
renders (`docs/companion/items/` and `docs/companion/breeds/`), logic by
tests. Open the newest published update in Expo Go. If the app does not open,
note the exact error text, then on the laptop run
`npx eas-cli update:republish --group b40b33db-969b-4176-8ccf-6902851350ef`
to go back to the update before this run.

### W1. Try on items in the Shop
- [ ] Shop → Outfits. Every card shows your dog wearing that item, including
  items you do not own yet.
- [ ] Shop → Accessories. Same: hats on her head, glasses on her eyes, the
  wand and staff in her paw, wings behind her.
- [ ] Scrolling both lists is smooth.

### W2. Wear and take off
- [ ] Buy a cheap item. The "Purchased!" pop-up offers **Wear now** and
  **Not now**. Tap Wear now.
- [ ] Go to Home. She is wearing it.
- [ ] Back in the Shop, the card now says **Take off**. Tap it. Home shows
  her without it.
- [ ] Own two hats. Wearing the second replaces the first.
- [ ] Wear a hat and a neck item together. Both show.
- [ ] Close Expo Go fully and reopen. She is still wearing the same things.
- [ ] The Journal's empty state and the streak pop-up show the same outfit.

### W3. The max outfit animates smoothly
- [ ] Home → gear → hold the word **Settings** → Gallery. Under "Wearing"
  tap **Max outfit**.
- [ ] All four dogs wear seven items each and still move smoothly. When
  running with `npx expo start` a frame counter shows: it should stay near 60.
- [ ] Nothing slides off her: the crown stays on her head when she hops, the
  staff stays in her paw, the wings stay behind her shoulders.
- [ ] The glow pulses gently and the rune circle turns slowly.
- [ ] Turn on Reduce Motion (the switch in the Gallery). The glow, halo, and
  runes stop moving too.
- [ ] If it stutters, write down which state and which phone.

### W4. Rename from Home
- [ ] On Home, tap her name (it has a small pencil). A pop-up opens with the
  name in a text box.
- [ ] Type a new name, tap Save. Home shows the new name at once.
- [ ] Try saving an empty name: it refuses and says why.
- [ ] A name longer than 20 characters is not accepted.
- [ ] Settings still has the name field, and it shows the new name.
- [ ] Gallery → **Rename** opens the same pop-up.

### W5. Switch breeds with items still on
- [ ] Press and hold the dog on Home for about a second. "Choose your dog"
  opens. (Also: Settings → Your Dog → Choose your dog.)
- [ ] Swipe through six dogs: Maltese, German Shepherd, Golden Retriever,
  Corgi, Shiba Inu, Pug. Each one is wearing what yours wears now.
- [ ] Pick one and tap Choose. Home shows the new dog, with the same name and
  the same items.
- [ ] The items sit in the right place on every breed: hats between or above
  the ears, glasses over both eyes (wider on the Pug), outfits filling the body.
- [ ] A quick tap on the dog still gives a heart, and does not open the picker.
- [ ] Stroking her head still pets her.
- [ ] Each breed moves like the Maltese: breathing, blinking, tail wagging,
  ears lifting when happy, curled up asleep at night.

### W6. Show in yard
- [ ] Own two houses of different tiers. Shop → Houses: each owned house has
  a **Show in yard** button.
- [ ] Tap it on the cheaper house. Home shows the yard for that tier.
- [ ] The button now reads **✓ In yard**. Tap it again: the yard goes back to
  your best house.

### W7. The shield badge
- [ ] Buy a Streak Shield. Home shows a small blue badge with a shield and
  the number 1, next to the streak badge.
- [ ] Buy another: it shows 2.
- [ ] With no shields, there is no badge.

## Maltese companion (2026-11-13)

The new companion was checked on the laptop only: the drawing by looking at
PNG renders (`docs/COMPANION.md`), the logic by tests. **Motion has never been
seen by anyone.** These checks are the first time.

This update sits on top of the SDK 58 upgrade, which has also not been
confirmed on the phone yet. If the app does not open at all, the cause could
be either one: note the exact error text. To go back to the SDK 58 update
without the new dog, run on the laptop:
`npx eas-cli update:republish --group 39a9e94e-f34c-49cb-8b6f-bf9b269c3f26`

Open the published update "New Maltese companion" in Expo Go.

### C0. She is there
- [ ] Home opens with no red error screen. A white Maltese with a purple bow
  sits on the grass in the yard, where the German Shepherd used to be.
- [ ] She is moving: breathing, blinking now and then, tail swaying.
- [ ] If the app shows an error naming `react-native-svg`,
  `react-native-reanimated`, `react-native-worklets`, or `RNGestureHandler`,
  write down the exact words and stop here.

### C1. Open the Gallery
- [ ] Home → gear → hold your finger on the word **Settings** at the top for
  about a second. "Companion Gallery" opens. (When running from the laptop
  with `npx expo start`, there is also a "Developer" section at the bottom of
  Settings with a button.)
- [ ] All four states show side by side: idle, happy, celebrating, sleeping.

### C2. Smoothness (no stutter)
- [ ] Idle: breathing is a slow, even rise and fall. No ticking or jumping.
- [ ] Happy: the tail wags fast and the hops land with a little squash. Ears
  and topknot trail slightly behind the head.
- [ ] Celebrating: she jumps with a wiggle, wears a party hat, and sparkles
  pop around her.
- [ ] Sleeping: she lies flat with eyes closed, breathing slowly, and three
  "z"s float up and fade.
- [ ] Scroll the Gallery up and down while they animate. The motion stays
  smooth and nothing freezes.
- [ ] Drag the Size slider from 64 to 240. She stays sharp at every size, and
  no part drifts away from the rest of her (an ear or the bow sliding off
  would mean a pivot bug).

### C3. Tap and pet
- [ ] Tap her. She squashes and pops back, a heart floats up, the phone gives
  a light tick, and the "Taps" number under the grid goes up by one.
- [ ] Put a finger on her forehead and stroke side to side for a full second.
  Her eyes close into a smile, her head leans toward your finger, and her tail
  wags. Lift the finger: she eases back to normal.
- [ ] Do the same on Home, in the yard. Then drag **up and down** starting on
  her: the page still scrolls and pull-to-refresh still works.

### C4. Reduce Motion
- [ ] In the Gallery, turn on "Reduce motion". All looping stops. No
  sparkles. She still blinks, but only about every 10 seconds. The "z"s are
  shown but still.
- [ ] Tap her: a heart fades in place (it does not travel) and the tick still
  happens.
- [ ] Turn the switch off: motion comes back.
- [ ] Optional, the real setting: iPhone Settings → Accessibility → Motion →
  Reduce Motion ON, then look at Home. Turn it off again afterwards.

### C5. Visible on every background
- [ ] In the Gallery, tap **Warm white**, **Day**, **Night** in turn. On each
  one you can clearly see her outline, eyes, nose, and bow.
- [ ] Set the size to 64 and check the same three. On warm white she should
  be pale but clearly readable.
- [ ] On Home by day: she stands out against the sky and grass.
- [ ] On Home at night (after 10pm, or change the phone clock as in item 1
  below): she is asleep, and clear against the dark sky. **Set the clock back
  to automatic afterwards.**

### C6. Moving between states
- [ ] On Home, complete a task so she goes from idle to happy. The change
  eases over about a third of a second. Nothing snaps.
- [ ] Switch to another tab and back. She is still animating, and did not
  restart with a jump.

### C7. Accessories and the modals
- [ ] In the Gallery, tap each "Wearing" chip: Party hat, Scarf, Bow tie,
  Collar. Each appears in the right place and moves with her.
- [ ] If you own one of those four in the Shop, she wears it on Home (the
  newest one you bought).
- [ ] The next streak-milestone or weekly-box pop-up shows the Maltese, not
  the German Shepherd.
- [ ] Journal with no entries yet (only visible on a fresh install or after
  "Delete all my data"): the small dog there is the Maltese.

### C8. Battery and heat (after a few minutes)
- [ ] Leave Home open for two minutes. The phone does not get warm and the
  rest of the screen (clouds, bars) still animates smoothly.

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

## Stadiums and deliveries run (2026-11-15)

Covers Phase A (four stadium houses), Phase B (ten hero accessories Tiers 3–5),
and Phase C (twice-weekly treat deliveries). Open update group
`6c6b2cc4-9793-4fcc-a1b3-044ec7459ea2` in Expo Go.
To roll back: `npx eas-cli update:republish --group 3e1d507f-dbcb-4ef6-b8af-74552da73a81`

### D1. Stadium houses in the Shop and yard

- [ ] Shop → Houses. Four stadium houses appear in Tier 3: Arena Bowl, Track
  Oval, Court House, Velodrome. Each card shows a backdrop distinct from every
  other house.
- [ ] Tap the picture on each. The preview pop-up opens showing the backdrop
  moving, with the dog standing at the door. **Buy** or **Show in yard** shows.
- [ ] Buy or show each in the yard in turn. Home updates to the matching backdrop.
- [ ] Arena Bowl: floodlit stadium bowl visible, scoreboard in the background.
- [ ] Track Oval: outdoor track oval with start-line markings.
- [ ] Court House: hardwood court, centre circle, bleachers.
- [ ] Velodrome: banked cycling track, overhead lights.
- [ ] None of the four shows any real team name, league name, or real emblem.
- [ ] The dog walks in and out of each one the same way as other houses (H4).
- [ ] Ambient animation matches the venue (lights, motion, atmosphere).

### D2. Hero accessories in the Shop

- [ ] Shop → Accessories. Ten new hero items appear in Tiers 3–5:
  - Tier 3: Guardian Shield, Mystic Staff, Power Gauntlet
  - Tier 4: Storm Wings, Quantum Orb, Solar Crown, Shadow Cloak
  - Tier 5: Arcane Tome, Titan Lance, Celestial Halo
- [ ] Every card shows the dog wearing the item before purchase.
- [ ] Equip one Tier 4 or 5 item. Home shows it on the dog, in the right position.
- [ ] Equip a hero suit and a hero accessory together. Both show on Home at once.
- [ ] Equip a hero accessory on two different breeds. The item sits in the right
  place on both and nothing pokes outside the dog's bounding box.
- [ ] No item name or card text mentions Marvel, DC, or any other published
  character, team, or league.

### D3. Treat deliveries arriving

- [ ] Settings → tester section → **Force delivery**. If the button is not
  visible, scroll to the bottom of Settings.
- [ ] Go back to Home. A delivery card appears above the treat card. It shows a
  closed box with a "tap to open" hint.
- [ ] Tap the box. It opens. The card shows content (a quote, book, movie, or
  activity suggestion), a one-line "why you got this" reason, and 👍 / 👎
  feedback buttons and a Save button.
- [ ] The footer reads **"Picked on your phone from your week"** (exact text).
- [ ] +3 bones are added to the treat count when the card opens.
- [ ] Tap 👍. The card stays open but the button is now selected.
- [ ] Tap 👎. The 👍 deselects and 👎 is selected.
- [ ] Tap Save (the star icon). The card stays open and Save is highlighted.
- [ ] Swipe or dismiss the card. It disappears from Home.
- [ ] Force a second delivery in the same session. A second card appears (max 2
  cards on Home at once; a third force tap should not add a third card).

### D4. Delivery history in Analytics

- [ ] After opening at least two deliveries, go to Analytics → scroll down.
  A "Treat deliveries" section shows each opened delivery with its emoji
  (📖 for a book, 🎬 for a movie, 💡 for a quote, 🏃 for an activity), its
  headline, the date it arrived, and the feedback icon if given.
- [ ] A saved delivery shows a filled star next to its row.
- [ ] Rows are sorted newest first.
- [ ] Scrolling is smooth.

### D5. Support card (crisis path)

To test this you need to enter crisis language in a journal entry.
**Do this on a test account or after a data wipe, not on your real data.**

- [ ] Journal → write an entry containing "I want to die" or "no reason to live".
- [ ] Settings → Force delivery.
- [ ] Home → open the delivery card. It shows the support card, not a quote or
  activity. The card is calm, non-alarming, and says something like
  "It sounds like things are hard right now."
- [ ] The number **988** appears in the card and is tappable. Tapping it opens
  the phone dialler with 988 pre-filled (or offers to call in a dialog).
- [ ] The card does **not** show a book or movie recommendation.
- [ ] The footer still reads "Picked on your phone from your week".
- [ ] Clear the test journal entry afterwards.

## Delivery fix and art polish run (2026-11-15)

Replaces checks D3 above where they differ.

### E1. A forced delivery shows a real recommendation

- [ ] Settings → tester section → **Force delivery**. The alert says a treat
  delivery is waiting on Home.
- [ ] Home: a card with a cardboard box and "Tap to open your delivery".
- [ ] Tap the box. It wiggles, the lid flaps open, bones and confetti burst
  out, then the card slides up and the phone gives a thump.
- [ ] The card shows a type (Quote, Book, Watch, or Try this), a "why you got
  this" line in italics, a title, a second line (author, year, minutes, or
  who said it) and a one-line pitch. None of them is blank.
- [ ] The card **stays on Home**. Switch to another tab and back: still there.
- [ ] +3 bones were added once.
- [ ] 👍 highlights. Save turns purple and reads "✓ Saved".
- [ ] Tap ✕. The card leaves Home. Analytics → Treat deliveries lists it with
  its title, 👍 and a star.
- [ ] Force delivery twice more. Two boxes are on Home.

### E2. Reduce Motion

- [ ] iPhone Settings → Accessibility → Motion → Reduce Motion on.
- [ ] Force a delivery and tap the box. The card appears at once: no wiggle,
  no confetti.

### E3. The threshold hint

Needs a fresh install (or Settings → reset all data).

- [ ] Home shows "📦 First treat delivery unlocks soon" with three small bars:
  Days 0/7, Tasks 0/10, Journals 0/3. No delivery box.
- [ ] Complete a task, go back to Home: Tasks reads 1/10.
- [ ] Write a journal entry: Journals reads 1/3.
- [ ] Force delivery still works while the hint would be showing.

### E4. Support card

- [ ] Journal an entry containing "I want to die", then Force delivery.
- [ ] Home shows the support card (no box, no bones). Tapping the 988 panel
  offers to call 988.

### E5. Stadiums, redrawn

- [ ] Shop → Houses → each of the four stadiums: the card shows a whole
  building with a "24" scoreboard, not a slab cut off at the edge.
- [ ] Use each one. In the yard: the crowd bobs, the lights or jumbotron glow,
  a ball or puck moves now and then. The yard stays smooth.
- [ ] Tap the stadium: the dog walks to the tunnel and is seen asleep in it.

### E6. Hero full sets, redrawn

- [ ] Shop → try on each hero suit with its accessory. "Full set!" appears.
- [ ] Capes show behind the body on both sides. Masks leave both eyes visible.
- [ ] Switch breed (press and hold the dog) and repeat for one suit with a
  mask and the Aurora Knight with its helm. Nothing floats or clips.
