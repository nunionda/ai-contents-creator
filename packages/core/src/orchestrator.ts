import { parseFountain } from './script/infrastructure/parser';
import { LLMFactory } from './creative/infrastructure/llm/LLMFactory';
import { CharacterAnalyzer } from './creative/application/CharacterAnalyzer';
import { BeatSheetGenerator } from './creative/application/BeatSheetGenerator';
import { EmotionAnalyzer } from './creative/application/EmotionAnalyzer';
import { FeatureExtractor } from './predictor/application/FeatureExtractor';
import { BoxOfficePredictor } from './predictor/application/BoxOfficePredictor';
import { ContentRatingClassifier } from './predictor/application/ContentRatingClassifier';
import { Benchmarker } from './predictor/application/Benchmarker';
import * as fs from 'fs';
import * as path from 'path';
import { env } from './shared/env';

async function runOrchestration() {
  console.log("🎬 Starting AI Engine Orchestration (Phase 1 + 2 + 3)...");

  // 1. Load the script
  const scriptPath = path.join(__dirname, '../../../data/fight_club_sample.fountain');
  const scriptText = fs.readFileSync(scriptPath, 'utf8');

  // 2. Parse into Domain Elements
  const elements = parseFountain(scriptText);

  // 3. Initialize Analyzers & Predictors
  const factory = new LLMFactory();
  const characterAnalyzer = new CharacterAnalyzer();
  const featureExtractor = new FeatureExtractor();
  const benchmarker = new Benchmarker();

  let provider;
  if (env.ANTHROPIC_API_KEY) {
    provider = factory.getProvider('anthropic');
  } else {
    // Fallback Mock for local dev without keys
    provider = {
      name: 'mock',
      generateText: async (sys: string) => {
        if (sys.includes("3-Act")) return { content: JSON.stringify({ beats: [{ act: 1, name: "Inciting Incident", sceneStart: 1, sceneEnd: 5, description: "Jack meets Tyler." }] }), latencyMs: 5, provider: 'mock', model: 'mock' };
        if (sys.includes("Valence")) return { content: JSON.stringify({ scenes: [{ sceneNumber: 1, score: -2, dominantEmotion: "Tension", explanation: "Opening" }] }), latencyMs: 5, provider: 'mock', model: 'mock' };
        if (sys.includes("intelligence")) return { content: JSON.stringify({ tier: "Blockbuster", predictedMultiplier: 12.5, confidence: 0.9, reasoning: "Cult classic potential." }), latencyMs: 5, provider: 'mock', model: 'mock' };
        if (sys.includes("MPAA")) return { content: JSON.stringify({ rating: "R", reasons: ["Extreme violence"], confidence: 0.99 }), latencyMs: 5, provider: 'mock', model: 'mock' };
        return { content: "{}", latencyMs: 5, provider: 'mock', model: 'mock' };
      }
    };
  }

  const beatGenerator = new BeatSheetGenerator(provider as any);
  const emotionAnalyzer = new EmotionAnalyzer(provider as any);
  const boxOfficePredictor = new BoxOfficePredictor(provider as any);
  const ratingClassifier = new ContentRatingClassifier(provider as any);

  console.log("🚀 Executing Full Pipeline...");

  // Phase 2: Creative Analysis
  const network = characterAnalyzer.analyze("fight_club", elements);
  const beats = await beatGenerator.generate("fight_club", elements);
  const emotion = await emotionAnalyzer.analyze("fight_club", elements);

  // Phase 1 Context (Mocked for Fight Club)
  const mockMarket = { budget: 63000000, revenue: 100853753, genres: ["Drama", "Thriller"] };

  // Phase 3: Market Intelligence
  console.log("📈 Extracting Features & Predicting Market Performance...");
  const features = featureExtractor.extract("fight_club", elements, { characterNetwork: network, beatSheet: beats, emotionGraph: emotion }, mockMarket as any);
  const roiPrediction = await boxOfficePredictor.predictROI(features);
  const mpaaRating = await ratingClassifier.classify("fight_club", elements);
  const similarity = benchmarker.findComps(features);

  // 4. Consolidate & Output
  const finalOutput = {
    scriptId: "fight_club",
    summary: {
      totalElements: elements.length,
      protagonist: network.characters[0]?.name,
      predictedRoi: roiPrediction.tier,
      predictedRating: mpaaRating.rating
    },
    characterNetwork: network.characters,
    beatSheet: beats.beats,
    emotionGraph: emotion.scenes,
    features: features.metrics,
    predictions: {
      roi: roiPrediction,
      rating: mpaaRating,
      comps: similarity.topComps
    }
  };

  const outPath = path.join(__dirname, '../../../output/fight_club_full_analysis.json');
  fs.writeFileSync(outPath, JSON.stringify(finalOutput, null, 2));

  console.log(`\n🎉 Full Orchestration Complete! Results saved to: ${outPath}`);
  console.log(JSON.stringify(finalOutput.summary, null, 2));
}

runOrchestration().catch(console.error);

