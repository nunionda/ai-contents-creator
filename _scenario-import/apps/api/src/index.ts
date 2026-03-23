import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import {
  parseFountain,
  parsePdfBuffer,
  LLMFactory,
  CharacterAnalyzer,
  BeatSheetGenerator,
  EmotionAnalyzer,
  FeatureExtractor,
  BoxOfficePredictor,
  ContentRatingClassifier,
  Benchmarker,
  ScriptCoverageEvaluator,
  ProductionAnalyzer,
  VFXEstimator,
  BudgetEstimator,
  NarrativeArcClassifier,
  TropeAnalyzer,
  ContentRatingClassifierLLM,
  VFXEstimatorLLM,
  TropeAnalyzerLLM,
  ScriptChatAgent,
  DraftComparator,
  StatisticalROIModel,
  env,
  resolveStrategy,
  scoreProviderRun,
  computeBenchmarkMetrics,
  computeCompositeRanking,
  buildComparisonMatrix,
  type AnalysisStrategyName,
  type CustomStrategyInput,
  type EngineName,
  type ILLMProvider,
  type ProviderChoice,
  type ModelBenchmarkResult,
  type BenchmarkComparison,
  type ScriptElement,
} from "@scenario-analysis/core";
import { AnalysisReportRepository } from "@scenario-analysis/database";
import { generateScriptId, getVersionSearchPattern } from "./utils/naming";

const reportRepo = new AnalysisReportRepository();

// ─── Reusable Full Analysis Pipeline ───

interface AnalysisPipelineOptions {
  scriptId: string;
  elements: ScriptElement[];
  market: 'hollywood' | 'korean';
  strategy?: AnalysisStrategyName;
  customProviders?: CustomStrategyInput;
  noFallback?: boolean;
  singleProvider?: ProviderChoice; // Force all engines to use this provider (benchmark mode)
  useDeterministic?: boolean; // true → Rating, VFX, Trope use deterministic logic (no LLM)
}

