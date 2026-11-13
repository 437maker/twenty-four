# Phase 4 plan: free iPhone install, no laptop needed

1. Read the **current** Expo docs: can Expo Go load EAS Update, for whom, and
   which SDK does the App Store Expo Go run today. Cite URLs in `docs/DEPLOY.md`.
2. `npx expo install expo-updates` (already part of Expo Go).
3. `eas init` to create and link the project on the free plan. No EAS Build.
4. `eas update:configure`, then set `runtimeVersion` to the `sdkVersion` policy
   so the runtime is `exposdk:54.0.0`, the one Expo Go provides.
5. `eas.json` with the CLI version and a `main` channel; `npm run ship` script.
6. Re-run `tsc` and the tests, then one real publish.
7. Verify from the laptop that the update server returns the update for the
   headers Expo Go sends. The on-phone check is Sahil's.
8. Write `docs/DEPLOY.md`: 3-command routine, how to open it, the SDK 54 freeze,
   and the upgrade path.

Stop conditions (hard rule 1): anything that needs EAS Build, a paid plan, or
an Apple Developer account.
