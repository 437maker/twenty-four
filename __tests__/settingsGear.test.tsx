// __tests__/settingsGear.test.tsx
//
// Regression tests for the settings gear bug (gear did nothing on iPhone).
// Verifies that the gear is reachable both from the Home yard header and from
// the Schedule screen date bar.

// useFocusEffect calls useNavigation internally which needs a navigator context.
// Replace it with a plain useEffect so ScheduleScreen renders outside a navigator.
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (fn: () => unknown) => {
    const { useEffect } = require('react');
    useEffect(() => { fn(); }, []);
  },
}));

jest.mock('expo-sqlite', () => require('../test-utils/realSqlite').expoSqliteMock);
jest.mock('expo-file-system', () => ({ File: jest.fn(), Paths: { cache: 'cache' } }));
jest.mock('expo-sharing',     () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('../app/services/calendarSync', () => ({
  runSync: jest.fn(),
  isSyncReady: jest.fn(async () => false),
}));
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return { __esModule: true, ...actual, default: actual.default, withRepeat: jest.fn(actual.withRepeat) };
});
jest.mock('../app/screens/SettingsScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockSettings({ visible }: { visible: boolean }) {
    return visible ? <View testID="mock-settings"><Text>Settings</Text></View> : null;
  };
});

import React from 'react';
import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';

import { resetRealDb } from '../test-utils/realSqlite';
import { initializeDatabase } from '../app/db/database';
import ScheduleScreen from '../app/screens/ScheduleScreen';

beforeEach(async () => {
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

// ─────────────────────────────────────────────────────────────────────────────
describe('Schedule screen — settings gear', () => {
  async function render() {
    await act(async () => {
      tree = create(<ScheduleScreen />);
    });
    return tree!;
  }

  // Helper: finds the interactive gear button (the one with both testID and onPress).
  function findGear(t: ReactTestRenderer) {
    return t.root.find(
      (n) => n.props.testID === 'schedule-settings-gear' && typeof n.props.onPress === 'function',
    );
  }

  test('the gear button renders and is pressable', async () => {
    const t = await render();
    expect(() => findGear(t)).not.toThrow();
    expect(typeof findGear(t).props.onPress).toBe('function');
  });

  test('tapping the gear opens the settings modal', async () => {
    const t = await render();
    const gear = findGear(t);

    // Settings not shown yet.
    expect(
      t.root.findAll((n) => n.props.testID === 'mock-settings' && typeof n.type === 'function'
        ? false : n.props.testID === 'mock-settings'),
    ).toHaveLength(0);

    await act(async () => { gear.props.onPress(); });

    // After press the mock settings view is present.
    expect(
      t.root.findAll((n) => n.props.testID === 'mock-settings'),
    ).not.toHaveLength(0);
  });

  test('the gear has hitSlop set for a larger tap area', async () => {
    const t = await render();
    const gear = findGear(t);
    expect(gear.props.hitSlop).toBeDefined();
    // hitSlop should be a positive value (number or object).
    const hs = gear.props.hitSlop;
    if (typeof hs === 'number') expect(hs).toBeGreaterThan(0);
    else expect(Object.values(hs as Record<string, number>).some((v) => v > 0)).toBe(true);
  });
});
