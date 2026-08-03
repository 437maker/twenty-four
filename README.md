# Twenty-Four — Time Balance Tracker

> A personal habit and time-management app built with React Native, designed to help you see exactly how balanced your day really is.

---

## What It Does

Most productivity apps track tasks. **Twenty-Four** tracks *balance*.

Your day is divided into four life pillars — **Work**, **Personal**, **Sleep**, and **Care**. You plan your hours across those pillars, log your day, and the app shows you how closely reality matched the plan. Over days, weeks, and months, patterns emerge that you can actually act on.

---

## Features

### Daily Schedule
- Build your day task by task, assigning each to a pillar with a start time and duration
- Check tasks off as you complete them
- Move tasks between days with a single tap using the inline day-strip (no pickers, no extra steps)
- Repeat tasks daily, on weekdays, weekends, weekly, or on custom days
- Conflict detection flags overlapping tasks

### Goal Progress Bar
- Lives at the top of the Schedule screen
- Shows how many hours you've hit vs. your target for each pillar, for the current day

### Analytics Dashboard (9 sections)
1. **Rotating Insights** — personalised tip based on your recent patterns
2. **Summary Cards** — streak, average adherence at a glance
3. **Weekly Bar Chart** — last 7 days, tap any bar for a breakdown
4. **Monthly Dot Grid** — last 30 days colour-coded by adherence
5. **Pillar Balance Bar** — stacked bar showing this week's time split
6. **Streak History** — your last 5 completed streaks
7. **Daily Breakdown** — last 14 days, expand any day to see every task
8. **Monthly Analytics** — month navigator, weekly chart, pillar breakdown, consistency calendar grid with tap-to-inspect cells
9. **Yearly Overview** — year navigator, 12-month trend chart, pillar balance vs. targets, GitHub-style 52×7 heatmap, auto-generated yearly insights

### Streaks & Reward Economy
- Daily streak with milestone bonuses at 7, 30, 100, and 365 days
- Treats (in-app currency) earned by completing tasks and hitting streaks
- Weekly accuracy boxes: Gold (≥80% adherence), Silver (≥60%), Basic — each awards treats
- In-app shop to spend treats on cosmetics

### Journal
- Daily reflection attached to each day
- Mark days as exception days (sick days, holidays) so they don't count against your adherence score
- Monthly and yearly journal counts shown in Analytics

### Settings
- Set target hours per pillar
- Toggle the Care pillar on/off
- Morning and evening notifications
- Google Calendar two-way sync (connect via Settings → Google Calendar)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.81.5 + Expo SDK 54 |
| Language | TypeScript |
| Database | SQLite via `expo-sqlite` (fully local, no cloud) |
| State | Zustand |
| Navigation | React Navigation (bottom tabs) |
| Charts | Custom-built with `View` + `StyleSheet` — no charting libraries |
| Auth (Google) | `expo-auth-session` with PKCE flow |
| Token storage | `expo-secure-store` |
| Animations | React Native `Animated` API |
| Testing | Jest |

---

## Project Structure

```
app/
├── components/          # Reusable UI — TaskCard, WheelPicker, PillarSelector, etc.
├── db/
│   ├── database.ts      # Schema creation and migrations
│   └── queries.ts       # All SQLite query functions
├── screens/
│   ├── analytics/       # MonthlySection.tsx, YearlySection.tsx
│   ├── AnalyticsScreen.tsx
│   ├── ScheduleScreen.tsx
│   ├── SettingsScreen.tsx
│   ├── JournalScreen.tsx
│   └── CalendarSettingsScreen.tsx
├── services/
│   ├── googleAuth.ts    # OAuth token flow
│   ├── googleCalendar.ts # Google Calendar REST client
│   └── calendarSync.ts  # Two-way sync logic
├── store/
│   └── useAppStore.ts   # Zustand global store
├── types/
│   └── index.ts         # Shared TypeScript types
└── utils/
    ├── calculations.ts  # Adherence, streaks, pillar hours, chart helpers
    └── dateHelpers.ts   # Date formatting and utilities
```

---

## Running Locally

**Prerequisites:** Node.js, npm, Expo Go on your phone (iOS or Android), same Wi-Fi network.

```bash
# Install dependencies
npm install

# Start the development server
npx expo start
```

Scan the QR code with your iPhone Camera app (iOS) or the Expo Go app (Android).

---

## Google Calendar Sync

Two-way sync is built in but requires a Google OAuth Client ID:

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable the **Google Calendar API**
3. Create an **OAuth 2.0 Web Client ID**
4. Add `https://auth.expo.io/@YOUR_EXPO_USERNAME/twenty-four` as an authorised redirect URI
5. Add your Client ID to `.env` as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

Once connected, tasks sync to a dedicated **"Twenty-Four"** calendar. Google Calendar events (non-recurring, non-holiday) are pulled into the app under the **Work** pillar.

---

## Built With

This project was developed collaboratively with **[Claude](https://claude.ai) (Anthropic)** as an AI development partner. Writing precise technical briefs, reviewing generated code, making architecture decisions, and directing the build is itself a skill — one this project was a hands-on exercise in developing.

---

## License

MIT
