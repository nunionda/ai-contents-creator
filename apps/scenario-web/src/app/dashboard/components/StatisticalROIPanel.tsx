'use client';

import React from 'react';
import {
  BarChart3,
  Brain,
  Calculator,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import './StatisticalROIPanel.css';

/* ─── Types ─── */

interface StatisticalRoi {
  predictedROI: number;
  predictedMultiplier: number;
  confidence: number;
  tier: string;
  revenueRange: { low: number; likely: number; high: number };
  neighbors: Array<{
    title: string;
    similarity: number;
    roi: number;
    revenue: number;
    budget: number;
  }>;
  modelType: string;
}

interface LlmRoi {
  tier: string;
  predictedMultiplier: number;
  confidence: number;
  reasoning: string;
}

interface StatisticalROIPanelProps {
  statisticalRoi?: StatisticalRoi;
  llmRoi?: LlmRoi;
  locale: 'en' | 'ko';
  market?: string;
}

/* ─── Helpers ─── */

function tierToClass(tier?: string): string {
  if (!tier) return 'default';
  const t = tier.toLowerCase();
  if (t.includes('blockbuster')) return 'blockbuster';
  if (t.includes('hit')) return 'hit';
  if (t.includes('moderate') || t.includes('average')) return 'moderate';
  if (t.includes('flop') || t.includes('bomb') || t.includes('low')) return 'flop';
  return 'default';
}

function formatRevenue(amount: number, market?: string): string {
  if (market === 'korean') {
    if (Math.abs(amount) >= 1e8) return `${(amount / 1e8).toFixed(1)}B KRW`;
    if (Math.abs(amount) >= 1e4) return `${(amount / 1e4).toFixed(0)}M KRW`;
    return `${amount.toLocaleString()} KRW`;
  }
  if (Math.abs(amount) >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
  if (Math.abs(amount) >= 1e6) return `$${(amount / 1e6).toFixed(0)}M`;
  if (Math.abs(amount) >= 1e3) return `$${(amount / 1e3).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

function formatRevenueCompact(amount: number, market?: string): string {
  if (market === 'korean') {
    if (Math.abs(amount) >= 1e8) return `${(amount / 1e8).toFixed(0)}억`;
    if (Math.abs(amount) >= 1e4) return `${(amount / 1e4).toFixed(0)}만`;
    return `${amount.toLocaleString()}`;
  }
  if (Math.abs(amount) >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
  if (Math.abs(amount) >= 1e6) return `$${(amount / 1e6).toFixed(0)}M`;
  if (Math.abs(amount) >= 1e3) return `$${(amount / 1e3).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

/* ─── Component ─── */

export default function StatisticalROIPanel({
  statisticalRoi,
  llmRoi,
  locale,
  market,
}: StatisticalROIPanelProps) {
  const ko = locale === 'ko';

  if (!statisticalRoi && !llmRoi) {
    return (
      <div className="stat-roi-panel">
        <div className="stat-roi-glass">
          <h3 className="stat-roi-title">
            <BarChart3 size={20} />
            {ko ? 'ROI 예측 비교' : 'ROI Prediction Comparison'}
          </h3>
          <div className="stat-roi-empty">
            {ko ? 'ROI 예측 데이터가 없습니다' : 'No ROI prediction data available'}
          </div>
        </div>
      </div>
    );
  }

  const tiersMatch =
    statisticalRoi && llmRoi
      ? statisticalRoi.tier.toLowerCase() === llmRoi.tier.toLowerCase()
      : false;

  const neighbors = statisticalRoi?.neighbors?.slice(0, 7) ?? [];

  /* Revenue range bar positions */
  let rangeBarStyle: React.CSSProperties = {};
  let likelyMarkerStyle: React.CSSProperties = {};
  if (statisticalRoi?.revenueRange) {
    const { low, likely, high } = statisticalRoi.revenueRange;
    const span = high - low || 1;
    const leftPct = 5;
    const rightPct = 95;
    const fullRange = rightPct - leftPct;
    const likelyPct = leftPct + ((likely - low) / span) * fullRange;

    rangeBarStyle = {
      left: `${leftPct}%`,
      width: `${fullRange}%`,
    };
    likelyMarkerStyle = {
      left: `${likelyPct}%`,
    };
  }

  return (
    <div className="stat-roi-panel">
      <div className="stat-roi-glass">
        {/* Header */}
        <h3 className="stat-roi-title">
          <BarChart3 size={20} />
          {ko ? 'ROI 예측 비교' : 'ROI Prediction Comparison'}
        </h3>

        {/* Consensus Indicator */}
        {statisticalRoi && llmRoi && (
          <div className={`stat-roi-consensus ${tiersMatch ? 'agree' : 'diverge'}`}>
            {tiersMatch ? (
              <>
                <CheckCircle size={16} />
                {ko ? '모델 합의: 두 모델 동일 예측' : 'Models Agree: Both predict same tier'}
              </>
            ) : (
              <>
                <AlertTriangle size={16} />
                {ko
                  ? `모델 불일치: AI "${llmRoi.tier}" vs 통계 "${statisticalRoi.tier}"`
                  : `Models Diverge: AI "${llmRoi.tier}" vs Statistical "${statisticalRoi.tier}"`}
              </>
            )}
          </div>
        )}

        {/* Side-by-Side Comparison */}
        <div className="stat-roi-comparison">
          {/* AI / LLM Prediction */}
          {llmRoi && (
            <div className="stat-roi-model-card">
              <div className="stat-roi-model-header">
                <Brain size={16} style={{ color: 'var(--accent-blue)' }} />
                <span className="stat-roi-model-label ai">
                  {ko ? 'AI 예측' : 'AI Prediction'}
                </span>
              </div>

              <span className={`stat-roi-tier-badge ${tierToClass(llmRoi.tier)}`}>
                {llmRoi.tier}
              </span>

              <div>
                <span className="stat-roi-multiplier">
                  {llmRoi.predictedMultiplier}x
                </span>
                <span className="stat-roi-multiplier-suffix">
                  {ko ? '배수' : 'multiplier'}
                </span>
              </div>

              <div className="stat-roi-confidence">
                <div className="stat-roi-confidence-header">
                  <span className="stat-roi-confidence-label">
                    {ko ? '신뢰도' : 'Confidence'}
                  </span>
                  <span className="stat-roi-confidence-value">
                    {Math.round(llmRoi.confidence * 100)}%
                  </span>
                </div>
                <div className="stat-roi-confidence-track">
                  <div
                    className="stat-roi-confidence-fill ai"
                    style={{ width: `${Math.round(llmRoi.confidence * 100)}%` }}
                  />
                </div>
              </div>

              {llmRoi.reasoning && (
                <p className="stat-roi-reasoning">{llmRoi.reasoning}</p>
              )}
            </div>
          )}

          {/* Statistical k-NN Model */}
          {statisticalRoi && (
            <div className="stat-roi-model-card">
              <div className="stat-roi-model-header">
                <Calculator size={16} style={{ color: 'var(--accent-gold)' }} />
                <span className="stat-roi-model-label statistical">
                  {ko ? '통계 모델' : 'Statistical Model'}
                </span>
                {statisticalRoi.modelType && (
                  <span className="stat-roi-model-type-badge">
                    {statisticalRoi.modelType}
                  </span>
                )}
              </div>

              <span className={`stat-roi-tier-badge ${tierToClass(statisticalRoi.tier)}`}>
                {statisticalRoi.tier}
              </span>

              <div>
                <span className="stat-roi-multiplier">
                  {statisticalRoi.predictedMultiplier}x
                </span>
                <span className="stat-roi-multiplier-suffix">
                  {ko ? '배수' : 'multiplier'}
                </span>
              </div>

              <div className="stat-roi-confidence">
                <div className="stat-roi-confidence-header">
                  <span className="stat-roi-confidence-label">
                    {ko ? '신뢰도' : 'Confidence'}
                  </span>
                  <span className="stat-roi-confidence-value">
                    {Math.round(statisticalRoi.confidence * 100)}%
                  </span>
                </div>
                <div className="stat-roi-confidence-track">
                  <div
                    className="stat-roi-confidence-fill statistical"
                    style={{ width: `${Math.round(statisticalRoi.confidence * 100)}%` }}
                  />
                </div>
              </div>

              <div className="stat-roi-value-row">
                <span className="stat-roi-value-label">ROI</span>
                <span className="stat-roi-value-number">
                  {statisticalRoi.predictedROI > 0 ? '+' : ''}
                  {statisticalRoi.predictedROI.toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Revenue Range Visualization */}
        {statisticalRoi?.revenueRange && (
          <div className="stat-roi-revenue-section">
            <h4 className="stat-roi-section-title">
              <TrendingUp size={14} style={{ verticalAlign: 'middle', marginRight: '0.35rem' }} />
              {ko ? '예상 수익 범위' : 'Revenue Range Estimate'}
            </h4>

            <div className="stat-roi-revenue-bar-container">
              <div
                className="stat-roi-revenue-bar-range"
                style={rangeBarStyle}
              />
              <div
                className="stat-roi-revenue-bar-likely"
                style={likelyMarkerStyle}
              />
            </div>

            <div className="stat-roi-revenue-labels">
              <div className="stat-roi-revenue-label">
                <span className="stat-roi-revenue-label-type">
                  {ko ? '최저' : 'Low'}
                </span>
                <span className="stat-roi-revenue-label-value">
                  {formatRevenueCompact(statisticalRoi.revenueRange.low, market)}
                </span>
              </div>
              <div className="stat-roi-revenue-label likely">
                <span className="stat-roi-revenue-label-type">
                  {ko ? '예상' : 'Likely'}
                </span>
                <span className="stat-roi-revenue-label-value">
                  {formatRevenueCompact(statisticalRoi.revenueRange.likely, market)}
                </span>
              </div>
              <div className="stat-roi-revenue-label">
                <span className="stat-roi-revenue-label-type">
                  {ko ? '최고' : 'High'}
                </span>
                <span className="stat-roi-revenue-label-value">
                  {formatRevenueCompact(statisticalRoi.revenueRange.high, market)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* k-NN Neighbors Table */}
        {neighbors.length > 0 && (
          <div className="stat-roi-neighbors-section">
            <h4 className="stat-roi-section-title">
              {ko
                ? `유사 작품 (${neighbors.length})`
                : `Nearest Films (${neighbors.length})`}
            </h4>

            <table className="stat-roi-neighbors-table">
              <thead>
                <tr>
                  <th>{ko ? '작품' : 'Title'}</th>
                  <th>{ko ? '유사도' : 'Similarity'}</th>
                  <th>{ko ? '예산' : 'Budget'}</th>
                  <th>{ko ? '수익' : 'Revenue'}</th>
                  <th style={{ textAlign: 'right' }}>ROI</th>
                </tr>
              </thead>
              <tbody>
                {neighbors.map((n, idx) => (
                  <tr key={idx}>
                    <td className="stat-roi-neighbor-title" title={n.title}>
                      {n.title}
                    </td>
                    <td>
                      <span className="stat-roi-neighbor-similarity">
                        <span className="stat-roi-similarity-bar">
                          <span
                            className="stat-roi-similarity-fill"
                            style={{ width: `${Math.round(n.similarity * 100)}%` }}
                          />
                        </span>
                        <span style={{ fontSize: 'var(--font-size-xs)' }}>
                          {Math.round(n.similarity * 100)}%
                        </span>
                      </span>
                    </td>
                    <td>{formatRevenue(n.budget, market)}</td>
                    <td>{formatRevenue(n.revenue, market)}</td>
                    <td>
                      <span
                        className={`stat-roi-neighbor-roi ${
                          n.roi >= 0 ? 'positive' : 'negative'
                        }`}
                      >
                        {n.roi >= 0 ? '+' : ''}
                        {typeof n.roi === 'number' ? n.roi.toFixed(1) : n.roi}x
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
