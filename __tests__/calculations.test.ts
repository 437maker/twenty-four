// __tests__/calculations.test.ts
//
// Pure-function tests for the most economically dangerous helpers in
// calculations.ts. These rules pay (or fail to pay) treats based on
// streak / adherence — if any of these regress silently, users will
// rage-quit.

import {
  weeklyBoxTier,
  weeklyBoxReward,
  isStreakMilestone,
  milestoneBonus,
  calculatePlanAdherence,
  weeklyAdherence,
  buildDayAnalytics,
  getCurrentWeekDates,
  getLastNDates,
} from '../app/utils/calculations';
import { dayStatus } from '../app/utils/dateHelpers';
import type { Task, DayAnalytics } from '../app/types';

// ── Helper to build a Task quickly ────────────────────────────────────────────
function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    date: '2026-05-15',
    name: 'Test',
    start_time: '09:00',
    duration_hours: 1,
    pillar: 'work',
    completed: false,
    created_at: '2026-05-15 09:00:00',
    repeat_type: 'none',
    repeat_days: '',
    is_master: false,
    master_id: null,
    google_event_id: null,
    google_etag:     null,
    google_updated:  null,
    updated_at:      '2026-05-15 09:00:00',
    sync_status:     'synced',
    origin:          'app',
    ...overrides,
  };
}

describe('weeklyBoxTier', () => {
  test('returns gold at exactly 80%', () => {
    expect(weeklyBoxTier(80)).toBe('gold');
  });

  test('returns gold at 100%', () => {
    expect(weeklyBoxTier(100)).toBe('gold');
  });

  test('returns silver at exactly 60%', () => {
    expect(weeklyBoxTier(60)).toBe('silver');
  });

  test('returns silver at 79% (just below gold)', () => {
    expect(weeklyBoxTier(79)).toBe('silver');
  });

  test('returns basic at 59% (just below silver)', () => {
    expect(weeklyBoxTier(59)).toBe('basic');
  });

  test('returns basic at 0%', () => {
    expect(weeklyBoxTier(0)).toBe('basic');
  });

  test('returns basic at -1% (defensive)', () => {
    expect(weeklyBoxTier(-1)).toBe('basic');
  });
});

describe('weeklyBoxReward', () => {
  test('gold pays 20 treats', () => {
    expect(weeklyBoxReward('gold')).toBe(20);
  });

  test('silver pays 12 treats', () => {
    expect(weeklyBoxReward('silver')).toBe(12);
  });

  test('basic pays 5 treats', () => {
    expect(weeklyBoxReward('basic')).toBe(5);
  });

  // The three tiers add up to a meaningful spread. If someone tweaks one
  // value without thinking, this catches degenerate orderings.
  test('gold > silver > basic (monotone reward)', () => {
    const g = weeklyBoxReward('gold');
    const s = weeklyBoxReward('silver');
    const b = weeklyBoxReward('basic');
    expect(g).toBeGreaterThan(s);
    expect(s).toBeGreaterThan(b);
  });
});

describe('isStreakMilestone', () => {
  test('true at 7, 30, 100, 365', () => {
    expect(isStreakMilestone(7)).toBe(true);
    expect(isStreakMilestone(30)).toBe(true);
    expect(isStreakMilestone(100)).toBe(true);
    expect(isStreakMilestone(365)).toBe(true);
  });

  test('false at non-milestone values', () => {
    expect(isStreakMilestone(0)).toBe(false);
    expect(isStreakMilestone(1)).toBe(false);
    expect(isStreakMilestone(6)).toBe(false);
    expect(isStreakMilestone(8)).toBe(false);
    expect(isStreakMilestone(29)).toBe(false);
    expect(isStreakMilestone(31)).toBe(false);
    expect(isStreakMilestone(99)).toBe(false);
    expect(isStreakMilestone(101)).toBe(false);
    expect(isStreakMilestone(364)).toBe(false);
    expect(isStreakMilestone(366)).toBe(false);
    expect(isStreakMilestone(1000)).toBe(false);
  });
});

