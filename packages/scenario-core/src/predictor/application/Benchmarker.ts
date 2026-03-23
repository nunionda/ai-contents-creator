import type { ScreenplayFeatures } from "../domain/ScreenplayFeatures";
import type { SimilarityReport, CompFilm } from "../domain/SimilarityReport";
import type { MarketLocale } from "../../shared/MarketConfig";
import { FILM_CATALOG, type CatalogFilm } from "../data/filmCatalog";
import { KOREAN_FILM_CATALOG } from "../data/koreanFilmCatalog";

export class Benchmarker {
  /**
   * Finds comparable films using cosine similarity on a feature vector
   * built from screenplay metrics. Returns top 5 matches from a 50+ film catalog.
   */
  public findComps(features: ScreenplayFeatures, scriptTropes?: string[], market: MarketLocale = 'hollywood'): SimilarityReport {
    const catalog = market === 'korean' ? KOREAN_FILM_CATALOG : FILM_CATALOG;
    const scriptVector = this.buildFeatureVector(features);

    const scored = catalog.map((film) => {
      const filmVector = this.catalogToVector(film);
      const cosineSim = this.cosineSimilarity(scriptVector, filmVector);

      // Trope overlap bonus (if available)
      let tropeBonus = 0;
      if (scriptTropes && scriptTropes.length > 0) {
        const overlap = film.tropes.filter((t) =>
          scriptTropes.some((st) => st.toLowerCase() === t.toLowerCase()),
        ).length;
        tropeBonus = overlap > 0 ? (overlap / Math.max(scriptTropes.length, film.tropes.length)) * 0.15 : 0;
      }

      const finalScore = Math.min(cosineSim + tropeBonus, 0.99);

      const sharedTraits = this.identifySharedTraits(features, film);

      return {
        title: film.title,
        similarityScore: +finalScore.toFixed(3),
        sharedTraits,
        marketPerformance: {
          budget: film.budget,
          revenue: film.revenue,
          roi: film.roi,
        },
      } satisfies CompFilm;
    });

    return {
      scriptId: features.scriptId,
      topComps: scored.sort((a, b) => b.similarityScore - a.similarityScore).slice(0, 5),
    };
  }

  /**
   * Build a normalized feature vector from screenplay features.
   * Dimensions: [dialogueRatio, volatility, sceneCountNorm, charCountNorm, avgWordsNorm, pacing]
   */
  private buildFeatureVector(f: ScreenplayFeatures): number[] {
    const dialogueRatio = Math.min(f.metrics.dialogueToActionRatio / 5, 1); // normalize 0-5 → 0-1
    const volatility = Math.min(f.analysis.emotionalVolatility / 8, 1);     // normalize 0-8 → 0-1
    const sceneCountNorm = Math.min(f.metrics.sceneCount / 150, 1);         // normalize 0-150 → 0-1
    const charCountNorm = Math.min(f.metrics.characterCount / 30, 1);       // normalize 0-30 → 0-1
    const avgWordsNorm = Math.min(f.metrics.averageWordsPerDialogue / 30, 1);
    const dialogueHeavy = f.metrics.dialogueToActionRatio > 1.5 ? 1 : 0;
    const actionHeavy = f.metrics.dialogueToActionRatio < 0.7 ? 1 : 0;

    return [dialogueRatio, volatility, sceneCountNorm, charCountNorm, avgWordsNorm, dialogueHeavy, actionHeavy];
  }

  /**
   * Convert a catalog film's traits into the same vector space.
   */
  private catalogToVector(film: CatalogFilm): number[] {
    const dialogueRatio = film.narrativeTraits.dialogueHeavy ? 0.7 : 0.3;
    const volatilityMap = { low: 0.2, medium: 0.5, high: 0.85 };
    const volatility = volatilityMap[film.narrativeTraits.emotionalVolatility];
    const pacingMap = { slow: 0.3, moderate: 0.5, fast: 0.8 };
    const pacing = pacingMap[film.narrativeTraits.pacing];
    const sceneCountNorm = pacing; // approximate
    const charCountNorm = 0.5; // catalog doesn't track exact counts
    const avgWordsNorm = film.narrativeTraits.dialogueHeavy ? 0.6 : 0.35;
    const dialogueHeavy = film.narrativeTraits.dialogueHeavy ? 1 : 0;
    const actionHeavy = film.narrativeTraits.actionHeavy ? 1 : 0;

    return [dialogueRatio, volatility, sceneCountNorm, charCountNorm, avgWordsNorm, dialogueHeavy, actionHeavy];
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i]! * b[i]!;
      magA += a[i]! * a[i]!;
      magB += b[i]! * b[i]!;
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  private identifySharedTraits(features: ScreenplayFeatures, film: CatalogFilm): string[] {
    const traits: string[] = [];

    if (features.metrics.dialogueToActionRatio > 1.5 && film.narrativeTraits.dialogueHeavy) {
      traits.push("Dialogue Heavy");
    }
    if (features.metrics.dialogueToActionRatio < 0.7 && film.narrativeTraits.actionHeavy) {
      traits.push("Action Heavy");
    }
    if (features.analysis.emotionalVolatility > 4 && film.narrativeTraits.emotionalVolatility === 'high') {
      traits.push("High Emotional Volatility");
    }
    if (features.analysis.emotionalVolatility < 2 && film.narrativeTraits.emotionalVolatility === 'low') {
      traits.push("Low Emotional Volatility");
    }

    // Genre overlap hint from film catalog
    if (film.genres.length > 0) {
      traits.push(film.genres[0]!);
    }

    return traits.slice(0, 5);
  }
}