async function runFullAnalysis(opts: AnalysisPipelineOptions) {
  const { scriptId, elements, market, strategy, customProviders, noFallback, singleProvider } = opts;
  const startTime = Date.now();

  const factory = new LLMFactory();
  const characterAnalyzer = new CharacterAnalyzer();
  const featureExtractor = new FeatureExtractor();
  const benchmarker = new Benchmarker();

  // If singleProvider is set (benchmark mode), override all engines to that provider
  const resolved = singleProvider
    ? {
        name: 'custom' as const,
        engineProviders: Object.fromEntries(
          (['beatSheet', 'emotion', 'rating', 'roi', 'coverage', 'vfx', 'trope'] as EngineName[])
            .map(e => [e, singleProvider])
        ) as Record<EngineName, ProviderChoice>,
      }
    : resolveStrategy(strategy || 'auto', customProviders);

  const mockProvider = factory.getProvider('mock');

  const fallbackOrder: ProviderChoice[] = ['gemini-pro', 'gemini', 'groq', 'deepseek', 'anthropic', 'openai'];
  const availableFallbacks = fallbackOrder.filter(name => {
    try { factory.getProvider(name); return true; } catch { return false; }
  });

  function getEngineProvider(engine: EngineName): ILLMProvider {
    try {
      return factory.getProvider(resolved.engineProviders[engine]);
    } catch {
      return mockProvider;
    }
  }

  async function withFallback<T>(
    engine: EngineName,
    label: string,
    fn: (p: ILLMProvider) => Promise<T>,
  ): Promise<{ data: T; fallback: boolean; provider: string }> {
    const primary = getEngineProvider(engine);

    if (noFallback || singleProvider) {
      try {
        const data = await fn(primary);
        return { data, fallback: false, provider: primary.name };
      } catch (err: any) {
        console.warn(`⚠️ ${label} failed with ${primary.name} (${err.message?.slice(0, 80)}), using mock`);
        const data = await fn(mockProvider);
        return { data, fallback: true, provider: 'mock' };
      }
    }

    const tried = new Set<string>([primary.name]);
    const chain: ILLMProvider[] = [primary];
    for (const name of availableFallbacks) {
      if (!tried.has(name)) {
        tried.add(name);
        chain.push(factory.getProvider(name));
      }
    }
    chain.push(mockProvider);

    for (let i = 0; i < chain.length; i++) {
      const provider = chain[i]!;
      try {
        const data = await fn(provider);
        if (i > 0) console.log(`✅ ${label} succeeded with fallback: ${provider.name}`);
        return { data, fallback: i > 0, provider: provider.name };
      } catch (err: any) {
        if (provider.name !== 'mock') {
          console.warn(`⚠️ ${label} failed with ${provider.name} (${err.message?.slice(0, 80)}), trying next...`);
        } else {
          throw err;
        }
      }
    }
    return { data: await fn(mockProvider), fallback: true, provider: 'mock' };
  }

  // Run Pipeline
  const network = characterAnalyzer.analyze(scriptId, elements);

  const engineDelay = (noFallback || singleProvider) ? 8000 : 0;
  const sleep = (ms: number) => ms > 0 ? new Promise(r => setTimeout(r, ms)) : Promise.resolve();

  const beatsResult = await withFallback('beatSheet', 'BeatSheet', (p) => new BeatSheetGenerator(p).generate(scriptId, elements, market));
  await sleep(engineDelay);
  const emotionResult = await withFallback('emotion', 'Emotion', (p) => new EmotionAnalyzer(p).analyze(scriptId, elements));
  await sleep(engineDelay);
  const ratingResult = opts.useDeterministic
    ? { data: new ContentRatingClassifier().classify(scriptId, elements, market), fallback: false, provider: 'deterministic' }
    : await withFallback('rating', 'Rating', (p) => new ContentRatingClassifierLLM(p).classify(scriptId, elements, market));

  const beats = beatsResult.data;
  const emotion = emotionResult.data;
  const mpaaRating = ratingResult.data;

  const productionAnalyzer = new ProductionAnalyzer();
  const locations = productionAnalyzer.analyzeLocations(elements);
  const cast = productionAnalyzer.analyzeCast(elements, network.characters);
  const intExtRatio = productionAnalyzer.computeIntExtRatio(locations);
  const sceneCount = elements.filter(e => e.type === 'scene_heading').length;
  const estimatedShootingDays = productionAnalyzer.estimateShootingDays(sceneCount);

  const vfxResult = opts.useDeterministic
    ? { data: new VFXEstimator().estimate(scriptId, elements, market), fallback: false, provider: 'deterministic' }
    : await withFallback('vfx', 'VFX', (p) => new VFXEstimatorLLM(p).estimate(scriptId, elements, market));
  const vfx = vfxResult.data;

  const budgetEstimator = new BudgetEstimator();
  const budgetEstimate = budgetEstimator.estimate(locations, cast, vfx.requirements, estimatedShootingDays, market);

  const tropeResult = opts.useDeterministic
    ? { data: new TropeAnalyzer().analyze(scriptId, elements, market), fallback: false, provider: 'deterministic' }
    : await withFallback('trope', 'Trope', (p) => new TropeAnalyzerLLM(p).analyze(scriptId, elements, market));
  const tropes = tropeResult.data.tropes;

  await sleep(engineDelay);
  const coverageResult = await withFallback('coverage', 'Coverage', (p) =>
    new ScriptCoverageEvaluator(p).evaluate(scriptId, elements, {
      beats: beats.beats,
      emotions: emotion.scenes,
      characters: network.characters,
      roi: { tier: 'Unknown', predictedMultiplier: 0, confidence: 0, reasoning: 'Pending — ROI runs after coverage' },
      rating: mpaaRating,
      comps: [],
    }, market)
  );
  const coverage = coverageResult.data;

  const coverageGenres = coverage?.genre
    ? coverage.genre.split(/[,\/]/).map((g: string) => g.trim()).filter(Boolean)
    : [];
  const realMarketData = {
    movieId: scriptId,
    title: scriptId,
    budget: budgetEstimate.likely,
    revenue: 0,
    releaseDate: '',
    genres: coverageGenres,
    topCast: cast.map((c: any) => c.name),
    market,
    currencyCode: market === 'korean' ? 'KRW' : 'USD',
  };

  const features = featureExtractor.extract(scriptId, elements, {
    characterNetwork: network,
    beatSheet: beats,
    emotionGraph: emotion
  }, realMarketData);

  const similarity = benchmarker.findComps(features, tropes, market);

  await sleep(engineDelay);
  const roiResult = await withFallback('roi', 'ROI', (p) => new BoxOfficePredictor(p).predictROI(features, market, similarity.topComps));
  const roiPrediction = roiResult.data;

  const statisticalModel = new StatisticalROIModel();
  const statisticalROI = statisticalModel.predict(features, market, budgetEstimate.likely);

  const emotionProvider = getEngineProvider('emotion');
  const narrativeArcClassifier = new NarrativeArcClassifier(emotionProvider);
  let narrativeArc;
  try {
    narrativeArc = await narrativeArcClassifier.classify(
      scriptId, emotion.scenes, coverage?.genre, market
    );
  } catch (err: any) {
    console.warn(`⚠️ NarrativeArc failed (${err.message?.slice(0, 80)}), using mock fallback`);
    const mockArcClassifier = new NarrativeArcClassifier(mockProvider);
    narrativeArc = await mockArcClassifier.classify(scriptId, emotion.scenes, coverage?.genre, market);
  }

  const production = {
    scriptId,
    locations,
    uniqueLocationCount: locations.length,
    intExtRatio,
    cast,
    totalSpeakingRoles: cast.length,
    estimatedShootingDays,
    vfxRequirements: vfx.requirements,
    vfxComplexityScore: vfx.complexityScore,
    budgetEstimate,
  };

  const mockEngines = [
    beatsResult.provider === 'mock' && 'Beat Sheet',
    emotionResult.provider === 'mock' && 'Emotion',
    ratingResult.provider === 'mock' && 'Rating',
    roiResult.provider === 'mock' && 'ROI',
    coverageResult.provider === 'mock' && 'Coverage',
    vfxResult.provider === 'mock' && 'VFX',
    tropeResult.provider === 'mock' && 'Trope',
  ].filter(Boolean) as string[];

  const result = {
    scriptId,
    market,
    summary: {
      totalElements: elements.length,
      protagonist: network.characters[0]?.name || '',
      predictedRoi: roiPrediction.tier || 'Hit',
      predictedRating: mpaaRating.rating || (market === 'korean' ? '15+' : 'PG-13'),
    },
    characterNetwork: {
      characters: network.characters,
      edges: network.edges,
      diversityMetrics: network.diversityMetrics,
    },
    beatSheet: beats.beats,
    emotionGraph: emotion.scenes,
    features: features.metrics,
    predictions: {
      roi: roiPrediction,
      statisticalRoi: statisticalROI,
      rating: mpaaRating,
      comps: similarity.topComps
    },
    tropes,
    coverage,
    narrativeArc,
    production,
    strategy: resolved.name,
    providers: {
      beatSheet: beatsResult.provider,
      emotion: emotionResult.provider,
      rating: ratingResult.provider,
      roi: roiResult.provider,
      coverage: coverageResult.provider,
      vfx: vfxResult.provider,
      trope: tropeResult.provider,
    },
    ...(mockEngines.length > 0 && {
      warning: `Mock placeholder data used for: ${mockEngines.join(', ')}. These results are not actual AI analysis.`,
      mockEngines,
    }),
  };

  return { result, totalLatencyMs: Date.now() - startTime };
}

