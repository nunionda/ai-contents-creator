export interface CoverageSubcategory {
  name: string;
  score: number;        // 0-100
  assessment: string;   // 1-2 sentence analysis
}

export interface CoverageCategory {
  name: string;
  score: number;        // 0-100 (average of subcategories)
  subcategories: CoverageSubcategory[];
}

export type Verdict = 'Pass' | 'Consider' | 'Recommend';

export interface ScriptCoverage {
  scriptId: string;
  title: string;
  genre: string;
  logline: string;
  synopsis: string;
  categories: CoverageCategory[];
  overallScore: number;     // 0-100
  verdict: Verdict;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
  marketPotential: string;       // Market viability assessment
  comparableTitles: string[];    // 3 similar successful films
}
