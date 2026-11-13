# DEPLOY.md — open 24 on the iPhone without the laptop

Goal: open 24 from Expo Go anywhere, with no `expo start` running.

How: **EAS Update**. The JavaScript bundle is uploaded to Expo's servers, and
Expo Go downloads it from there instead of from your laptop. No EAS Build, no
Apple Developer account, free plan.

**Status on 2026-11-13**
- Set up and published once. Project: `@sahil_4/twenty-four`, channel `main`, runtime `exposdk:54.0.0`.
- Verified from the laptop: Expo's update server returns the published update
  when asked the way Expo Go asks (HTTP 200, runtime `exposdk:54.0.0`, channel `main`).
- **Not verified: opening it on the iPhone.** That is the checkpoint, and only you can do it (section 2).

---

## 1. Publish (3 commands, PowerShell)

```powershell
cd "C:\Users\salmu\Downloads\New folder\twenty-four"
npx tsc --noEmit; npm test
npm run ship -- --message "what changed"
```

1. `cd` into the project.
2. Type-check and run the tests. Do not publish if either fails.
3. `npm run ship` is a shortcut for
   `npx eas-cli update --channel main --platform ios` (it uses `npx`, so the
   EAS CLI does not need to be installed globally). The message shows up in the
   dashboard and in Expo Go's update list, so write what changed.

Takes about two minutes. When it prints `✔ Published!` the update is live.

If it says you are not logged in: `npx eas-cli login` (same Expo account as Expo Go).

## 2. Open it on the iPhone

Do this once with the laptop **closed** to prove the point.

**Before the first time: export a backup.** Open the app the old way
(`npx expo start`), go to Settings → Export my data, and save the file. Expo Go
keeps each project's database in its own sandbox. The app opened from EAS
Update *should* land in the same sandbox as the one opened from your laptop
(same account and slug), but I could not verify that from here. If you open the
update and the app looks brand new, your data is not gone: it is still there
when you open the project from the laptop.

**Way A: from inside Expo Go**
1. Open Expo Go and sign in with the `sahil_4` account (Profile icon, top right).
2. On the Home tab, find **twenty-four** under Projects.
3. Tap it, pick the `main` branch, tap the newest update.

**Way B: QR code from the dashboard**
1. On any computer or the phone's browser, open
   https://expo.dev/accounts/sahil_4/projects/twenty-four/updates
2. Open the newest update → **Preview** → scan the QR code with the iPhone camera.

**Way C: a link you can bookmark** (save it in Notes or add it to the Home Screen)
```
exp://u.expo.dev/243210fe-095e-480d-890e-75e62ada9de0?channel-name=main&runtime-version=exposdk:54.0.0
```
This always opens the newest update on `main`. This URL shape is what the
update server answers to (I tested the same request over https), but the
`exp://` link itself is not described in Expo's docs, so treat it as "should
work" until you have tapped it once.

**To pick up a new update:** fully close the project in Expo Go (shake →
"Go Home", or swipe Expo Go away) and open it again.

**Offline:** Expo Go needs a connection to download an update the first time.
After that the bundle is cached, and the app's data is local SQLite either way.

## 3. What the docs say (checked 2026-11-13)

| Claim | Source |
|---|---|
| Expo Go can load updates published to EAS Update, but only for projects you own (or your organization owns). Took effect May 12, 2026, applies to all versions of Expo Go. | https://expo.dev/changelog/expo-go-loading-changes-may-2026 |
| Hermes bytecode bundles load in Expo Go only when they come from EAS Update (self-hosted updates must be plain JS). Applies to Expo Go for SDK 54, 55, 56. | same page |
| **Expo Go on the Apple App Store stops at SDK 54. SDK 55 and later are not available there.** | https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/ |
| "Expo Go for SDK 54 will continue to be available on both the App Store and Play Store." No end date given. | https://expo.dev/changelog/expo-go-and-app-store-may-2026 |
| For SDK 55+ on a physical iPhone you need `eas go`, which builds your own Expo Go through TestFlight and "requires an Apple Developer Program membership". | both pages above |
| EAS Update works on the Free plan. The `--environment` flag is only required from SDK 55. | https://docs.expo.dev/eas-update/getting-started/ |
| Limits on the Free plan (monthly active users, bandwidth) | https://expo.dev/pricing (check the current numbers there; one phone is far below any of them) |

