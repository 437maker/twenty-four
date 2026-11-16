// timeInput.ts — the math behind setting a time quickly.
//
// Pure functions, no React: reading a typed time ("9", "930", "9:30p",
// "21:30"), the quick chips (Now, +15m, +30m, +1h), the duration chips, and
// remembering the duration last used for each pillar. The Schedule form and
// the tests both call these.
//
// Times are "HH:MM" strings on a 24-hour clock, the same as tasks.start_time.

import type { Pillar } from '../types';

export interface Clock { h: number; m: number } // h 0..23, m 0..59

const pad = (n: number) => n.toString().padStart(2, '0');
const DAY_MIN = 24 * 60;

export const formatClock = (c: Clock): string => `${pad(c.h)}:${pad(c.m)}`;

export function toClock(time: string): Clock {
  const [h, m] = time.split(':').map(Number);
  return { h: Number.isFinite(h) ? h : 0, m: Number.isFinite(m) ? m : 0 };
}

// "21:30" → "9:30 PM"
export function formatTime12(time: string): string {
  const { h, m } = toClock(time);
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`;
}

// ─── Typed times ──────────────────────────────────────────────────────────────
// What is understood:
//   9        9:00          930      9:30         0930     9:30
//   9:30     9:30          9.30     9:30         1330     13:30
//   9p 9pm   21:00         930p     21:30        9:30 PM  21:30
//   21:30    21:30         12a      00:00        12p      12:00
// A time from 1 to 12 with no "a" or "p" is ambiguous. `pmHint` settles it:
// the form passes whether its AM/PM wheel is on PM, so typing "9" while the
// wheel says PM gives 9 PM.
// Returns null for anything else ("25", "9:75", "13p", "abc", "").
export function parseTypedTime(raw: string, pmHint = false): Clock | null {
  const text = raw.trim().toLowerCase().replace(/\s+/g, '').replace(/\./g, ':');
  const match = /^(\d{1,2})(?::?(\d{2}))?(a|am|p|pm)?$/.exec(text);
  if (!match) return null;
  const hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const suffix = match[3]?.[0]; // 'a', 'p', or undefined
  if (minute > 59) return null;

  if (suffix) {
    if (hour < 1 || hour > 12) return null;
    return { h: (hour % 12) + (suffix === 'p' ? 12 : 0), m: minute };
  }
  if (hour > 23) return null;
  // 0 and 13 to 23 can only be a 24-hour time.
  if (hour === 0 || hour > 12) return { h: hour, m: minute };
  return { h: (hour % 12) + (pmHint ? 12 : 0), m: minute };
}

// ─── Clock math ───────────────────────────────────────────────────────────────
// Add minutes to a time. Wraps past midnight in both directions:
// 23:45 + 30 = 00:15.
export function addMinutes(time: string, minutes: number): string {
  const { h, m } = toClock(time);
  const total = (((h * 60 + m + minutes) % DAY_MIN) + DAY_MIN) % DAY_MIN;
  return formatClock({ h: Math.floor(total / 60), m: total % 60 });
}

// The wheels move in quarter hours. Round a time to the nearest one
// (23:53 rounds up to 00:00).
export const MINUTE_STEP = 15;
export function snapTime(time: string, step = MINUTE_STEP): string {
  const { h, m } = toClock(time);
  const total = Math.round((h * 60 + m) / step) * step;
  return addMinutes('00:00', total);
}

export function timeOfDate(d: Date): string {
  return formatClock({ h: d.getHours(), m: d.getMinutes() });
}

// ─── Quick chips for the start time ───────────────────────────────────────────
// "Now" sets the time to the current quarter hour. The others push the time
// shown in the form later, so "Now" then "+30m" is half an hour from now, and
// "+15m" twice is the same as "+30m".
export interface QuickChip { label: string; hint: string; now?: boolean; add?: number }
export const QUICK_CHIPS: readonly QuickChip[] = [
  { label: 'Now', hint: 'Set the start time to now', now: true },
  { label: '+15m', hint: 'Start 15 minutes later', add: 15 },
  { label: '+30m', hint: 'Start 30 minutes later', add: 30 },
  { label: '+1h', hint: 'Start 1 hour later', add: 60 },
];

export function applyQuickChip(time: string, chip: QuickChip, now: Date = new Date()): string {
  if (chip.now) return snapTime(timeOfDate(now));
  return addMinutes(snapTime(time), chip.add ?? 0);
}

// ─── Durations ────────────────────────────────────────────────────────────────
// The duration wheel: 15 minutes to 12 hours in quarter-hour steps (48 rows).
export const DURATION_VALUES: readonly number[] = Array.from({ length: 48 }, (_, i) => (i + 1) * 0.25);

export function durationToIdx(hours: number): number {
  return Math.max(0, Math.min(DURATION_VALUES.length - 1, Math.round(hours / 0.25) - 1));
}
export const snapDuration = (hours: number): number => DURATION_VALUES[durationToIdx(hours)];

//   0.25 → "15 min"   1 → "1 hr"   1.25 → "1 hr 15 min"
export function formatDurationLabel(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

export interface DurationChip { label: string; hint: string; hours: number }
export const DURATION_CHIPS: readonly DurationChip[] = [
  { label: '15m', hint: '15 minutes', hours: 0.25 },
  { label: '30m', hint: '30 minutes', hours: 0.5 },
  { label: '45m', hint: '45 minutes', hours: 0.75 },
  { label: '1h', hint: '1 hour', hours: 1 },
  { label: '1.5h', hint: '1 and a half hours', hours: 1.5 },
  { label: '2h', hint: '2 hours', hours: 2 },
];

// ─── The duration last used for each pillar ───────────────────────────────────
// Stored in settings.last_durations as JSON, e.g. {"work":1.5,"sleep":8}.
export const DEFAULT_DURATION = 1;
export type LastDurations = Partial<Record<Pillar, number>>;

export function parseLastDurations(json: string | null | undefined): LastDurations {
  try {
    const raw = JSON.parse(json || '{}');
    const out: LastDurations = {};
    if (raw && typeof raw === 'object') {
      for (const pillar of ['work', 'personal', 'sleep', 'care'] as Pillar[]) {
        const v = raw[pillar];
        if (typeof v === 'number' && v > 0 && v <= 12) out[pillar] = snapDuration(v);
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function durationForPillar(json: string | null | undefined, pillar: Pillar): number {
  return parseLastDurations(json)[pillar] ?? DEFAULT_DURATION;
}

export function rememberDuration(json: string | null | undefined, pillar: Pillar, hours: number): string {
  return JSON.stringify({ ...parseLastDurations(json), [pillar]: snapDuration(hours) });
}
