/**
 * Calibration Runner — Groq LLM vs Deterministic Engine Comparison
 *
 * Runs 3 Korean scenarios through:
 *   1. Groq LLM mode (ground truth baseline)
 *   2. Deterministic mode (keyword-based engines)
 * Then generates a comparison report for Rating, VFX, and Trope engines.
 *
 * Usage:
 *   bun run packages/core/src/e2e/calibrationRunner.ts
 *
 * Prerequisites:
 *   - API server running on http://localhost:4005
 *   - GROQ_API_KEY set in environment
 */

import * as fs from 'fs';
import * as path from 'path';

const API_BASE = 'http://localhost:4005';
const OUTPUT_DIR = path.resolve(__dirname, '../../output/calibration');

const SCENARIOS = [
  {
    name: '전율미궁_귀신의집',
    path: '/Users/daniel/Desktop/scripts/scripts-analysis-source/전율미궁_귀신의집_시나리오_김진영_20260320.pdf',
    genre: 'horror',
  },
  {
    name: '더킹',
    path: '/Users/daniel/Desktop/scripts/scripts-analysis-source/더킹.pdf',
    genre: 'crime',
  },
  {
    name: '비트세비어',
    path: '/Users/daniel/Desktop/scripts/scripts-analysis-source/비트세비어_260320.pdf',
    genre: 'thriller',
  },
];

const COOLDOWN_MS = 30_000; // 30s between Groq calls

