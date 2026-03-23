import type { ILLMProvider } from "../../creative/infrastructure/llm/ILLMProvider";
import type { ScriptElement } from "../../script/infrastructure/parser";
import type { MarketLocale } from "../../shared/MarketConfig";
import { getMarketConfig } from "../../shared/MarketConfig";
import { TROPE_DICTIONARY } from "../data/filmCatalog";
import { KOREAN_TROPE_DICTIONARY } from "../data/koreanTropeDictionary";
import type { TropeResult } from "./TropeAnalyzer";

export class TropeAnalyzerLLM {
  constructor(private provider: ILLMProvider) {}

  /**
   * Uses LLM to identify key narrative tropes from the screenplay.
   * Returns a list of matched tropes from the standard dictionary.
   */
  async analyze(scriptId: string, elements: ScriptElement[], market: MarketLocale = 'hollywood'): Promise<TropeResult> {
    // Build a synopsis from the first ~30 scenes of action + dialogue
    const synopsis = this.buildSynopsis(elements);
    const config = getMarketConfig(market);
    const dictionary = market === 'korean' ? KOREAN_TROPE_DICTIONARY : TROPE_DICTIONARY;

    const systemPrompt = `You are ${config.prompts.tropeAnalystRole}.
Given the following screenplay excerpt, identify 5-10 narrative tropes that best describe this story.

ONLY use tropes from this dictionary:
${dictionary.join(", ")}

Respond with a JSON array of strings. Example: ${market === 'korean' ? '["Revenge Drama (복수극)", "Class Divide (계층 갈등)", "Twist Ending (반전)"]' : '["Revenge", "Anti-Hero", "Twist Ending"]'}
Only output the JSON array, nothing else.`;

    const response = await this.provider.generateText(systemPrompt, synopsis);

    try {
      // Strip markdown fences and extra text around JSON array
      let content = response.content.trim();
      content = content.replace(/```json?\s*\n?/g, "").replace(/```/g, "").trim();
      // Extract JSON array if surrounded by extra text
      const arrayMatch = content.match(/\[[\s\S]*\]/);
      if (!arrayMatch) {
        console.warn(`⚠️ TropeAnalyzer: No JSON array found in response (${this.provider.name}): ${content.slice(0, 100)}`);
        return { scriptId, tropes: [] };
      }

      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) {
        // Filter to valid dictionary tropes (partial match: LLM trope contains or is contained by dictionary entry)
        const valid = parsed.filter(
          (t: unknown): t is string => {
            if (typeof t !== "string") return false;
            const lower = (t as string).toLowerCase();
            return dictionary.some((d) => {
              const dLower = d.toLowerCase();
              // Exact match, or LLM trope matches the primary name (before parenthetical Korean)
              return dLower === lower
                || dLower.startsWith(lower)
                || lower.startsWith(dLower.split("(")[0].trim());
            });
          },
        );
        // Map back to canonical dictionary names
        const canonical = valid.map((t) => {
          const lower = t.toLowerCase();
          const match = dictionary.find((d) => {
            const dLower = d.toLowerCase();
            return dLower === lower
              || dLower.startsWith(lower)
              || lower.startsWith(dLower.split("(")[0].trim());
          });
          return match || t;
        });
        return { scriptId, tropes: [...new Set(canonical)].slice(0, 10) };
      }
    } catch (err: any) {
      console.warn(`⚠️ TropeAnalyzer: Parse failure (${this.provider.name}): ${err.message?.slice(0, 80)}`);
    }

    return { scriptId, tropes: [] };
  }

  private buildSynopsis(elements: ScriptElement[]): string {
    const lines: string[] = [];
    let sceneCount = 0;

    for (const el of elements) {
      if (el.type === "scene_heading") {
        sceneCount++;
        if (sceneCount > 30) break;
        lines.push(`\n[${el.text}]`);
      } else if (el.type === "action") {
        lines.push(el.text);
      } else if (el.type === "character") {
        lines.push(`${el.text}:`);
      } else if (el.type === "dialogue") {
        lines.push(`  "${el.text}"`);
      }
    }

    return lines.join("\n").slice(0, 4000); // Cap at 4000 chars
  }
}
