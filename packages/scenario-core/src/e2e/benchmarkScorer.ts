import type { EngineName, ProviderChoice } from '../creative/infrastructure/llm/AnalysisStrategy';
import { ENGINE_RUBRICS } from '../creative/infrastructure/benchmark/engineRubrics';
import { PROVIDER_COSTS } from '../creative/infrastructure/benchmark/ProviderBenchmark';
import { validateAllEngines } from './validators';
import type { EngineScore, ModelBenchmarkResult, RankedModel, MatrixCell, BenchmarkMetrics } from './benchmarkTypes';
import { LLM_ENGINES } from './benchmarkTypes';

/** Map API response fields to the shape expected by engine rubrics */
function extractEngineData(response: any, engine: EngineName): any {
  switch (engine) {
    case 'beatSheet':
      return { beats: response.beatSheet || [] };
    case 'emotion':
      return { scenes: response.emotionGraph || [] };
    case 'rating':
      return response.predictions?.rating || {};
    case 'roi':
      return response.predictions?.roi || {};
    case 'coverage':
      return response.coverage || {};
    case 'vfx':
      return response.production?.vfxRequirements || [];
    case 'trope':
      return response.tropes || [];
    default:
      return {};
  }
}

/** Map engine name to validator engine label for matching */
function matchValidatorEngine(validatorEngine: string, engine: EngineName): boolean {
  const map: Record<EngineName, string[]> = {
    beatSheet: ['BeatSheet'],
    emotion: ['Emotion'],
    rating: ['Rating'],
    roi: ['BoxOffice'],
    coverage: ['Coverage'],
    vfx: ['VFX'],
    trope: ['Tropes'],
  };
  return (map[engine] || []).some(label =>
    validatorEngine.toLowerCase().includes(label.toLowerCase())
  );
}

/** Score a single pipeline run against all 7 LLM engines */
export function scoreProviderRun(
  response: any,
  intendedProvider: ProviderChoice,
): EngineScore[] {
  const validatorResults = validateAllEngines(response);
  const providers: Record<string, string> = response.providers || {};
  const sceneCount = response.emotionGraph?.length || response.summary?.sceneCount || 50;

  return LLM_ENGINES.map(engine => {
    const rubric = ENGINE_RUBRICS.find(r => r.engine === engine);
    const engineData = extractEngineData(response, engine);
    const validatorResult = validatorResults.find(v => matchValidatorEngine(v.engine, engine));

    const structuralScore = rubric ? rubric.scoreStructure(engineData) : 0;
    const contentScore = rubric ? rubric.scoreContent(engineData, sceneCount) : 0;
    const overallScore = Math.round(0.4 * structuralScore + 0.6 * contentScore);

    const actualProvider = providers[engine] || 'unknown';
    const fellBack = actualProvider !== intendedProvider && actualProvider !== 'unknown';

    return {
      engine,
      structuralScore,
      contentScore,
      overallScore,
      validatorVerdict: validatorResult?.verdict || 'FAIL',
      fellBack,
      actualProvider,
    };
  });
}

/** Compute benchmark metrics from engine scores and timing data */
export function computeBenchmarkMetrics(
  engineScores: EngineScore[],
  totalLatencyMs: number,
  provider: ProviderChoice,
): BenchmarkMetrics {
  const avgQualityScore = engineScores.length > 0
    ? Math.round(engineScores.reduce((s, e) => s + e.overallScore, 0) / engineScores.length)
    : 0;
  const structuralCompleteness = engineScores.length > 0
    ? Math.round(engineScores.reduce((s, e) => s + e.structuralScore, 0) / engineScores.length)
    : 0;

  // Rough cost estimate based on provider pricing (assume ~4K input + ~2K output tokens per engine)
  const costs = PROVIDER_COSTS[provider] || { input: 0, output: 0 };
  const totalCostUsd = engineScores.length * (
    (4000 / 1_000_000) * costs.input + (2000 / 1_000_000) * costs.output
  );

  return {
    totalLatencyMs,
    totalCostUsd: Math.round(totalCostUsd * 10000) / 10000, // 4 decimal places
    avgQualityScore,
    structuralCompleteness,
    consistency: 100, // single run = perfect consistency
  };
}

/** Build flat matrix of engine × model scores */
export function buildComparisonMatrix(results: ModelBenchmarkResult[]): MatrixCell[] {
  const cells: MatrixCell[] = [];
  for (const r of results) {
    for (const es of r.engineScores) {
      cells.push({
        engine: es.engine,
        provider: r.provider,
        overallScore: es.overallScore,
        structuralScore: es.structuralScore,
        contentScore: es.contentScore,
        verdict: es.validatorVerdict,
      });
    }
  }
  return cells;
}

/** Compute composite ranking across all benchmark results */
export function computeCompositeRanking(results: ModelBenchmarkResult[]): RankedModel[] {
  if (results.length === 0) return [];

  // Normalize each dimension to 0-100 (higher = better)
  const maxLatency = Math.max(...results.map(r => r.metrics.totalLatencyMs), 1);
  const maxCost = Math.max(...results.map(r => r.metrics.totalCostUsd), 0.0001);

  const scored = results.map(r => {
    const qualityScore = r.metrics.avgQualityScore;
    const structureScore = r.metrics.structuralCompleteness;
    // Invert: lower cost/latency = higher score
    const costScore = Math.round(100 * (1 - r.metrics.totalCostUsd / maxCost));
    const speedScore = Math.round(100 * (1 - r.metrics.totalLatencyMs / maxLatency));
    // Weighted composite: quality 50%, cost 20%, speed 20%, structure 10%
    const compositeScore = Math.round(
      qualityScore * 0.5 + costScore * 0.2 + speedScore * 0.2 + structureScore * 0.1
    );

    return {
      provider: r.provider,
      model: r.model,
      rank: 0,
      compositeScore,
      qualityScore,
      costScore,
      speedScore,
      structureScore,
    };
  });

  // Sort descending by composite score and assign ranks
  scored.sort((a, b) => b.compositeScore - a.compositeScore);
  scored.forEach((s, i) => { s.rank = i + 1; });

  return scored;
}
