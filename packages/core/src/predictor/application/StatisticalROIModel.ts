import { FILM_CATALOG, type CatalogFilm } from '../data/filmCatalog';
import { KOREAN_FILM_CATALOG } from '../data/koreanFilmCatalog';
import type { ScreenplayFeatures } from '../domain/ScreenplayFeatures';
import type { MarketLocale } from '../../shared/MarketConfig';

// ─── Interfaces ───

export interface StatisticalPrediction {
  predictedROI: number;          // weighted average ROI from k-NN
  predictedMultiplier: number;   // same as ROI for compatibility
  confidence: number;            // 0-100, based on neighbor similarity
  tier: 'Flop' | 'Break-even' | 'Hit' | 'Blockbuster';
  revenueRange: {
    low: number;    // P25 of neighbor revenues
    likely: number; // weighted mean
    high: number;   // P75 of neighbor revenues
  };
  neighbors: Array<{
    title: string;
    similarity: number;
    roi: number;
    revenue: number;
    budget: number;
  }>;
  modelType: 'statistical-knn';
}

// ─── Internal types ───

interface ScoredFilm {
  film: CatalogFilm;
  similarity: number;
}

// ─── Statistical ROI Model ───

export class StatisticalROIModel {
  private static readonly K = 7;

  /**
   * Predict ROI using weighted k-nearest-neighbors regression on the film catalog.
   *
   * @param features  - Extracted screenplay features
   * @param market    - Target market locale ('hollywood' or 'korean')
   * @param budget    - Optional production budget for revenue estimation
   * @returns         - Statistical prediction with ROI, confidence, and neighbor details
   */
  public predict(
    features: ScreenplayFeatures,
    market: MarketLocale = 'hollywood',
    budget?: number,
  ): StatisticalPrediction {
    const catalog = market === 'korean' ? KOREAN_FILM_CATALOG : FILM_CATALOG;
    const scriptVector = this.buildFeatureVector(features);

    // Score every catalog film by cosine similarity
    const scored: ScoredFilm[] = catalog.map((film) => ({
      film,
      similarity: this.cosineSimilarity(scriptVector, this.catalogToVector(film)),
    }));

    // Sort descending by similarity and take top-k neighbors
    scored.sort((a, b) => b.similarity - a.similarity);
    const neighbors = scored.slice(0, StatisticalROIModel.K);

    // Weighted k-NN regression (weight = similarity^2)
    const predictedROI = this.weightedMean(
      neighbors.map((n) => n.film.roi),
      neighbors.map((n) => n.similarity ** 2),
    );

    // Revenue estimation from neighbors
    const neighborRevenues = neighbors
      .map((n) => n.film.revenue)
      .sort((a, b) => a - b);

    const revenueLow = this.percentile(neighborRevenues, 25);
    const revenueHigh = this.percentile(neighborRevenues, 75);

    let revenueLikely: number;
    if (budget !== undefined) {
      revenueLikely = predictedROI * budget;
    } else {
      revenueLikely = this.weightedMean(
        neighbors.map((n) => n.film.revenue),
        neighbors.map((n) => n.similarity ** 2),
      );
    }

    // Confidence: average similarity of top-k * 100, capped at 95
    const avgSimilarity =
      neighbors.reduce((sum, n) => sum + n.similarity, 0) / neighbors.length;
    const confidence = Math.min(avgSimilarity * 100, 95);

    // Tier classification based on market thresholds
    const tier = this.classifyTier(predictedROI, market);

    return {
      predictedROI: +predictedROI.toFixed(2),
      predictedMultiplier: +predictedROI.toFixed(2),
      confidence: +confidence.toFixed(1),
      tier,
      revenueRange: {
        low: Math.round(revenueLow),
        likely: Math.round(revenueLikely),
        high: Math.round(revenueHigh),
      },
      neighbors: neighbors.map((n) => ({
        title: n.film.title,
        similarity: +n.similarity.toFixed(4),
        roi: n.film.roi,
        revenue: n.film.revenue,
        budget: n.film.budget,
      })),
      modelType: 'statistical-knn',
    };
  }

  // ─── Feature Vector Construction ───

