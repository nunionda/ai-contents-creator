'use client';

import React from 'react';
import { Waypoints, AlertTriangle } from 'lucide-react';

interface NarrativeArcPanelProps {
  narrativeArc: any;
  locale?: 'en' | 'ko';
}

export default function NarrativeArcPanel({ narrativeArc, locale = 'en' }: NarrativeArcPanelProps) {
  const ko = locale === 'ko';
  return (
    <div className="glass-panel arc-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ margin: 0 }}>
            <Waypoints size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle', color: 'var(--color-purple)' }} />
            {ko ? '서사 아크' : 'Narrative Arc'}
          </h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
            {narrativeArc.arcDescription}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span className={`arc-badge arc-${narrativeArc.arcType}`}>
            {narrativeArc.arcType.replace(/-/g, ' ')}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            {Math.round(narrativeArc.arcConfidence * 100)}% {ko ? '신뢰도' : 'confidence'}
          </span>
        </div>
      </div>

      {/* Turning Points */}
      {narrativeArc.turningPoints?.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div className="detail-label" style={{ marginBottom: '0.5rem' }}>{ko ? '전환점' : 'Turning Points'}</div>
          <div className="turning-points">
            {narrativeArc.turningPoints.filter((tp: any) => tp.type !== 'plateau').slice(0, 8).map((tp: any, i: number) => (
              <span key={i} className={`tp-chip tp-${tp.type}`}>
                {ko ? '장면' : 'Sc.'}{tp.sceneNumber} {tp.type === 'rise' ? '↑' : tp.type === 'fall' ? '↓' : '—'} {tp.magnitude > 0 ? tp.magnitude : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="arc-footer">
        {/* Genre Fit */}
        <div className="genre-fit">
          <div className="detail-label">{ko ? '장르 적합성' : 'Genre Fit'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            <div className="category-bar" style={{ flex: 1 }}>
              <div className="category-bar-fill" style={{
                width: `${narrativeArc.genreFit.fitScore}%`,
                background: narrativeArc.genreFit.fitScore >= 80 ? 'var(--color-success)' : narrativeArc.genreFit.fitScore >= 50 ? 'var(--color-warning)' : 'var(--color-danger)',
              }} />
            </div>
            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{narrativeArc.genreFit.fitScore}%</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: '0.25rem 0 0' }}>
            {narrativeArc.genreFit.deviation}
          </p>
        </div>

        {/* Pacing Issues */}
        {narrativeArc.pacingIssues?.length > 0 && (
          <div className="pacing-issues">
            <div className="detail-label" style={{ marginBottom: '0.4rem' }}>
              <AlertTriangle size={14} style={{ marginRight: '0.3rem', verticalAlign: 'middle', color: 'var(--color-warning)' }} />
              {ko ? `페이싱 이슈 (${narrativeArc.pacingIssues.length})` : `Pacing Issues (${narrativeArc.pacingIssues.length})`}
            </div>
            {narrativeArc.pacingIssues.map((issue: any, i: number) => (
              <div key={i} className={`pacing-issue pacing-${issue.severity}`}>
                <span className="pacing-type">{issue.type}</span>
                <span style={{ fontSize: '0.8rem' }}>{ko ? '장면' : 'Scenes'} {issue.startScene}–{issue.endScene}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{issue.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
