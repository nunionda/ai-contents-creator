import { describe, expect, test, mock } from 'bun:test';
import { BeatSheetGenerator } from './BeatSheetGenerator';
import { ILLMProvider, LLMResponse } from '../infrastructure/llm/ILLMProvider';
import { ScriptElement } from '../../script/infrastructure/parser';

// Create a Dummy LLM Provider that instantly returns a preset JSON response
class MockProvider implements ILLMProvider {
  name = 'mock';
  async generateText(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const mockJson = JSON.stringify({
      beats: [
        {
          act: 1,
          name: "Inciting Incident",
          sceneStart: 1,
          sceneEnd: 2,
          description: "The hero meets the villain."
        }
      ]
    });
    
    // Simulating an LLM returning markdown wrapped JSON
    return {
      provider: 'mock',
      model: 'mock-test',
      content: `\`\`\`json\n${mockJson}\n\`\`\``,
      latencyMs: 10
    };
  }
}

describe('BeatSheetGenerator', () => {
  const llm = new MockProvider();
  const generator = new BeatSheetGenerator(llm);

  test('should accurately parse JSON stripped of markdown and construct BeatSheet', async () => {
    const mockElements: ScriptElement[] = [
      { type: "scene_heading", text: "INT. COFFEE SHOP - DAY" },
      { type: "action", text: "A man sits alone." },
      { type: "scene_heading", text: "EXT. ALLEY - NIGHT" },
      { type: "action", text: "He finds the artifact." }
    ];

    const beatSheet = await generator.generate("script-xyz", mockElements);
    
    expect(beatSheet.scriptId).toBe("script-xyz");
    expect(beatSheet.beats).toHaveLength(1);
    expect(beatSheet.beats[0].name).toBe("Inciting Incident");
    expect(beatSheet.beats[0].act).toBe(1);
    expect(beatSheet.beats[0].sceneEnd).toBe(2);
  });
});
