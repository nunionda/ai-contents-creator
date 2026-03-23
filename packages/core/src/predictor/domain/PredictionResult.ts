import type { ContentRating, MarketLocale } from '../../shared/MarketConfig';

export type ROITier = "Flop" | "Break-even" | "Hit" | "Blockbuster";

export interface PredictionResult {
  scriptId: string;
  market?: MarketLocale;
  roi: {
    tier: ROITier;
    predictedMultiplier: number; // Revenue / Budget
    confidence: number; // 0 to 1
    reasoning: string;
  };
  mpaaRating: {
    rating: ContentRating;
    reasons: string[];
    confidence: number;
  };
}
