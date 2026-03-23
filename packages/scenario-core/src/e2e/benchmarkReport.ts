import { writeFileSync, mkdirSync } from 'fs';
import type { EngineName, ProviderChoice } from '../creative/infrastructure/llm/AnalysisStrategy';
import { PROVIDER_COSTS } from '../creative/infrastructure/benchmark/ProviderBenchmark';
import type { BenchmarkMatrix, ProviderRun, AggregatedEngineScore, OptimalMix } from './benchmarkTypes';
import { LLM_ENGINES } from './benchmarkTypes';

const SEP = '═'.repeat(72);
const THIN = '─'.repeat(72);

/** Aggregate scores across runs: provider × engine → avg metrics */
export function aggregateScores(runs: ProviderRun[]): {
  byProviderEngine: Record<string, Record<string, AggregatedEngineScore>>;
  byProvider: Record<string, { avgScore: number; totalCost: number; passRate: number }>;
} {
  const byProviderEngine: Record<string, Record<string, AggregatedEngineScore>> = {};
  const byProvider: Record<string, { scores: number[]; costs: number[]; passes: number; total: number }> = {};

  // Group runs by provider
  const runsByProvider = new Map<string, ProviderRun[]>();
  for (const run of runs) {
    if (run.error) continue;
    const key = run.provider;
    if (!runsByProvider.has(key)) runsByProvider.set(key, []);
    runsByProvider.get(key)!.push(run);
  }

  for (const [provider, providerRuns] of runsByProvider) {
    byProviderEngine[provider] = {};
    byProvider[provider] = { scores: [], costs: [], passes: 0, total: 0 };

    for (const engine of LLM_ENGINES) {
      const engineScores = providerRuns
        .map(r => r.engineScores.find(s => s.engine === engine))
        .filter(Boolean);

      if (engineScores.length === 0) {
        byProviderEngine[provider][engine] = { avgScore: 0, avgLatency: 0, costEstimate: 0, passRate: 0, fallbackRate: 0 };
        continue;
      }

      const avgScore = Math.round(engineScores.reduce((s, e) => s + e!.overallScore, 0) / engineScores.length);
      const passCount = engineScores.filter(e => e!.validatorVerdict === 'PASS').length;
      const fallbackCount = engineScores.filter(e => e!.fellBack).length;
      const cost = (PROVIDER_COSTS[provider]?.input || 0) + (PROVIDER_COSTS[provider]?.output || 0);

      byProviderEngine[provider][engine] = {
        avgScore,
        avgLatency: 0,
        costEstimate: cost * 0.005, // rough estimate: ~5k tokens per engine call
        passRate: Math.round((passCount / engineScores.length) * 100),
        fallbackRate: Math.round((fallbackCount / engineScores.length) * 100),
      };

      byProvider[provider].scores.push(avgScore);
      byProvider[provider].passes += passCount;
      byProvider[provider].total += engineScores.length;
    }
  }

  const byProviderSummary: Record<string, { avgScore: number; totalCost: number; passRate: number }> = {};
  for (const [provider, data] of Object.entries(byProvider)) {
    const avgScore = data.scores.length > 0 ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) : 0;
    const cost = (PROVIDER_COSTS[provider]?.input || 0) + (PROVIDER_COSTS[provider]?.output || 0);
    byProviderSummary[provider] = {
      avgScore,
      totalCost: cost * 0.005 * 7, // 7 engines per run
      passRate: data.total > 0 ? Math.round((data.passes / data.total) * 100) : 0,
    };
  }

  return { byProviderEngine, byProvider: byProviderSummary };
}

