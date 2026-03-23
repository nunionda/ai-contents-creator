/**
 * DraftComparator — pure deterministic comparison of two screenplay analysis reports.
 * No LLM dependency; operates entirely on the structured report objects produced by the /analyze endpoint.
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface DraftDelta {
  field: string;
  category: 'metrics' | 'coverage' | 'emotion' | 'characters' | 'production' | 'predictions';
  oldValue: string | number;
  newValue: string | number;
  changePercent?: number;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface CharacterDelta {
  name: string;
  status: 'added' | 'removed' | 'changed';
  changes?: string[];
}

export interface DraftComparisonResult {
  oldScriptId: string;
  newScriptId: string;
  summary: {
    totalChanges: number;
    positiveChanges: number;
    negativeChanges: number;
    overallImprovement: boolean;
    scoreChange: number;
  };
  metricDeltas: DraftDelta[];
  coverageDeltas: DraftDelta[];
  characterDeltas: CharacterDelta[];
  emotionArcShift: {
    avgScoreOld: number;
    avgScoreNew: number;
    volatilityOld: number;
    volatilityNew: number;
    newPeaks: number[];
    resolvedDips: number[];
  };
  productionDeltas: DraftDelta[];
  predictionDeltas: DraftDelta[];
  narrativeChanges: string[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function pct(oldVal: number, newVal: number): number | undefined {
  if (oldVal === 0) return newVal === 0 ? 0 : undefined;
  return +((((newVal - oldVal) / Math.abs(oldVal)) * 100).toFixed(1));
}

function round(n: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// ---------------------------------------------------------------------------
// Impact rules for feature metrics
// ---------------------------------------------------------------------------

/** Higher-is-better metrics. */
const POSITIVE_HIGHER: ReadonlySet<string> = new Set([
  'dialogueToActionRatio', // more dialogue density is generally positive
  'averageWordsPerDialogue',
]);

/** Higher-is-worse metrics. */
const NEGATIVE_HIGHER: ReadonlySet<string> = new Set<string>([
  // none by default; budget is handled in production
]);

/**
 * Determine impact for a generic feature metric.
 * sceneCount and characterCount use special thresholds.
 */
function featureImpact(field: string, oldVal: number, newVal: number): 'positive' | 'negative' | 'neutral' {
  const change = pct(oldVal, newVal);
  if (change === undefined || change === 0) return 'neutral';

  // Scene count: within 10% = neutral, reduced = positive (tighter), increased significantly = negative
  if (field === 'sceneCount') {
    if (Math.abs(change) <= 10) return 'neutral';
    return change < 0 ? 'positive' : 'negative';
  }

  // Character count: always neutral
  if (field === 'characterCount') return 'neutral';

  if (POSITIVE_HIGHER.has(field)) return change > 0 ? 'positive' : 'negative';
  if (NEGATIVE_HIGHER.has(field)) return change > 0 ? 'negative' : 'positive';

  return 'neutral';
}

// ---------------------------------------------------------------------------
// DraftComparator
// ---------------------------------------------------------------------------

export class DraftComparator {
  /**
   * Compare two analysis reports and produce a structured diff.
   */
  compare(
    oldReport: Record<string, any>,
    newReport: Record<string, any>,
  ): DraftComparisonResult {
    const metricDeltas = this.compareMetrics(oldReport, newReport);
    const coverageDeltas = this.compareCoverage(oldReport, newReport);
    const characterDeltas = this.compareCharacters(oldReport, newReport);
    const emotionArcShift = this.compareEmotionArc(oldReport, newReport);
    const productionDeltas = this.compareProduction(oldReport, newReport);
    const predictionDeltas = this.comparePredictions(oldReport, newReport);
    const narrativeChanges = this.compareNarrative(oldReport, newReport);

    // Aggregate all deltas for summary
    const allDeltas: DraftDelta[] = [
      ...metricDeltas,
      ...coverageDeltas,
      ...productionDeltas,
      ...predictionDeltas,
    ];

    const positiveChanges = allDeltas.filter(d => d.impact === 'positive').length;
    const negativeChanges = allDeltas.filter(d => d.impact === 'negative').length;

    const oldOverall = (oldReport.coverage as Record<string, any> | undefined)?.overallScore as number | undefined;
    const newOverall = (newReport.coverage as Record<string, any> | undefined)?.overallScore as number | undefined;
    const scoreChange = round((newOverall ?? 0) - (oldOverall ?? 0));

    return {
      oldScriptId: String(oldReport.scriptId ?? ''),
      newScriptId: String(newReport.scriptId ?? ''),
      summary: {
        totalChanges: allDeltas.length + characterDeltas.length + narrativeChanges.length,
        positiveChanges,
        negativeChanges,
        overallImprovement: scoreChange > 0 || (scoreChange === 0 && positiveChanges > negativeChanges),
        scoreChange,
      },
      metricDeltas,
      coverageDeltas,
      characterDeltas,
      emotionArcShift,
      productionDeltas,
      predictionDeltas,
      narrativeChanges,
    };
  }

