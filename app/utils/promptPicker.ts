// promptPicker.ts — picks the journal prompt of the day from how the week went.
//
// Pure functions, no React and no database: the Journal screen gathers the
// week's tasks and entries, and this file decides.
//
// The rules, first match wins:
//   1. The journal sounds stressed or tired  → controllables, or a gentle care prompt
//   2. Fewer than half the tasks were done   → process, controllables, or oneRep
//                                              (small wins, no guilt)
//   3. The same pillar was the most neglected
//      two weeks in a row                    → unstuck
//   4. A strong week                         → stretch or pastself
//   5. Otherwise                             → rotate through everything
//
// And always: a prompt that was shown in the last 30 days is not shown again.

import {
  ALL_PROMPTS, GENTLE_CARE_PROMPTS, getPrompt,
} from '../data/journalPrompts';
import type { Prompt, PromptCategory } from '../data/journalPrompts';
import type { Pillar, Settings, Task } from '../types';
import { shiftDateString } from './dateHelpers';
import { computePillarBalance } from './insights';
import type { WeekSignals } from './insights';

export const NO_REPEAT_DAYS = 30;
export const LOW_COMPLETION = 0.5;
// A week needs at least this many tasks before its completion rate means anything.
export const MIN_TASKS_FOR_RATE = 3;
// Stressed and tired words in the week's entries, added together.
export const STRESS_WORDS_NEEDED = 2;

export type PromptRule = 'stressed' | 'low' | 'neglected' | 'strong' | 'rotate';

export const RULE_CATEGORIES: Record<Exclude<PromptRule, 'rotate'>, readonly PromptCategory[]> = {
  stressed: ['controllables', 'care'],
  low: ['process', 'controllables', 'oneRep'],
  neglected: ['unstuck'],
  strong: ['stretch', 'pastself'],
};

// What the picker needs to know about the week.
export interface PromptSignals {
  completionRate: number;   // 0..1
  taskCount: number;
  isStrongWeek: boolean;
  stressedCount: number;
  tiredCount: number;
  neglectedTwice: Pillar | null; // the pillar that was most neglected this week AND last week
}

export function promptSignals(week: WeekSignals, neglectedTwice: Pillar | null): PromptSignals {
  return {
    completionRate: week.followThrough.completionRate,
    taskCount: week.followThrough.taskCount,
    isStrongWeek: week.isStrongWeek,
    stressedCount: week.journalMood.stressedCount,
    tiredCount: week.journalMood.tiredCount,
    neglectedTwice,
  };
}

// The pillar that fell furthest behind its target in BOTH weeks, if it is
// the same one and it really was behind. A week with no tasks does not count.
type Targets = Pick<Settings, 'work_target_hours' | 'personal_target_hours' | 'sleep_target_hours' | 'care_enabled' | 'care_target_hours'>;
export function neglectedTwoWeeks(thisWeek: Task[], lastWeek: Task[], settings: Targets): Pillar | null {
  if (thisWeek.length === 0 || lastWeek.length === 0) return null;
  const a = computePillarBalance(thisWeek, settings);
  const b = computePillarBalance(lastWeek, settings);
  if (!a.mostNeglected || a.mostNeglected !== b.mostNeglected) return null;
  const pillar = a.mostNeglected;
  return a.gapPerPillar[pillar] < 0 && b.gapPerPillar[pillar] < 0 ? pillar : null;
}

export function ruleForSignals(s: PromptSignals): PromptRule {
  if (s.stressedCount + s.tiredCount >= STRESS_WORDS_NEEDED) return 'stressed';
  if (s.taskCount >= MIN_TASKS_FOR_RATE && s.completionRate < LOW_COMPLETION) return 'low';
  if (s.neglectedTwice) return 'neglected';
  if (s.isStrongWeek && s.taskCount >= MIN_TASKS_FOR_RATE) return 'strong';
  return 'rotate';
}

// What may be shown at all today.
export interface PromptContext {
  streak: number;
  isSunday: boolean;
  careEnabled: boolean;
}

// Prompts about the Care pillar need the pillar; streak prompts need a
// streak of 7; weekly review prompts are for Sundays. Gentle prompts are
// only offered by the stressed rule, not in the general rotation.
function allowed(p: Prompt, ctx: PromptContext): boolean {
  if (p.gentle) return false;
  if (p.category === 'care') return ctx.careEnabled;
  if (p.category === 'streak') return ctx.streak >= 7;
  if (p.category === 'weekly') return ctx.isSunday;
  return true;
}

