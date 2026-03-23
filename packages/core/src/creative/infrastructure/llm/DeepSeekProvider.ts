import OpenAI from 'openai';
import { env } from '../../../shared/env';
import type { ILLMProvider, LLMResponse } from './ILLMProvider';

export class DeepSeekProvider implements ILLMProvider {
  readonly name = 'deepseek';
  private client: OpenAI | null = null;
  private readonly model: string;

  constructor(model: 'deepseek-chat' | 'deepseek-reasoner' = 'deepseek-chat') {
    this.model = model;
    if (env.DEEPSEEK_API_KEY) {
      this.client = new OpenAI({
        apiKey: env.DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com',
      });
    } else {
      console.warn("⚠️ DEEPSEEK_API_KEY is not set. DeepSeekProvider will be disabled.");
    }
  }

  async generateText(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const startTime = Date.now();
    try {
      if (!this.client) throw new Error("API Key missing");

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
      });

      return {
        provider: this.name,
        model: this.model,
        content: response.choices[0]?.message?.content || '',
        latencyMs: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        provider: this.name,
        model: this.model,
        content: '',
        latencyMs: Date.now() - startTime,
        error: error.message,
      };
    }
  }
}
