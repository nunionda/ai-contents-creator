#!/usr/bin/env bun
// ── LLM Provider Benchmark Runner ──
// Runs 3 Korean screenplay scenarios through each provider to compare
// quality scores across all 7 LLM engines. Outputs Provider × Engine matrix
// and optimal provider mix recommendations.

import { readFileSync, writeFileSync, existsSync } from 'fs';
import type { ProviderChoice } from '../creative/infrastructure/llm/AnalysisStrategy';
import type { ScenarioConfig } from './types';
import type { ProviderRun, BenchmarkMatrix } from './benchmarkTypes';
import { LLM_ENGINES } from './benchmarkTypes';
import { scoreProviderRun } from './benchmarkScorer';
import {
  aggregateScores,
  computeOptimalMixes,
  printMatrix,
  printPerScenario,
  printOptimalMixes,
  saveBenchmarkReport,
} from './benchmarkReport';

// ── Configuration ──
const API_BASE = 'http://localhost:4005';
const TIMEOUT_MS = 600_000; // 10 minutes per scenario
const MARKET = 'korean';

const SOURCE_DIR = '/Users/daniel/Desktop/scripts/scripts-analysis-source';

const SCENARIOS: ScenarioConfig[] = [
  {
    fileName: '전율미궁_귀신의집_시나리오_김진영_20260320.pdf',
    filePath: `${SOURCE_DIR}/전율미궁_귀신의집_시나리오_김진영_20260320.pdf`,
    label: '전율미궁 (58p, horror)',
    genre: 'horror',
    isBaseline: false,
    expectedPageCount: 58,
  },
  {
    fileName: '더킹.pdf',
    filePath: `${SOURCE_DIR}/더킹.pdf`,
    label: '더킹 (107p, crime)',
    genre: 'crime',
    isBaseline: true,
    expectedPageCount: 107,
  },
  {
    fileName: '비트세비어_260320.pdf',
    filePath: `${SOURCE_DIR}/비트세비어_260320.pdf`,
    label: '비트세비어 (130p, thriller)',
    genre: 'thriller',
    isBaseline: false,
    expectedPageCount: 130,
  },
];

// Ordered by rate-limit friendliness (free/generous first)
const ALL_PROVIDERS: ProviderChoice[] = [
  'groq', 'deepseek', 'openai', 'anthropic', 'gemini', 'gemini-pro',
];

const COOLDOWN_SCENARIO_MS = 30_000;  // 30s between scenarios (rate limit buffer)
const COOLDOWN_PROVIDER_MS = 45_000;  // 45s between provider switches

const SEP = '═'.repeat(72);
const CHECKPOINT_DIR = 'packages/core/output';

// ── CLI Args ──
function parseArgs(): { providers: ProviderChoice[]; resume: boolean } {
  const args = process.argv.slice(2);
  let providers = ALL_PROVIDERS;
  let resume = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--providers' && args[i + 1]) {
      providers = args[i + 1].split(',').map(p => p.trim()) as ProviderChoice[];
      i++;
    }
    if (args[i] === '--resume') {
      resume = true;
    }
  }

  return { providers, resume };
}

