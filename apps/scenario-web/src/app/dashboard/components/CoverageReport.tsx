'use client';

import React, { useState } from 'react';
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface CoverageReportProps {
  coverage: any;
  locale?: 'en' | 'ko';
  summaryMode?: boolean;
}

function scoreColor(score: number) {
  if (score >= 80) return 'var(--color-success)';
  if (score >= 60) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

function scoreLabel(score: number, ko: boolean) {
  if (ko) {
    if (score >= 80) return '우수';
    if (score >= 60) return '양호';
    if (score >= 40) return '보통';
    return '미흡';
  }
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Weak';
}

export default function CoverageReport({ coverage, locale = 'en', summaryMode = false }: CoverageReportProps) {
  const ko = locale === 'ko';
  const totalCategories = coverage.categories?.length ?? 0;
  const allIndices = new Set(Array.from({ length: totalCategories }, (_, i) => i));
  const [collapsedCategories, setCollapsedCategories] = useState<Set<number>>(new Set());

  const toggleCategory = (idx: number) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const allExpanded = collapsedCategories.size === 0;
  const toggleAll = () => {
    setCollapsedCategories(allExpanded ? allIndices : new Set());
  };

  return (
    <div className="coverage-section">
      <div className="glass-panel coverage-header">
        <div className="coverage-title-row">
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{ko ? '시나리오 커버리지 리포트' : 'Script Coverage Report'}</h2>
            <p style={{ color: 'var(--text-dim)', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
              {coverage.title} — {coverage.genre}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div className="score-circle">
              <span className="score-value">{coverage.overallScore}</span>
              <span className="score-label">/ 100</span>
            </div>
            <span className={`verdict-badge verdict-${coverage.verdict.toLowerCase()}`}>
              {coverage.verdict}
            </span>
          </div>
        </div>
        <div className="verdict-criteria">
          {[
            { verdict: 'Recommend', range: '≥ 80', label: ko ? '제작 추천' : 'Greenlight for production' },
            { verdict: 'Consider', range: '60–79', label: ko ? '수정 후 재검토' : 'Revise and resubmit' },
            { verdict: 'Pass', range: '< 60', label: ko ? '제작 부적합' : 'Not recommended' },
          ].map(({ verdict, range, label }) => (
            <span key={verdict} className={`verdict-criterion ${coverage.verdict === verdict ? 'verdict-criterion-active' : ''}`}>
              <span className={`verdict-dot verdict-dot-${verdict.toLowerCase()}`} />
              <strong>{verdict}</strong> <span className="verdict-range">{range}</span> — {label}
            </span>
          ))}
        </div>
        {coverage.logline && (
          <p style={{ color: 'var(--text-dim)', fontStyle: 'italic', margin: '0.75rem 0 0', fontSize: '0.9rem' }}>
            &ldquo;{coverage.logline}&rdquo;
          </p>
        )}
      </div>

      {/* In summaryMode, stop after header */}
      {summaryMode && null}

      {/* Category Score Bars — all expanded by default */}
      {!summaryMode && totalCategories > 0 && (
        <div className="coverage-categories-header">
          <button className="btn-toggle-all" onClick={toggleAll}>
            {allExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {allExpanded ? (ko ? '모두 접기' : 'Collapse All') : (ko ? '모두 펼치기' : 'Expand All')}
          </button>
        </div>
      )}
      {!summaryMode ? (
        <div className="coverage-categories coverage-categories-full">
          {coverage.categories?.map((cat: any, idx: number) => {
            const isExpanded = !collapsedCategories.has(idx);
            return (
              <div key={idx} className={`glass-panel coverage-category-card ${isExpanded ? 'category-expanded' : ''}`}>
                <div
                  className="category-header"
                  onClick={() => toggleCategory(idx)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 600 }}>{cat.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="category-score-badge" style={{ color: scoreColor(cat.score) }}>
                          {cat.score}
                        </span>
                        <span className="category-score-label" style={{ color: scoreColor(cat.score) }}>
                          {scoreLabel(cat.score, ko)}
                        </span>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                    <div className="category-bar">
                      <div
                        className="category-bar-fill"
                        style={{
                          width: `${cat.score}%`,
                          background: scoreColor(cat.score),
                        }}
                      />
                    </div>
                  </div>
                </div>
                {isExpanded && cat.subcategories && (
                  <div className="subcategories">
                    {cat.subcategories.map((sub: any, si: number) => (
                      <div key={si} className="subcategory-item">
                        <div className="subcategory-header">
                          <span className="subcategory-name">{sub.name}</span>
                          <div className="subcategory-score-group">
                            <span className="subcategory-score" style={{ color: scoreColor(sub.score) }}>{sub.score}</span>
                            <span className="subcategory-score-max">/ 100</span>
                          </div>
                        </div>
                        <div className="category-bar" style={{ height: '4px' }}>
                          <div
                            className="category-bar-fill"
                            style={{
                              width: `${sub.score}%`,
                              background: scoreColor(sub.score),
                            }}
                          />
                        </div>
                        <p className="subcategory-assessment">{sub.assessment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Synopsis */}
      {!summaryMode && coverage.synopsis && (
        <div className="glass-panel coverage-synopsis">
          <h3 style={{ margin: '0 0 0.5rem' }}>{ko ? '시놉시스' : 'Synopsis'}</h3>
          <p style={{ color: 'var(--text-dim)', lineHeight: 1.6, margin: 0 }}>{coverage.synopsis}</p>
        </div>
      )}

      {/* Strengths & Weaknesses */}
      {!summaryMode && (coverage.strengths?.length > 0 || coverage.weaknesses?.length > 0) && (
        <div className="strengths-weaknesses">
          <div className="glass-panel sw-col">
            <h3 style={{ margin: '0 0 0.75rem', color: 'var(--color-success)' }}>
              <CheckCircle size={18} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
              {ko ? '강점' : 'Strengths'}
            </h3>
            <ul className="sw-list">
              {coverage.strengths?.map((s: string, i: number) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div className="glass-panel sw-col">
            <h3 style={{ margin: '0 0 0.75rem', color: 'var(--color-danger)' }}>
              <XCircle size={18} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
              {ko ? '약점' : 'Weaknesses'}
            </h3>
            <ul className="sw-list sw-list-weak">
              {coverage.weaknesses?.map((w: string, i: number) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Market Potential & Comparable Titles */}
      {!summaryMode && (coverage.marketPotential || coverage.comparableTitles?.length > 0) && (
        <div className="strengths-weaknesses">
          {coverage.marketPotential && (
            <div className="glass-panel sw-col">
              <h3 style={{ margin: '0 0 0.75rem' }}>
                {ko ? '시장성 평가' : 'Market Potential'}
              </h3>
              <p style={{ color: 'var(--text-dim)', lineHeight: 1.6, margin: 0 }}>{coverage.marketPotential}</p>
            </div>
          )}
          {coverage.comparableTitles?.length > 0 && (
            <div className="glass-panel sw-col">
              <h3 style={{ margin: '0 0 0.75rem' }}>
                {ko ? '유사 작품' : 'Comparable Titles'}
              </h3>
              <ul className="sw-list">
                {coverage.comparableTitles.map((t: string, i: number) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Recommendation */}
      {!summaryMode && coverage.recommendation && (
        <div className="glass-panel recommendation-box">
          <h3 style={{ margin: '0 0 0.5rem' }}>{ko ? '애널리스트 의견' : 'Analyst Recommendation'}</h3>
          <p style={{ color: 'var(--text-dim)', lineHeight: 1.6, margin: 0 }}>{coverage.recommendation}</p>
        </div>
      )}
    </div>
  );
}
