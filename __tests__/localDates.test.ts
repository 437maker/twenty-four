// __tests__/localDates.test.ts
//
// Phase 1: prove that every "which day is it?" decision uses the phone's
// LOCAL calendar day, not the UTC day.
//
// The clock is pinned to 11:30pm in Boston. At that moment UTC has already
// rolled over to the next day, so any code that builds a date key with
// toISOString() gets tomorrow's date. That is the bug these tests catch.
//
// The timezone itself is pinned to America/New_York in jest.global-setup.js.

import * as fs from 'fs';
import * as path from 'path';
import type { Settings } from '../app/types';

// ── Mock the queries module (same approach as useAppStore.test.ts) ────────────
const mockGetSettings = jest.fn();
const mockSaveSettings = jest.fn();
const mockGetTasksForDate = jest.fn();
const mockGetTasksForDates = jest.fn();
const mockLogStreakEnd = jest.fn();
const mockChangeTreats = jest.fn();
const mockLogTreatEvent = jest.fn();

jest.mock('../app/db/queries', () => ({
  getSettings: (...args: any[]) => mockGetSettings(...args),
  saveSettings: (...args: any[]) => mockSaveSettings(...args),
  getTasksForDate: (...args: any[]) => mockGetTasksForDate(...args),
  getTasksForDates: (...args: any[]) => mockGetTasksForDates(...args),
  logStreakEnd: (...args: any[]) => mockLogStreakEnd(...args),
  changeTreats: (...args: any[]) => mockChangeTreats(...args),
  logTreatEvent: (...args: any[]) => mockLogTreatEvent(...args),
}));

import { useAppStore } from '../app/store/useAppStore';
import { getLastNDates } from '../app/utils/calculations';
import {
  getTodayString,
  getYesterdayString,
  getTomorrowString,
  shiftDateString,
} from '../app/utils/dateHelpers';

function settings(overrides: Partial<Settings> = {}): Settings {
  return {
    companion_name: 'Nova',
    work_target_hours: 8,
    personal_target_hours: 6,
    sleep_target_hours: 8,
    care_enabled: false,
    care_target_hours: 2,
    targets_last_changed: null,
    treat_count: 0,
    current_streak: 0,
    longest_streak: 0,
    last_active_date: null,
    onboarded: true,
    notification_time: '08:00',
    reflection_count: 0,
    app_start_date: null,
    last_box_date: null,
    milestones_claimed: '[]',
    last_reflection_bonus_count: 0,
    shields_owned: 0,
    notifications_enabled: true,
    morning_notification_time: '08:00',
    evening_notification_time: '20:00',
    google_account_email: null,
    google_calendar_id: null,
    google_sync_token: null,
    google_last_sync_at: null,
    google_sync_enabled: false,
    ...overrides,
  };
}

