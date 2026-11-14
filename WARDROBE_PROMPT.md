# WARDROBE_PROMPT.md — Wearable shop items, renaming, and multiple dog breeds (run with Fable 5.2)

> **How to run:** in PowerShell, `cd "C:\Users\salmu\Downloads\New folder\twenty-four"`, then `claude`, confirm Fable 5.2, and send:
> *"Read WARDROBE_PROMPT.md fully and execute it. Do not stop for approval."*

---

## 0. Context
Read first: `docs/COMPANION.md`, `app/components/companion/*`, `app/data/shopCatalog.ts`, `app/screens/ShopScreen.tsx`, `app/screens/SettingsScreen.tsx`, `app/screens/HomeScreen.tsx`, `app/db/database.ts`, `app/db/queries.ts`, `app/types/index.ts`.

Current state (verified 2026-11-13):
- The companion is an SVG Maltese rig (`MalteseSvg.tsx`, `poses.ts`, `parts.ts`) animated with Reanimated. `accessoryLook()` only draws the party hat and one scarf.
- The shop has **15 outfits, 15 accessories, 15 houses, 1 shield**. Buying an item only records ownership (`owned_items`). Nothing is equipped or shown, except that houses drive the yard stage.
- Renaming already exists: Settings has a name field that saves `companion_name`. It's hard to find.

## 1. Goals
1. **Every outfit and accessory is wearable** and drawn on the dog, on every breed, in every state.
2. **An equip system:** owned items can be put on and taken off.
3. **Easy renaming** from where the user looks at the dog.
4. **Multiple breeds** the user can switch between, each wearing the same items.

"Every item in the shop" means: **outfits and accessories are worn**. **Houses** are not worn; they already change the yard, so add only "choose which owned house is shown". The **Streak Shield** is a consumable, so show it as a small shield badge next to the streak when owned. Don't draw 15 unique houses in this run; log that as a follow-up.

## 2. Architecture (do this first; everything depends on it)

**Shared skeleton, per-breed art.** Every breed implements the same part names and the same **anchor points** in a shared `CompanionRig` interface:

```ts
type Anchor = { x: number; y: number; rotation: number; scale: number };
interface BreedDef {
  id: BreedId; displayName: string;
  anchors: Record<'headTop' | 'eyes' | 'neck' | 'chest' | 'back' | 'frontPaw' | 'aura', Anchor>; // per pose
  parts: BreedParts; // SVG drawing per part (body, head, earL, earR, tail, eyes, lids, mouth, ...)
  palette: BreedPalette;
}
```

