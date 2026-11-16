// journalPrompts.ts — All reflection prompts, organised by category.
// The Journal screen uses these to show a rotating daily prompt.

// The first eight categories follow the pillars and the calendar. The last
// seven are "process" prompts: about effort and method, not results.
export type PromptCategory =
  | 'balance' | 'work' | 'personal' | 'care' | 'sleep' | 'growth' | 'streak' | 'weekly'
  | 'process'        // effort and how, not results
  | 'controllables'  // what was yours to control, and what was not
  | 'stretch'        // useful discomfort
  | 'unstuck'        // sideways or backward moves
  | 'scaffold'       // asking for help, and giving it
  | 'pastself'       // compare with yourself only
  | 'oneRep';        // tomorrow's single smallest action

export const PROCESS_CATEGORIES: readonly PromptCategory[] = [
  'process', 'controllables', 'stretch', 'unstuck', 'scaffold', 'pastself', 'oneRep',
];
export const ALL_CATEGORIES: readonly PromptCategory[] = [
  'balance', 'work', 'personal', 'care', 'sleep', 'growth', 'streak', 'weekly', ...PROCESS_CATEGORIES,
];

// How a prompt is answered. The Journal screen adds a little to the writing
// box for each one.
//   open        just write
//   fill        a sentence with blanks (___) to fill in
//   scale       rate 1 to 5, then one line on why
//   two-minute  a two-minute timer: write until it ends
//   zoom        two parts: zoom out (this month), zoom in (the next hour)
//   letter      a short note to your future self
export type PromptFormat = 'open' | 'fill' | 'scale' | 'two-minute' | 'zoom' | 'letter';
export const PROMPT_FORMATS: readonly PromptFormat[] = ['open', 'fill', 'scale', 'two-minute', 'zoom', 'letter'];