export function poolForRule(rule: PromptRule, ctx: PromptContext): Prompt[] {
  if (rule === 'rotate') return ALL_PROMPTS.filter((p) => allowed(p, ctx));
  if (rule === 'stressed') {
    // Controllables, plus the gentle self-care prompts (not the Care pillar ones).
    return [...ALL_PROMPTS.filter((p) => p.category === 'controllables'), ...GENTLE_CARE_PROMPTS];
  }
  const categories = RULE_CATEGORIES[rule];
  return ALL_PROMPTS.filter((p) => categories.includes(p.category) && allowed(p, ctx));
}

// ─── History ──────────────────────────────────────────────────────────────────
// settings.prompt_history: a JSON array of { id, date }, oldest first.
export interface Shown { id: string; date: string } // date = "YYYY-MM-DD"

export function parsePromptHistory(json: string | null | undefined): Shown[] {
  try {
    const raw = JSON.parse(json || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter((r) => r && typeof r.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date));
  } catch {
    return [];
  }
}

// Ids shown in the 30 days before `today` (today itself included).
export function recentIds(history: readonly Shown[], today: string): Set<string> {
  const cutoff = shiftDateString(today, -NO_REPEAT_DAYS);
  return new Set(history.filter((h) => h.date > cutoff && h.date <= today).map((h) => h.id));
}

// Add a shown prompt, and drop anything too old to matter.
export function recordShown(history: readonly Shown[], id: string, today: string): Shown[] {
  const cutoff = shiftDateString(today, -NO_REPEAT_DAYS - 1);
  const kept = history.filter((h) => h.date > cutoff && h.date <= today);
  if (kept.some((h) => h.id === id && h.date === today)) return kept;
  return [...kept, { id, date: today }];
}

// A steady number from a date, so the prompt of the day does not change
// when the screen is opened a second time.
export function daySeed(date: string): number {
  let h = 2166136261;
  for (let i = 0; i < date.length; i++) {
    h ^= date.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// The prompt whose id was shown longest ago (never-shown prompts first).
function leastRecent(pool: readonly Prompt[], history: readonly Shown[]): Prompt {
  const lastSeen = new Map<string, string>();
  for (const h of history) lastSeen.set(h.id, h.date);
  return [...pool].sort((a, b) => (lastSeen.get(a.id!) ?? '').localeCompare(lastSeen.get(b.id!) ?? ''))[0];
}

export interface DailyPick { prompt: Prompt; rule: PromptRule }

// The prompt of the day.
//   1. If one was already shown today, it is that one.
//   2. Otherwise one from the rule's categories that has not been shown in
//      30 days.
//   3. If the rule's categories are used up (a long hard stretch), one from
//      everything else that has not been shown in 30 days.
export function selectSmartPrompt(args: {
  signals: PromptSignals;
  history: readonly Shown[];
  today: string;
  context: PromptContext;
}): DailyPick {
  const { signals, history, today, context } = args;
  const rule = ruleForSignals(signals);

  const first = history.find((h) => h.date === today);
  const already = first ? getPrompt(first.id) : undefined;
  if (already) return { prompt: already, rule };

  const recent = recentIds(history, today);
  const seed = daySeed(today);
  const fresh = (pool: readonly Prompt[]) => pool.filter((p) => !recent.has(p.id!));

  let pool = fresh(poolForRule(rule, context));
  if (pool.length === 0) pool = fresh(poolForRule('rotate', context));
  if (pool.length > 0) return { prompt: pool[seed % pool.length], rule };
  // Everything has been shown within 30 days (cannot happen with over 100
  // prompts and one a day, but "Different prompt" could get there).
  return { prompt: leastRecent(poolForRule('rotate', context), history), rule };
}

// "Different prompt": another one from the SAME category, not the one on
// screen, and not one shown in the last 30 days if any other is left.
export function differentPrompt(args: {
  current: Prompt;
  history: readonly Shown[];
  today: string;
  context: PromptContext;
  rand?: () => number;
}): Prompt {
  const { current, history, today, context } = args;
  const rand = args.rand ?? Math.random;
  const same = ALL_PROMPTS.filter((p) =>
    p.category === current.category && p.text !== current.text &&
    // Stay within the kind of care prompt that was on screen.
    (current.category !== 'care' || !!p.gentle === !!current.gentle) &&
    (p.gentle || allowed(p, context) || p.category === current.category));
  if (same.length === 0) return current;
  const recent = recentIds(history, today);
  const unseen = same.filter((p) => !recent.has(p.id!));
  const pool = unseen.length > 0 ? unseen : same;
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
}
