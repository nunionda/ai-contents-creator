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
