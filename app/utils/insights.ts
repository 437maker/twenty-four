// insights.ts — Pure on-device signal analysis over the last 7 days.
// No network calls. No AI API. All text analysis uses local word lists only.
// Called by delivery.ts to inform the content picker.

import { Task, JournalEntry, Settings, Pillar } from '../types';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface PillarBalance {
  hoursPerPillar: Record<Pillar, number>;
  targetPerPillar: Record<Pillar, number>;
  gapPerPillar: Record<Pillar, number>;    // actual - target (negative = behind)
  mostNeglected: Pillar | null;
  strongest: Pillar | null;
}

export interface FollowThrough {
  completionRate: number;   // 0-1
  streakTrend: 'up' | 'flat' | 'down';
  taskCount: number;
}

export interface JournalMood {
  positiveCount: number;
  negativeCount: number;
  stressedCount: number;
  tiredCount: number;
  proudCount: number;
  overallMood: 'positive' | 'negative' | 'neutral';
  moodTrend: 'up' | 'down' | 'flat';
  hasCrisisLanguage: boolean;
}

export type ThemeKey =
  | 'school' | 'work' | 'fitness' | 'family' | 'friends'
  | 'sleep' | 'money' | 'creativity' | 'health' | 'nature';

export interface Themes {
  present: ThemeKey[];
  dominant: ThemeKey | null;
}

export interface WeekSignals {
  pillarBalance: PillarBalance;
  followThrough: FollowThrough;
  journalMood: JournalMood;
  themes: Themes;
  isStrongWeek: boolean;
}

// ─────────────────────────────────────────────────────────────
// Word lists (conservative)
// ─────────────────────────────────────────────────────────────

const POSITIVE_WORDS = new Set([
  'great', 'good', 'amazing', 'awesome', 'fantastic', 'wonderful', 'excellent',
  'happy', 'excited', 'proud', 'grateful', 'thankful', 'love', 'joy', 'joyful',
  'accomplished', 'achieved', 'win', 'won', 'success', 'successful', 'productive',
  'energized', 'motivated', 'inspired', 'confident', 'relaxed', 'peaceful',
  'calm', 'refreshed', 'rested', 'ready', 'focused', 'clear', 'bright',
]);

const NEGATIVE_WORDS = new Set([
  'bad', 'terrible', 'awful', 'horrible', 'worst', 'sad', 'unhappy', 'upset',
  'frustrated', 'angry', 'disappointed', 'failed', 'failure', 'lost', 'struggling',
  'difficult', 'hard', 'tough', 'overwhelming', 'overwhelmed', 'stuck', 'behind',
  'missed', 'skip', 'skipped', 'forgot', 'distracted', 'wasted', 'regret',
]);

const STRESSED_WORDS = new Set([
  'stress', 'stressed', 'stressful', 'anxious', 'anxiety', 'worried', 'worry',
  'nervous', 'pressure', 'deadline', 'overwhelm', 'overwhelmed', 'panic', 'chaos',
  'rush', 'rushed', 'busy', 'hectic', 'crazy', 'frantic', 'tense',
]);

const TIRED_WORDS = new Set([
  'tired', 'exhausted', 'fatigue', 'fatigued', 'sleepy', 'drowsy', 'drained',
  'worn', 'burnout', 'burned out', 'burnt out', 'weary', 'sluggish', 'slow',
  'lethargic', 'low energy', 'no energy', 'can\'t sleep', 'insomnia',
]);

const PROUD_WORDS = new Set([
  'proud', 'accomplished', 'achieved', 'nailed', 'crushed', 'aced', 'dominated',
  'exceeded', 'surpassed', 'milestone', 'breakthrough', 'growth', 'progress',
  'improved', 'better than', 'best ever',
]);

// Crisis language — conservative list. Any match → crisis card.
const CRISIS_WORDS = new Set([
  'want to die', 'want to be dead', 'wish i was dead', 'kill myself',
  'killing myself', 'end my life', 'ending my life', 'no reason to live',
  'not worth living', 'self harm', 'self-harm', 'hurt myself', 'hurting myself',
  'cut myself', 'cutting myself', 'suicide', 'suicidal',
]);

