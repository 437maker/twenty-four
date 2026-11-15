// quotes.ts — ~60 short motivational quotes for treat deliveries.
// Rules: ≤25 words, well-known with correct attribution, or original lines credited to "24".
// No song lyrics or poem excerpts.

export interface QuoteItem {
  id: string;
  text: string;
  attribution: string;
  tags: string[];
}

export const QUOTES: QuoteItem[] = [
  // Challenge / strong week
  { id: 'q01', text: "It always seems impossible until it's done.", attribution: 'Nelson Mandela', tags: ['motivate', 'challenge', 'work'] },
  { id: 'q02', text: 'The secret of getting ahead is getting started.', attribution: 'Mark Twain', tags: ['motivate', 'challenge', 'work'] },
  { id: 'q03', text: 'Do what you can, with what you have, where you are.', attribution: 'Theodore Roosevelt', tags: ['motivate', 'challenge'] },
  { id: 'q04', text: 'Nothing will work unless you do.', attribution: 'Maya Angelou', tags: ['motivate', 'challenge', 'work'] },
  { id: 'q05', text: 'The only way to do great work is to love what you do.', attribution: 'Steve Jobs', tags: ['motivate', 'challenge', 'work'] },
  { id: 'q06', text: 'Believe you can and you\'re halfway there.', attribution: 'Theodore Roosevelt', tags: ['motivate', 'challenge'] },
  { id: 'q07', text: 'Success is not final, failure is not fatal. It is the courage to continue that counts.', attribution: 'Winston Churchill', tags: ['motivate', 'challenge', 'resilience'] },
  { id: 'q08', text: 'You miss 100% of the shots you don\'t take.', attribution: 'Wayne Gretzky', tags: ['motivate', 'challenge', 'courage'] },
  { id: 'q09', text: 'The harder you work, the luckier you get.', attribution: 'Gary Player', tags: ['motivate', 'challenge', 'work'] },
  { id: 'q10', text: 'Strive not to be a success, but rather to be of value.', attribution: 'Albert Einstein', tags: ['motivate', 'personal', 'work'] },

  // Calm / comfort
  { id: 'q11', text: 'You don\'t have to be great to get started, but you have to get started to be great.', attribution: 'Les Brown', tags: ['comfort', 'motivate'] },
  { id: 'q12', text: 'In the middle of every difficulty lies opportunity.', attribution: 'Albert Einstein', tags: ['comfort', 'resilience'] },
  { id: 'q13', text: 'You are enough just as you are.', attribution: '24', tags: ['comfort', 'care', 'personal'] },
  { id: 'q14', text: 'Rest is not quitting. It\'s part of the work.', attribution: '24', tags: ['comfort', 'sleep', 'care'] },
  { id: 'q15', text: 'Small steps forward still move you forward.', attribution: '24', tags: ['comfort', 'motivate'] },
  { id: 'q16', text: 'Even the strongest storms pass. Keep going.', attribution: '24', tags: ['comfort', 'resilience'] },
  { id: 'q17', text: 'Be gentle with yourself. You are a work in progress.', attribution: '24', tags: ['comfort', 'care', 'personal'] },
  { id: 'q18', text: 'The present moment is always enough.', attribution: '24', tags: ['comfort', 'calm', 'personal'] },
  { id: 'q19', text: 'Not all who wander are lost.', attribution: 'J.R.R. Tolkien', tags: ['comfort', 'personal'] },
  { id: 'q20', text: 'You have survived every bad day so far. That is 100%.', attribution: '24', tags: ['comfort', 'resilience'] },

  // Energy / fitness
  { id: 'q21', text: 'Take care of your body. It\'s the only place you have to live.', attribution: 'Jim Rohn', tags: ['energize', 'care', 'fitness'] },
  { id: 'q22', text: 'Movement is a medicine for creating change in a person\'s physical, emotional, and mental states.', attribution: 'Carol Welch', tags: ['energize', 'care', 'fitness'] },
  { id: 'q23', text: 'Your body can stand almost anything. It\'s your mind you have to convince.', attribution: 'Unknown', tags: ['energize', 'fitness', 'motivate'] },
  { id: 'q24', text: 'A walk a day keeps the fog away.', attribution: '24', tags: ['energize', 'care', 'fitness', 'nature'] },
  { id: 'q25', text: 'Energy is not found — it is made, one good habit at a time.', attribution: '24', tags: ['energize', 'care', 'work'] },

  // Focus / work
  { id: 'q26', text: 'Focus on being productive instead of busy.', attribution: 'Tim Ferriss', tags: ['focus', 'work', 'personal'] },
  { id: 'q27', text: 'The key is not to prioritize your schedule but to schedule your priorities.', attribution: 'Stephen Covey', tags: ['focus', 'work', 'personal'] },
  { id: 'q28', text: 'One task done fully is worth ten tasks half-started.', attribution: '24', tags: ['focus', 'work'] },
  { id: 'q29', text: 'Concentration is the secret of strength.', attribution: 'Ralph Waldo Emerson', tags: ['focus', 'work'] },
  { id: 'q30', text: 'Where focus goes, energy flows.', attribution: 'Tony Robbins', tags: ['focus', 'work', 'personal'] },

  // Sleep / rest
  { id: 'q31', text: 'Sleep is the best meditation.', attribution: 'Dalai Lama', tags: ['sleep', 'comfort', 'care'] },
  { id: 'q32', text: 'A well-rested mind sees clearly and moves swiftly.', attribution: '24', tags: ['sleep', 'focus', 'work'] },
  { id: 'q33', text: 'Early to bed and early to rise makes a man healthy, wealthy, and wise.', attribution: 'Benjamin Franklin', tags: ['sleep', 'work'] },
  { id: 'q34', text: 'The night is for rest. The morning is for action.', attribution: '24', tags: ['sleep', 'work'] },
  { id: 'q35', text: 'Fatigue makes cowards of us all. Protect your sleep.', attribution: 'Vince Lombardi (adapted)', tags: ['sleep', 'care', 'motivate'] },

  // Creativity / personal growth
  { id: 'q36', text: 'Creativity is intelligence having fun.', attribution: 'Albert Einstein', tags: ['creativity', 'personal'] },
  { id: 'q37', text: 'You can\'t use up creativity. The more you use, the more you have.', attribution: 'Maya Angelou', tags: ['creativity', 'personal'] },
  { id: 'q38', text: 'Every artist was first an amateur.', attribution: 'Ralph Waldo Emerson', tags: ['creativity', 'personal', 'motivate'] },
  { id: 'q39', text: 'Make something today, even if it is small.', attribution: '24', tags: ['creativity', 'personal', 'motivate'] },

  // Gratitude / friends / family
  { id: 'q40', text: 'The quality of your life is the quality of your relationships.', attribution: 'Tony Robbins', tags: ['family', 'friends', 'personal'] },
  { id: 'q41', text: 'Gratitude turns what we have into enough.', attribution: 'Aesop', tags: ['comfort', 'personal', 'family'] },
  { id: 'q42', text: 'Tell the people you love that you love them. Today.', attribution: '24', tags: ['family', 'friends', 'care', 'personal'] },
  { id: 'q43', text: 'You are the average of the five people you spend the most time with.', attribution: 'Jim Rohn', tags: ['friends', 'personal'] },

  // Resilience
  { id: 'q44', text: 'Fall seven times, stand up eight.', attribution: 'Japanese Proverb', tags: ['resilience', 'motivate', 'comfort'] },
  { id: 'q45', text: 'Life is 10% what happens to you and 90% how you respond to it.', attribution: 'Charles Swindoll', tags: ['resilience', 'motivate'] },
  { id: 'q46', text: 'Tough times never last, but tough people do.', attribution: 'Robert H. Schuller', tags: ['resilience', 'comfort', 'motivate'] },
  { id: 'q47', text: 'When you can\'t control what\'s happening, challenge yourself to control how you respond.', attribution: 'Unknown', tags: ['resilience', 'calm', 'personal'] },

  // Learning / school
  { id: 'q48', text: 'An investment in knowledge pays the best interest.', attribution: 'Benjamin Franklin', tags: ['school', 'work', 'motivate'] },
  { id: 'q49', text: 'Education is not the filling of a pail but the lighting of a fire.', attribution: 'W.B. Yeats', tags: ['school', 'personal', 'motivate'] },
  { id: 'q50', text: 'The more that you read, the more things you will know.', attribution: 'Dr. Seuss', tags: ['school', 'personal', 'creativity'] },
  { id: 'q51', text: 'Learning never exhausts the mind.', attribution: 'Leonardo da Vinci', tags: ['school', 'work', 'personal'] },

  // Money / discipline
  { id: 'q52', text: 'Do not save what is left after spending, but spend what is left after saving.', attribution: 'Warren Buffett', tags: ['money', 'work', 'focus'] },
  { id: 'q53', text: 'Financial freedom is available to those who learn about it and work for it.', attribution: 'Robert Kiyosaki', tags: ['money', 'work', 'motivate'] },

  // Balance
  { id: 'q54', text: 'You can have it all, just not all at once.', attribution: 'Oprah Winfrey', tags: ['balance', 'personal', 'comfort'] },
  { id: 'q55', text: 'Balance is not something you find. It is something you create.', attribution: '24', tags: ['balance', 'personal', 'work'] },
  { id: 'q56', text: 'What you do every day matters more than what you do once in a while.', attribution: 'Gretchen Rubin', tags: ['motivate', 'work', 'personal'] },
  { id: 'q57', text: 'Progress is more important than perfection.', attribution: '24', tags: ['motivate', 'personal', 'comfort'] },
  { id: 'q58', text: 'Your future is created by what you do today, not tomorrow.', attribution: 'Robert Kiyosaki', tags: ['motivate', 'work', 'challenge'] },
  { id: 'q59', text: 'The only person you should try to be better than is who you were yesterday.', attribution: 'Unknown', tags: ['motivate', 'personal', 'challenge'] },
  { id: 'q60', text: 'Discipline is choosing between what you want now and what you want most.', attribution: 'Abraham Lincoln (attributed)', tags: ['focus', 'work', 'challenge'] },
];
