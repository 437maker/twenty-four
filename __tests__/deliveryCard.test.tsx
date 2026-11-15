// deliveryCard.test.tsx — the treat delivery as the user sees it.
//
//   • Every content id the picker can return renders a card with a real
//     title, pitch and "why you got this" line (the iPhone bug: a forced
//     delivery never showed its recommendation).
//   • Opening a delivery keeps the card on Home until it is dismissed.
//   • The data threshold (7 days, 10 completed tasks, 3 journal entries), the
//     progress hint, and the tester "Force delivery" that bypasses it.
//   • The opening animation, and Reduce Motion skipping it.
//
// Database tests run the real schema and queries on in-memory SQLite.

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
import * as Haptics from 'expo-haptics';

import { resetRealDb, rawDb } from '../test-utils/realSqlite';
import { initializeDatabase } from '../app/db/database';
import { getAllDeliveries, getDeliveryStats, getSettings, saveSettings } from '../app/db/queries';
import { useAppStore } from '../app/store/useAppStore';
import DeliveryCard, {
  BONE_COUNT, CONFETTI_COUNT, DELIVERY_OPEN_MS, DeliveryUnlockHint,
} from '../app/components/DeliveryCard';
import {
  DELIVERY_THRESHOLD, FALLBACK_CONTENT_ID, allContentIds, deliveryProgress, getContentById,
  mulberry32, pickContent, resolveDeliveryCard,
} from '../app/utils/delivery';
import { computeWeekSignals } from '../app/utils/insights';
import { QUOTES } from '../app/data/insights/quotes';
import { BOOKS } from '../app/data/insights/books';
import { MOVIES } from '../app/data/insights/movies';
import { ACTIVITIES } from '../app/data/insights/activities';
import type { DeliveryRow } from '../app/types';

const TODAY = '2026-11-15'; // a Sunday: both of the week's delivery days have arrived

function row(over: Partial<DeliveryRow> = {}): DeliveryRow {
  return {
    id: 1, delivered_on: TODAY, card_type: 'quote', content_id: 'q01', why_line: 'A thought for your week.',
    opened: false, feedback: null, saved: false, bones_given: false, created_at: `${TODAY} 09:00:00`,
    ...over,
  };
}

const flat = (c: any): string =>
  Array.isArray(c) ? c.map(flat).join('') : c == null || typeof c === 'object' ? '' : String(c);

function textOf(tree: ReactTestRenderer, testID: string): string {
  const hits = tree.root.findAll((n) => (n.type as unknown) === 'Text' && n.props.testID === testID);
  return hits.length > 0 ? flat(hits[0].props.children).trim() : '';
}
const count = (tree: ReactTestRenderer, testID: string) =>
  tree.root.findAll((n) => (n.type as unknown) === 'View' && n.props.testID === testID).length;
const press = (tree: ReactTestRenderer, testID: string) =>
  tree.root.findAll((n) => n.props.testID === testID && typeof n.props.onPress === 'function')[0].props.onPress();

const noop = () => {};