describe('milestoneBonus', () => {
  test('7-day streak → 15 treats', () => {
    expect(milestoneBonus(7)).toBe(15);
  });

  test('30-day streak → 35 treats', () => {
    expect(milestoneBonus(30)).toBe(35);
  });

  test('100-day streak → 70 treats', () => {
    expect(milestoneBonus(100)).toBe(70);
  });

  test('365-day streak → 130 treats', () => {
    expect(milestoneBonus(365)).toBe(130);
  });

  test('non-milestone → 0 treats', () => {
    expect(milestoneBonus(1)).toBe(0);
    expect(milestoneBonus(6)).toBe(0);
    expect(milestoneBonus(8)).toBe(0);
    expect(milestoneBonus(50)).toBe(0);
    expect(milestoneBonus(364)).toBe(0);
  });

  // Bonuses must escalate so longer streaks feel rewarding.
  test('milestone bonuses are monotonically non-decreasing', () => {
    expect(milestoneBonus(7)).toBeLessThan(milestoneBonus(30));
    expect(milestoneBonus(30)).toBeLessThan(milestoneBonus(100));
    expect(milestoneBonus(100)).toBeLessThan(milestoneBonus(365));
  });
});

describe('calculatePlanAdherence', () => {
  test('empty list → 0', () => {
    expect(calculatePlanAdherence([])).toBe(0);
  });

  test('all completed → 100', () => {
    expect(
      calculatePlanAdherence([
        task({ duration_hours: 2, completed: true }),
        task({ duration_hours: 1, completed: true }),
      ])
    ).toBe(100);
  });

  test('half by hours completed → 50', () => {
    expect(
      calculatePlanAdherence([
        task({ duration_hours: 2, completed: true }),
        task({ duration_hours: 2, completed: false }),
      ])
    ).toBe(50);
  });

  test('weights by duration, not by task count', () => {
    // 1 task of 4h done vs 3 tasks of 1h each not done = 4/7 ≈ 57%
    const result = calculatePlanAdherence([
      task({ duration_hours: 4, completed: true }),
      task({ duration_hours: 1, completed: false }),
      task({ duration_hours: 1, completed: false }),
      task({ duration_hours: 1, completed: false }),
    ]);
    expect(result).toBe(57);
  });

  test('clamps at 100 (defensive: never above)', () => {
    // Shouldn't be reachable with normal inputs, but the impl uses
    // Math.min(100, …) — verify that.
    expect(
      calculatePlanAdherence([
        task({ duration_hours: 1, completed: true }),
      ])
    ).toBeLessThanOrEqual(100);
  });

  test('zero-duration tasks → 0', () => {
    expect(
      calculatePlanAdherence([task({ duration_hours: 0, completed: true })])
    ).toBe(0);
  });
});

describe('weeklyAdherence', () => {
  // All days used here are fixed past dates (before 2026-11-16, today in this session).
  function day(adherence: number, hasTasks = true, date = '2026-05-15'): DayAnalytics {
    return {
      date,
      adherence,
      tasks: hasTasks ? [task({ date })] : [],
      isException: false,
    };
  }

  test('empty → 0', () => {
    expect(weeklyAdherence([])).toBe(0);
  });

  test('all empty days → 0', () => {
    expect(weeklyAdherence([day(0, false), day(0, false)])).toBe(0);
  });

  test('averages only days with tasks', () => {
    // 80, 60, [empty day excluded]  → average 70
    expect(
      weeklyAdherence([day(80), day(60), day(0, false)])
    ).toBe(70);
  });

  test('rounds to nearest int', () => {
    // (80 + 70 + 65) / 3 = 71.666… → 72
    expect(weeklyAdherence([day(80), day(70), day(65)])).toBe(72);
  });

  test('Phase A: future days are excluded', () => {
    // 2027-01-01 is a future date (after today 2026-11-16)
    const futureDay: DayAnalytics = {
      date: '2027-01-01',
      adherence: 0,
      tasks: [task({ date: '2027-01-01' })],
      isException: false,
      isFuture: true,
    };
    // Only the two past days should count → (80 + 60) / 2 = 70
    expect(weeklyAdherence([day(80), day(60), futureDay])).toBe(70);
  });

  test('Phase A: a week fully planned ahead → adherence stays at past rate', () => {
    const futureDays: DayAnalytics[] = ['2027-01-01','2027-01-02','2027-01-03',
      '2027-01-04','2027-01-05','2027-01-06','2027-01-07'].map((d) => ({
        date: d,
        adherence: 0,
        tasks: [task({ date: d })],
        isException: false,
        isFuture: true,
      }));
    // With only future days, adherence = 0 (no countable days)
    expect(weeklyAdherence(futureDays)).toBe(0);
    // Add a good past day → that one day's rate is 90%
    expect(weeklyAdherence([...futureDays, day(90)])).toBe(90);
  });
});

