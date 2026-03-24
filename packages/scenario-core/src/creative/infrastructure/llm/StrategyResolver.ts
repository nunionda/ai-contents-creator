import type { AnalysisStrategy, AnalysisStrategyName, CustomStrategyInput, ProviderChoice } from './AnalysisStrategy';
import { env } from '../../../shared/env';

function getDefaultProvider(): ProviderChoice {
  // Priority: Gemini Pro (paid) → Groq (free) → DeepSeek (cheap) → Anthropic → OpenAI → Mock
  if (env.GEMINI_API_KEY) return 'gemini-pro';
  if (env.GROQ_API_KEY) return 'groq';
  if (env.DEEPSEEK_API_KEY) return 'deepseek';
  if (env.ANTHROPIC_API_KEY) return 'anthropic';
  if (env.OPENAI_API_KEY) return 'openai';
  return 'mock';
}

export function resolveStrategy(
  strategyName: AnalysisStrategyName,
  custom?: CustomStrategyInput,
): AnalysisStrategy {
  const defaultProvider = getDefaultProvider();

  switch (strategyName) {
    case 'fast':
      return {
        name: 'fast',
        engineProviders: {
          beatSheet: 'gemini',
          emotion: 'gemini',
          rating: 'gemini',
          roi: 'gemini',
          coverage: 'gemini',
          vfx: 'gemini',
          trope: 'gemini',
        },
      };

    case 'deep': {
      const deepReasoner: ProviderChoice = env.ANTHROPIC_API_KEY ? 'anthropic' : defaultProvider;
      const fastClassifier: ProviderChoice = env.GEMINI_API_KEY ? 'gemini' : defaultProvider;
      return {
        name: 'deep',
        engineProviders: {
          beatSheet: deepReasoner,
          emotion: deepReasoner,
          rating: fastClassifier,
          roi: fastClassifier,
          coverage: deepReasoner,
          vfx: fastClassifier,
          trope: fastClassifier,
        },
      };
    }

    case 'budget': {
      // Zero/near-zero cost: Groq (free) + DeepSeek (cheapest paid)
      const freeProvider: ProviderChoice = env.GROQ_API_KEY ? 'groq' : defaultProvider;
      const cheapProvider: ProviderChoice = env.DEEPSEEK_API_KEY ? 'deepseek' : freeProvider;
      return {
        name: 'budget',
        engineProviders: {
          beatSheet: freeProvider,
          emotion: freeProvider,
          rating: cheapProvider,
          roi: cheapProvider,
          coverage: freeProvider,
          vfx: freeProvider,
          trope: freeProvider,
        },
      };
    }

    case 'premium': {
      // Highest quality: Claude Sonnet 4.6 for creative, Gemini for classification
      const premiumCreative: ProviderChoice = env.ANTHROPIC_API_KEY ? 'anthropic' : defaultProvider;
      const premiumClassifier: ProviderChoice = env.GEMINI_API_KEY ? 'gemini' : defaultProvider;
      return {
        name: 'premium',
        engineProviders: {
          beatSheet: premiumCreative,
          emotion: premiumCreative,
          rating: premiumClassifier,
          roi: premiumCreative,
          coverage: premiumCreative,
          vfx: premiumClassifier,
          trope: premiumCreative,
        },
      };
    }

    case 'long-context': {
      // Ultra-long scripts: Gemini 1.5 Pro (2M context) for creative engines
      const longCtx: ProviderChoice = env.GEMINI_API_KEY ? 'gemini-long' : defaultProvider;
      const standard: ProviderChoice = env.GEMINI_API_KEY ? 'gemini' : defaultProvider;
      const reasoning: ProviderChoice = env.DEEPSEEK_API_KEY ? 'deepseek' : standard;
      return {
        name: 'long-context',
        engineProviders: {
          beatSheet: longCtx,
          emotion: longCtx,
          rating: standard,
          roi: reasoning,
          coverage: longCtx,
          vfx: standard,
          trope: env.ANTHROPIC_API_KEY ? 'anthropic' : standard,
        },
      };
    }

    case 'custom':
      return {
        name: 'custom',
        engineProviders: {
          beatSheet: custom?.beatSheet || defaultProvider,
          emotion: custom?.emotion || defaultProvider,
          rating: custom?.rating || defaultProvider,
          roi: custom?.roi || defaultProvider,
          coverage: custom?.coverage || defaultProvider,
          vfx: custom?.vfx || defaultProvider,
          trope: custom?.trope || defaultProvider,
        },
      };

    case 'auto':
    default:
      return {
        name: 'auto',
        engineProviders: {
          beatSheet: defaultProvider,
          emotion: defaultProvider,
          rating: defaultProvider,
          roi: defaultProvider,
          coverage: defaultProvider,
          vfx: defaultProvider,
          trope: defaultProvider,
        },
      };
  }
}
