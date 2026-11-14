// __tests__/useAppStore.test.ts
//
// Tests for the streak / shield / weekly-box state machine inside
// useAppStore.checkStreakOnOpen. This is the single most consequential
// piece of logic in the app — it runs on every cold open and decides
// whether to increment, preserve, or reset the user's streak, whether
// to consume a shield, and whether to pay out the weekly accuracy box.
//
// We mock the entire ./db/queries module and use fake timers so "today"
// is deterministic. Real calculations.ts functions run unmocked.

import type { Settings, Task } from '../app/types';

// ── Mock the queries module ───────────────────────────────────────────────────
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

// ── Import the store AFTER mocking ────────────────────────────────────────────
import { useAppStore } from '../app/store/useAppStore';

// ── Helper: build a Settings object with sane defaults ────────────────────────
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
    google_calendar_id:   null,
    google_sync_token:    null,
    google_last_sync_at:  null,
    google_sync_enabled:  false,
    equipped_items:       '{}',
    breed:                'maltese',
    shown_house:          null,
    ...overrides,
  };
}

// ── Helper: pin the system clock to a known date ──────────────────────────────
// Uses noon so the date conversion (toISOString().split('T')[0]) is unambiguous
// across timezones — at noon UTC, the date is the same in nearly every TZ.
function pinDate(yyyyMmDd: string): void {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(`${yyyyMmDd}T12:00:00Z`));
}

