// activities.ts — ~40 activity ideas for treat deliveries.
// All appropriate for a general audience. Each has a one-line pitch,
// mood/theme tags, a pillar, and an estimated duration.

import type { Pillar } from '../../types';

export interface ActivityItem {
  id: string;
  title: string;
  pitch: string;
  tags: string[];
  pillars: Pillar[];
  duration_min: number;
}

export const ACTIVITIES: ActivityItem[] = [
  // Care pillar (self-care, low effort)
  { id: 'a01', title: '20-minute walk, no phone', pitch: 'Step outside, leave the phone behind, and just move.', tags: ['care', 'nature', 'energize', 'calm'], pillars: ['care'], duration_min: 20 },
  { id: 'a02', title: 'Make one nourishing meal from scratch', pitch: 'Cook something simple and healthy. The act of making it matters.', tags: ['care', 'health', 'creativity'], pillars: ['care', 'personal'], duration_min: 45 },
  { id: 'a03', title: '5-minute body scan meditation', pitch: 'Lie down, close your eyes, and slowly notice each part of your body.', tags: ['care', 'calm', 'health', 'sleep'], pillars: ['care', 'sleep'], duration_min: 5 },
  { id: 'a04', title: 'Stretch for 10 minutes before bed', pitch: 'A gentle stretch routine signals your body it\'s time to wind down.', tags: ['care', 'sleep', 'calm', 'fitness'], pillars: ['care', 'sleep'], duration_min: 10 },
  { id: 'a05', title: 'Digital detox hour', pitch: 'No screens for one hour. Read, draw, walk — anything offline.', tags: ['care', 'calm', 'personal', 'creativity'], pillars: ['care', 'personal'], duration_min: 60 },
  { id: 'a06', title: 'Write three things you\'re grateful for', pitch: 'Takes 2 minutes and reliably shifts your mood upward.', tags: ['care', 'personal', 'comfort', 'calm'], pillars: ['care', 'personal'], duration_min: 5 },
  { id: 'a07', title: 'Take a long, unhurried shower or bath', pitch: 'No agenda. Let your mind drift. Good ideas often follow.', tags: ['care', 'calm', 'comfort'], pillars: ['care'], duration_min: 20 },
  { id: 'a08', title: 'Declutter one drawer or shelf', pitch: 'Small tidying gives a surprising sense of control and calm.', tags: ['care', 'calm', 'work'], pillars: ['care', 'personal'], duration_min: 20 },

  // Sleep pillar
  { id: 'a09', title: 'Set a consistent bedtime for 7 days', pitch: 'Pick a time tonight and stick to it for a week. Sleep quality improves fast.', tags: ['sleep', 'care', 'health'], pillars: ['sleep', 'care'], duration_min: 1 },
  { id: 'a10', title: 'No caffeine after 2pm today', pitch: 'Caffeine lingers 6-8 hours. Cutting it off at 2pm is the single easiest sleep win.', tags: ['sleep', 'care', 'health'], pillars: ['sleep', 'care'], duration_min: 1 },
  { id: 'a11', title: 'Read a physical book before bed', pitch: 'Replace scrolling with a book tonight. Your sleep will thank you.', tags: ['sleep', 'care', 'calm', 'comfort', 'creativity'], pillars: ['sleep', 'personal'], duration_min: 30 },
  { id: 'a12', title: 'Create a wind-down playlist', pitch: 'Build a playlist of 3-4 calming songs for the last 20 minutes before sleep.', tags: ['sleep', 'creativity', 'calm'], pillars: ['sleep', 'personal'], duration_min: 15 },

  // Fitness / care
  { id: 'a13', title: '15-minute beginner yoga flow', pitch: 'A gentle routine you can do anywhere, no equipment needed.', tags: ['fitness', 'care', 'calm', 'health'], pillars: ['care', 'personal'], duration_min: 15 },
  { id: 'a14', title: 'Dance to 3 songs in your room', pitch: 'No choreography required. Just move to music you love.', tags: ['fitness', 'care', 'energize', 'personal'], pillars: ['care', 'personal'], duration_min: 10 },
  { id: 'a15', title: 'Walk somewhere new today', pitch: 'Take a different route or find a park you\'ve never visited.', tags: ['fitness', 'nature', 'care', 'energize'], pillars: ['care', 'personal'], duration_min: 30 },
  { id: 'a16', title: '10-minute morning movement', pitch: 'Jump jacks, stretches, or a short walk first thing. Sets the tone for the whole day.', tags: ['fitness', 'care', 'energize'], pillars: ['care'], duration_min: 10 },

  // Personal / creativity
  { id: 'a17', title: 'Write one page about your week', pitch: 'No editing, no judgment. Just get the week\'s thoughts out of your head and onto paper.', tags: ['personal', 'creativity', 'comfort', 'calm'], pillars: ['personal'], duration_min: 15 },
  { id: 'a18', title: 'Sketch something you see right now', pitch: 'Pick any nearby object and draw it badly. The point is to really look.', tags: ['creativity', 'personal', 'calm'], pillars: ['personal'], duration_min: 15 },
  { id: 'a19', title: 'Learn 10 words in a new language', pitch: 'Apps like Duolingo make this quick and strangely satisfying.', tags: ['school', 'personal', 'creativity'], pillars: ['personal'], duration_min: 15 },
  { id: 'a20', title: 'Cook a recipe from a new cuisine', pitch: 'Pick something you\'ve never cooked from a culture you\'ve never cooked from.', tags: ['creativity', 'personal', 'care'], pillars: ['personal', 'care'], duration_min: 60 },
  { id: 'a21', title: 'Start a new playlist for the week', pitch: 'Curate 10-15 songs that match the energy you want this week to have.', tags: ['personal', 'creativity', 'energize'], pillars: ['personal'], duration_min: 20 },
  { id: 'a22', title: 'Write a letter to your future self', pitch: 'Date it one year from today. Tell yourself what you hope is different.', tags: ['personal', 'motivate', 'creativity', 'comfort'], pillars: ['personal'], duration_min: 20 },

  // Friends / family
  { id: 'a23', title: 'Text or call someone you haven\'t spoken to in a while', pitch: 'Pick one name. Send a message today. It doesn\'t need to be long.', tags: ['friends', 'family', 'personal', 'care'], pillars: ['personal', 'care'], duration_min: 5 },
  { id: 'a24', title: 'Plan something to look forward to with a friend', pitch: 'Even a coffee date two weeks out gives your week a happier shape.', tags: ['friends', 'personal', 'care', 'comfort'], pillars: ['personal', 'care'], duration_min: 10 },
  { id: 'a25', title: 'Cook or bake something for someone else', pitch: 'Make extra of whatever you\'re cooking and share it with someone.', tags: ['family', 'friends', 'care', 'creativity'], pillars: ['care', 'personal'], duration_min: 45 },

  // Work / focus
  { id: 'a26', title: 'Time-block your tomorrow', pitch: 'Spend 10 minutes tonight assigning specific tasks to specific time slots for tomorrow.', tags: ['work', 'focus', 'motivate'], pillars: ['work'], duration_min: 10 },
  { id: 'a27', title: 'Clear your inbox to zero', pitch: 'A one-time inbox zero feels better than any productivity hack.', tags: ['work', 'focus', 'calm'], pillars: ['work'], duration_min: 30 },
  { id: 'a28', title: 'Do your hardest task in the first hour of the day', pitch: 'Tomorrow: pick the one thing you\'ve been dreading and do it at 9am.', tags: ['work', 'focus', 'challenge', 'motivate'], pillars: ['work'], duration_min: 60 },
  { id: 'a29', title: 'Write down everything on your mind (a brain dump)', pitch: 'Set a timer for 10 minutes and write every task, worry, and idea in your head.', tags: ['work', 'personal', 'focus', 'calm'], pillars: ['work', 'personal'], duration_min: 10 },

  // Money
  { id: 'a30', title: 'Review last month\'s spending for 15 minutes', pitch: 'Open your bank app, look at the totals, and pick one category to adjust.', tags: ['money', 'work', 'focus'], pillars: ['work', 'personal'], duration_min: 15 },
  { id: 'a31', title: 'Set up or review one automatic savings rule', pitch: 'Even automating $5 a week creates momentum.', tags: ['money', 'work'], pillars: ['work', 'personal'], duration_min: 10 },

  // Nature / outdoors
  { id: 'a32', title: 'Sit outside for 20 minutes with nothing to do', pitch: 'No phone, no podcast. Just sky, air, and whatever\'s around you.', tags: ['nature', 'calm', 'care', 'comfort'], pillars: ['care', 'personal'], duration_min: 20 },
  { id: 'a33', title: 'Find one new plant, bird, or insect near you', pitch: 'Look up whatever it is. The world is full of things you haven\'t noticed yet.', tags: ['nature', 'personal', 'creativity', 'calm'], pillars: ['personal', 'care'], duration_min: 20 },

  // Mindfulness / mental health
  { id: 'a34', title: 'Box breathing: 4 counts in, 4 hold, 4 out, 4 hold', pitch: 'Repeat 4 times. Used by Navy SEALs to stay calm under pressure.', tags: ['calm', 'care', 'health'], pillars: ['care'], duration_min: 5 },
  { id: 'a35', title: 'List 10 small things that made today okay', pitch: 'Not big wins — tiny ones. Warm coffee. A good sentence. A song.', tags: ['comfort', 'personal', 'care', 'calm'], pillars: ['personal', 'care'], duration_min: 5 },
  { id: 'a36', title: 'Practice saying no to one optional thing this week', pitch: 'Protect one hour of your week that currently belongs to someone else\'s agenda.', tags: ['personal', 'care', 'work', 'focus'], pillars: ['personal', 'care'], duration_min: 1 },

  // Challenge
  { id: 'a37', title: 'Do something slightly uncomfortable today', pitch: 'Make the call you\'ve been putting off. Start the thing. Send the message.', tags: ['challenge', 'motivate', 'work', 'personal'], pillars: ['work', 'personal'], duration_min: 10 },
  { id: 'a38', title: 'Sign up for something new: class, club, or challenge', pitch: 'Commitment creates momentum. Find one new thing and register.', tags: ['challenge', 'motivate', 'personal', 'school'], pillars: ['personal'], duration_min: 15 },
  { id: 'a39', title: 'Read for 30 minutes with no interruptions', pitch: 'Set your phone to Do Not Disturb. 30 unbroken minutes with a good book.', tags: ['personal', 'comfort', 'calm', 'school'], pillars: ['personal'], duration_min: 30 },
  { id: 'a40', title: 'Write down 3 things you want to accomplish this week', pitch: 'Not a full to-do list. Just three things. Keep them somewhere visible.', tags: ['work', 'personal', 'motivate', 'focus'], pillars: ['work', 'personal'], duration_min: 5 },
  // Small ways back in: for a week when follow-through was rough.
  // Tagged 'process' and 'small-wins' (see scoreItem in utils/delivery.ts).
  { id: 'a41', title: '2-minute start', pitch: 'Pick the task you keep moving. Work on it for two minutes, then you are allowed to stop.', tags: ['process', 'small-wins', 'work', 'focus'], pillars: ['work', 'personal'], duration_min: 2 },
  { id: 'a42', title: 'Finish one tiny task', pitch: 'Choose the smallest thing on your list and finish it completely. One done beats five started.', tags: ['process', 'small-wins', 'work'], pillars: ['work'], duration_min: 5 },
  { id: 'a43', title: 'Choose tomorrow\'s first step tonight', pitch: 'Write down one small action for the morning and put what you need for it where you will see it.', tags: ['process', 'small-wins', 'personal', 'calm'], pillars: ['personal', 'work'], duration_min: 3 },
  { id: 'a44', title: '10 minutes, then stop', pitch: 'Set a timer for ten minutes on one task. When it rings, you are done, whatever got finished.', tags: ['process', 'small-wins', 'focus', 'work'], pillars: ['work', 'personal'], duration_min: 10 },
  { id: 'a45', title: 'Cross one thing off without doing it', pitch: 'Find a task that no longer matters and delete it. A shorter list is easier to start.', tags: ['small-wins', 'calm', 'work', 'personal'], pillars: ['work', 'personal'], duration_min: 2 },
  { id: 'a46', title: 'Clear one surface', pitch: 'One desk, one shelf, or one counter. A small visible win you can finish in five minutes.', tags: ['small-wins', 'care', 'calm'], pillars: ['care', 'personal'], duration_min: 5 },
  { id: 'a47', title: 'Do one rep', pitch: 'One push-up, one page, one line of notes. The point is to show up, not to do a lot.', tags: ['process', 'small-wins', 'fitness', 'personal'], pillars: ['personal', 'care'], duration_min: 1 },
];
