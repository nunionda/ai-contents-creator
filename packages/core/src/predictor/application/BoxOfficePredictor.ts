import type { ILLMProvider } from "../../creative/infrastructure/llm/ILLMProvider";
import type { MarketLocale } from "../../shared/MarketConfig";
import { getMarketConfig } from "../../shared/MarketConfig";
import type { ScreenplayFeatures } from "../domain/ScreenplayFeatures";
import type { ROITier } from "../domain/PredictionResult";

export class BoxOfficePredictor {
  constructor(private readonly llm: ILLMProvider) {}

  async predictROI(
    features: ScreenplayFeatures,
    market: MarketLocale = 'hollywood',
    comps?: { title: string; similarityScore: number; sharedTraits: string[]; marketPerformance: { budget: number; revenue: number; roi: number } }[]
  ): Promise<{ tier: ROITier; predictedMultiplier: number; confidence: number; reasoning: string; revenueRange?: { low: number; likely: number; high: number } }> {
    const config = getMarketConfig(market);
    const { tiers } = config.roi;

    const systemPrompt = `You are ${config.prompts.boxOfficeRole}.
Analyze the provided screenplay features and predict its Return on Investment (ROI).

Step 1: Analyze the screenplay's structural features. Step 2: Compare against the benchmark films provided. Step 3: Estimate ROI tier and multiplier based on the comparisons.

ROI Tiers:
- Flop: Multiplier < ${tiers.flop.max}
- Break-even: ${tiers.breakEven.min} <= Multiplier < ${tiers.breakEven.max}
- Hit: ${tiers.hit.min} <= Multiplier < ${tiers.hit.max}
- Blockbuster: Multiplier >= ${tiers.blockbuster.min}${tiers.blockbuster.admissionsThreshold ? ` (or ${(tiers.blockbuster.admissionsThreshold / 1_000_000).toFixed(0)}M+ admissions)` : ''}

CRITICAL INSTRUCTION: Output ONLY raw JSON matching this schema exactly:
{
  "tier": "Hit",
  "predictedMultiplier": 3.2,
  "confidence": 0.85,
  "reasoning": "Explanation based on provided features...",
  "revenueRange": { "low": 50000000, "likely": 120000000, "high": 250000000 }
}`;

    const compsSection = comps && comps.length > 0
      ? `\n\nComparable Films:\n${comps.map(c => `- ${c.title}: Budget $${c.marketPerformance.budget}, Revenue $${c.marketPerformance.revenue}, ROI ${c.marketPerformance.roi}, Similarity ${c.similarityScore.toFixed(2)}, Traits: [${c.sharedTraits.join(', ')}]`).join('\n')}`
      : '';

    const userPrompt = `
Screenplay Features:
- Budget: ${features.market?.budget || "Unknown"}
- Scene Count: ${features.metrics.sceneCount}
- Protagonist: ${features.analysis.characterNetwork.characters[0]?.name || "N/A"}
- Emotional Volatility: ${features.analysis.emotionalVolatility.toFixed(2)}
- Dialogue/Action Ratio: ${features.metrics.dialogueToActionRatio.toFixed(2)}
- Top Genres: ${features.market?.genres?.join(", ") || "N/A"}
- Unique Location Count: ${features.metrics.uniqueLocationCount}
- INT/EXT Ratio: ${features.metrics.intExtRatio.toFixed(2)}
- Monologue Count: ${features.metrics.monologueCount}
- Speaking Roles Count: ${features.metrics.speakingRolesCount}
- Emotional Range: ${features.metrics.emotionalRange.toFixed(2)}${compsSection}
    `.trim();

    const response = await this.llm.generateText(systemPrompt, userPrompt);
    if (response.error) throw new Error(`LLM Prediction Error: ${response.error}`);

    try {
      const match = response.content.match(/\{[\s\S]*\}/);
      const jsonStr = match ? match[0] : response.content;
      return JSON.parse(jsonStr);
    } catch (e) {
      throw new Error(`Failed to parse ROI prediction JSON from LLM: \n${response.content}`);
    }
  }
}
