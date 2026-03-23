import { describe, expect, test } from "bun:test";
import { KOREAN_FILM_CATALOG } from "./koreanFilmCatalog";

const VALID_KMRB_RATINGS = ["ALL", "12+", "15+", "19+", "RESTRICTED"];
const VALID_ARC_TYPES = [
  "rags-to-riches",
  "riches-to-rags",
  "man-in-a-hole",
  "icarus",
  "cinderella",
  "oedipus",
];
const VALID_VOLATILITY = ["low", "medium", "high"];
const VALID_PACING = ["slow", "moderate", "fast"];

describe("Korean Film Catalog — Data Integrity", () => {
  test("should have exactly 30 films", () => {
    expect(KOREAN_FILM_CATALOG.length).toBe(30);
  });

  test("every film has a non-empty title with bilingual format", () => {
    for (const film of KOREAN_FILM_CATALOG) {
      expect(film.title.length).toBeGreaterThan(0);
      // Title should contain Korean characters OR parenthesized English name
      const hasKorean = /[\uAC00-\uD7AF]/.test(film.title);
      expect(hasKorean).toBe(true);
    }
  });

  test("all titles are unique", () => {
    const titles = KOREAN_FILM_CATALOG.map((f) => f.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  test("all years are between 2000 and 2025", () => {
    for (const film of KOREAN_FILM_CATALOG) {
      expect(film.year).toBeGreaterThanOrEqual(2000);
      expect(film.year).toBeLessThanOrEqual(2025);
    }
  });

  test("all ratings are valid KMRB values", () => {
    for (const film of KOREAN_FILM_CATALOG) {
      expect(VALID_KMRB_RATINGS).toContain(film.rating);
    }
  });

  test("all budgets are in KRW scale (> 1 billion won)", () => {
    for (const film of KOREAN_FILM_CATALOG) {
      expect(film.budget).toBeGreaterThanOrEqual(1_000_000_000);
      expect(film.budget).toBeLessThan(100_000_000_000);
    }
  });

  test("all revenues are in KRW scale and exceed budget", () => {
    for (const film of KOREAN_FILM_CATALOG) {
      expect(film.revenue).toBeGreaterThan(film.budget);
      expect(film.revenue).toBeLessThan(200_000_000_000);
    }
  });

  test("ROI is correctly proportional to revenue/budget", () => {
    for (const film of KOREAN_FILM_CATALOG) {
      const computedRoi = film.revenue / film.budget;
      // Allow 0.5 tolerance for rounding
      expect(Math.abs(film.roi - computedRoi)).toBeLessThan(0.5);
    }
  });

  test("every film has at least 1 genre", () => {
    for (const film of KOREAN_FILM_CATALOG) {
      expect(film.genres.length).toBeGreaterThanOrEqual(1);
    }
  });

  test("every film has at least 2 tropes", () => {
    for (const film of KOREAN_FILM_CATALOG) {
      expect(film.tropes.length).toBeGreaterThanOrEqual(2);
    }
  });

  test("narrative traits have valid values", () => {
    for (const film of KOREAN_FILM_CATALOG) {
      const t = film.narrativeTraits;
      expect(typeof t.dialogueHeavy).toBe("boolean");
      expect(typeof t.actionHeavy).toBe("boolean");
      expect(VALID_VOLATILITY).toContain(t.emotionalVolatility);
      expect(VALID_PACING).toContain(t.pacing);
      if (t.arcType) {
        expect(VALID_ARC_TYPES).toContain(t.arcType);
      }
    }
  });

  // ─── Genre Distribution ───

  test("has action/crime films", () => {
    const actionCrime = KOREAN_FILM_CATALOG.filter(
      (f) => f.genres.includes("Action") || f.genres.includes("Crime"),
    );
    expect(actionCrime.length).toBeGreaterThanOrEqual(5);
  });

  test("has drama/history films", () => {
    const dramaHistory = KOREAN_FILM_CATALOG.filter(
      (f) => f.genres.includes("Drama") || f.genres.includes("History"),
    );
    expect(dramaHistory.length).toBeGreaterThanOrEqual(5);
  });

  test("has comedy films", () => {
    const comedy = KOREAN_FILM_CATALOG.filter((f) =>
      f.genres.includes("Comedy"),
    );
    expect(comedy.length).toBeGreaterThanOrEqual(3);
  });

  test("has horror/thriller/mystery films", () => {
    const htmFilms = KOREAN_FILM_CATALOG.filter(
      (f) =>
        f.genres.includes("Horror") ||
        f.genres.includes("Thriller") ||
        f.genres.includes("Mystery"),
    );
    expect(htmFilms.length).toBeGreaterThanOrEqual(3);
  });

  // ─── Korean-specific Tropes ───

  test("catalog includes Korean-specific tropes", () => {
    const allTropes = KOREAN_FILM_CATALOG.flatMap((f) => f.tropes);
    const koreanTropes = [
      "Shamanism",
      "Korean War Division",
      "Democratization Movement",
      "Class Divide",
      "Han / Collective Grief",
      "Japanese Occupation Resistance",
      "Military Coup",
      "Folk Horror",
    ];
    for (const trope of koreanTropes) {
      expect(allTropes).toContain(trope);
    }
  });

  // ─── Financial Sanity ───

  test("highest budget film should be under ₩50B", () => {
    const maxBudget = Math.max(...KOREAN_FILM_CATALOG.map((f) => f.budget));
    expect(maxBudget).toBeLessThanOrEqual(50_000_000_000);
  });

  test("average ROI should be positive and reasonable", () => {
    const avgRoi =
      KOREAN_FILM_CATALOG.reduce((s, f) => s + f.roi, 0) /
      KOREAN_FILM_CATALOG.length;
    expect(avgRoi).toBeGreaterThan(1);
    expect(avgRoi).toBeLessThan(25);
  });
});
