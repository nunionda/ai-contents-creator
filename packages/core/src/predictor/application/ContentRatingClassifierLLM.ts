import type { ILLMProvider } from "../../creative/infrastructure/llm/ILLMProvider";
import type { ScriptElement } from "../../script/infrastructure/parser";
import type { ContentRating, MarketLocale } from "../../shared/MarketConfig";
import { getMarketConfig } from "../../shared/MarketConfig";

export class ContentRatingClassifierLLM {
  constructor(private readonly llm: ILLMProvider) {}

  async classify(scriptId: string, elements: ScriptElement[], market: MarketLocale = 'hollywood'): Promise<{
    rating: ContentRating;
    reasons: string[];
    confidence: number;
    contentCounts?: { violence: number; profanity: number; sexualContent: number; drugReferences: number };
  }> {
    const config = getMarketConfig(market);

    // Collect a sample of dialogue and action for content analysis
    const samplingText = elements
      .filter(e => e.type === "dialogue" || e.type === "action")
      .slice(0, 2000)
      .map(e => e.text)
      .join("\n");

    const ratingGuidelines = market === 'korean'
      ? `KMRB Rating Guidelines:
- ALL: Suitable for all ages.
- 12+: Brief violence, mild language.
- 15+: Moderate violence, some profanity, mild sexual themes.
- 19+: Strong violence, explicit language, sexual content, drug use.
- RESTRICTED: Extreme content.`
      : `MPAA Rating Guidelines:
- G: No nudity, minimal violence.
- PG: Brief mild violence, no drug use.
- PG-13: One non-sexual F-word allowed, moderate violence, brief nudity possible.
- R: Persistent violence, drug use, nudity, multiple F-words.
- NC-17: Explicit sexual content.`;

    const systemPrompt = `You are a ${config.ratings.system} rating specialist.
Analyze the script content and predict the appropriate age rating.

${ratingGuidelines}

Step 1: Scan all dialogue and action for violent content. Step 2: Count profanity instances. Step 3: Identify sexual and drug-related themes. Step 4: Determine the appropriate rating based on the guidelines.

Ratings: ${config.prompts.ratingValues}.

CRITICAL INSTRUCTION: Output ONLY raw JSON matching this schema exactly:
{
  "rating": "${config.ratings.values[2]}",
  "reasons": ["Moderate fantasy violence", "Some suggestive themes"],
  "confidence": 0.90,
  "contentCounts": { "violence": 12, "profanity": 3, "sexualContent": 1, "drugReferences": 0 }
}`;

    const userPrompt = `<script_sample>\n${samplingText}\n</script_sample>`;

    const response = await this.llm.generateText(systemPrompt, userPrompt);
    if (response.error) throw new Error(`LLM Rating Error: ${response.error}`);

    try {
      const match = response.content.match(/\{[\s\S]*\}/);
      const jsonStr = match ? match[0] : response.content;
      return JSON.parse(jsonStr);
    } catch (e) {
      throw new Error(`Failed to parse Rating JSON from LLM: \n${response.content}`);
    }
  }
}
