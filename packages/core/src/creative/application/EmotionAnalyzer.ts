import type { ILLMProvider } from "../infrastructure/llm/ILLMProvider";
import type { EmotionGraph } from "../domain/EmotionGraph";
import type { ScriptElement } from "../../script/infrastructure/parser";

export class EmotionAnalyzer {
  constructor(private readonly llm: ILLMProvider) {}

  /**
   * Evaluates the emotional valance and tension of the script on a scene-by-scene basis.
   * Leverages large context-window models (e.g. Claude 3.5 Sonnet) to ingest the full screenplay.
   */
  async analyze(scriptId: string, elements: ScriptElement[]): Promise<EmotionGraph> {
    let currentScene = 0;
    
    const condensedScript = elements.map(e => {
      if (e.type === "scene_heading") {
        currentScene++;
        return `\n[Scene ${currentScene}]`;
      }
      return `${e.type === 'character' ? '\n' + e.text + ':' : ' ' + e.text}`;
    }).filter(l => l.trim() !== "").join('').slice(0, 150000); // 150k char limit for generic extraction

    const systemPrompt = `You are a cognitive script analyzer determining the "Emotional Arc" of a story.
Read the script and score the emotional valence of EACH SCENE.
Score ranges from -10 (devastation, extreme negative tension) to +10 (joy, triumph, extreme positive).

For each scene, follow this chain-of-thought process:
1) Identify the literal action and conflict present in the scene.
2) Assess the underlying emotional subtext — what characters feel versus what they express.
3) Rate tension (0-10, based on stakes and conflict intensity). 0 = no tension, 10 = life-or-death stakes.
4) Rate humor (0-10, situational or dialogue comedy). 0 = no comedic elements, 10 = laugh-out-loud comedy.
5) Predict audience engagement level: "high" (gripping, cannot look away), "medium" (maintains interest), or "low" (may lose attention).

CRITICAL INSTRUCTION: Output ONLY raw JSON matching this schema exactly:
{
  "scenes": [
    { "sceneNumber": 1, "score": -5, "dominantEmotion": "Fear", "explanation": "Brief reason...", "tension": 7, "humor": 0, "engagement": "high" }
  ]
}`;

    const userPrompt = `<script>\n${condensedScript}\n</script>`;
    
    const response = await this.llm.generateText(systemPrompt, userPrompt);
    if (response.error) throw new Error(`LLM Emotion Analysis Error: ${response.error}`);

    try {
      const match = response.content.match(/\{[\s\S]*\}/);
      const jsonStr = match ? match[0] : response.content;
      const parsed = JSON.parse(jsonStr);
      
      return {
        scriptId,
        scenes: (parsed.scenes || []).map((s: Record<string, unknown>) => ({
          ...s,
          tension: typeof s.tension === 'number' ? s.tension : 0,
          humor: typeof s.humor === 'number' ? s.humor : 0,
          engagement: ['high', 'medium', 'low'].includes(s.engagement as string) ? s.engagement : 'medium',
        }))
      };
    } catch (e) {
      throw new Error(`Failed to parse Emotion JSON from LLM: \n${response.content}`);
    }
  }
}
