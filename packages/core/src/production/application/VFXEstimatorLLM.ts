import type { ILLMProvider } from '../../creative/infrastructure/llm/ILLMProvider';
import type { ScriptElement } from '../../script/infrastructure/parser';
import type { MarketLocale } from '../../shared/MarketConfig';
import type { VFXRequirement, VFXTier } from '../domain/ProductionBreakdown';

const VFX_KEYWORDS_EN = [
  'explosion', 'explode', 'crash', 'fly', 'flying', 'flies',
  'transform', 'alien', 'creature', 'underwater', 'space',
  'destroy', 'destruction', 'hologram', 'fire', 'flood',
  'earthquake', 'monster', 'dragon', 'magic', 'laser',
  'portal', 'teleport', 'spaceship', 'robot', 'cyborg',
  'superhero', 'morph', 'invisible', 'vanish', 'levitate',
  'tornado', 'hurricane', 'meteor', 'collapse', 'shatter',
  'ghost', 'spirit', 'glow', 'beam', 'shield', 'force field',
];

const VFX_KEYWORDS_KO = [
  '폭발', '충돌', '비행', '날아', '변신', '외계인', '괴물',
  '수중', '우주', '파괴', '홀로그램', '불', '홍수',
  '지진', '용', '마법', '레이저', '포탈', '순간이동',
  '우주선', '로봇', '슈퍼', '투명', '사라지', '떠오르',
  '태풍', '폭풍', '운석', '붕괴', '산산조각',
  '귀신', '유령', '빛', '방패', '결계',
];

const TIER_HOURS: Record<VFXTier, number> = {
  none: 0,
  simple: 30,
  moderate: 60,
  complex: 140,
};

export class VFXEstimatorLLM {
  constructor(private readonly llm: ILLMProvider) {}

  async estimate(scriptId: string, elements: ScriptElement[], market: MarketLocale = 'hollywood'): Promise<{
    requirements: VFXRequirement[];
    complexityScore: number;
  }> {
    // 1. Filter action lines with VFX keywords
    const keywords = [...VFX_KEYWORDS_EN, ...(market === 'korean' ? VFX_KEYWORDS_KO : [])];
    let currentScene = 0;
    const candidates: { sceneNumber: number; text: string }[] = [];

    for (const el of elements) {
      if (el.type === 'scene_heading') {
        currentScene++;
        continue;
      }
      if (el.type === 'action') {
        const lower = el.text.toLowerCase();
        if (keywords.some(kw => lower.includes(kw))) {
          candidates.push({ sceneNumber: currentScene || 1, text: el.text });
        }
      }
    }

    if (candidates.length === 0) {
      return { requirements: [], complexityScore: 0 };
    }

    // 2. LLM classification
    const candidateList = candidates.slice(0, 30).map((c, i) =>
      `${i + 1}. [Scene ${c.sceneNumber}] ${c.text.slice(0, 200)}`
    ).join('\n');

    const systemPrompt = `You are a VFX Supervisor analyzing screenplay action lines for visual effects requirements.

For each action line, classify the VFX tier:
- "none": No VFX needed (practical effects or no special effects)
- "simple": Wire removal, simple compositing, color correction (20-40 hours/shot)
- "moderate": 3D assets, integrated FX, tracking, environment extension (40-80 hours/shot)
- "complex": Fluid simulation, large-scale environments, creature work, full CG sequences (80-200 hours/shot)

CRITICAL: Output ONLY raw JSON array matching this format:
[
  { "index": 1, "tier": "moderate", "hours": 60 },
  { "index": 2, "tier": "simple", "hours": 30 }
]`;

    const userPrompt = `Classify these action lines:\n${candidateList}`;

    const response = await this.llm.generateText(systemPrompt, userPrompt);

    let requirements: VFXRequirement[];
    try {
      const match = response.content.match(/\[[\s\S]*\]/);
      const parsed: { index: number; tier: VFXTier; hours: number }[] =
        JSON.parse(match ? match[0] : '[]');

      requirements = parsed
        .filter(p => p.tier !== 'none' && candidates[p.index - 1])
        .map(p => {
          const c = candidates[p.index - 1]!;
          const tier = (['simple', 'moderate', 'complex'].includes(p.tier) ? p.tier : 'simple') as VFXTier;
          return {
            sceneNumber: c.sceneNumber,
            description: c.text.slice(0, 200),
            tier,
            estimatedHours: p.hours || TIER_HOURS[tier],
          };
        });
    } catch {
      // Fallback: assign tiers based on keyword intensity
      requirements = candidates.map(c => ({
        sceneNumber: c.sceneNumber,
        description: c.text.slice(0, 200),
        tier: 'simple' as VFXTier,
        estimatedHours: TIER_HOURS.simple,
      }));
    }

    // 3. Compute complexity score
    const sceneCount = elements.filter(e => e.type === 'scene_heading').length || 1;
    const tierWeights: Record<VFXTier, number> = { none: 0, simple: 1, moderate: 3, complex: 5 };
    const weightedSum = requirements.reduce((s, r) =>
      s + (tierWeights[r.tier] || 0), 0);
    const complexityScore = Math.min(100, Math.round((weightedSum / sceneCount) * 20));

    return { requirements, complexityScore };
  }
}