// ─── Every delivery resolves to a real recommendation ─────────────────────────
describe('resolveDeliveryCard', () => {
  test('the library is the size the picker expects', () => {
    expect(allContentIds().length).toBe(QUOTES.length + BOOKS.length + MOVIES.length + ACTIVITIES.length);
    expect(new Set(allContentIds()).size).toBe(allContentIds().length);
  });

  test('every content id gives a title, meta, pitch, why line and type label', () => {
    for (const id of allContentIds()) {
      const v = resolveDeliveryCard(id, '');
      for (const field of [v.title, v.meta, v.pitch, v.why, v.typeLabel]) {
        expect(typeof field).toBe('string');
        expect(field.trim().length).toBeGreaterThan(0);
        expect(field).not.toMatch(/undefined|null|NaN/);
      }
      expect(v.type).toBe(getContentById(id)!.type);
    }
  });

  test('the type comes from the content id, not from a wrong stored card_type', () => {
    expect(resolveDeliveryCard(BOOKS[0].id, 'x').type).toBe('book');
    expect(resolveDeliveryCard(BOOKS[0].id, 'x').title).toBe(BOOKS[0].title);
    expect(resolveDeliveryCard(MOVIES[0].id, 'x').title).toBe(MOVIES[0].title);
    expect(resolveDeliveryCard(ACTIVITIES[0].id, 'x').title).toBe(ACTIVITIES[0].title);
    expect(resolveDeliveryCard(QUOTES[0].id, 'x').title).toContain(QUOTES[0].text);
  });

  test('an id that is no longer in the library falls back to a real quote', () => {
    const v = resolveDeliveryCard('gone_42', null);
    expect(FALLBACK_CONTENT_ID).toBe(QUOTES[0].id);
    expect(v.title).toContain(QUOTES[0].text);
    expect(v.why.length).toBeGreaterThan(0);
  });

  test('a missing why line gets a default; a stored one is kept', () => {
    expect(resolveDeliveryCard('b01', '   ').why).toBe('Something worth reading.');
    expect(resolveDeliveryCard('b01', 'Because of your week.').why).toBe('Because of your week.');
  });

  test('whatever the picker returns, under many signals and seeds, resolves to itself', () => {
    const base = computeWeekSignals([], [], {
      work_target_hours: 8, personal_target_hours: 6, sleep_target_hours: 8,
      care_enabled: true, care_target_hours: 2, current_streak: 3, longest_streak: 9,
    });
    const variants = [
      base,
      { ...base, isStrongWeek: true },
      { ...base, journalMood: { ...base.journalMood, overallMood: 'negative' as const, moodTrend: 'down' as const } },
      { ...base, themes: { present: ['school' as const], dominant: 'school' as const } },
    ];
    const ids = new Set(allContentIds());
    for (const signals of variants) {
      for (let seed = 0; seed < 60; seed++) {
        const picked = pickContent(signals, [], [], {}, mulberry32(seed))!;
        expect(ids.has(picked.contentId)).toBe(true);
        expect(picked.whyLine.trim().length).toBeGreaterThan(0);
        expect(resolveDeliveryCard(picked.contentId, picked.whyLine).type).toBe(picked.cardType);
      }
    }
  });
});

describe('<DeliveryCard> content', () => {
  test('every content id the picker can return renders a non-empty card', () => {
    for (const id of allContentIds()) {
      const kind = getContentById(id)!.type;
      let tree: ReactTestRenderer;
      act(() => {
        tree = create(
          <DeliveryCard
            delivery={row({ content_id: id, card_type: kind, why_line: '', opened: true })}
            reduceMotion
            onOpen={noop} onDismiss={noop} onFeedback={noop} onSave={noop}
          />,
        );
      });
      for (const testID of ['delivery-type', 'delivery-why', 'delivery-title', 'delivery-meta', 'delivery-pitch']) {
        const shown = textOf(tree!, testID);
        expect(`${id}:${testID}:${shown.length > 0}`).toBe(`${id}:${testID}:true`);
        expect(shown).not.toMatch(/undefined|NaN/);
      }
      act(() => tree!.unmount());
    }
  });

  test('a row whose content id is unknown still shows a real card', () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(
        <DeliveryCard delivery={row({ content_id: 'not-a-real-id', opened: true })} reduceMotion
          onOpen={noop} onDismiss={noop} onFeedback={noop} onSave={noop} />,
      );
    });
    expect(textOf(tree!, 'delivery-title')).toContain(QUOTES[0].text);
    expect(textOf(tree!, 'delivery-pitch').length).toBeGreaterThan(0);
    act(() => tree!.unmount());
  });

  test('the crisis row shows the support card, not a recommendation', () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(
        <DeliveryCard delivery={row({ content_id: 'crisis', why_line: '' })} reduceMotion
          onOpen={noop} onDismiss={noop} onFeedback={noop} onSave={noop} />,
      );
    });
    expect(count(tree!, 'delivery-crisis')).toBe(1);
    expect(count(tree!, 'delivery-card')).toBe(0);
    act(() => tree!.unmount());
  });
});

