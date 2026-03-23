import type { MarketLocale } from '../../shared/MarketConfig';

export interface BoxOfficeData {
  movieId: string;
  title: string;
  budget: number;
  revenue: number;
  releaseDate: string;
  /**
   * List of top billed actors in the movie.
   * Useful for downstream Actor Profitability and Star Power ML features.
   */
  topCast: string[];
  genres: string[];
  /** Market locale for currency/analysis context */
  market?: MarketLocale;
  /** Currency code (USD, KRW) */
  currencyCode?: string;
  /** Admission count — critical for Korean market (천만 관객 milestone) */
  admissions?: number;
}
