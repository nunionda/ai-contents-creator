import type { ScriptElement } from '../../script/infrastructure/parser';
import type { MarketLocale } from '../../shared/MarketConfig';
import type { VFXRequirement, VFXTier } from '../domain/ProductionBreakdown';

// ─── VFX Keywords (EN + KO) ───

const VFX_KEYWORDS_EN = [
  'explosion', 'explode', 'crash', 'flying', 'flies',
  'transform', 'alien', 'creature', 'underwater', 'space',
  'destroy', 'destruction', 'hologram', 'fire', 'flood',
  'earthquake', 'monster', 'dragon', 'magic', 'laser',
  'portal', 'teleport', 'spaceship', 'robot', 'cyborg',
  'superhero', 'morph', 'invisible', 'vanish', 'levitate',
  'hurricane', 'meteor', 'collapse', 'shatter',
  'ghost', 'spirit', 'glow', 'beam', 'force field',
  // Horror/atmospheric
  'blood pool', 'blood drip', 'flickering', 'apparition',
  'supernatural', 'phantom', 'specter',
];

const VFX_KEYWORDS_KO = [
  '폭발', '충돌', '날아오르', '변신', '외계인', '괴물',
  '수중', '우주선', '파괴하', '홀로그램', '불길', '화염', '불꽃', '홍수',
  '지진', '마법', '레이저', '포탈', '순간이동',
  '로봇', '슈퍼히어로', '투명인간', '떠오르',
  '태풍', '운석', '산산조각',
  // Horror/supernatural VFX (distinctive, not overly common)
  '핏물', '소용돌이', '시체',
  '혈관이', '혈관이 번져',
  '촛불', '귀신',
  '빙의', '접신', '퇴마',
  '환영', '환각',
  // Crime/action VFX
  '총격', '폭파', '추락하',
];

// ─── False Positive Exclusion Patterns ───
// 특정 키워드가 비유적/문맥상 VFX가 아닌 경우 제외

const FALSE_POSITIVE_PATTERNS: Array<{ keyword: string; excludeIf: RegExp }> = [
  // '비행' → '비행기' (airplane)는 VFX 아님
  { keyword: '비행', excludeIf: /비행기/ },
  // '유령' → '유령처럼/유령같은' (비유)는 VFX 아님
  { keyword: '유령', excludeIf: /유령처럼|유령같은|유령 같은|유령인 듯/ },
  // 'tornado' → 'Tornado Cash' (브랜드명)는 VFX 아님
  { keyword: 'tornado', excludeIf: /tornado cash/i },
  // '붕괴' → '서버 붕괴', '시스템 붕괴' (디지털)는 VFX 아님
  { keyword: '붕괴', excludeIf: /서버.*붕괴|시스템.*붕괴|붕괴.*서버/ },
  // '파괴' → 비유적 사용 ('파괴된 근육', '파괴된 관계') 제외
  { keyword: '파괴하', excludeIf: /파괴된 근육|파괴된 관계|파괴된 마음|자기 파괴/ },
  // '방패' → 비유적 사용 ('방패다', '방패가 되') 제외
  { keyword: '방패', excludeIf: /방패다|방패가 되|방패처럼/ },
  // '폭풍' → 비유적 ('폭풍이 방을 휩쓴다' = 비유적 표현이지만, 폭발 맥락이면 OK)
  { keyword: '폭풍', excludeIf: /폭풍처럼|폭풍같은|폭풍 같은/ },
  // ghost → metaphorical uses
  { keyword: 'ghost', excludeIf: /ghost town|ghosting|ghostwriter/i },
  // 'fly' → too generic; use 'flying'/'flies' instead
  { keyword: 'fly', excludeIf: /fly\b/ },
];

// ─── Keyword → Tier Mapping ───

const VFX_TIER_MAP: Record<string, VFXTier> = {
  // Complex (80-200hrs): large-scale simulation, creature work
  creature: 'complex', dragon: 'complex', monster: 'complex',
  alien: 'complex', flood: 'complex', earthquake: 'complex',
  hurricane: 'complex', meteor: 'complex',
  spaceship: 'complex', cyborg: 'complex', morph: 'complex',
  transform: 'complex',
  '변신': 'complex', '괴물': 'complex', '외계인': 'complex',
  '홍수': 'complex', '지진': 'complex', '우주선': 'complex',
  '태풍': 'complex', '운석': 'complex',

  // Moderate (40-80hrs): 3D assets, environment extension, heavy practical FX
  explosion: 'moderate', explode: 'moderate',
  destroy: 'moderate', destruction: 'moderate', collapse: 'moderate',
  fire: 'moderate', hologram: 'moderate', portal: 'moderate',
  teleport: 'moderate', 'force field': 'moderate',
  robot: 'moderate', superhero: 'moderate', magic: 'moderate',
  supernatural: 'moderate', apparition: 'moderate',
  '폭발': 'moderate', '파괴하': 'moderate',
  '홀로그램': 'moderate', '포탈': 'moderate', '마법': 'moderate',
  '로봇': 'moderate', '슈퍼히어로': 'moderate', '순간이동': 'moderate',
  '불길': 'moderate', '화염': 'moderate',
  '소용돌이': 'moderate',
  '혈관': 'moderate',     // CG/prosthetics for visible veins
  '빙의': 'moderate',     // possession effects
  '접신': 'moderate',
  '퇴마': 'moderate',     // exorcism effects
  '환영': 'moderate',     // vision/hallucination
  '환각': 'moderate',
  '폭파': 'moderate',     // demolition
  '총격': 'moderate',     // gunfire muzzle flash + impact

  // Simple (20-40hrs): compositing, wire removal, atmospheric
  flying: 'simple', flies: 'simple',
  crash: 'simple', shatter: 'simple', ghost: 'simple',
  spirit: 'simple', glow: 'simple', beam: 'simple',
  invisible: 'simple', vanish: 'simple', levitate: 'simple',
  laser: 'simple', space: 'simple', underwater: 'simple',
  'blood pool': 'simple', 'blood drip': 'simple',
  flickering: 'simple', phantom: 'simple', specter: 'simple',
  '날아오르': 'simple', '충돌': 'simple',
  '불꽃': 'simple',
  '투명인간': 'simple', '떠오르': 'simple',
  '레이저': 'simple', '수중': 'simple',
  '산산조각': 'simple',
  '핏물': 'simple',       // blood in water/on surface
  '시체': 'simple',       // prosthetic/practical FX
  '촛불': 'simple',       // practical candle effects
  '귀신': 'simple',       // ghost practical+compositing
  '추락하': 'simple',     // fall stunt
};

