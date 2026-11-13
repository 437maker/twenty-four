// calculations.ts — Business logic: scores, streaks, pillar hours, analytics.
// Sprint 2: added analytics helpers for the Analytics screen.

import { format } from 'date-fns';
import { Task, DayAnalytics } from '../types';

// ─── Plan adherence ───────────────────────────────────────────────────────────
// = (completed hours / total planned hours) × 100
export function calculatePlanAdherence(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  const total = tasks.reduce((s, t) => s + t.duration_hours, 0);
  if (total === 0) return 0;
  const done = tasks.filter((t) => t.completed).reduce((s, t) => s + t.duration_hours, 0);
  return Math.min(100, Math.round((done / total) * 100));
}

// ─── Hours per pillar (completed tasks only) ──────────────────────────────────
export function getHoursPerPillar(tasks: Task[]): {
  work: number; personal: number; sleep: number; care: number;
} {
  const done = tasks.filter((t) => t.completed);
  const sum  = (p: string) =>
    done.filter((t) => t.pillar === p).reduce((s, t) => s + t.duration_hours, 0);
  return {
    work:     sum('work'),
    personal: sum('personal'),
    sleep:    sum('sleep'),
    care:     sum('care'),
  };
}

// ─── Streak helpers ───────────────────────────────────────────────────────────
export function calculateNewStreak(tasks: Task[], currentStreak: number): number {
  if (tasks.some((t) => t.completed)) return currentStreak + 1;
  if (tasks.length > 0) return 0;
  return currentStreak;
}

export function isStreakMilestone(streak: number): boolean {
  return streak === 7 || streak === 30 || streak === 100 || streak === 365;
}

// How many bonus treats to award for hitting a milestone streak
// Sprint 2 values: 7→15, 30→35, 100→70, 365→130
export function milestoneBonus(streak: number): number {
  if (streak === 7)   return 15;
  if (streak === 30)  return 35;
  if (streak === 100) return 70;
  if (streak === 365) return 130;
  return 0;
}

// ─── Monthly / Yearly calendar helpers ───────────────────────────────────────

// Returns every "YYYY-MM-DD" string for a given month (month is 0-indexed).
export function getDatesForMonth(year: number, month: number): string[] {
  const count = new Date(year, month + 1, 0).getDate(); // days in month
  return Array.from({ length: count }, (_, i) => {
    const d = i + 1;
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  });
}

// Returns every "YYYY-MM-DD" string for a given year.
export function getDatesForYear(year: number): string[] {
  const result: string[] = [];
  for (let m = 0; m < 12; m++) result.push(...getDatesForMonth(year, m));
  return result;
}

// Groups the dates of a month into calendar weeks (rows of 7, Sun → Sat).
// Cells before the 1st and after the last day are empty strings.
// Returns an array of 4-6 weeks, each a 7-element array.
export function getCalendarWeeksForMonth(year: number, month: number): string[][] {
  const dates    = getDatesForMonth(year, month);
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const weeks: string[][] = [];
  let week: string[] = Array(firstDow).fill('');

  for (const date of dates) {
    week.push(date);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push('');
    weeks.push(week);
  }
  return weeks;
}

// Splits the dates of a month into loose "Week 1 / 2 / 3 / 4 / 5" buckets
// used for the monthly bar chart (groups of 7 sequential days).
export function getWeekBucketsForMonth(year: number, month: number): string[][] {
  const dates = getDatesForMonth(year, month);
  const buckets: string[][] = [];
  for (let i = 0; i < dates.length; i += 7) {
    buckets.push(dates.slice(i, i + 7));
  }
  return buckets;
}

// Month name — e.g. monthName(0) = "January"
export function monthName(month: number): string {
  return [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ][month] ?? '';
}

// Short month abbreviation — e.g. monthAbbr(0) = "Jan"
export function monthAbbr(month: number): string {
  return monthName(month).slice(0, 3);
}

// ─── Weekly box helpers ───────────────────────────────────────────────────────
// Returns Gold / Silver / Basic based on 7-day adherence percentage
export function weeklyBoxTier(adherence: number): 'gold' | 'silver' | 'basic' {
  if (adherence >= 80) return 'gold';
  if (adherence >= 60) return 'silver';
  return 'basic';
}

