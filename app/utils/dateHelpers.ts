// dateHelpers.ts — Utility functions for formatting and manipulating dates.
//
// "date-fns" is a library of small date tools. We import only the functions
// we need (this keeps the app bundle size small).

import { format, parseISO, isToday, isTomorrow, isYesterday } from 'date-fns';

// Returns today's date as a "YYYY-MM-DD" string, e.g. "2024-03-15"
// This format is used as the primary key for tasks in the database.
export function getTodayString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

// Returns tomorrow's date as "YYYY-MM-DD"
export function getTomorrowString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return format(d, 'yyyy-MM-dd');
}

// Returns yesterday's date as "YYYY-MM-DD"
export function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return format(d, 'yyyy-MM-dd');
}

// Returns a "YYYY-MM-DD" date string for N days ago (positive) or ahead (negative)
export function shiftDateString(baseDate: string, days: number): string {
  const d = new Date(baseDate + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return format(d, 'yyyy-MM-dd');
}

// Returns day-of-year number (1–365/366) — used to rotate journal prompts
export function getDayOfYear(): number {
  const now  = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff  = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// Converts a "YYYY-MM-DD" string into a human-readable label.
// e.g. "2024-03-15" → "Today" or "Friday, March 15"
export function formatDisplayDate(dateString: string): string {
  const date = parseISO(dateString);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMMM d'); // e.g. "Friday, March 15"
}

// Converts "09:00" → "9:00 AM", "14:30" → "2:30 PM"
export function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Phase A: classify any date relative to now using local calendar days.
// Returns 'past' | 'today' | 'future'.
export function dayStatus(date: string, now?: Date): 'past' | 'today' | 'future' {
  const ref = now ?? new Date();
  const today = format(ref, 'yyyy-MM-dd');
  if (date < today) return 'past';
  if (date === today) return 'today';
  return 'future';
}

// Converts a JavaScript Date object's time into "HH:MM" string format.
// e.g. a Date set to 9:05am → "09:05"
export function dateToTimeString(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

// Converts "HH:MM" back into a Date object (today's date at that time).
// Used for pre-filling the time picker.
export function timeStringToDate(timeString: string): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}
