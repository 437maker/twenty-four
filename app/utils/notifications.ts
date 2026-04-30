// notifications.ts — Daily reminder scheduling.
//
// NOTE: expo-notifications is not supported in Expo Go from SDK 53 onwards.
// These functions are safe no-ops while you're testing in Expo Go.
// To enable real notifications later, do a development build (npx expo run:ios)
// and uncomment the implementation below.

export async function scheduleDailyNotification(
  _time: Date,
  _companionName: string
): Promise<void> {
  // No-op in Expo Go — notifications require a development build.
}

/*
  REAL IMPLEMENTATION (uncomment when using a dev build):

  import * as Notifications from 'expo-notifications';

  export async function scheduleDailyNotification(time, companionName) {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${companionName} is ready! 🐕`,
        body: 'Nova is ready to plan with you when you are.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: time.getHours(),
        minute: time.getMinutes(),
      },
    });
  }
*/
