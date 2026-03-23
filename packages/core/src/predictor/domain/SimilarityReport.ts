export interface CompFilm {
  title: string;
  similarityScore: number; // 0 to 1
  sharedTraits: string[]; // e.g. ["High Emotional Volatility", "Action-Heavy"]
  marketPerformance: {
    budget: number;
    revenue: number;
    roi: number;
  };
}

export interface SimilarityReport {
  scriptId: string;
  topComps: CompFilm[];
}
