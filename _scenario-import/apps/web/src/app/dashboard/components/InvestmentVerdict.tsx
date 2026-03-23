'use client';

import React from 'react';
import { Film, Users, TrendingUp, Activity, Target, DollarSign } from 'lucide-react';

interface InvestmentVerdictProps {
  data: any;
  locale?: 'en' | 'ko';
}

function verdictColor(verdict: string) {
  if (verdict === 'Recommend') return 'var(--color-success)';
  if (verdict === 'Consider') return 'var(--color-warning)';
  return 'var(--color-danger)';
}

function roiColor(tier: string) {
  if (tier === 'Blockbuster') return 'var(--color-success)';
  if (tier === 'Hit') return 'var(--accent-gold)';
  return 'var(--color-danger)';
}

export default function InvestmentVerdict({ data, locale = 'en' }: InvestmentVerdictProps) {
  const ko = locale === 'ko';
  const verdict = data.coverage?.verdict;
  const overallScore = data.coverage?.overallScore;
  const roi = data.predictions?.roi;
  const castCount = (data.characterNetwork?.characters ?? data.characterNetwork)?.length ?? 0;

  return (
    <div className="verdict-hero">
      {/* Top verdict row */}
      <div className="verdict-top-row">
        {/* Verdict badge */}
        {verdict && (
          <div className="verdict-badge-large" style={{ borderColor: verdictColor(verdict) }}>
            <Target size={28} style={{ color: verdictColor(verdict) }} />
            <div className="verdict-badge-text">
              <span className="verdict-badge-label">{ko ? '투자 판정' : 'Investment Verdict'}</span>
              <span className="verdict-badge-value" style={{ color: verdictColor(verdict) }}>
                {verdict === 'Recommend' ? (ko ? '투자 추천' : 'RECOMMEND') :
                 verdict === 'Consider' ? (ko ? '검토 필요' : 'CONSIDER') :
                 (ko ? '투자 부적합' : 'PASS')}
              </span>
            </div>
          </div>
        )}

        {/* Score ring */}
        {overallScore != null && (
          <div className="verdict-score-ring">
            <svg viewBox="0 0 120 120" className="score-ring-svg">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="52"
                fill="none"
                stroke={verdictColor(verdict || 'Pass')}
                strokeWidth="8"
                strokeDasharray={`${(overallScore / 100) * 327} 327`}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dasharray 1s ease' }}
              />
            </svg>
            <div className="score-ring-inner">
              <span className="score-ring-value">{overallScore}</span>
              <span className="score-ring-label">/100</span>
            </div>
          </div>
        )}

        {/* ROI tier */}
        {roi && (
          <div className="verdict-roi-badge" style={{ borderColor: roiColor(roi.tier) }}>
            <DollarSign size={28} style={{ color: roiColor(roi.tier) }} />
            <div className="verdict-badge-text">
              <span className="verdict-badge-label">{ko ? 'ROI 등급' : 'ROI Tier'}</span>
              <span className="verdict-badge-value" style={{ color: roiColor(roi.tier) }}>
                {roi.tier.toUpperCase()}
              </span>
              {roi.predictedMultiplier && (
                <span className="verdict-multiplier">{roi.predictedMultiplier}x</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Logline */}
      {data.coverage?.logline && (
        <p className="verdict-logline">
          &ldquo;{data.coverage.logline}&rdquo;
        </p>
      )}

      {/* Stat cards row */}
      <div className="verdict-stats-row">
        <div className="glass-panel verdict-stat-card">
          <Film className="icon" style={{ color: 'var(--accent-gold)' }} />
          <h3>{ko ? '주인공' : 'Protagonist'}</h3>
          <p className="stat-value">{data.summary.protagonist}</p>
        </div>
        <div className="glass-panel verdict-stat-card">
          <TrendingUp className="icon" style={{ color: 'var(--color-success-dark)' }} />
          <h3>{ko ? 'ROI 배수' : 'ROI Multiplier'}</h3>
          <p className="stat-value">
            {roi?.predictedMultiplier ? `${roi.predictedMultiplier}x` : '—'}
          </p>
        </div>
        <div className="glass-panel verdict-stat-card">
          <Users className="icon" style={{ color: 'var(--accent-blue)' }} />
          <h3>{ko ? '등장인물' : 'Cast Members'}</h3>
          <p className="stat-value">{castCount}</p>
        </div>
        <div className="glass-panel verdict-stat-card">
          <Activity className="icon" style={{ color: 'var(--color-danger)' }} />
          <h3>{ko ? '장면 수' : 'Scenes'}</h3>
          <p className="stat-value">{data.features?.sceneCount ?? '—'}</p>
        </div>
      </div>
    </div>
  );
}
