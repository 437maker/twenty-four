# DEPLOY.md — open 24 on the iPhone without the laptop

Goal: open 24 from Expo Go anywhere, with no `expo start` running.

How: **EAS Update**. The JavaScript bundle is uploaded to Expo's servers, and
Expo Go downloads it from there instead of from your laptop. No EAS Build, no
Apple Developer account, free plan.

**Status on 2026-11-13**
- Project: `@sahil_4/twenty-four`, channel `main`, runtime `exposdk:58.0.0`.
- The project was upgraded from Expo SDK 54 to **SDK 58** on this date. The
  step-by-step record is in `docs/UPGRADE_SDK58.md`.
- **Not verified: opening it on the iPhone.** Only you can do that (section 2,
  and the first item in `docs/MANUAL_CHECKS.md`).

**Correction.** An earlier version of this file said the App Store Expo Go
stops at SDK 54 and told you never to upgrade. That was wrong. On 2026-11-13
the iPhone showed:

> "Project is incompatible with this version of Expo Go. The installed version
> of Expo Go is for SDK 58.0.0. The project you opened uses SDK 54. … It is not
> possible to install an older version of Expo Go for iOS devices, only the
> latest version is supported."

The rule that actually holds is in section 5.

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
   `npx eas-cli update --channel main --platform ios --environment production`
   (it uses `npx`, so the EAS CLI does not need to be installed globally). The
   message shows up in the dashboard and in Expo Go's update list, so write
   what changed. `--environment` is required from SDK 55 on; it selects a set
   of EAS server-side variables, and this project has none.

Takes about two minutes. When it prints `✔ Published!` the update is live.

If it says you are not logged in: `npx eas-cli login` (same Expo account as Expo Go).

## 2. Open it on the iPhone

Do this once with the laptop **closed** to prove the point.

**Your data and the SDK upgrade.** Expo Go keeps each project's database in
its own sandbox on the phone. The data from the SDK 54 days *should* still be
there when the SDK 58 update opens (same Expo Go install, same account and
slug), but I could not verify that from the laptop. Two things to know:
- If the app opens on onboarding as if brand new, stop and note it. Do not
  re-enter weeks of data by hand before we know why.
- You could not export a backup beforehand, because the SDK 54 project no
  longer opens. Export one as soon as the app opens (Settings → Export my data).

**Way A: from inside Expo Go**
1. Open Expo Go and sign in with the `sahil_4` account (Profile icon, top right).
2. On the Home tab, find **twenty-four** under Projects.
3. Tap it, pick the `main` branch, tap the newest update (the one that says
   "Upgrade to Expo SDK 58" or later).

**Way B: QR code from the dashboard**
1. On any computer or the phone's browser, open
   https://expo.dev/accounts/sahil_4/projects/twenty-four/updates
2. Open the newest update → **Preview** → scan the QR code with the iPhone camera.

**Way C: a link you can bookmark** (save it in Notes or add it to the Home Screen)
```
exp://u.expo.dev/243210fe-095e-480d-890e-75e62ada9de0?channel-name=main&runtime-version=exposdk:58.0.0
```
This opens the newest update on `main` for SDK 58. The `exp://` link shape is
not described in Expo's docs, so treat it as "should work" until you have
tapped it once. **The number at the end changes with every SDK upgrade**, so an
old bookmark (`exposdk:54.0.0`) no longer works. Replace it.

**To pick up a new update:** fully close the project in Expo Go (shake →
"Go Home", or swipe Expo Go away) and open it again.

**Offline:** Expo Go needs a connection to download an update the first time.
After that the bundle is cached, and the app's data is local SQLite either way.

## 3. What the docs say (checked 2026-11-13)

| Claim | Source |
|---|---|
| Expo Go can load updates published to EAS Update, but only for projects you own (or your organization owns). Took effect May 12, 2026, applies to all versions of Expo Go. | https://expo.dev/changelog/expo-go-loading-changes-may-2026 |
| "The new Expo Go supports only SDK 58." It was announced as coming to the App Store "within a few weeks" of the SDK 58 release. | https://expo.dev/changelog/sdk-58 |
| "The project and Expo Go SDK versions must match." "You cannot install an older version of Expo Go on a physical iOS device." | https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/ |
| `eas update` requires `--environment` for projects on SDK 55 or greater. | `npx eas-cli update --help`, and https://expo.dev/changelog/sdk-55 |
| "Most of the Updates API is unavailable when running in Expo Go." To preview an update there, publish with `eas update` and open it in Expo Go. "Only updates using Expo Go-compatible libraries are supported." | https://docs.expo.dev/versions/v58.0.0/sdk/updates/ |
| A development build on an iOS device needs "an active subscription to the Apple Developer Program". | https://docs.expo.dev/get-started/set-up-your-environment/ |
| Limits on the Free plan (monthly active users, bandwidth) | https://expo.dev/pricing (check the current numbers there; one phone is far below any of them) |

Three honest gaps:
- **Expo's own troubleshooting page is out of date.** On 2026-11-13 it still
  said "Expo Go on the Apple App Store stops at SDK 54". The phone said SDK 58.
  When a doc and the device disagree, the device wins. That stale sentence is
  where this file's original mistake came from.
- Expo's EAS Update docs describe testing updates in **development builds**
  first. The Expo Go path is confirmed by the changelog above and by the
  updates reference page, not by a step-by-step guide.