  // -------------------------------------------------------------------------
  // 1. Metrics comparison
  // -------------------------------------------------------------------------

  private compareMetrics(
    oldReport: Record<string, any>,
    newReport: Record<string, any>,
  ): DraftDelta[] {
    const oldFeatures: Record<string, number> = (oldReport.features as Record<string, number>) ?? {};
    const newFeatures: Record<string, number> = (newReport.features as Record<string, number>) ?? {};

    const allKeys = new Set([...Object.keys(oldFeatures), ...Object.keys(newFeatures)]);
    const deltas: DraftDelta[] = [];

    for (const key of allKeys) {
      const oldVal = oldFeatures[key] ?? 0;
      const newVal = newFeatures[key] ?? 0;
      if (oldVal === newVal) continue;

      deltas.push({
        field: key,
        category: 'metrics',
        oldValue: round(oldVal),
        newValue: round(newVal),
        changePercent: pct(oldVal, newVal),
        impact: featureImpact(key, oldVal, newVal),
      });
    }

    return deltas;
  }

  // -------------------------------------------------------------------------
  // 2. Coverage comparison
  // -------------------------------------------------------------------------

  private compareCoverage(
    oldReport: Record<string, any>,
    newReport: Record<string, any>,
  ): DraftDelta[] {
    const oldCov: Record<string, any> = (oldReport.coverage as Record<string, any>) ?? {};
    const newCov: Record<string, any> = (newReport.coverage as Record<string, any>) ?? {};
    const deltas: DraftDelta[] = [];

    // Overall score
    const oldScore = (oldCov.overallScore as number | undefined) ?? 0;
    const newScore = (newCov.overallScore as number | undefined) ?? 0;
    if (oldScore !== newScore) {
      deltas.push({
        field: 'overallScore',
        category: 'coverage',
        oldValue: oldScore,
        newValue: newScore,
        changePercent: pct(oldScore, newScore),
        impact: newScore > oldScore ? 'positive' : 'negative',
      });
    }

    // Verdict
    const oldVerdict = String(oldCov.verdict ?? '');
    const newVerdict = String(newCov.verdict ?? '');
    if (oldVerdict !== newVerdict && (oldVerdict || newVerdict)) {
      const verdictRank: Record<string, number> = {
        'PASS': 3, 'CONSIDER': 2, 'RECOMMEND': 2, 'FAIL': 1,
      };
      const oldRank = verdictRank[oldVerdict.toUpperCase()] ?? 0;
      const newRank = verdictRank[newVerdict.toUpperCase()] ?? 0;
      deltas.push({
        field: 'verdict',
        category: 'coverage',
        oldValue: oldVerdict,
        newValue: newVerdict,
        impact: newRank > oldRank ? 'positive' : newRank < oldRank ? 'negative' : 'neutral',
      });
    }

    // Category scores
    const oldCats: Array<Record<string, any>> = (oldCov.categories as Array<Record<string, any>>) ?? [];
    const newCats: Array<Record<string, any>> = (newCov.categories as Array<Record<string, any>>) ?? [];

    const oldCatMap = new Map<string, number>();
    for (const cat of oldCats) {
      const name = String(cat.name ?? '');
      if (name) oldCatMap.set(name, (cat.score as number) ?? 0);
    }

    const newCatMap = new Map<string, number>();
    for (const cat of newCats) {
      const name = String(cat.name ?? '');
      if (name) newCatMap.set(name, (cat.score as number) ?? 0);
    }

    const allCatNames = new Set([...oldCatMap.keys(), ...newCatMap.keys()]);
    for (const name of allCatNames) {
      const oldVal = oldCatMap.get(name) ?? 0;
      const newVal = newCatMap.get(name) ?? 0;
      if (oldVal === newVal) continue;

      deltas.push({
        field: `category:${name}`,
        category: 'coverage',
        oldValue: oldVal,
        newValue: newVal,
        changePercent: pct(oldVal, newVal),
        impact: newVal > oldVal ? 'positive' : 'negative',
      });
    }

    return deltas;
  }

