/**
 * Utility functions for standardizing global box office currencies.
 */

import type { MarketLocale } from './MarketConfig';

/**
 * Basic formatter converting raw numbers to standard USD formatted string.
 */
export function formatToUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format KRW amounts with 억/만 suffixes for readability.
 * e.g., 15_000_000_000 → "₩150.0억", 50_000_000 → "₩5,000만"
 */
export function formatToKRW(amount: number): string {
  if (Math.abs(amount) >= 100_000_000) {
    return `₩${(amount / 100_000_000).toFixed(1)}억`;
  }
  if (Math.abs(amount) >= 10_000) {
    return `₩${new Intl.NumberFormat('ko-KR').format(Math.round(amount / 10_000))}만`;
  }
  return `₩${new Intl.NumberFormat('ko-KR').format(amount)}`;
}

/**
 * Format currency based on market locale.
 */
export function formatCurrency(amount: number, market: MarketLocale = 'hollywood'): string {
  return market === 'korean' ? formatToKRW(amount) : formatToUSD(amount);
}