/** Compute 3 optimal provider mixes */
export function computeOptimalMixes(
  byProviderEngine: Record<string, Record<string, AggregatedEngineScore>>,
): OptimalMix[] {
  const providers = Object.keys(byProviderEngine);
  const mixes: OptimalMix[] = [];

  // 1. QUALITY-FIRST: best score per engine
  const qualityMix: Record<EngineName, ProviderChoice> = {} as any;
  let qualityTotal = 0;
  let qualityCost = 0;
  for (const engine of LLM_ENGINES) {
    let best = { provider: 'mock' as ProviderChoice, score: -1, cost: Infinity };
    for (const p of providers) {
      const s = byProviderEngine[p]?.[engine];
      if (s && s.avgScore > best.score) {
        best = { provider: p as ProviderChoice, score: s.avgScore, cost: s.costEstimate };
      }
    }
    qualityMix[engine] = best.provider;
    qualityTotal += best.score;
    qualityCost += best.cost;
  }
  mixes.push({
    name: 'QUALITY-FIRST',
    description: '엔진별 최고 점수 프로바이더',
    providers: qualityMix,
    totalAvgScore: Math.round(qualityTotal / LLM_ENGINES.length),
    totalCostEstimate: +qualityCost.toFixed(4),
  });

  // 2. BUDGET-OPTIMIZED: cheapest provider with score >= 65
  const budgetMix: Record<EngineName, ProviderChoice> = {} as any;
  let budgetTotal = 0;
  let budgetCost = 0;
  for (const engine of LLM_ENGINES) {
    let best = { provider: 'mock' as ProviderChoice, score: 0, cost: Infinity };
    for (const p of providers) {
      const s = byProviderEngine[p]?.[engine];
      if (s && s.avgScore >= 65 && s.costEstimate < best.cost) {
        best = { provider: p as ProviderChoice, score: s.avgScore, cost: s.costEstimate };
      }
    }
    // Fallback to highest score if none meets threshold
    if (best.provider === 'mock') {
      for (const p of providers) {
        const s = byProviderEngine[p]?.[engine];
        if (s && s.avgScore > best.score) {
          best = { provider: p as ProviderChoice, score: s.avgScore, cost: s.costEstimate };
        }
      }
    }
    budgetMix[engine] = best.provider;
    budgetTotal += best.score;
    budgetCost += best.cost;
  }
  mixes.push({
    name: 'BUDGET-OPTIMIZED',
    description: '품질 ≥ 65 중 최저 비용',
    providers: budgetMix,
    totalAvgScore: Math.round(budgetTotal / LLM_ENGINES.length),
    totalCostEstimate: +budgetCost.toFixed(4),
  });

  // 3. VALUE-BALANCED: score / (1 + cost * 100)
  const valueMix: Record<EngineName, ProviderChoice> = {} as any;
  let valueTotal = 0;
  let valueCost = 0;
  for (const engine of LLM_ENGINES) {
    let best = { provider: 'mock' as ProviderChoice, value: -1, score: 0, cost: 0 };
    for (const p of providers) {
      const s = byProviderEngine[p]?.[engine];
      if (!s) continue;
      const value = s.avgScore / (1 + s.costEstimate * 100);
      if (value > best.value) {
        best = { provider: p as ProviderChoice, value, score: s.avgScore, cost: s.costEstimate };
      }
    }
    valueMix[engine] = best.provider;
    valueTotal += best.score;
    valueCost += best.cost;
  }
  mixes.push({
    name: 'VALUE-BALANCED',
    description: '품질/비용 최적화',
    providers: valueMix,
    totalAvgScore: Math.round(valueTotal / LLM_ENGINES.length),
    totalCostEstimate: +valueCost.toFixed(4),
  });

  return mixes;
}