// ── Health Check ──
async function checkServer(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/`);
    const data = await res.json() as any;
    return data.status === 'online';
  } catch {
    return false;
  }
}

// ── Checkpoint ──
function getCheckpointPath(): string {
  return `${CHECKPOINT_DIR}/benchmark-checkpoint.json`;
}

function loadCheckpoint(): ProviderRun[] {
  const path = getCheckpointPath();
  if (!existsSync(path)) return [];
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    return data.runs || [];
  } catch {
    return [];
  }
}

function saveCheckpoint(runs: ProviderRun[]) {
  const { mkdirSync } = require('fs');
  mkdirSync(CHECKPOINT_DIR, { recursive: true });
  writeFileSync(getCheckpointPath(), JSON.stringify({ runs, savedAt: new Date().toISOString() }, null, 2));
}

function isCompleted(runs: ProviderRun[], provider: ProviderChoice, scenario: string): boolean {
  return runs.some(r => r.provider === provider && r.scenario === scenario && !r.error);
}

// ── Run single provider × scenario ──
async function runBenchmark(
  provider: ProviderChoice,
  scenario: ScenarioConfig,
): Promise<ProviderRun> {
  const startTime = Date.now();

  // Build customProviders: all engines use the same provider
  const customProviders: Record<string, string> = {};
  for (const engine of LLM_ENGINES) {
    customProviders[engine] = provider;
  }

  // Read and encode PDF
  const pdfBuffer = readFileSync(scenario.filePath);
  const scriptBase64 = pdfBuffer.toString('base64');

  const payload = JSON.stringify({
    scriptBase64,
    isPdf: true,
    fileName: scenario.fileName,
    strategy: 'custom',
    customProviders,
    market: MARKET,
    noFallback: true,
  });

  try {
    // Use curl subprocess to bypass Bun's 300s fetch timeout
    const curlProc = Bun.spawn([
      'curl', '-s', '-X', 'POST',
      `${API_BASE}/analyze`,
      '-H', 'Content-Type: application/json',
      '-d', '@-',
      '--max-time', String(TIMEOUT_MS / 1000),
    ], { stdin: 'pipe' });

    curlProc.stdin.write(payload);
    curlProc.stdin.end();

    const responseText = await new Response(curlProc.stdout).text();
    const exitCode = await curlProc.exited;

    if (exitCode !== 0) {
      throw new Error(`curl exited with code ${exitCode}: ${responseText.slice(0, 500)}`);
    }

    const response = JSON.parse(responseText);

    if (response.error) {
      throw new Error(`API error: ${response.error}`);
    }

    const totalDurationMs = Date.now() - startTime;
    const engineScores = scoreProviderRun(response, provider);

    // Import validateAllEngines for validator results
    const { validateAllEngines } = await import('./validators');
    const validatorResults = validateAllEngines(response);

    return {
      provider,
      scenario: scenario.fileName,
      label: scenario.label,
      timestamp: new Date().toISOString(),
      totalDurationMs,
      engineScores,
      validatorResults,
    };
  } catch (err: any) {
    const totalDurationMs = Date.now() - startTime;
    return {
      provider,
      scenario: scenario.fileName,
      label: scenario.label,
      timestamp: new Date().toISOString(),
      totalDurationMs,
      engineScores: [],
      validatorResults: [],
      error: err.message || 'Unknown error',
    };
  }
}

// ── Sleep helper ──
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Main ──
async function main() {
  const { providers, resume } = parseArgs();

  console.log(`\n${SEP}`);
  console.log('  LLM Provider Benchmark');
  console.log(`  ${providers.length} providers × ${SCENARIOS.length} scenarios = ${providers.length * SCENARIOS.length} runs`);
  console.log(`  Engines: ${LLM_ENGINES.join(', ')}`);
  console.log(`  Providers: ${providers.join(', ')}`);
  console.log(SEP);

  // 1. Health check
  const serverUp = await checkServer();
  if (!serverUp) {
    console.error('\n  ❌ API 서버에 연결할 수 없습니다.');
    console.error('     cd apps/api && bun run src/index.ts');
    process.exit(1);
  }
  console.log('\n  ✅ API 서버 연결 확인');

  // 2. Check PDF files
  for (const s of SCENARIOS) {
    try {
      readFileSync(s.filePath);
    } catch {
      console.error(`\n  ❌ 파일 없음: ${s.filePath}`);
      process.exit(1);
    }
  }
  console.log(`  ✅ PDF 파일 ${SCENARIOS.length}개 확인`);

  // 3. Load checkpoint if resuming
  let runs: ProviderRun[] = resume ? loadCheckpoint() : [];
  if (resume && runs.length > 0) {
    console.log(`  ♻️  체크포인트 로드: ${runs.length}개 완료된 run`);
  }

  // 4. Execute benchmark
  const totalRuns = providers.length * SCENARIOS.length;
  let completedRuns = runs.length;

  for (let pi = 0; pi < providers.length; pi++) {
    const provider = providers[pi];

    // Provider switch cooldown (skip for first provider)
    if (pi > 0) {
      console.log(`\n  ⏸  프로바이더 전환 쿨다운 (${COOLDOWN_PROVIDER_MS / 1000}s)...`);
      await sleep(COOLDOWN_PROVIDER_MS);
    }

    console.log(`\n  ── Provider: ${provider} ──`);

    for (let si = 0; si < SCENARIOS.length; si++) {
      const scenario = SCENARIOS[si];

      // Skip completed runs (resume mode)
      if (isCompleted(runs, provider, scenario.fileName)) {
        console.log(`  ⏭  [${provider}] ${scenario.label} — 이미 완료`);
        continue;
      }

      // Scenario cooldown (skip for first scenario of each provider)
      if (si > 0) {
        console.log(`  ⏸  시나리오 쿨다운 (${COOLDOWN_SCENARIO_MS / 1000}s)...`);
        await sleep(COOLDOWN_SCENARIO_MS);
      }

      completedRuns++;
      const progress = `[${completedRuns}/${totalRuns}]`;
      console.log(`\n  ⏳ ${progress} ${provider} × ${scenario.label}`);

      const run = await runBenchmark(provider, scenario);

      if (run.error) {
        console.log(`  ❌ ERROR: ${run.error.slice(0, 200)}`);
      } else {
        const avgScore = run.engineScores.length > 0
          ? Math.round(run.engineScores.reduce((s, e) => s + e.overallScore, 0) / run.engineScores.length)
          : 0;
        const passCount = run.engineScores.filter(e => e.validatorVerdict === 'PASS').length;
        const fallbackCount = run.engineScores.filter(e => e.fellBack).length;
        const duration = (run.totalDurationMs / 1000).toFixed(1);

        console.log(`  ✅ Score: ${avgScore} | PASS: ${passCount}/7 | Fallback: ${fallbackCount} | ${duration}s`);

        // Per-engine detail
        for (const es of run.engineScores) {
          const fb = es.fellBack ? ` [→${es.actualProvider}]` : '';
          console.log(`     ${es.engine.padEnd(12)} ${es.overallScore.toString().padStart(3)} (S:${es.structuralScore} C:${es.contentScore}) ${es.validatorVerdict}${fb}`);
        }
      }

      runs.push(run);
      saveCheckpoint(runs);
    }
  }

  // 5. Generate report
  console.log(`\n${SEP}`);
  console.log('  벤치마크 완료 — 리포트 생성 중');
  console.log(SEP);

  const successfulRuns = runs.filter(r => !r.error);

  if (successfulRuns.length === 0) {
    console.error('\n  ❌ 성공한 run이 없습니다.');
    process.exit(1);
  }

  const { byProviderEngine, byProvider } = aggregateScores(successfulRuns);
  const optimalMixes = computeOptimalMixes(byProviderEngine);

  // Print all reports
  printMatrix(byProviderEngine, byProvider);
  printPerScenario(successfulRuns);
  printOptimalMixes(optimalMixes);

  // Save full report
  const matrix: BenchmarkMatrix = {
    timestamp: new Date().toISOString(),
    providers: providers,
    scenarios: SCENARIOS,
    engines: LLM_ENGINES,
    runs: successfulRuns,
    byProviderEngine,
    byProvider,
    optimalMixes,
  };

  const reportPath = saveBenchmarkReport(matrix);
  console.log(`\n  📄 리포트 저장: ${reportPath}`);

  // Summary
  const errorCount = runs.filter(r => r.error).length;
  console.log(`\n${SEP}`);
  console.log(`  완료: ${successfulRuns.length}/${runs.length} 성공 (${errorCount} 오류)`);
  console.log(SEP);

  process.exit(errorCount > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
