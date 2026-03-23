import OpenAI from 'openai';
import { env } from '../../../shared/env';
import type { ILLMProvider, LLMResponse } from './ILLMProvider';

export class GroqProvider implements ILLMProvider {
  readonly name = 'groq';
  private client: OpenAI | null = null;

  private readonly modelChain = [
    'llama-3.3-70b-versatile',
    'mixtral-8x7b-32768',
    'llama-3.1-8b-instant',
  ];

  private readonly maxRetries = 1;
  private readonly baseDelayMs = 3000;

  constructor() {
    if (env.GROQ_API_KEY) {
      this.client = new OpenAI({
        apiKey: env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
      });
    } else {
      console.warn("⚠️ GROQ_API_KEY is not set. GroqProvider will be disabled.");
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generateText(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const startTime = Date.now();

    if (!this.client) {
      return { provider: this.name, model: 'none', content: '', latencyMs: 0, error: 'API Key missing' };
    }

    let lastError = '';

    for (const model of this.modelChain) {
      for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
        try {
          const response = await this.client.chat.completions.create({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.2,
          });

          return {
            provider: this.name,
            model,
            content: response.choices[0]?.message?.content || '',
            latencyMs: Date.now() - startTime,
          };
        } catch (error: any) {
          const isRateLimit =
            error?.status === 429 ||
            error.message?.includes('429') ||
            error.message?.includes('rate_limit');

          const isTooLarge =
            error?.status === 413 ||
            error.message?.includes('413') ||
            error.message?.includes('too large');

          if (isRateLimit) {
            if (attempt < this.maxRetries) {
              const delay = this.baseDelayMs * Math.pow(2, attempt);
              console.warn(`⚠️ Groq ${model} rate-limited, retrying in ${delay / 1000}s...`);
              await this.sleep(delay);
              continue;
            }
            console.warn(`⚠️ Groq ${model} rate-limited, trying next model...`);
            lastError = error.message;
            break;
          }

          if (isTooLarge) {
            console.warn(`⚠️ Groq ${model} input too large, trying next model...`);
            lastError = error.message;
            break;
          }

          return {
            provider: this.name,
            model,
            content: '',
            latencyMs: Date.now() - startTime,
            error: error.message,
          };
        }
      }
    }

    return {
      provider: this.name,
      model: 'all-exhausted',
      content: '',
      latencyMs: Date.now() - startTime,
      error: `All Groq models rate-limited. ${lastError}`,
    };
  }
}
