export interface LocationBreakdown {
  name: string;
  setting: 'INT' | 'EXT' | 'INT/EXT';
  time: string;
  sceneNumbers: number[];
  frequency: number;
}

export interface CastBreakdown {
  name: string;
  role: string;
  sceneNumbers: number[];
  totalScenes: number;
}

export type VFXTier = 'none' | 'simple' | 'moderate' | 'complex';

export interface VFXRequirement {
  sceneNumber: number;
  description: string;
  tier: VFXTier;
  estimatedHours: number;
}

export interface BudgetEstimate {
  low: number;
  likely: number;
  high: number;
  breakdown: {
    cast: number;
    locations: number;
    vfx: number;
    crew: number;
    postProduction: number;
  };
}

export interface ProductionBreakdown {
  scriptId: string;
  locations: LocationBreakdown[];
  uniqueLocationCount: number;
  intExtRatio: { int: number; ext: number };
  cast: CastBreakdown[];
  totalSpeakingRoles: number;
  estimatedShootingDays: number;
  vfxRequirements: VFXRequirement[];
  vfxComplexityScore: number;
  budgetEstimate: BudgetEstimate;
}
