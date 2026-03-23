import { describe, expect, test } from "bun:test";
import { BoxOfficePredictor } from "./BoxOfficePredictor";
import { ContentRatingClassifier } from "./ContentRatingClassifier";
import { ILLMProvider, LLMResponse } from "../../creative/infrastructure/llm/ILLMProvider";

class MockLLM implements ILLMProvider {
  name = "mock";
  async generateText(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    let json = "";
    if (systemPrompt.includes("market intelligence")) {
      json = JSON.stringify({
        tier: "Hit",
        predictedMultiplier: 3.5,
        confidence: 0.8,
        reasoning: "Strong character and emotional arc."
      });
    } else {
      json = JSON.stringify({
        rating: "R",
        reasons: ["Graphic violence", "Pervasive language"],
        confidence: 0.95
      });
    }

    return {
      provider: "mock",
      model: "test",
      content: json,
      latencyMs: 10
    };
  }
}

describe("Predictive Models", () => {
  const llm = new MockLLM();

  test("BoxOfficePredictor should return correct tier and multiplier", async () => {
    const predictor = new BoxOfficePredictor(llm);
    const mockFeatures: any = {
      metrics: { dialogueToActionRatio: 1.2, sceneCount: 100 },
      analysis: { emotionalVolatility: 4.5, characterNetwork: { characters: [{name: "JOHN"}] } },
      market: { budget: 10000000, genres: ["Action"] }
    };

    const result = await predictor.predictROI(mockFeatures);
    expect(result.tier).toBe("Hit");
    expect(result.predictedMultiplier).toBe(3.5);
  });

  test("ContentRatingClassifier should return correct rating", async () => {
    const classifier = new ContentRatingClassifier(llm);
    const mockElements: any = [{ type: "dialogue", text: "Bad word!" }];

    const result = await classifier.classify("test", mockElements);
    expect(result.rating).toBe("R");
    expect(result.reasons).toContain("Graphic violence");
  });
});
