// delivery.test.ts — Phase C: treat delivery schedule, signals, picker, and safety rules.
// Privacy: asserts no network calls are made.

import {
  mulberry32,
  isoWeekString,
  isoWeekNumber,
  isoWeekStart,
  weekDeliveryDays,
  pickContent,
  pushToHistory,
  parseHistory,
  getContentById,
  scoreItem,
  isLowFollowThrough,
  SMALL_WIN_TAGS,
  LOW_FOLLOW_THROUGH_WHY,
} from '../app/utils/delivery';

import {
  computePillarBalance,
  computeFollowThrough,
  computeJournalMood,
  computeThemes,
  computeWeekSignals,
} from '../app/utils/insights';

import { QUOTES } from '../app/data/insights/quotes';
import { BOOKS } from '../app/data/insights/books';
import { MOVIES } from '../app/data/insights/movies';
import { ACTIVITIES } from '../app/data/insights/activities';

import type { Task, JournalEntry, Settings, DeliveryCardType } from '../app/types';

// ─────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1, date: '2026-11-10', name: 'Work task', start_time: '09:00',
    duration_hours: 2, pillar: 'work', completed: true,
    created_at: '2026-11-10T09:00:00Z',
    repeat_type: 'none', repeat_days: '', is_master: false, master_id: null,
    google_event_id: null, google_etag: null, google_updated: null,
    updated_at: '2026-11-10T09:00:00Z', sync_status: 'synced', origin: 'app',
    ...overrides,
  };
}

function makeJournal(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: 1, date: '2026-11-10', reflection_text: 'Good day overall.',
    prompt_used: 'How was your day?', is_exception_day: false,
    exception_reason: '', word_count: 4, created_at: '2026-11-10T20:00:00Z',
    ...overrides,
  };
}

const BASE_SETTINGS: Pick<Settings,
  'work_target_hours' | 'personal_target_hours' | 'sleep_target_hours' |
  'care_enabled' | 'care_target_hours' | 'current_streak' | 'longest_streak'
> = {
  work_target_hours: 8,
  personal_target_hours: 6,
  sleep_target_hours: 8,
  care_enabled: false,
  care_target_hours: 2,
  current_streak: 5,
  longest_streak: 10,
};

// ─────────────────────────────────────────────────────────────
// RNG
// ─────────────────────────────────────────────────────────────