// Friday May 15 2026, 11:30pm in Boston (EDT, UTC-4) = Saturday May 16, 03:30 UTC.
const LATE_EVENING_UTC = '2026-05-16T03:30:00Z';
const LOCAL_TODAY = '2026-05-15';
const LOCAL_YESTERDAY = '2026-05-14';

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date(LATE_EVENING_UTC));
  mockGetTasksForDates.mockResolvedValue({});
  mockSaveSettings.mockResolvedValue(undefined);
  mockLogStreakEnd.mockResolvedValue(undefined);
  mockChangeTreats.mockResolvedValue(undefined);
  mockLogTreatEvent.mockResolvedValue(undefined);
  useAppStore.setState({
    settings: null,
    isOnboarded: false,
    todaysTasks: [],
    pendingCelebration: false,
    milestoneStreak: 0,
    streakJustBroke: false,
    pendingBoxReward: null,
    shieldConsumed: false,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

// ─────────────────────────────────────────────────────────────────────────────
// Guard: if the timezone pin ever stops working, fail loudly instead of
// letting the tests below pass for the wrong reason.
// ─────────────────────────────────────────────────────────────────────────────
describe('test environment', () => {
  test('clock is 11:30pm local on May 15 while UTC is already May 16', () => {
    const now = new Date();
    expect(now.getHours()).toBe(23);
    expect(now.getMinutes()).toBe(30);
    expect(now.getDate()).toBe(15);
    expect(now.toISOString().slice(0, 10)).toBe('2026-05-16');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────────────────────────────────────
describe('dateHelpers at 11:30pm local', () => {
  test('today / yesterday / tomorrow are local calendar days', () => {
    expect(getTodayString()).toBe(LOCAL_TODAY);
    expect(getYesterdayString()).toBe(LOCAL_YESTERDAY);
    expect(getTomorrowString()).toBe('2026-05-16');
  });

  test("yesterday's adherence lookup key is the local yesterday", () => {
    // HomeScreen reads yesterday's tasks with this exact expression.
    expect(shiftDateString(getTodayString(), -1)).toBe(LOCAL_YESTERDAY);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Streak
// ─────────────────────────────────────────────────────────────────────────────
describe('checkStreakOnOpen at 11:30pm local', () => {
  test('increments the streak on the correct local day', async () => {
    mockGetSettings.mockResolvedValue(
      settings({
        app_start_date: '2026-05-12',
        last_active_date: LOCAL_YESTERDAY,
        current_streak: 3,
        longest_streak: 3,
      })
    );

    await useAppStore.getState().checkStreakOnOpen();

    expect(mockSaveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        current_streak: 4,
        longest_streak: 4,
        last_active_date: LOCAL_TODAY,
      })
    );
    expect(mockLogStreakEnd).not.toHaveBeenCalled();
    expect(useAppStore.getState().streakJustBroke).toBe(false);
  });

  test('a second open on the same local evening does not increment again', async () => {
    mockGetSettings.mockResolvedValue(
      settings({
        app_start_date: '2026-05-12',
        last_active_date: LOCAL_TODAY, // already opened this morning
        current_streak: 4,
        longest_streak: 4,
      })
    );

    await useAppStore.getState().checkStreakOnOpen();

    expect(mockSaveSettings).not.toHaveBeenCalledWith(
      expect.objectContaining({ current_streak: expect.any(Number) })
    );
    expect(mockSaveSettings).not.toHaveBeenCalledWith(
      expect.objectContaining({ last_active_date: expect.any(String) })
    );
  });

  test('first open records app_start_date as the local day', async () => {
    mockGetSettings.mockResolvedValue(settings());

    await useAppStore.getState().checkStreakOnOpen();

    expect(mockSaveSettings).toHaveBeenCalledWith({ app_start_date: LOCAL_TODAY });
  });

  test('a real missed day still resets (last active two local days ago)', async () => {
    mockGetSettings.mockResolvedValue(
      settings({
        app_start_date: '2026-05-01',
        last_active_date: '2026-05-13',
        current_streak: 9,
      })
    );

    await useAppStore.getState().checkStreakOnOpen();

    expect(mockLogStreakEnd).toHaveBeenCalledWith('2026-05-13', 9);
    expect(mockSaveSettings).toHaveBeenCalledWith({
      current_streak: 0,
      last_active_date: LOCAL_TODAY,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Weekly box
// ─────────────────────────────────────────────────────────────────────────────
describe('weekly box at 11:30pm local', () => {
  const LOCAL_LAST_7 = [
    '2026-05-09', '2026-05-10', '2026-05-11', '2026-05-12',
    '2026-05-13', '2026-05-14', '2026-05-15',
  ];

  test('getLastNDates(7) returns the 7 local days ending today', () => {
    expect(getLastNDates(7)).toEqual(LOCAL_LAST_7);
  });

  test('the box reads tasks for the correct 7 local days and stamps the local date', async () => {
    mockGetSettings.mockResolvedValue(
      settings({
        app_start_date: '2026-05-01',
        last_active_date: LOCAL_TODAY,
        last_box_date: null,
      })
    );

    await useAppStore.getState().checkStreakOnOpen();

    expect(mockGetTasksForDates).toHaveBeenCalledWith(LOCAL_LAST_7);
    expect(mockSaveSettings).toHaveBeenCalledWith({ last_box_date: LOCAL_TODAY });
  });

  test('the box is not paid a day early: 6 local days since the last box', async () => {
    // Last box on May 9. Local today is May 15 (6 days). UTC "today" is May 16
    // (7 days), so UTC-based code pays the box one evening too soon.
    mockGetSettings.mockResolvedValue(
      settings({
        app_start_date: '2026-04-01',
        last_active_date: LOCAL_TODAY,
        last_box_date: '2026-05-09',
      })
    );

    await useAppStore.getState().checkStreakOnOpen();

    expect(mockChangeTreats).not.toHaveBeenCalled();
    expect(useAppStore.getState().pendingBoxReward).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Source guard: no UTC date keys anywhere in app/
// ─────────────────────────────────────────────────────────────────────────────
// Screens are not rendered in jest, so this scans the source instead. The
// pattern toISOString().split('T') is only ever used to cut a date key out of
// a UTC timestamp. Real timestamps (updated_at, sync times) keep the full
// toISOString() value and do not match.
describe('source guard', () => {
  function listSourceFiles(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return listSourceFiles(full);
      return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
    });
  }

  test('no file in app/ builds a date key from a UTC timestamp', () => {
    const appDir = path.join(__dirname, '..', 'app');
    const pattern = /toISOString\(\)\s*\.\s*(split\(\s*['"]T['"]\s*\)|slice\(\s*0\s*,\s*10\s*\)|substring\(\s*0\s*,\s*10\s*\))/;
    const offenders: string[] = [];

    for (const file of listSourceFiles(appDir)) {
      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        if (pattern.test(line)) {
          offenders.push(`${path.relative(appDir, file).replace(/\\/g, '/')}:${i + 1}`);
        }
      });
    }

    expect(offenders).toEqual([]);
  });
});
