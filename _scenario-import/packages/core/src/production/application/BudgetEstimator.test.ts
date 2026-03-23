import { describe, expect, test } from "bun:test";
import { BudgetEstimator } from "./BudgetEstimator";
import type {
  LocationBreakdown,
  CastBreakdown,
  VFXRequirement,
} from "../domain/ProductionBreakdown";

const sampleLocations: LocationBreakdown[] = [
  { name: "Office", setting: "INT", time: "DAY", sceneNumbers: [1, 3, 5], frequency: 3 },
  { name: "Street", setting: "EXT", time: "NIGHT", sceneNumbers: [2, 4], frequency: 2 },
];

const sampleCast: CastBreakdown[] = [
  { name: "Lead", role: "Protagonist", sceneNumbers: [1, 2, 3, 4, 5], totalScenes: 5 },
  { name: "Villain", role: "Antagonist", sceneNumbers: [2, 4], totalScenes: 2 },
  { name: "Sidekick", role: "Supporting", sceneNumbers: [1, 3], totalScenes: 2 },
];

const sampleVFX: VFXRequirement[] = [
  { sceneNumber: 2, description: "Explosion", tier: "moderate", estimatedHours: 60 },
  { sceneNumber: 4, description: "Rain FX", tier: "simple", estimatedHours: 20 },
];

const shootingDays = 30;

describe("BudgetEstimator — Hollywood vs Korean Market", () => {
  const estimator = new BudgetEstimator();

  test("Hollywood estimate uses USD-scale costs", () => {
    const result = estimator.estimate(
      sampleLocations,
      sampleCast,
      sampleVFX,
      shootingDays,
      "hollywood",
    );

    // USD scale: millions range
    expect(result.likely).toBeGreaterThan(100_000);
    expect(result.likely).toBeLessThan(100_000_000);

    // Breakdown should all be positive
    expect(result.breakdown.cast).toBeGreaterThan(0);
    expect(result.breakdown.locations).toBeGreaterThan(0);
    expect(result.breakdown.vfx).toBeGreaterThan(0);
    expect(result.breakdown.crew).toBeGreaterThan(0);
    expect(result.breakdown.postProduction).toBeGreaterThan(0);
  });

  test("Korean estimate uses KRW-scale costs", () => {
    const result = estimator.estimate(
      sampleLocations,
      sampleCast,
      sampleVFX,
      shootingDays,
      "korean",
    );

    // KRW scale: billions range
    expect(result.likely).toBeGreaterThan(1_000_000_000);
    expect(result.likely).toBeLessThan(100_000_000_000);

    expect(result.breakdown.cast).toBeGreaterThan(0);
    expect(result.breakdown.locations).toBeGreaterThan(0);
    expect(result.breakdown.vfx).toBeGreaterThan(0);
    expect(result.breakdown.crew).toBeGreaterThan(0);
    expect(result.breakdown.postProduction).toBeGreaterThan(0);
  });

  test("Korean budget is larger in absolute KRW than Hollywood in USD", () => {
    const hollywood = estimator.estimate(sampleLocations, sampleCast, sampleVFX, shootingDays, "hollywood");
    const korean = estimator.estimate(sampleLocations, sampleCast, sampleVFX, shootingDays, "korean");

    // KRW amounts should be numerically larger than USD (exchange rate ~1300)
    expect(korean.likely).toBeGreaterThan(hollywood.likely);
  });

  test("low < likely < high for both markets", () => {
    for (const market of ["hollywood", "korean"] as const) {
      const result = estimator.estimate(sampleLocations, sampleCast, sampleVFX, shootingDays, market);
      expect(result.low).toBeLessThan(result.likely);
      expect(result.likely).toBeLessThan(result.high);
    }
  });

  test("Hollywood cast cost matches config rates", () => {
    const result = estimator.estimate(sampleLocations, sampleCast, sampleVFX, shootingDays, "hollywood");
    // Protagonist $500K + Antagonist $300K + Supporting $100K = $900K
    expect(result.breakdown.cast).toBe(900_000);
  });

  test("Korean cast cost matches config rates", () => {
    const result = estimator.estimate(sampleLocations, sampleCast, sampleVFX, shootingDays, "korean");
    // Protagonist ₩800M + Antagonist ₩500M + Supporting ₩150M = ₩1.45B
    expect(result.breakdown.cast).toBe(1_450_000_000);
  });

  test("Hollywood location cost matches INT/EXT rates", () => {
    const result = estimator.estimate(sampleLocations, sampleCast, sampleVFX, shootingDays, "hollywood");
    // INT $5K × 3 + EXT $15K × 2 = $45K
    expect(result.breakdown.locations).toBe(45_000);
  });

  test("Korean location cost matches INT/EXT rates", () => {
    const result = estimator.estimate(sampleLocations, sampleCast, sampleVFX, shootingDays, "korean");
    // INT ₩2.5M × 3 + EXT ₩6.5M × 2 = ₩20.5M
    expect(result.breakdown.locations).toBe(20_500_000);
  });

  test("Hollywood VFX cost at $300/hour", () => {
    const result = estimator.estimate(sampleLocations, sampleCast, sampleVFX, shootingDays, "hollywood");
    // 80 hours × $300 = $24K
    expect(result.breakdown.vfx).toBe(24_000);
  });

  test("Korean VFX cost at ₩400K/hour", () => {
    const result = estimator.estimate(sampleLocations, sampleCast, sampleVFX, shootingDays, "korean");
    // 80 hours × ₩400K = ₩32M
    expect(result.breakdown.vfx).toBe(32_000_000);
  });

  test("Hollywood crew cost with 1.4x fringe", () => {
    const result = estimator.estimate(sampleLocations, sampleCast, sampleVFX, shootingDays, "hollywood");
    // 30 days × $50K × 1.4 = $2,100,000
    expect(result.breakdown.crew).toBe(2_100_000);
  });

  test("Korean crew cost with 1.3x fringe", () => {
    const result = estimator.estimate(sampleLocations, sampleCast, sampleVFX, shootingDays, "korean");
    // 30 days × ₩17.5M × 1.3 = ₩682,500,000
    expect(result.breakdown.crew).toBe(682_500_000);
  });

  test("no VFX produces zero VFX cost", () => {
    const result = estimator.estimate(sampleLocations, sampleCast, [], shootingDays, "korean");
    expect(result.breakdown.vfx).toBe(0);
  });

  test("default market is hollywood", () => {
    const defaultResult = estimator.estimate(sampleLocations, sampleCast, sampleVFX, shootingDays);
    const explicit = estimator.estimate(sampleLocations, sampleCast, sampleVFX, shootingDays, "hollywood");
    expect(defaultResult.likely).toBe(explicit.likely);
  });
});