Two honest gaps:
- Expo's EAS Update docs describe testing updates in **development builds**, not
  in Expo Go. The Expo Go path is confirmed by the changelog above and by the
  server test, not by a how-to page.
- Expo Go only accepts an update whose runtime version matches its SDK. That is
  why `app.json` uses `"runtimeVersion": { "policy": "sdkVersion" }`, which
  produces `exposdk:54.0.0`. The default policy (`appVersion`) would produce
  `1.0.0`, which Expo Go does not provide. Do not change this policy.

## 4. What was configured (and why)

| File | Change | Why |
|---|---|---|
| `app.json` | `extra.eas.projectId`, `owner` | Links this folder to the EAS project |
| `app.json` | `updates.url` | Where updates are fetched from |
| `app.json` | `runtimeVersion: { policy: "sdkVersion" }` | Makes the update loadable by Expo Go (see above) |
| `eas.json` | CLI version, `channel: "main"` | Required by the EAS CLI. The `build` profile is never used: there is no EAS Build |
| `package.json` | `expo-updates`, `ship` script | The updates library (already inside Expo Go) and the publish shortcut |

Nothing secret is in the bundle. There is no `.env` file, so no
`EXPO_PUBLIC_*` value is compiled in. The project ID in `app.json` is an
identifier, not a credential.

## 5. Rules of the road

- **Do not upgrade the Expo SDK.** SDK 54 is the last one the App Store Expo Go
  runs. Upgrading to 55+ means the app stops opening on your iPhone unless you
  pay for the Apple Developer Program. This also means `npx expo install --fix`
  is fine (it stays inside SDK 54) but `npx expo install expo@latest` is not.
- **Do not add a library with native code that Expo Go lacks.** It will work in
  jest and crash on the phone. Check the "Included in Expo Go" label on the
  library's page at docs.expo.dev first.
- **Consider turning off automatic app updates on the iPhone**
  (Settings → App Store → App Updates). If Apple ever approves a newer Expo Go
  and it auto-installs, an SDK 54 project stops opening, and iOS has no way to
  install the older Expo Go again. With auto-update off, you decide.
- **Export a backup now and then** (Settings → Export my data). Your data lives
  only inside Expo Go's sandbox on one phone. Deleting Expo Go deletes it.

## 6. When Expo Go drops SDK 54

Today the situation is unusual: the App Store Expo Go is frozen at SDK 54, so
this project is on exactly the right version. It stops working if (a) Apple
ships a newer Expo Go to the App Store and your phone installs it, or (b) a
future iOS release breaks the SDK 54 Expo Go.

Options then, cheapest first:

1. **Stay put** if your installed Expo Go still opens the app. Nothing forces a change.
2. **Android phone or emulator.** Older Expo Go versions can be installed on
   Android from https://expo.dev/go. Free. Your data would need the export file
   plus an import feature (not built).
3. **Upgrade the SDK and use `eas go`** (your own Expo Go via TestFlight), or a
   development build. Both need the Apple Developer Program ($99 per year).
   This breaks the $0 rule, so it is a decision, not a chore.
   The upgrade itself, one SDK at a time:
   ```powershell
   npx expo install expo@^55.0.0 --fix
   npx expo-doctor
   npx tsc --noEmit; npm test
   ```
   then read that SDK's changelog (https://expo.dev/changelog) for breaking
   changes, fix, commit, and repeat for 56, 57, 58. Never jump several at once.

If you reach option 3, the same money also unlocks the two things Expo Go
blocks today: Google sign-in (see V1 in `docs/BUGS.md`) and home-screen widgets.

## 7. Undo

- Remove a bad update: publish a fixed one (fastest), or
  `npx eas-cli update:republish --channel main` and pick an earlier update.
- Remove EAS Update entirely: delete `updates`, `runtimeVersion`, `extra.eas`,
  and `owner` from `app.json`, delete `eas.json`, and
  `npm uninstall expo-updates`. Local development with `npx expo start` never
  depended on any of it.
