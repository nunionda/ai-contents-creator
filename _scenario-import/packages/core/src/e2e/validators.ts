// ── Per-Engine Output Validators ──

import type { EngineResult, EngineVerdict } from './types';

type ValidatorFn = (response: any, providers: Record<string, string>) => EngineResult;

function result(
  engine: string,
  verdict: EngineVerdict,
  provider: string,
  summary: string,
  details: string = '',
  metrics: Record<string, number | string | boolean> = {},
): EngineResult {
  return { engine, verdict, provider, isMock: provider === 'mock', durationMs: 0, summary, details, metrics };
}

// ── 1. Parser ──
const validateParser: ValidatorFn = (r) => {
  const engine = 'Parser';
  const total = r.summary?.totalElements ?? 0;
  if (total < 50) return result(engine, 'FAIL', 'determ.', `${total} elements`, `Expected >50 elements, got ${total}`);
  return result(engine, 'PASS', 'determ.', `${total} elements`, '', { totalElements: total });
};

// ── 2. BeatSheet ──
const validateBeatSheet: ValidatorFn = (r, providers) => {
  const engine = 'BeatSheet';
  const p = providers.beatSheet || 'unknown';
  const beats = r.beatSheet;
  if (!Array.isArray(beats) || beats.length === 0)
    return result(engine, 'FAIL', p, '0 beats', 'beatSheet array is empty or missing');

  const invalid = beats.filter((b: any) => !b.name || b.act == null);
  if (invalid.length > 0)
    return result(engine, 'FAIL', p, `${beats.length} beats`, `${invalid.length} beats missing name or act`);

  const verdict: EngineVerdict = p === 'mock' ? 'WARN' : beats.length < 15 ? 'WARN' : 'PASS';
  return result(engine, verdict, p, `${beats.length} beats`, beats.length < 15 ? 'Less than 15 beats (expected Save the Cat structure)' : '', { beatCount: beats.length });
};

// ── 3. Character ──
const validateCharacter: ValidatorFn = (r) => {
  const engine = 'Character';
  const net = r.characterNetwork;
  if (!net?.characters || !Array.isArray(net.characters))
    return result(engine, 'FAIL', 'determ.', '0 chars', 'characterNetwork.characters missing');

  const count = net.characters.length;
  if (count < 2)
    return result(engine, 'FAIL', 'determ.', `${count} chars`, 'Expected at least 2 characters');

  const hasProtagonist = net.characters.some((c: any) => c.role === 'Protagonist');
  if (!hasProtagonist)
    return result(engine, 'WARN', 'determ.', `${count} chars`, 'No Protagonist role assigned');

  if (!net.diversityMetrics)
    return result(engine, 'WARN', 'determ.', `${count} chars`, 'diversityMetrics missing');

  return result(engine, 'PASS', 'determ.', `${count} chars`, '', {
    characterCount: count,
    edgeCount: net.edges?.length ?? 0,
    hasProtagonist,
  });
};

// ── 4. Emotion ──
const validateEmotion: ValidatorFn = (r, providers) => {
  const engine = 'Emotion';
  const p = providers.emotion || 'unknown';
  const scenes = r.emotionGraph;
  if (!Array.isArray(scenes) || scenes.length === 0)
    return result(engine, 'FAIL', p, '0 scenes', 'emotionGraph array is empty or missing');

  const outOfRange = scenes.filter((s: any) => typeof s.score !== 'number' || s.score < -10 || s.score > 10);
  if (outOfRange.length > 0)
    return result(engine, 'FAIL', p, `${scenes.length} scenes`, `${outOfRange.length} scenes with score out of [-10, +10] range`);

  const allSame = scenes.every((s: any) => s.score === scenes[0].score);
  const verdict: EngineVerdict = p === 'mock' ? 'WARN' : allSame ? 'WARN' : 'PASS';
  return result(engine, verdict, p, `${scenes.length} scenes`, allSame ? 'All emotion scores identical (possible mock)' : '', {
    sceneCount: scenes.length,
    minScore: Math.min(...scenes.map((s: any) => s.score)),
    maxScore: Math.max(...scenes.map((s: any) => s.score)),
  });
};