export interface Prompt {
  text: string;
  category: PromptCategory;
  id?: string;             // stable id, e.g. "process-3" (set for every prompt in this file)
  format?: PromptFormat;   // missing = 'open'
  // Which family of ideas a process prompt grew from. For analytics only:
  // never shown, and no prompt quotes anything.
  source?: 'process' | 'potential';
  gentle?: boolean;        // a soft, low-effort prompt for a tired or stressed week
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

// ─── Process prompts ──────────────────────────────────────────────────────────
// 78 prompts in seven categories, written for this app. They apply two
// families of ideas to the day and its pillars:
//   'process'    care about the daily work more than the result; put your
//                attention on what you control; do the small unseen work; be
//                present in this one rep; treat a miss as information; help
//                other people; accept that getting good takes a long time.
//   'potential'  character skills matter more than talent; pick discomfort
//                that teaches; "good enough to ship" beats perfect; build
//                support and ask for help; when stuck, go sideways or back;
//                turn practice into play; measure against your past self.
// Nothing here is quoted or paraphrased from a book.
type P = [text: string, format?: PromptFormat];
const build = (category: PromptCategory, source: Prompt['source'], list: P[]): Prompt[] =>
  list.map(([text, format]) => ({ text, category, source, format: format ?? 'open' }));

export const PROCESS_PROMPTS: Prompt[] = build('process', 'process', [
  ['What did you put real effort into today, whether or not it showed?'],
  ['Which small task today did you do with care, even though nobody was checking?'],
  ['Today I gave my best attention to ___, and it felt ___.', 'fill'],
  ['Pick one task from today. Describe how you did it, not how it turned out.'],
  ['How present were you during your most important block today? Rate it 1 to 5, then say why in one line.', 'scale'],
  ['What part of your routine is quietly making you better, even if it feels boring?'],
  ['Set the result aside. Write for two minutes about the work itself: what you did today, step by step.', 'two-minute'],
  ['Where did you rush today just to be finished? What would slowing down have looked like?'],
  ['Zoom out: what are you building this month, one day at a time? Zoom in: what is the piece of it that fits in the next hour?', 'zoom'],
  ['What is one ordinary thing you did today that you will be glad you kept doing?'],
  ['Write a short note to yourself six months from now about the daily work you are putting in right now.', 'letter'],
]);

export const CONTROLLABLES_PROMPTS: Prompt[] = build('controllables', 'process', [
  ['Name one thing today that was up to you, and one that never was.'],
  ['I could not control ___ today, but I could control ___.', 'fill'],
  ['What took up room in your head today that you have no say over? Where would you rather put that attention?'],
  ['How much of today\'s energy went to things you can actually change? Rate it 1 to 5, then say why in one line.', 'scale'],
  ['Something did not go to plan today. Which part of how you responded are you happy with?'],
  ['Your effort, your attitude, your next step: which of these three did you handle best today?'],
  ['For two minutes, empty out every worry from today. When the time is up, mark the ones you can do something about.', 'two-minute'],
  ['What is one thing you can put down tonight, because holding on to it changes nothing?'],
  ['Zoom out: what this month is out of your hands? Zoom in: what in the next hour is fully in them?', 'zoom'],
  ['If one area went badly today, what is the one move there that is still yours to make?'],
  ['Write a short note to your future self about something you are choosing to stop worrying about.', 'letter'],
]);

export const STRETCH_PROMPTS: Prompt[] = build('stretch', 'potential', [
  ['Where were you a beginner today? What did that feel like?'],
  ['What did you try today that you were not sure you could do?'],
  ['Today I took the harder option when I ___, instead of ___.', 'fill'],
  ['How far outside your comfort zone did you go today? Rate it 1 to 5, then say what pushed you in one line.', 'scale'],
  ['What did you avoid today because you might look clumsy doing it?'],
  ['Think of a moment today when you felt unsure. What were you learning right then?'],
  ['Which pillar feels too comfortable right now? What would a small challenge there look like?'],
  ['Write for two minutes about a time when being uncomfortable paid off for you.', 'two-minute'],
  ['What did you finish today that was good enough, even though it was not perfect?'],
  ['Zoom out: what do you want to be better at by the end of this month? Zoom in: what slightly hard thing could you do toward it in the next hour?', 'zoom'],
  ['Write a short note to your future self about a discomfort you are choosing on purpose right now.', 'letter'],
  ['Where did wanting it perfect slow you down today? What would "done and useful" have looked like?'],
]);

export const UNSTUCK_PROMPTS: Prompt[] = build('unstuck', 'potential', [
  ['Where do you feel stuck right now? What is a smaller version of that goal you could reach this week?'],
  ['If the direct route is blocked, what is a side road to the same place?'],
  ['I keep getting stuck on ___. A different way in could be ___.', 'fill'],
  ['What could you go back and relearn that would make the hard part easier?'],
  ['Which pillar has been stalled the longest? What is the tiniest thing that would count as movement there?'],
  ['How stuck do you feel this week? 1 is moving freely, 5 is fully stuck. Then say what is in the way in one line.', 'scale'],
  ['What would you try if you let yourself do it badly the first time?'],
  ['For two minutes, list every possible next move on the thing you are stuck on, silly ones included.', 'two-minute'],
  ['When did you last get unstuck from something? What actually worked that time?'],
  ['Zoom out: where do you want this stalled area to be in a month? Zoom in: what ten-minute start could you make in the next hour?', 'zoom'],
  ['What could you step away from on purpose, so you come back to it fresher?'],
]);

export const SCAFFOLD_PROMPTS: Prompt[] = build('scaffold', 'potential', [
  ['Who knows something you need right now? What is the one question you would ask them?'],
  ['Who helped you today, even in a small way? Did you tell them?'],
  ['This week I could ask ___ for help with ___.', 'fill'],
  ['What are you trying to do alone that would go better with support?'],
  ['Who did you help today? What did it cost you, and what did it give you?'],
  ['What do you know well enough to teach? Who could use it?'],
  ['How easy was it to ask for help this week? Rate it 1 to 5, then say what makes it hard or easy in one line.', 'scale'],
  ['What would make your hardest pillar easier: a person, a tool, a reminder, or a plan?'],
  ['Write for two minutes about someone who made you better at something, and how they did it.', 'two-minute'],
  ['Write a short thank-you note to someone who backed you lately. You do not have to send it.', 'letter'],
  ['Whose feedback would be most useful to you right now? What is stopping you from asking for it?'],
]);

export const PASTSELF_PROMPTS: Prompt[] = build('pastself', 'potential', [
  ['What is easier for you today than it was a few weeks ago?'],
  ['What would the you of three months ago be surprised to see you doing now?'],
  ['A month ago I could not ___. Now I can ___.', 'fill'],
  ['Leave everyone else out of it. Compared with last week, where did you move forward?'],
  ['Compared with a month ago, how are you doing? Rate it 1 to 5, then say what changed in one line.', 'scale'],
  ['Which habit of yours has grown the most since you started tracking your days?'],
  ['What did you handle today that would have thrown you off a year ago?'],
  ['For two minutes, write down everything you have gotten better at this year, big or small.', 'two-minute'],
  ['Zoom out: how have you changed over the last month? Zoom in: what is one thing in the next hour that keeps it going?', 'zoom'],
  ['Write a short note to your future self describing where you are today, so you can measure the distance later.', 'letter'],
  ['Whose progress have you been holding yours up against? What does your own line look like by itself?'],
]);

export const ONE_REP_PROMPTS: Prompt[] = build('oneRep', 'process', [
  ['What is the smallest step you can take tomorrow, so small that skipping it would be harder than doing it?'],
  ['Tomorrow, the first thing I will do is ___, and it will take about ___ minutes.', 'fill'],
  ['Pick the pillar you gave the least to. What is a two-minute action for it tomorrow?'],
  ['If tomorrow allowed only one task, which one would make the day count?'],
  ['What can you set up tonight so that the first step tomorrow is almost automatic?'],
  ['How ready do you feel for tomorrow? Rate it 1 to 5, then name the one step that would raise it by a point.', 'scale'],
  ['What on the plan for tomorrow could you shrink by half and still feel good about?'],
  ['Which task tomorrow are you most likely to put off? What are its first thirty seconds?'],
  ['Zoom out: what do you want to be true by the end of this month? Zoom in: what single small action tomorrow points at it?', 'zoom'],
  ['Write one line to yourself for tomorrow morning: what to start with, and why it matters.', 'letter'],
  ['When and where will the one small step for tomorrow happen? Be exact.'],
]);

// Gentle prompts about looking after yourself, for a week when the journal
// sounds stressed or tired. They are in the 'care' category but do not need
// the Care pillar to be switched on.
export const GENTLE_CARE_PROMPTS: Prompt[] = [
  { text: 'What would make tonight a little easier on you?', category: 'care', gentle: true },
  { text: 'What is one kind thing you can do for yourself before bed?', category: 'care', gentle: true },
  { text: 'What do you need less of this week? What do you need more of?', category: 'care', gentle: true },
  { text: 'How full is your tank right now? Rate it 1 to 5, then name one thing that would add a little.', category: 'care', format: 'scale', gentle: true },
];

export const NEW_PROCESS_PROMPTS: readonly Prompt[] = [
  ...PROCESS_PROMPTS, ...CONTROLLABLES_PROMPTS, ...STRETCH_PROMPTS, ...UNSTUCK_PROMPTS,
  ...SCAFFOLD_PROMPTS, ...PASTSELF_PROMPTS, ...ONE_REP_PROMPTS,
];

// ─── Ids ──────────────────────────────────────────────────────────────────────
// Every prompt gets a stable id from its group and its place in it
// ("process-3", "gentle-1"). The 30-day history stores these. Only add new
// prompts at the END of a list, so existing ids keep their meaning.
const GROUPS: [string, Prompt[]][] = [
  ['balance', BALANCE_PROMPTS], ['work', WORK_PROMPTS], ['personal', PERSONAL_PROMPTS],
  ['care', CARE_PROMPTS], ['sleep', SLEEP_PROMPTS], ['growth', GROWTH_PROMPTS],
  ['streak', STREAK_PROMPTS], ['weekly', WEEKLY_REVIEW_PROMPTS],
  ['process', PROCESS_PROMPTS], ['controllables', CONTROLLABLES_PROMPTS], ['stretch', STRETCH_PROMPTS],
  ['unstuck', UNSTUCK_PROMPTS], ['scaffold', SCAFFOLD_PROMPTS], ['pastself', PASTSELF_PROMPTS],
  ['oneRep', ONE_REP_PROMPTS], ['gentle', GENTLE_CARE_PROMPTS],
];
for (const [group, list] of GROUPS) {
  list.forEach((prompt, i) => {
    prompt.id = `${group}-${i + 1}`;
    prompt.format = prompt.format ?? 'open';
  });
}

export const ALL_PROMPTS: readonly Prompt[] = GROUPS.flatMap(([, list]) => list);

const BY_ID = new Map(ALL_PROMPTS.map((p) => [p.id!, p]));
const BY_TEXT = new Map(ALL_PROMPTS.map((p) => [p.text, p]));
export const getPrompt = (id: string): Prompt | undefined => BY_ID.get(id);
// A saved journal entry stores the text of its prompt. This finds the prompt again.
export const findPromptByText = (text: string): Prompt | undefined => BY_TEXT.get(text);
export const formatOf = (p: Prompt): PromptFormat => p.format ?? 'open';

// ─── Formats ──────────────────────────────────────────────────────────────────
export const BLANK = '___';

export const FORMAT_LABELS: Record<PromptFormat, string> = {
  open: '',
  fill: 'Fill in the blanks',
  scale: 'Rate 1 to 5',
  'two-minute': 'Two-minute write',
  zoom: 'Zoom out, zoom in',
  letter: 'A note to future you',
};

// What the writing box starts with for a prompt, so the shape of the answer
// is already there. Empty for formats that start from a blank page.
export function templateFor(p: Prompt): string {
  switch (formatOf(p)) {
    case 'fill': return p.text;
    case 'zoom': return 'This month: \n\nThe next hour: ';
    case 'letter': return 'Dear future me,\n\n';
    default: return '';
  }
}

// A 1 to 5 rating is saved as the first line of the entry.
const RATING_LINE = /^Rating: ([1-5])\/5\n?/;
export function withRating(text: string, rating: number | null): string {
  const body = text.replace(RATING_LINE, '');
  return rating && rating >= 1 && rating <= 5 ? `Rating: ${rating}/5\n${body}` : body;
}
export function splitRating(text: string): { rating: number | null; body: string } {
  const m = RATING_LINE.exec(text);
  return m ? { rating: Number(m[1]), body: text.slice(m[0].length) } : { rating: null, body: text };
}

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