// ─── The opening animation ────────────────────────────────────────────────────
describe('<DeliveryCard> opening', () => {
  const impact = Haptics.impactAsync as unknown as jest.Mock;
  let tree: ReactTestRenderer | null = null;

  function show(reduceMotion: boolean) {
    const onOpen = jest.fn();
    act(() => {
      tree = create(
        <DeliveryCard delivery={row({ content_id: 'b01', card_type: 'book', why_line: 'Something worth reading.' })}
          reduceMotion={reduceMotion} onOpen={onOpen} onDismiss={noop} onFeedback={noop} onSave={noop} />,
      );
    });
    return onOpen;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    impact.mockClear();
  });
  afterEach(() => {
    if (tree) {
      act(() => tree!.unmount());
      tree = null;
    }
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('closed: the box waits, nothing has been opened or revealed', () => {
    const onOpen = show(false);
    expect(onOpen).not.toHaveBeenCalled();
    expect(textOf(tree!, 'delivery-type')).toBe('Treat delivery');
    expect(textOf(tree!, 'delivery-title')).toBe('');
    expect(count(tree!, 'delivery-bone')).toBe(0);
  });

  test('tap: opens once, bones and confetti burst, then the card slides up with a haptic', () => {
    const onOpen = show(false);
    act(() => press(tree!, 'delivery-open'));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(count(tree!, 'delivery-bone')).toBe(BONE_COUNT);
    expect(count(tree!, 'delivery-confetti')).toBe(CONFETTI_COUNT);
    expect(textOf(tree!, 'delivery-title')).toBe(''); // still opening

    // A second tap during the animation does nothing.
    act(() => press(tree!, 'delivery-open'));
    expect(onOpen).toHaveBeenCalledTimes(1);

    act(() => { jest.advanceTimersByTime(DELIVERY_OPEN_MS * 0.5); });
    expect(impact).toHaveBeenCalledWith('light'); // the lid flap

    act(() => { jest.advanceTimersByTime(DELIVERY_OPEN_MS); });
    expect(impact).toHaveBeenCalledWith('medium'); // the card arriving
    expect(textOf(tree!, 'delivery-title')).toBe('Deep Work');
    expect(textOf(tree!, 'delivery-meta')).toBe('by Cal Newport');
    expect(textOf(tree!, 'delivery-pitch').length).toBeGreaterThan(0);
    expect(textOf(tree!, 'delivery-why')).toBe('Something worth reading.');
    expect(textOf(tree!, 'delivery-type')).toBe('📚 Book');
    expect(count(tree!, 'delivery-bone')).toBe(0);
  });

  test('Reduce Motion: the card shows directly, with no burst', () => {
    const onOpen = show(true);
    act(() => press(tree!, 'delivery-open'));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(textOf(tree!, 'delivery-title')).toBe('Deep Work');
    expect(count(tree!, 'delivery-bone')).toBe(0);
    expect(count(tree!, 'delivery-confetti')).toBe(0);
    expect(impact).toHaveBeenCalledTimes(1);
  });
});

// ─── The data threshold ───────────────────────────────────────────────────────
describe('deliveryProgress', () => {
  const enough = { firstUseDate: '2026-11-08', today: TODAY, completedTasks: 10, journalEntries: 3 };

  test('the threshold is 7 days, 10 tasks, 3 journal entries', () => {
    expect(DELIVERY_THRESHOLD).toEqual({ days: 7, tasks: 10, journals: 3 });
  });
  test('all three met: unlocked', () => {
    expect(deliveryProgress(enough)).toEqual({ days: 7, tasks: 10, journals: 3, unlocked: true });
  });
  test('any one short: locked', () => {
    expect(deliveryProgress({ ...enough, firstUseDate: '2026-11-09' }).unlocked).toBe(false);
    expect(deliveryProgress({ ...enough, completedTasks: 9 }).unlocked).toBe(false);
    expect(deliveryProgress({ ...enough, journalEntries: 2 }).unlocked).toBe(false);
  });
  test('values are capped at the threshold and never negative', () => {
    expect(deliveryProgress({ firstUseDate: '2025-01-01', today: TODAY, completedTasks: 500, journalEntries: 90 }))
      .toEqual({ days: 7, tasks: 10, journals: 3, unlocked: true });
    expect(deliveryProgress({ firstUseDate: '2027-01-01', today: TODAY, completedTasks: -4, journalEntries: -1 }))
      .toEqual({ days: 0, tasks: 0, journals: 0, unlocked: false });
  });
  test('first day ever (no start date): zero days', () => {
    expect(deliveryProgress({ ...enough, firstUseDate: null }).days).toBe(0);
  });
  test('days are counted across a month boundary', () => {
    expect(deliveryProgress({ ...enough, firstUseDate: '2026-10-29', today: '2026-11-02' }).days).toBe(4);
  });
});

describe('<DeliveryUnlockHint>', () => {
  test('shows days / tasks / journals progress', () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(<DeliveryUnlockHint progress={{ days: 3, tasks: 10, journals: 1, unlocked: false }} />);
    });
    expect(count(tree!, 'delivery-hint')).toBe(1);
    expect(textOf(tree!, 'delivery-hint-days')).toBe('Days 3/7');
    expect(textOf(tree!, 'delivery-hint-tasks')).toBe('✓ Tasks 10/10');
    expect(textOf(tree!, 'delivery-hint-journals')).toBe('Journals 1/3');
    const all = tree!.root.findAll((n) => (n.type as unknown) === 'Text').map((n) => flat(n.props.children)).join(' | ');
    expect(all).toContain('First treat delivery unlocks soon');
    act(() => tree!.unmount());
  });

  test('renders nothing once unlocked', () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(<DeliveryUnlockHint progress={{ days: 7, tasks: 10, journals: 3, unlocked: true }} />);
    });
    expect(tree!.toJSON()).toBeNull();
    act(() => tree!.unmount());
  });
});