const app = new Elysia()
  .use(cors())
  .get("/", () => ({ status: "online", version: "1.0.0" }))

  // Available providers and strategies for dashboard UI
  .get("/providers", () => ({
    available: {
      gemini: !!env.GEMINI_API_KEY,
      'gemini-pro': !!env.GEMINI_API_KEY,
      'gemini-long': !!env.GEMINI_API_KEY,
      anthropic: !!env.ANTHROPIC_API_KEY,
      openai: !!env.OPENAI_API_KEY,
      deepseek: !!env.DEEPSEEK_API_KEY,
      groq: !!env.GROQ_API_KEY,
      mock: true,
    },
    strategies: [
      { name: 'auto', label: 'Auto', description: 'Best available provider with fallback' },
      { name: 'fast', label: 'Fast', description: 'Gemini Flash only (low cost)', requires: ['gemini'] },
      { name: 'budget', label: 'Budget', description: 'Groq (free) + DeepSeek (cheapest)', requires: [] },
      { name: 'deep', label: 'Deep Analysis', description: 'Claude for narrative, Gemini for metrics', requires: ['anthropic'] },
      { name: 'premium', label: 'Premium', description: 'Claude Sonnet 4.6 for highest quality', requires: ['anthropic'] },
      { name: 'long-context', label: 'Long Context', description: 'Gemini 1.5 Pro (2M context) for long scripts', requires: ['gemini'] },
      { name: 'custom', label: 'Custom', description: 'Pick provider per engine' },
    ],
    markets: ['hollywood', 'korean'],
  }))

  .post("/analyze", async ({ body, query }) => {
    const { scriptText, scriptBase64, isPdf, movieId, fileName, strategy, customProviders, market: marketInput, noFallback } = body as {
      scriptText?: string; scriptBase64?: string; isPdf?: boolean; movieId?: string;
      fileName?: string; strategy?: AnalysisStrategyName; customProviders?: CustomStrategyInput;
      market?: 'hollywood' | 'korean'; noFallback?: boolean;
    };
    const useDeterministic = (query as any)?.deterministic === 'true';
    const market = marketInput || 'korean';

    // Generate scriptId: {slug}_{YYMMDD}_v{NNN}
    const effectiveFileName = fileName || (movieId ? `${movieId}.txt` : `script-${Date.now()}.txt`);
    const versionPrefix = getVersionSearchPattern(effectiveFileName);
    const existingCount = await reportRepo.countByPrefix(versionPrefix);
    const nextVersion = existingCount + 1;
    const scriptId = generateScriptId(effectiveFileName, nextVersion);

    console.log(`🎬 Starting analysis for: ${scriptId} (strategy: ${strategy || 'auto'}, market: ${market})`);

    const elements = isPdf && scriptBase64
      ? await parsePdfBuffer(Buffer.from(scriptBase64, 'base64'))
      : parseFountain(scriptText || '');

    const { result } = await runFullAnalysis({
      scriptId, elements, market, strategy, customProviders, noFallback, useDeterministic,
    });

    await reportRepo.save(result);
    return result;
  }, {
    body: t.Object({
      scriptText: t.Optional(t.String()),
      scriptBase64: t.Optional(t.String()),
      isPdf: t.Optional(t.Boolean()),
      movieId: t.Optional(t.String()),
      fileName: t.Optional(t.String()),
      market: t.Optional(t.Union([t.Literal('hollywood'), t.Literal('korean')])),
      strategy: t.Optional(t.Union([
        t.Literal('auto'), t.Literal('fast'), t.Literal('deep'), t.Literal('custom'),
        t.Literal('budget'), t.Literal('premium'), t.Literal('long-context')
      ])),
      noFallback: t.Optional(t.Boolean()),
      customProviders: t.Optional(t.Object({
        beatSheet: t.Optional(t.Union([t.Literal('gemini'), t.Literal('gemini-pro'), t.Literal('gemini-long'), t.Literal('anthropic'), t.Literal('openai'), t.Literal('deepseek'), t.Literal('groq'), t.Literal('mock')])),
        emotion: t.Optional(t.Union([t.Literal('gemini'), t.Literal('gemini-pro'), t.Literal('gemini-long'), t.Literal('anthropic'), t.Literal('openai'), t.Literal('deepseek'), t.Literal('groq'), t.Literal('mock')])),
        rating: t.Optional(t.Union([t.Literal('gemini'), t.Literal('gemini-pro'), t.Literal('gemini-long'), t.Literal('anthropic'), t.Literal('openai'), t.Literal('deepseek'), t.Literal('groq'), t.Literal('mock')])),
        roi: t.Optional(t.Union([t.Literal('gemini'), t.Literal('gemini-pro'), t.Literal('gemini-long'), t.Literal('anthropic'), t.Literal('openai'), t.Literal('deepseek'), t.Literal('groq'), t.Literal('mock')])),
        coverage: t.Optional(t.Union([t.Literal('gemini'), t.Literal('gemini-pro'), t.Literal('gemini-long'), t.Literal('anthropic'), t.Literal('openai'), t.Literal('deepseek'), t.Literal('groq'), t.Literal('mock')])),
        vfx: t.Optional(t.Union([t.Literal('gemini'), t.Literal('gemini-pro'), t.Literal('gemini-long'), t.Literal('anthropic'), t.Literal('openai'), t.Literal('deepseek'), t.Literal('groq'), t.Literal('mock')])),
        trope: t.Optional(t.Union([t.Literal('gemini'), t.Literal('gemini-pro'), t.Literal('gemini-long'), t.Literal('anthropic'), t.Literal('openai'), t.Literal('deepseek'), t.Literal('groq'), t.Literal('mock')])),
      })),
    })
  })

  // ─── Per-Model Full-Pipeline Benchmark ───
  .post("/benchmark", async ({ body }) => {
    const { scriptText, scriptBase64, isPdf, fileName, models, market: marketInput, runs } = body as {
      scriptText?: string; scriptBase64?: string; isPdf?: boolean;
      fileName?: string; models: ProviderChoice[];
      market?: 'hollywood' | 'korean'; runs?: number;
    };
    const market = marketInput || 'korean';
    const runCount = Math.min(Math.max(runs || 1, 1), 3);

    // Parse script once — shared across all model runs
    const elements = isPdf && scriptBase64
      ? await parsePdfBuffer(Buffer.from(scriptBase64, 'base64'))
      : parseFountain(scriptText || '');

    const scriptName = fileName || `benchmark-${Date.now()}.txt`;
    const benchmarkId = `bench_${Date.now()}`;
    const benchmarkResults: ModelBenchmarkResult[] = [];

    console.log(`📊 Benchmark started: ${models.length} models × ${runCount} run(s), market: ${market}`);

    for (const provider of models) {
      for (let run = 0; run < runCount; run++) {
        const scriptId = `${benchmarkId}_${provider}_r${run + 1}`;
        console.log(`  🔄 Running ${provider} (run ${run + 1}/${runCount})...`);

        try {
          const { result, totalLatencyMs } = await runFullAnalysis({
            scriptId,
            elements,
            market,
            noFallback: true,
            singleProvider: provider,
          });

          // Score against rubrics
          const engineScores = scoreProviderRun(result, provider);
          const metrics = computeBenchmarkMetrics(engineScores, totalLatencyMs, provider);

          // Detect actual model name from first non-mock provider
          const actualModel = Object.values(result.providers || {}).find((p: any) => p !== 'mock') || provider;

          benchmarkResults.push({
            provider,
            model: actualModel as string,
            fullReport: result,
            engineScores,
            metrics,
            runIndex: run,
          });

          console.log(`  ✅ ${provider} done: quality=${metrics.avgQualityScore}, latency=${totalLatencyMs}ms, cost=$${metrics.totalCostUsd}`);
        } catch (err: any) {
          console.error(`  ❌ ${provider} failed: ${err.message?.slice(0, 100)}`);
          benchmarkResults.push({
            provider,
            model: 'error',
            fullReport: { error: err.message },
            engineScores: [],
            metrics: { totalLatencyMs: 0, totalCostUsd: 0, avgQualityScore: 0, structuralCompleteness: 0, consistency: 0 },
            runIndex: run,
          });
        }

        // Cooldown between model runs (10s)
        if (run < runCount - 1 || models.indexOf(provider) < models.length - 1) {
          await new Promise(r => setTimeout(r, 10000));
        }
      }
    }

    // Compute rankings and comparison matrix
    // For multi-run, use the best run per provider
    const bestPerProvider = new Map<ProviderChoice, ModelBenchmarkResult>();
    for (const r of benchmarkResults) {
      const existing = bestPerProvider.get(r.provider);
      if (!existing || r.metrics.avgQualityScore > existing.metrics.avgQualityScore) {
        bestPerProvider.set(r.provider, r);
      }
    }
    const bestResults = Array.from(bestPerProvider.values());
    const ranking = computeCompositeRanking(bestResults);
    const matrix = buildComparisonMatrix(bestResults);

    const comparison: BenchmarkComparison = {
      benchmarkId,
      scriptId: benchmarkId,
      scriptName,
      timestamp: new Date().toISOString(),
      market,
      models: benchmarkResults,
      ranking,
      matrix,
    };

    console.log(`📊 Benchmark complete. Rankings:`);
    ranking.forEach(r => console.log(`  ${r.rank}. ${r.provider} (${r.model}): composite=${r.compositeScore}`));

    return comparison;
  }, {
    body: t.Object({
      scriptText: t.Optional(t.String()),
      scriptBase64: t.Optional(t.String()),
      isPdf: t.Optional(t.Boolean()),
      fileName: t.Optional(t.String()),
      models: t.Array(t.String()),
      market: t.Optional(t.Union([t.Literal('hollywood'), t.Literal('korean')])),
      runs: t.Optional(t.Number()),
    })
  })

  .get("/report/:id", async ({ params: { id } }) => {
    const report = await reportRepo.findByScriptId(id);
    if (!report) return { error: "Report not found" };
    return report;
  })

  .get("/reports", async ({ query }) => {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 20, 100);
    return reportRepo.findAll(page, pageSize);
  }, {
    query: t.Object({
      page: t.Optional(t.String()),
      pageSize: t.Optional(t.String())
    })
  })

  .post("/translate", async ({ body }) => {
    const { report, targetLanguage, strategy: strat } = body as {
      report: any; targetLanguage: string; strategy?: AnalysisStrategyName;
    };

    if (targetLanguage !== 'ko') {
      return report; // only Korean translation supported for now
    }

    console.log(`🌐 Translating report ${report.scriptId} → ${targetLanguage}`);

    // Extract translatable text fields into a structured object
    const translatable: Record<string, any> = {};

    if (report.coverage) {
      translatable.coverage = {
        synopsis: report.coverage.synopsis || '',
        logline: report.coverage.logline || '',
        strengths: report.coverage.strengths || [],
        weaknesses: report.coverage.weaknesses || [],
        recommendation: report.coverage.recommendation || '',
        categories: (report.coverage.categories || []).map((cat: any) => ({
          name: cat.name,
          subcategories: (cat.subcategories || []).map((sub: any) => ({
            name: sub.name,
            assessment: sub.assessment || '',
          })),
        })),
      };
    }

    if (report.beatSheet) {
      translatable.beatSheet = (report.beatSheet || []).map((b: any) => ({
        name: b.name,
        description: b.description || '',
      }));
    }

    if (report.emotionGraph) {
      translatable.emotionGraph = (report.emotionGraph || []).map((e: any) => ({
        dominantEmotion: e.dominantEmotion || '',
        explanation: e.explanation || '',
      }));
    }

    if (report.narrativeArc) {
      translatable.narrativeArc = {
        arcDescription: report.narrativeArc.arcDescription || '',
        pacingIssues: (report.narrativeArc.pacingIssues || []).map((p: any) => ({
          description: p.description || '',
        })),
        genreFitDeviation: report.narrativeArc.genreFit?.deviation || '',
      };
    }

    if (report.predictions) {
      translatable.predictions = {
        roiReasoning: report.predictions.roi?.reasoning || '',
        ratingReasons: report.predictions.rating?.reasons || [],
      };
    }

    if (report.tropes) {
      translatable.tropes = report.tropes || [];
    }

    // Single LLM call for all translations
    const factory = new LLMFactory();
    const resolved = resolveStrategy(strat || 'auto');
    let provider: ILLMProvider;
    try {
      provider = factory.getProvider(resolved.engineProviders.coverage);
    } catch {
      provider = factory.getProvider('mock');
    }

    const systemPrompt = `You are a professional Korean translator specializing in the film and entertainment industry.
Translate ALL string values in the provided JSON to Korean.
Rules:
- Preserve the JSON structure and keys EXACTLY as-is (do not translate keys).
- Keep proper nouns (character names, movie titles) in their original form.
- Keep technical abbreviations (VFX, CGI, SFX) unchanged.
- Keep numbers unchanged.
- Translate film industry terms naturally: e.g., "Inciting Incident" → "사건의 발단", "Climax" → "클라이맥스", "Rising Action" → "상승 액션".
- For emotion names: "Tension" → "긴장", "Fear" → "공포", "Joy" → "기쁨", "Sadness" → "슬픔", "Anger" → "분노", "Hope" → "희망", "Surprise" → "놀라움", etc.
- Return ONLY the translated JSON object, no markdown or explanation.`;

    const userPrompt = JSON.stringify(translatable, null, 2);

    try {
      const response = await provider.generateText(systemPrompt, userPrompt);
      // Strip markdown code fences if LLM wraps response (common with Gemini)
      let content = response.content.trim();
      if (content.startsWith('```')) {
        content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }
      const translated = JSON.parse(content);

      // Merge translated fields back into report
      const result = JSON.parse(JSON.stringify(report)); // deep clone

      if (translated.coverage && result.coverage) {
        result.coverage.synopsis = translated.coverage.synopsis;
        result.coverage.logline = translated.coverage.logline;
        result.coverage.strengths = translated.coverage.strengths;
        result.coverage.weaknesses = translated.coverage.weaknesses;
        result.coverage.recommendation = translated.coverage.recommendation;
        if (translated.coverage.categories) {
          translated.coverage.categories.forEach((tCat: any, ci: number) => {
            if (result.coverage.categories?.[ci]?.subcategories) {
              tCat.subcategories?.forEach((tSub: any, si: number) => {
                if (result.coverage.categories[ci].subcategories[si]) {
                  result.coverage.categories[ci].subcategories[si].assessment = tSub.assessment;
                }
              });
            }
          });
        }
      }

      if (translated.beatSheet && result.beatSheet) {
        translated.beatSheet.forEach((tBeat: any, i: number) => {
          if (result.beatSheet[i]) {
            result.beatSheet[i].description = tBeat.description;
          }
        });
      }

      if (translated.emotionGraph && result.emotionGraph) {
        translated.emotionGraph.forEach((tEmo: any, i: number) => {
          if (result.emotionGraph[i]) {
            result.emotionGraph[i].dominantEmotion = tEmo.dominantEmotion;
            result.emotionGraph[i].explanation = tEmo.explanation;
          }
        });
      }

      if (translated.narrativeArc && result.narrativeArc) {
        result.narrativeArc.arcDescription = translated.narrativeArc.arcDescription;
        if (translated.narrativeArc.pacingIssues) {
          translated.narrativeArc.pacingIssues.forEach((tP: any, i: number) => {
            if (result.narrativeArc.pacingIssues?.[i]) {
              result.narrativeArc.pacingIssues[i].description = tP.description;
            }
          });
        }
        if (result.narrativeArc.genreFit) {
          result.narrativeArc.genreFit.deviation = translated.narrativeArc.genreFitDeviation;
        }
      }

      if (translated.predictions && result.predictions) {
        if (result.predictions.roi) {
          result.predictions.roi.reasoning = translated.predictions.roiReasoning;
        }
        if (result.predictions.rating) {
          result.predictions.rating.reasons = translated.predictions.ratingReasons;
        }
      }

      if (translated.tropes) {
        result.tropes = translated.tropes;
      }

      console.log(`✅ Translation complete (${provider.name})`);
      return result;
    } catch (err: any) {
      console.warn(`⚠️ Translation failed (${err.message?.slice(0, 80)}), returning original`);
      return report;
    }
  }, {
    body: t.Object({
      report: t.Any(),
      targetLanguage: t.String(),
      strategy: t.Optional(t.Union([
        t.Literal('auto'), t.Literal('fast'), t.Literal('deep'), t.Literal('custom')
      ])),
    })
  })

  .post("/chat", async ({ body }) => {
    const { scriptId, message, history, strategy: strat, market: marketInput } = body as {
      scriptId: string; message: string; history?: any[];
      strategy?: AnalysisStrategyName; market?: 'hollywood' | 'korean';
    };

    // Load stored report as context
    const report = await reportRepo.findByScriptId(scriptId);
    if (!report) {
      return { error: "Report not found. Run analysis first." };
    }

    const factory = new LLMFactory();
    const resolved = resolveStrategy(strat || 'auto');

    // Use the coverage engine provider for chat (best quality)
    let provider: ILLMProvider;
    try {
      provider = factory.getProvider(resolved.engineProviders.coverage);
    } catch {
      try {
        // Fallback chain
        for (const name of ['gemini', 'anthropic', 'openai', 'deepseek', 'groq'] as const) {
          try {
            provider = factory.getProvider(name);
            break;
          } catch { /* continue */ }
        }
        provider = provider! || factory.getProvider('mock');
      } catch {
        provider = factory.getProvider('mock');
      }
    }

    const agent = new ScriptChatAgent(provider);
    const result = await agent.chat({
      scriptId,
      message,
      history: (history || []).slice(-10),
      reportContext: report as unknown as Record<string, unknown>,
      market: marketInput || 'hollywood',
    });

    return result;
  }, {
    body: t.Object({
      scriptId: t.String(),
      message: t.String(),
      history: t.Optional(t.Array(t.Object({
        role: t.Union([t.Literal('user'), t.Literal('assistant')]),
        content: t.String(),
        timestamp: t.Number(),
      }))),
      strategy: t.Optional(t.Union([
        t.Literal('auto'), t.Literal('fast'), t.Literal('deep'), t.Literal('custom'),
        t.Literal('budget'), t.Literal('premium'), t.Literal('long-context')
      ])),
      market: t.Optional(t.Union([t.Literal('hollywood'), t.Literal('korean')])),
    })
  })

  .post("/compare", async ({ body }) => {
    const { oldScriptId, newScriptId } = body as { oldScriptId: string; newScriptId: string };

    const oldReport = await reportRepo.findByScriptId(oldScriptId);
    if (!oldReport) return { error: `Report not found: ${oldScriptId}` };

    const newReport = await reportRepo.findByScriptId(newScriptId);
    if (!newReport) return { error: `Report not found: ${newScriptId}` };

    const comparator = new DraftComparator();
    return comparator.compare(
      oldReport as unknown as Record<string, any>,
      newReport as unknown as Record<string, any>,
    );
  }, {
    body: t.Object({
      oldScriptId: t.String(),
      newScriptId: t.String(),
    })
  })

  .listen(4005);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
