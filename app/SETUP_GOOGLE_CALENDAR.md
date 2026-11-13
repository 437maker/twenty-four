# Google Calendar Sync — Setup Guide

Two-way sync between **twenty-four** tasks and a Google Calendar named **"Twenty-Four"**, running inside Expo Go.

This document walks through everything you need to do **outside** the codebase before the sync will work.

---

## 1. Install dependencies

From your project root (the folder that has `package.json`), run:

```bash
npx expo install expo-auth-session expo-crypto expo-web-browser expo-secure-store
```

These four packages are what the new code imports:

- `expo-auth-session` — drives the OAuth flow with Google.
- `expo-crypto` — peer dependency of auth-session (PKCE code challenge).
- `expo-web-browser` — opens the Google sign-in page.
- `expo-secure-store` — stores the refresh token in the device Keychain / Keystore.

> Use `npx expo install`, not `npm install`. It picks the version that matches your Expo SDK.

---

## 2. Configure `app.json`

Your app needs a **scheme** (custom URL) so the OAuth proxy can return to it. Open `app.json` and add a `scheme` field:

```json
{
  "expo": {
    "name": "twenty-four",
    "slug": "twenty-four",
    "scheme": "twentyfour"
  }
}
```

If `slug` doesn't match your Expo username's project name, take note — you'll need it in step 4.

---

## 3. Set up a Google Cloud project

This is the one-time part where Google needs to know about your app.

1. Go to <https://console.cloud.google.com/> and sign in with the Google account you want to test with.
2. Create a new project — name it whatever (e.g. *Twenty-Four*).
3. In the left nav, go to **APIs & Services → Library**. Search for **Google Calendar API** and click **Enable**.
4. Go to **APIs & Services → OAuth consent screen**.
   - User Type: **External**.
   - Fill App name, your email as User support email, and your email as Developer contact.
   - Scopes: skip / add later.
   - **Test users**: add your own Gmail address. This is important — until you publish the app, only listed test users can sign in.
5. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - Application type: **Web application** (yes, "Web" — that's what the Expo auth proxy needs).
   - Name: *Twenty-Four Expo Proxy*.
   - **Authorized redirect URIs**: add this exact URL, replacing `<EXPO_USERNAME>` and `<SLUG>` with your values:

     ```
     https://auth.expo.io/@<EXPO_USERNAME>/<SLUG>
     ```

     Example: `https://auth.expo.io/@sahilmujawar/twenty-four`

     - To find your Expo username, run `npx expo whoami` after logging in with `npx expo login`.
     - The slug is the `slug` field in `app.json`.
6. Click **Create**. Copy the **Client ID** (looks like `1234-abc.apps.googleusercontent.com`). You'll use it next.

---

## 4. Wire the client ID into the app

Two options — pick one.

### Option A — environment variable (recommended)

Create a `.env` file in the project root (don't commit it):

```bash
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=1234-abc.apps.googleusercontent.com
```

The `EXPO_PUBLIC_` prefix is mandatory — anything without it is stripped from the JS bundle.

### Option B — hard-code (quick test)

Open `app/services/googleAuth.ts` and replace the placeholder:

```ts
export const GOOGLE_WEB_CLIENT_ID = '1234-abc.apps.googleusercontent.com';
```

Be careful not to commit this if your repo is public.

---

## 5. Try it

1. `npx expo start --tunnel` (tunnel mode is important — Google OAuth requires HTTPS, which Expo's tunnel gives you).
2. Open the app in Expo Go.
3. Tap the Settings gear → **Connect Google Calendar**.
4. The system browser opens, you sign in, grant calendar permission, and you're bounced back.
5. The app immediately runs the first sync. You'll see counters for created / updated / deleted on both sides.

A new calendar called **"Twenty-Four"** appears in <https://calendar.google.com/>. Any task you add in the app appears there within a few seconds (sync runs when you open / focus the Schedule tab). Any event you add **to that specific calendar** in Google becomes a Work-pillar task in the app on the next sync.

---

## 6. Known limits (v1)

This is a deliberate, scoped first version. Pushback I'd give before you ask me to extend it:

| Limit | Reason | Workaround |
|---|---|---|
| Sync only runs when the app is open | Expo Go can't run background tasks. | Tap "Sync now" or just open the app. |
| Repeating tasks don't sync | Mapping RRULE → your repeat_days is fragile and you said "skip for v1". | Add repeating tasks in only one place for now. |
| All incoming Google events become Work pillar | We discussed this — keeps the design simple. | If you later want pillar mapping, we can stash pillar in Google's `extendedProperties.private` and read it back. |
| Last-write-wins for conflicts | Cheapest correct option. | If two edits happen within seconds of each other on different devices you might lose one. Real-world that's rare. |
| Completion state isn't pushed to Google | Calendar has no "done" field. | The app still tracks `completed` locally. |
| OAuth via Expo proxy (auth.expo.io) | Required for Expo Go. | When you switch to a development build, swap to a native client ID and remove the proxy. |

---

## 7. Troubleshooting

**"Error 400: redirect_uri_mismatch"**
The redirect URI in your Google credentials doesn't exactly match `https://auth.expo.io/@<user>/<slug>`. Check spelling, capitalization, the slug, and that you ran `npx expo login`.

**"Access blocked: This app's request is invalid"**
Your Gmail isn't listed as a test user on the OAuth consent screen. Add it.

**Sync runs but nothing appears in Google**
Check the calendar selector in Google Calendar — the "Twenty-Four" calendar might be hidden in the left sidebar. Toggle it on.

**"NOT_SIGNED_IN" error after the app was idle for hours**
Refresh token may have been revoked. Tap **Disconnect** then **Connect** again.

**The Schedule tab feels slow on first open after sign-in**
That's the initial 90-day-back / 365-day-forward pull. After the first run it uses an incremental sync token and is fast.

---

## 8. Files this added or changed

New:
- `app/services/googleAuth.ts`
- `app/services/googleCalendar.ts`
- `app/services/calendarSync.ts`
- `app/screens/CalendarSettingsScreen.tsx`
- `app/SETUP_GOOGLE_CALENDAR.md` (this file)

Changed:
- `app/db/database.ts` — schema migration for sync columns + tombstones table
- `app/db/queries.ts` — sync-aware mutations, push/pull helpers
- `app/types/index.ts` — Task + Settings extended with Google fields
- `app/store/useAppStore.ts` — `syncWithGoogle` action, `isSyncing` flag
- `app/screens/SettingsScreen.tsx` — new "Google Calendar" row
- `app/screens/HomeScreen.tsx` — fire sync on focus
- `app/screens/ScheduleScreen.tsx` — fire sync on focus
