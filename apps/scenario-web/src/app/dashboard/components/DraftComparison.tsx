'use client';

import React, { useState } from 'react';
import {
  GitCompareArrows,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  Plus,
  Trash2,
  Pencil,
  CircleDot,
} from 'lucide-react';
import './DraftComparison.css';

/* ─── Types ─── */

interface DraftComparisonProps {
  currentScriptId: string;
  reports: Array<{ scriptId: string; createdAt?: string }>;
  locale: 'en' | 'ko';
}

interface MetricDelta {
  metric: string;
  oldValue: number;
  newValue: number;
  delta: number;
  direction: 'up' | 'down' | 'same';
}

interface CharacterChange {
  name: string;
  type: 'added' | 'removed' | 'changed';
}

interface EmotionArcShift {
  avgScoreChange: number;
  volatilityChange: number;
}

interface ComparisonResult {
  totalChanges: number;
  positiveCount: number;
  negativeCount: number;
  overallImproved: boolean;
  scoreDelta: number;
  metricDeltas: MetricDelta[];
  characterChanges: CharacterChange[];
  emotionArcShift: EmotionArcShift;
  narrativeChanges: string[];
}

/* ─── Component ─── */

export default function DraftComparison({
  currentScriptId,
  reports,
  locale,
}: DraftComparisonProps) {
  const ko = locale === 'ko';

  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState('');
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableReports = reports.filter(r => r.scriptId !== currentScriptId);

  async function handleCompare() {
    if (!selectedReportId) return;

    setIsLoading(true);
    setError(null);
    setComparisonResult(null);

    try {
      const res = await fetch('http://localhost:4005/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldScriptId: selectedReportId,
          newScriptId: currentScriptId,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`${ko ? '비교 실패' : 'Comparison failed'} (${res.status}): ${errText}`);
      }

      const data: ComparisonResult = await res.json();
      setComparisonResult(data);
    } catch (err: any) {
      setError(err.message || (ko ? '비교 중 오류가 발생했습니다' : 'An error occurred during comparison'));
    } finally {
      setIsLoading(false);
    }
  }

  function formatDelta(value: number): string {
    if (value > 0) return `+${value}`;
    if (value < 0) return `${value}`;
    return '0';
  }

  function formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(ko ? 'ko-KR' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="draft-comparison">
      <div className="draft-comparison-panel">
        {/* Collapsible Header */}
        <div
          className="draft-comparison-header"
          onClick={() => setIsExpanded(!isExpanded)}
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsExpanded(!isExpanded); } }}
        >
          <h3 className="draft-comparison-title">
            <GitCompareArrows size={20} />
            {ko ? '초안 비교' : 'Draft Comparison'}
          </h3>
          <span className="draft-comparison-toggle" aria-hidden="true">
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </span>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <>
            {/* Controls */}
            <div className="draft-comparison-controls">
              <select
                className="draft-comparison-select"
                value={selectedReportId}
                onChange={e => setSelectedReportId(e.target.value)}
                aria-label={ko ? '비교할 이전 초안 선택' : 'Select a previous draft to compare'}
              >
                <option value="">
                  {ko ? '-- 이전 초안 선택 --' : '-- Select a previous draft --'}
                </option>
                {availableReports.map(r => (
                  <option key={r.scriptId} value={r.scriptId}>
                    {r.scriptId}
                    {r.createdAt ? ` (${formatDate(r.createdAt)})` : ''}
                  </option>
                ))}
              </select>

              <button
                className="draft-comparison-btn"
                onClick={handleCompare}
                disabled={!selectedReportId || isLoading}
              >
                {isLoading ? (
                  <Loader2 size={14} className="spin-icon" />
                ) : (
                  <GitCompareArrows size={14} />
                )}
                {ko ? '비교' : 'Compare'}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="draft-comparison-error">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="draft-comparison-loading">
                <Loader2 size={16} className="spin-icon" />
                <span>{ko ? '비교 분석 중...' : 'Comparing drafts...'}</span>
              </div>
            )}

            {/* Comparison Results */}
            {comparisonResult && !isLoading && (
              <>
                {/* Summary Bar */}
                <div className="draft-summary-bar">
                  <div className="draft-summary-stat">
                    <span className="draft-summary-stat-value">
                      {comparisonResult.totalChanges}
                    </span>
                    <span className="draft-summary-stat-label">
                      {ko ? '변경' : 'Changes'}
                    </span>
                  </div>

                  <div className="draft-summary-divider" />

                  <div className="draft-summary-stat">
                    <span className="draft-summary-stat-value positive">
                      {comparisonResult.positiveCount}
                    </span>
                    <span className="draft-summary-stat-label">
                      {ko ? '긍정' : 'Positive'}
                    </span>
                  </div>

                  <div className="draft-summary-stat">
                    <span className="draft-summary-stat-value negative">
                      {comparisonResult.negativeCount}
                    </span>
                    <span className="draft-summary-stat-label">
                      {ko ? '부정' : 'Negative'}
                    </span>
                  </div>

                  <div className="draft-summary-divider" />

                  <div className={`draft-summary-improvement ${comparisonResult.overallImproved ? 'improved' : 'regressed'}`}>
                    {comparisonResult.overallImproved ? (
                      <CheckCircle size={16} />
                    ) : (
                      <XCircle size={16} />
                    )}
                    <span>
                      {comparisonResult.overallImproved
                        ? (ko ? '전반적 개선' : 'Overall Improved')
                        : (ko ? '전반적 하락' : 'Overall Regressed')}
                    </span>
                  </div>
                </div>

                {/* Score Delta */}
                <div className="draft-score-delta">
                  <div
                    className={`draft-score-delta-value ${
                      comparisonResult.scoreDelta > 0
                        ? 'positive'
                        : comparisonResult.scoreDelta < 0
                        ? 'negative'
                        : 'neutral'
                    }`}
                  >
                    {formatDelta(comparisonResult.scoreDelta)}
                  </div>
                  <span className="draft-score-delta-label">
                    {ko ? '포인트' : 'points'}
                  </span>
                </div>

                {/* Metric Deltas */}
                {comparisonResult.metricDeltas?.length > 0 && (
                  <div className="draft-metrics-section">
                    <h4 className="draft-section-title">
                      {ko ? '지표 변화' : 'Metric Changes'}
                    </h4>
                    <table className="draft-metrics-table">
                      <thead>
                        <tr>
                          <th>{ko ? '지표' : 'Metric'}</th>
                          <th>{ko ? '이전' : 'Previous'}</th>
                          <th>{ko ? '현재' : 'Current'}</th>
                          <th>{ko ? '변화' : 'Delta'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonResult.metricDeltas.map((md, idx) => (
                          <tr key={idx}>
                            <td className="draft-metric-name">{md.metric}</td>
                            <td>{md.oldValue}</td>
                            <td>{md.newValue}</td>
                            <td>
                              <span
                                className={`draft-metric-arrow ${
                                  md.direction === 'up'
                                    ? 'positive'
                                    : md.direction === 'down'
                                    ? 'negative'
                                    : 'neutral'
                                }`}
                              >
                                {md.direction === 'up' && <ArrowUp size={12} />}
                                {md.direction === 'down' && <ArrowDown size={12} />}
                                {md.direction === 'same' && <Minus size={12} />}
                                {formatDelta(md.delta)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Character Changes */}
                {comparisonResult.characterChanges?.length > 0 && (
                  <div className="draft-characters-section">
                    <h4 className="draft-section-title">
                      {ko ? '캐릭터 변경' : 'Character Changes'}
                    </h4>
                    <div className="draft-character-tags">
                      {comparisonResult.characterChanges.map((cc, idx) => (
                        <span key={idx} className={`draft-character-tag ${cc.type}`}>
                          {cc.type === 'added' && <Plus size={10} />}
                          {cc.type === 'removed' && <Trash2 size={10} />}
                          {cc.type === 'changed' && <Pencil size={10} />}
                          {cc.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Emotion Arc Shift */}
                {comparisonResult.emotionArcShift && (
                  <div className="draft-emotion-section">
                    <h4 className="draft-section-title">
                      {ko ? '감정 아크 변화' : 'Emotion Arc Shift'}
                    </h4>
                    <div className="draft-emotion-stats">
                      <div className="draft-emotion-stat">
                        <span className="draft-emotion-stat-label">
                          {ko ? '평균 점수 변화' : 'Avg Score Change'}
                        </span>
                        <span
                          className="draft-emotion-stat-value"
                          style={{
                            color:
                              comparisonResult.emotionArcShift.avgScoreChange > 0
                                ? 'var(--color-success)'
                                : comparisonResult.emotionArcShift.avgScoreChange < 0
                                ? 'var(--color-danger)'
                                : 'var(--text-dim)',
                          }}
                        >
                          {formatDelta(comparisonResult.emotionArcShift.avgScoreChange)}
                        </span>
                      </div>
                      <div className="draft-emotion-stat">
                        <span className="draft-emotion-stat-label">
                          {ko ? '변동성 변화' : 'Volatility Change'}
                        </span>
                        <span
                          className="draft-emotion-stat-value"
                          style={{
                            color:
                              comparisonResult.emotionArcShift.volatilityChange > 0
                                ? 'var(--color-warning)'
                                : comparisonResult.emotionArcShift.volatilityChange < 0
                                ? 'var(--accent-blue)'
                                : 'var(--text-dim)',
                          }}
                        >
                          {formatDelta(comparisonResult.emotionArcShift.volatilityChange)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Narrative Changes */}
                {comparisonResult.narrativeChanges?.length > 0 && (
                  <div className="draft-narrative-section">
                    <h4 className="draft-section-title">
                      {ko ? '서사 변경' : 'Narrative Changes'}
                    </h4>
                    <ul className="draft-narrative-list">
                      {comparisonResult.narrativeChanges.map((change, idx) => (
                        <li key={idx} className="draft-narrative-item">
                          <CircleDot size={12} />
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
