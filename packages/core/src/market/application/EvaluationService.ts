import type { BoxOfficeData } from "../domain/BoxOfficeData";
import type { MarketLocale } from "../../shared/MarketConfig";
import { getMarketConfig } from "../../shared/MarketConfig";

export interface EvaluationResult {
  roiPercentage: number;
  netProfit: number;
  isHit: boolean;
  message: string;
}

export class EvaluationService {
  /**
   * Calculates Return on Investment (ROI) and classifies the financial success.
   * Uses market-specific break-even multiplier (Hollywood 2.5x, Korean 2.0x).
   */
  public evaluateROI(data: BoxOfficeData, market: MarketLocale = 'hollywood'): EvaluationResult {
    if (data.budget <= 0) {
      throw new Error(`Cannot evaluate ROI: Invalid/zero budget for movie "${data.title}"`);
    }

    const config = getMarketConfig(market);
    const { tiers } = config.roi;

    const netProfit = data.revenue - data.budget;
    const roiPercentage = (netProfit / data.budget) * 100;

    const breakEvenPoint = data.budget * config.roi.breakEvenMultiplier;
    const isHit = data.revenue >= breakEvenPoint;

    let message = `Flop (Failed to reach ${config.roi.breakEvenMultiplier}x break-even multiplier)`;
    if (isHit) {
      message = data.revenue >= data.budget * tiers.blockbuster.min ? `Blockbuster (${tiers.blockbuster.min}x+ return)` : "Hit (Profitable)";
    } else if (data.revenue >= data.budget) {
      message = "Underperformed (Made production budget back, but lost on marketing)";
    }

    return {
      roiPercentage,
      netProfit,
      isHit,
      message
    };
  }
}
