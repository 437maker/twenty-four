// App.tsx — Root of the entire application.
//
// Sprint 2: calls checkStreakOnOpen() in bootstrap so streaks are
// incremented / reset the moment the user opens the app.
// Also schedules morning + evening notifications on every launch.
//
// Sprint 3 (ship-readiness): initialize Sentry early so any crash in
// bootstrap is captured. DSN is read from EXPO_PUBLIC_SENTRY_DSN — if
// unset (e.g. during local dev), Sentry is a no-op.

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import * as Sentry from '@sentry/react-native';

import { initializeDatabase } from './app/db/database';
import {
  requestNotificationPermissions,
  scheduleNotifications,
} from './app/utils/notifications';

// ─── Initialize Sentry as the very first thing ───────────────────────────────
// Only initializes if a DSN is provided via env. In dev, leave EXPO_PUBLIC_SENTRY_DSN
// unset and Sentry stays disabled — no PII leaves your machine.
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn:                  SENTRY_DSN,
    enableAutoSessionTracking: true,
    tracesSampleRate:     0.1,           // 10% perf traces
    debug:                __DEV__,        // verbose console in dev only
    environment:          __DEV__ ? 'development' : 'production',
    // Don't send PII — we have nothing to send anyway, but defensive
    sendDefaultPii:       false,
  });
}

// Suppress a known Expo Go + RN 0.81 dev-mode warning (harmless)
LogBox.ignoreLogs(['Could not access feature flag']);

import { useAppStore } from './app/store/useAppStore';
import OnboardingScreen from './app/screens/onboarding/OnboardingScreen';
import MainTabs from './app/screens/MainTabs';

const Stack = createNativeStackNavigator();

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const { isOnboarded, loadSettings, checkStreakOnOpen } = useAppStore();

  useEffect(() => {
    async function bootstrap() {
      try {
        // 1. Open / migrate the SQLite database
        await initializeDatabase();
        // 2. Load settings into the Zustand store
        await loadSettings();
        // 3. Check streak on every launch (increment if consecutive day, reset if missed)
        await checkStreakOnOpen();
        // 4. Schedule notifications (idempotent — cancels and reschedules)
        const { settings } = useAppStore.getState();
        if (settings?.notifications_enabled !== false) {
          const granted = await requestNotificationPermissions();
          if (granted) {
            await scheduleNotifications(
              settings?.morning_notification_time ?? '08:00',
              settings?.evening_notification_time ?? '20:00',
              settings?.companion_name ?? 'Nova'
            );
          }
        }
      } catch (err) {
        // Bootstrap should NEVER throw to the user — log to Sentry and
        // let the app continue (settings will load as defaults).
        Sentry.captureException(err);
        console.error('[bootstrap] failed:', err);
      } finally {
        setIsLoading(false);
      }
    }
    bootstrap();
  }, []);

  if (isLoading) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
            {isOnboarded ? (
              <Stack.Screen name="Main" component={MainTabs} />
            ) : (
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Wrap App with Sentry's ErrorBoundary + touch-event tracking.
// If Sentry isn't initialized (no DSN), Sentry.wrap() is still safe — it
// just returns the component unchanged.
export default Sentry.wrap(App);
