import { describe, expect, test } from "bun:test";
import { Benchmarker } from "./Benchmarker";
import { KOREAN_FILM_CATALOG } from "../data/koreanFilmCatalog";

describe("Benchmarker", () => {
  const benchmarker = new Benchmarker();

  test("should find comparable films using cosine similarity from 50+ catalog", () => {
    const mockFeatures: any = {
      scriptId: "test-script",
      metrics: {
        dialogueToActionRatio: 3.5,
        sceneCount: 60,
        characterCount: 12,
        averageWordsPerDialogue: 15,
      },
      analysis: { emotionalVolatility: 5.0 },
    };

    const report = benchmarker.findComps(mockFeatures);

    // Should return top 5 comps from 50+ catalog
    expect(report.topComps.length).toBe(5);
    expect(report.scriptId).toBe("test-script");

    // All scores should be between 0 and 1
    for (const comp of report.topComps) {
      expect(comp.similarityScore).toBeGreaterThan(0);
      expect(comp.similarityScore).toBeLessThanOrEqual(1);
      expect(comp.sharedTraits.length).toBeGreaterThan(0);
      expect(comp.marketPerformance.budget).toBeGreaterThan(0);
    }

    // High dialogue ratio should favor dialogue-heavy films
    const dialogueHeavyFilms = report.topComps.filter((c) =>
      c.sharedTraits.includes("Dialogue Heavy"),
    );
    expect(dialogueHeavyFilms.length).toBeGreaterThan(0);
  });

  test("should boost similarity when tropes overlap", () => {
    const mockFeatures: any = {
      scriptId: "test-trope",
      metrics: {
        dialogueToActionRatio: 1.0,
        sceneCount: 40,
        characterCount: 8,
        averageWordsPerDialogue: 12,
      },
      analysis: { emotionalVolatility: 3.0 },
    };

    const allWithout = benchmarker.findComps(mockFeatures);
    const allWithTropes = benchmarker.findComps(mockFeatures, ["Revenge", "Anti-Hero"]);

    // Verify trope matching produces valid results
    expect(allWithTropes.topComps.length).toBe(5);
    expect(allWithout.topComps.length).toBe(5);

    // Top score with tropes should be >= top score without
    expect(allWithTropes.topComps[0]!.similarityScore).toBeGreaterThanOrEqual(
      allWithout.topComps[0]!.similarityScore,
    );
  });
});

describe("Benchmarker — Korean Market", () => {
  const benchmarker = new Benchmarker();

  test("should return Korean films when market is 'korean'", () => {
    const mockFeatures: any = {
      scriptId: "test-korean",
      metrics: {
        dialogueToActionRatio: 3.0,
        sceneCount: 50,
        characterCount: 10,
        averageWordsPerDialogue: 12,
      },
      analysis: { emotionalVolatility: 5.0 },
    };

    const report = benchmarker.findComps(mockFeatures, undefined, "korean");

    expect(report.topComps.length).toBe(5);
    expect(report.scriptId).toBe("test-korean");

    const koreanTitles = KOREAN_FILM_CATALOG.map((f) => f.title);
    for (const comp of report.topComps) {
      expect(koreanTitles).toContain(comp.title);
    }
  });

  test("Korean comps should have KRW-scale budgets", () => {
    const mockFeatures: any = {
      scriptId: "test-krw",
      metrics: {
        dialogueToActionRatio: 2.0,
        sceneCount: 40,
        characterCount: 8,
        averageWordsPerDialogue: 14,
      },
      analysis: { emotionalVolatility: 4.0 },
    };

    const report = benchmarker.findComps(mockFeatures, undefined, "korean");

    for (const comp of report.topComps) {
      expect(comp.marketPerformance.budget).toBeGreaterThan(1_000_000_000);
    }
  });

  test("Korean and Hollywood catalogs return different films", () => {
    const mockFeatures: any = {
      scriptId: "test-diff",
      metrics: {
        dialogueToActionRatio: 2.0,
        sceneCount: 50,
        characterCount: 10,
        averageWordsPerDialogue: 14,
      },
      analysis: { emotionalVolatility: 5.0 },
    };

    const hollywood = benchmarker.findComps(mockFeatures, undefined, "hollywood");
    const korean = benchmarker.findComps(mockFeatures, undefined, "korean");

    const hwTitles = hollywood.topComps.map((c) => c.title);
    const krTitles = korean.topComps.map((c) => c.title);

    const overlap = hwTitles.filter((t) => krTitles.includes(t));
    expect(overlap.length).toBe(0);
  });

  test("Korean trope overlap should boost similarity", () => {
    const mockFeatures: any = {
      scriptId: "test-kr-trope",
      metrics: {
        dialogueToActionRatio: 2.5,
        sceneCount: 45,
        characterCount: 8,
        averageWordsPerDialogue: 13,
      },
      analysis: { emotionalVolatility: 5.0 },
    };

    const without = benchmarker.findComps(mockFeatures, undefined, "korean");
    const withTropes = benchmarker.findComps(
      mockFeatures,
      ["Shamanism", "Folk Horror", "Revenge Drama"],
      "korean",
    );

    expect(withTropes.topComps[0]!.similarityScore).toBeGreaterThanOrEqual(
      without.topComps[0]!.similarityScore,
    );
  });

  test("action-heavy features should favor Korean action films", () => {
    const actionFeatures: any = {
      scriptId: "test-kr-action",
      metrics: {
        dialogueToActionRatio: 0.4,
        sceneCount: 70,
        characterCount: 15,
        averageWordsPerDialogue: 8,
      },
      analysis: { emotionalVolatility: 6.0 },
    };

    const report = benchmarker.findComps(actionFeatures, undefined, "korean");

    const actionComps = report.topComps.filter((c) =>
      c.sharedTraits.includes("Action Heavy"),
    );
    expect(actionComps.length).toBeGreaterThan(0);
  });

  test("default market is 'hollywood'", () => {
    const mockFeatures: any = {
      scriptId: "test-default",
      metrics: {
        dialogueToActionRatio: 2.0,
        sceneCount: 50,
        characterCount: 10,
        averageWordsPerDialogue: 14,
      },
      analysis: { emotionalVolatility: 4.0 },
    };

    const defaultResult = benchmarker.findComps(mockFeatures);
    const explicitHollywood = benchmarker.findComps(mockFeatures, undefined, "hollywood");

    expect(defaultResult.topComps.map((c) => c.title)).toEqual(
      explicitHollywood.topComps.map((c) => c.title),
    );
  });
});
