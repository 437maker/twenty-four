# RUN_REPORT_STADIUMS_DELIVERY.md — Stadium houses, hero accessories, and treat deliveries

Run date: 2026-11-15. Prompt: `STADIUMS_DELIVERY_PROMPT.md`.

## Summary

Every phase is done. Four new Tier-3 stadium houses appear in the yard and
Shop. Ten hero accessory items (Tiers 3–5) work on all six breeds. Twice-weekly
treat deliveries arrive on the Home screen, picked entirely on-device from the
user's week — no AI API, no network calls, no journal text ever leaves the phone.

**Not checked: anything on a real phone.** There is no iPhone or simulator
on the Windows laptop. All logic is verified by tests. Whether the stadium
backdrops look right, whether the delivery card opens smoothly, and whether the
support card's 988 link works are all unknown until the checks in
`docs/MANUAL_CHECKS.md` are run.

## Results

| Check | Result |
|---|---|
| `tsc --noEmit` | clean |
| Tests | 760 passing, 18 suites (720 before Phase C tests) |
| Published, end of Phase A | update group `4c0d6218-9d33-4b7d-b5e9-ecd9d4a7dd31` |
| Published, end of Phase B | update group `0ea60d44-5b74-460a-9fa2-2a4cd2f7cf23` |
| Published, end of Phase C | update group `6c6b2cc4-9793-4fcc-a1b3-044ec7459ea2` |

To roll back to before this run:
`npx eas-cli update:republish --group 3e1d507f-dbcb-4ef6-b8af-74552da73a81`

## Per phase

| Phase | Status | Commits |
|---|---|---|
| A. Four Tier-3 stadium houses | done | `1b4c8d5` |
| B. Ten hero accessories (Tiers 3–5) | done | `2631b81` |
| C. Twice-weekly treat deliveries | done | `9bd70d7` |

Nothing was skipped.

## Content library

| Type | Count | Notes |
|---|---|---|
| Quotes | 60 | ≤25 words each; well-known or attributed to "24"; no song lyrics |
| Books | 44 | title, author, one-line pitch, pillar tags |
| Movies / shows | 44 | title, year, one-line pitch, pillar tags |
| Activities | 47 | title, pitch, pillar tags, duration_min |
| **Total items** | **195** | unique ids across all four types |

15 of these were added by the lively run (2026-11-16) and are tagged
`process` or `small-wins`: 7 activities, 4 books, 4 films.

## Delivery picker rules

Scores start at 50. What adds to a score (`scoreItem` in `utils/delivery.ts`):

| When | Items tagged | Points |
|---|---|---|
| Journal mood negative or trending down | `comfort` / `calm` | +20 / +10 |
| More than 2 stressed words | `calm` / `comfort` | +15 / +10 |
| More than 2 tired words | `sleep` / `care` | +15 / +10 |
| A strong week | `challenge` / `motivate` | +20 / +10 |
| Under 40% of tasks done (3 or more tasks) | `process` or `small-wins` | +20 |
| A pillar is the most neglected | items for that pillar | +25 |
| A dominant theme in the journal | that theme | +15 |
| 👍 / 👎 given before | the tags of that card | the stored weight |

- **Scheduler:** mulberry32 seeded with `year * 1000 + week`. Same week always
  gives the same two delivery days. Days are non-consecutive (gap ≥ 2).
- **Signals (all on-device):** pillar balance, follow-through rate, journal mood
  (positive / neutral / negative), dominant themes, crisis language detection.
- **Crisis path:** phrase-level match on crisis word set. Any match inserts a
  delivery with `content_id = 'crisis'` → support card with 988 hotline. Normal
  sad words ("frustrated", "tired") do not trigger it.
- **Mood weighting:** negative mood → 2× score boost for items tagged `comfort`.
- **Pillar weighting:** most neglected pillar → 1.5× score boost for activities
  with that pillar tag.
- **Follow-through weighting** (added 2026-11-16): fewer than 40% of the
  week's tasks done, with at least 3 tasks in the week → +20 for items
  tagged `process` or `small-wins`. Their why line reads "Rough
  follow-through this week. Here's a small way back in."
