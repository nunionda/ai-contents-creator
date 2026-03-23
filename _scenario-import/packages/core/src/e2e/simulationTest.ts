#!/usr/bin/env bun
// ── E2E Scenario Simulation Test Runner ──
// Sends 3 Korean screenplay PDFs through the full 14-engine analysis pipeline
// and validates each engine's output structure and data quality.

import { readFileSync } from 'fs';
import type { ScenarioConfig, ScenarioReport, E2EReport, EngineVerdict } from './types';
import { validateAllEngines } from './validators';
import { printScenarioReport, buildCrossComparison, printCrossComparison, printSummary, saveReport } from './report';

// ── Configuration ──
const API_BASE = 'http://localhost:4005';
const TIMEOUT_MS = 600_000; // 10 minutes per scenario
const STRATEGY = 'auto';
const MARKET = 'korean';

const SOURCE_DIR = '/Users/daniel/Desktop/scripts/scripts-analysis-source';

const SCENARIOS: ScenarioConfig[] = [
  {
    fileName: '더킹.pdf',
    filePath: `${SOURCE_DIR}/더킹.pdf`,
    label: '더킹 — 범죄 드라마',
    genre: 'crime',
    isBaseline: true,
    expectedPageCount: 107,
  },
  {
    fileName: '비트세비어_260320.pdf',
    filePath: `${SOURCE_DIR}/비트세비어_260320.pdf`,
    label: '비트세비어 — 테크노 스릴러',
    genre: 'thriller',
    isBaseline: false,
    expectedPageCount: 130,
  },
  {
    fileName: '전율미궁_귀신의집_시나리오_김진영_20260320.pdf',
    filePath: `${SOURCE_DIR}/전율미궁_귀신의집_시나리오_김진영_20260320.pdf`,
    label: '전율미궁: 귀신의 집 — 심리 공포',
    genre: 'horror',
    isBaseline: false,
    expectedPageCount: 58,
  },
];

const SEP = '═'.repeat(62);

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

// ── Analyze a single scenario ──
async function analyzeScenario(scenario: ScenarioConfig): Promise<ScenarioReport> {
  const startTime = Date.now();

  // Read and encode PDF
  const pdfBuffer = readFileSync(scenario.filePath);
  const scriptBase64 = pdfBuffer.toString('base64');

  // POST to /analyze with extended timeout
  // Bun's fetch has a 300s default timeout; use curl for longer operations
  try {
    const payload = JSON.stringify({
      scriptBase64,
      isPdf: true,
      fileName: scenario.fileName,
      strategy: STRATEGY,
      market: MARKET,
    });

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
      throw new Error(`curl exited with code ${exitCode}: ${responseText.slice(0, 200)}`);
    }

    const res = { ok: true, json: () => JSON.parse(responseText) } as any;

    const response = res.json() as any;
    const totalDurationMs = Date.now() - startTime;

    // Validate all engines
    const engines = validateAllEngines(response);

    // Determine overall verdict
    const hasFail = engines.some(e => e.verdict === 'FAIL');
    const hasWarn = engines.some(e => e.verdict === 'WARN');
    const overallVerdict: EngineVerdict = hasFail ? 'FAIL' : hasWarn ? 'WARN' : 'PASS';

    return {
      scenario,
      scriptId: response.scriptId || 'unknown',
      totalDurationMs,
      engines,
      overallVerdict,
      rawResponse: response,
    };
  } catch (err: any) {
    const totalDurationMs = Date.now() - startTime;
    const errorMsg = err.message || 'Unknown error';

    return {
      scenario,
      scriptId: 'error',
      totalDurationMs,
      engines: [{
        engine: 'API Call',
        verdict: 'FAIL',
        provider: 'N/A',
        isMock: false,
        durationMs: totalDurationMs,
        summary: 'failed',
        details: errorMsg,
        metrics: {},
      }],
      overallVerdict: 'FAIL',
      rawResponse: { error: errorMsg },
    };
  }
}

// ── Main ──
async function main() {
  console.log(SEP);
  console.log('  E2E 시나리오 시뮬레이션 검증');
  console.log(`  ${SCENARIOS.length}편 × 15 엔진 | Strategy: ${STRATEGY} | Market: ${MARKET}`);
  console.log(SEP);

  // 1. Health check
  const serverUp = await checkServer();
  if (!serverUp) {
    console.error('\n  ❌ API 서버에 연결할 수 없습니다.');
    console.error('     다음 명령으로 서버를 시작하세요:');
    console.error('     cd apps/api && bun run src/index.ts\n');
    process.exit(1);
  }
  console.log('\n  ✅ API 서버 연결 확인 (localhost:4005)');

  // 2. Check PDF files exist
  for (const s of SCENARIOS) {
    try {
      readFileSync(s.filePath);
    } catch {
      console.error(`\n  ❌ 파일을 찾을 수 없습니다: ${s.filePath}`);
      process.exit(1);
    }
  }
  console.log(`  ✅ PDF 파일 ${SCENARIOS.length}개 확인 완료`);

  // 3. Run scenarios sequentially
  const scenarioReports: ScenarioReport[] = [];

  for (let i = 0; i < SCENARIOS.length; i++) {
    const scenario = SCENARIOS[i];
    console.log(`\n  ⏳ [${i + 1}/${SCENARIOS.length}] ${scenario.label} 분석 중...`);

    const report = await analyzeScenario(scenario);
    scenarioReports.push(report);
    printScenarioReport(report, i, SCENARIOS.length);
  }

  // 4. Cross-scenario comparison
  const validReports = scenarioReports.filter(r => r.scriptId !== 'error');
  if (validReports.length > 1) {
    const comparison = buildCrossComparison(validReports);
    printCrossComparison(comparison);

    // 5. Build and save final report
    const totalPass = scenarioReports.reduce((sum, r) => sum + r.engines.filter(e => e.verdict === 'PASS').length, 0);
    const totalWarn = scenarioReports.reduce((sum, r) => sum + r.engines.filter(e => e.verdict === 'WARN').length, 0);
    const totalFail = scenarioReports.reduce((sum, r) => sum + r.engines.filter(e => e.verdict === 'FAIL').length, 0);
    const totalEngines = totalPass + totalWarn + totalFail;

    const finalReport: E2EReport = {
      timestamp: new Date().toISOString(),
      strategy: STRATEGY,
      market: MARKET,
      scenarios: scenarioReports.map(r => ({ ...r, rawResponse: undefined })),
      comparison,
      summary: { totalPass, totalFail, totalWarn, totalEngines },
    };

    printSummary(finalReport);

    // Save full report with rawResponse
    const fullReport: E2EReport = {
      ...finalReport,
      scenarios: scenarioReports,
    };
    saveReport(fullReport);
  } else {
    console.log('\n  ⚠️ 비교할 유효한 시나리오가 부족합니다.');
  }

  // Exit with appropriate code
  const anyFail = scenarioReports.some(r => r.overallVerdict === 'FAIL');
  process.exit(anyFail ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