describe('Phase A: dayStatus', () => {
  test('past date returns "past"', () => {
    expect(dayStatus('2024-01-01')).toBe('past');
  });

  test('future date returns "future"', () => {
    expect(dayStatus('2099-12-31')).toBe('future');
  });

  test('today returns "today" (injected clock)', () => {
    const now = new Date('2026-05-15T12:00:00');
    expect(dayStatus('2026-05-15', now)).toBe('today');
  });

  test('Boston late-evening UTC edge case: 2026-05-15 23:30 EST → still May 15 locally', () => {
    // 23:30 EST = 04:30 UTC next day. toISOString().slice(0,10) would give May 16;
    // dayStatus uses local format() so it must still return "today" for May 15.
    const bostonLateEvening = new Date('2026-05-15T23:30:00'); // local time 23:30
    expect(dayStatus('2026-05-15', bostonLateEvening)).toBe('today');
    expect(dayStatus('2026-05-16', bostonLateEvening)).toBe('future');
  });
});

describe('Phase A: getCurrentWeekDates', () => {
  test('always returns 7 dates Mon–Sun', () => {
    // Friday 2026-11-13
    const friday = new Date('2026-11-13T12:00:00');
    const week = getCurrentWeekDates(friday);
    expect(week).toHaveLength(7);
    expect(week[0]).toBe('2026-11-09'); // Monday
    expect(week[6]).toBe('2026-11-15'); // Sunday
  });

  test('Monday: week starts at that Monday', () => {
    const monday = new Date('2026-11-09T12:00:00');
    const week = getCurrentWeekDates(monday);
    expect(week[0]).toBe('2026-11-09');
    expect(week[6]).toBe('2026-11-15');
  });

  test('Sunday: week starts at the previous Monday', () => {
    const sunday = new Date('2026-11-15T12:00:00');
    const week = getCurrentWeekDates(sunday);
    expect(week[0]).toBe('2026-11-09');
    expect(week[6]).toBe('2026-11-15');
  });

  test('dates are YYYY-MM-DD strings, may include future', () => {
    // On a Monday, the rest of the week is future
    const monday = new Date('2026-11-09T12:00:00');
    const week = getCurrentWeekDates(monday);
    // Mon is today (past in this test); Tue–Sun are future relative to Monday
    expect(week.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))).toBe(true);
  });
});

describe('Phase A: buildDayAnalytics marks isFuture', () => {
  function taskForDate(date: string): Task {
    return task({ date });
  }

  test('future dates get isFuture=true and adherence=0', () => {
    const taskMap = {
      '2027-01-01': [taskForDate('2027-01-01')],
      '2026-05-01': [{ ...taskForDate('2026-05-01'), completed: true }],
    };
    const analytics = buildDayAnalytics(taskMap, new Set());
    const future = analytics.find(d => d.date === '2027-01-01')!;
    const past   = analytics.find(d => d.date === '2026-05-01')!;
    expect(future.isFuture).toBe(true);
    expect(future.adherence).toBe(0);
    expect(past.isFuture).toBeFalsy();
    expect(past.adherence).toBe(100);
  });
});