  // -------------------------------------------------------------------------
  // 3. Character comparison
  // -------------------------------------------------------------------------

  private compareCharacters(
    oldReport: Record<string, any>,
    newReport: Record<string, any>,
  ): CharacterDelta[] {
    const oldNetwork: Record<string, any> = (oldReport.characterNetwork as Record<string, any>) ?? {};
    const newNetwork: Record<string, any> = (newReport.characterNetwork as Record<string, any>) ?? {};

    const oldChars: Array<Record<string, any>> = (oldNetwork.characters as Array<Record<string, any>>) ?? [];
    const newChars: Array<Record<string, any>> = (newNetwork.characters as Array<Record<string, any>>) ?? [];

    const oldMap = new Map<string, Record<string, any>>();
    for (const c of oldChars) {
      const name = String(c.name ?? '');
      if (name) oldMap.set(name, c);
    }

    const newMap = new Map<string, Record<string, any>>();
    for (const c of newChars) {
      const name = String(c.name ?? '');
      if (name) newMap.set(name, c);
    }

    const deltas: CharacterDelta[] = [];

    // Removed characters
    for (const [name] of oldMap) {
      if (!newMap.has(name)) {
        deltas.push({ name, status: 'removed' });
      }
    }

    // Added characters
    for (const [name] of newMap) {
      if (!oldMap.has(name)) {
        deltas.push({ name, status: 'added' });
      }
    }

    // Changed characters
    for (const [name, oldChar] of oldMap) {
      const newChar = newMap.get(name);
      if (!newChar) continue;

      const changes: string[] = [];

      const oldLines = (oldChar.totalLines as number) ?? 0;
      const newLines = (newChar.totalLines as number) ?? 0;
      if (oldLines !== newLines) {
        changes.push(`lines: ${oldLines}\u2192${newLines}`);
      }

      const oldWords = (oldChar.totalWords as number) ?? 0;
      const newWords = (newChar.totalWords as number) ?? 0;
      if (oldWords !== newWords) {
        changes.push(`words: ${oldWords}\u2192${newWords}`);
      }

      const oldRole = String(oldChar.role ?? '');
      const newRole = String(newChar.role ?? '');
      if (oldRole !== newRole) {
        changes.push(`role: ${oldRole}\u2192${newRole}`);
      }

      if (changes.length > 0) {
        deltas.push({ name, status: 'changed', changes });
      }
    }

    return deltas;
  }

  // -------------------------------------------------------------------------
  // 4. Emotion arc comparison
  // -------------------------------------------------------------------------

