import { describe, expect, test } from 'bun:test';
import { EvaluationService } from './EvaluationService';

describe('EvaluationService', () => {
  const service = new EvaluationService();

  test('should correctly classify a blockbuster', () => {
    const data = {
      movieId: "1",
      title: "Hit Movie",
      budget: 10000000,
      revenue: 60000000, // 6x return
      releaseDate: "2024-01-01",
      topCast: []
    };

    const result = service.evaluateROI(data);
    expect(result.isHit).toBe(true);
    expect(result.roiPercentage).toBe(500); // (60M - 10M) / 10M = 5.0 * 100
    expect(result.message).toContain("Blockbuster");
  });

  test('should correctly classify an underperforming movie', () => {
    const data = {
      movieId: "2",
      title: "Sad Movie",
      budget: 50000000,
      revenue: 75000000, // 1.5x return
      releaseDate: "2024-01-01",
      topCast: []
    };

    const result = service.evaluateROI(data);
    expect(result.isHit).toBe(false); // Needs 2.5x (125M) to be a hit
    expect(result.message).toContain("Underperformed");
  });

  test('should throw error on zero budget', () => {
    const data = {
      movieId: "3",
      title: "Indie Movie",
      budget: 0,
      revenue: 1000000,
      releaseDate: "2024-01-01",
      topCast: []
    };

    expect(() => service.evaluateROI(data)).toThrow(/Invalid\/zero budget/);
  });
});
