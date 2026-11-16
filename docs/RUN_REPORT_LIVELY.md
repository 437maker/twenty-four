# Run report: livelier dog, smoother time picker, process prompts (2026-11-16)

Ran unattended from `LIVELY_PROMPT.md`. All four phases are done, pushed to
`main`, and published.

| Check | Result |
|---|---|
| `tsc --noEmit` | clean |
| `jest` | 22 suites, 1000 tests, all passing (was 19 suites, 790 tests) |
| `expo-doctor` | 20 of 20 checks passed |
| New native libraries | none (Expo Go, SDK 58) |
| Hard stops used | none. No step was reverted |

**What was not checked, because it needs a phone:** frame rate, how the
wheel feels, the haptic ticks, and how the moments look in motion. The key
frames of every moment were rendered and looked at, the logic is tested, and
the checks to do by hand are in `docs/MANUAL_CHECKS.md` under "Lively run".

## Published updates

| Phase | Commit | EAS update group |
|---|---|---|
| A. The dog | `8678eeb` | `f05b7d32-d2e0-4b01-b579-5a1a313e5599` |
| B. Time picker | `b5356a9` | `53c8453d-045f-4be6-8091-320381f417ae` |
| C. Journal prompts | `9535716`, `99ccbcd` | `0af3c7e3-4b0c-4a7a-b9ff-f9ae931f6c61` |
| D. Delivery rule, this report | `de210b8` | `f3c860f5-dccd-4744-9400-2f00f1461925` |

## Phase A: the dog never feels repetitive

| Item | Status |
|---|---|
| Idle library: the 14 named moments, each 1.7 to 3.4 s | Done, plus 2 gentle ones (slow blink, small wag) |
| Context moments: morning stretch, evening drowsy blinks, proud pose, sleep twitches, dream bubble | Done |
| Reactions: task done, Sleep task done, journal saved, streak 7 / 30 / 100, back after 24 hours | Done |
| Director: every 6 to 14 s, no repeat in the last 4, rare moments at 5%, paused off screen | Done, tested |
| Reduce Motion: gentle moments only | Done, tested |
| 6 breeds, every outfit, the house rest state still work | Done, tested |
| Held items stay in the paw, capes follow | Done: a held item is on the paw layer; a new `cape` part trails the motion |
| No React re-render per frame | Done by design: a moment is three assignments, then the UI thread samples it |
| Frame counter check with a full outfit | **Not done: needs the phone.** Gallery → Moments is set up for it |
| Key-frame strips, 2 breeds, 2 review rounds | Done: `docs/companion/moments/`, 29 strips |
| Tests | `__tests__/moments.test.tsx`, 100 tests |

Where to read about it: `docs/COMPANION.md`, section "Moments". Decisions
D75 to D78.

Things you might not expect:
- "Roll over" is a flop onto her side with a wiggle, and "chase her tail" is
  a flat flip. She is a front-facing drawing with no back or belly (D75).
- The reactions to a task and a journal entry play when you next look at
  Home, because she is not on the Schedule or Journal tabs (D77).
- "Missed you" fires on a cold start after 24 hours, not when the app comes
  back from the background (D77).
- The pose gained seven numbers (a step, a turn, a zoom, paw offsets). No new
  parts are drawn (D75).

## Phase B: a smooth time picker

| Item | Status |
|---|---|
| No `setState` per scroll event; index tracked on the UI thread; commit on settle | Done, tested |
| `snapToInterval`, `decelerationRate="fast"`, memoized rows, `removeClippedSubviews` | Done |
| `FlatList` / `getItemLayout` | Used a Reanimated scroll view instead, which the spec allowed (D79) |
| Haptic tick once per row, from the UI thread, throttled | Done (45 ms), rule tested |
| Rows scale and fade near the centre | Done |
| Quick chips Now, +15m, +30m, +1h | Done, tested, including past midnight |
| Duration chips 15m to 2h | Done, tested |
| Tap the time to type `9:30` or `930p` | Done, tested (22 accepted forms, 16 refused) |
| Last used duration per pillar | Done: `settings.last_durations` |
| Applied everywhere `WheelPicker` is used | Done: the task form, its only user |
| Tests | `__tests__/timePicker.test.tsx`, 67 tests |

"Profile `WheelPicker`" could not be done on a phone. The cause was found by
reading the code: the highlighted row was React state, so every row
re-rendered while the wheel turned, and JavaScript sent its own `scrollTo`
after each scroll, fighting the native snap (D79).

Choices to know about (D80): the wheel still moves in quarter hours, so a
typed 9:10 becomes 9:15; the + chips push the time shown in the form, they
are not "from now"; a typed 1 to 12 with no "a" or "p" follows the AM/PM
wheel.

## Phase C: process-based journal prompts

| Item | Status |
|---|---|
| At least 70 new prompts, own words | 78, plus 4 gentle self-care prompts |
| Seven new categories | 11 or 12 prompts each |
| Formats fill, scale, two-minute, zoom, letter | Done, each in at least 4 categories |
| Journal screen: 1 to 5 chips, 2-minute countdown | Done |
| Smart selection from the week's signals | Done, tested |
| No repeat within 30 days | Done: `settings.prompt_history`. Tested over a simulated year for each rule |
| "Different prompt" within the same category | Done, tested |
| `source` tag, no book quotes in the UI | Done. A test bans the titles, authors and best-known phrases |
| Tests | `__tests__/journalPrompts.test.tsx`, 37 tests |

Decisions D81 to D83. The one to check is the order of the rules when
several apply: stressed first, then low completion, then a pillar neglected
two weeks running, then a strong week (D83).

The Journal screen itself has no rendering test (it had none before). Its
logic is in tested pure functions; the screen is in the manual checks.

## Phase D: the delivery rule gap

| Item | Status |
|---|---|
| Completion under 40% → +20 to `process` / `small-wins` items | Done in `scoreItem` |
| 10 or more library items with those tags | 15: 7 activities, 4 books, 4 films |
| Why line | "Rough follow-through this week. Here's a small way back in." |
| Test | 6 tests in `__tests__/delivery.test.ts` |
| Rules table updated | `docs/RUN_REPORT_STADIUMS_DELIVERY.md` |

The rule needs at least 3 tasks in the week (D84). In 200 seeded picks for
a 30% week, 74 were small-win items, against far fewer in an ordinary week.
It is not every pick, because the pick is from the top fifth by score and
the most neglected pillar still earns +25.

## Database

Three new columns on `settings`, added with the usual `ALTER TABLE` on
launch. Nothing existing was changed.

| Column | Holds |
|---|---|
| `last_opened_at` | time of the last app open, for "missed you" |
| `last_durations` | JSON: duration last used for each pillar |
| `prompt_history` | JSON: journal prompts shown in the last 30 days |

## Left for you

1. The iPhone checks in `docs/MANUAL_CHECKS.md`, "Lively run". The two that
   matter most: the frame counter in Gallery → Moments with "Max outfit" on,
   and the feel of the wheel.
2. If the duration wheel ever shows blank rows, set `CLIP_FROM_ROWS` in
   `WheelPicker.tsx` to a large number (D79).
3. `HOUSES_PROMPT.md`, `LIVELY_PROMPT.md`, `STADIUMS_DELIVERY_PROMPT.md` and
   `assets/images/cutout/` were untracked before this run and were left
   untracked.