  private compareEmotionArc(
    oldReport: Record<string, any>,
    newReport: Record<string, any>,
  ): DraftComparisonResult['emotionArcShift'] {
    const oldScenes: Array<Record<string, any>> = (oldReport.emotionGraph as Array<Record<string, any>>) ?? [];
    const newScenes: Array<Record<string, any>> = (newReport.emotionGraph as Array<Record<string, any>>) ?? [];

    const oldScores = oldScenes.map(s => (s.score as number) ?? 0);
    const newScores = newScenes.map(s => (s.score as number) ?? 0);

    const avgScoreOld = round(mean(oldScores));
    const avgScoreNew = round(mean(newScores));
    const volatilityOld = round(stdDev(oldScores));
    const volatilityNew = round(stdDev(newScores));

    // Peaks: scenes in new report scoring above 75th percentile that weren't peaks in old report
    const oldPeakThreshold = this.percentile(oldScores, 75);
    const newPeakThreshold = this.percentile(newScores, 75);

    const oldPeakScenes = new Set(
      oldScenes
        .filter(s => ((s.score as number) ?? 0) >= oldPeakThreshold)
        .map(s => (s.sceneNumber as number) ?? 0),
    );

    const newPeaks = newScenes
      .filter(s => {
        const score = (s.score as number) ?? 0;
        const scene = (s.sceneNumber as number) ?? 0;
        return score >= newPeakThreshold && !oldPeakScenes.has(scene);
      })
      .map(s => (s.sceneNumber as number) ?? 0);

    // Resolved dips: scenes in old report below 25th percentile that are no longer dips
    const oldDipThreshold = this.percentile(oldScores, 25);
    const newDipThreshold = this.percentile(newScores, 25);

    const newDipScenes = new Set(
      newScenes
        .filter(s => ((s.score as number) ?? 0) <= newDipThreshold)
        .map(s => (s.sceneNumber as number) ?? 0),
    );

    const resolvedDips = oldScenes
      .filter(s => {
        const score = (s.score as number) ?? 0;
        const scene = (s.sceneNumber as number) ?? 0;
        return score <= oldDipThreshold && !newDipScenes.has(scene);
      })
      .map(s => (s.sceneNumber as number) ?? 0);

    return {
      avgScoreOld,
      avgScoreNew,
      volatilityOld,
      volatilityNew,
      newPeaks,
      resolvedDips,
    };
  }

  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return sorted[lower]!;
    const fraction = idx - lower;
    return sorted[lower]! + fraction * (sorted[upper]! - sorted[lower]!);
  }

  // -------------------------------------------------------------------------
  // 5. Production comparison
  // -------------------------------------------------------------------------

  private compareProduction(
    oldReport: Record<string, any>,
    newReport: Record<string, any>,
  ): DraftDelta[] {
    const oldProd: Record<string, any> = (oldReport.production as Record<string, any>) ?? {};
    const newProd: Record<string, any> = (newReport.production as Record<string, any>) ?? {};
    const deltas: DraftDelta[] = [];

    // Scalar fields with impact rules
    const scalarFields: Array<{ field: string; impact: (o: number, n: number) => 'positive' | 'negative' | 'neutral' }> = [
      {
        field: 'uniqueLocationCount',
        impact: (o, n) => (n < o ? 'positive' : n > o ? 'negative' : 'neutral'), // fewer locations = cheaper
      },
      {
        field: 'totalSpeakingRoles',
        impact: () => 'neutral',
      },
      {
        field: 'estimatedShootingDays',
        impact: (o, n) => (n < o ? 'positive' : n > o ? 'negative' : 'neutral'), // fewer days = cheaper
      },
      {
        field: 'vfxComplexityScore',
        impact: () => 'neutral',
      },
    ];

    for (const { field, impact } of scalarFields) {
      const oldVal = (oldProd[field] as number | undefined) ?? 0;
      const newVal = (newProd[field] as number | undefined) ?? 0;
      if (oldVal === newVal) continue;

      deltas.push({
        field,
        category: 'production',
        oldValue: round(oldVal),
        newValue: round(newVal),
        changePercent: pct(oldVal, newVal),
        impact: impact(oldVal, newVal),
      });
    }

    // Budget estimate (compare "likely" tier)
    const oldBudget: Record<string, any> = (oldProd.budgetEstimate as Record<string, any>) ?? {};
    const newBudget: Record<string, any> = (newProd.budgetEstimate as Record<string, any>) ?? {};

    for (const tier of ['low', 'likely', 'high'] as const) {
      const oldVal = (oldBudget[tier] as number | undefined) ?? 0;
      const newVal = (newBudget[tier] as number | undefined) ?? 0;
      if (oldVal === newVal) continue;

      deltas.push({
        field: `budget.${tier}`,
        category: 'production',
        oldValue: round(oldVal),
        newValue: round(newVal),
        changePercent: pct(oldVal, newVal),
        impact: newVal > oldVal ? 'negative' : 'positive', // budget increase = negative
      });
    }

    return deltas;
  }

  // -------------------------------------------------------------------------
  // 6. Prediction comparison
  // -------------------------------------------------------------------------

  private comparePredictions(
    oldReport: Record<string, any>,
    newReport: Record<string, any>,
  ): DraftDelta[] {
    const oldPred: Record<string, any> = (oldReport.predictions as Record<string, any>) ?? {};
    const newPred: Record<string, any> = (newReport.predictions as Record<string, any>) ?? {};
    const deltas: DraftDelta[] = [];

    // ROI
    const oldRoi: Record<string, any> = (oldPred.roi as Record<string, any>) ?? {};
    const newRoi: Record<string, any> = (newPred.roi as Record<string, any>) ?? {};

    const oldTier = String(oldRoi.tier ?? '');
    const newTier = String(newRoi.tier ?? '');
    if (oldTier !== newTier && (oldTier || newTier)) {
      const tierRank: Record<string, number> = { 'low': 1, 'medium': 2, 'high': 3, 'blockbuster': 4 };
      const oldRank = tierRank[oldTier.toLowerCase()] ?? 0;
      const newRank = tierRank[newTier.toLowerCase()] ?? 0;
      deltas.push({
        field: 'roi.tier',
        category: 'predictions',
        oldValue: oldTier,
        newValue: newTier,
        impact: newRank > oldRank ? 'positive' : newRank < oldRank ? 'negative' : 'neutral',
      });
    }

    const oldMult = (oldRoi.predictedMultiplier as number | undefined) ?? 0;
    const newMult = (newRoi.predictedMultiplier as number | undefined) ?? 0;
    if (oldMult !== newMult) {
      deltas.push({
        field: 'roi.predictedMultiplier',
        category: 'predictions',
        oldValue: round(oldMult),
        newValue: round(newMult),
        changePercent: pct(oldMult, newMult),
        impact: newMult > oldMult ? 'positive' : 'negative',
      });
    }

    const oldConf = (oldRoi.confidence as number | undefined) ?? 0;
    const newConf = (newRoi.confidence as number | undefined) ?? 0;
    if (oldConf !== newConf) {
      deltas.push({
        field: 'roi.confidence',
        category: 'predictions',
        oldValue: round(oldConf),
        newValue: round(newConf),
        changePercent: pct(oldConf, newConf),
        impact: newConf > oldConf ? 'positive' : 'negative',
      });
    }

    // Rating
    const oldRating: Record<string, any> = (oldPred.rating as Record<string, any>) ?? {};
    const newRating: Record<string, any> = (newPred.rating as Record<string, any>) ?? {};

    const oldRatingVal = String(oldRating.rating ?? '');
    const newRatingVal = String(newRating.rating ?? '');
    if (oldRatingVal !== newRatingVal && (oldRatingVal || newRatingVal)) {
      deltas.push({
        field: 'rating.rating',
        category: 'predictions',
        oldValue: oldRatingVal,
        newValue: newRatingVal,
        impact: 'neutral', // rating change is neither inherently good nor bad
      });
    }

    const oldRatingConf = (oldRating.confidence as number | undefined) ?? 0;
    const newRatingConf = (newRating.confidence as number | undefined) ?? 0;
    if (oldRatingConf !== newRatingConf) {
      deltas.push({
        field: 'rating.confidence',
        category: 'predictions',
        oldValue: round(oldRatingConf),
        newValue: round(newRatingConf),
        changePercent: pct(oldRatingConf, newRatingConf),
        impact: newRatingConf > oldRatingConf ? 'positive' : 'negative',
      });
    }

    return deltas;
  }

  // -------------------------------------------------------------------------
  // 7. Narrative changes
  // -------------------------------------------------------------------------

  private compareNarrative(
    oldReport: Record<string, any>,
    newReport: Record<string, any>,
  ): string[] {
    const changes: string[] = [];

    // Arc type
    const oldArc: Record<string, any> = (oldReport.narrativeArc as Record<string, any>) ?? {};
    const newArc: Record<string, any> = (newReport.narrativeArc as Record<string, any>) ?? {};

    const oldArcType = String(oldArc.arcType ?? '');
    const newArcType = String(newArc.arcType ?? '');
    if (oldArcType && newArcType && oldArcType !== newArcType) {
      changes.push(`Narrative arc shifted from "${oldArcType}" to "${newArcType}"`);
    }

    const oldArcDesc = String(oldArc.arcDescription ?? '');
    const newArcDesc = String(newArc.arcDescription ?? '');
    if (oldArcDesc && newArcDesc && oldArcDesc !== newArcDesc) {
      changes.push(`Arc description changed: "${oldArcDesc}" \u2192 "${newArcDesc}"`);
    }

    // Beat sheet structure
    const oldBeats: Array<Record<string, any>> = (oldReport.beatSheet as Array<Record<string, any>>) ?? [];
    const newBeats: Array<Record<string, any>> = (newReport.beatSheet as Array<Record<string, any>>) ?? [];

    if (oldBeats.length !== newBeats.length) {
      changes.push(`Beat count changed from ${oldBeats.length} to ${newBeats.length}`);
    }

    // Compare beats by name to detect structural reordering or renaming
    const oldBeatNames = oldBeats.map(b => String(b.name ?? '')).filter(Boolean);
    const newBeatNames = newBeats.map(b => String(b.name ?? '')).filter(Boolean);

    const removedBeats = oldBeatNames.filter(n => !newBeatNames.includes(n));
    const addedBeats = newBeatNames.filter(n => !oldBeatNames.includes(n));

    if (removedBeats.length > 0) {
      changes.push(`Removed beats: ${removedBeats.join(', ')}`);
    }
    if (addedBeats.length > 0) {
      changes.push(`Added beats: ${addedBeats.join(', ')}`);
    }

    // Check for significant page-percentage shifts in shared beats
    for (const oldBeat of oldBeats) {
      const oldName = String(oldBeat.name ?? '');
      if (!oldName) continue;
      const newBeat = newBeats.find(b => String(b.name ?? '') === oldName);
      if (!newBeat) continue;

      const oldPct = (oldBeat.pagePercentage as number | undefined) ?? 0;
      const newPct = (newBeat.pagePercentage as number | undefined) ?? 0;
      const shift = Math.abs(newPct - oldPct);
      if (shift >= 5) {
        changes.push(
          `Beat "${oldName}" page allocation shifted from ${round(oldPct)}% to ${round(newPct)}% (${shift > 0 ? '+' : ''}${round(newPct - oldPct)}pp)`,
        );
      }
    }

    // Tropes
    const oldTropes: string[] = (oldReport.tropes as string[]) ?? [];
    const newTropes: string[] = (newReport.tropes as string[]) ?? [];

    const removedTropes = oldTropes.filter(t => !newTropes.includes(t));
    const addedTropes = newTropes.filter(t => !oldTropes.includes(t));

    if (removedTropes.length > 0) {
      changes.push(`Tropes removed: ${removedTropes.join(', ')}`);
    }
    if (addedTropes.length > 0) {
      changes.push(`Tropes added: ${addedTropes.join(', ')}`);
    }

    // Summary protagonist change
    const oldSummary: Record<string, any> = (oldReport.summary as Record<string, any>) ?? {};
    const newSummary: Record<string, any> = (newReport.summary as Record<string, any>) ?? {};

    const oldProtag = String(oldSummary.protagonist ?? '');
    const newProtag = String(newSummary.protagonist ?? '');
    if (oldProtag && newProtag && oldProtag !== newProtag) {
      changes.push(`Protagonist identification changed from "${oldProtag}" to "${newProtag}"`);
    }

    return changes;
  }
}
