# Phase 3 plan: ship-readiness that fits Expo Go

1. **Dead code.** Grep for imports of the three `*Placeholder.tsx` screens and of
   `lottie-react-native`; delete only if there are none.
2. **Export.** Add `expo-file-system` and `expo-sharing` with `npx expo install`
   (both are in Expo Go). Pure `buildExportPayload()` plus a thin
   `exportDataToFile()` that writes the file and opens the share sheet.
3. **Delete all data.** `deleteAllData()` in one transaction, a store action
   `resetAllData()` that flips `isOnboarded` (App.tsx then shows onboarding),
   and a red button with two confirmations.
4. One `ALL_TABLES` list shared by export and wipe, checked against the real schema.
5. **Tests on real SQL.** Use Node's built-in `node:sqlite` behind the expo-sqlite
   API so the schema and queries actually execute. No new dependency.
6. **Accessibility** on Schedule and Journal (and the components they use):
   labels, roles, states, 44×44pt targets.
7. **Verify, don't fix:** Google sign-in and Sentry in Expo Go. Write the
   verdict and sources in `docs/BUGS.md`.
8. Confirm the iOS bundle still builds: `npx expo export --platform ios`.