/** Print Provider × Engine matrix table */
export function printMatrix(
  byProviderEngine: Record<string, Record<string, AggregatedEngineScore>>,
  byProvider: Record<string, { avgScore: number; totalCost: number; passRate: number }>,
) {
  const providers = Object.keys(byProviderEngine);
  if (providers.length === 0) return;

  console.log(`\n${SEP}`);
  console.log('  Provider × Engine 품질 매트릭스 (3편 평균 점수)');
  console.log(SEP);

  // Header
  const pad = (s: string, n: number) => s.padEnd(n).slice(0, n);
  const rpad = (s: string, n: number) => s.padStart(n).slice(-n);
  const header = `  ${pad('Engine', 12)}${providers.map(p => rpad(p.slice(0, 10), 10)).join('')}`;
  console.log(header);
  console.log(`  ${THIN.slice(0, 12 + providers.length * 10)}`);

  // Engine rows
  for (const engine of LLM_ENGINES) {
    const scores = providers.map(p => {
      const s = byProviderEngine[p]?.[engine];
      if (!s) return rpad('-', 10);
      const fb = s.fallbackRate > 50 ? '†' : '';
      return rpad(`${s.avgScore}${fb}`, 10);
    });
    console.log(`  ${pad(engine, 12)}${scores.join('')}`);
  }

  // Summary rows
  console.log(`  ${THIN.slice(0, 12 + providers.length * 10)}`);
  console.log(`  ${pad('AVG Score', 12)}${providers.map(p => rpad(String(byProvider[p]?.avgScore || 0), 10)).join('')}`);
  console.log(`  ${pad('Cost/run', 12)}${providers.map(p => rpad(`$${(byProvider[p]?.totalCost || 0).toFixed(2)}`, 10)).join('')}`);
  console.log(`  ${pad('Pass Rate', 12)}${providers.map(p => rpad(`${byProvider[p]?.passRate || 0}%`, 10)).join('')}`);
  console.log(`\n  † = >50% fallback rate (provider couldn't handle this engine)`);
}

/** Print per-scenario breakdown */
export function printPerScenario(runs: ProviderRun[]) {
  const byScenario = new Map<string, ProviderRun[]>();
  for (const run of runs) {
    if (run.error) continue;
    if (!byScenario.has(run.label)) byScenario.set(run.label, []);
    byScenario.get(run.label)!.push(run);
  }

  console.log(`\n${SEP}`);
  console.log('  시나리오별 상세 점수');
  console.log(SEP);

  for (const [label, scenarioRuns] of byScenario) {
    console.log(`\n  [${label}]`);
    for (const engine of LLM_ENGINES) {
      const scores = scenarioRuns.map(r => {
        const s = r.engineScores.find(e => e.engine === engine);
        const fb = s?.fellBack ? '†' : '';
        return `${r.provider}=${s?.overallScore || 0}${fb}`;
      });
      console.log(`    ${engine.padEnd(12)} ${scores.join('  ')}`);
    }
  }
}

/** Print Optimal Mix recommendations */
export function printOptimalMixes(mixes: OptimalMix[]) {
  console.log(`\n${SEP}`);
  console.log('  OPTIMAL PROVIDER MIX 추천');
  console.log(SEP);

  for (const mix of mixes) {
    console.log(`\n  ${mix.name} — ${mix.description}`);
    console.log(`  ${'─'.repeat(50)}`);
    for (const engine of LLM_ENGINES) {
      console.log(`    ${engine.padEnd(12)} → ${mix.providers[engine]}`);
    }
    console.log(`    ${'─'.repeat(40)}`);
    console.log(`    AVG Score: ${mix.totalAvgScore}  |  Cost: $${mix.totalCostEstimate.toFixed(2)}`);
  }

  // Print the customProviders JSON for the quality-first mix
  const best = mixes[0];
  if (best) {
    console.log(`\n  ── customProviders (${best.name}) ──`);
    console.log(`  ${JSON.stringify({ strategy: 'custom', customProviders: best.providers }, null, 2).split('\n').join('\n  ')}`);
  }
}

/** Save full benchmark report to JSON */
export function saveBenchmarkReport(matrix: BenchmarkMatrix): string {
  const dir = 'packages/core/output';
  mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const path = `${dir}/provider-benchmark-${ts}.json`;
  writeFileSync(path, JSON.stringify(matrix, null, 2));
  return path;
}
