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
} from '../app/utils/calculations';
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
  function day(adherence: number, hasTasks = true): DayAnalytics {
    return {
      date: '2026-05-15',
      adherence,
      tasks: hasTasks ? [task()] : [],
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
});
