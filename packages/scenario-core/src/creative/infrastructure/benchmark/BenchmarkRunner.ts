import { LLMFactory } from '../llm/LLMFactory';
import { BeatSheetGenerator } from '../../application/BeatSheetGenerator';
import { EmotionAnalyzer } from '../../application/EmotionAnalyzer';
import { ContentRatingClassifier } from '../../../predictor/application/ContentRatingClassifier';
import { TropeAnalyzer } from '../../../predictor/application/TropeAnalyzer';
import { ScriptCoverageEvaluator } from '../../application/ScriptCoverageEvaluator';
import { BoxOfficePredictor } from '../../../predictor/application/BoxOfficePredictor';
import { FeatureExtractor } from '../../../predictor/application/FeatureExtractor';
import { CharacterAnalyzer } from '../../application/CharacterAnalyzer';
import { ENGINE_RUBRICS } from './engineRubrics';
import type { ScriptElement } from '../../../script/infrastructure/parser';
import type { EngineName, ProviderChoice } from '../llm/AnalysisStrategy';
import type { ILLMProvider } from '../llm/ILLMProvider';
import type { BenchmarkResult, BenchmarkSuite, BenchmarkSummary, RankedProvider } from './ProviderBenchmark';
import { PROVIDER_COSTS } from './ProviderBenchmark';

export class BenchmarkRunner {
  constructor(private factory: LLMFactory) {}

  async runSuite(
    scriptId: string,
    elements: ScriptElement[],
    engines: EngineName[],
    providers: ProviderChoice[],
  ): Promise<BenchmarkSuite> {
    const startTime = Date.now();
    const results: BenchmarkResult[] = [];
    const sceneCount = elements.filter(e => e.type === 'scene_heading').length;

    for (const engine of engines) {
      for (const providerName of providers) {
        let provider: ILLMProvider;
        try {
          provider = this.factory.getProvider(providerName);
        } catch {
          results.push({
            engine, provider: providerName, model: 'N/A', latencyMs: 0,
            jsonParseSuccess: false, structuralScore: 0, contentScore: 0,
            overallScore: 0, costEstimate: 0, tokenEstimate: 0,
            error: `Provider ${providerName} not available`,
          });
          continue;
        }

        const result = await this.runSingle(scriptId, elements, engine, providerName, provider, sceneCount);
        results.push(result);
        console.log(`  ${engine} × ${providerName}: score=${result.overallScore}, ${result.latencyMs}ms, $${result.costEstimate.toFixed(4)}`);
      }
    }

    // Build rankings per engine
    const rankings: Record<EngineName, RankedProvider[]> = {} as any;
    for (const engine of engines) {
      const engineResults = results
        .filter(r => r.engine === engine && !r.error)
        .sort((a, b) => b.overallScore - a.overallScore);
      rankings[engine] = engineResults.map(r => ({
        provider: r.provider,
        overallScore: r.overallScore,
        latencyMs: r.latencyMs,
        costEstimate: r.costEstimate,
      }));
    }

    // Summary
    const bestPerEngine: Record<EngineName, ProviderChoice> = {} as any;
    for (const engine of engines) {
      bestPerEngine[engine] = rankings[engine]?.[0]?.provider || 'mock';
    }

    const providerAvgScores = new Map<ProviderChoice, number[]>();
    const providerAvgCosts = new Map<ProviderChoice, number[]>();
    for (const r of results) {
      if (!r.error) {
        if (!providerAvgScores.has(r.provider)) providerAvgScores.set(r.provider, []);
        if (!providerAvgCosts.has(r.provider)) providerAvgCosts.set(r.provider, []);
        providerAvgScores.get(r.provider)!.push(r.overallScore);
        providerAvgCosts.get(r.provider)!.push(r.costEstimate);
      }
    }

    let bestQuality: ProviderChoice = 'mock';
    let bestQualityScore = 0;
    let bestBudget: ProviderChoice = 'mock';
    let bestBudgetRatio = 0;

    for (const [prov, scores] of providerAvgScores) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const avgCost = (providerAvgCosts.get(prov) || []).reduce((a, b) => a + b, 0) / scores.length;
      if (avg > bestQualityScore) { bestQuality = prov; bestQualityScore = avg; }
      const ratio = avgCost === 0 ? avg * 1000 : avg / avgCost;
      if (ratio > bestBudgetRatio) { bestBudget = prov; bestBudgetRatio = ratio; }
    }

    const summary: BenchmarkSummary = {
      totalRuns: results.length,
      totalTimeMs: Date.now() - startTime,
      totalCostEstimate: results.reduce((sum, r) => sum + r.costEstimate, 0),
      bestPerEngine,
      bestBudget,
      bestQuality,
    };

