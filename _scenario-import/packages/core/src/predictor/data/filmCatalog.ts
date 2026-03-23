import type { MarketLocale } from '../../shared/MarketConfig';

export interface CatalogFilm {
  title: string;
  year: number;
  genres: string[];
  budget: number;
  revenue: number;
  roi: number;
  rating: string;
  tropes: string[];
  narrativeTraits: {
    dialogueHeavy: boolean;
    actionHeavy: boolean;
    emotionalVolatility: 'low' | 'medium' | 'high';
    pacing: 'slow' | 'moderate' | 'fast';
    arcType?: string;
  };
  market?: MarketLocale;
  // Extended fields (Phase 2.5)
  runtime?: number;          // runtime in minutes
  releaseMonth?: number;     // 1-12
  castSize?: number;         // principal cast count
  vfxComplexity?: 'low' | 'medium' | 'high';
  locationCount?: number;    // estimated unique locations
  awards?: string[];         // notable awards (Oscar, Cannes, etc.)
}

export const FILM_CATALOG: CatalogFilm[] = [
  // ─── Action (10) ───
  { title: "Mad Max: Fury Road", year: 2015, genres: ["Action", "Sci-Fi"], budget: 150_000_000, revenue: 375_200_000, roi: 2.5, rating: "R",
    tropes: ["Chase Movie", "Post-Apocalypse", "Strong Female Lead", "Practical Stunts"],
    narrativeTraits: { dialogueHeavy: false, actionHeavy: true, emotionalVolatility: 'high', pacing: 'fast', arcType: 'man-in-a-hole' }, runtime: 120, releaseMonth: 5, vfxComplexity: 'high' },
  { title: "John Wick", year: 2014, genres: ["Action", "Thriller"], budget: 20_000_000, revenue: 86_000_000, roi: 4.3, rating: "R",
    tropes: ["Revenge", "One-Man Army", "Anti-Hero", "Underworld"],
    narrativeTraits: { dialogueHeavy: false, actionHeavy: true, emotionalVolatility: 'medium', pacing: 'fast', arcType: 'man-in-a-hole' }, runtime: 101, releaseMonth: 10, vfxComplexity: 'low' },
  { title: "Die Hard", year: 1988, genres: ["Action", "Thriller"], budget: 28_000_000, revenue: 140_800_000, roi: 5.03, rating: "R",
    tropes: ["Trapped", "One-Man Army", "Christmas Setting", "Everyman Hero"],
    narrativeTraits: { dialogueHeavy: false, actionHeavy: true, emotionalVolatility: 'high', pacing: 'fast', arcType: 'man-in-a-hole' }, runtime: 132, releaseMonth: 7, vfxComplexity: 'medium' },
  { title: "The Dark Knight", year: 2008, genres: ["Action", "Crime", "Drama"], budget: 185_000_000, revenue: 1_004_600_000, roi: 5.43, rating: "PG-13",
    tropes: ["Superhero", "Anti-Hero", "Tragic Villain", "Moral Dilemma"],
    narrativeTraits: { dialogueHeavy: false, actionHeavy: true, emotionalVolatility: 'high', pacing: 'fast', arcType: 'man-in-a-hole' }, runtime: 152, releaseMonth: 7, vfxComplexity: 'high' },
  { title: "Top Gun: Maverick", year: 2022, genres: ["Action", "Drama"], budget: 170_000_000, revenue: 1_493_800_000, roi: 8.79, rating: "PG-13",
    tropes: ["Mentor", "Legacy Sequel", "Practical Stunts", "Military"],
    narrativeTraits: { dialogueHeavy: false, actionHeavy: true, emotionalVolatility: 'medium', pacing: 'fast', arcType: 'rags-to-riches' }, runtime: 130, releaseMonth: 5, vfxComplexity: 'high' },
  { title: "Mission: Impossible – Fallout", year: 2018, genres: ["Action", "Adventure"], budget: 178_000_000, revenue: 791_100_000, roi: 4.44, rating: "PG-13",
    tropes: ["Spy", "Double Cross", "Practical Stunts", "Ticking Clock"],
    narrativeTraits: { dialogueHeavy: false, actionHeavy: true, emotionalVolatility: 'high', pacing: 'fast', arcType: 'man-in-a-hole' }, runtime: 147, releaseMonth: 7, vfxComplexity: 'high' },
  { title: "Gladiator", year: 2000, genres: ["Action", "Drama", "History"], budget: 103_000_000, revenue: 460_500_000, roi: 4.47, rating: "R",
    tropes: ["Revenge", "Fallen Hero", "Arena", "Historical Epic"],
    narrativeTraits: { dialogueHeavy: false, actionHeavy: true, emotionalVolatility: 'high', pacing: 'moderate', arcType: 'man-in-a-hole' }, runtime: 155, releaseMonth: 5, vfxComplexity: 'high' },
  { title: "Kill Bill: Vol. 1", year: 2003, genres: ["Action", "Crime"], budget: 30_000_000, revenue: 180_900_000, roi: 6.03, rating: "R",
    tropes: ["Revenge", "Strong Female Lead", "Martial Arts", "Non-Linear"],
    narrativeTraits: { dialogueHeavy: false, actionHeavy: true, emotionalVolatility: 'high', pacing: 'fast', arcType: 'rags-to-riches' }, runtime: 111, releaseMonth: 10, vfxComplexity: 'medium' },
  { title: "Baby Driver", year: 2017, genres: ["Action", "Crime", "Music"], budget: 34_000_000, revenue: 226_900_000, roi: 6.67, rating: "R",
    tropes: ["Heist", "Music Driven", "Getaway Driver", "Romance"],
    narrativeTraits: { dialogueHeavy: false, actionHeavy: true, emotionalVolatility: 'medium', pacing: 'fast', arcType: 'icarus' }, runtime: 113, releaseMonth: 6, vfxComplexity: 'low' },
  { title: "The Raid", year: 2011, genres: ["Action", "Thriller"], budget: 1_100_000, revenue: 9_100_000, roi: 8.27, rating: "R",
    tropes: ["Trapped", "Martial Arts", "One-Man Army", "Survival"],
    narrativeTraits: { dialogueHeavy: false, actionHeavy: true, emotionalVolatility: 'high', pacing: 'fast', arcType: 'man-in-a-hole' }, runtime: 101, releaseMonth: 3, vfxComplexity: 'low' },

  // ─── Drama (10) ───
  { title: "The Shawshank Redemption", year: 1994, genres: ["Drama"], budget: 25_000_000, revenue: 58_300_000, roi: 2.33, rating: "R",
    tropes: ["Prison", "Wrongful Conviction", "Hope", "Friendship"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'medium', pacing: 'slow', arcType: 'man-in-a-hole' }, runtime: 142, releaseMonth: 9, vfxComplexity: 'low' },
  { title: "The Social Network", year: 2010, genres: ["Drama", "Biography"], budget: 40_000_000, revenue: 224_900_000, roi: 5.62, rating: "PG-13",
    tropes: ["Rise to Power", "Betrayal", "Tech World", "Based on True Story"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'medium', pacing: 'fast', arcType: 'icarus' }, runtime: 120, releaseMonth: 10, vfxComplexity: 'low' },
  { title: "Whiplash", year: 2014, genres: ["Drama", "Music"], budget: 3_300_000, revenue: 49_000_000, roi: 14.85, rating: "R",
    tropes: ["Obsession", "Mentor from Hell", "Music", "Coming of Age"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'high', pacing: 'fast', arcType: 'man-in-a-hole' }, runtime: 107, releaseMonth: 10, vfxComplexity: 'low' },
  { title: "Parasite", year: 2019, genres: ["Drama", "Thriller"], budget: 11_400_000, revenue: 263_100_000, roi: 23.08, rating: "R",
    tropes: ["Class Divide", "Twist Ending", "Dark Comedy", "Family"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'high', pacing: 'moderate', arcType: 'icarus' }, runtime: 132, releaseMonth: 5, vfxComplexity: 'low' },
  { title: "12 Angry Men", year: 1957, genres: ["Drama"], budget: 350_000, revenue: 4_400_000, roi: 12.57, rating: "PG",
    tropes: ["Bottle Episode", "Jury", "Moral Debate", "Single Location"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'medium', pacing: 'moderate', arcType: 'rags-to-riches' }, runtime: 96, releaseMonth: 4, vfxComplexity: 'low' },
  { title: "Moonlight", year: 2016, genres: ["Drama"], budget: 4_000_000, revenue: 65_300_000, roi: 16.33, rating: "R",
    tropes: ["Coming of Age", "Identity", "Poverty", "Three-Act Life"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'medium', pacing: 'slow', arcType: 'cinderella' }, runtime: 111, releaseMonth: 10, vfxComplexity: 'low' },
  { title: "There Will Be Blood", year: 2007, genres: ["Drama", "History"], budget: 25_000_000, revenue: 76_200_000, roi: 3.05, rating: "R",
    tropes: ["Rise to Power", "Obsession", "Period Piece", "Anti-Hero"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'high', pacing: 'slow', arcType: 'icarus' }, runtime: 158, releaseMonth: 12, vfxComplexity: 'low' },
  { title: "Good Will Hunting", year: 1997, genres: ["Drama", "Romance"], budget: 10_000_000, revenue: 225_900_000, roi: 22.59, rating: "R",
    tropes: ["Hidden Genius", "Mentor", "Coming of Age", "Therapy"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'medium', pacing: 'moderate', arcType: 'rags-to-riches' }, runtime: 126, releaseMonth: 12, vfxComplexity: 'low' },
  { title: "The Godfather", year: 1972, genres: ["Drama", "Crime"], budget: 6_000_000, revenue: 250_000_000, roi: 41.67, rating: "R",
    tropes: ["Rise to Power", "Family", "Mafia", "Succession"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'high', pacing: 'moderate', arcType: 'oedipus' }, runtime: 175, releaseMonth: 3, vfxComplexity: 'low' },
  { title: "A Beautiful Mind", year: 2001, genres: ["Drama", "Biography"], budget: 58_000_000, revenue: 313_500_000, roi: 5.41, rating: "PG-13",
    tropes: ["Hidden Genius", "Mental Illness", "Based on True Story", "Twist Ending"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'high', pacing: 'moderate', arcType: 'man-in-a-hole' }, runtime: 135, releaseMonth: 12, vfxComplexity: 'low' },

  // ─── Sci-Fi (8) ───
  { title: "Inception", year: 2010, genres: ["Sci-Fi", "Action", "Thriller"], budget: 160_000_000, revenue: 836_800_000, roi: 5.23, rating: "PG-13",
    tropes: ["Heist", "Dream World", "Non-Linear", "Mind-Bending"],
    narrativeTraits: { dialogueHeavy: false, actionHeavy: true, emotionalVolatility: 'high', pacing: 'fast', arcType: 'man-in-a-hole' }, runtime: 148, releaseMonth: 7, vfxComplexity: 'high' },
  { title: "Blade Runner 2049", year: 2017, genres: ["Sci-Fi", "Drama"], budget: 150_000_000, revenue: 259_200_000, roi: 1.73, rating: "R",
    tropes: ["Dystopia", "Identity", "Neo-Noir", "AI Consciousness"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'low', pacing: 'slow', arcType: 'rags-to-riches' }, runtime: 164, releaseMonth: 10, vfxComplexity: 'high' },
  { title: "Interstellar", year: 2014, genres: ["Sci-Fi", "Drama", "Adventure"], budget: 165_000_000, revenue: 701_700_000, roi: 4.25, rating: "PG-13",
    tropes: ["Space Exploration", "Time Dilation", "Family", "Sacrifice"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'high', pacing: 'moderate', arcType: 'man-in-a-hole' }, runtime: 169, releaseMonth: 11, vfxComplexity: 'high' },
  { title: "The Matrix", year: 1999, genres: ["Sci-Fi", "Action"], budget: 63_000_000, revenue: 463_500_000, roi: 7.36, rating: "R",
    tropes: ["Chosen One", "Simulation", "Martial Arts", "Red Pill"],
    narrativeTraits: { dialogueHeavy: false, actionHeavy: true, emotionalVolatility: 'high', pacing: 'fast', arcType: 'rags-to-riches' }, runtime: 136, releaseMonth: 3, vfxComplexity: 'high' },
  { title: "Arrival", year: 2016, genres: ["Sci-Fi", "Drama"], budget: 47_000_000, revenue: 203_400_000, roi: 4.33, rating: "PG-13",
    tropes: ["First Contact", "Non-Linear", "Linguistics", "Time Loop"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'medium', pacing: 'slow', arcType: 'cinderella' }, runtime: 116, releaseMonth: 11, vfxComplexity: 'medium' },
  { title: "Ex Machina", year: 2014, genres: ["Sci-Fi", "Thriller"], budget: 15_000_000, revenue: 36_900_000, roi: 2.46, rating: "R",
    tropes: ["AI Consciousness", "Bottle Episode", "Twist Ending", "Single Location"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'medium', pacing: 'moderate', arcType: 'icarus' }, runtime: 108, releaseMonth: 4, vfxComplexity: 'medium' },
  { title: "Dune", year: 2021, genres: ["Sci-Fi", "Adventure"], budget: 165_000_000, revenue: 401_800_000, roi: 2.44, rating: "PG-13",
    tropes: ["Chosen One", "Political Intrigue", "Desert World", "Epic"],
    narrativeTraits: { dialogueHeavy: false, actionHeavy: true, emotionalVolatility: 'medium', pacing: 'moderate', arcType: 'rags-to-riches' }, runtime: 155, releaseMonth: 10, vfxComplexity: 'high' },
  { title: "District 9", year: 2009, genres: ["Sci-Fi", "Action"], budget: 30_000_000, revenue: 210_800_000, roi: 7.03, rating: "R",
    tropes: ["Apartheid Allegory", "Found Footage", "Alien", "Transformation"],
    narrativeTraits: { dialogueHeavy: false, actionHeavy: true, emotionalVolatility: 'high', pacing: 'moderate', arcType: 'oedipus' }, runtime: 112, releaseMonth: 8, vfxComplexity: 'high' },

  // ─── Comedy (6) ───
  { title: "The Grand Budapest Hotel", year: 2014, genres: ["Comedy", "Drama", "Crime"], budget: 25_000_000, revenue: 172_900_000, roi: 6.92, rating: "R",
    tropes: ["Heist", "Quirky Mentor", "Period Piece", "Ensemble Cast"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'medium', pacing: 'fast', arcType: 'man-in-a-hole' }, runtime: 99, releaseMonth: 3, vfxComplexity: 'low' },
  { title: "Superbad", year: 2007, genres: ["Comedy"], budget: 20_000_000, revenue: 169_900_000, roi: 8.5, rating: "R",
    tropes: ["Coming of Age", "Buddy Comedy", "High School", "Party"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'low', pacing: 'fast', arcType: 'rags-to-riches' }, runtime: 113, releaseMonth: 8, vfxComplexity: 'low' },
  { title: "Bridesmaids", year: 2011, genres: ["Comedy", "Romance"], budget: 32_500_000, revenue: 288_400_000, roi: 8.87, rating: "R",
    tropes: ["Ensemble Cast", "Wedding", "Female Led", "Rivalry"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'medium', pacing: 'moderate', arcType: 'man-in-a-hole' }, runtime: 125, releaseMonth: 5, vfxComplexity: 'low' },
  { title: "The Hangover", year: 2009, genres: ["Comedy"], budget: 35_000_000, revenue: 467_500_000, roi: 13.36, rating: "R",
    tropes: ["Amnesia", "Buddy Comedy", "Road Trip", "Mystery"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'medium', pacing: 'fast', arcType: 'man-in-a-hole' }, runtime: 100, releaseMonth: 6, vfxComplexity: 'low' },
  { title: "Jojo Rabbit", year: 2019, genres: ["Comedy", "Drama", "War"], budget: 14_000_000, revenue: 90_300_000, roi: 6.45, rating: "PG-13",
    tropes: ["Satire", "Coming of Age", "War", "Dark Comedy"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'high', pacing: 'moderate', arcType: 'cinderella' }, runtime: 108, releaseMonth: 10, vfxComplexity: 'low' },
  { title: "Little Miss Sunshine", year: 2006, genres: ["Comedy", "Drama"], budget: 8_000_000, revenue: 100_500_000, roi: 12.56, rating: "R",
    tropes: ["Road Trip", "Family", "Underdog", "Ensemble Cast"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'medium', pacing: 'moderate', arcType: 'man-in-a-hole' }, runtime: 101, releaseMonth: 7, vfxComplexity: 'low' },

  // ─── Horror (6) ───
  { title: "Get Out", year: 2017, genres: ["Horror", "Thriller"], budget: 4_500_000, revenue: 255_400_000, roi: 56.76, rating: "R",
    tropes: ["Social Commentary", "Twist Ending", "Sunken Place", "Paranoia"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'high', pacing: 'moderate', arcType: 'oedipus' }, runtime: 104, releaseMonth: 2, vfxComplexity: 'low' },
  { title: "A Quiet Place", year: 2018, genres: ["Horror", "Sci-Fi"], budget: 17_000_000, revenue: 340_900_000, roi: 20.05, rating: "PG-13",
    tropes: ["Survival", "Family", "Monster", "Silence"],
    narrativeTraits: { dialogueHeavy: false, actionHeavy: false, emotionalVolatility: 'high', pacing: 'moderate', arcType: 'man-in-a-hole' }, runtime: 90, releaseMonth: 4, vfxComplexity: 'medium' },
  { title: "Hereditary", year: 2018, genres: ["Horror", "Drama"], budget: 10_000_000, revenue: 79_300_000, roi: 7.93, rating: "R",
    tropes: ["Family Curse", "Grief", "Occult", "Slow Burn"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'high', pacing: 'slow', arcType: 'riches-to-rags' }, runtime: 127, releaseMonth: 6, vfxComplexity: 'low' },
  { title: "The Conjuring", year: 2013, genres: ["Horror"], budget: 20_000_000, revenue: 319_500_000, roi: 15.98, rating: "R",
    tropes: ["Haunted House", "Based on True Story", "Paranormal Investigation", "Family"],
    narrativeTraits: { dialogueHeavy: false, actionHeavy: false, emotionalVolatility: 'high', pacing: 'moderate', arcType: 'man-in-a-hole' }, runtime: 112, releaseMonth: 7, vfxComplexity: 'low' },
  { title: "Us", year: 2019, genres: ["Horror", "Thriller"], budget: 20_000_000, revenue: 255_100_000, roi: 12.76, rating: "R",
    tropes: ["Doppelganger", "Social Commentary", "Twist Ending", "Family"],
    narrativeTraits: { dialogueHeavy: false, actionHeavy: false, emotionalVolatility: 'high', pacing: 'moderate', arcType: 'oedipus' }, runtime: 116, releaseMonth: 3, vfxComplexity: 'medium' },
  { title: "The Witch", year: 2015, genres: ["Horror", "Drama"], budget: 3_500_000, revenue: 40_400_000, roi: 11.54, rating: "R",
    tropes: ["Period Piece", "Paranoia", "Religious Anxiety", "Slow Burn"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'medium', pacing: 'slow', arcType: 'riches-to-rags' }, runtime: 92, releaseMonth: 2, vfxComplexity: 'low' },

  // ─── Romance (5) ───
  { title: "La La Land", year: 2016, genres: ["Romance", "Musical", "Drama"], budget: 30_000_000, revenue: 447_000_000, roi: 14.9, rating: "PG-13",
    tropes: ["Star-Crossed Lovers", "Music", "Dreams vs Reality", "Bittersweet Ending"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'medium', pacing: 'moderate', arcType: 'icarus' }, runtime: 128, releaseMonth: 12, vfxComplexity: 'low' },
  { title: "The Notebook", year: 2004, genres: ["Romance", "Drama"], budget: 29_000_000, revenue: 115_600_000, roi: 3.99, rating: "PG-13",
    tropes: ["Star-Crossed Lovers", "Class Divide", "Flashback", "Aging"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'high', pacing: 'moderate', arcType: 'cinderella' }, runtime: 123, releaseMonth: 6, vfxComplexity: 'low' },
  { title: "Eternal Sunshine of the Spotless Mind", year: 2004, genres: ["Romance", "Sci-Fi", "Drama"], budget: 20_000_000, revenue: 72_300_000, roi: 3.62, rating: "R",
    tropes: ["Memory Erasure", "Non-Linear", "Sci-Fi Romance", "Bittersweet Ending"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'high', pacing: 'moderate', arcType: 'man-in-a-hole' }, runtime: 108, releaseMonth: 3, vfxComplexity: 'medium' },
  { title: "Crazy Rich Asians", year: 2018, genres: ["Romance", "Comedy"], budget: 30_000_000, revenue: 238_500_000, roi: 7.95, rating: "PG-13",
    tropes: ["Fish Out of Water", "Class Divide", "Wedding", "Family"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'low', pacing: 'moderate', arcType: 'cinderella' }, runtime: 120, releaseMonth: 8, vfxComplexity: 'low' },
  { title: "Pride & Prejudice", year: 2005, genres: ["Romance", "Drama"], budget: 28_000_000, revenue: 121_100_000, roi: 4.33, rating: "PG",
    tropes: ["Enemies to Lovers", "Class Divide", "Period Piece", "Strong Female Lead"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'medium', pacing: 'moderate', arcType: 'cinderella' }, runtime: 129, releaseMonth: 11, vfxComplexity: 'low' },

  // ─── Animation (5) ───
  { title: "Spider-Man: Into the Spider-Verse", year: 2018, genres: ["Animation", "Action", "Adventure"], budget: 90_000_000, revenue: 375_500_000, roi: 4.17, rating: "PG",
    tropes: ["Chosen One", "Multiverse", "Coming of Age", "Mentor"],
    narrativeTraits: { dialogueHeavy: false, actionHeavy: true, emotionalVolatility: 'medium', pacing: 'fast', arcType: 'rags-to-riches' }, runtime: 117, releaseMonth: 12, vfxComplexity: 'high' },
  { title: "Inside Out", year: 2015, genres: ["Animation", "Comedy", "Drama"], budget: 175_000_000, revenue: 857_600_000, roi: 4.9, rating: "PG",
    tropes: ["Coming of Age", "Personification", "Family", "Loss of Innocence"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'high', pacing: 'moderate', arcType: 'man-in-a-hole' }, runtime: 95, releaseMonth: 6, vfxComplexity: 'high' },
  { title: "Coco", year: 2017, genres: ["Animation", "Adventure", "Family"], budget: 175_000_000, revenue: 807_800_000, roi: 4.62, rating: "PG",
    tropes: ["Afterlife", "Family", "Music", "Identity"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'high', pacing: 'moderate', arcType: 'cinderella' }, runtime: 105, releaseMonth: 11, vfxComplexity: 'high' },
  { title: "Toy Story 3", year: 2010, genres: ["Animation", "Comedy", "Family"], budget: 200_000_000, revenue: 1_066_900_000, roi: 5.33, rating: "G",
    tropes: ["Coming of Age", "Friendship", "Adventure", "Letting Go"],
    narrativeTraits: { dialogueHeavy: true, actionHeavy: false, emotionalVolatility: 'high', pacing: 'moderate', arcType: 'man-in-a-hole' }, runtime: 103, releaseMonth: 6, vfxComplexity: 'high' },
  { title: "The Lion King", year: 1994, genres: ["Animation", "Adventure", "Drama"], budget: 45_000_000, revenue: 968_500_000, roi: 21.52, rating: "G",
    tropes: ["Coming of Age", "Succession", "Loss of Parent", "Hero's Journey"],
    narrativeTraits: { dialogueHeavy: false, actionHeavy: false, emotionalVolatility: 'high', pacing: 'moderate', arcType: 'man-in-a-hole' }, runtime: 88, releaseMonth: 6, vfxComplexity: 'high' },
];

export const TROPE_DICTIONARY: string[] = [
  "Anti-Hero", "Heist", "Time Travel", "Coming of Age", "Buddy Comedy",
  "Twist Ending", "Revenge", "Chosen One", "Fish Out of Water", "Redemption",
  "Star-Crossed Lovers", "Underdog", "Ensemble Cast", "Mentor", "Survival",
  "Road Trip", "Non-Linear", "Unreliable Narrator", "Post-Apocalypse", "Dystopia",
  "Found Footage", "One-Man Army", "Double Cross", "Political Intrigue", "Trapped",
  "Strong Female Lead", "Family", "Dark Comedy", "Social Commentary", "Class Divide",
  "Based on True Story", "Period Piece", "Rise to Power", "Fallen Hero", "Amnesia",
  "Monster", "Haunted House", "Body Horror", "Paranoia", "Ticking Clock",
  "Sacrifice", "Identity", "Obsession", "Hidden Genius", "Simulation",
  "AI Consciousness", "Multiverse", "Music Driven", "Military", "Courtroom",
];
