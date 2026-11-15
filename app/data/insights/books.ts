// books.ts — ~40 book recommendations for treat deliveries.
// All appropriate for a general audience.

import type { Pillar } from '../../types';

export interface BookItem {
  id: string;
  title: string;
  author: string;
  pitch: string;
  tags: string[];
  pillars: Pillar[];
}

export const BOOKS: BookItem[] = [
  // Work / productivity
  { id: 'b01', title: 'Deep Work', author: 'Cal Newport', pitch: 'How to do your best thinking in a world full of distraction.', tags: ['focus', 'work', 'motivate'], pillars: ['work'] },
  { id: 'b02', title: 'Atomic Habits', author: 'James Clear', pitch: 'Tiny changes compound into remarkable results over time.', tags: ['motivate', 'work', 'personal'], pillars: ['work', 'personal'] },
  { id: 'b03', title: 'Getting Things Done', author: 'David Allen', pitch: 'A trusted system to clear your mind and get more done.', tags: ['focus', 'work'], pillars: ['work'] },
  { id: 'b04', title: 'The One Thing', author: 'Gary Keller', pitch: 'Focus on what matters most and let everything else follow.', tags: ['focus', 'work', 'motivate'], pillars: ['work'] },
  { id: 'b05', title: 'Essentialism', author: 'Greg McKeown', pitch: 'Do less, but better — the disciplined pursuit of less.', tags: ['focus', 'work', 'personal'], pillars: ['work', 'personal'] },
  { id: 'b06', title: 'The 4-Hour Workweek', author: 'Tim Ferriss', pitch: 'A radical guide to escaping the 9-5 and designing your ideal life.', tags: ['work', 'personal', 'motivate'], pillars: ['work', 'personal'] },
  { id: 'b07', title: 'So Good They Can\'t Ignore You', author: 'Cal Newport', pitch: 'Build rare, valuable skills instead of chasing passion.', tags: ['work', 'motivate', 'challenge'], pillars: ['work'] },

  // Personal growth
  { id: 'b08', title: 'Mindset', author: 'Carol Dweck', pitch: 'The growth mindset that turns setbacks into stepping stones.', tags: ['motivate', 'personal', 'resilience'], pillars: ['personal'] },
  { id: 'b09', title: 'The Power of Now', author: 'Eckhart Tolle', pitch: 'Learning to live fully in the present moment.', tags: ['calm', 'personal', 'comfort'], pillars: ['personal', 'care'] },
  { id: 'b10', title: 'Daring Greatly', author: 'Brené Brown', pitch: 'Why vulnerability is not weakness but the birthplace of connection.', tags: ['personal', 'comfort', 'family'], pillars: ['personal'] },
  { id: 'b11', title: 'Man\'s Search for Meaning', author: 'Viktor Frankl', pitch: 'Finding purpose in the most difficult circumstances.', tags: ['resilience', 'personal', 'comfort'], pillars: ['personal'] },
  { id: 'b12', title: 'The Alchemist', author: 'Paulo Coelho', pitch: 'A shepherd\'s journey to find treasure and discover his destiny.', tags: ['motivate', 'personal', 'comfort'], pillars: ['personal'] },
  { id: 'b13', title: 'You Are a Badass', author: 'Jen Sincero', pitch: 'Stop doubting your greatness and start living an awesome life.', tags: ['motivate', 'personal', 'energize'], pillars: ['personal'] },

  // Health / care
  { id: 'b14', title: 'Why We Sleep', author: 'Matthew Walker', pitch: 'The science of sleep and why it changes everything.', tags: ['sleep', 'care', 'health'], pillars: ['sleep', 'care'] },
  { id: 'b15', title: 'The Body Keeps the Score', author: 'Bessel van der Kolk', pitch: 'How the body holds stress and how to release it.', tags: ['care', 'health', 'personal'], pillars: ['care', 'personal'] },
  { id: 'b16', title: 'Spark', author: 'John J. Ratey', pitch: 'The revolutionary science of exercise and the brain.', tags: ['fitness', 'care', 'energize'], pillars: ['care', 'personal'] },
  { id: 'b17', title: 'The Willpower Instinct', author: 'Kelly McGonigal', pitch: 'Understanding self-control and using it in everyday life.', tags: ['focus', 'personal', 'work'], pillars: ['personal', 'work'] },
  { id: 'b18', title: 'Full Catastrophe Living', author: 'Jon Kabat-Zinn', pitch: 'Using the wisdom of your body and mind to face stress and illness.', tags: ['calm', 'care', 'health', 'comfort'], pillars: ['care', 'personal'] },

  // Creativity
  { id: 'b19', title: 'Big Magic', author: 'Elizabeth Gilbert', pitch: 'Living a creative life beyond fear.', tags: ['creativity', 'personal', 'motivate'], pillars: ['personal'] },
  { id: 'b20', title: 'Steal Like an Artist', author: 'Austin Kleon', pitch: 'Ten things nobody told you about being creative.', tags: ['creativity', 'personal', 'work'], pillars: ['personal'] },
  { id: 'b21', title: 'Bird by Bird', author: 'Anne Lamott', pitch: 'Practical advice for writing and life, one small step at a time.', tags: ['creativity', 'personal', 'comfort'], pillars: ['personal'] },

  // Finance
  { id: 'b22', title: 'The Psychology of Money', author: 'Morgan Housel', pitch: 'Timeless lessons on wealth, greed, and happiness.', tags: ['money', 'personal', 'work'], pillars: ['work', 'personal'] },
  { id: 'b23', title: 'I Will Teach You to Be Rich', author: 'Ramit Sethi', pitch: 'A six-week system for getting your financial life together.', tags: ['money', 'work', 'personal'], pillars: ['work', 'personal'] },

  // Relationships
  { id: 'b24', title: 'How to Win Friends and Influence People', author: 'Dale Carnegie', pitch: 'Classic principles for getting along with people and succeeding.', tags: ['friends', 'work', 'personal'], pillars: ['personal'] },
  { id: 'b25', title: 'The 5 Love Languages', author: 'Gary Chapman', pitch: 'Understanding how you and the people you love feel most cared for.', tags: ['family', 'friends', 'personal', 'care'], pillars: ['personal', 'care'] },
  { id: 'b26', title: 'Attached', author: 'Amir Levine & Rachel Heller', pitch: 'The science of adult attachment and how it shapes every relationship.', tags: ['personal', 'friends', 'family'], pillars: ['personal'] },

  // Adventure / escapism
  { id: 'b27', title: 'Into the Wild', author: 'Jon Krakauer', pitch: 'A young man walks away from society to live alone in the Alaskan wilderness.', tags: ['nature', 'personal', 'comfort'], pillars: ['personal'] },
  { id: 'b28', title: 'The Old Man and the Sea', author: 'Ernest Hemingway', pitch: 'A Cuban fisherman\'s struggle with a giant marlin and his own limits.', tags: ['resilience', 'personal'], pillars: ['personal'] },
  { id: 'b29', title: 'Wild', author: 'Cheryl Strayed', pitch: 'A solo hike along 1,100 miles of the Pacific Crest Trail after personal loss.', tags: ['nature', 'resilience', 'personal', 'comfort'], pillars: ['personal', 'care'] },

  // School / learning
  { id: 'b30', title: 'Make It Stick', author: 'Peter Brown et al.', pitch: 'The science of successful learning and how to study smarter.', tags: ['school', 'work', 'focus'], pillars: ['work', 'personal'] },
  { id: 'b31', title: 'A Mind for Numbers', author: 'Barbara Oakley', pitch: 'How to excel at math and science — even if you flunked algebra.', tags: ['school', 'focus', 'work'], pillars: ['work', 'personal'] },
  { id: 'b32', title: 'Educated', author: 'Tara Westover', pitch: 'A memoir about pursuing education against extraordinary odds.', tags: ['school', 'resilience', 'personal', 'motivate'], pillars: ['personal'] },

  // Comfort reads
  { id: 'b33', title: 'The Little Prince', author: 'Antoine de Saint-Exupéry', pitch: 'A timeless story about life, love, and what truly matters.', tags: ['comfort', 'personal', 'family'], pillars: ['personal'] },
  { id: 'b34', title: 'Stardust', author: 'Neil Gaiman', pitch: 'A young man crosses a wall into a magical land to find a fallen star.', tags: ['comfort', 'personal', 'creativity'], pillars: ['personal'] },
  { id: 'b35', title: 'A Gentleman in Moscow', author: 'Amor Towles', pitch: 'A count under house arrest finds richness in his shrinking world.', tags: ['comfort', 'resilience', 'personal'], pillars: ['personal'] },
  { id: 'b36', title: 'The Hitchhiker\'s Guide to the Galaxy', author: 'Douglas Adams', pitch: 'The funniest book about the end of the world ever written.', tags: ['comfort', 'personal', 'creativity'], pillars: ['personal'] },

  // Misc
  { id: 'b37', title: 'Outliers', author: 'Malcolm Gladwell', pitch: 'The story of success: why some people achieve so much.', tags: ['motivate', 'work', 'school'], pillars: ['work', 'personal'] },
  { id: 'b38', title: 'Ikigai', author: 'Héctor García & Francesc Miralles', pitch: 'The Japanese secret to a long and happy life.', tags: ['personal', 'comfort', 'calm'], pillars: ['personal', 'care'] },
  { id: 'b39', title: 'The Subtle Art of Not Giving a F*ck', author: 'Mark Manson', pitch: 'A counterintuitive approach to living a good life.', tags: ['comfort', 'personal', 'resilience'], pillars: ['personal'] },
  { id: 'b40', title: 'Breath', author: 'James Nestor', pitch: 'The new science of a lost art that can change your mind and body.', tags: ['care', 'health', 'calm', 'sleep'], pillars: ['care', 'sleep'] },
];