    return {
      scriptId,
      timestamp: new Date().toISOString(),
      results,
      rankings,
      summary,
    };
  }

  private async runSingle(
    scriptId: string,
    elements: ScriptElement[],
    engine: EngineName,
    providerName: ProviderChoice,
    provider: ILLMProvider,
    sceneCount: number,
  ): Promise<BenchmarkResult> {
    const startTime = Date.now();
    const rubric = ENGINE_RUBRICS.find(r => r.engine === engine);

    try {
      const raw = await this.executeEngine(scriptId, elements, engine, provider, sceneCount);
      const latencyMs = Date.now() - startTime;

      // Try to parse JSON
      let parsed: any = null;
      let jsonParseSuccess = false;
      try {
        if (typeof raw === 'string') {
          parsed = JSON.parse(raw);
        } else {
          parsed = raw;
        }
        jsonParseSuccess = true;
      } catch {
        jsonParseSuccess = false;
      }

      const structuralScore = rubric && parsed ? rubric.scoreStructure(parsed) : 0;
      const contentScore = rubric && parsed ? rubric.scoreContent(parsed, sceneCount) : 0;
      const overallScore = jsonParseSuccess
        ? Math.round(structuralScore * 0.4 + contentScore * 0.6)
        : 0;

      // Estimate tokens (~4 chars per token)
      const inputChars = elements.map(e => e.text).join('').length;
      const outputChars = typeof raw === 'string' ? raw.length : JSON.stringify(raw).length;
      const tokenEstimate = Math.round((inputChars + outputChars) / 4);
      const costs = PROVIDER_COSTS[providerName] || { input: 0, output: 0 };
      const costEstimate = (inputChars / 4 / 1_000_000) * costs.input + (outputChars / 4 / 1_000_000) * costs.output;

      return {
        engine, provider: providerName, model: provider.name, latencyMs,
        jsonParseSuccess, structuralScore, contentScore, overallScore,
        costEstimate, tokenEstimate,
      };
    } catch (error: any) {
      return {
        engine, provider: providerName, model: provider.name,
        latencyMs: Date.now() - startTime,
        jsonParseSuccess: false, structuralScore: 0, contentScore: 0,
        overallScore: 0, costEstimate: 0, tokenEstimate: 0,
        error: error.message,
      };
    }
  }

  private async executeEngine(
    scriptId: string,
    elements: ScriptElement[],
    engine: EngineName,
    provider: ILLMProvider,
    sceneCount: number,
  ): Promise<any> {
    switch (engine) {
      case 'beatSheet': {
        const gen = new BeatSheetGenerator(provider);
        const result = await gen.generate(scriptId, elements);
        return result;
      }
      case 'emotion': {
        const analyzer = new EmotionAnalyzer(provider);
        const result = await analyzer.analyze(scriptId, elements);
        return result;
      }
      case 'rating': {
        const classifier = new ContentRatingClassifier(provider);
        return await classifier.classify(scriptId, elements);
      }
      case 'roi': {
        // ROI needs features, which need character+beat+emotion data
        const charAnalyzer = new CharacterAnalyzer();
        const network = charAnalyzer.analyze(scriptId, elements);
        const beatGen = new BeatSheetGenerator(provider);
        const beats = await beatGen.generate(scriptId, elements);
        const emoAnalyzer = new EmotionAnalyzer(provider);
        const emotion = await emoAnalyzer.analyze(scriptId, elements);
        const extractor = new FeatureExtractor();
        const mockMarket = { budget: 50000000, revenue: 0, genres: ['Drama'], topCast: [] } as any;
        const features = extractor.extract(scriptId, elements, { characterNetwork: network, beatSheet: beats, emotionGraph: emotion }, mockMarket);
        const predictor = new BoxOfficePredictor(provider);
        return await predictor.predictROI(features);
      }
      case 'trope': {
        const analyzer = new TropeAnalyzer(provider);
        return await analyzer.analyze(scriptId, elements);
      }
      case 'coverage': {
        const evaluator = new ScriptCoverageEvaluator(provider);
        return await evaluator.evaluate(scriptId, elements, {
          beats: [], emotions: [], characters: [],
          roi: { tier: 'Hit', predictedMultiplier: 2, confidence: 0.5, reasoning: '' },
          rating: { rating: 'PG-13' as any, reasons: [], confidence: 0.5 },
          comps: [],
        });
      }
      case 'vfx': {
        // VFX uses direct LLM call pattern
        return [];
      }
      default:
        throw new Error(`Unknown engine: ${engine}`);
    }
  }
}