// ── Reset everything between tests ────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  mockGetTasksForDates.mockResolvedValue({});
  mockSaveSettings.mockResolvedValue(undefined);
  mockLogStreakEnd.mockResolvedValue(undefined);
  mockChangeTreats.mockResolvedValue(undefined);
  mockLogTreatEvent.mockResolvedValue(undefined);

  // Reset Zustand store to initial values
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
// Scenario: first ever open (no app_start_date, no last_active_date)
// ─────────────────────────────────────────────────────────────────────────────
describe('checkStreakOnOpen — first ever open', () => {
  test('records app_start_date and does not modify streak', async () => {
    pinDate('2026-05-15');
    const initial = settings({
      app_start_date: null,
      last_active_date: null,
      current_streak: 0,
    });
    mockGetSettings.mockResolvedValue(initial);

    await useAppStore.getState().checkStreakOnOpen();

    expect(mockSaveSettings).toHaveBeenCalledWith({
      app_start_date: '2026-05-15',
    });
    // No streak increment because last_active_date was null (not yesterday)
    // → falls into the "missed days" branch with no shield → reset to 0
    // current_streak was already 0, so this is a no-op effectively.
    const stateAfter = useAppStore.getState();
    expect(stateAfter.streakJustBroke).toBe(false); // streak was 0
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario: same-day re-open (last_active_date == today)
// ─────────────────────────────────────────────────────────────────────────────
describe('checkStreakOnOpen — same-day re-open', () => {
  test('does not modify streak, shield, or treats', async () => {
    pinDate('2026-05-15');
    const initial = settings({
      app_start_date: '2026-05-01',
      last_active_date: '2026-05-15',
      current_streak: 5,
    });
    mockGetSettings.mockResolvedValue(initial);

    await useAppStore.getState().checkStreakOnOpen();

    // No streak update or treat change — only the weekly box check runs
    expect(mockLogTreatEvent).not.toHaveBeenCalledWith(
      'streak_milestone',
      expect.anything(),
      expect.anything()
    );
    expect(useAppStore.getState().streakJustBroke).toBe(false);
    expect(useAppStore.getState().shieldConsumed).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario: consecutive day (last_active_date == yesterday)
// ─────────────────────────────────────────────────────────────────────────────
describe('checkStreakOnOpen — consecutive day', () => {
  test('increments streak by 1', async () => {
    pinDate('2026-05-15');
    mockGetSettings.mockResolvedValue(
      settings({
        app_start_date: '2026-05-10',
        last_active_date: '2026-05-14',
        current_streak: 3,
        longest_streak: 3,
      })
    );

    await useAppStore.getState().checkStreakOnOpen();

    expect(mockSaveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        current_streak: 4,
        longest_streak: 4,
        last_active_date: '2026-05-15',
      })
    );
  });

  test('updates longest_streak only when current exceeds it', async () => {
    pinDate('2026-05-15');
    mockGetSettings.mockResolvedValue(
      settings({
        app_start_date: '2026-05-10',
        last_active_date: '2026-05-14',
        current_streak: 5,
        longest_streak: 100,
      })
    );

    await useAppStore.getState().checkStreakOnOpen();

    expect(mockSaveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        current_streak: 6,
        longest_streak: 100, // unchanged
      })
    );
  });

  test('hitting 7-day milestone awards 15 treats and sets pendingCelebration', async () => {
    pinDate('2026-05-15');
    mockGetSettings.mockResolvedValue(
      settings({
        app_start_date: '2026-05-09',
        last_active_date: '2026-05-14',
        current_streak: 6,
        longest_streak: 6,
        milestones_claimed: '[]',
      })
    );

    await useAppStore.getState().checkStreakOnOpen();

    expect(mockChangeTreats).toHaveBeenCalledWith(15);
    expect(mockLogTreatEvent).toHaveBeenCalledWith(
      'streak_milestone',
      15,
      '7-day streak milestone'
    );
    expect(mockSaveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        current_streak: 7,
        milestones_claimed: '[7]',
      })
    );
    expect(useAppStore.getState().pendingCelebration).toBe(true);
    expect(useAppStore.getState().milestoneStreak).toBe(7);
  });

  test('30-day milestone awards 35 treats', async () => {
    pinDate('2026-05-15');
    mockGetSettings.mockResolvedValue(
      settings({
        app_start_date: '2026-04-15',
        last_active_date: '2026-05-14',
        current_streak: 29,
        milestones_claimed: '[7]',
      })
    );

    await useAppStore.getState().checkStreakOnOpen();

    expect(mockChangeTreats).toHaveBeenCalledWith(35);
    expect(mockSaveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        current_streak: 30,
        milestones_claimed: '[7,30]',
      })
    );
  });

  test('does not re-award an already-claimed milestone', async () => {
    // User hits 7 again somehow (e.g. broke and rebuilt). Should still
    // award because milestones_claimed is reset on streak break? Let's
    // verify the implemented behavior: it does NOT re-award if already
    // in the claimed list. (This is current behavior — flag if you want
    // to change it: streaks rebuilt from 0 cannot re-earn the 7-day
    // bonus until you also clear milestones_claimed on reset.)
    pinDate('2026-05-15');
    mockGetSettings.mockResolvedValue(
      settings({
        app_start_date: '2026-05-09',
        last_active_date: '2026-05-14',
        current_streak: 6,
        milestones_claimed: '[7]', // already claimed
      })
    );

    await useAppStore.getState().checkStreakOnOpen();

    expect(mockChangeTreats).not.toHaveBeenCalled();
    expect(useAppStore.getState().pendingCelebration).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario: missed day (last_active_date older than yesterday)
// ─────────────────────────────────────────────────────────────────────────────
describe('checkStreakOnOpen — missed day with shield', () => {
  test('consumes one shield, preserves streak, sets shieldConsumed banner', async () => {
    pinDate('2026-05-15');
    mockGetSettings.mockResolvedValue(
      settings({
        app_start_date: '2026-05-01',
        last_active_date: '2026-05-12', // 3 days ago
        current_streak: 10,
        shields_owned: 2,
      })
    );

    await useAppStore.getState().checkStreakOnOpen();

    expect(mockSaveSettings).toHaveBeenCalledWith({
      shields_owned: 1,
      last_active_date: '2026-05-15',
    });
    expect(mockLogStreakEnd).not.toHaveBeenCalled(); // streak preserved
    expect(useAppStore.getState().shieldConsumed).toBe(true);
    expect(useAppStore.getState().streakJustBroke).toBe(false);
  });
});

describe('checkStreakOnOpen — missed day without shield', () => {
  test('logs streak end, resets to 0, sets streakJustBroke banner', async () => {
    pinDate('2026-05-15');
    mockGetSettings.mockResolvedValue(
      settings({
        app_start_date: '2026-05-01',
        last_active_date: '2026-05-12',
        current_streak: 10,
        shields_owned: 0,
      })
    );

    await useAppStore.getState().checkStreakOnOpen();

    expect(mockLogStreakEnd).toHaveBeenCalledWith('2026-05-12', 10);
    expect(mockSaveSettings).toHaveBeenCalledWith({
      current_streak: 0,
      last_active_date: '2026-05-15',
    });
    expect(useAppStore.getState().streakJustBroke).toBe(true);
  });

  test('does not log streak history for streaks of 0', async () => {
    pinDate('2026-05-15');
    mockGetSettings.mockResolvedValue(
      settings({
        app_start_date: '2026-05-01',
        last_active_date: '2026-05-12',
        current_streak: 0,
        shields_owned: 0,
      })
    );

    await useAppStore.getState().checkStreakOnOpen();

    expect(mockLogStreakEnd).not.toHaveBeenCalled();
    expect(useAppStore.getState().streakJustBroke).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario: weekly accuracy box
// ─────────────────────────────────────────────────────────────────────────────
describe('checkStreakOnOpen — weekly accuracy box', () => {
  test('does NOT pay out before app_start_date + 7 days', async () => {
    pinDate('2026-05-15');
    mockGetSettings.mockResolvedValue(
      settings({
        app_start_date: '2026-05-10', // only 5 days ago
        last_active_date: '2026-05-15',
      })
    );

    await useAppStore.getState().checkStreakOnOpen();

    expect(mockLogTreatEvent).not.toHaveBeenCalledWith(
      expect.stringContaining('weekly_box'),
      expect.anything(),
      expect.anything()
    );
    expect(useAppStore.getState().pendingBoxReward).toBeNull();
  });

  test('pays gold (20 treats) for ≥80% adherence on the rolling 7 days', async () => {
    pinDate('2026-05-15');
    // freshSettings call returns the same baseline
    mockGetSettings.mockResolvedValue(
      settings({
        app_start_date: '2026-05-01', // 14 days ago
        last_active_date: '2026-05-15', // already opened today
        last_box_date: null,
      })
    );

    // Build 7 days of perfect adherence
    const goldenDay: Task[] = [
      {
        id: 1,
        date: '2026-05-15',
        name: 'X',
        start_time: '09:00',
        duration_hours: 1,
        pillar: 'work',
        completed: true,
        created_at: '',
        repeat_type: 'none',
        repeat_days: '',
        is_master: false,
        master_id: null,
        google_event_id: null,
        google_etag:     null,
        google_updated:  null,
        updated_at:      '',
        sync_status:     'synced',
        origin:          'app',
      },
    ];
    const taskMap: Record<string, Task[]> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date('2026-05-15T12:00:00Z');
      d.setDate(d.getDate() - i);
      taskMap[d.toISOString().split('T')[0]] = goldenDay;
    }
    mockGetTasksForDates.mockResolvedValue(taskMap);

    await useAppStore.getState().checkStreakOnOpen();

    expect(mockChangeTreats).toHaveBeenCalledWith(20);
    expect(mockLogTreatEvent).toHaveBeenCalledWith(
      'weekly_box_gold',
      20,
      expect.stringContaining('100% adherence')
    );
    expect(mockSaveSettings).toHaveBeenCalledWith({
      last_box_date: '2026-05-15',
    });
    expect(useAppStore.getState().pendingBoxReward).toEqual({
      tier: 'gold',
      treats: 20,
      adherence: 100,
    });
  });

  test('does NOT pay out twice within the same 7-day window', async () => {
    pinDate('2026-05-15');
    mockGetSettings.mockResolvedValue(
      settings({
        app_start_date: '2026-04-01',
        last_active_date: '2026-05-15',
        last_box_date: '2026-05-13', // 2 days ago
      })
    );

    await useAppStore.getState().checkStreakOnOpen();

    expect(mockLogTreatEvent).not.toHaveBeenCalledWith(
      expect.stringContaining('weekly_box'),
      expect.anything(),
      expect.anything()
    );
    expect(useAppStore.getState().pendingBoxReward).toBeNull();
  });
});
