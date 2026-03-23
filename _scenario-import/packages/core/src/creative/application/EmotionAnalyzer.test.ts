import { describe, expect, test, mock } from 'bun:test';
import { EmotionAnalyzer } from './EmotionAnalyzer';
import { ILLMProvider, LLMResponse } from '../infrastructure/llm/ILLMProvider';
import { ScriptElement } from '../../script/infrastructure/parser';

class MockLLM implements ILLMProvider {
  name = 'mock';
  async generateText(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const jsonStr = JSON.stringify({
      scenes: [
        { sceneNumber: 1, score: 8, dominantEmotion: "Joy", explanation: "Happy opening." },
        { sceneNumber: 2, score: -6, dominantEmotion: "Fear", explanation: "Sudden attack." }
      ]
    });
    
    return {
      provider: 'mock',
      model: 'mock-test',
      content: `\`\`\`json\n${jsonStr}\n\`\`\``,
      latencyMs: 15
    };
  }
}

describe('EmotionAnalyzer', () => {
  const llm = new MockLLM();
  const analyzer = new EmotionAnalyzer(llm);

  test('should generate emotion graph safely extracting JSON from LLM markdown', async () => {
    const mockElements: ScriptElement[] = [
      { type: "scene_heading", text: "INT. HAPPY PLACE - DAY" },
      { type: "action", text: "Everyone is smiling." }
    ];

    const graph = await analyzer.analyze("script-1", mockElements);
    
    expect(graph.scriptId).toBe("script-1");
    expect(graph.scenes).toHaveLength(2);
    expect(graph.scenes[0].score).toBe(8);
    expect(graph.scenes[1].dominantEmotion).toBe("Fear");
  });
});