// ─── Helpers ───

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/`);
    const data = await res.json() as { status: string };
    return data.status === 'online';
  } catch {
    return false;
  }
}

async function analyzeScenario(
  pdfPath: string,
  movieId: string,
  deterministic: boolean,
): Promise<any> {
  const pdfBuffer = fs.readFileSync(pdfPath);
  const scriptBase64 = pdfBuffer.toString('base64');

  const url = deterministic
    ? `${API_BASE}/analyze?deterministic=true`
    : `${API_BASE}/analyze`;

  // Deterministic mode: use mock for non-calibrated engines (beatSheet, emotion, roi, coverage)
  // to avoid expensive LLM calls that only delay calibration without adding value
  const providers = deterministic
    ? {
        beatSheet: 'mock' as const,
        emotion: 'mock' as const,
        rating: 'mock' as const,     // overridden by ?deterministic=true
        roi: 'mock' as const,
        coverage: 'mock' as const,
        vfx: 'mock' as const,        // overridden by ?deterministic=true
        trope: 'mock' as const,       // overridden by ?deterministic=true
      }
    : {
        beatSheet: 'gemini' as const,
        emotion: 'gemini' as const,
        rating: 'gemini' as const,
        roi: 'gemini' as const,
        coverage: 'gemini' as const,
        vfx: 'groq' as const,
        trope: 'groq' as const,
      };

  const body = {
    scriptBase64,
    isPdf: true,
    fileName: path.basename(pdfPath),
    movieId: `calibration_${deterministic ? 'det' : 'llm'}_${movieId}`,
    strategy: 'custom',
    customProviders: providers,
    market: 'korean',
    noFallback: false,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(600_000), // 10 min timeout for large PDFs
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

// ─── Comparison Metrics ───

interface RatingComparison {
  scenario: string;
  llmRating: string;
  deterministicRating: string;
  match: boolean;
  llmReasons: string[];
  deterministicReasons: string[];
  llmContentCounts: Record<string, number>;
  deterministicContentCounts: Record<string, number>;
}

interface VFXComparison {
  scenario: string;
  llmRequirementCount: number;
  deterministicRequirementCount: number;
  llmComplexityScore: number;
  deterministicComplexityScore: number;
  complexityScoreDiff: number;
  llmTotalHours: number;
  deterministicTotalHours: number;
  hoursDiffPercent: number;
}

interface TropeComparison {
  scenario: string;
  llmTropes: string[];
  deterministicTropes: string[];
  overlap: string[];
  llmOnly: string[];
  deterministicOnly: string[];
  jaccardSimilarity: number;
}

interface CalibrationReport {
  timestamp: string;
  scenarios: string[];
  rating: {
    comparisons: RatingComparison[];
    matchRate: number;
  };
  vfx: {
    comparisons: VFXComparison[];
    avgComplexityDiff: number;
    avgHoursDiffPercent: number;
  };
  trope: {
    comparisons: TropeComparison[];
    avgJaccardSimilarity: number;
  };
  summary: {
    ratingAccuracy: string;
    vfxAccuracy: string;
    tropeAccuracy: string;
    overallAssessment: string;
  };
}

function compareRating(scenario: string, llm: any, det: any): RatingComparison {
  const llmPred = llm.predictions?.rating || {};
  const detPred = det.predictions?.rating || {};
  return {
    scenario,
    llmRating: llmPred.rating || 'N/A',
    deterministicRating: detPred.rating || 'N/A',
    match: llmPred.rating === detPred.rating,
    llmReasons: llmPred.reasons || [],
    deterministicReasons: detPred.reasons || [],
    llmContentCounts: llmPred.contentCounts || {},
    deterministicContentCounts: detPred.contentCounts || {},
  };
}

function compareVFX(scenario: string, llm: any, det: any): VFXComparison {
  const llmVfx = llm.production?.vfxRequirements || [];
  const detVfx = det.production?.vfxRequirements || [];
  const llmScore = llm.production?.vfxComplexityScore || 0;
  const detScore = det.production?.vfxComplexityScore || 0;
  const llmHours = llmVfx.reduce((s: number, r: any) => s + (r.estimatedHours || 0), 0);
  const detHours = detVfx.reduce((s: number, r: any) => s + (r.estimatedHours || 0), 0);
  const avgHours = (llmHours + detHours) / 2 || 1;

  return {
    scenario,
    llmRequirementCount: llmVfx.length,
    deterministicRequirementCount: detVfx.length,
    llmComplexityScore: llmScore,
    deterministicComplexityScore: detScore,
    complexityScoreDiff: Math.abs(llmScore - detScore),
    llmTotalHours: llmHours,
    deterministicTotalHours: detHours,
    hoursDiffPercent: Math.round(Math.abs(llmHours - detHours) / avgHours * 100),
  };
}

function compareTropes(scenario: string, llm: any, det: any): TropeComparison {
  const llmTropes: string[] = llm.tropes || [];
  const detTropes: string[] = det.tropes || [];
  const llmSet = new Set(llmTropes);
  const detSet = new Set(detTropes);
  const overlap = llmTropes.filter(t => detSet.has(t));
  const llmOnly = llmTropes.filter(t => !detSet.has(t));
  const deterministicOnly = detTropes.filter(t => !llmSet.has(t));
  const union = new Set([...llmTropes, ...detTropes]);
  const jaccard = union.size > 0 ? overlap.length / union.size : 0;

  return {
    scenario,
    llmTropes,
    deterministicTropes: detTropes,
    overlap,
    llmOnly,
    deterministicOnly,
    jaccardSimilarity: Math.round(jaccard * 100) / 100,
  };
}

// ─── Main ───

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Calibration Runner — Groq LLM vs Deterministic');
  console.log('═══════════════════════════════════════════════════');
  console.log();

  // Health check
  if (!(await healthCheck())) {
    console.error('❌ API server not running at', API_BASE);
    console.error('   Start it with: cd apps/api && bun run src/index.ts');
    process.exit(1);
  }
  console.log('✅ API server online\n');

  // Validate files
  for (const s of SCENARIOS) {
    if (!fs.existsSync(s.path)) {
      console.error(`❌ File not found: ${s.path}`);
      process.exit(1);
    }
  }
  console.log('✅ All scenario files found\n');

  const llmResults: Record<string, any> = {};
  const detResults: Record<string, any> = {};

  // Check for --det-only flag: skip LLM step and use existing cached data
  const detOnly = process.argv.includes('--det-only');

  if (detOnly) {
    // Load cached LLM results
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Step 1: Loading Cached LLM Results (--det-only)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (const s of SCENARIOS) {
      const cachedPath = path.join(OUTPUT_DIR, `calibration-llm-${s.name}.json`);
      if (fs.existsSync(cachedPath)) {
        llmResults[s.name] = JSON.parse(fs.readFileSync(cachedPath, 'utf-8'));
        console.log(`  ✅ Loaded: ${s.name} — Rating: ${llmResults[s.name].predictions?.rating?.rating}`);
      } else {
        console.error(`  ❌ No cached LLM data for ${s.name}`);
        llmResults[s.name] = null;
      }
    }
  } else {
    // Step 1: Groq LLM analysis
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Step 1: Groq LLM Analysis (Ground Truth)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (let i = 0; i < SCENARIOS.length; i++) {
      const s = SCENARIOS[i]!;
      console.log(`\n  [${i + 1}/${SCENARIOS.length}] ${s.name} (${s.genre})...`);
      const start = Date.now();
      try {
        const result = await analyzeScenario(s.path, s.name, false);
        llmResults[s.name] = result;
        const dur = ((Date.now() - start) / 1000).toFixed(1);
        console.log(`  ✅ Done in ${dur}s — Rating: ${result.predictions?.rating?.rating}, Tropes: ${result.tropes?.length || 0}`);

        // Save individual result
        const outPath = path.join(OUTPUT_DIR, `calibration-llm-${s.name}.json`);
        fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
        console.log(`  💾 Saved: ${outPath}`);

        if (i < SCENARIOS.length - 1) {
          console.log(`  ⏳ Cooling down ${COOLDOWN_MS / 1000}s...`);
          await sleep(COOLDOWN_MS);
        }
      } catch (err: any) {
        console.error(`  ❌ Failed: ${err.message}`);
        llmResults[s.name] = null;
      }
    }
  }

  // Step 2: Deterministic analysis
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Step 2: Deterministic Analysis');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  for (let i = 0; i < SCENARIOS.length; i++) {
    const s = SCENARIOS[i]!;
    console.log(`\n  [${i + 1}/${SCENARIOS.length}] ${s.name} (deterministic)...`);
    const start = Date.now();
    try {
      const result = await analyzeScenario(s.path, s.name, true);
      detResults[s.name] = result;
      const dur = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`  ✅ Done in ${dur}s — Rating: ${result.predictions?.rating?.rating}, Tropes: ${result.tropes?.length || 0}`);

      // Save individual result
      const outPath = path.join(OUTPUT_DIR, `calibration-det-${s.name}.json`);
      fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
      console.log(`  💾 Saved: ${outPath}`);
    } catch (err: any) {
      console.error(`  ❌ Failed: ${err.message}`);
      detResults[s.name] = null;
    }
  }

  // Step 3: Generate comparison report
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Step 3: Comparison Report');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const ratingComparisons: RatingComparison[] = [];
  const vfxComparisons: VFXComparison[] = [];
  const tropeComparisons: TropeComparison[] = [];

  for (const s of SCENARIOS) {
    const llm = llmResults[s.name];
    const det = detResults[s.name];
    if (!llm || !det) {
      console.log(`  ⚠️  Skipping ${s.name} — missing data`);
      continue;
    }

    ratingComparisons.push(compareRating(s.name, llm, det));
    vfxComparisons.push(compareVFX(s.name, llm, det));
    tropeComparisons.push(compareTropes(s.name, llm, det));
  }

  const matchRate = ratingComparisons.length > 0
    ? ratingComparisons.filter(r => r.match).length / ratingComparisons.length
    : 0;
  const avgComplexityDiff = vfxComparisons.length > 0
    ? vfxComparisons.reduce((s, v) => s + v.complexityScoreDiff, 0) / vfxComparisons.length
    : 0;
  const avgHoursDiff = vfxComparisons.length > 0
    ? vfxComparisons.reduce((s, v) => s + v.hoursDiffPercent, 0) / vfxComparisons.length
    : 0;
  const avgJaccard = tropeComparisons.length > 0
    ? tropeComparisons.reduce((s, t) => s + t.jaccardSimilarity, 0) / tropeComparisons.length
    : 0;

  const report: CalibrationReport = {
    timestamp: new Date().toISOString(),
    scenarios: SCENARIOS.map(s => s.name),
    rating: { comparisons: ratingComparisons, matchRate },
    vfx: { comparisons: vfxComparisons, avgComplexityDiff, avgHoursDiffPercent: avgHoursDiff },
    trope: { comparisons: tropeComparisons, avgJaccardSimilarity: Math.round(avgJaccard * 100) / 100 },
    summary: {
      ratingAccuracy: `${Math.round(matchRate * 100)}% (${ratingComparisons.filter(r => r.match).length}/${ratingComparisons.length} match)`,
      vfxAccuracy: `Complexity diff: ${avgComplexityDiff.toFixed(1)}pts, Hours diff: ${avgHoursDiff.toFixed(0)}%`,
      tropeAccuracy: `Jaccard similarity: ${(avgJaccard * 100).toFixed(0)}%`,
      overallAssessment: matchRate >= 0.66 && avgJaccard >= 0.4
        ? 'PASS — Deterministic engines within acceptable range'
        : 'NEEDS CALIBRATION — Review keyword dictionaries and thresholds',
    },
  };

  // Save report
  const reportPath = path.join(OUTPUT_DIR, `calibration-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Print summary
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║           CALIBRATION SUMMARY                     ║');
  console.log('╠═══════════════════════════════════════════════════╣');
  console.log(`║  Rating Match Rate:    ${report.summary.ratingAccuracy.padEnd(28)}║`);
  console.log(`║  VFX Accuracy:         ${report.summary.vfxAccuracy.slice(0, 28).padEnd(28)}║`);
  console.log(`║  Trope Accuracy:       ${report.summary.tropeAccuracy.padEnd(28)}║`);
  console.log('╠═══════════════════════════════════════════════════╣');
  console.log(`║  ${report.summary.overallAssessment.slice(0, 50).padEnd(50)}║`);
  console.log('╚═══════════════════════════════════════════════════╝');

  // Print detailed per-scenario
  console.log('\n── Rating Details ──');
  for (const r of ratingComparisons) {
    const icon = r.match ? '✅' : '❌';
    console.log(`  ${icon} ${r.scenario}: LLM=${r.llmRating} vs DET=${r.deterministicRating}`);
    console.log(`     LLM counts: V=${r.llmContentCounts.violence || 0} P=${r.llmContentCounts.profanity || 0} S=${r.llmContentCounts.sexualContent || 0} D=${r.llmContentCounts.drugReferences || 0}`);
    console.log(`     DET counts: V=${r.deterministicContentCounts.violence || 0} P=${r.deterministicContentCounts.profanity || 0} S=${r.deterministicContentCounts.sexualContent || 0} D=${r.deterministicContentCounts.drugReferences || 0}`);
  }

  console.log('\n── VFX Details ──');
  for (const v of vfxComparisons) {
    console.log(`  ${v.scenario}: LLM=${v.llmRequirementCount} shots (${v.llmTotalHours}h) vs DET=${v.deterministicRequirementCount} shots (${v.deterministicTotalHours}h)`);
    console.log(`     Complexity: LLM=${v.llmComplexityScore} vs DET=${v.deterministicComplexityScore} (diff: ${v.complexityScoreDiff})`);
  }

  console.log('\n── Trope Details ──');
  for (const t of tropeComparisons) {
    console.log(`  ${t.scenario}: Jaccard=${t.jaccardSimilarity}`);
    console.log(`     Overlap: [${t.overlap.join(', ')}]`);
    console.log(`     LLM only: [${t.llmOnly.join(', ')}]`);
    console.log(`     DET only: [${t.deterministicOnly.join(', ')}]`);
  }

  console.log(`\n💾 Full report: ${reportPath}`);

  // ── Step 4: Ground Truth Validation ──
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Step 4: Ground Truth Validation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const { GROUND_TRUTH, validateAgainstGroundTruth } = await import('./calibrationGroundTruth');

  let allValidationsPass = true;

  for (const s of SCENARIOS) {
    const det = detResults[s.name];
    if (!det) {
      console.log(`  ⚠️  Skipping ${s.name} — no deterministic data`);
      continue;
    }

    const detVfx = det.production?.vfxRequirements || [];
    const detHours = detVfx.reduce((sum: number, r: any) => sum + (r.estimatedHours || 0), 0);

    const validation = validateAgainstGroundTruth(s.name, {
      rating: det.predictions?.rating?.rating,
      vfxShots: detVfx.length,
      vfxHours: detHours,
      vfxComplexity: det.production?.vfxComplexityScore || 0,
      tropes: det.tropes || [],
    });

    const statusIcon = validation.allPass ? '✅' : '❌';
    console.log(`\n  ${statusIcon} ${s.name}`);
    console.log(`     Rating: ${validation.ratingPass ? 'PASS' : 'FAIL'} (${det.predictions?.rating?.rating})`);
    console.log(`     VFX shots deviation: ${validation.vfxShotsDeviation.toFixed(0)}% (target ≤${GROUND_TRUTH[s.name]!.vfx.tolerancePercent}%)`);
    console.log(`     VFX hours deviation: ${validation.vfxHoursDeviation.toFixed(0)}%`);
    console.log(`     Trope Jaccard: ${(validation.tropeJaccard * 100).toFixed(0)}% (target ≥${GROUND_TRUTH[s.name]!.trope.minJaccard * 100}%)`);
    console.log(`     Trope overlap (${validation.tropeOverlap.length}): [${validation.tropeOverlap.join(', ')}]`);
    if (validation.tropeMissed.length > 0) {
      console.log(`     Trope missed (${validation.tropeMissed.length}): [${validation.tropeMissed.join(', ')}]`);
    }
    if (validation.tropeFalsePositive.length > 0) {
      console.log(`     Trope false+ (${validation.tropeFalsePositive.length}): [${validation.tropeFalsePositive.join(', ')}]`);
    }

    if (!validation.allPass) allValidationsPass = false;
  }

  console.log('\n╔═══════════════════════════════════════════════════╗');
  if (allValidationsPass) {
    console.log('║  ✅ ALL GROUND TRUTH VALIDATIONS PASSED            ║');
  } else {
    console.log('║  ❌ SOME GROUND TRUTH VALIDATIONS FAILED           ║');
  }
  console.log('╚═══════════════════════════════════════════════════╝');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
