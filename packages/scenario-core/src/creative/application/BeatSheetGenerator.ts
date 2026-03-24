import type { ILLMProvider } from "../infrastructure/llm/ILLMProvider";
import type { BeatSheet } from "../domain/BeatSheet";
import type { ScriptElement } from "../../script/infrastructure/parser";
import type { MarketLocale } from "../../shared/MarketConfig";
import { getMarketConfig } from "../../shared/MarketConfig";

export class BeatSheetGenerator {
  constructor(private readonly llm: ILLMProvider) {}

  /**
   * Translates an array of raw script elements into a structurally dense text blocks
   * and invokes the LLM to output a precise 3-Act Structure Beat Sheet JSON.
   */
  async generate(scriptId: string, elements: ScriptElement[], market: MarketLocale = 'hollywood'): Promise<BeatSheet> {
    let currentScene = 0;
    
    // Condense script to preserve token space while maintaining context
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

    // Safety truncate to prevent LLM context overflow bounds (basic chunking)
    const condensedScript = condensedLines.join('').slice(0, 100000);

    const config = getMarketConfig(market);

    const systemPrompt = `You are ${config.prompts.consultantRole}.
Analyze the provided screenplay text and extract its narrative structure using the Save the Cat! 15-beat framework.

The 15 beats and their IDEAL page-percentage positions are:
1. Opening Image (0-1%)
2. Theme Stated (5%)
3. Set-Up (1-10%)
4. Catalyst (12%)
5. Debate (12-25%)
6. Break Into Two (25%)
7. B Story (30%)
8. Fun and Games (30-55%)
9. Midpoint (55%)
10. Bad Guys Close In (55-75%)
11. All Is Lost (75%)
12. Dark Night of the Soul (75-85%)
13. Break Into Three (85%)
14. Finale (85-99%)
15. Final Image (99-100%)

Use the following chain-of-thought process:
Step 1: Identify the total scene count and estimate the total page count from the screenplay.
Step 2: Map each Save the Cat beat to its corresponding scenes by analyzing narrative turning points.
Step 3: Calculate the actual pagePercentage for each beat (its position as a percentage of the total screenplay).
Step 4: If a beat's actual pagePercentage deviates from its ideal position by more than 10 percentage points, include a pacingNote explaining the deviation.
Step 5: Assign the correct act number (1, 2, or 3) based on the beat's structural role.

CRITICAL INSTRUCTION: You MUST output ONLY raw, valid JSON matching the exact schema below without any markdown fences or extra conversational text.
{
  "beats": [
    {
      "act": 1,
      "name": "Opening Image",
      "sceneStart": 1,
      "sceneEnd": 1,
      "description": "Explanation of how this beat functions in the narrative.",
      "pagePercentage": 0,
      "pacingNote": null
    }
  ]
}

Rules for the output:
- pagePercentage is a number from 0 to 100 representing the beat's actual position in the screenplay.
- pacingNote is a string explaining pacing deviation, or null if the beat is within 10% of its ideal position.
- Every one of the 15 beats must appear in the output array.${config.prompts.responseLanguage ? `\n\n${config.prompts.responseLanguage}` : ''}`;

    const userPrompt = `<screenplay>\n${condensedScript}\n</screenplay>`;

    // Execute standard LLM generation
    const response = await this.llm.generateText(systemPrompt, userPrompt);
    
    if (response.error) {
      throw new Error(`LLM Strategy Error: ${response.error}`);
    }

    try {
      // Regex extraction pattern to natively strip out markdown JSON block quotes 
      // if the LLM disobeys the prompt.
      const match = response.content.match(/\{[\s\S]*\}/);
      const jsonStr = match ? match[0] : response.content;
      const parsed = JSON.parse(jsonStr);
      
      return {
        scriptId,
        beats: (parsed.beats || []).map((b: Record<string, unknown>) => ({
          ...b,
          pagePercentage: typeof b.pagePercentage === 'number' ? b.pagePercentage : 0,
          pacingNote: b.pacingNote ?? null,
        }))
      };
    } catch (e) {
      throw new Error(`Failed to parse structured JSON from LLM: \n${response.content}`);
    }
  }
}