- **Repeat prevention:** last 56 content ids (≈8 weeks) stored in
  `delivery_content_history`. Any id in that set is excluded.
- **Type rotation:** last 10 card types stored in `delivery_type_history`. If
  the same type appears at the two most-recent positions, it is excluded from
  the next pick.
- **Top-20% pick:** items are scored, sorted, and one is chosen at random from
  the top quintile.
- **Privacy footer:** every card shows "Picked on your phone from your week".

## Stadium houses (Phase A)

Four new houses in the existing house catalog at Tier 3:

| ID | Name | Backdrop |
|---|---|---|
| `stadium_arena` | Arena Bowl | floodlit stadium bowl, field markings, scoreboard |
| `stadium_track` | Track Oval | outdoor track and field oval, start-line markings |
| `stadium_court` | Court House | hardwood court, centre circle, bleachers |
| `stadium_velodrome` | Velodrome | banked cycling track, overhead lights |

Each has a stadium-themed doghouse (dugout, field shelter, courtside box,
trackside hut), ambient animation matching the venue, and passes all existing
house shape and anchor tests.

No sports league names, team names, or real emblems appear anywhere.

## Hero accessories (Phase B)

Ten new items in Tiers 3–5 (accessories slot, not outfit):

| ID | Name | Tier | Description |
|---|---|---|---|
| `hero_shield_guardian` | Guardian Shield | 3 | round defensive shield |
| `hero_staff_mystic` | Mystic Staff | 3 | tall glowing staff |
| `hero_gauntlet_power` | Power Gauntlet | 3 | oversized armoured glove |
| `hero_wings_storm` | Storm Wings | 4 | dark storm-grey wings |
| `hero_orb_quantum` | Quantum Orb | 4 | orbiting energy sphere |
| `hero_crown_solar` | Solar Crown | 4 | radiant sun-ray crown |
| `hero_cloak_shadow` | Shadow Cloak | 4 | flowing dark cloak |
| `hero_tome_arcane` | Arcane Tome | 5 | floating open spell-book |
| `hero_lance_titan` | Titan Lance | 5 | massive energy lance |
| `hero_halo_celestial` | Celestial Halo | 5 | bright divine halo ring |

All render in-box on all six breeds. No Marvel, DC, or other published character
names or emblems anywhere (enforced by the same test used for hero suits).

## Tests (Phase C)

40 new tests in `__tests__/delivery.test.ts`:

- **RNG:** `mulberry32` values in [0,1); same seed → same sequence.
- **ISO week helpers:** `isoWeekString`, `isoWeekStart` correct for known dates.
- **Schedule:** two distinct non-consecutive dates per week; deterministic per
  week string; injectable RNG override works; all 52 weeks of 2026 have gap ≥ 2.
- **Signals:** `computePillarBalance` identifies neglected pillar; completed:false
  tasks ignored; `computeFollowThrough` rate correct; `computeJournalMood`
  positive/negative/neutral/empty; `computeThemes` detects school and fitness.
- **Crisis:** crisis phrase → `hasCrisisLanguage = true`; normal sad words → false.
- **Picker:** returns valid item; excludes `recentContentIds`; type rotation blocks
  third consecutive same type; mood-down → comfort tag in results; neglected care
  pillar → care activity in results; no network calls (`fetch` spy never called).
- **Library integrity:** ≥55 quotes (all ≤25 words, all attributed); ≥35 books,
  movies, activities; no duplicate ids across all four libraries; `getContentById`
  finds every item.
- **History helpers:** round-trips JSON; respects `maxItems` cap; handles corrupt
  JSON gracefully.

## Follow-ups

1. **Run iPhone checks D1–D4** in `docs/MANUAL_CHECKS.md`.
2. **Crisis card**: manually test by entering crisis-language text in the Journal
   tester entry (Settings → Force delivery after journaling something that uses
   the phrases). Verify the 988 number is tappable and opens the phone dialler.
3. **Delivery history in Analytics**: scroll to Section 10 on a device with
   several opened deliveries and verify cards look right.
4. `assets/images/cutout/` is still untracked and untouched (D26 in DECISIONS.md).
5. `docs/BUGS.md` was not touched. Bug B0 is still open.