// ── 5. NarrativeArc ──
const VALID_ARCS = ['rags-to-riches', 'riches-to-rags', 'man-in-a-hole', 'icarus', 'cinderella', 'oedipus'];
const validateNarrativeArc: ValidatorFn = (r, providers) => {
  const engine = 'NarrativeArc';
  const p = providers.emotion || 'unknown'; // uses emotion provider
  const arc = r.narrativeArc;
  if (!arc) return result(engine, 'FAIL', p, 'missing', 'narrativeArc object missing');

  if (!VALID_ARCS.includes(arc.arcType))
    return result(engine, 'FAIL', p, arc.arcType || 'unknown', `Invalid arcType: ${arc.arcType}`);

  if (!Array.isArray(arc.turningPoints))
    return result(engine, 'WARN', p, arc.arcType, 'turningPoints missing');

  const verdict: EngineVerdict = p === 'mock' ? 'WARN' : 'PASS';
  return result(engine, verdict, p, arc.arcType, '', {
    arcType: arc.arcType,
    confidence: arc.arcConfidence ?? 0,
    turningPoints: arc.turningPoints?.length ?? 0,
    pacingIssues: arc.pacingIssues?.length ?? 0,
  });
};

// ── 6. Rating ──
const validateRating: ValidatorFn = (r, providers) => {
  const engine = 'Rating';
  const p = providers.rating || 'unknown';
  const rating = r.predictions?.rating;
  if (!rating?.rating) return result(engine, 'FAIL', p, 'missing', 'predictions.rating.rating missing');

  const verdict: EngineVerdict = p === 'mock' ? 'WARN' : 'PASS';
  return result(engine, verdict, p, rating.rating, '', { rating: rating.rating });
};

// ── 7. Production ──
const validateProduction: ValidatorFn = (r) => {
  const engine = 'Production';
  const prod = r.production;
  if (!prod) return result(engine, 'FAIL', 'determ.', 'missing', 'production object missing');

  const locCount = prod.locations?.length ?? 0;
  if (locCount < 1)
    return result(engine, 'FAIL', 'determ.', '0 locations', 'No locations extracted');

  if (!prod.intExtRatio)
    return result(engine, 'WARN', 'determ.', `${locCount} locations`, 'intExtRatio missing');

  if (!prod.estimatedShootingDays || prod.estimatedShootingDays <= 0)
    return result(engine, 'WARN', 'determ.', `${locCount} locations`, 'estimatedShootingDays invalid');

  return result(engine, 'PASS', 'determ.', `${locCount} locations`, '', {
    locationCount: locCount,
    shootingDays: prod.estimatedShootingDays,
    intRatio: prod.intExtRatio?.int ?? 0,
    extRatio: prod.intExtRatio?.ext ?? 0,
  });
};

// ── 8. VFX ──
const validateVFX: ValidatorFn = (r, providers) => {
  const engine = 'VFX';
  const p = providers.vfx || 'unknown';
  const prod = r.production;
  if (!prod) return result(engine, 'FAIL', p, 'missing', 'production object missing');

  if (!Array.isArray(prod.vfxRequirements))
    return result(engine, 'FAIL', p, 'missing', 'vfxRequirements array missing');

  const score = prod.vfxComplexityScore ?? -1;
  if (score < 0) return result(engine, 'WARN', p, `${prod.vfxRequirements.length} req`, 'vfxComplexityScore missing or negative');

  const verdict: EngineVerdict = p === 'mock' ? 'WARN' : 'PASS';
  return result(engine, verdict, p, `${prod.vfxRequirements.length} req`, '', {
    requirementCount: prod.vfxRequirements.length,
    complexityScore: score,
  });
};

