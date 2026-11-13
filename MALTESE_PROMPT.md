# MALTESE_PROMPT.md — Design and animate a Maltese companion for 24 (run with Fable 5.2)

> **How to run:** in PowerShell, `cd "C:\Users\salmu\Downloads\New folder\twenty-four"`, then `claude`, confirm the model is Fable 5.2, and send:
> *"Read MALTESE_PROMPT.md fully and execute it. Do not stop for approval."*

---

## 0. Goal

Replace the static German Shepherd PNGs with **an original Maltese puppy, designed by you in code and fully animated**, in the spirit of Finch: soft, simple, warm, alive. The companion keeps whatever name the user set (`settings.companion_name`, default "Nova").

**Approach: draw the dog as SVG built from separate parts** (body, head, ears, fur tufts, tail, eyes, eyelids, nose, mouth, tongue, paws, topknot and bow). Because every part is its own shape, each one can move on its own: blinking, ear flops, tail wags, head tilts. That is what makes Finch's bird feel alive, and drawing in code gives us those layers for free.

**Stack (verify each is "Included in Expo Go" for SDK 58 on docs.expo.dev before using it):**
- `react-native-svg` to draw
- `react-native-reanimated` to animate (UI thread, 60fps)
- `expo-haptics` for tap feedback

If any of them is not included in Expo Go, stop using it, fall back to React Native's `Animated` API, and log the decision.

## 1. Character design spec

**Read first:** `docs/HOW_IT_WORKS.md`, `app/screens/HomeScreen.tsx`, `app/components/NovaCompanion.tsx`, `app/types/index.ts` (`NovaState`), `app/data/shopCatalog.ts`.

**Look:** an original Maltese puppy. Do not copy or imitate any existing character, brand mascot, or app's art (including Finch's bird). Take only the *qualities* of Finch-style art:
- Chunky, rounded, simple shapes. Readable at 64px and charming at 240px.
- Flat colors with **one** soft shade tone per area. No gradients-on-everything, no realistic fur strands.
- A big head (about 55% of the height), small body, big dark eyes with one white highlight each.

**Maltese traits:**
- Long, silky **white** coat drawn as a few large, soft, scalloped fur shapes (not individual hairs)
- Floppy ears hanging down with longer fur, framing the face
- Round black eyes, small black button nose, small pink tongue for happy states
- A **topknot** tied with a small bow on top of the head. Bow color: brand purple `#3C3489` (shop items can recolor it later)
- A fluffy plume tail curled over the back

**Palette (put these in one `palette.ts`):**
- Fur `#FFFDF8`, fur shade `#EDE4D6`, outline `#CBBFAE` (a 2–3px soft outline, not black)
- Eyes and nose `#2B2420`, highlight `#FFFFFF`, tongue `#F28C9B`, inner ear and blush `#F7C9C9`
- Bow `#3C3489`

**Contrast problem to solve:** a white dog on the app's warm white background (`#FFFBF5`) and pale sky (`#B5D4F4`) will disappear. Fix it with the soft outline plus a subtle ground shadow ellipse. Check it against all three backgrounds: warm white, day sky/grass, night sky `#2D4A7A`.

## 2. Rig and animation spec

Build `app/components/companion/` with:
- `MalteseSvg.tsx`: the drawing. Every moving part is its own `<G>` with a defined pivot point (ear base, tail base, neck, eyelid hinge).
- `useCompanionRig.ts`: Reanimated shared values plus loops per state.
- `Companion.tsx`: the public component.

```tsx
<Companion state={NovaState} size={number} onPress?={() => void} accessory?={string | null} reduceMotion={boolean} />
```

**States** (`NovaState`: `idle | happy | sleeping | celebrating`):

