import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../../shared/env';
import type { ILLMProvider, LLMResponse } from './ILLMProvider';

export type AnthropicModel = 'sonnet' | 'opus' | 'haiku';

const MODEL_MAP: Record<AnthropicModel, string> = {
  sonnet: 'claude-sonnet-4-6-20250514',
  opus: 'claude-opus-4-6-20250610',
  haiku: 'claude-haiku-4-5-20251001',
};

export class AnthropicProvider implements ILLMProvider {
  readonly name = 'anthropic';
  private client: Anthropic | null = null;
  private readonly model: string;

  constructor(model: AnthropicModel = 'sonnet') {
    this.model = MODEL_MAP[model];
    if (env.ANTHROPIC_API_KEY) {
      this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    } else {
      console.warn("⚠️ ANTHROPIC_API_KEY is not set. AnthropicProvider will be disabled.");
    }
  }

  async generateText(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const startTime = Date.now();
    try {
      if (!this.client) throw new Error("API Key missing");

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 8192,
        temperature: 0.2,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      });

      const contentBlock = response.content[0];
      const content = contentBlock.type === 'text' ? contentBlock.text : "";

      return {
        provider: this.name,
        model: this.model,
        content,
        latencyMs: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        provider: this.name,
        model: this.model,
        content: "",
        latencyMs: Date.now() - startTime,
        error: error.message
      };
    }
  }
}