// ─── Tier Modifiers ───

const AMPLIFIERS = [
  'massive', 'huge', 'giant', 'enormous', 'army of', 'hundreds', 'thousands',
  'full-scale', 'large-scale', 'epic', 'catastrophic', 'overwhelming',
  '거대한', '대규모', '수백', '수천', '엄청난', '대형', '전면적',
];

const DIMINISHERS = [
  'small', 'brief', 'slight', 'tiny', 'subtle', 'faint', 'minor', 'quick',
  '작은', '잠깐', '살짝', '미세한', '약간', '희미한',
];

const TIER_HOURS: Record<VFXTier, number> = {
  none: 0,
  simple: 30,
  moderate: 60,
  complex: 140,
};

const TIER_ORDER: VFXTier[] = ['none', 'simple', 'moderate', 'complex'];

function tierIndex(tier: VFXTier): number {
  return TIER_ORDER.indexOf(tier);
}

function higherTier(a: VFXTier, b: VFXTier): VFXTier {
  return tierIndex(a) >= tierIndex(b) ? a : b;
}

function upgradeTier(tier: VFXTier): VFXTier {
  const idx = tierIndex(tier);
  return idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1]! : tier;
}

function downgradeTier(tier: VFXTier): VFXTier {
  const idx = tierIndex(tier);
  return idx > 0 ? TIER_ORDER[idx - 1]! : tier;
}

// ─── False Positive Check ───

function isFalsePositive(text: string, keyword: string): boolean {
  const lower = text.toLowerCase();
  for (const fp of FALSE_POSITIVE_PATTERNS) {
    if (keyword === fp.keyword && fp.excludeIf.test(lower)) {
      return true;
    }
  }
  return false;
}

// ─── Deterministic VFX Tier Classification ───

function classifyActionLine(text: string, keywords: string[]): { tier: VFXTier; hours: number } {
  const lower = text.toLowerCase();

  // Find the highest tier among matched keywords (excluding false positives)
  let maxTier: VFXTier = 'none';
  for (const kw of keywords) {
    if (lower.includes(kw) && VFX_TIER_MAP[kw] && !isFalsePositive(text, kw)) {
      maxTier = higherTier(maxTier, VFX_TIER_MAP[kw]!);
    }
  }

  if (maxTier === 'none') {
    return { tier: 'none', hours: 0 };
  }

  // Apply amplifier/diminisher modifiers
  if (AMPLIFIERS.some(a => lower.includes(a))) {
    maxTier = upgradeTier(maxTier);
  }
  if (DIMINISHERS.some(d => lower.includes(d))) {
    maxTier = downgradeTier(maxTier);
  }

  return { tier: maxTier, hours: TIER_HOURS[maxTier] };
}

// ─── Public API (no LLM dependency) ───

export class VFXEstimator {
  estimate(scriptId: string, elements: ScriptElement[], market: MarketLocale = 'hollywood'): {
    requirements: VFXRequirement[];
    complexityScore: number;
  } {
    const keywords = [...VFX_KEYWORDS_EN, ...(market === 'korean' ? VFX_KEYWORDS_KO : [])];
    let currentScene = 0;
    const requirements: VFXRequirement[] = [];
    const MAX_VFX_PER_SCENE = 5; // prevent over-counting atmospheric effects
    let sceneVfxCount = 0;

    for (const el of elements) {
      if (el.type === 'scene_heading') {
        currentScene++;
        sceneVfxCount = 0;
        continue;
      }
      if (el.type === 'action' && sceneVfxCount < MAX_VFX_PER_SCENE) {
        const lower = el.text.toLowerCase();
        if (keywords.some(kw => lower.includes(kw))) {
          const { tier, hours } = classifyActionLine(el.text, keywords);
          if (tier !== 'none') {
            requirements.push({
              sceneNumber: currentScene || 1,
              description: el.text.slice(0, 200),
              tier,
              estimatedHours: hours,
            });
            sceneVfxCount++;
          }
        }
      }
    }

    // Compute complexity score
    const sceneCount = elements.filter(e => e.type === 'scene_heading').length || 1;
    const tierWeights: Record<VFXTier, number> = { none: 0, simple: 1, moderate: 3, complex: 5 };
    const weightedSum = requirements.reduce((s, r) => s + (tierWeights[r.tier] || 0), 0);
    const complexityScore = Math.min(100, Math.round((weightedSum / sceneCount) * 20));

    return { requirements, complexityScore };
  }
}