const THEME_WORDS: Record<ThemeKey, string[]> = {
  school:     ['school', 'class', 'study', 'exam', 'test', 'homework', 'assignment', 'grade', 'lecture', 'university', 'college', 'course', 'tutor', 'essay', 'project', 'midterm', 'finals'],
  work:       ['work', 'job', 'office', 'meeting', 'deadline', 'boss', 'colleague', 'client', 'project', 'presentation', 'email', 'report', 'career', 'promotion', 'interview'],
  fitness:    ['gym', 'workout', 'exercise', 'run', 'running', 'walk', 'walking', 'yoga', 'training', 'lift', 'weights', 'swim', 'swimming', 'bike', 'cycling', 'sport', 'physical'],
  family:     ['family', 'mom', 'dad', 'parent', 'sibling', 'brother', 'sister', 'grandma', 'grandpa', 'aunt', 'uncle', 'cousin', 'home', 'dinner', 'holiday'],
  friends:    ['friend', 'friends', 'social', 'party', 'hangout', 'hang out', 'went out', 'catch up', 'buddy', 'pal', 'bestie', 'crew', 'group'],
  sleep:      ['sleep', 'slept', 'nap', 'bed', 'tired', 'rest', 'wake', 'woke', 'insomnia', 'dream', 'dreamed'],
  money:      ['money', 'budget', 'spend', 'spent', 'save', 'savings', 'bill', 'rent', 'debt', 'loan', 'invest', 'financial', 'finance', 'cost', 'expensive', 'affordable'],
  creativity: ['art', 'music', 'write', 'writing', 'draw', 'drawing', 'paint', 'design', 'create', 'creative', 'poetry', 'poem', 'story', 'build', 'make', 'craft', 'hobby'],
  health:     ['health', 'doctor', 'sick', 'ill', 'medicine', 'anxiety', 'mental', 'therapy', 'therapist', 'nutrition', 'diet', 'meal', 'vitamins', 'mindful', 'meditate'],
  nature:     ['nature', 'outside', 'outdoors', 'park', 'hike', 'hiking', 'trail', 'beach', 'mountain', 'forest', 'garden', 'fresh air', 'walk', 'sun', 'sunshine', 'rain'],
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/).filter(Boolean);
}

function countMatches(tokens: string[], wordSet: Set<string>): number {
  return tokens.filter((t) => wordSet.has(t)).length;
}

