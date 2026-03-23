'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface EmotionChartProps {
  emotionGraph: any[];
  locale?: 'en' | 'ko';
}

export default function EmotionChart({ emotionGraph, locale = 'en' }: EmotionChartProps) {
  const ko = locale === 'ko';
  return (
    <div className="glass-panel main-chart">
      <h3 style={{ marginBottom: '1.5rem' }}>{ko ? '감정 밸런스 아크' : 'Emotional Valence Arc'}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={emotionGraph}>
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.4}/>
              <stop offset="50%" stopColor="var(--accent-blue)" stopOpacity={0.12}/>
              <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="sceneNumber" hide />
          <YAxis domain={[-10, 10]} stroke="var(--text-dim)" fontSize={11} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div style={{
                  background: 'rgba(20, 20, 28, 0.92)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '10px',
                  padding: '0.75rem 0.85rem',
                  maxWidth: '280px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.25rem', fontSize: '0.85rem' }}>{ko ? '장면' : 'Scene'} {d.sceneNumber}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--accent-gold)', fontSize: '0.82rem' }}>{d.dominantEmotion || '—'}</span>
                    <span style={{
                      fontFamily: 'var(--font-geist-mono), monospace',
                      fontWeight: 700,
                      color: d.score >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                    }}>{d.score > 0 ? '+' : ''}{d.score}</span>
                  </div>
                  {d.explanation && <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', whiteSpace: 'normal', lineHeight: 1.4 }}>{d.explanation}</div>}
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="var(--accent-blue)"
            fillOpacity={1}
            fill="url(#colorScore)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, fill: 'var(--bg-dark)', stroke: 'var(--accent-blue)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
