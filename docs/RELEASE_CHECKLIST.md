# RELEASE_CHECKLIST.md

Pre-submission checks before an App Store build.

## Must do before build

- [ ] **Remove tester menu.** `app/screens/SettingsScreen.tsx` — delete the
  `testerUnlocked` state, `versionTapCount` ref, `handleVersionTap`,
  `testerAddBones`, `testerAddChests`, `testerResetRest`, `testerForceDelivery`,
  the entire `{testerUnlocked && …}` JSX block, and the `onPress={handleVersionTap}`
  on the version label. Also remove `restResetToken` / `resetRestState` from
  `useAppStore.ts`, its call site in `HomeScreen.tsx`, and
  `__tests__/testerMenu.test.ts`. See `docs/DECISIONS.md` D69 for the full list.
- [ ] Remove or gate `forceDelivery` from the store (tester-only action).
- [ ] Remove `{__DEV__ && …}` Companion Gallery button in `SettingsScreen.tsx`
  (or leave it — `__DEV__` is false in production builds).
- [ ] Confirm `app.json` Sentry `organization` / `project` are real slugs, not
  placeholders (see BUGS.md B8).
- [ ] Run `expo-doctor` and `npx expo install --check` to confirm no
  dependency mismatches.
- [ ] Run `npx jest --no-coverage` — all tests green.
- [ ] Run `npx tsc --noEmit` — no errors.

## Nice to have

- [ ] Update `version` in `app.json` / `package.json`.
- [ ] Double-check `docs/MANUAL_CHECKS.md` and walk through iPhone checks.
