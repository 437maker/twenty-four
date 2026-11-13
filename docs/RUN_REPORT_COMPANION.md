# RUN_REPORT_COMPANION.md — the Maltese companion

Run date: 2026-11-13. Ran unattended from `MALTESE_PROMPT.md`.

## Result

**The German Shepherd PNGs are replaced by an original Maltese puppy, drawn in
code and animated, and the update is published.** The drawing was reviewed on
the laptop through four rounds of PNG renders. The logic is covered by 51 new
tests. **Nobody has seen her move yet**: there is no iPhone or iOS simulator
on the Windows laptop, so smoothness, the gestures, and the haptic are
unverified until you run the checks in `docs/MANUAL_CHECKS.md`.

This update also sits on top of the SDK 58 upgrade, which has not been
confirmed on the phone either. If the app does not open, either could be the
cause.

## The final renders

- All states on all backgrounds, 240px: [companion/sheet-240.png](companion/sheet-240.png)
- The same at 64px: [companion/sheet-64.png](companion/sheet-64.png)
- Accessories: [companion/accessories.png](companion/accessories.png)
- 24 single images, `<state>-<background>-<size>.png`, in [companion/](companion/):

| | warm white | day | night |
|---|---|---|---|
| idle | [64](companion/idle-warmWhite-64.png) · [240](companion/idle-warmWhite-240.png) | [64](companion/idle-day-64.png) · [240](companion/idle-day-240.png) | [64](companion/idle-night-64.png) · [240](companion/idle-night-240.png) |
| happy | [64](companion/happy-warmWhite-64.png) · [240](companion/happy-warmWhite-240.png) | [64](companion/happy-day-64.png) · [240](companion/happy-day-240.png) | [64](companion/happy-night-64.png) · [240](companion/happy-night-240.png) |
| celebrating | [64](companion/celebrating-warmWhite-64.png) · [240](companion/celebrating-warmWhite-240.png) | [64](companion/celebrating-day-64.png) · [240](companion/celebrating-day-240.png) | [64](companion/celebrating-night-64.png) · [240](companion/celebrating-night-240.png) |
| sleeping | [64](companion/sleeping-warmWhite-64.png) · [240](companion/sleeping-warmWhite-240.png) | [64](companion/sleeping-day-64.png) · [240](companion/sleeping-day-240.png) | [64](companion/sleeping-night-64.png) · [240](companion/sleeping-night-240.png) |

Design rationale, the review rounds, and the rig pivots are in
[COMPANION.md](COMPANION.md). Regenerate the images with
`npm run render:companion`.

My own verdict on the drawing, from the renders: she reads as a Maltese
(white floor-length coat, long hanging ears, topknot with bow, plume tail,
black button eyes and nose), the proportions match the spec, and she is
visible on all three backgrounds. Weakest points: at 64px on warm white she is
pale (readable, but only the outline separates her from the page); the tail is
half hidden behind the right ear when she faces you; and the sleeping pose is
the same parts flattened and rearranged rather than a separately drawn curl.

## What each state does

| State | Motion |
|---|---|
| idle | Breathing (body ±2.5%, 3.2s cycle). Blink at a random 2.5–6s interval, lids closed 120ms. Slow tail sway. One ear flop every 6–10s. Head tilt of about 6° every 7–12s, topknot following a beat late. |
| happy | Mouth open, tongue out. Tail wag at 3 per second. Small hops: crouch, up, down, squash on landing. Ears and topknot follow 60–110ms after the head. |
| celebrating | Party hat. Bigger jumps with a crouch first, a wiggle in the air, and a landing squash. Ears flap. 8 sparkles pop outward and fade. Smiling eyes. The screen returns her to happy after 5s, as before. |
| sleeping | Flattened body, head resting low, eyes closed as curved lines, tail tucked. Breathing at a 5s cycle. Three "z"s float up and fade in a loop. |

- **State changes** ease over 340ms. Nothing snaps.
- **Tap:** squash, pop back with an overshoot, spring settle, short wiggle, a
  heart that rises and fades, a light haptic, and `onPress`.
- **Petting:** a sideways stroke across her head for 1 second makes her close
  her eyes into a smile, lean toward the finger, and wag.
- **Reduce Motion:** no loops, no sparkles, a blink at most every 10 seconds,
  state changes crossfade, the heart fades in place.
