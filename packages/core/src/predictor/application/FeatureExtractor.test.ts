import { describe, expect, test } from "bun:test";
import { FeatureExtractor } from "./FeatureExtractor";
import { ScriptElement } from "../../script/infrastructure/parser";

describe("FeatureExtractor", () => {
  const extractor = new FeatureExtractor();

  test("should correctly calculate metrics and volatility", () => {
    const mockElements: ScriptElement[] = [
      { type: "scene_heading", text: "INT. ROOM" },
      { type: "action", text: "He walks." },
      { type: "character", text: "JACK" },
      { type: "dialogue", text: "Hello world" },
      { type: "scene_heading", text: "EXT. YARD" },
      { type: "action", text: "He runs." },
      { type: "character", text: "JACK" },
      { type: "dialogue", text: "Goodbye" },
    ];

    const mockAnalysis = {
      characterNetwork: {
        scriptId: "test",
        characters: [{ name: "JACK", totalLines: 2, totalWords: 3, role: "Protagonist" as any }]
      },
      beatSheet: {
        scriptId: "test",
        beats: []
      },
      emotionGraph: {
        scriptId: "test",
        scenes: [
          { sceneNumber: 1, score: 5, dominantEmotion: "Joy", explanation: "" },
          { sceneNumber: 2, score: -5, dominantEmotion: "Sadness", explanation: "" }
        ]
      }
    };

    const features = extractor.extract("test", mockElements, mockAnalysis);

    expect(features.metrics.sceneCount).toBe(2);
    expect(features.metrics.dialogueLineCount).toBe(2);
    expect(features.metrics.actionLineCount).toBe(2);
    expect(features.metrics.dialogueToActionRatio).toBe(1);
    expect(features.metrics.averageWordsPerDialogue).toBe(1.5);
    expect(features.analysis.emotionalVolatility).toBe(5); // Mean 0, distances are 5. sqrt( (5^2 + (-5)^2)/2 ) = 5
  });
});