// ─── The store, on a real database ────────────────────────────────────────────
describe('deliveries in the store', () => {
  const deliveries = () => Number(rawDb().prepare('SELECT COUNT(*) AS n FROM deliveries').get().n);
  const addTasks = (n: number, completed = 1) => {
    for (let i = 0; i < n; i++) {
      rawDb().prepare(
        `INSERT INTO tasks (date, name, start_time, duration_hours, pillar, completed) VALUES (?, ?, '09:00', 1, 'work', ?)`,
      ).run('2026-11-12', `Task ${i}`, completed);
    }
  };
  const addJournals = (n: number, text = 'A good productive day at work.') => {
    for (let i = 0; i < n; i++) {
      rawDb().prepare(`INSERT INTO journal_entries (date, reflection_text) VALUES (?, ?)`)
        .run(`2026-11-${String(10 + i).padStart(2, '0')}`, text);
    }
  };

  beforeEach(async () => {
    // Only the clock is faked: the store reads "today" from Date.
    jest.useFakeTimers({
      doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask'],
    });
    jest.setSystemTime(new Date(`${TODAY}T12:00:00`));
    resetRealDb();
    await initializeDatabase();
    useAppStore.setState({ pendingDeliveries: [], deliveryProgress: null });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('getDeliveryStats counts completed tasks and written journal entries only', async () => {
    addTasks(4, 1);
    addTasks(3, 0);
    addJournals(2);
    rawDb().prepare(`INSERT INTO journal_entries (date, reflection_text, is_exception_day) VALUES ('2026-11-01', '  ', 1)`).run();
    expect(await getDeliveryStats()).toEqual({ completedTasks: 4, journalEntries: 2 });
  });

  test('below the threshold: nothing is delivered and Home gets the progress', async () => {
    await saveSettings({ app_start_date: '2026-11-12' });
    addTasks(4);
    addJournals(1);
    await useAppStore.getState().checkDeliveriesOnOpen();
    expect(deliveries()).toBe(0);
    expect(useAppStore.getState().pendingDeliveries).toEqual([]);
    expect(useAppStore.getState().deliveryProgress).toEqual({ days: 3, tasks: 4, journals: 1, unlocked: false });
  });

  test.each([
    ['only 6 days', '2026-11-09', 10, 3],
    ['only 9 tasks', '2026-11-01', 9, 3],
    ['only 2 journals', '2026-11-01', 10, 2],
  ])('one requirement short (%s): still nothing', async (_name, start, tasks, journals) => {
    await saveSettings({ app_start_date: start });
    addTasks(tasks);
    addJournals(journals);
    await useAppStore.getState().checkDeliveriesOnOpen();
    expect(deliveries()).toBe(0);
    expect(useAppStore.getState().deliveryProgress!.unlocked).toBe(false);
  });

  test('threshold met: the deliveries that are due arrive (2, never more), each a real recommendation', async () => {
    await saveSettings({ app_start_date: '2026-11-08' });
    addTasks(10);
    addJournals(3);
    await useAppStore.getState().checkDeliveriesOnOpen();
    expect(useAppStore.getState().deliveryProgress!.unlocked).toBe(true);
    expect(deliveries()).toBe(2);
    const pending = useAppStore.getState().pendingDeliveries;
    expect(pending).toHaveLength(2);
    expect(pending[0].content_id).not.toBe(pending[1].content_id);
    for (const d of pending) {
      expect(getContentById(d.content_id)).not.toBeNull();
      expect(d.why_line.trim().length).toBeGreaterThan(0);
      expect(resolveDeliveryCard(d.content_id, d.why_line).type).toBe(d.card_type);
    }
    // Opening the app again the same day adds nothing.
    await useAppStore.getState().checkDeliveriesOnOpen();
    expect(deliveries()).toBe(2);
  });

  test('tester "Force delivery" bypasses the threshold and gives a real recommendation', async () => {
    await useAppStore.getState().checkDeliveriesOnOpen();
    expect(deliveries()).toBe(0);
    expect(useAppStore.getState().deliveryProgress).toEqual({ days: 0, tasks: 0, journals: 0, unlocked: false });

    await useAppStore.getState().forceDelivery();
    expect(deliveries()).toBe(1);
    const [d] = useAppStore.getState().pendingDeliveries;
    expect(d.delivered_on).toBe(TODAY);
    expect(getContentById(d.content_id)).not.toBeNull();
    expect(d.why_line.trim().length).toBeGreaterThan(0);
    const v = resolveDeliveryCard(d.content_id, d.why_line);
    expect(v.title.length).toBeGreaterThan(0);
    expect(v.pitch.length).toBeGreaterThan(0);

    // A second press works too, even though today already has one.
    await useAppStore.getState().forceDelivery();
    expect(deliveries()).toBe(2);
    expect(useAppStore.getState().pendingDeliveries).toHaveLength(2);
    // The threshold still holds for the schedule.
    await useAppStore.getState().checkDeliveriesOnOpen();
    expect(deliveries()).toBe(2);
  });

  test('forcing still works after the whole library has been delivered', async () => {
    await saveSettings({ delivery_content_history: JSON.stringify(allContentIds()) });
    await useAppStore.getState().forceDelivery();
    expect(deliveries()).toBe(1);
    expect(getContentById(useAppStore.getState().pendingDeliveries[0].content_id)).not.toBeNull();
  });

  test('opening pays +3 bones once and the card STAYS on Home until dismissed', async () => {
    await useAppStore.getState().forceDelivery();
    const id = useAppStore.getState().pendingDeliveries[0].id;
    const before = (await getSettings())!.treat_count;

    await useAppStore.getState().openDeliveryAndGiveBones(id);
    let shown = useAppStore.getState().pendingDeliveries;
    expect(shown).toHaveLength(1);
    expect(shown[0]).toMatchObject({ id, opened: true, bones_given: true });
    expect((await getSettings())!.treat_count).toBe(before + 3);

    // Coming back to Home (which re-checks deliveries) keeps the open card.
    await useAppStore.getState().checkDeliveriesOnOpen();
    expect(useAppStore.getState().pendingDeliveries.map((d) => d.id)).toEqual([id]);

    // Opening again pays nothing more.
    await useAppStore.getState().openDeliveryAndGiveBones(id);
    expect((await getSettings())!.treat_count).toBe(before + 3);

    // Thumbs up and Save reach the row and the tag weights.
    await useAppStore.getState().giveDeliveryFeedback(id, 'up');
    await useAppStore.getState().toggleDeliverySaved(id, true);
    const stored = (await getAllDeliveries())[0];
    expect(stored).toMatchObject({ opened: true, feedback: 'up', saved: true });
    const weights = JSON.parse((await getSettings())!.delivery_tag_weights);
    expect(Object.values(weights).every((w) => w === 5)).toBe(true);
    expect(Object.keys(weights).length).toBeGreaterThan(0);

    await useAppStore.getState().dismissDelivery(id);
    shown = useAppStore.getState().pendingDeliveries;
    expect(shown).toEqual([]);
    expect(await getAllDeliveries()).toHaveLength(1); // still in the history
  });

  test('crisis language in the journal: a forced delivery is the support card', async () => {
    rawDb().prepare(`INSERT INTO journal_entries (date, reflection_text) VALUES (?, ?)`)
      .run('2026-11-14', 'I feel like I want to die.');
    await useAppStore.getState().forceDelivery();
    expect(useAppStore.getState().pendingDeliveries[0].content_id).toBe('crisis');
  });
});
