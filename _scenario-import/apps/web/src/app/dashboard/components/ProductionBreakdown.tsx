'use client';

import React from 'react';
import { Clapperboard, DollarSign, MapPin, Sparkles, Users } from 'lucide-react';

function formatBudget(amount: number, market: string): string {
  if (market === 'korean') {
    if (Math.abs(amount) >= 1e8) return `₩${(amount / 1e8).toFixed(1)}억`;
    if (Math.abs(amount) >= 1e4) return `₩${Math.round(amount / 1e4).toLocaleString('ko-KR')}만`;
    return `₩${amount.toLocaleString('ko-KR')}`;
  }
  return `$${(amount / 1e6).toFixed(1)}M`;
}

interface ProductionBreakdownProps {
  production: any;
  locale?: 'en' | 'ko';
  market?: 'hollywood' | 'korean';
}

export default function ProductionBreakdown({ production, locale = 'en', market = 'hollywood' }: ProductionBreakdownProps) {
  const ko = locale === 'ko';
  return (
    <div className="production-section">
      <div className="glass-panel production-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>
            <Clapperboard size={22} style={{ marginRight: '0.5rem', verticalAlign: 'middle', color: 'var(--accent-gold)' }} />
            {ko ? '제작 타당성' : 'Production Feasibility'}
          </h2>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div className="prod-stat-inline">
              <span className="detail-label">{ko ? '촬영 일수' : 'Shooting Days'}</span>
              <span style={{ fontWeight: 700, fontSize: '1.3rem' }}>{production.estimatedShootingDays}</span>
            </div>
            <div className="prod-stat-inline">
              <span className="detail-label">{ko ? '촬영지' : 'Locations'}</span>
              <span style={{ fontWeight: 700, fontSize: '1.3rem' }}>{production.uniqueLocationCount}</span>
            </div>
            <div className="prod-stat-inline">
              <span className="detail-label">{ko ? '대사 배역' : 'Speaking Roles'}</span>
              <span style={{ fontWeight: 700, fontSize: '1.3rem' }}>{production.totalSpeakingRoles}</span>
            </div>
            <div className="prod-stat-inline">
              <span className="detail-label">{ko ? 'VFX 점수' : 'VFX Score'}</span>
              <span style={{
                fontWeight: 700, fontSize: '1.3rem',
                color: production.vfxComplexityScore > 60 ? 'var(--color-danger)' : production.vfxComplexityScore > 30 ? 'var(--color-warning)' : 'var(--color-success)'
              }}>
                {production.vfxComplexityScore}/100
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="production-grid">
        {/* Budget Estimate */}
        {production.budgetEstimate && (
          <div className="glass-panel production-budget">
            <h3 style={{ margin: '0 0 1rem' }}>
              <DollarSign size={18} style={{ marginRight: '0.4rem', verticalAlign: 'middle', color: 'var(--color-success)' }} />
              {ko ? '예산 추정' : 'Budget Estimate'}
            </h3>
            <div className="budget-range">
              <div className="budget-range-bar">
                <div className="budget-marker budget-low" style={{ left: '0%' }}>
                  <span className="budget-value">{formatBudget(production.budgetEstimate.low, market)}</span>
                  <span className="budget-label-text">{ko ? '최소' : 'Low'}</span>
                </div>
                <div className="budget-marker budget-likely" style={{ left: '50%' }}>
                  <span className="budget-value">{formatBudget(production.budgetEstimate.likely, market)}</span>
                  <span className="budget-label-text">{ko ? '예상' : 'Likely'}</span>
                </div>
                <div className="budget-marker budget-high" style={{ left: '100%' }}>
                  <span className="budget-value">{formatBudget(production.budgetEstimate.high, market)}</span>
                  <span className="budget-label-text">{ko ? '최대' : 'High'}</span>
                </div>
              </div>
            </div>
            <div className="budget-breakdown">
              {Object.entries(production.budgetEstimate.breakdown).map(([key, val]: [string, any]) => (
                <div key={key} className="budget-item">
                  <span className="detail-label">{key}</span>
                  <span style={{ fontWeight: 600 }}>{formatBudget(val, market)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locations */}
        <div className="glass-panel production-locations">
          <h3 style={{ margin: '0 0 0.75rem' }}>
            <MapPin size={18} style={{ marginRight: '0.4rem', verticalAlign: 'middle', color: 'var(--accent-blue)' }} />
            {ko ? '촬영지' : 'Locations'}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginLeft: '0.5rem' }}>
              INT {production.intExtRatio?.int}% / EXT {production.intExtRatio?.ext}%
            </span>
          </h3>
          <div className="location-list">
            {production.locations?.slice(0, 10).map((loc: any, i: number) => (
              <div key={i} className="location-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className={`setting-badge setting-${loc.setting.replace('/', '')}`}>{loc.setting}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{loc.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{loc.time}</span>
                  <span className="freq-badge">{loc.frequency}x</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* VFX Requirements */}
        {production.vfxRequirements?.length > 0 && (
          <div className="glass-panel production-vfx">
            <h3 style={{ margin: '0 0 0.75rem' }}>
              <Sparkles size={18} style={{ marginRight: '0.4rem', verticalAlign: 'middle', color: 'var(--color-purple)' }} />
              {ko ? `VFX 요구사항 (${production.vfxRequirements.length}개)` : `VFX Requirements (${production.vfxRequirements.length} shots)`}
            </h3>
            <div className="vfx-list">
              {production.vfxRequirements.map((vfx: any, i: number) => (
                <div key={i} className="vfx-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{ko ? '장면' : 'Scene'} {vfx.sceneNumber}</span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span className={`vfx-tier vfx-${vfx.tier}`}>{vfx.tier}</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{vfx.estimatedHours}h</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0, whiteSpace: 'normal' }}>
                    {vfx.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cast Breakdown */}
        <div className="glass-panel production-cast">
          <h3 style={{ margin: '0 0 0.75rem' }}>
            <Users size={18} style={{ marginRight: '0.4rem', verticalAlign: 'middle', color: 'var(--accent-gold)' }} />
            {ko ? '캐스트 구성' : 'Cast Breakdown'}
          </h3>
          <div className="cast-heatmap">
            {production.cast?.slice(0, 12).map((c: any, i: number) => {
              const maxScenes = production.cast[0]?.totalScenes || 1;
              const pct = Math.round((c.totalScenes / maxScenes) * 100);
              return (
                <div key={i} className="cast-heat-row">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{ko ? (({ Protagonist: '주연', Antagonist: '악역', Supporting: '조연', Minor: '단역' } as Record<string, string>)[c.role] ?? c.role) : c.role} / {c.totalScenes} {ko ? '장면' : 'scenes'}</span>
                  </div>
                  <div className="category-bar">
                    <div className="category-bar-fill" style={{
                      width: `${pct}%`,
                      background: c.role === 'Protagonist' ? 'var(--accent-gold)' : c.role === 'Antagonist' ? 'var(--color-danger)' : c.role === 'Supporting' ? 'var(--accent-blue)' : 'var(--color-muted)',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