function containsPhrase(text: string, wordSet: Set<string>): boolean {
  const lower = text.toLowerCase();
  for (const phrase of wordSet) {
    if (lower.includes(phrase)) return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────
// Pillar balance
// ─────────────────────────────────────────────────────────────

export function computePillarBalance(
  tasks: Task[],
  settings: Pick<Settings, 'work_target_hours' | 'personal_target_hours' | 'sleep_target_hours' | 'care_enabled' | 'care_target_hours'>
): PillarBalance {
  const pillars: Pillar[] = settings.care_enabled
    ? ['work', 'personal', 'sleep', 'care']
    : ['work', 'personal', 'sleep'];

  const targetPerPillar: Record<Pillar, number> = {
    work:     settings.work_target_hours     * 7,
    personal: settings.personal_target_hours * 7,
    sleep:    settings.sleep_target_hours    * 7,
    care:     settings.care_enabled ? settings.care_target_hours * 7 : 0,
  };

  const hoursPerPillar: Record<Pillar, number> = { work: 0, personal: 0, sleep: 0, care: 0 };
  for (const task of tasks) {
    if (task.completed) {
      hoursPerPillar[task.pillar] += task.duration_hours;
    }
  }

  const gapPerPillar: Record<Pillar, number> = { work: 0, personal: 0, sleep: 0, care: 0 };
  for (const p of pillars) {
    gapPerPillar[p] = hoursPerPillar[p] - targetPerPillar[p];
  }

  const activePillars = pillars.filter((p) => targetPerPillar[p] > 0);
  const mostNeglected = activePillars.length > 0
    ? activePillars.reduce((a, b) => gapPerPillar[a] < gapPerPillar[b] ? a : b)
    : null;
  const strongest = activePillars.length > 0
    ? activePillars.reduce((a, b) => gapPerPillar[a] > gapPerPillar[b] ? a : b)
    : null;

  return { hoursPerPillar, targetPerPillar, gapPerPillar, mostNeglected, strongest };
}

// ─────────────────────────────────────────────────────────────
// Follow-through
// ─────────────────────────────────────────────────────────────

export function computeFollowThrough(tasks: Task[], currentStreak: number, longestStreak: number): FollowThrough {
  const realTasks = tasks.filter((t) => !t.is_master);
  const total     = realTasks.length;
  const done      = realTasks.filter((t) => t.completed).length;
  const rate      = total > 0 ? done / total : 0;

  const trend: FollowThrough['streakTrend'] =
    currentStreak > longestStreak * 0.8 ? 'up' :
    currentStreak === 0 ? 'down' : 'flat';

  return { completionRate: rate, streakTrend: trend, taskCount: total };
}

// ─────────────────────────────────────────────────────────────
// Journal mood
// ─────────────────────────────────────────────────────────────

export function computeJournalMood(entries: JournalEntry[]): JournalMood {
  if (entries.length === 0) {
    return {
      positiveCount: 0, negativeCount: 0, stressedCount: 0,
      tiredCount: 0, proudCount: 0,
      overallMood: 'neutral', moodTrend: 'flat', hasCrisisLanguage: false,
    };
  }

  let positiveCount = 0, negativeCount = 0, stressedCount = 0, tiredCount = 0, proudCount = 0;
  let hasCrisisLanguage = false;

  // Check crisis language first (phrase-level, not token-level)
  for (const entry of entries) {
    if (containsPhrase(entry.reflection_text, CRISIS_WORDS)) {
      hasCrisisLanguage = true;
    }
    const tokens = tokenize(entry.reflection_text);
    positiveCount += countMatches(tokens, POSITIVE_WORDS);
    negativeCount += countMatches(tokens, NEGATIVE_WORDS);
    stressedCount += countMatches(tokens, STRESSED_WORDS);
    tiredCount    += countMatches(tokens, TIRED_WORDS);
    proudCount    += countMatches(tokens, PROUD_WORDS);
  }

  const positiveSignal = positiveCount + proudCount;
  const negativeSignal = negativeCount + stressedCount + tiredCount;
  const overallMood: JournalMood['overallMood'] =
    positiveSignal > negativeSignal * 1.5 ? 'positive' :
    negativeSignal > positiveSignal * 1.5 ? 'negative' : 'neutral';

  // Trend: compare first half vs second half of entries (entries are ordered recent-first)
  let moodTrend: JournalMood['moodTrend'] = 'flat';
  if (entries.length >= 3) {
    const half = Math.floor(entries.length / 2);
    const recent = entries.slice(0, half);
    const older  = entries.slice(half);
    const recentScore = recent.reduce((sum, e) => {
      const t = tokenize(e.reflection_text);
      return sum + countMatches(t, POSITIVE_WORDS) - countMatches(t, NEGATIVE_WORDS);
    }, 0);
    const olderScore = older.reduce((sum, e) => {
      const t = tokenize(e.reflection_text);
      return sum + countMatches(t, POSITIVE_WORDS) - countMatches(t, NEGATIVE_WORDS);
    }, 0);
    if (recentScore > olderScore + 2) moodTrend = 'up';
    else if (olderScore > recentScore + 2) moodTrend = 'down';
  }

  return { positiveCount, negativeCount, stressedCount, tiredCount, proudCount, overallMood, moodTrend, hasCrisisLanguage };
}

// ─────────────────────────────────────────────────────────────
// Themes
// ─────────────────────────────────────────────────────────────

export function computeThemes(entries: JournalEntry[]): Themes {
  const counts: Record<ThemeKey, number> = {
    school: 0, work: 0, fitness: 0, family: 0, friends: 0,
    sleep: 0, money: 0, creativity: 0, health: 0, nature: 0,
  };

  for (const entry of entries) {
    const lower = entry.reflection_text.toLowerCase();
    for (const [theme, words] of Object.entries(THEME_WORDS) as [ThemeKey, string[]][]) {
      for (const word of words) {
        if (lower.includes(word)) {
          counts[theme]++;
          break; // count each theme once per entry
        }
      }
    }
  }

  const present = (Object.keys(counts) as ThemeKey[]).filter((k) => counts[k] > 0);
  const dominant = present.length > 0
    ? present.reduce((a, b) => counts[a] >= counts[b] ? a : b)
    : null;

  return { present, dominant };
}

// ─────────────────────────────────────────────────────────────
// Composite
// ─────────────────────────────────────────────────────────────

export function computeWeekSignals(
  tasks: Task[],
  entries: JournalEntry[],
  settings: Pick<Settings, 'work_target_hours' | 'personal_target_hours' | 'sleep_target_hours' | 'care_enabled' | 'care_target_hours' | 'current_streak' | 'longest_streak'>
): WeekSignals {
  const pillarBalance = computePillarBalance(tasks, settings);
  const followThrough = computeFollowThrough(tasks, settings.current_streak, settings.longest_streak);
  const journalMood   = computeJournalMood(entries);
  const themes        = computeThemes(entries);

  // "Strong week": good completion, positive mood, streak going up
  const isStrongWeek =
    followThrough.completionRate >= 0.75 &&
    journalMood.overallMood !== 'negative' &&
    followThrough.streakTrend !== 'down';

  return { pillarBalance, followThrough, journalMood, themes, isStrongWeek };
}
