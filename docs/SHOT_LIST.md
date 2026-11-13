# SHOT_LIST.md — 2-minute screen recording for LinkedIn

**Format:** iPhone screen recording (Control Center → Screen Recording), portrait,
about 2:00. Add captions afterwards: most people watch muted. One idea per shot.

**The story in one line:** "I built a time-balance app, then found and fixed a
bug that reset streaks every evening, and proved it with a test."
Lead with the engineering, not the puppy. The puppy is why people keep watching.

## Before you record

- [ ] Run the checks in `docs/MANUAL_CHECKS.md` first. Do not record a feature you have not seen work.
- [ ] Use realistic data: 5 or 6 tasks today across all pillars, two completed, Work slightly **over** target, a streak of 3 or more, enough treats to buy one House item, a few weeks of history so Analytics is not empty.
- [ ] Do Not Disturb on. Battery above 50% (a red battery icon is distracting).
- [ ] Daytime, so the sky is blue (unless you are showing night).
- [ ] Have the laptop terminal ready for shots 8 and 9: font size 18+, dark theme, window cropped to the output.

## Shots

| # | Time | What is on screen | What you do | Caption |
|---|---|---|---|---|
| 1 | 0:00–0:08 | Home. Yard, clouds drifting, Nova. | Nothing for 2 seconds, then a slow scroll down and back. | "24: a time-balance app I built in React Native. Four pillars: Work, Personal, Care, Sleep." |
| 2 | 0:08–0:22 | Schedule. | Tap "+ Add Task", name it, pick a pillar, set a time that **overlaps** an existing task so the yellow warning appears. Save. | "Plan the day. Overlaps are detected live: two intervals conflict when each starts before the other ends." |
| 3 | 0:22–0:34 | Schedule → Home. | Tick a task done. Go to Home. Bars fill from the left, balance score changes. | "Completing a task updates the pillar bars and the balance score." |
| 4 | 0:34–0:46 | Home, Work bar past its target. | Hold on the overflow segment and the "+1h over" label. Point at the score. | "Overwork isn't a win. Going past a target *lowers* the balance score." |
| 5 | 0:46–0:58 | Shop → Home. | Buy a House item. Return to Home. The yard crossfades to the next stage. | "Streaks earn treats. Treats upgrade Nova's yard." |
| 6 | 0:58–1:10 | Analytics. | Scroll: weekly bars, monthly grid, yearly heatmap. Tap one bar. | "Every chart is hand-built from Views. No chart library. All data is local SQLite." |
| 7 | 1:10–1:22 | Settings. | Tap "Export my data". Share sheet opens. Save to Files, open the JSON for one second. | "Your data is yours: one tap exports every table as JSON. One more deletes everything." |
| 8 | 1:22–1:42 | **Laptop.** The diff of `getTodayStr` (old `toISOString()` line vs new), then the terminal. | Show the red run, then the green run of `localDates.test.ts`. | "The bug I'm proudest of finding: dates were UTC. At 11:30pm in Boston the app thought it was tomorrow and reset streaks. I pinned the clock in a test, watched 8 tests fail, fixed it, watched them pass." |
| 9 | 1:42–1:52 | Laptop terminal. | `npm test` finishing: "Tests: 115 passed". | "115 tests. The database tests run the real schema on a real SQLite engine." |
| 10 | 1:52–2:00 | Home at night (dark sky, Nova asleep). | Hold. | "Built with Expo, TypeScript, SQLite, Zustand. Code and write-up: github.com/437maker/twenty-four" |

## Getting the red run for shot 8

You need the tests failing on the old code, on camera. Do this in a throwaway
copy so the real repo is never touched:

```powershell
cd "C:\Users\salmu\Downloads\New folder"
git clone twenty-four demo-red
cd demo-red
npm install
# put back only the old, buggy source files (tests stay new):
git checkout 7dd8038 -- app/store/useAppStore.ts app/utils/calculations.ts
npx jest __tests__/localDates.test.ts     # RED: record this
git checkout main -- app
npx jest __tests__/localDates.test.ts     # GREEN: record this
cd ..
Remove-Item -Recurse -Force demo-red      # when you are done
```

`7dd8038` is the last commit before the date fix.

## Cut list if it runs long

Drop in this order: shot 6 (Analytics), shot 5 (Shop), shot 2's typing (start
with the form already filled). **Never cut shots 4, 8, or 9.** They are the
ones an engineer remembers.

## Words to say (or to put in the post)

- The number, not the adjective: "115 tests", "8 failed before the fix", not "well tested".
- Say what you chose **not** to do and why: no backend (data stays on the phone), no chart library, stayed inside Expo Go to keep the cost at $0, which means upgrading the Expo SDK whenever Expo Go does (54 → 58 in one documented run).
- Be exact about what is not done. There is a public bug log (`docs/BUGS.md`) with 15 open items, three with failing-by-design tests. That is a strength: it shows you know where the edges are.
- Do **not** claim Google Calendar sync works. The engine is written; sign-in cannot work in Expo Go. "Built a two-way sync engine; shipping it needs a native build" is true and still impressive.
