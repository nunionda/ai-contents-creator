import { GoogleGenAI } from '@google/genai';
import { env } from '../../../shared/env';
import type { ILLMProvider, LLMResponse } from './ILLMProvider';

export type GeminiTier = 'standard' | 'pro' | 'long-context';

// Ordered low → high: try cheapest/oldest first, escalate on rate-limit
const MODEL_CHAINS: Record<GeminiTier, string[]> = {
  standard: ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash'],
  pro: ['gemini-1.5-pro', 'gemini-2.0-flash', 'gemini-2.5-pro'],
  'long-context': ['gemini-1.5-pro', 'gemini-2.5-pro'],
};

// Shared rate limiter across all GeminiProvider instances.
// Gemini paid tier: generous RPM, keep minimal interval to avoid bursts.
let lastApiCallMs = 0;
const MIN_INTERVAL_MS = 1_000;

export class GeminiProvider implements ILLMProvider {
  readonly name: string;
  private client: GoogleGenAI | null = null;
  private readonly modelChain: string[];

  constructor(tier: GeminiTier = 'standard') {
    const TIER_NAMES: Record<GeminiTier, string> = {
      standard: 'gemini',
      pro: 'gemini-pro',
      'long-context': 'gemini-long',
    };
    this.name = TIER_NAMES[tier];
    this.modelChain = MODEL_CHAINS[tier];

    if (env.GEMINI_API_KEY) {
      this.client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    } else {
      console.warn("⚠️ GEMINI_API_KEY is not set. GeminiProvider will be disabled.");
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /** Wait for the shared rate limit window before making an API call. */
  private async waitForRateLimit(): Promise<void> {
    const elapsed = Date.now() - lastApiCallMs;
    if (elapsed < MIN_INTERVAL_MS) {
      await this.sleep(MIN_INTERVAL_MS - elapsed);
    }
    lastApiCallMs = Date.now();
  }

  async generateText(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const startTime = Date.now();

    if (!this.client) {
      return { provider: this.name, model: 'none', content: '', latencyMs: 0, error: 'API Key missing' };
    }

    let lastError = '';

    for (const model of this.modelChain) {
      // Rate-limit: wait for minimum interval since last API call
      await this.waitForRateLimit();

      try {
        const response = await this.client.models.generateContent({
          model,
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.2,
          },
        });

        // Gemini often wraps JSON in markdown code fences — strip them
        let content = (response.text || '').trim();
        if (content.startsWith('```')) {
          content = content.replace(/^```(?:\w*)\s*\n?/, '').replace(/\n?```\s*$/, '');
        }

        return {
          provider: this.name,
          model,
          content,
          latencyMs: Date.now() - startTime,
        };
      } catch (error: any) {
        const isRateLimit =
          error?.status === 429 ||
          error?.httpStatusCode === 429 ||
          error?.code === 429 ||
          error.message?.includes('429') ||
          error.message?.includes('RESOURCE_EXHAUSTED');

        if (isRateLimit) {
          // Wait extra on rate limit before trying next model
          console.warn(`⚠️ Gemini ${model} rate-limited, trying next model after cooldown...`);
          lastError = error.message;
          await this.sleep(MIN_INTERVAL_MS);
          lastApiCallMs = Date.now();
          continue; // Move to next model in chain
        }

        // Non-rate-limit error: fail immediately
        return {
          provider: this.name,
          model,
          content: '',
          latencyMs: Date.now() - startTime,
          error: error.message,
        };
      }
    }

    // All models exhausted
    return {
      provider: this.name,
      model: 'all-exhausted',
      content: '',
      latencyMs: Date.now() - startTime,
      error: `All Gemini models rate-limited. ${lastError}`,
    };
  }
}
