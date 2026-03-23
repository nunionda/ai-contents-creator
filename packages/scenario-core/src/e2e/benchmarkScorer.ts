import type { EngineName, ProviderChoice } from '../creative/infrastructure/llm/AnalysisStrategy';
import { ENGINE_RUBRICS } from '../creative/infrastructure/benchmark/engineRubrics';
import { validateAllEngines } from './validators';
import type { EngineScore } from './benchmarkTypes';
import { LLM_ENGINES } from './benchmarkTypes';

/** Map API response fields to the shape expected by engine rubrics */
function extractEngineData(response: any, engine: EngineName): any {
  switch (engine) {
    case 'beatSheet':
      return { beats: response.beatSheet || [] };
    case 'emotion':
      return { scenes: response.emotionGraph || [] };
    case 'rating':
      return response.predictions?.rating || {};
    case 'roi':
      return response.predictions?.roi || {};
    case 'coverage':
      return response.coverage || {};
    case 'vfx':
      return response.production?.vfxRequirements || [];
    case 'trope':
      return response.tropes || [];
    default:
      return {};
  }
}

/** Map engine name to validator engine label for matching */
function matchValidatorEngine(validatorEngine: string, engine: EngineName): boolean {
  const map: Record<EngineName, string[]> = {
    beatSheet: ['BeatSheet'],
    emotion: ['Emotion'],
    rating: ['Rating'],
    roi: ['BoxOffice'],
    coverage: ['Coverage'],
    vfx: ['VFX'],
    trope: ['Tropes'],
  };
  return (map[engine] || []).some(label =>
    validatorEngine.toLowerCase().includes(label.toLowerCase())
  );
}

/** Score a single pipeline run against all 7 LLM engines */
export function scoreProviderRun(
  response: any,
  intendedProvider: ProviderChoice,
): EngineScore[] {
  const validatorResults = validateAllEngines(response);
  const providers: Record<string, string> = response.providers || {};
  const sceneCount = response.emotionGraph?.length || response.summary?.sceneCount || 50;

  return LLM_ENGINES.map(engine => {
    const rubric = ENGINE_RUBRICS.find(r => r.engine === engine);
    const engineData = extractEngineData(response, engine);
    const validatorResult = validatorResults.find(v => matchValidatorEngine(v.engine, engine));

    const structuralScore = rubric ? rubric.scoreStructure(engineData) : 0;
    const contentScore = rubric ? rubric.scoreContent(engineData, sceneCount) : 0;
    const overallScore = Math.round(0.4 * structuralScore + 0.6 * contentScore);

    const actualProvider = providers[engine] || 'unknown';
    const fellBack = actualProvider !== intendedProvider && actualProvider !== 'unknown';

    return {
      engine,
      structuralScore,
      contentScore,
      overallScore,
      validatorVerdict: validatorResult?.verdict || 'FAIL',
      fellBack,
      actualProvider,
    };
  });
}