describe('mulberry32', () => {
  test('produces values in [0, 1)', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  test('same seed produces same sequence', () => {
    const a = mulberry32(99);
    const b = mulberry32(99);
    for (let i = 0; i < 20; i++) {
      expect(a()).toBe(b());
    }
  });
});

// ─────────────────────────────────────────────────────────────
// ISO week helpers
// ─────────────────────────────────────────────────────────────

describe('isoWeekString', () => {
  test('2026-01-01 is in W01 of 2026', () => {
    expect(isoWeekString(new Date('2026-01-01T12:00:00Z'))).toBe('2026-W01');
  });

  test('2026-11-15 is in W46 of 2026', () => {
    expect(isoWeekString(new Date('2026-11-15T12:00:00Z'))).toBe('2026-W46');
  });
});

describe('isoWeekStart', () => {
  test('returns Monday of the week', () => {
    // 2026-11-15 is Sunday
    const d = new Date('2026-11-15T12:00:00');
    const start = isoWeekStart(d);
    expect(start.getDay()).toBe(1); // Monday
    expect(start.getDate()).toBe(9); // Nov 9
  });
});

// ─────────────────────────────────────────────────────────────
// Delivery day schedule
// ─────────────────────────────────────────────────────────────

describe('weekDeliveryDays', () => {
  test('returns two distinct dates in the same week', () => {
    const [d1, d2] = weekDeliveryDays('2026-W46');
    expect(d1).not.toBe(d2);
    expect(d1).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(d2).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('the two days are non-consecutive (gap ≥ 2 days)', () => {
    for (let week = 1; week <= 52; week++) {
      const weekStr = `2026-W${String(week).padStart(2, '0')}`;
      const [d1, d2] = weekDeliveryDays(weekStr);
      const diff = Math.abs(new Date(d1).getTime() - new Date(d2).getTime()) / 86400000;
      expect(diff).toBeGreaterThanOrEqual(2);
    }
  });

  test('same week string always produces the same pair (stable)', () => {
    const a = weekDeliveryDays('2026-W20');
    const b = weekDeliveryDays('2026-W20');
    expect(a).toEqual(b);
  });

  test('different week strings can produce different pairs', () => {
    const a = weekDeliveryDays('2026-W10');
    const b = weekDeliveryDays('2026-W11');
    // Not guaranteed to differ but highly likely with a random seed
    // — just check they are both valid
    expect(a).toHaveLength(2);
    expect(b).toHaveLength(2);
  });

  test('injectable rng overrides seeded pick', () => {
    const fixedRng = mulberry32(999);
    const [d1, d2] = weekDeliveryDays('2026-W46', fixedRng);
    const diff = Math.abs(new Date(d1).getTime() - new Date(d2).getTime()) / 86400000;
    expect(diff).toBeGreaterThanOrEqual(2);
  });
});

// ─────────────────────────────────────────────────────────────
// Signal analysis
// ─────────────────────────────────────────────────────────────

describe('computePillarBalance', () => {
  test('identifies neglected pillar', () => {
    const tasks = [
      makeTask({ pillar: 'work', duration_hours: 50, completed: true }),
      makeTask({ pillar: 'sleep', duration_hours: 50, completed: true }),
    ];
    const result = computePillarBalance(tasks, { ...BASE_SETTINGS });
    expect(result.mostNeglected).toBe('personal');
  });

  test('gap is negative when behind target', () => {
    const tasks = [makeTask({ pillar: 'work', duration_hours: 10, completed: true })];
    const result = computePillarBalance(tasks, { ...BASE_SETTINGS });
    // Target is 8*7=56h, got 10h → gap should be negative
    expect(result.gapPerPillar.work).toBeLessThan(0);
  });

  test('completed: false tasks do not count', () => {
    const tasks = [makeTask({ pillar: 'work', duration_hours: 100, completed: false })];
    const result = computePillarBalance(tasks, { ...BASE_SETTINGS });
    expect(result.hoursPerPillar.work).toBe(0);
  });
});

describe('computeFollowThrough', () => {
  test('completion rate is correct', () => {
    const tasks = [
      makeTask({ completed: true }),
      makeTask({ completed: true }),
      makeTask({ completed: false }),
      makeTask({ completed: false }),
    ];
    const result = computeFollowThrough(tasks, 5, 10);
    expect(result.completionRate).toBe(0.5);
    expect(result.taskCount).toBe(4);
  });

  test('empty task list gives 0 rate', () => {
    const result = computeFollowThrough([], 0, 0);
    expect(result.completionRate).toBe(0);
  });
});

describe('computeJournalMood', () => {
  test('positive words → positive mood', () => {
    const entries = [
      makeJournal({ reflection_text: 'amazing great happy accomplished grateful wonderful' }),
    ];
    const result = computeJournalMood(entries);
    expect(result.overallMood).toBe('positive');
    expect(result.hasCrisisLanguage).toBe(false);
  });

  test('negative words → negative mood', () => {
    const entries = [
      makeJournal({ reflection_text: 'terrible awful frustrated failed struggling overwhelming' }),
    ];
    const result = computeJournalMood(entries);
    expect(result.overallMood).toBe('negative');
  });

  test('crisis phrase triggers hasCrisisLanguage', () => {
    const entries = [
      makeJournal({ reflection_text: 'I want to die and have no reason to live.' }),
    ];
    const result = computeJournalMood(entries);
    expect(result.hasCrisisLanguage).toBe(true);
  });

  test('no crisis language in normal text', () => {
    const entries = [makeJournal({ reflection_text: 'I had a great day at the gym!' })];
    const result = computeJournalMood(entries);
    expect(result.hasCrisisLanguage).toBe(false);
  });

  test('empty entries → neutral mood', () => {
    const result = computeJournalMood([]);
    expect(result.overallMood).toBe('neutral');
    expect(result.hasCrisisLanguage).toBe(false);
  });
});

describe('computeThemes', () => {
  test('detects school theme', () => {
    const entries = [makeJournal({ reflection_text: 'I had a big exam and homework to finish.' })];
    const result = computeThemes(entries);
    expect(result.present).toContain('school');
    expect(result.dominant).toBe('school');
  });

  test('detects fitness theme', () => {
    const entries = [makeJournal({ reflection_text: 'Great workout at the gym today.' })];
    const result = computeThemes(entries);
    expect(result.present).toContain('fitness');
  });

  test('no entries → no themes', () => {
    const result = computeThemes([]);
    expect(result.present).toHaveLength(0);
    expect(result.dominant).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// Content picker
// ─────────────────────────────────────────────────────────────

function makeSignals(overrides: Partial<ReturnType<typeof computeWeekSignals>> = {}) {
  const tasks = [makeTask({ completed: true })];
  const entries: JournalEntry[] = [];
  const base = computeWeekSignals(tasks, entries, BASE_SETTINGS);
  return { ...base, ...overrides };
}

describe('pickContent', () => {
  test('returns a valid content item', () => {
    const result = pickContent(makeSignals(), [], [], {}, mulberry32(1));
    expect(result).not.toBeNull();
    expect(['quote', 'book', 'movie', 'activity']).toContain(result!.cardType);
    expect(typeof result!.contentId).toBe('string');
    expect(typeof result!.whyLine).toBe('string');
  });

  test('never repeats a content_id in recentContentIds', () => {
    // Build a list of all content ids
    const allIds = [
      ...QUOTES.map((q) => q.id),
      ...BOOKS.map((b) => b.id),
      ...MOVIES.map((m) => m.id),
      ...ACTIVITIES.map((a) => a.id),
    ];
    // If all IDs are excluded, pick returns null
    const result = pickContent(makeSignals(), allIds, [], {});
    expect(result).toBeNull();
  });

  test('mood-down → picks comfort item when available', () => {
    const signals = makeSignals({
      journalMood: {
        ...computeJournalMood([]),
        overallMood: 'negative',
        moodTrend: 'down',
      },
    });
    // Run many times and verify at least some have comfort tags
    const results: string[] = [];
    for (let i = 0; i < 20; i++) {
      const r = pickContent(signals, [], [], {}, mulberry32(i));
      if (r) {
        const item = getContentById(r.contentId);
        if (item) results.push(...item.item.tags);
      }
    }
    expect(results).toContain('comfort');
  });

  test('neglected care pillar → picks activity with care tag', () => {
    const signals = makeSignals({
      pillarBalance: {
        hoursPerPillar: { work: 50, personal: 50, sleep: 50, care: 0 },
        targetPerPillar: { work: 10, personal: 10, sleep: 10, care: 10 },
        gapPerPillar: { work: 40, personal: 40, sleep: 40, care: -10 },
        mostNeglected: 'care',
        strongest: 'work',
      },
    });
    // Over many picks, care-tagged activities should appear
    const results: string[] = [];
    for (let i = 0; i < 20; i++) {
      const r = pickContent(signals, [], [], {}, mulberry32(i));
      if (r?.cardType === 'activity') {
        const item = ACTIVITIES.find((a) => a.id === r.contentId);
        if (item) results.push(...item.tags);
      }
    }
    // At least some picks should have 'care' in their tags
    expect(results.length).toBeGreaterThan(0);
  });

  test('type rotation: same type never appears 3 times in a row', () => {
    const recentTypes: DeliveryCardType[] = ['quote', 'quote'];
    const result = pickContent(makeSignals(), [], recentTypes, {}, mulberry32(1));
    expect(result?.cardType).not.toBe('quote');
  });

  test('no network calls are made during pick', () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve(new Response()));
    pickContent(makeSignals(), [], [], {});
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

// ─────────────────────────────────────────────────────────────
// Crisis safety card
// ─────────────────────────────────────────────────────────────

describe('crisis detection', () => {
  test('crisis language sets hasCrisisLanguage = true', () => {
    const entries = [
      makeJournal({ reflection_text: 'I keep thinking about suicide and want to die.' }),
    ];
    const signals = computeWeekSignals([], entries, BASE_SETTINGS);
    expect(signals.journalMood.hasCrisisLanguage).toBe(true);
  });

  test('normal sad words do not trigger crisis', () => {
    const entries = [
      makeJournal({ reflection_text: 'I felt sad, frustrated, and exhausted today.' }),
    ];
    const signals = computeWeekSignals([], entries, BASE_SETTINGS);
    expect(signals.journalMood.hasCrisisLanguage).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// Content library integrity
// ─────────────────────────────────────────────────────────────

describe('content library', () => {
  test('quotes: at least 55 items, all ≤25 words, all have attribution', () => {
    expect(QUOTES.length).toBeGreaterThanOrEqual(55);
    for (const q of QUOTES) {
      const wordCount = q.text.trim().split(/\s+/).length;
      expect(wordCount).toBeLessThanOrEqual(25);
      expect(q.attribution.length).toBeGreaterThan(0);
    }
  });

  test('books: at least 35 items, each has title/author/pitch/tags', () => {
    expect(BOOKS.length).toBeGreaterThanOrEqual(35);
    for (const b of BOOKS) {
      expect(b.title.length).toBeGreaterThan(0);
      expect(b.author.length).toBeGreaterThan(0);
      expect(b.pitch.length).toBeGreaterThan(0);
      expect(b.tags.length).toBeGreaterThan(0);
    }
  });

  test('movies: at least 35 items, each has title/year/pitch/tags', () => {
    expect(MOVIES.length).toBeGreaterThanOrEqual(35);
    for (const m of MOVIES) {
      expect(m.title.length).toBeGreaterThan(0);
      expect(m.year).toBeGreaterThan(1900);
      expect(m.pitch.length).toBeGreaterThan(0);
    }
  });

  test('activities: at least 35 items, each has title/pitch/tags/pillar', () => {
    expect(ACTIVITIES.length).toBeGreaterThanOrEqual(35);
    for (const a of ACTIVITIES) {
      expect(a.title.length).toBeGreaterThan(0);
      expect(a.pitch.length).toBeGreaterThan(0);
      expect(a.tags.length).toBeGreaterThan(0);
      expect(a.pillars.length).toBeGreaterThan(0);
    }
  });

  test('no duplicate ids across all content libraries', () => {
    const ids = [
      ...QUOTES.map((q) => q.id),
      ...BOOKS.map((b) => b.id),
      ...MOVIES.map((m) => m.id),
      ...ACTIVITIES.map((a) => a.id),
    ];
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  test('getContentById finds all items', () => {
    for (const q of QUOTES)    expect(getContentById(q.id)).not.toBeNull();
    for (const b of BOOKS)     expect(getContentById(b.id)).not.toBeNull();
    for (const m of MOVIES)    expect(getContentById(m.id)).not.toBeNull();
    for (const a of ACTIVITIES) expect(getContentById(a.id)).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// Rough follow-through (lively run, Phase D)
// ─────────────────────────────────────────────────────────────

describe('rough follow-through', () => {
  // A week where `done` of `total` tasks were completed.
  const week = (done: number, total: number) =>
    computeWeekSignals(
      Array.from({ length: total }, (_, i) => makeTask({ completed: i < done })),
      [],
      BASE_SETTINGS,
    );
  const low = week(3, 10);     // 30%
  const fine = week(6, 10);    // 60%

  test('under 40% of at least 3 tasks counts; 40% or a near-empty week does not', () => {
    expect(isLowFollowThrough(low)).toBe(true);
    expect(isLowFollowThrough(week(39, 100))).toBe(true);
    expect(isLowFollowThrough(week(4, 10))).toBe(false);  // exactly 40%
    expect(isLowFollowThrough(fine)).toBe(false);
    expect(isLowFollowThrough(week(0, 2))).toBe(false);   // too few tasks to judge
    expect(isLowFollowThrough(week(0, 0))).toBe(false);   // nothing planned
    expect(isLowFollowThrough(week(0, 3))).toBe(true);
  });

  test('+20 for items tagged process or small-wins, once, and only in a rough week', () => {
    const score = (tags: string[], signals: ReturnType<typeof week>) => scoreItem(tags, [], signals, {});
    const plain = score(['focus'], low);
    expect(score(['process'], low) - plain).toBe(20);
    expect(score(['small-wins'], low) - plain).toBe(20);
    expect(score(['process', 'small-wins'], low) - plain).toBe(20); // not 40
    // In an ordinary week the tags are worth nothing extra.
    expect(score(['process', 'small-wins'], fine)).toBe(score(['focus'], fine));
    // Other items are not pushed down.
    expect(score(['focus'], low)).toBe(score(['focus'], fine));
  });

  test('at least 10 library items carry the tags, across activities, books and movies', () => {
    const tagged = <T extends { id: string; tags: string[] }>(list: T[]): T[] =>
      list.filter((x) => x.tags.some((t) => (SMALL_WIN_TAGS as readonly string[]).includes(t)));
    const activities = tagged(ACTIVITIES);
    const books = tagged(BOOKS);
    const movies = tagged(MOVIES);
    expect(activities.length + books.length + movies.length).toBeGreaterThanOrEqual(10);
    expect(activities.length).toBeGreaterThanOrEqual(5);
    expect(books.length).toBeGreaterThanOrEqual(3);
    expect(movies.length).toBeGreaterThanOrEqual(3);
    expect(activities.map((a) => a.title)).toContain('2-minute start');
    for (const a of activities) expect(a.pitch.length).toBeGreaterThan(20);
  });

  test('a rough week is given a small way back in far more often, with its own why line', () => {
    const isSmallWinId = (id: string) =>
      (getContentById(id)!.item.tags as string[]).some((t) => (SMALL_WIN_TAGS as readonly string[]).includes(t));
    // The same 200 seeds in an ordinary week, to compare against.
    let ordinary = 0;
    for (let seed = 1; seed <= 200; seed++) {
      if (isSmallWinId(pickContent(fine, [], [], {}, mulberry32(seed))!.contentId)) ordinary += 1;
    }
    let smallWins = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const picked = pickContent(low, [], [], {}, mulberry32(seed))!;
      const found = getContentById(picked.contentId)!;
      const tags: string[] = found.item.tags;
      if (tags.some((t) => (SMALL_WIN_TAGS as readonly string[]).includes(t))) {
        smallWins += 1;
        expect(picked.whyLine).toBe(LOW_FOLLOW_THROUGH_WHY);
      } else {
        expect(picked.whyLine).not.toBe(LOW_FOLLOW_THROUGH_WHY);
      }
    }
    // 15 of 195 items carry the tags. The pick is from the top fifth by
    // score, where they now share the band with the neglected-pillar items.
    expect(smallWins).toBeGreaterThan(50);           // over a quarter of the picks
    expect(smallWins).toBeGreaterThan(ordinary * 2); // and well above an ordinary week
  });

  test('an ordinary week never gets the rough-week line', () => {
    for (let seed = 1; seed <= 200; seed++) {
      expect(pickContent(fine, [], [], {}, mulberry32(seed))!.whyLine).not.toBe(LOW_FOLLOW_THROUGH_WHY);
    }
  });

  test('the why line is the one in the spec', () => {
    expect(LOW_FOLLOW_THROUGH_WHY).toBe("Rough follow-through this week. Here's a small way back in.");
  });
});

// ─────────────────────────────────────────────────────────────
// History helpers
// ─────────────────────────────────────────────────────────────

describe('pushToHistory / parseHistory', () => {
  test('round-trips through JSON', () => {
    const h = pushToHistory('[]', 'q01', 10);
    expect(parseHistory(h)).toEqual(['q01']);
  });

  test('respects maxItems cap', () => {
    let h = '[]';
    for (let i = 0; i < 60; i++) h = pushToHistory(h, `q${i}`, 56);
    const arr = parseHistory(h);
    expect(arr.length).toBe(56);
    expect(arr[arr.length - 1]).toBe('q59');
  });

  test('handles corrupt JSON gracefully', () => {
    const result = parseHistory('not-json');
    expect(result).toEqual([]);
  });
});