- **Screen not focused:** all loops and timers stop.

## Where she appears now

| Place | Before | Now |
|---|---|---|
| Home yard | PNG with a breathing scale and a hop | `<Companion>`, tappable and pettable, on the grass with her ground shadow |
| Streak-milestone modal | PNG | `<Companion state="celebrating">` (not tappable) |
| Weekly-box modal | PNG | `<Companion state="happy">` (not tappable) |
| Journal empty state | PNG | `<Companion state="idle">` at 100px (not tappable) |
| Settings → Companion Gallery | did not exist | all four states, Reduce Motion switch, size slider 64–240, background and accessory pickers |

The Gallery opens from a "Developer" row when running with `npx expo start`,
and by holding the "Settings" title for about a second in any build
(decision D22).

Shop items drawn on the rig: Party Hat, Cozy Sweater (as a scarf), Bow Tie,
Golden Collar. She wears the newest one you own. The other 26 Outfit and
Accessory items are follow-ups, listed in `COMPANION.md`.

## Libraries, with Expo Go confirmation

| Library | Installed | In Expo Go for SDK 58? |
|---|---|---|
| `react-native-svg` | 15.16.0 | Yes. "Included in Expo Go" label: https://docs.expo.dev/versions/v58.0.0/sdk/svg/ |
| `react-native-reanimated` | 4.7.1 | Yes. Label: https://docs.expo.dev/versions/v58.0.0/sdk/reanimated/ . The page says no Babel config is needed; confirmed by finding compiled worklets in the exported bundle |
| `react-native-worklets` | 0.13.0 | Required by Reanimated 4. Installed by the same `expo install` command the Reanimated page gives |
| `expo-haptics` | ~58.0.8 | **No label on its page, either way** (https://docs.expo.dev/versions/v58.0.0/sdk/haptics/). Confirmed instead from Expo Go's own dependency list for SDK 58, which includes it: https://github.com/expo/expo/blob/sdk-58/apps/expo-go/package.json . Loaded inside `try/catch`, so if it were missing the tap would just not vibrate (decision D17) |
| `react-native-gesture-handler` | ~3.3.0 | Yes, already installed and labelled (see `UPGRADE_SDK58.md`) |

The same Expo Go dependency list pins `react-native-svg 15.16.0`,
`react-native-reanimated 4.7.1`, and `react-native-worklets 0.13.0`: exactly
the versions installed. No fallback to the `Animated` API was needed.

Dev-only additions (never in the app bundle): `@resvg/resvg-js` for the render
script, `react-test-renderer` for component tests.

## Tests and checks

```
Before:  Test Suites: 7 passed   Tests: 115 passed
After:   Test Suites: 8 passed   Tests: 166 passed   (51 new, in __tests__/companion.test.tsx)
```

| Required test | Where |
|---|---|
| State-to-pose mapping | `state to pose mapping` (6 tests) and `partTransform` (8 tests) |
| Reduce-motion path starts no loops | `reduce motion` (11 tests): no `withRepeat` call in any state, including after a state change and after switching it on mid-animation; the matching "loops do start when it is off" tests prove the check can fail |
| Tap fires `onPress` and the haptic | `tap` (4 tests), haptic mocked |
| Gallery renders all four states | `Companion Gallery` (4 tests) |
| Extra | petting needs a 1s stroke on the head (3), accessories (5), drawing helpers (4), rendering and accessibility (6) |

- `npx tsc --noEmit`: clean.
- `npx expo-doctor@latest`: "20/20 checks passed. No issues detected!"
- `npx expo install --check`: "Dependencies are up to date".
- `npx expo export --platform ios`: succeeds.
- The 3 `test.failing` bug tests are untouched. No business logic, database
  code, or `docs/BUGS.md` item was changed.

What the tests cannot see: pixels, frame rate, real touches, real vibration.

## Publish

```
Branch           main
Runtime version  exposdk:58.0.0
Update group ID  b40b33db-969b-4176-8ccf-6902851350ef
iOS update ID    01a1d6b7-aee5-75fd-b521-5a053b0c334a
Message          New Maltese companion
Commit           904ff2d
```

Confirmed with `npx eas-cli update:list --branch main` (it is the newest
group, above "Upgrade to Expo SDK 58") and by a request to Expo's update
server with Expo Go's headers (HTTP 200, same update ID).

Dashboard: https://expo.dev/accounts/sahil_4/projects/twenty-four/updates/b40b33db-969b-4176-8ccf-6902851350ef

**If she is broken on the phone**, go back to the previous update (SDK 58, old
dog) with one command on the laptop:

```powershell
npx eas-cli update:republish --group 39a9e94e-f34c-49cb-8b6f-bf9b269c3f26
```

## Commits

| Commit | What |
|---|---|
| `6951565` | Add svg, reanimated, worklets, haptics; jest setup |
| `c2f8592` | The drawing as shape data, palette, poses, render script, PNGs |
| `a442f57` | The animated rig and `<Companion>` |
| `676f36a` | Replace the PNGs in the app; Gallery screen; 51 tests |
| `904ff2d` | Docs: COMPANION, DECISIONS, MANUAL_CHECKS, LEARNING_LOG, README numbers |
| (this file) | Run report |

## Decisions (docs/DECISIONS.md)

| # | Decision |
|---|---|
| D15 | PNGs replaced everywhere, files kept for rollback; how to roll back |
| D16 | The rig is layers of views, each holding one SVG part, instead of animating inside a single SVG |
| D17 | `expo-haptics` kept although its docs page has no Expo Go label; confirmed from Expo Go's dependency list; loaded safely |
| D18 | Tap plus a sideways-only stroke, so the Home page still scrolls |
| D19 | Not tappable inside the celebration modals and the Journal empty state |
| D20 | She wears the newest owned item the rig can draw; Cozy Sweater is drawn as a scarf |
| D21 | Party hat always on while celebrating, always off while sleeping |
| D22 | Gallery also opens with a long-press on the "Settings" title, because `__DEV__` is false in the published update |
| D23 | Outline is 3.2 units and thickens at small sizes |
| D24 | Jest: Reanimated's resolver and `setUpTests()`, a hand-written gesture-handler mock, `react-test-renderer` |
| D25 | The render script imports the app's TypeScript directly (needs Node 22.15+) |
| D26 | The untracked folder `assets/images/cutout/` was left alone |
| D27 | Published without a device test |

Where the run departed from the letter of the prompt:
- **Rig structure (D16).** The spec says each moving part is its own `<G>`
  in `MalteseSvg.tsx`. That is true for the static `<MalteseSvg>`. The
  animated component moves each part as its own view layer instead.
- **Gallery access (D22).** Not strictly dev-only.
- **Haptics label (D17).** Could not be confirmed on docs.expo.dev as asked;
  confirmed from Expo's source instead.
- **Eyelids** are a fur-colored cover that scales down from a hinge at the
  top of the eyes, rather than a rotating lid. Same effect, simpler.

## What you must check on the iPhone

Section "Maltese companion" at the top of `docs/MANUAL_CHECKS.md`. In short:

1. Home opens with no error, and a white Maltese is breathing in the yard.
2. Open the Gallery (hold the "Settings" title for a second). All four states show.
3. Smoothness: no stutter in any state, including while scrolling and while
   dragging the size slider. No part drifts away from the body.
4. Tap her (squash, heart, tick) and pet her (stroke sideways across her head
   for a second). On Home, dragging up and down on her still scrolls.
5. Turn on Reduce Motion: loops and sparkles stop, slow blink only.
6. Visibility on warm white, day, and night, at 64px and at full size.

## Known risks, most likely first

1. **Motion tuning.** Timings and angles were chosen from the spec and from
   animation principles, never watched. Expect to want changes (a hop too
   bouncy, a wag too wide). The numbers are at the top of
   `useCompanionRig.ts` and in `poses.ts`.
2. **A part pivoting around the wrong point** on the phone (an ear swinging
   from its middle). The pivots are tested as numbers, but how the phone
   applies them was not seen. Check C2 in the manual checks catches it.
3. **Petting versus scrolling** on Home may need its thresholds adjusted.
4. **Performance on an older iPhone.** One dog is about 15 small layers.
   The Gallery shows four at once and is the stress test.
5. **A startup crash from one of the new native libraries.** Versions match
   Expo Go's exactly, so this is unlikely, but it is the one that would stop
   the app from opening. The republish command above undoes it.
