// ── E2E Report Formatter ──

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { ScenarioReport, CrossComparison, E2EReport, EngineVerdict } from './types';

const ICONS: Record<EngineVerdict, string> = { PASS: '✅', FAIL: '❌', WARN: '⚠️' };
const SEP = '═'.repeat(62);
const LINE = '─'.repeat(62);

export function printScenarioReport(report: ScenarioReport, index: number, total: number) {
  const tag = report.scenario.isBaseline ? ' [BASELINE]' : '';
  console.log(`\n[${index + 1}/${total}] ${report.scenario.label}${tag}`);
  console.log(LINE);

  for (const e of report.engines) {
    const icon = ICONS[e.verdict];
    const provCol = e.provider.padEnd(10);
    const summCol = e.summary.padEnd(14);
    const engineCol = e.engine.padEnd(16);
    const timeStr = e.durationMs > 0 ? `${(e.durationMs / 1000).toFixed(1)}s` : '';
    console.log(`  ${icon} ${engineCol}| ${summCol}| ${provCol}| ${timeStr}`);
    if (e.verdict === 'FAIL' && e.details) {
      console.log(`     └─ ${e.details}`);
    }
  }

  const pass = report.engines.filter(e => e.verdict === 'PASS').length;
  const warn = report.engines.filter(e => e.verdict === 'WARN').length;
  const fail = report.engines.filter(e => e.verdict === 'FAIL').length;
  const totalTime = (report.totalDurationMs / 1000).toFixed(1);

  console.log(LINE);
  console.log(`  Result: ${pass} PASS | ${warn} WARN | ${fail} FAIL | Total: ${totalTime}s`);
}

export function buildCrossComparison(scenarios: ScenarioReport[]): CrossComparison[] {
  const labels = scenarios.map(s => s.scenario.fileName.replace('.pdf', ''));
  const metrics: CrossComparison[] = [];

  const addMetric = (metric: string, extractor: (r: any) => string | number) => {
    const values: Record<string, string | number> = {};
    for (let i = 0; i < scenarios.length; i++) {
      const raw = scenarios[i].rawResponse;
      try { values[labels[i]] = extractor(raw); }
      catch { values[labels[i]] = 'N/A'; }
    }
    metrics.push({ metric, values });
  };

  addMetric('Total Elements', r => r.summary?.totalElements ?? 0);
  addMetric('Scene Count', r => r.features?.sceneCount ?? 0);
  addMetric('Characters', r => r.characterNetwork?.characters?.length ?? 0);
  addMetric('Protagonist', r => r.characterNetwork?.characters?.[0]?.name ?? 'N/A');
  addMetric('Arc Type', r => r.narrativeArc?.arcType ?? 'N/A');
  addMetric('Arc Confidence', r => r.narrativeArc?.arcConfidence?.toFixed(0) ?? 'N/A');
  addMetric('Emotion Range', r => {
    const scores = (r.emotionGraph || []).map((s: any) => s.score).filter((s: any) => typeof s === 'number');
    if (scores.length === 0) return 'N/A';
    return `${Math.min(...scores)} ~ ${Math.max(...scores)}`;
  });
  addMetric('Locations', r => r.production?.uniqueLocationCount ?? 0);
  addMetric('Shooting Days', r => r.production?.estimatedShootingDays ?? 0);
  addMetric('VFX Score', r => r.production?.vfxComplexityScore?.toFixed(1) ?? 'N/A');
  addMetric('Budget (₩B)', r => {
    const v = r.production?.budgetEstimate?.likely;
    return v ? (v / 1_000_000_000).toFixed(1) : 'N/A';
  });
  addMetric('ROI Tier', r => r.predictions?.roi?.tier ?? 'N/A');
  addMetric('ROI Multiplier', r => r.predictions?.roi?.predictedMultiplier?.toFixed(1) ?? 'N/A');
  addMetric('Stat ROI', r => r.predictions?.statisticalRoi?.predictedROI?.toFixed(1) ?? 'N/A');
  addMetric('Coverage Verdict', r => r.coverage?.verdict ?? 'N/A');
  addMetric('Overall Score', r => r.coverage?.overallScore ?? 'N/A');
  addMetric('Genre', r => r.coverage?.genre ?? 'N/A');
  addMetric('Rating', r => r.predictions?.rating?.rating ?? 'N/A');
  addMetric('Top Comp', r => r.predictions?.comps?.[0]?.title ?? 'N/A');
  addMetric('Trope Count', r => r.tropes?.length ?? 0);

  return metrics;
}

export function printCrossComparison(comparison: CrossComparison[]) {
  console.log(`\n${SEP}`);
  console.log('  Cross-Scenario Comparison (시나리오 간 비교)');
  console.log(SEP);

  const labels = Object.keys(comparison[0]?.values || {});
  const header = '  Metric'.padEnd(22) + labels.map(l => l.padEnd(16)).join('');
  console.log(header);
  console.log('  ' + '─'.repeat(22 + labels.length * 16));

  for (const row of comparison) {
    const vals = labels.map(l => String(row.values[l] ?? 'N/A').padEnd(16)).join('');
    console.log(`  ${row.metric.padEnd(20)}${vals}`);
  }
}

export function printSummary(report: E2EReport) {
  const { totalPass, totalFail, totalWarn, totalEngines } = report.summary;
  console.log(`\n${SEP}`);
  console.log(`  SUMMARY: ${totalPass}/${totalEngines} PASS | ${totalWarn} WARN | ${totalFail} FAIL`);

  if (totalFail > 0) {
    console.log('\n  ❌ FAILED ENGINES:');
    for (const s of report.scenarios) {
      for (const e of s.engines.filter(e => e.verdict === 'FAIL')) {
        console.log(`     [${s.scenario.fileName}] ${e.engine}: ${e.details}`);
      }
    }
  }
  console.log(SEP);
}

export function saveReport(report: E2EReport) {
  const outputDir = join(import.meta.dir, '../../output');
  mkdirSync(outputDir, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filePath = join(outputDir, `e2e-report-${ts}.json`);
  writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\n  📄 JSON report saved: ${filePath}`);
  return filePath;
}
