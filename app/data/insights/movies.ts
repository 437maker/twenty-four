// movies.ts — ~40 movie and TV show recommendations for treat deliveries.
// All appropriate for a general audience. No explicit content.

import type { Pillar } from '../../types';

export interface MovieItem {
  id: string;
  title: string;
  year: number;
  pitch: string;
  tags: string[];
  pillars: Pillar[];
}

export const MOVIES: MovieItem[] = [
  // Comfort / feel-good
  { id: 'm01', title: 'The Secret Life of Walter Mitty', year: 2013, pitch: 'A daydreamer breaks free and discovers the world is more adventurous than his fantasies.', tags: ['comfort', 'motivate', 'nature', 'personal'], pillars: ['personal'] },
  { id: 'm02', title: 'Julie & Julia', year: 2009, pitch: 'Two women, decades apart, find passion through cooking. A warm story about starting something.', tags: ['comfort', 'creativity', 'personal', 'motivate'], pillars: ['personal'] },
  { id: 'm03', title: 'Soul', year: 2020, pitch: 'A jazz musician discovers what makes life truly worth living.', tags: ['comfort', 'personal', 'motivate'], pillars: ['personal'] },
  { id: 'm04', title: 'Up', year: 2009, pitch: 'An old man flies to South America in a floating house to honor his late wife\'s dream.', tags: ['comfort', 'family', 'resilience'], pillars: ['personal', 'care'] },
  { id: 'm05', title: 'About Time', year: 2013, pitch: 'A man who can travel through time learns to live each ordinary day beautifully.', tags: ['comfort', 'family', 'personal'], pillars: ['personal', 'care'] },
  { id: 'm06', title: 'The Pursuit of Happyness', year: 2006, pitch: 'A struggling salesman works his way out of homelessness with his son at his side.', tags: ['motivate', 'resilience', 'work', 'family'], pillars: ['work', 'personal'] },
  { id: 'm07', title: 'Chef', year: 2014, pitch: 'A chef leaves his restaurant job and starts a food truck to reconnect with his passion.', tags: ['comfort', 'creativity', 'personal', 'work'], pillars: ['personal', 'work'] },

  // Motivate / challenge
  { id: 'm08', title: 'Whiplash', year: 2014, pitch: 'A driven drummer pushes himself to excellence under a terrifying teacher.', tags: ['challenge', 'motivate', 'work', 'school'], pillars: ['work', 'personal'] },
  { id: 'm09', title: 'The Social Network', year: 2010, pitch: 'The relentless story of how Facebook was built in a dorm room.', tags: ['challenge', 'motivate', 'work', 'school'], pillars: ['work'] },
  { id: 'm10', title: 'Rocky', year: 1976, pitch: 'A small-time boxer gets a once-in-a-lifetime shot at the heavyweight champion.', tags: ['motivate', 'challenge', 'fitness', 'resilience'], pillars: ['personal', 'care'] },
  { id: 'm11', title: 'The Shawshank Redemption', year: 1994, pitch: 'A man wrongly imprisoned keeps hope alive through patience and friendship.', tags: ['resilience', 'comfort', 'personal', 'motivate'], pillars: ['personal'] },
  { id: 'm12', title: 'Hidden Figures', year: 2016, pitch: 'Three Black women at NASA help launch the first American into orbit against all odds.', tags: ['motivate', 'challenge', 'work', 'school'], pillars: ['work', 'personal'] },
  { id: 'm13', title: 'Billy Elliot', year: 2000, pitch: 'A coal-mining town boy finds his calling in ballet despite everyone\'s expectations.', tags: ['motivate', 'creativity', 'personal', 'family'], pillars: ['personal'] },

  // Nature / adventure
  { id: 'm14', title: 'Free Solo', year: 2018, pitch: 'Alex Honnold climbs El Capitan without a rope. A film about focus and fear.', tags: ['challenge', 'nature', 'fitness', 'motivate'], pillars: ['personal', 'care'] },
  { id: 'm15', title: 'Into the Wild', year: 2007, pitch: 'A young man gives away everything to live in the Alaskan wilderness.', tags: ['nature', 'personal', 'comfort'], pillars: ['personal'] },
  { id: 'm16', title: 'Midsommar', year: 2019, pitch: 'A grieving woman travels to Sweden for a midsummer festival with unsettling results.', tags: ['personal'], pillars: ['personal'] },
  { id: 'm17', title: 'The Revenant', year: 2015, pitch: 'A frontiersman survives a bear attack and endures the wilderness to find justice.', tags: ['resilience', 'nature', 'challenge'], pillars: ['personal'] },
  { id: 'm18', title: 'Wild', year: 2014, pitch: 'A woman hikes over 1,000 miles of the Pacific Crest Trail to rebuild her life.', tags: ['nature', 'resilience', 'personal', 'fitness'], pillars: ['personal', 'care'] },

  // Creativity / inspiration
  { id: 'm19', title: 'Ratatouille', year: 2007, pitch: 'A rat with a gift for cooking teams up with a kitchen boy in Paris.', tags: ['creativity', 'motivate', 'comfort', 'work'], pillars: ['work', 'personal'] },
  { id: 'm20', title: 'La La Land', year: 2016, pitch: 'Two dreamers fall in love while chasing their ambitions in Los Angeles.', tags: ['creativity', 'personal', 'motivate'], pillars: ['personal'] },
  { id: 'm21', title: 'Jiro Dreams of Sushi', year: 2011, pitch: 'An 85-year-old sushi master\'s lifelong quest for perfection.', tags: ['work', 'motivate', 'focus', 'challenge'], pillars: ['work'] },
  { id: 'm22', title: 'Midnight in Paris', year: 2011, pitch: 'A nostalgic writer magically visits 1920s Paris and meets his literary heroes.', tags: ['creativity', 'personal', 'comfort'], pillars: ['personal'] },

  // Family / friends
  { id: 'm23', title: 'The Intern', year: 2015, pitch: 'A 70-year-old intern at a startup teaches his young boss a thing or two about life.', tags: ['work', 'friends', 'personal', 'comfort'], pillars: ['work', 'personal'] },
  { id: 'm24', title: 'Paddington 2', year: 2017, pitch: 'A bear with the best manners and a heart of gold makes London a little kinder.', tags: ['comfort', 'family', 'personal'], pillars: ['personal', 'care'] },
  { id: 'm25', title: 'Big Fish', year: 2003, pitch: 'A son tries to separate fact from legend in his father\'s fantastical life stories.', tags: ['family', 'personal', 'comfort', 'creativity'], pillars: ['personal'] },

  // Health / mindfulness (documentary or drama)
  { id: 'm26', title: 'Heal', year: 2017, pitch: 'A documentary exploring the science and stories behind the mind-body connection.', tags: ['health', 'care', 'calm', 'personal'], pillars: ['care', 'personal'] },
  { id: 'm27', title: 'Walk with Me', year: 2017, pitch: 'A quiet, beautiful film following Buddhist monk Thich Nhat Hanh\'s community.', tags: ['calm', 'care', 'personal', 'nature'], pillars: ['care', 'personal'] },

  // TV shows (great for multi-day watching)
  { id: 'm28', title: 'The Bear (Season 1)', year: 2022, pitch: 'A fine-dining chef returns home to run his family\'s sandwich shop. Brilliant and intense.', tags: ['work', 'family', 'challenge', 'creativity'], pillars: ['work', 'personal'] },
  { id: 'm29', title: 'Ted Lasso (Season 1)', year: 2020, pitch: 'An American football coach goes to England to manage soccer with zero soccer knowledge — and pure heart.', tags: ['comfort', 'motivate', 'friends', 'work'], pillars: ['work', 'personal'] },
  { id: 'm30', title: 'Schitt\'s Creek', year: 2015, pitch: 'A spoiled rich family loses everything and rebuilds from a tiny town.', tags: ['comfort', 'family', 'personal', 'resilience'], pillars: ['personal'] },
  { id: 'm31', title: 'Planet Earth II', year: 2016, pitch: 'The most breathtaking wildlife footage ever made. Watch it on the biggest screen you can find.', tags: ['nature', 'calm', 'comfort'], pillars: ['personal'] },
  { id: 'm32', title: 'Avatar: The Last Airbender', year: 2005, pitch: 'A young hero must master all four elements to save the world. One of the best stories ever told on TV.', tags: ['motivate', 'personal', 'comfort', 'resilience'], pillars: ['personal'] },
  { id: 'm33', title: 'The Queen\'s Gambit', year: 2020, pitch: 'A chess prodigy rises to the top while navigating her inner demons.', tags: ['focus', 'challenge', 'personal', 'motivate'], pillars: ['work', 'personal'] },
  { id: 'm34', title: 'Chef\'s Table', year: 2015, pitch: 'Intimate profiles of the world\'s most visionary chefs and what drives them.', tags: ['creativity', 'motivate', 'work', 'challenge'], pillars: ['work', 'personal'] },

  // Misc
  { id: 'm35', title: 'Good Will Hunting', year: 1997, pitch: 'A self-taught genius from South Boston discovers that intelligence alone doesn\'t build a life.', tags: ['personal', 'resilience', 'school', 'motivate'], pillars: ['personal'] },
  { id: 'm36', title: 'Dead Poets Society', year: 1989, pitch: 'An inspiring English teacher dares his students to seize the day.', tags: ['school', 'motivate', 'creativity', 'personal'], pillars: ['personal', 'work'] },
  { id: 'm37', title: 'The Truman Show', year: 1998, pitch: 'A man discovers his entire life has been a TV show. What would you change if you could start over?', tags: ['personal', 'motivate', 'comfort'], pillars: ['personal'] },
  { id: 'm38', title: 'Encanto', year: 2021, pitch: 'A Colombian family each has a magical gift — except one girl, who discovers the real magic is in showing up.', tags: ['family', 'comfort', 'personal', 'motivate'], pillars: ['personal', 'care'] },
  { id: 'm39', title: 'Hoop Dreams', year: 1994, pitch: 'A landmark documentary following two Chicago teens who dream of playing in the NBA.', tags: ['motivate', 'resilience', 'challenge', 'family'], pillars: ['personal'] },
  { id: 'm40', title: 'Turning Red', year: 2022, pitch: 'A 13-year-old girl turns into a giant red panda when she gets too excited. A warm story about growing up.', tags: ['comfort', 'family', 'personal'], pillars: ['personal', 'care'] },
  // Craft and practice: for a week when follow-through was rough
  { id: 'm41', title: 'The Karate Kid', year: 1984, pitch: 'A teenager learns karate through chores that seem pointless, until they turn out to be the training.', tags: ['process', 'small-wins', 'motivate', 'comfort'], pillars: ['personal'] },
  { id: 'm42', title: 'Searching for Bobby Fischer', year: 1993, pitch: 'A young chess player and the adults around him work out how to love the game and still get better at it.', tags: ['process', 'family', 'school'], pillars: ['personal'] },
  { id: 'm43', title: 'My Octopus Teacher', year: 2020, pitch: 'A man swims in the same cold bay every day for a year, and the daily visit changes him.', tags: ['process', 'small-wins', 'nature', 'calm'], pillars: ['personal', 'care'] },
  { id: 'm44', title: 'Akeelah and the Bee', year: 2006, pitch: 'An 11-year-old trains for the national spelling bee one word list at a time, with her whole street helping.', tags: ['process', 'small-wins', 'school', 'family', 'motivate'], pillars: ['personal'] },
];