- Expo Go only accepts an update whose runtime version matches its SDK. That is
  why `app.json` uses `"runtimeVersion": { "policy": "sdkVersion" }`, which
  now produces `exposdk:58.0.0`. The default policy (`appVersion`) would
  produce `1.0.0`, which Expo Go does not provide. Do not change this policy.

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

- **Expo Go on iOS only runs the latest SDK, and old versions cannot be
  reinstalled.** So when Expo ships a new SDK and the App Store Expo Go
  updates, this project has to be upgraded again before it opens on the phone.
  Expo releases a new SDK roughly three or four times a year. Section 6 is the
  routine.
- **The symptom is always the same screen:** "Project is incompatible with this
  version of Expo Go", with two SDK numbers. Your data is not gone when you see
  it. The app just cannot start until the project catches up.
- **Do not add a library with native code that Expo Go lacks.** It will work in
  jest and crash on the phone. Check the "Included in Expo Go" label on the
  library's page at docs.expo.dev first. The current list is at the end of
  `docs/UPGRADE_SDK58.md`.
- **Export a backup now and then** (Settings → Export my data). Your data lives
  only inside Expo Go's sandbox on one phone. Deleting Expo Go deletes it.
  A good habit: export right after each successful SDK upgrade.

(An earlier version of this file suggested turning off App Store automatic
updates to freeze Expo Go. That advice is removed: it does not help. Any fresh
install, restore, or new phone gets the newest Expo Go, and iOS cannot install
an older one.)

## 6. How to upgrade when Expo Go moves to a new SDK

Do this when the phone shows the "incompatible" screen, or when
https://expo.dev/changelog announces a new SDK and you would rather not be
surprised. Go **one SDK at a time**, even if you are several behind. In the
commands below, replace `59` with the next SDK number.

```powershell
cd "C:\Users\salmu\Downloads\New folder\twenty-four"
npx expo install expo@^59.0.0 --fix
npx expo install --check
npx tsc --noEmit; npm test
npx expo-doctor@latest
npx expo export --platform ios
```

For each SDK:

1. **Read first.** Open `https://expo.dev/changelog/sdk-59` and read "Breaking
   changes" and "Upgrading your app". Note anything that names a package in
   `package.json`.
2. **Install.** `npx expo install expo@^59.0.0 --fix` moves `expo` and every
   Expo-managed package to the versions that SDK expects.
   `npx expo install --check` must then say "Dependencies are up to date".
3. **Fix what broke.** Run `npx tsc --noEmit` and `npm test`. Type errors
   usually point straight at the changed API.
4. **Check the project.** `npx expo-doctor@latest` should pass every check.
   `npx expo export --platform ios` proves the bundle builds (it writes to
   `dist/`, which git ignores).
5. **Commit:** `chore(sdk): upgrade to Expo SDK 59`. Then repeat from step 1
   for the next SDK if you are still behind.
6. **Publish** with `npm run ship -- --message "Upgrade to Expo SDK 59"`, then
   confirm with `npx eas-cli update:list --branch main` that the runtime
   version is `exposdk:59.0.0`.
7. **Update the bookmark** from section 2, Way C, to the new runtime number.

Things that went wrong on the 54 → 58 run, in case they repeat
(details in `docs/UPGRADE_SDK58.md` and `docs/DECISIONS.md`):
- `npm` stops with `ERESOLVE` in the middle of `expo install`. Finish with
  `$env:npm_config_legacy_peer_deps = "true"; npx expo install --fix`, then
  close that PowerShell window so the setting does not stick, and run a plain
  `npm install` to confirm.
- A library's config plugin crashes every `expo` command with "Cannot find
  module". Upgrade that library, or remove its line from `plugins` in
  `app.json` (plugins do nothing in Expo Go).
- `expo-doctor` complains about a field in `app.json`. The schema changed;
  the message names the field.

If a step will not go green after three honest attempts, stop, commit nothing
for that step, and write down exactly what failed. A half-upgraded project is
worse than one that is a version behind.

## 7. The honest trade-off

Running in Expo Go costs $0 and means chasing every SDK release, because you
do not control which Expo Go version is on your phone.

The only way to stop chasing Expo Go versions is **your own build**: a
development build or a TestFlight build of 24 itself. Then the native half of
the app is yours, it stays on whatever SDK you built it with, and you upgrade
when you choose. On iOS that needs the **Apple Developer Program, about
$99 per year**. This breaks the project's $0 rule, so it is a decision, not a
chore.

The same money also unlocks the two things Expo Go blocks today: Google
sign-in (see V1 in `docs/BUGS.md`) and home-screen widgets.

A free partial alternative: an Android phone or emulator can install older
Expo Go versions from https://expo.dev/go. Your data would need the export
file plus an import feature, which is not built.

## 8. Undo

- Remove a bad update: publish a fixed one (fastest), or
  `npx eas-cli update:republish --channel main` and pick an earlier update.
  Updates published before 2026-11-13 are SDK 54 and will not open in today's
  Expo Go.
- Remove EAS Update entirely: delete `updates`, `runtimeVersion`, `extra.eas`,
  and `owner` from `app.json`, delete `eas.json`, and
  `npm uninstall expo-updates`. Local development with `npx expo start` never
  depended on any of it.
