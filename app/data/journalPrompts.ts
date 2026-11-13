// journalPrompts.ts — All reflection prompts, organised by category.
// The Journal screen uses these to show a rotating daily prompt.

export interface Prompt {
  text: string;
  category: 'balance' | 'work' | 'personal' | 'care' | 'sleep' | 'growth' | 'streak' | 'weekly';
}

export const BALANCE_PROMPTS: Prompt[] = [
  { text: 'Which pillar got the most attention today? Which got the least? Why?',          category: 'balance' },
  { text: 'Did your planned day match your actual day? What shifted?',                      category: 'balance' },
  { text: 'If you could add one hour to any pillar today, where would it go?',              category: 'balance' },
  { text: "What's one thing you planned but didn't do? What replaced it?",                  category: 'balance' },
  { text: 'Did you feel rushed today, or did you have breathing room?',                     category: 'balance' },
];

export const WORK_PROMPTS: Prompt[] = [
  { text: "What's one thing you accomplished at work/school today that you're proud of?",   category: 'work' },
  { text: "Did your work time feel productive or just busy? What's the difference?",        category: 'work' },
  { text: "What's one thing you'd do differently about how you worked today?",               category: 'work' },
  { text: 'Did you take any breaks? How did they affect your focus?',                       category: 'work' },
  { text: "What task are you avoiding, and what would it take to start it?",                category: 'work' },
];

export const PERSONAL_PROMPTS: Prompt[] = [
  { text: 'What did you do today purely for yourself — not for work, not for others?',      category: 'personal' },
  { text: 'Who did you connect with today? How did it feel?',                               category: 'personal' },
  { text: 'What made you laugh or smile today?',                                             category: 'personal' },
  { text: 'Did you move your body today? How did it affect your energy?',                   category: 'personal' },
  { text: "What's something you're looking forward to this week?",                          category: 'personal' },
];

export const CARE_PROMPTS: Prompt[] = [
  { text: "What did you take care of today that no one else would have noticed?",           category: 'care' },
  { text: 'Did any Care tasks feel heavier than usual today? Why?',                         category: 'care' },
  { text: "Is there a Care task you keep postponing? What's blocking it?",                  category: 'care' },
  { text: 'Who or what depended on you today?',                                              category: 'care' },
  { text: 'How do you recharge after a Care-heavy day?',                                    category: 'care' },
];

export const SLEEP_PROMPTS: Prompt[] = [
  { text: 'How did you sleep last night? What affected your rest?',                         category: 'sleep' },
  { text: "What's your wind-down routine? Is it working?",                                  category: 'sleep' },
  { text: 'Did you get enough sleep to feel sharp today?',                                   category: 'sleep' },
  { text: "What's the biggest obstacle between you and consistent sleep?",                  category: 'sleep' },
  { text: 'If you could change one thing about your sleep habits, what would it be?',       category: 'sleep' },
];

export const GROWTH_PROMPTS: Prompt[] = [
  { text: 'What did you learn today — about yourself, your work, or the world?',            category: 'growth' },
  { text: "What's a pattern you're starting to notice in your daily habits?",               category: 'growth' },
  { text: 'What would your ideal day look like? How close was today?',                      category: 'growth' },
  { text: 'If Nova could talk, what would she say about your week so far?',                 category: 'growth' },
  { text: "What's one small change you could make tomorrow to feel more balanced?",         category: 'growth' },
];

// Shown only when streak >= 7
export const STREAK_PROMPTS: Prompt[] = [
  { text: "You've been consistent for [X] days. What's keeping you going?",                 category: 'streak' },
  { text: "What's different about the version of you that shows up every day?",             category: 'streak' },
  { text: "Has your sense of balance changed since you started tracking?",                  category: 'streak' },
  { text: "What would you tell someone just starting their streak journey?",                category: 'streak' },
  { text: "What habit has become automatic that used to require effort?",                   category: 'streak' },
];

// Shown only on Sundays
export const WEEKLY_REVIEW_PROMPTS: Prompt[] = [
  { text: "Look at your week. What are you most proud of?",                                  category: 'weekly' },
  { text: 'What surprised you about how you spent your time this week?',                    category: 'weekly' },
  { text: 'Rate your week 1-10. What would make next week a point higher?',                 category: 'weekly' },
  { text: "What's one thing you want to do differently next week?",                         category: 'weekly' },
  { text: 'If you could relive one day from this week, which would it be and why?',         category: 'weekly' },
];

// ─── Prompt selector ──────────────────────────────────────────────────────────
// Picks the right pool of prompts based on context and returns a cycling prompt.
export function selectDailyPrompt(
  dayOfYear: number,
  streak: number,
  isSunday: boolean,
  careEnabled: boolean
): Prompt {
  let pool: Prompt[] = [
    ...BALANCE_PROMPTS,
    ...WORK_PROMPTS,
    ...PERSONAL_PROMPTS,
    ...SLEEP_PROMPTS,
    ...GROWTH_PROMPTS,
  ];

  if (careEnabled)    pool = [...pool, ...CARE_PROMPTS];
  if (streak >= 7)    pool = [...pool, ...STREAK_PROMPTS];
  if (isSunday)       pool = [...pool, ...WEEKLY_REVIEW_PROMPTS];

  return pool[dayOfYear % pool.length];
}

// Replace [X] placeholder with actual streak number
export function formatPromptText(text: string, streak: number): string {
  return text.replace('[X]', String(streak));
}

// Pick a random prompt from the full pool (for the "🔄 New prompt" button)
export function randomPrompt(
  streak: number,
  isSunday: boolean,
  careEnabled: boolean,
  exclude?: string
): Prompt {
  let pool: Prompt[] = [
    ...BALANCE_PROMPTS,
    ...WORK_PROMPTS,
    ...PERSONAL_PROMPTS,
    ...SLEEP_PROMPTS,
    ...GROWTH_PROMPTS,
  ];
  if (careEnabled) pool = [...pool, ...CARE_PROMPTS];
  if (streak >= 7) pool = [...pool, ...STREAK_PROMPTS];
  if (isSunday)    pool = [...pool, ...WEEKLY_REVIEW_PROMPTS];

  // Filter out the current prompt to avoid showing the same one again
  const filtered = exclude ? pool.filter((p) => p.text !== exclude) : pool;
  const source   = filtered.length > 0 ? filtered : pool;
  return source[Math.floor(Math.random() * source.length)];
}