export function weeklyBoxReward(tier: 'gold' | 'silver' | 'basic'): number {
  if (tier === 'gold')   return 20;
  if (tier === 'silver') return 12;
  return 5;
}

export function weeklyBoxLabel(tier: 'gold' | 'silver' | 'basic'): string {
  if (tier === 'gold')   return '🥇 Gold Box';
  if (tier === 'silver') return '🥈 Silver Box';
  return '📦 Basic Box';
}

// ─── Analytics helpers ────────────────────────────────────────────────────────

// Build an array of date strings for the last N days (today last).
// Uses LOCAL calendar days: format() reads the local year/month/day, while
// toISOString() would give the UTC day (already "tomorrow" on a Boston evening).
export function getLastNDates(n: number): string[] {
  const dates: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(format(d, 'yyyy-MM-dd'));
  }
  return dates;
}

// Get adherence colour for the bar chart / dot grid
export function adherenceColor(adherence: number, hasData: boolean): string {
  if (!hasData) return '#E0E0E0'; // no data
  if (adherence >= 80) return '#4CAF50'; // green
  if (adherence >= 65) return '#FFC107'; // amber
  return '#EF5350';                       // red
}

// Given a map of date → tasks, return DayAnalytics for each date
export function buildDayAnalytics(
  taskMap: { [date: string]: Task[] },
  exceptionDates: Set<string>
): DayAnalytics[] {
  return Object.entries(taskMap).map(([date, tasks]) => ({
    date,
    adherence:   calculatePlanAdherence(tasks),
    tasks,
    isException: exceptionDates.has(date),
  }));
}

// Average weekly adherence across an array of DayAnalytics
export function weeklyAdherence(days: DayAnalytics[]): number {
  const withData = days.filter((d) => d.tasks.length > 0);
  if (withData.length === 0) return 0;
  return Math.round(
    withData.reduce((s, d) => s + d.adherence, 0) / withData.length
  );
}

// Day name abbreviations used in bar charts
export function dayAbbr(dateStr: string): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[new Date(dateStr + 'T12:00:00').getDay()];
}

// "Most balanced day" — day whose pillar split most closely matched equal thirds
// (or quarters if care is enabled). Returns date string or empty string.
export function mostBalancedDay(
  days: DayAnalytics[],
  targets: { work: number; personal: number; sleep: number; care: number }
): string {
  let bestDate = '';
  let bestScore = Infinity;

  for (const day of days) {
    if (day.tasks.length === 0) continue;
    const hours  = getHoursPerPillar(day.tasks);
    const pillars = Object.keys(targets) as (keyof typeof targets)[];
    const totalTarget = pillars.reduce((s, p) => s + targets[p], 0);
    if (totalTarget === 0) continue;

    // Score = sum of absolute difference between actual fraction vs target fraction
    let score = 0;
    for (const p of pillars) {
      const actualFrac = hours[p] / (Math.max(0.001, pillars.reduce((s, k) => s + hours[k], 0)));
      const targetFrac = targets[p] / totalTarget;
      score += Math.abs(actualFrac - targetFrac);
    }
    if (score < bestScore) { bestScore = score; bestDate = day.date; }
  }
  return bestDate;
}

export function leastBalancedDay(
  days: DayAnalytics[],
  targets: { work: number; personal: number; sleep: number; care: number }
): string {
  let worstDate = '';
  let worstScore = -1;

  for (const day of days) {
    if (day.tasks.length === 0) continue;
    const hours  = getHoursPerPillar(day.tasks);
    const pillars = Object.keys(targets) as (keyof typeof targets)[];
    const totalTarget = pillars.reduce((s, p) => s + targets[p], 0);
    if (totalTarget === 0) continue;

    let score = 0;
    for (const p of pillars) {
      const actualFrac = hours[p] / (Math.max(0.001, pillars.reduce((s, k) => s + hours[k], 0)));
      const targetFrac = targets[p] / totalTarget;
      score += Math.abs(actualFrac - targetFrac);
    }
    if (score > worstScore) { worstScore = score; worstDate = day.date; }
  }
  return worstDate;
}
