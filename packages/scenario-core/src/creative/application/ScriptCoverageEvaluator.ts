import type { ILLMProvider } from "../infrastructure/llm/ILLMProvider";
import type { ScriptCoverage } from "../domain/ScriptCoverage";
import type { ScriptElement } from "../../script/infrastructure/parser";
import type { Beat } from "../domain/BeatSheet";
import type { SceneEmotion } from "../domain/EmotionGraph";
import type { CharacterNode } from "../domain/CharacterNetwork";
import type { MarketLocale } from "../../shared/MarketConfig";
import { getMarketConfig } from "../../shared/MarketConfig";

export interface CoverageInput {
  beats: Beat[];
  emotions: SceneEmotion[];
  characters: CharacterNode[];
  roi: { tier: string; predictedMultiplier: number; confidence: number; reasoning: string };
  rating: { rating: string; reasons: string[]; confidence: number };
  comps: { title: string; similarityScore: number; sharedTraits: string[] }[];
}

export class ScriptCoverageEvaluator {
  constructor(private readonly llm: ILLMProvider) {}

  async evaluate(scriptId: string, elements: ScriptElement[], input: CoverageInput, market: MarketLocale = 'hollywood'): Promise<ScriptCoverage> {
    let currentScene = 0;
    const condensedLines = elements.map(e => {
      if (e.type === "scene_heading") {
        currentScene++;
        return `\n[Scene ${currentScene}] ${e.text}`;
      }
      if (e.type === "character" || e.type === "dialogue" || e.type === "action") {
        return e.type === 'character' ? `\n${e.text}:` : ` ${e.text}`;
      }
      return "";
    }).filter(line => line.trim() !== "");

    const condensedScript = condensedLines.join('').slice(0, 100000);

    const analysisContext = JSON.stringify({
      beatSheet: input.beats.map(b => ({ act: b.act, name: b.name, description: b.description })),
      emotionSummary: {
        sceneCount: input.emotions.length,
        avgScore: input.emotions.length > 0
          ? (input.emotions.reduce((s, e) => s + e.score, 0) / input.emotions.length).toFixed(1)
          : 0,
        emotionRange: input.emotions.map(e => e.dominantEmotion).filter((v, i, a) => a.indexOf(v) === i).slice(0, 8),
      },
      characters: input.characters.slice(0, 10).map(c => ({ name: c.name, role: c.role, lines: c.totalLines })),
      roi: { tier: input.roi.tier, multiplier: input.roi.predictedMultiplier },
      rating: { rating: input.rating.rating, reasons: input.rating.reasons },
      comps: input.comps.map(c => c.title),
    });

    const config = getMarketConfig(market);

    const systemPrompt = `You are ${config.prompts.analystRole}. You produce industry-standard script coverage reports comparable to OnDesk and ScriptBook platforms.

## EVALUATION PROCESS (Chain of Thought)
Step 1: Read the full screenplay text to understand the story, characters, and themes.
Step 2: Review the analysis context (beat sheet, emotion graph, character network, ROI prediction, comparable films).
Step 3: Evaluate each of the 8 categories below using both your reading and the analytical data.
Step 4: Identify 3-5 specific strengths with concrete scene/character references.
Step 5: Identify 3-5 specific weaknesses with actionable improvement suggestions.
Step 6: Assess market potential based on genre trends, comparable film performance, and target audience.
Step 7: Calculate overallScore as weighted average and determine verdict.

## SCORING CATEGORIES (8 categories, each 0-100)

1. **Premise & Concept** (2 subcategories):
   - Hook Strength: Is the logline compelling? Does the concept have inherent dramatic tension and commercial appeal?
   - Originality: Does it offer a fresh take or unique angle within its genre?

2. **Plot Structure & Logic** (3 subcategories):
   - Narrative Structure: How well does it follow classical frameworks (Three-Act, Save the Cat)? Are turning points at proper positions?
   - Pacing & Scene Flow: Are transitions smooth? Does momentum build appropriately? Any sagging or rushed sections?
   - Conflict Escalation: Do internal/external conflicts develop progressively with rising stakes?

3. **Character & Dialogue** (3 subcategories):
   - Character Arc & Growth: Do protagonist and key characters undergo meaningful transformation?
   - Dialogue Authenticity: Is dialogue character-specific with distinct voices? Rich with subtext rather than exposition?
   - Supporting Cast Function: Do supporting characters serve clear narrative purposes and have their own dimensionality?

4. **Theme & Tone** (2 subcategories):
   - Thematic Coherence: Is the core message clear, organically revealed, and consistently reinforced?
   - Tonal Consistency: Is the emotional register (drama, humor, suspense) maintained without jarring shifts?

5. **Emotional Impact** (2 subcategories):
   - Audience Engagement: Does the screenplay create genuine emotional investment? Are there memorable set pieces?
   - Catharsis & Satisfaction: Does the resolution deliver emotional payoff proportional to the buildup?

6. **Market Appeal** (3 subcategories):
   - Genre Fit & Trend Alignment: Does it satisfy genre conventions while meeting current audience preferences?
   - Comparable Film Benchmarking: How does it measure against successful films with similar DNA?
   - Target Audience Clarity: Is the intended demographic clear, and is the content calibrated accordingly?

7. **Production Feasibility** (2 subcategories):
   - Budget & Resource Viability: Are VFX demands, locations, and production scale realistic and justified?
   - Shooting Complexity: Are there practical production challenges (night shoots, water, animals, children)?

8. **Dialogue & Voice** (2 subcategories):
   - Subtext Richness: Do conversations carry meaning beneath the surface? Is exposition handled naturally?
   - Voice Distinctiveness: Can you identify the speaker without character labels? Do characters sound different from each other?

## VERDICT RULES
overallScore >= 80 → "Recommend" (top 1% — production-ready quality)
overallScore >= 60 → "Consider" (promising with refinement needs)
overallScore < 60 → "Pass" (significant structural or commercial issues)

CRITICAL INSTRUCTION: Output ONLY raw JSON matching this schema exactly:
{
  "title": "Inferred title",
  "genre": "Primary genre / Secondary genre",
  "logline": "One compelling sentence (under 30 words)",
  "synopsis": "5-7 sentence beat-by-beat plot summary covering all three acts",
  "categories": [
    {
      "name": "Premise & Concept",
      "score": 75,
      "subcategories": [
        { "name": "Hook Strength", "score": 80, "assessment": "2-3 sentence analysis with specific references..." },
        { "name": "Originality", "score": 70, "assessment": "2-3 sentence analysis..." }
      ]
    }
  ],
  "overallScore": 72,
  "verdict": "Consider",
  "strengths": ["Specific strength with scene/character reference", "...", "..."],
  "weaknesses": ["Specific weakness with actionable suggestion", "...", "..."],
  "marketPotential": "2-3 sentence assessment of commercial viability, target audience, and release strategy",
  "comparableTitles": ["Film 1 (Year)", "Film 2 (Year)", "Film 3 (Year)"],
  "recommendation": "Final analyst recommendation paragraph (3-4 sentences) summarizing the verdict rationale and key next steps for development"
}${config.prompts.responseLanguage ? `\n\n${config.prompts.responseLanguage}` : ''}`;

    const userPrompt = `<screenplay>
${condensedScript}
</screenplay>

<analysis_context>
${analysisContext}
</analysis_context>`;

    const response = await this.llm.generateText(systemPrompt, userPrompt);
    if (response.error) {
      throw new Error(`LLM Coverage Error: ${response.error}`);
    }

    try {
      const match = response.content.match(/\{[\s\S]*\}/);
      const jsonStr = match ? match[0] : response.content;
      const parsed = JSON.parse(jsonStr);

      return {
        scriptId,
        title: parsed.title || scriptId,
        genre: parsed.genre || 'Unknown',
        logline: parsed.logline || '',
        synopsis: parsed.synopsis || '',
        categories: parsed.categories || [],
        overallScore: parsed.overallScore || 0,
        verdict: parsed.verdict || 'Pass',
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
        recommendation: parsed.recommendation || '',
        marketPotential: parsed.marketPotential || '',
        comparableTitles: parsed.comparableTitles || [],
      };
    } catch (e) {
      throw new Error(`Failed to parse Coverage JSON from LLM:\n${response.content}`);
    }
  }
}
