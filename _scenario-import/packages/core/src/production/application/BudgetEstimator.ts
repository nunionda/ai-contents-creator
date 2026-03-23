import type { MarketLocale } from '../../shared/MarketConfig';
import { getMarketConfig } from '../../shared/MarketConfig';
import type { LocationBreakdown, CastBreakdown, VFXRequirement, BudgetEstimate } from '../domain/ProductionBreakdown';

export class BudgetEstimator {
  estimate(
    locations: LocationBreakdown[],
    cast: CastBreakdown[],
    vfxRequirements: VFXRequirement[],
    shootingDays: number,
    market: MarketLocale = 'hollywood',
  ): BudgetEstimate {
    const prod = getMarketConfig(market).production;

    const locationCost = locations.reduce((sum, loc) => {
      const rate = loc.setting === 'EXT' ? prod.locationCostPerDay.EXT : prod.locationCostPerDay.INT;
      return sum + rate * loc.frequency;
    }, 0);

    const castCost = cast.reduce((sum, c) => {
      return sum + (prod.castCost[c.role] || prod.castCost.Minor || 0);
    }, 0);

    const vfxHours = vfxRequirements.reduce((sum, r) => sum + r.estimatedHours, 0);
    const vfxCost = vfxHours * prod.vfxCostPerHour;

    const crewCost = Math.round(shootingDays * prod.crewCostPerDay * prod.fringeMultiplier);

    const postProduction = shootingDays * prod.postProductionPerDay;

    const likely = locationCost + castCost + vfxCost + crewCost + postProduction;

    return {
      low: Math.round(likely * 0.8),
      likely: Math.round(likely),
      high: Math.round(likely * 1.3),
      breakdown: {
        cast: castCost,
        locations: locationCost,
        vfx: vfxCost,
        crew: crewCost,
        postProduction,
      },
    };
  }
}
