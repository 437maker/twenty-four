// notifications.ts — expo-notifications wrapper.
// Sprint 2: request permissions, schedule daily morning + evening notifications,
//           cancel all scheduled notifications (used before rescheduling).
// Sprint 3: catch blocks now report to Sentry instead of silently swallowing.
//
// All scheduling is idempotent: call scheduleNotifications() on every app open.
// It cancels all existing scheduled notifications first, then schedules fresh ones.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';

// ── Configure how notifications appear while the app is in the foreground ──────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  false,
    shouldSetBadge:   false,
  }),
});

// ── Request permissions ────────────────────────────────────────────────────────
// Returns true if the user has granted (or already had) notification permissions.
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name:       'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    Sentry.captureException(err, { tags: { module: 'notifications', op: 'requestPermissions' } });
    return false;
  }
}

// ── Schedule morning + evening notifications ───────────────────────────────────
// Cancels ALL existing scheduled notifications first so there are no duplicates.
export async function scheduleNotifications(
  morningTime: string,   // "HH:MM"
  eveningTime: string,   // "HH:MM"
  companionName: string
): Promise<void> {
  try {
    // Cancel everything scheduled previously
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Parse HH:MM strings
    const [mHour, mMin] = morningTime.split(':').map(Number);
    const [eHour, eMin] = eveningTime.split(':').map(Number);

    const morningMessages = [
      `Good morning! ${companionName} is ready to help you tackle today's goals. 🌟`,
      `Rise and shine! Plan your day with ${companionName} and make it count. ☀️`,
      `${companionName} says good morning! What are we focusing on today? 🐾`,
      `A new day, new possibilities. ${companionName} believes in you! 💪`,
    ];
    const eveningMessages = [
      `How did your day go? ${companionName} wants to hear all about it! 📖`,
      `Evening check-in time! Log your progress and keep that streak alive. 🔥`,
      `${companionName} is waiting to celebrate your wins today! 🎉`,
      `Don't forget to reflect on today — ${companionName} is proud of you. 🌙`,
    ];

    // Rotate messages day-by-day
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    const morningMsg = morningMessages[dayOfYear % morningMessages.length];
    const eveningMsg = eveningMessages[dayOfYear % eveningMessages.length];

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '24 — Morning Check-in',
        body:  morningMsg,
        data:  { screen: 'Home' },
      },
      trigger: {
        type:   Notifications.SchedulableTriggerInputTypes.DAILY,
        hour:   mHour,
        minute: mMin,
      },
    });

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '24 — Evening Reflection',
        body:  eveningMsg,
        data:  { screen: 'Journal' },
      },
      trigger: {
        type:   Notifications.SchedulableTriggerInputTypes.DAILY,
        hour:   eHour,
        minute: eMin,
      },
    });
  } catch (err) {
    // Notifications are non-critical to app function — but we still want
    // to know when scheduling fails so we can fix permissions / OS bugs.
    Sentry.captureException(err, { tags: { module: 'notifications', op: 'schedule' } });
    console.warn('[notifications] scheduleNotifications failed:', err);
  }
}

// ── Cancel all ────────────────────────────────────────────────────────────────
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (err) {
    Sentry.captureException(err, { tags: { module: 'notifications', op: 'cancelAll' } });
  }
}

// ── Legacy shim — kept to avoid breaking any old import sites ─────────────────
export async function scheduleDailyNotification(
  _time: Date,
  _companionName: string
): Promise<void> {
  // replaced by scheduleNotifications() in Sprint 2
}
