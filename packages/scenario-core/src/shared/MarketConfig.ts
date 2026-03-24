/**
 * Market Locale Configuration — defines all market-specific constants.
 * Enables the system to analyze screenplays for Hollywood (US) or Korean markets.
 */

export type MarketLocale = 'hollywood' | 'korean';

export type ContentRating =
  // MPAA
  | 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17'
  // KMRB (영상물등급위원회)
  | 'ALL' | '12+' | '15+' | '19+' | 'RESTRICTED';

export interface ROITierConfig {
  flop: { max: number };
  breakEven: { min: number; max: number };
  hit: { min: number; max: number };
  blockbuster: { min: number; admissionsThreshold?: number };
}

export interface ProductionCosts {
  locationCostPerDay: { INT: number; EXT: number };
  castCost: Record<string, number>;
  vfxCostPerHour: number;
  crewCostPerDay: number;
  fringeMultiplier: number;
  postProductionPerDay: number;
}

export interface MarketPrompts {
  marketContext: string;
  ratingSystem: string;
  ratingValues: string;
  analystRole: string;
  consultantRole: string;
  tropeAnalystRole: string;
  boxOfficeRole: string;
  /** Language directive appended to all LLM system prompts. Empty for English markets. */
  responseLanguage: string;
}

export interface MarketConfig {
  locale: MarketLocale;
  currency: { code: string; symbol: string; locale: string };
  ratings: { system: string; values: ContentRating[] };
  roi: { breakEvenMultiplier: number; tiers: ROITierConfig };
  production: ProductionCosts;
  prompts: MarketPrompts;
}

// ─── Hollywood (US) Configuration ───

export const HOLLYWOOD_CONFIG: MarketConfig = {
  locale: 'hollywood',
  currency: { code: 'USD', symbol: '$', locale: 'en-US' },
  ratings: {
    system: 'MPAA',
    values: ['G', 'PG', 'PG-13', 'R', 'NC-17'],
  },
  roi: {
    breakEvenMultiplier: 2.5,
    tiers: {
      flop: { max: 1.0 },
      breakEven: { min: 1.0, max: 2.5 },
      hit: { min: 2.5, max: 5.0 },
      blockbuster: { min: 5.0 },
    },
  },
  production: {
    locationCostPerDay: { INT: 5_000, EXT: 15_000 },
    castCost: {
      Protagonist: 500_000,
      Antagonist: 300_000,
      Supporting: 100_000,
      Minor: 10_000,
    },
    vfxCostPerHour: 300,
    crewCostPerDay: 50_000,
    fringeMultiplier: 1.4,
    postProductionPerDay: 20_000,
  },
  prompts: {
    marketContext: 'Hollywood and the US film market',
    ratingSystem: 'MPAA',
    ratingValues: 'G, PG, PG-13, R, NC-17',
    analystRole: 'a senior Hollywood script coverage analyst (Script Reader) writing an official Studio Script Coverage Report',
    consultantRole: 'an expert Hollywood script consultant structurally evaluating a screenplay',
    tropeAnalystRole: 'a trope analyzer for Hollywood screenplays',
    boxOfficeRole: 'a Hollywood market intelligence AI',
    responseLanguage: '',
  },
};

// ─── Korean Configuration ───

export const KOREAN_CONFIG: MarketConfig = {
  locale: 'korean',
  currency: { code: 'KRW', symbol: '₩', locale: 'ko-KR' },
  ratings: {
    system: 'KMRB',
    values: ['ALL', '12+', '15+', '19+', 'RESTRICTED'],
  },
  roi: {
    breakEvenMultiplier: 2.0,
    tiers: {
      flop: { max: 1.0 },
      breakEven: { min: 1.0, max: 2.0 },
      hit: { min: 2.0, max: 4.0 },
      blockbuster: { min: 4.0, admissionsThreshold: 10_000_000 },
    },
  },
  production: {
    locationCostPerDay: { INT: 2_500_000, EXT: 6_500_000 },
    castCost: {
      Protagonist: 800_000_000,
      Antagonist: 500_000_000,
      Supporting: 150_000_000,
      Minor: 15_000_000,
    },
    vfxCostPerHour: 400_000,
    crewCostPerDay: 17_500_000,
    fringeMultiplier: 1.3,
    postProductionPerDay: 8_000_000,
  },
  prompts: {
    marketContext: 'the Korean domestic film market (한국 영화 시장)',
    ratingSystem: 'KMRB (영상물등급위원회)',
    ratingValues: 'ALL (전체관람가), 12+ (12세이상관람가), 15+ (15세이상관람가), 19+ (청소년관람불가), RESTRICTED (제한상영가)',
    analystRole: 'a senior Korean film industry analyst (한국 영화 산업 전문 분석가) writing an official Script Coverage Report for the Korean market',
    consultantRole: 'an expert Korean screenplay consultant (한국 시나리오 전문 컨설턴트) structurally evaluating a screenplay for the Korean market',
    tropeAnalystRole: 'a trope analyzer specializing in Korean cinema narrative patterns (한국 영화 서사 패턴 분석가)',
    boxOfficeRole: 'a Korean box office market intelligence AI analyzing the domestic Korean film market (한국 박스오피스 시장 분석 AI)',
    responseLanguage: 'LANGUAGE: You MUST write ALL text values in Korean (한국어). This includes descriptions, assessments, synopsis, strengths, weaknesses, reasoning, recommendations, and logline. JSON keys must remain in English. Example: "description": "주인공이 첫 번째 위기에 직면한다."',
  },
};

// ─── Factory ───

const CONFIGS: Record<MarketLocale, MarketConfig> = {
  hollywood: HOLLYWOOD_CONFIG,
  korean: KOREAN_CONFIG,
};

export function getMarketConfig(locale: MarketLocale = 'hollywood'): MarketConfig {
  return CONFIGS[locale];
}
