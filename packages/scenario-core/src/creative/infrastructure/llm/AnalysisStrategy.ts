export type AnalysisStrategyName = 'auto' | 'fast' | 'deep' | 'custom' | 'budget' | 'premium' | 'long-context';

export type EngineName = 'beatSheet' | 'emotion' | 'rating' | 'roi' | 'coverage' | 'vfx' | 'trope';

export type ProviderChoice = 'gemini' | 'gemini-pro' | 'gemini-long' | 'anthropic' | 'openai' | 'deepseek' | 'groq' | 'mock';

export interface AnalysisStrategy {
  name: AnalysisStrategyName;
  engineProviders: Record<EngineName, ProviderChoice>;
}

export interface CustomStrategyInput {
  beatSheet?: ProviderChoice;
  emotion?: ProviderChoice;
  rating?: ProviderChoice;
  roi?: ProviderChoice;
  coverage?: ProviderChoice;
  vfx?: ProviderChoice;
  trope?: ProviderChoice;
}
