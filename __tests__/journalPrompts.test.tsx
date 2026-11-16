// journalPrompts.test.tsx — the process prompts, their formats, and how the
// prompt of the day is picked.
//
//   1. The data: every prompt has a valid category, format and id; the new
//      categories each hold enough prompts; fill-in prompts have blanks.
//   2. The rules: each signal about the week maps to the right categories.
//   3. No prompt is repeated within 30 days.
//   4. "Different prompt" stays in the same category.
//   5. The format helpers (starting text, the 1 to 5 rating) and the timer.

jest.mock('expo-sqlite', () => require('../test-utils/realSqlite').expoSqliteMock);
jest.mock('expo-file-system', () => ({ File: jest.fn(), Paths: { cache: 'cache' } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('../app/services/calendarSync', () => ({
  runSync: jest.fn(),
  isSyncReady: jest.fn(async () => false),
}));

import React from 'react';
import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';

import {
  ALL_CATEGORIES, ALL_PROMPTS, BLANK, FORMAT_LABELS, GENTLE_CARE_PROMPTS, NEW_PROCESS_PROMPTS,
  PROCESS_CATEGORIES, PROMPT_FORMATS,
  findPromptByText, formatOf, getPrompt, splitRating, templateFor, withRating,
} from '../app/data/journalPrompts';
import type { Prompt, PromptCategory } from '../app/data/journalPrompts';
import { TWO_MINUTES_MS, TwoMinuteTimer, formatCountdown } from '../app/screens/JournalScreen';
import type { Task } from '../app/types';
import { shiftDateString } from '../app/utils/dateHelpers';
import {
  NO_REPEAT_DAYS, RULE_CATEGORIES,
  daySeed, differentPrompt, neglectedTwoWeeks, parsePromptHistory, poolForRule, recentIds, recordShown,
  ruleForSignals, selectSmartPrompt,
} from '../app/utils/promptPicker';
import type { PromptRule, PromptSignals, Shown } from '../app/utils/promptPicker';

const CONTEXT = { streak: 0, isSunday: false, careEnabled: false };
const QUIET: PromptSignals = {
  completionRate: 0.6, taskCount: 10, isStrongWeek: false, stressedCount: 0, tiredCount: 0, neglectedTwice: null,
};
const SIGNALS: Record<PromptRule, PromptSignals> = {
  rotate: QUIET,
  low: { ...QUIET, completionRate: 0.3 },
  strong: { ...QUIET, completionRate: 0.9, isStrongWeek: true },
  stressed: { ...QUIET, stressedCount: 2, tiredCount: 1 },
  neglected: { ...QUIET, neglectedTwice: 'sleep' },
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. The data
// ─────────────────────────────────────────────────────────────────────────────
describe('the prompts', () => {
  test('every prompt has a valid category, a valid format, and a unique id', () => {
    const ids = new Set<string>();
    for (const p of ALL_PROMPTS) {
      expect(ALL_CATEGORIES).toContain(p.category);
      expect(PROMPT_FORMATS).toContain(p.format);
      expect(p.id).toMatch(/^[a-zA-Z]+-\d+$/);
      expect(ids.has(p.id!)).toBe(false);
      ids.add(p.id!);
      expect(p.text.trim().length).toBeGreaterThan(15);
      expect(getPrompt(p.id!)).toBe(p);
      expect(findPromptByText(p.text)).toBe(p);
    }
    expect(new Set(ALL_PROMPTS.map((p) => p.text)).size).toBe(ALL_PROMPTS.length); // no duplicates
  });

  test('at least 70 new process prompts, in the seven new categories', () => {
    expect(NEW_PROCESS_PROMPTS.length).toBeGreaterThanOrEqual(70);
    expect(PROCESS_CATEGORIES).toEqual(['process', 'controllables', 'stretch', 'unstuck', 'scaffold', 'pastself', 'oneRep']);
    for (const category of PROCESS_CATEGORIES) {
      const list = NEW_PROCESS_PROMPTS.filter((p) => p.category === category);
      expect(list.length).toBeGreaterThanOrEqual(10);
    }
    for (const p of NEW_PROCESS_PROMPTS) {
      expect(PROCESS_CATEGORIES).toContain(p.category);
      expect(['process', 'potential']).toContain(p.source);
    }
    // The 40 original prompts are all still there.
    expect(ALL_PROMPTS.length - NEW_PROCESS_PROMPTS.length - GENTLE_CARE_PROMPTS.length).toBe(40);
  });

  test('every new format is used, in several categories', () => {
    for (const format of ['fill', 'scale', 'two-minute', 'zoom', 'letter'] as const) {
      const using = NEW_PROCESS_PROMPTS.filter((p) => p.format === format);
      expect(using.length).toBeGreaterThanOrEqual(5);
      expect(new Set(using.map((p) => p.category)).size).toBeGreaterThanOrEqual(4);
      expect(FORMAT_LABELS[format].length).toBeGreaterThan(0);
    }
  });

  test('fill-in prompts have at least one blank, and no other prompt has one', () => {
    for (const p of ALL_PROMPTS) {
      if (p.format === 'fill') expect(p.text).toContain(BLANK);
      else expect(p.text).not.toContain(BLANK);
    }
  });

  test('each format reads like its format', () => {
    for (const p of NEW_PROCESS_PROMPTS) {
      if (p.format === 'scale') expect(p.text).toMatch(/1 to 5|1 is .* 5 is/);
      if (p.format === 'two-minute') expect(p.text.toLowerCase()).toContain('two minutes');
      if (p.format === 'zoom') expect(p.text).toMatch(/^Zoom out: .*Zoom in: /);
      if (p.format === 'letter') expect(p.text).toMatch(/^Write (a short|one line)/);
    }
  });

  test('no prompt names or quotes a book', () => {
    const banned = [
      'chop wood', 'carry water', 'hidden potential', 'medcalf', 'adam grant', 'grant says', 'the book',
      'fall in love with the process', 'surrender the outcome', 'character skills', 'scaffolding',
    ];
    for (const p of ALL_PROMPTS) {
      const text = p.text.toLowerCase();
      for (const phrase of banned) expect(text).not.toContain(phrase);
      expect(p.text).not.toMatch(/[“”]/); // no quotation marks around borrowed lines
    }
  });

  test('gentle prompts are care prompts that do not need the Care pillar', () => {
    expect(GENTLE_CARE_PROMPTS.length).toBeGreaterThanOrEqual(3);
    for (const p of GENTLE_CARE_PROMPTS) {
      expect(p.category).toBe('care');
      expect(p.gentle).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. The rules
// ─────────────────────────────────────────────────────────────────────────────
describe('which rule applies', () => {
  test('one signal each', () => {
    expect(ruleForSignals(SIGNALS.rotate)).toBe('rotate');
    expect(ruleForSignals(SIGNALS.low)).toBe('low');
    expect(ruleForSignals(SIGNALS.strong)).toBe('strong');
    expect(ruleForSignals(SIGNALS.stressed)).toBe('stressed');
    expect(ruleForSignals(SIGNALS.neglected)).toBe('neglected');
  });

  test('the thresholds', () => {
    expect(ruleForSignals({ ...QUIET, completionRate: 0.49 })).toBe('low');
    expect(ruleForSignals({ ...QUIET, completionRate: 0.5 })).toBe('rotate');
    // Too few tasks to judge the week by: no "low" and no "strong".
    expect(ruleForSignals({ ...QUIET, completionRate: 0, taskCount: 2 })).toBe('rotate');
    expect(ruleForSignals({ ...QUIET, completionRate: 1, taskCount: 2, isStrongWeek: true })).toBe('rotate');
    // One stressed word is not a stressed week; two are.
    expect(ruleForSignals({ ...QUIET, stressedCount: 1 })).toBe('rotate');
    expect(ruleForSignals({ ...QUIET, stressedCount: 1, tiredCount: 1 })).toBe('stressed');
  });

  test('when several apply: stressed first, then low, then neglected, then strong', () => {
    expect(ruleForSignals({ ...SIGNALS.low, stressedCount: 3, neglectedTwice: 'work' })).toBe('stressed');
    expect(ruleForSignals({ ...SIGNALS.low, neglectedTwice: 'work' })).toBe('low');
    expect(ruleForSignals({ ...SIGNALS.strong, neglectedTwice: 'work' })).toBe('neglected');
  });

  test('each rule maps to the right categories', () => {
    expect(RULE_CATEGORIES.low).toEqual(['process', 'controllables', 'oneRep']);
    expect(RULE_CATEGORIES.strong).toEqual(['stretch', 'pastself']);
    expect(RULE_CATEGORIES.stressed).toEqual(['controllables', 'care']);
    expect(RULE_CATEGORIES.neglected).toEqual(['unstuck']);
    for (const rule of ['low', 'strong', 'stressed', 'neglected'] as const) {
      const pool = poolForRule(rule, CONTEXT);
      expect(pool.length).toBeGreaterThan(0);
      for (const p of pool) expect(RULE_CATEGORIES[rule]).toContain(p.category);
      // Every category of the rule is really in the pool.
      for (const c of RULE_CATEGORIES[rule]) expect(pool.some((p) => p.category === c)).toBe(true);
    }
    // The care prompts offered in a stressed week are the gentle ones.
    for (const p of poolForRule('stressed', CONTEXT).filter((x) => x.category === 'care')) expect(p.gentle).toBe(true);
  });

  test.each(['low', 'strong', 'stressed', 'neglected'] as const)('a %s week gets a prompt from its categories', (rule) => {
    for (let day = 0; day < 10; day++) {
      const today = shiftDateString('2026-11-16', day);
      const pick = selectSmartPrompt({ signals: SIGNALS[rule], history: [], today, context: CONTEXT });
      expect(pick.rule).toBe(rule);
      expect(RULE_CATEGORIES[rule]).toContain(pick.prompt.category);
    }
  });

  test('an ordinary week rotates through everything that is allowed', () => {
    const cats = (ctx: typeof CONTEXT) => new Set(poolForRule('rotate', ctx).map((p) => p.category));
    const plain = cats(CONTEXT);
    for (const c of PROCESS_CATEGORIES) expect(plain.has(c)).toBe(true);
    for (const c of ['balance', 'work', 'personal', 'sleep', 'growth'] as PromptCategory[]) expect(plain.has(c)).toBe(true);
    // Care, streak and Sunday prompts only when they apply.
    expect(plain.has('care')).toBe(false);
    expect(plain.has('streak')).toBe(false);
    expect(plain.has('weekly')).toBe(false);
    expect(cats({ ...CONTEXT, careEnabled: true }).has('care')).toBe(true);
    expect(cats({ ...CONTEXT, streak: 7 }).has('streak')).toBe(true);
    expect(cats({ ...CONTEXT, isSunday: true }).has('weekly')).toBe(true);
    // Gentle prompts are kept for stressed weeks.
    for (const p of poolForRule('rotate', { ...CONTEXT, careEnabled: true })) expect(p.gentle).toBeFalsy();
  });

  test('the same pillar most neglected two weeks running', () => {
    const settings = { work_target_hours: 8, personal_target_hours: 6, sleep_target_hours: 8, care_enabled: false, care_target_hours: 2 };
    const done = (pillar: Task['pillar'], hours: number) => ({ pillar, duration_hours: hours, completed: true }) as Task;
    // Plenty of work and personal time, almost no sleep logged.
    const noSleep = [done('work', 56), done('personal', 42), done('sleep', 5)];
    const noPersonal = [done('work', 56), done('personal', 2), done('sleep', 56)];
    expect(neglectedTwoWeeks(noSleep, noSleep, settings)).toBe('sleep');
    expect(neglectedTwoWeeks(noSleep, noPersonal, settings)).toBeNull(); // a different pillar each week
    expect(neglectedTwoWeeks(noSleep, [], settings)).toBeNull();         // no data for last week
    // Nothing behind its target: nothing is neglected.
    const allGood = [done('work', 60), done('personal', 50), done('sleep', 60)];
    expect(neglectedTwoWeeks(allGood, allGood, settings)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. No repeats within 30 days
// ─────────────────────────────────────────────────────────────────────────────
describe('no repeats within 30 days', () => {
  // One prompt a day for `days` days, the way the Journal screen does it.
  function run(days: number, signalsFor: (day: number) => PromptSignals): Shown[] {
    let history: Shown[] = [];
    for (let day = 0; day < days; day++) {
      const today = shiftDateString('2026-01-01', day);
      const { prompt } = selectSmartPrompt({ signals: signalsFor(day), history, today, context: CONTEXT });
      history = recordShown(history, prompt.id!, today);
    }
    return history;
  }
  // Keep the whole log for checking (recordShown prunes it, as it should).
  function fullLog(days: number, signalsFor: (day: number) => PromptSignals): Shown[] {
    let history: Shown[] = [];
    const log: Shown[] = [];
    for (let day = 0; day < days; day++) {
      const today = shiftDateString('2026-01-01', day);
      const { prompt } = selectSmartPrompt({ signals: signalsFor(day), history, today, context: CONTEXT });
      history = recordShown(history, prompt.id!, today);
      log.push({ id: prompt.id!, date: today });
    }
    return log;
  }
  function expectNoRepeats(log: Shown[]) {
    const lastSeen = new Map<string, number>();
    log.forEach((entry, day) => {
      const before = lastSeen.get(entry.id);
      if (before !== undefined) expect(day - before).toBeGreaterThanOrEqual(NO_REPEAT_DAYS);
      lastSeen.set(entry.id, day);
    });
  }

  test.each(['rotate', 'low', 'strong', 'stressed', 'neglected'] as const)(
    'a year of %s weeks never repeats a prompt within 30 days',
    (rule) => {
      const log = fullLog(365, () => SIGNALS[rule]);
      expect(log).toHaveLength(365);
      expectNoRepeats(log);
    },
  );

  test('a year of changing weeks never repeats within 30 days either', () => {
    const order: PromptRule[] = ['low', 'low', 'stressed', 'rotate', 'strong', 'neglected', 'rotate'];
    expectNoRepeats(fullLog(365, (day) => SIGNALS[order[Math.floor(day / 7) % order.length]]));
  });

  test('when a rule runs out of fresh prompts, it borrows from the rest rather than repeat', () => {
    // 'neglected' has 11 unstuck prompts: by day 12 they are all used.
    const log = fullLog(20, () => SIGNALS.neglected);
    const first11 = log.slice(0, 11).map((l) => getPrompt(l.id)!.category);
    expect(new Set(first11)).toEqual(new Set(['unstuck']));
    expect(getPrompt(log[11].id)!.category).not.toBe('unstuck');
  });

  test('the prompt of the day does not change when the screen is opened again', () => {
    const today = '2026-11-16';
    const first = selectSmartPrompt({ signals: QUIET, history: [], today, context: CONTEXT }).prompt;
    const history = recordShown([], first.id!, today);
    // Opened again later, even after the week took a turn:
    expect(selectSmartPrompt({ signals: SIGNALS.stressed, history, today, context: CONTEXT }).prompt).toBe(first);
    // And with nothing recorded, the pick for a date is still steady.
    expect(selectSmartPrompt({ signals: QUIET, history: [], today, context: CONTEXT }).prompt).toBe(first);
    expect(daySeed(today)).toBe(daySeed(today));
    expect(daySeed(today)).not.toBe(daySeed('2026-11-17'));
  });

  test('the history keeps what matters and drops the rest', () => {
    const history = run(90, () => QUIET);
    expect(history.length).toBeLessThanOrEqual(NO_REPEAT_DAYS + 1);
    const today = shiftDateString('2026-01-01', 89);
    expect(recentIds(history, today).size).toBe(NO_REPEAT_DAYS);
    // Recording the same prompt twice in a day adds nothing.
    expect(recordShown(history, history[history.length - 1].id, today)).toHaveLength(history.length);
  });

  test('a damaged history is treated as empty', () => {
    for (const bad of [null, undefined, '', 'nope', '{}', '[1,2]', '[{"id":3,"date":"x"}]']) {
      expect(parsePromptHistory(bad)).toEqual([]);
    }
    expect(parsePromptHistory('[{"id":"process-1","date":"2026-11-16"}]')).toEqual([{ id: 'process-1', date: '2026-11-16' }]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. "Different prompt"
// ─────────────────────────────────────────────────────────────────────────────
describe('"Different prompt"', () => {
  const today = '2026-11-16';

  test('stays in the same category and never returns the prompt on screen', () => {
    for (const current of ALL_PROMPTS) {
      for (const r of [0, 0.37, 0.99]) {
        const next = differentPrompt({ current, history: [], today, rand: () => r });
        expect(next.category).toBe(current.category);
        expect(next).not.toBe(current);
        // A gentle prompt is swapped for a gentle one, a Care pillar prompt for a Care pillar one.
        expect(!!next.gentle).toBe(!!current.gentle);
      }
    }
  });

  test('prefers a prompt not shown in the last 30 days', () => {
    const current = getPrompt('unstuck-1')!;
    const unstuck = ALL_PROMPTS.filter((p) => p.category === 'unstuck');
    // Everything in the category was shown this month except unstuck-7.
    const history = unstuck.filter((p) => p.id !== 'unstuck-7').map((p) => ({ id: p.id!, date: '2026-11-10' }));
    for (const r of [0, 0.5, 0.99]) {
      expect(differentPrompt({ current, history, today, rand: () => r }).id).toBe('unstuck-7');
    }
  });

  test('when the whole category was shown this month, it still gives another one', () => {
    const current = getPrompt('unstuck-1')!;
    const history = ALL_PROMPTS.filter((p) => p.category === 'unstuck').map((p) => ({ id: p.id!, date: '2026-11-10' }));
    const next = differentPrompt({ current, history, today, rand: () => 0 });
    expect(next.category).toBe('unstuck');
    expect(next).not.toBe(current);
  });

  test('a prompt that is not in the library (an old saved entry) is handled', () => {
    const current: Prompt = { text: 'Something saved long ago', category: 'balance' };
    expect(differentPrompt({ current, history: [], today, rand: () => 0 }).category).toBe('balance');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Formats
// ─────────────────────────────────────────────────────────────────────────────
describe('formats', () => {
  test('what the writing box starts with', () => {
    const of = (format: string) => ALL_PROMPTS.find((p) => p.format === format)!;
    expect(templateFor(of('fill'))).toBe(of('fill').text);       // the sentence, blanks and all
    expect(templateFor(of('zoom'))).toContain('This month:');
    expect(templateFor(of('zoom'))).toContain('The next hour:');
    expect(templateFor(of('letter'))).toMatch(/^Dear future me,/);
    expect(templateFor(of('open'))).toBe('');
    expect(templateFor(of('scale'))).toBe('');
    expect(templateFor(of('two-minute'))).toBe('');
    expect(formatOf({ text: 'x', category: 'balance' })).toBe('open');
  });

  test('a rating is the first line of the entry, and comes back out', () => {
    expect(withRating('Because I slept well.', 4)).toBe('Rating: 4/5\nBecause I slept well.');
    expect(splitRating('Rating: 4/5\nBecause I slept well.')).toEqual({ rating: 4, body: 'Because I slept well.' });
    expect(withRating('No number picked.', null)).toBe('No number picked.');
    expect(splitRating('No number picked.')).toEqual({ rating: null, body: 'No number picked.' });
    // Changing the rating replaces it; clearing it removes the line.
    expect(withRating('Rating: 2/5\nOk.', 5)).toBe('Rating: 5/5\nOk.');
    expect(withRating('Rating: 2/5\nOk.', null)).toBe('Ok.');
    // Out of range is ignored.
    expect(withRating('Ok.', 9)).toBe('Ok.');
    expect(splitRating('Rating: 9/5\nOk.').rating).toBeNull();
  });

  test('the countdown reads as minutes and seconds', () => {
    expect(TWO_MINUTES_MS).toBe(120_000);
    expect(formatCountdown(120_000)).toBe('2:00');
    expect(formatCountdown(119_001)).toBe('2:00');
    expect(formatCountdown(61_000)).toBe('1:01');
    expect(formatCountdown(9_000)).toBe('0:09');
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(-500)).toBe('0:00');
  });
});

describe('the two-minute timer', () => {
  let tree: ReactTestRenderer;
  const text = () => JSON.stringify(tree.toJSON());
  const button = () => tree.root.findAll((n) => n.props.testID === 'two-minute-button' && typeof n.props.onPress === 'function')[0];

  beforeEach(() => {
    jest.useFakeTimers();
    act(() => {
      tree = create(<TwoMinuteTimer />);
    });
  });
  afterEach(() => {
    act(() => tree.unmount());
    jest.useRealTimers();
  });

  test('waits at 2:00 until Start is pressed', () => {
    expect(text()).toContain('2:00');
    expect(text()).toContain('Start');
    act(() => {
      jest.advanceTimersByTime(30_000);
    });
    expect(text()).toContain('2:00');
  });

  test('counts down, and says so when the time is up', () => {
    act(() => button().props.onPress());
    act(() => {
      jest.advanceTimersByTime(30_000);
    });
    expect(text()).toContain('1:30');
    expect(text()).toContain('Stop');
    act(() => {
      jest.advanceTimersByTime(89_000);
    });
    expect(text()).toContain('0:01');
    act(() => {
      jest.advanceTimersByTime(1_500);
    });
    expect(text()).toContain('0:00');
    expect(text()).toContain('Time. Finish your sentence.');
    expect(text()).toContain('Again');
  });

  test('Stop puts it back to 2:00, and it can be started again', () => {
    act(() => button().props.onPress());
    act(() => {
      jest.advanceTimersByTime(45_000);
    });
    act(() => button().props.onPress()); // Stop
    expect(text()).toContain('2:00');
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(text()).toContain('2:00'); // not running
    act(() => button().props.onPress()); // Start again
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(text()).toContain('1:50');
  });
});
