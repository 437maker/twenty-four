// __tests__/calendarSettings.test.tsx
//
// Guards the fix for: "Cannot make a deep link into a standalone app with
// no custom scheme defined" thrown when SettingsScreen opened on iPhone.
//
// Root cause: CalendarSettingsScreen called Google.useAuthRequest on every
// mount (via useGoogleSignIn at the top of the component), even when the
// user had not asked to connect their calendar.
//
// Fix: useAuthRequest is now only called inside <GoogleSignInFlow>, a child
// component that is only mounted AFTER the user taps "Connect Google Calendar".
//
// This test verifies that rendering SettingsScreen (which always mounts
// CalendarSettingsScreen) does NOT trigger Google.useAuthRequest.

jest.mock('expo-sqlite',      () => require('../test-utils/realSqlite').expoSqliteMock);
jest.mock('expo-file-system', () => ({ File: jest.fn(), Paths: { cache: 'cache' } }));
jest.mock('expo-sharing',     () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('../app/services/calendarSync', () => ({
  runSync:      jest.fn(),
  isSyncReady:  jest.fn(async () => false),
}));
jest.mock('../app/utils/notifications', () => ({
  requestNotificationPermissions: jest.fn(async () => true),
  scheduleNotifications:          jest.fn(async () => {}),
  cancelAllNotifications:         jest.fn(async () => {}),
}));
jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  captureMessage:   jest.fn(),
  withScope:        jest.fn(),
  init:             jest.fn(),
  wrap:             jest.fn((c: unknown) => c),
}));

// Expo modules that googleAuth.ts imports at module load time.
jest.mock('expo-web-browser',  () => ({ maybeCompleteAuthSession: jest.fn() }));
jest.mock('expo-secure-store', () => ({
  getItemAsync:    jest.fn(async () => null),
  setItemAsync:    jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));
jest.mock('expo-auth-session', () => ({
  exchangeCodeAsync: jest.fn(),
  makeRedirectUri:   jest.fn(() => 'exp://localhost'),
}));

// ─── The critical spy ─────────────────────────────────────────────────────────
// If this is called on render, the original bug is present.
const mockUseAuthRequest = jest.fn(() => [null, null, jest.fn()]);
jest.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: () => mockUseAuthRequest(),
}));

// Mock heavy child screens so this test focuses on the Google auth path.
jest.mock('../app/screens/CompanionGalleryScreen', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MockCompanionGallery() { return <View />; };
});
jest.mock('../app/screens/BreedPickerScreen', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MockBreedPicker() { return <View />; };
});
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return { __esModule: true, ...actual, default: actual.default, withRepeat: jest.fn(actual.withRepeat) };
});

import React from 'react';
import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';

import { resetRealDb } from '../test-utils/realSqlite';
import { initializeDatabase } from '../app/db/database';
import SettingsScreen from '../app/screens/SettingsScreen';

beforeEach(async () => {
  mockUseAuthRequest.mockClear();
  resetRealDb();
  await initializeDatabase();
});

let tree: ReactTestRenderer | null = null;
afterEach(() => {
  if (tree) {
    act(() => tree!.unmount());
    tree = null;
  }
});

describe('SettingsScreen — Google auth lazy-load', () => {
  test('renders without calling Google.useAuthRequest', async () => {
    await act(async () => {
      tree = create(<SettingsScreen visible={true} onClose={() => {}} />);
    });

    expect(mockUseAuthRequest).not.toHaveBeenCalled();
  });

  test('Google.useAuthRequest is still not called when visible=false', async () => {
    await act(async () => {
      tree = create(<SettingsScreen visible={false} onClose={() => {}} />);
    });

    expect(mockUseAuthRequest).not.toHaveBeenCalled();
  });
});
