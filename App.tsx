// App.tsx — Root of the entire application.
//
// This is the first file Expo loads. It sets up:
//   1. Notification handler (so alerts appear while the app is open)
//   2. The database tables on first launch
//   3. The navigation system
//   4. The conditional: show onboarding OR show the main tab screen

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { initializeDatabase } from './app/db/database';

// Suppress a known Expo Go + React Native 0.77 dev-mode warning.
// This is a harmless internal feature-flag check that fires during startup
// and has no effect on the app. It only appears in development, not in production.
LogBox.ignoreLogs(['Could not access feature flag']);
import { useAppStore } from './app/store/useAppStore';
import OnboardingScreen from './app/screens/onboarding/OnboardingScreen';
import MainTabs from './app/screens/MainTabs';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const { isOnboarded, loadSettings } = useAppStore();

  useEffect(() => {
    async function bootstrap() {
      await initializeDatabase();
      await loadSettings();
      setIsLoading(false);
    }
    bootstrap();
  }, []);

  // Show nothing (a blank screen) while we're bootstrapping.
  // In a production app you'd show a custom splash screen here.
  if (isLoading) return null;

  return (
    // GestureHandlerRootView is required by React Navigation's gesture system
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* SafeAreaProvider makes screens aware of notches and home indicators */}
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          {/*
            screenOptions={{ headerShown: false }} hides the default navigation header
            on every screen. Each screen manages its own header (or has none).
          */}
          <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
            {isOnboarded ? (
              // User has completed setup → show the main 5-tab app
              <Stack.Screen name="Main" component={MainTabs} />
            ) : (
              // First-launch → show the 6-step onboarding flow
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
