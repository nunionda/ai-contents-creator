import type { EngineName, ProviderChoice } from '../creative/infrastructure/llm/AnalysisStrategy';
import type { EngineResult, ScenarioConfig } from './types';

export const LLM_ENGINES: EngineName[] = ['beatSheet', 'emotion', 'rating', 'roi', 'coverage', 'vfx', 'trope'];

export interface EngineScore {
  engine: EngineName;
  structuralScore: number;   // 0-100
  contentScore: number;      // 0-100
  overallScore: number;      // 0.4 * structural + 0.6 * content
  validatorVerdict: 'PASS' | 'FAIL' | 'WARN';
  fellBack: boolean;         // true if API used a different provider than intended
  actualProvider: string;    // the provider that actually handled this engine
}

export interface ProviderRun {
  provider: ProviderChoice;
  scenario: string;          // fileName
  label: string;
  timestamp: string;
  totalDurationMs: number;
  engineScores: EngineScore[];
  validatorResults: EngineResult[];
  error?: string;
}

export interface AggregatedEngineScore {
  avgScore: number;
  avgLatency: number;
  costEstimate: number;
  passRate: number;          // % of scenarios with PASS verdict
  fallbackRate: number;      // % of scenarios where provider fell back
}

export interface OptimalMix {
  name: string;
  description: string;
  providers: Record<EngineName, ProviderChoice>;
  totalAvgScore: number;
  totalCostEstimate: number;
}

export interface BenchmarkMatrix {
  timestamp: string;
  providers: ProviderChoice[];
  scenarios: ScenarioConfig[];
  engines: EngineName[];
  runs: ProviderRun[];
  byProviderEngine: Record<string, Record<string, AggregatedEngineScore>>;
  byProvider: Record<string, { avgScore: number; totalCost: number; passRate: number }>;
  optimalMixes: OptimalMix[];
}

// ─── Per-Model Full-Pipeline Benchmark Types ───

export interface BenchmarkMetrics {
  totalLatencyMs: number;
  totalCostUsd: number;
  avgQualityScore: number;       // average of 7 engine overallScores
  structuralCompleteness: number; // average of 7 engine structuralScores
  consistency: number;            // 100 for single run, variance-based for multiple runs
}

export interface ModelBenchmarkResult {
  provider: ProviderChoice;
  model: string;                 // actual model name (e.g. 'gemini-2.5-pro')
  fullReport: any;               // complete analysis result (same as /analyze response)
  engineScores: EngineScore[];
  metrics: BenchmarkMetrics;
  runIndex?: number;             // for multi-run benchmarks
}

export interface RankedModel {
  provider: ProviderChoice;
  model: string;
  rank: number;
  compositeScore: number;        // weighted: quality×0.5 + cost×0.2 + speed×0.2 + structure×0.1
  qualityScore: number;          // 0-100
  costScore: number;             // 0-100 (normalized, lower cost = higher score)
  speedScore: number;            // 0-100 (normalized, lower latency = higher score)
  structureScore: number;        // 0-100
}

export interface MatrixCell {
  engine: EngineName;
  provider: ProviderChoice;
  overallScore: number;
  structuralScore: number;
  contentScore: number;
  verdict: 'PASS' | 'FAIL' | 'WARN';
}

export interface BenchmarkComparison {
  benchmarkId: string;
  scriptId: string;
  scriptName: string;
  timestamp: string;
  market: string;
  models: ModelBenchmarkResult[];
  ranking: RankedModel[];
  matrix: MatrixCell[];          // flat array: engines × models
}