  /**
   * Build a normalized 7-dimensional feature vector from screenplay features.
   * Mirrors the Benchmarker's buildFeatureVector exactly.
   */
  private buildFeatureVector(f: ScreenplayFeatures): number[] {
    const dialogueRatio = Math.min(f.metrics.dialogueToActionRatio / 5, 1);
    const volatility = Math.min(f.analysis.emotionalVolatility / 8, 1);
    const sceneCountNorm = Math.min(f.metrics.sceneCount / 150, 1);
    const charCountNorm = Math.min(f.metrics.characterCount / 30, 1);
    const avgWordsNorm = Math.min(f.metrics.averageWordsPerDialogue / 30, 1);
    const dialogueHeavy = f.metrics.dialogueToActionRatio > 1.5 ? 1 : 0;
    const actionHeavy = f.metrics.dialogueToActionRatio < 0.7 ? 1 : 0;

    return [
      dialogueRatio,
      volatility,
      sceneCountNorm,
      charCountNorm,
      avgWordsNorm,
      dialogueHeavy,
      actionHeavy,
    ];
  }

  /**
   * Convert a catalog film's narrative traits into the same 7-dimensional vector space.
   * Mirrors the Benchmarker's catalogToVector exactly.
   */
  private catalogToVector(film: CatalogFilm): number[] {
    const dialogueRatio = film.narrativeTraits.dialogueHeavy ? 0.7 : 0.3;
    const volatilityMap = { low: 0.2, medium: 0.5, high: 0.85 };
    const volatility = volatilityMap[film.narrativeTraits.emotionalVolatility];
    const pacingMap = { slow: 0.3, moderate: 0.5, fast: 0.8 };
    const pacing = pacingMap[film.narrativeTraits.pacing];
    const sceneCountNorm = pacing;
    const charCountNorm = 0.5;
    const avgWordsNorm = film.narrativeTraits.dialogueHeavy ? 0.6 : 0.35;
    const dialogueHeavy = film.narrativeTraits.dialogueHeavy ? 1 : 0;
    const actionHeavy = film.narrativeTraits.actionHeavy ? 1 : 0;

    return [
      dialogueRatio,
      volatility,
      sceneCountNorm,
      charCountNorm,
      avgWordsNorm,
      dialogueHeavy,
      actionHeavy,
    ];
  }

  // ─── Math Utilities ───

  /**
   * Cosine similarity between two equal-length vectors.
   * Returns 0 if either vector has zero magnitude.
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i]! * b[i]!;
      magA += a[i]! * a[i]!;
      magB += b[i]! * b[i]!;
    }

    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  /**
   * Weighted arithmetic mean.
   * Returns 0 if total weight is zero.
   */
  private weightedMean(values: number[], weights: number[]): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (let i = 0; i < values.length; i++) {
      weightedSum += values[i]! * weights[i]!;
      totalWeight += weights[i]!;
    }

    return totalWeight === 0 ? 0 : weightedSum / totalWeight;
  }

  /**
   * Linear-interpolation percentile on a sorted array.
   * @param sorted - Pre-sorted array of numbers (ascending)
   * @param p      - Percentile (0-100)
   */
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    if (sorted.length === 1) return sorted[0]!;

    const idx = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    const fraction = idx - lower;

    if (lower === upper) return sorted[lower]!;
    return sorted[lower]! * (1 - fraction) + sorted[upper]! * fraction;
  }

  // ─── Tier Classification ───

  /**
   * Classify predicted ROI into a market-specific performance tier.
   *
   * Hollywood thresholds: Flop < 1.0, Break-even 1.0-2.5, Hit 2.5-5.0, Blockbuster >= 5.0
   * Korean thresholds:    Flop < 1.0, Break-even 1.0-2.0, Hit 2.0-4.0, Blockbuster >= 4.0
   */
  private classifyTier(
    roi: number,
    market: MarketLocale,
  ): 'Flop' | 'Break-even' | 'Hit' | 'Blockbuster' {
    if (market === 'korean') {
      if (roi < 1.0) return 'Flop';
      if (roi < 2.0) return 'Break-even';
      if (roi < 4.0) return 'Hit';
      return 'Blockbuster';
    }

    // Hollywood (default)
    if (roi < 1.0) return 'Flop';
    if (roi < 2.5) return 'Break-even';
    if (roi < 5.0) return 'Hit';
    return 'Blockbuster';
  }
}