// ── 9. Budget ──
const validateBudget: ValidatorFn = (r) => {
  const engine = 'Budget';
  const est = r.production?.budgetEstimate;
  if (!est) return result(engine, 'FAIL', 'determ.', 'missing', 'budgetEstimate missing');

  const { low, likely, high } = est;
  if (typeof low !== 'number' || typeof likely !== 'number' || typeof high !== 'number')
    return result(engine, 'FAIL', 'determ.', 'invalid', 'Budget values are not numbers');

  if (!(low <= likely && likely <= high))
    return result(engine, 'FAIL', 'determ.', 'invalid', `Budget invariant violated: low(${low}) <= likely(${likely}) <= high(${high})`);

  // KRW range check: 100M ~ 50B
  const MIN_KRW = 100_000_000;       // 1억
  const MAX_KRW = 50_000_000_000;    // 500억
  if (likely < MIN_KRW || likely > MAX_KRW)
    return result(engine, 'WARN', 'determ.', formatKRW(likely), `Budget ₩${likely} outside expected KRW range (1억~500억)`);

  return result(engine, 'PASS', 'determ.', formatKRW(likely), '', { low, likely, high });
};

// ── 10. Features ──
const EXPECTED_FEATURE_KEYS = [
  'sceneCount', 'characterCount', 'dialogueLineCount', 'actionLineCount',
  'dialogueToActionRatio', 'intExtRatio', 'uniqueLocationCount', 'avgSceneLength',
];
const validateFeatures: ValidatorFn = (r) => {
  const engine = 'Features';
  const features = r.features;
  if (!features || typeof features !== 'object')
    return result(engine, 'FAIL', 'determ.', 'missing', 'features object missing');

  const keys = Object.keys(features);
  const missing = EXPECTED_FEATURE_KEYS.filter(k => !(k in features));
  if (missing.length > 0)
    return result(engine, 'FAIL', 'determ.', `${keys.length} metrics`, `Missing keys: ${missing.join(', ')}`);

  const nonFinite = keys.filter(k => typeof features[k] === 'number' && !isFinite(features[k]));
  if (nonFinite.length > 0)
    return result(engine, 'WARN', 'determ.', `${keys.length} metrics`, `Non-finite values in: ${nonFinite.join(', ')}`);

  return result(engine, 'PASS', 'determ.', `${keys.length} metrics`, '', { metricCount: keys.length });
};

// ── 11. Tropes ──
const validateTropes: ValidatorFn = (r, providers) => {
  const engine = 'Tropes';
  const p = providers.trope || 'unknown';
  const tropes = r.tropes;
  if (!Array.isArray(tropes))
    return result(engine, 'FAIL', p, 'missing', 'tropes array missing');

  if (tropes.length === 0)
    return result(engine, 'WARN', p, '0 tropes', 'Empty tropes array');

  const verdict: EngineVerdict = p === 'mock' ? 'WARN' : 'PASS';
  return result(engine, verdict, p, `${tropes.length} tropes`, '', { tropeCount: tropes.length });
};

// ── 12. Benchmarker ──
const validateBenchmarker: ValidatorFn = (r) => {
  const engine = 'Benchmarker';
  const comps = r.predictions?.comps;
  if (!Array.isArray(comps) || comps.length === 0)
    return result(engine, 'FAIL', 'determ.', '0 comps', 'predictions.comps empty or missing');

  const invalid = comps.filter((c: any) => !c.title || typeof c.similarityScore !== 'number');
  if (invalid.length > 0)
    return result(engine, 'WARN', 'determ.', `${comps.length} comps`, `${invalid.length} comps missing title or similarityScore`);

  const topComp = comps[0];
  return result(engine, 'PASS', 'determ.', `${comps.length} comps`, '', {
    compCount: comps.length,
    topTitle: topComp.title,
    topScore: topComp.similarityScore,
  });
};