- Each anchor is attached to the moving part it belongs to (`headTop` follows the head's tilt and bob, `back` follows the body, `frontPaw` follows a paw), so worn items move with the dog. **No item may drift off the body during any animation.**
- **Items are drawn once**, in `app/components/companion/items/`, in item-local coordinates, and placed at an anchor. Breeds differ only in anchors and scale, never in item art.
- **Draw order:** back items (wings, cape, aura) behind the body; body; outfit; neck items; head; face items (sunglasses); head-top items (hats, crowns, halo); held items (wand, staff) on the front paw.
- **Slots** (one item per slot): `outfit`, `head`, `face`, `neck`, `back`, `held`, `aura`. Map every one of the 30 items to exactly one slot in `itemSlots.ts`. Equipping into an occupied slot replaces the item already there.

**Data:**
- Add a migration (constant default, then backfill; see bug B0 for why) creating `settings.equipped_items` (a JSON map from slot to item_id, default `{}`), `settings.breed` (default `'maltese'`), and `settings.shown_house` (nullable).
- Add queries `equipItem(slot, itemId)`, `unequipSlot(slot)`, `setBreed(id)`, and `setShownHouse(id)`. You can only equip items you own; enforce that in the query and test it.

## 3. Phases (in priority order; if usage runs out, the earlier phases are what matters)

### Phase A: Equip system and wearables on the Maltese
1. Build the anchor system and slots on the existing Maltese.
2. Draw all **15 outfits and 15 accessories** as Finch-style SVG: chunky, flat colors, one shade tone, soft outline, readable at 64px. Design each item from its name and description. Higher tiers get more flourish (glow, sparkle, gradient accents), but keep the same simple style.
3. **Shop:** owned items show **Wear** or **Take off**. Each item card has a live preview of the dog wearing it, even if not owned yet ("try on"). Buying an item offers "Wear now".
4. Home, the modals, and the Gallery show the equipped items.
5. **Self-review:** extend `scripts/render-companion.mjs` to render a contact sheet with every item on the Maltese in idle and happy, plus a "max outfit" (one item per slot). Look at the images and fix clipping, overlap, and drift. At least 2 rounds. Save the sheets to `docs/companion/items/`.

### Phase B: Renaming
1. **Tap the dog's name on Home** to edit it in place (a modal with a text field and Save). Max 20 characters, trimmed; empty names are rejected.
2. Keep the Settings field, and add the same edit to the Gallery.
3. Test: rename persists after restart; empty and over-length names are rejected.

### Phase C: Breeds
Build these breeds, **one at a time, each fully finished before starting the next**:
1. **Maltese** (already done)
2. **German Shepherd** (the app's original Nova, now redrawn in the same SVG style)
3. **Golden Retriever**
4. **Corgi**
5. **Shiba Inu**
6. **Pug**

For each breed:
- Original design, Finch-style, the same proportions system as the Maltese (big head, small body), with the breed's key traits exaggerated so it reads instantly. Don't copy any existing character or mascot.
- Implement every part and every anchor for all 4 states (idle, happy, celebrating, sleeping), with the same animation behavior as the Maltese.
- **Self-review:** a render sheet of all 4 states on all 3 backgrounds, plus the "max outfit" sheet. Look, critique (Does the breed read at 64px? Do items sit right?), iterate 2+ rounds. Save to `docs/companion/breeds/<breed>/`.
- Commit and push after each breed.

**Breed picker:** a "Choose your dog" screen reachable from Settings **and** by long-pressing the dog on Home. It's a carousel of animated breeds with "Choose". It keeps the name and all equipped items. Switching is free and unlimited; log this as a product decision Sahil can change later.

### Phase D: House and shield
1. **Shop → Houses:** owned houses show **Show in yard**. The yard uses `shown_house`'s tier for its stage (falling back to the current best-tier logic).
2. **Streak Shield:** a small shield badge with the count next to the streak badge on Home when `shields_owned > 0`.

## 4. Rules
- **Expo Go only** (SDK 58): no new native libraries. react-native-svg, Reanimated, and gesture-handler are already in use.
- **Performance:** a fully dressed dog must still animate smoothly. Memoize item SVGs; don't re-render items per frame; animate only through anchors and shared values. If the "max outfit" drops frames in the Gallery's frame counter (add one in dev), simplify the item art.
- **Reduce Motion:** item effects (glow pulses, sparkles) stop too.
- **Tests:** item→slot mapping covers all 30 items; equip/unequip/replace; you can't equip unowned items; breed switch keeps equipped items; every breed defines every anchor for every pose (a table test); migration works on a DB that already has rows (real-SQLite harness). `tsc` clean, all existing tests green, `expo-doctor` clean.
- Don't fix items from `docs/BUGS.md` (separate run), and don't touch business logic beyond what's listed here.
- Run unattended. Log decisions in `docs/DECISIONS.md`. Commit small, push after each phase and each breed, never rewrite history.
- **Publish** after Phase A and at the end: `npm run ship -- --message "..."`.
- **Hard stop:** if a phase can't get tests green after 3 attempts, revert that phase's last step, push the last green state, and report.

## 5. Final report
Write `docs/RUN_REPORT_WARDROBE.md`:
- Per phase/breed: done, partial, or skipped, with commits
- Links to every render sheet
- Test count before and after
- Decisions and follow-ups (unique house art, breed unlock pricing)
- iPhone checks added to `docs/MANUAL_CHECKS.md`: try on items in the Shop, wear and take off, the max outfit animating smoothly, rename from Home, switch breeds with items still on, Show in yard, the shield badge