| State | Motion |
|---|---|
| idle | breathing (body scale ±2.5%, 3.2s cycle); blink at a random 2.5–6s interval (eyelids close for 120ms); slow tail sway; one ear flop every 6–10s; occasional head tilt ±6° |
| happy | fast tail wag (about 3 Hz); small hops with squash and stretch; mouth open, tongue out; ears bounce with a slight delay after the head (follow-through) |
| celebrating | jump with a spin or wiggle; ears flap; 6–10 sparkle or confetti particles; party-hat accessory; returns to happy after 5s (the screen already handles timing) |
| sleeping | curled pose (head down, eyes closed as curved lines); breathing slowed to 5s; tail tucked; three "z" letters float up and fade in a loop |

**Interaction:**
- **Tap:** squash, then pop back with an overshoot; a heart pops up and fades; light haptic (`Haptics.impactAsync(Light)`); a short wiggle.
- **Petting:** dragging a finger across her head for 1s+ makes her lean into it, close her eyes happily, and wag. Use a gesture from `react-native-gesture-handler`, which is already installed.
- **Transitions:** changing state never snaps. Ease between poses over 250–400ms.

**Animation craft (apply the classic principles):** squash and stretch, anticipation before a jump, follow-through on ears and tail, ease-in/ease-out everywhere, and slight random offsets so loops never look mechanical.

**Accessibility and performance:**
- `reduceMotion` (or the OS setting) on: no loops, no particles; blink at most every 10s; state changes crossfade only.
- All animation runs on the UI thread through Reanimated. No `setState` per frame.
- Pause loops when the screen isn't focused (`useIsFocused`).

## 3. Self-review loop (required)

You can't see the phone, so you must look at your own drawings:
1. Write `scripts/render-companion.mjs`, which renders every state's key pose to PNG (for example by server-rendering the SVG markup and rasterizing it with `@resvg/resvg-js` as a **devDependency**), on all three backgrounds, at 64px and 240px.
2. **Open and look at the PNGs.** Critique them against section 1: Is it clearly a Maltese? Cute and readable at 64px? Visible on white? Do the proportions match the spec? Iterate on the drawing **at least 3 rounds** before integrating.
3. Save the final images to `docs/companion/` and embed them in `docs/COMPANION.md`, with a short design rationale (shapes, palette, rig pivots).

## 4. Integration
1. Replace the German Shepherd images everywhere they're used (`NovaCompanion`, the Home yard sprite, the celebration and weekly-box modals) with `<Companion>`. Keep the old PNGs in the repo for rollback, and log it in `docs/DECISIONS.md`.
2. Home: the companion sits on the yard grass with its ground shadow. Tapping her triggers the tap reaction.
3. Add a dev-only **Companion Gallery** screen (reachable from Settings when `__DEV__`) that shows all four states side by side, a reduce-motion toggle, and a size slider. This is how Sahil reviews her on the phone.
4. Shop: if an Outfit or Accessory item is owned, draw a simple version of it on the rig (for example a scarf or the bow color). Do at least the party hat and one scarf; log the rest as follow-ups.

## 5. Tests and rules
- Tests: the state-to-pose mapping, the reduce-motion path (no loops start), tap fires `onPress` and the haptic (mocked), and the Gallery renders all four states. `tsc` clean, `npm test` green (115+ tests), `npx expo-doctor` clean.
- Don't touch business logic, the database, or `docs/BUGS.md` items. This run is the character only.
- No external image assets, fonts, or Lottie files. The dog is 100% your own SVG code.
- Run unattended, log decisions in `docs/DECISIONS.md`, commit in small steps, never rewrite history, push at the end.
- Publish: `npm run ship -- --message "New Maltese companion"`.
- Hard stop: if after 3 attempts the dog still can't render in Expo Go's stack, keep the PNG companion working, push what's done, and explain in the report.

## 6. Final report
Write `docs/RUN_REPORT_COMPANION.md`:
- The final renders (linked)
- What each state does
- Libraries used, with Expo Go confirmation
- Test count
- Decisions
- Add to `docs/MANUAL_CHECKS.md`: open the Gallery on the iPhone, check smoothness (no stutter), tap and pet her, toggle Reduce Motion, and check visibility on day and night skies.