// ── 13. BoxOffice ──
const VALID_TIERS = ['Flop', 'Break-even', 'Hit', 'Blockbuster'];
const validateBoxOffice: ValidatorFn = (r, providers) => {
  const engine = 'BoxOffice';
  const p = providers.roi || 'unknown';
  const roi = r.predictions?.roi;
  if (!roi) return result(engine, 'FAIL', p, 'missing', 'predictions.roi missing');

  if (!VALID_TIERS.includes(roi.tier))
    return result(engine, 'FAIL', p, roi.tier || 'unknown', `Invalid tier: ${roi.tier}`);

  if (typeof roi.predictedMultiplier !== 'number' || roi.predictedMultiplier < 0)
    return result(engine, 'WARN', p, roi.tier, `predictedMultiplier invalid: ${roi.predictedMultiplier}`);

  const verdict: EngineVerdict = p === 'mock' ? 'WARN' : 'PASS';
  return result(engine, verdict, p, `${roi.tier} (${roi.predictedMultiplier}x)`, '', {
    tier: roi.tier,
    multiplier: roi.predictedMultiplier,
    confidence: roi.confidence ?? 0,
  });
};

// ── 14. StatisticalROI ──
const validateStatisticalROI: ValidatorFn = (r) => {
  const engine = 'StatisticalROI';
  const stat = r.predictions?.statisticalRoi;
  if (!stat) return result(engine, 'FAIL', 'determ.', 'missing', 'predictions.statisticalRoi missing');

  if (typeof stat.predictedROI !== 'number')
    return result(engine, 'FAIL', 'determ.', 'invalid', `predictedROI is not a number: ${stat.predictedROI}`);

  if (!stat.revenueRange)
    return result(engine, 'WARN', 'determ.', `${stat.tier} (${stat.predictedROI.toFixed(1)}x)`, 'revenueRange missing');

  return result(engine, 'PASS', 'determ.', `${stat.tier} (${stat.predictedROI.toFixed(1)}x)`, '', {
    tier: stat.tier,
    predictedROI: stat.predictedROI,
    confidence: stat.confidence ?? 0,
  });
};

// ── 15. Coverage ──
const VALID_VERDICTS = ['Pass', 'Consider', 'Recommend'];
const validateCoverage: ValidatorFn = (r, providers) => {
  const engine = 'Coverage';
  const p = providers.coverage || 'unknown';
  const cov = r.coverage;
  if (!cov) return result(engine, 'FAIL', p, 'missing', 'coverage object missing');

  if (!VALID_VERDICTS.includes(cov.verdict))
    return result(engine, 'WARN', p, cov.verdict || 'unknown', `Unexpected verdict: ${cov.verdict}`);

  if (typeof cov.overallScore !== 'number' || cov.overallScore < 0 || cov.overallScore > 100)
    return result(engine, 'WARN', p, cov.verdict, `overallScore out of range: ${cov.overallScore}`);

  if (!cov.logline || !cov.synopsis)
    return result(engine, 'WARN', p, `${cov.verdict} ${cov.overallScore}`, 'logline or synopsis empty');

  const verdict: EngineVerdict = p === 'mock' ? 'WARN' : 'PASS';
  return result(engine, verdict, p, `${cov.verdict} ${cov.overallScore}`, '', {
    verdict: cov.verdict,
    overallScore: cov.overallScore,
    genre: cov.genre ?? '',
  });
};

// ── Helpers ──
function formatKRW(value: number): string {
  if (value >= 1_000_000_000) return `₩${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 100_000_000) return `₩${(value / 100_000_000).toFixed(0)}억`;
  return `₩${value.toLocaleString()}`;
}

// ── Export all validators in pipeline order ──
export const ENGINE_VALIDATORS: ValidatorFn[] = [
  validateParser,
  validateBeatSheet,
  validateCharacter,
  validateEmotion,
  validateNarrativeArc,
  validateRating,
  validateProduction,
  validateVFX,
  validateBudget,
  validateFeatures,
  validateTropes,
  validateBenchmarker,
  validateBoxOffice,
  validateStatisticalROI,
  validateCoverage,
];

export function validateAllEngines(response: any): EngineResult[] {
  const providers = response.providers || {};
  return ENGINE_VALIDATORS.map(fn => fn(response, providers));
}
