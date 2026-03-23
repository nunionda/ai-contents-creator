import type { EngineName, ProviderChoice } from '../llm/AnalysisStrategy';

export interface BenchmarkResult {
  engine: EngineName;
  provider: ProviderChoice;
  model: string;
  latencyMs: number;
  jsonParseSuccess: boolean;
  structuralScore: number;    // 0-100: JSON schema completeness
  contentScore: number;       // 0-100: content relevance/quality
  overallScore: number;       // weighted average
  costEstimate: number;       // USD estimate based on token count
  tokenEstimate: number;
  error?: string;
}

export interface BenchmarkSuite {
  scriptId: string;
  timestamp: string;
  results: BenchmarkResult[];
  rankings: Record<EngineName, RankedProvider[]>;
  summary: BenchmarkSummary;
}

export interface RankedProvider {
  provider: ProviderChoice;
  overallScore: number;
  latencyMs: number;
  costEstimate: number;
}

export interface BenchmarkSummary {
  totalRuns: number;
  totalTimeMs: number;
  totalCostEstimate: number;
  bestPerEngine: Record<EngineName, ProviderChoice>;
  bestBudget: ProviderChoice;
  bestQuality: ProviderChoice;
}

/** Engine-specific evaluation rubrics */
export interface EngineRubric {
  engine: EngineName;
  /** Validate JSON structure completeness (0-100) */
  scoreStructure: (parsed: any) => number;
  /** Validate content quality/relevance (0-100) */
  scoreContent: (parsed: any, sceneCount: number) => number;
}

/** Cost per million tokens for each provider (input, output) */
export const PROVIDER_COSTS: Record<string, { input: number; output: number }> = {
  'gemini':       { input: 0.00,  output: 0.00 },   // free tier
  'gemini-pro':   { input: 1.25,  output: 10.00 },
  'gemini-long':  { input: 1.25,  output: 5.00 },
  'groq':         { input: 0.00,  output: 0.00 },   // free tier
  'deepseek':     { input: 0.14,  output: 0.28 },
  'anthropic':    { input: 3.00,  output: 15.00 },
  'openai':       { input: 2.50,  output: 10.00 },
  'mock':         { input: 0.00,  output: 0.00 },
};
