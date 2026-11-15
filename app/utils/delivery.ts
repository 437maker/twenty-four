// delivery.ts — Twice-weekly treat delivery scheduling and content picking.
// Privacy: all analysis is on-device. No network calls, no AI API.

import { WeekSignals } from './insights';
import { QUOTES } from '../data/insights/quotes';
import { BOOKS } from '../data/insights/books';
import { MOVIES } from '../data/insights/movies';
import { ACTIVITIES } from '../data/insights/activities';
import type { DeliveryCardType } from '../types';

// ─────────────────────────────────────────────────────────────
// RNG (mulberry32 — seedable, fast, good distribution)
// ─────────────────────────────────────────────────────────────

export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────
// ISO week helpers
// ─────────────────────────────────────────────────────────────

export function isoWeekNumber(d: Date): number {
  const date = new Date(d);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + 4 - (date.getDay() || 7));
  const yearStart = new Date(date.getFullYear(), 0, 1);
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function isoWeekString(d: Date): string {
  const year = d.getFullYear();
  const week = isoWeekNumber(d);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

// Monday of the ISO week that contains d
export function isoWeekStart(d: Date): Date {
  const date  = new Date(d);
  const day   = date.getDay(); // 0=Sun, 1=Mon, …
  const diff  = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function dateToString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─────────────────────────────────────────────────────────────
// Delivery day schedule
// ─────────────────────────────────────────────────────────────

// Returns two delivery date strings for the given ISO week,
// guaranteed non-consecutive (gap ≥ 2 days).
export function weekDeliveryDays(weekStr: string, rng?: () => number): [string, string] {
  // Parse week string "YYYY-WXX"
  const [yearStr, weekPart] = weekStr.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekPart, 10);

  // Monday of that week
  const jan4 = new Date(year, 0, 4); // Jan 4 is always in week 1
  const weekStartDate = isoWeekStart(jan4);
  weekStartDate.setDate(weekStartDate.getDate() + (week - 1) * 7);

  const seed = year * 1000 + week;
  const random = rng ?? mulberry32(seed);

  // Shuffle days 0–6 (Mon=0 … Sun=6)
  const days = [0, 1, 2, 3, 4, 5, 6];
  for (let i = days.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [days[i], days[j]] = [days[j], days[i]];
  }

  // Pick first pair with gap ≥ 2
  let d1 = -1, d2 = -1;
  for (let i = 0; i < days.length && d1 === -1; i++) {
    for (let j = i + 1; j < days.length; j++) {
      if (Math.abs(days[i] - days[j]) >= 2) {
        d1 = days[i];
        d2 = days[j];
        break;
      }
    }
  }
  // Fallback: 0 and 2 (Mon + Wed)
  if (d1 === -1) { d1 = 0; d2 = 2; }

  // Convert to date strings
  const date1 = new Date(weekStartDate);
  date1.setDate(weekStartDate.getDate() + d1);
  const date2 = new Date(weekStartDate);
  date2.setDate(weekStartDate.getDate() + d2);

  return [dateToString(date1), dateToString(date2)];
}

// ─────────────────────────────────────────────────────────────
// Content scoring + picking
// ─────────────────────────────────────────────────────────────

export interface PickedContent {
  cardType: DeliveryCardType;
  contentId: string;
  whyLine: string;
}

// Score a content item given the week's signals and tag weights.
function scoreItem(itemTags: string[], itemPillars: string[], signals: WeekSignals, tagWeights: Record<string, number>): number {
  let score = 50; // base

  const { pillarBalance, followThrough, journalMood, themes, isStrongWeek } = signals;

  // Mood-down → comfort items get a boost
  if (journalMood.overallMood === 'negative' || journalMood.moodTrend === 'down') {
    if (itemTags.includes('comfort')) score += 20;
    if (itemTags.includes('calm'))    score += 10;
  }

  // Stressed → calm items
  if (journalMood.stressedCount > 2) {
    if (itemTags.includes('calm'))    score += 15;
    if (itemTags.includes('comfort')) score += 10;
  }

  // Tired → rest/sleep items
  if (journalMood.tiredCount > 2) {
    if (itemTags.includes('sleep')) score += 15;
    if (itemTags.includes('care'))  score += 10;
  }

  // Strong week → challenge items
  if (isStrongWeek) {
    if (itemTags.includes('challenge')) score += 20;
    if (itemTags.includes('motivate'))  score += 10;
  }

  // Neglected pillar → matching item
  const neglected = pillarBalance.mostNeglected;
  if (neglected && itemPillars.includes(neglected)) {
    score += 25;
  }

  // Theme match
  const { dominant } = themes;
  if (dominant && itemTags.includes(dominant)) {
    score += 15;
  }

  // User feedback weights
  for (const tag of itemTags) {
    score += (tagWeights[tag] ?? 0);
  }

  return score;
}

// Pick a card, applying rotation and repeat-prevention rules.
export function pickContent(
  signals: WeekSignals,
  recentContentIds: string[],
  recentCardTypes: DeliveryCardType[],
  tagWeights: Record<string, number>,
  rng: () => number = Math.random
): PickedContent | null {
  // Determine which card types are allowed (rotation: no type 3+ in a row)
  const forbiddenType: DeliveryCardType | null = (() => {
    if (recentCardTypes.length < 2) return null;
    const last = recentCardTypes[recentCardTypes.length - 1];
    const secondLast = recentCardTypes[recentCardTypes.length - 2];
    return last === secondLast ? last : null;
  })();

  const recentSet = new Set(recentContentIds);

  // Score all items for each card type
  type ScoredItem = { cardType: DeliveryCardType; id: string; tags: string[]; score: number; whyLine: string };
  const candidates: ScoredItem[] = [];

  // Quotes
  if (forbiddenType !== 'quote') {
    for (const q of QUOTES) {
      if (recentSet.has(q.id)) continue;
      const score = scoreItem(q.tags, [], signals, tagWeights);
      const whyLine = buildWhyLine('quote', q.tags, signals);
      candidates.push({ cardType: 'quote', id: q.id, tags: q.tags, score, whyLine });
    }
  }

  // Books
  if (forbiddenType !== 'book') {
    for (const b of BOOKS) {
      if (recentSet.has(b.id)) continue;
      const score = scoreItem(b.tags, b.pillars, signals, tagWeights);
      const whyLine = buildWhyLine('book', b.tags, signals);
      candidates.push({ cardType: 'book', id: b.id, tags: b.tags, score, whyLine });
    }
  }

  // Movies
  if (forbiddenType !== 'movie') {
    for (const m of MOVIES) {
      if (recentSet.has(m.id)) continue;
      const score = scoreItem(m.tags, m.pillars, signals, tagWeights);
      const whyLine = buildWhyLine('movie', m.tags, signals);
      candidates.push({ cardType: 'movie', id: m.id, tags: m.tags, score, whyLine });
    }
  }

  // Activities
  if (forbiddenType !== 'activity') {
    for (const a of ACTIVITIES) {
      if (recentSet.has(a.id)) continue;
      const score = scoreItem(a.tags, a.pillars, signals, tagWeights);
      const whyLine = buildWhyLine('activity', a.tags, signals);
      candidates.push({ cardType: 'activity', id: a.id, tags: a.tags, score, whyLine });
    }
  }

  if (candidates.length === 0) return null;

  // Pick from top-20% by score (with randomness within that band)
  candidates.sort((a, b) => b.score - a.score);
  const topN = Math.max(1, Math.ceil(candidates.length * 0.2));
  const pool  = candidates.slice(0, topN);
  const chosen = pool[Math.floor(rng() * pool.length)];

  return {
    cardType: chosen.cardType,
    contentId: chosen.id,
    whyLine: chosen.whyLine,
  };
}

// Generate a short "why you got this" line
function buildWhyLine(
  cardType: DeliveryCardType,
  tags: string[],
  signals: WeekSignals
): string {
  const { pillarBalance, journalMood, followThrough, themes, isStrongWeek } = signals;

  if (journalMood.hasCrisisLanguage) return ''; // won't be used (crisis path)

  if (journalMood.overallMood === 'negative' || journalMood.moodTrend === 'down') {
    if (tags.includes('comfort')) return 'You\'ve had a tough week. This one\'s for you.';
    if (tags.includes('calm'))    return 'A little calm for a hectic week.';
  }

  if (isStrongWeek && tags.includes('challenge')) {
    return 'You\'re on a roll this week — here\'s a challenge.';
  }

  const neglected = pillarBalance.mostNeglected;
  if (neglected) {
    const labels: Record<string, string> = {
      work: 'your Work time', personal: 'your Personal time',
      sleep: 'your Sleep', care: 'your Care pillar',
    };
    if (cardType === 'activity' && tags.includes(neglected)) {
      return `Your ${labels[neglected] ?? neglected} could use some attention.`;
    }
  }

  if (themes.dominant && tags.includes(themes.dominant)) {
    const theme = themes.dominant;
    return `You\'ve been thinking about ${theme} this week.`;
  }

  if (followThrough.completionRate >= 0.8) return 'Great follow-through this week!';
  if (journalMood.overallMood === 'positive') return 'You had a positive week. Keep it up.';

  // Fallback
  const fallbacks: Record<DeliveryCardType, string> = {
    quote:    'A thought for your week.',
    book:     'Something worth reading.',
    movie:    'Something worth watching.',
    activity: 'Something worth trying.',
  };
  return fallbacks[cardType];
}

// ─────────────────────────────────────────────────────────────
// Content lookup by id
// ─────────────────────────────────────────────────────────────

export type AnyContentItem =
  | { type: 'quote';    item: (typeof QUOTES)[number] }
  | { type: 'book';     item: (typeof BOOKS)[number] }
  | { type: 'movie';    item: (typeof MOVIES)[number] }
  | { type: 'activity'; item: (typeof ACTIVITIES)[number] };

export function getContentById(id: string): AnyContentItem | null {
  const quote = QUOTES.find((q) => q.id === id);
  if (quote) return { type: 'quote', item: quote };

  const book = BOOKS.find((b) => b.id === id);
  if (book) return { type: 'book', item: book };

  const movie = MOVIES.find((m) => m.id === id);
  if (movie) return { type: 'movie', item: movie };

  const activity = ACTIVITIES.find((a) => a.id === id);
  if (activity) return { type: 'activity', item: activity };

  return null;
}

// ─────────────────────────────────────────────────────────────
// History helpers
// ─────────────────────────────────────────────────────────────

// Keep at most N items in a JSON-encoded string array
export function pushToHistory(historyJson: string, newItem: string, maxItems: number): string {
  let arr: string[];
  try { arr = JSON.parse(historyJson); } catch { arr = []; }
  arr.push(newItem);
  if (arr.length > maxItems) arr = arr.slice(arr.length - maxItems);
  return JSON.stringify(arr);
}

export function parseHistory(historyJson: string): string[] {
  try { return JSON.parse(historyJson); } catch { return []; }
}
