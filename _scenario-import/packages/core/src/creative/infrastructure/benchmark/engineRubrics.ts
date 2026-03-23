import type { EngineRubric } from './ProviderBenchmark';

/** Check if object has all required keys */
function hasKeys(obj: any, keys: string[]): number {
  if (!obj || typeof obj !== 'object') return 0;
  const present = keys.filter(k => obj[k] !== undefined && obj[k] !== null);
  return Math.round((present.length / keys.length) * 100);
}

export const ENGINE_RUBRICS: EngineRubric[] = [
  {
    engine: 'beatSheet',
    scoreStructure: (parsed) => {
      if (!parsed?.beats || !Array.isArray(parsed.beats)) return 0;
      if (parsed.beats.length === 0) return 10;
      const beatKeys = ['act', 'name', 'sceneStart', 'sceneEnd', 'description'];
      const scores = parsed.beats.map((b: any) => hasKeys(b, beatKeys));
      return Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
    },
    scoreContent: (parsed, sceneCount) => {
      if (!parsed?.beats?.length) return 0;
      let score = 50; // base
      // Has reasonable number of beats (5-60)
      if (parsed.beats.length >= 5 && parsed.beats.length <= 60) score += 20;
      // Covers all 3 acts
      const acts = new Set(parsed.beats.map((b: any) => b.act));
      if (acts.has(1) && acts.has(2) && acts.has(3)) score += 20;
      // Scene range covers most of the script
      const maxScene = Math.max(...parsed.beats.map((b: any) => b.sceneEnd || 0));
      if (maxScene >= sceneCount * 0.7) score += 10;
      return Math.min(100, score);
    },
  },
  {
    engine: 'emotion',
    scoreStructure: (parsed) => {
      if (!parsed?.scenes || !Array.isArray(parsed.scenes)) return 0;
      if (parsed.scenes.length === 0) return 10;
      const sceneKeys = ['sceneNumber', 'score', 'dominantEmotion', 'explanation'];
      const scores = parsed.scenes.map((s: any) => hasKeys(s, sceneKeys));
      return Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
    },
    scoreContent: (parsed, sceneCount) => {
      if (!parsed?.scenes?.length) return 0;
      let score = 40;
      // Scene count matches script
      if (parsed.scenes.length >= sceneCount * 0.8) score += 25;
      // Scores are in valid range (-10 to +10)
      const validScores = parsed.scenes.filter((s: any) => s.score >= -10 && s.score <= 10);
      if (validScores.length === parsed.scenes.length) score += 15;
      // Has variety in emotions (not all same)
      const emotions = new Set(parsed.scenes.map((s: any) => s.dominantEmotion));
      if (emotions.size >= 3) score += 10;
      // Has explanations with substance (not template)
      const uniqueExplanations = new Set(parsed.scenes.map((s: any) => s.explanation));
      if (uniqueExplanations.size >= parsed.scenes.length * 0.5) score += 10;
      return Math.min(100, score);
    },
  },
  {
    engine: 'coverage',
    scoreStructure: (parsed) => {
      const keys = ['title', 'genre', 'logline', 'synopsis', 'categories', 'overallScore', 'verdict', 'strengths', 'weaknesses', 'recommendation'];
      return hasKeys(parsed, keys);
    },
    scoreContent: (parsed) => {
      if (!parsed) return 0;
      let score = 30;
      if (parsed.overallScore >= 0 && parsed.overallScore <= 100) score += 15;
      if (['Pass', 'Consider', 'Recommend'].includes(parsed.verdict)) score += 15;
      if (parsed.strengths?.length >= 2) score += 10;
      if (parsed.weaknesses?.length >= 2) score += 10;
      if (parsed.logline?.length >= 20) score += 10;
      if (parsed.categories?.length >= 3) score += 10;
      return Math.min(100, score);
    },
  },
  {
    engine: 'rating',
    scoreStructure: (parsed) => hasKeys(parsed, ['rating', 'reasons', 'confidence']),
    scoreContent: (parsed) => {
      if (!parsed) return 0;
      let score = 30;
      if (['G', 'PG', 'PG-13', 'R', 'NC-17', 'ALL', '12+', '15+', '19+', 'RESTRICTED'].includes(parsed.rating)) score += 30;
      if (parsed.reasons?.length >= 1) score += 20;
      if (parsed.confidence >= 0 && parsed.confidence <= 1) score += 20;
      return Math.min(100, score);
    },
  },
  {
    engine: 'roi',
    scoreStructure: (parsed) => hasKeys(parsed, ['tier', 'predictedMultiplier', 'confidence', 'reasoning']),
    scoreContent: (parsed) => {
      if (!parsed) return 0;
      let score = 30;
      if (['Flop', 'Break-even', 'Hit', 'Blockbuster'].includes(parsed.tier)) score += 25;
      if (parsed.predictedMultiplier > 0 && parsed.predictedMultiplier < 50) score += 20;
      if (parsed.reasoning?.length >= 20) score += 15;
      if (parsed.confidence >= 0 && parsed.confidence <= 1) score += 10;
      return Math.min(100, score);
    },
  },
  {
    engine: 'trope',
    scoreStructure: (parsed) => {
      if (!Array.isArray(parsed)) return 0;
      return parsed.length > 0 ? 100 : 10;
    },
    scoreContent: (parsed) => {
      if (!Array.isArray(parsed)) return 0;
      let score = 30;
      if (parsed.length >= 3 && parsed.length <= 15) score += 30;
      if (parsed.every((t: any) => typeof t === 'string' && t.length > 2)) score += 20;
      // Check for unique tropes
      if (new Set(parsed).size === parsed.length) score += 20;
      return Math.min(100, score);
    },
  },
  {
    engine: 'vfx',
    scoreStructure: (parsed) => {
      if (!Array.isArray(parsed)) return 0;
      if (parsed.length === 0) return 10;
      return hasKeys(parsed[0], ['index', 'tier', 'hours']);
    },
    scoreContent: (parsed) => {
      if (!Array.isArray(parsed)) return 0;
      let score = 40;
      const validTiers = ['none', 'simple', 'moderate', 'complex'];
      const allValid = parsed.every((v: any) => validTiers.includes(v.tier));
      if (allValid) score += 30;
      if (parsed.every((v: any) => v.hours > 0)) score += 15;
      if (parsed.length >= 1) score += 15;
      return Math.min(100, score);
    },
  },
];
