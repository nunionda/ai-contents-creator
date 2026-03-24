'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip,
} from 'recharts';
import { ArrowLeft, Upload, Play, Loader2, Trophy, Zap, DollarSign, Gauge, Sparkles } from 'lucide-react';
import './benchmark.css';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4005';

type ProviderChoice = 'gemini' | 'gemini-pro' | 'gemini-long' | 'anthropic' | 'openai' | 'deepseek' | 'groq' | 'mock';

const PROVIDER_META: Record<ProviderChoice, { label: string; color: string; accent: string }> = {
  'gemini-pro':  { label: 'Gemini 2.5 Pro',   color: '#4285F4', accent: '#1a73e8' },
  'gemini':      { label: 'Gemini Flash',      color: '#34A853', accent: '#1e8e3e' },
  'gemini-long': { label: 'Gemini 1.5 Pro',    color: '#FBBC04', accent: '#f29900' },
  'anthropic':   { label: 'Claude Sonnet',     color: '#D97757', accent: '#c45e3e' },
  'openai':      { label: 'GPT-4o',            color: '#10A37F', accent: '#0d8c6d' },
  'deepseek':    { label: 'DeepSeek Chat',     color: '#7C3AED', accent: '#6d28d9' },
  'groq':        { label: 'Groq Llama 70B',    color: '#F97316', accent: '#ea580c' },
  'mock':        { label: 'Mock (테스트)',      color: '#6B7280', accent: '#4b5563' },
};

const ENGINE_LABELS: Record<string, string> = {
  beatSheet: 'Beat Sheet',
  emotion: '감정 분석',
  rating: '등급 분류',
  roi: 'ROI 예측',
  coverage: '커버리지',
  vfx: 'VFX 분석',
  trope: '트로프 분석',
};

interface EngineScore {
  engine: string;
  overallScore: number;
  structuralScore: number;
  contentScore: number;
  validatorVerdict: string;
}

interface BenchmarkMetrics {
  totalLatencyMs: number;
  totalCostUsd: number;
  avgQualityScore: number;
  structuralCompleteness: number;
  consistency: number;
}

interface ModelResult {
  provider: ProviderChoice;
  model: string;
  fullReport: any;
  engineScores: EngineScore[];
  metrics: BenchmarkMetrics;
  runIndex?: number;
}

interface RankedModel {
  provider: ProviderChoice;
  model: string;
  rank: number;
  compositeScore: number;
  qualityScore: number;
  costScore: number;
  speedScore: number;
  structureScore: number;
}

interface BenchmarkResult {
  benchmarkId: string;
  scriptId: string;
  scriptName: string;
  timestamp: string;
  market: string;
  models: ModelResult[];
  ranking: RankedModel[];
  matrix: any[];
}

export default function BenchmarkPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedModels, setSelectedModels] = useState<Set<ProviderChoice>>(
    new Set(['gemini-pro', 'groq'])
  );
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [activeReportTab, setActiveReportTab] = useState<ProviderChoice | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleModel = useCallback((m: ProviderChoice) => {
    setSelectedModels(prev => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  }, []);

  const handleRun = useCallback(async () => {
    if (!selectedFile || selectedModels.size === 0) return;
    setIsRunning(true);
    setResult(null);
    setProgress('시나리오 파싱 중...');

    try {
      const isPdf = selectedFile.name.toLowerCase().endsWith('.pdf');
      let payload: any = {
        fileName: selectedFile.name,
        models: Array.from(selectedModels),
        market: 'korean',
        runs: 1,
      };

      if (isPdf) {
        const buf = await selectedFile.arrayBuffer();
        payload.scriptBase64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        payload.isPdf = true;
      } else {
        payload.scriptText = await selectedFile.text();
      }

      setProgress(`${selectedModels.size}개 모델 벤치마크 실행 중... (모델당 1-3분 소요)`);

      const resp = await fetch(`${API}/benchmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) throw new Error(`API error: ${resp.status}`);
      const data: BenchmarkResult = await resp.json();
      setResult(data);
      setActiveReportTab(data.ranking[0]?.provider || null);
    } catch (err: any) {
      setProgress(`오류: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  }, [selectedFile, selectedModels]);

  // Build best-per-provider map for display
  const bestPerProvider = new Map<ProviderChoice, ModelResult>();
  if (result) {
    for (const m of result.models) {
      const existing = bestPerProvider.get(m.provider);
      if (!existing || m.metrics.avgQualityScore > existing.metrics.avgQualityScore) {
        bestPerProvider.set(m.provider, m);
      }
    }
  }

  // Radar chart data
  const radarData = result?.ranking.map(r => ({
    subject: PROVIDER_META[r.provider]?.label || r.provider,
    품질: r.qualityScore,
    비용효율: r.costScore,
    속도: r.speedScore,
    구조: r.structureScore,
  })) || [];

  return (
    <div className="bench-root">
      <header className="bench-header">
        <Link href="/dashboard" className="bench-back">
          <ArrowLeft size={18} />
          <span>대시보드</span>
        </Link>
        <h1 className="bench-title">LLM Benchmark</h1>
        <p className="bench-subtitle">Per-Model Full-Pipeline Evaluation</p>
      </header>

      {/* ─── Input Section ─── */}
      <section className="bench-input">
        <div className="bench-upload" onClick={() => fileRef.current?.click()}>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.fountain,.pdf"
            style={{ display: 'none' }}
            onChange={e => setSelectedFile(e.target.files?.[0] || null)}
          />
          <Upload size={24} />
          <span>{selectedFile ? selectedFile.name : '시나리오 업로드 (.txt, .fountain, .pdf)'}</span>
        </div>

        <div className="bench-models">
          <h3>비교할 모델 선택</h3>
          <div className="bench-model-grid">
            {(Object.keys(PROVIDER_META) as ProviderChoice[]).filter(p => p !== 'mock').map(p => (
              <button
                key={p}
                className={`bench-model-chip ${selectedModels.has(p) ? 'active' : ''}`}
                style={{ '--chip-color': PROVIDER_META[p].color } as React.CSSProperties}
                onClick={() => toggleModel(p)}
              >
                <span className="chip-dot" />
                {PROVIDER_META[p].label}
              </button>
            ))}
          </div>
        </div>

        <button
          className="bench-run-btn"
          disabled={!selectedFile || selectedModels.size < 2 || isRunning}
          onClick={handleRun}
        >
          {isRunning ? <Loader2 size={18} className="spin" /> : <Play size={18} />}
          {isRunning ? progress : `벤치마크 실행 (${selectedModels.size}개 모델)`}
        </button>
      </section>

      {/* ─── Results ─── */}
      {result && (
        <>
          {/* Ranking Table */}
          <section className="bench-section">
            <h2 className="bench-section-title"><Trophy size={20} /> 종합 순위</h2>
            <div className="bench-ranking">
              {result.ranking.map((r, i) => {
                const meta = PROVIDER_META[r.provider];
                const modelResult = bestPerProvider.get(r.provider);
                return (
                  <div
                    key={r.provider}
                    className={`rank-card rank-${i + 1}`}
                    style={{ '--rank-color': meta?.color } as React.CSSProperties}
                  >
                    <div className="rank-badge">{i + 1}</div>
                    <div className="rank-info">
                      <div className="rank-name">{meta?.label || r.provider}</div>
                      <div className="rank-model">{r.model}</div>
                    </div>
                    <div className="rank-metrics">
                      <div className="rank-metric">
                        <Gauge size={14} />
                        <span className="metric-value">{r.compositeScore}</span>
                        <span className="metric-label">종합</span>
                      </div>
                      <div className="rank-metric">
                        <Sparkles size={14} />
                        <span className="metric-value">{r.qualityScore}</span>
                        <span className="metric-label">품질</span>
                      </div>
                      <div className="rank-metric">
                        <DollarSign size={14} />
                        <span className="metric-value">${modelResult?.metrics.totalCostUsd.toFixed(3)}</span>
                        <span className="metric-label">비용</span>
                      </div>
                      <div className="rank-metric">
                        <Zap size={14} />
                        <span className="metric-value">{((modelResult?.metrics.totalLatencyMs || 0) / 1000).toFixed(1)}s</span>
                        <span className="metric-label">속도</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Engine × Model Heatmap */}
          <section className="bench-section">
            <h2 className="bench-section-title">엔진 × 모델 히트맵</h2>
            <div className="bench-heatmap-wrap">
              <table className="bench-heatmap">
                <thead>
                  <tr>
                    <th className="hm-engine-col">엔진</th>
                    {result.ranking.map(r => (
                      <th key={r.provider} style={{ color: PROVIDER_META[r.provider]?.color }}>
                        {PROVIDER_META[r.provider]?.label || r.provider}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(['beatSheet', 'emotion', 'rating', 'roi', 'coverage', 'vfx', 'trope'] as const).map(engine => (
                    <tr key={engine}>
                      <td className="hm-engine-name">{ENGINE_LABELS[engine]}</td>
                      {result.ranking.map(r => {
                        const mr = bestPerProvider.get(r.provider);
                        const es = mr?.engineScores.find(e => e.engine === engine);
                        const score = es?.overallScore ?? 0;
                        return (
                          <td
                            key={r.provider}
                            className="hm-cell"
                            style={{ '--cell-hue': scoreToHue(score) } as React.CSSProperties}
                          >
                            <span className="hm-score">{score}</span>
                            <span className={`hm-verdict ${es?.validatorVerdict?.toLowerCase()}`}>
                              {es?.validatorVerdict || '—'}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Radar Chart */}
          <section className="bench-section">
            <h2 className="bench-section-title">4축 비교 레이더</h2>
            <div className="bench-radar-wrap">
              <ResponsiveContainer width="100%" height={380}>
                <RadarChart data={[
                  { axis: '품질', ...Object.fromEntries(result.ranking.map(r => [r.provider, r.qualityScore])) },
                  { axis: '비용효율', ...Object.fromEntries(result.ranking.map(r => [r.provider, r.costScore])) },
                  { axis: '속도', ...Object.fromEntries(result.ranking.map(r => [r.provider, r.speedScore])) },
                  { axis: '구조 완성도', ...Object.fromEntries(result.ranking.map(r => [r.provider, r.structureScore])) },
                ]}>
                  <PolarGrid stroke="#333" />
                  <PolarAngleAxis dataKey="axis" tick={{ fill: '#aaa', fontSize: 13 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#666', fontSize: 11 }} />
                  {result.ranking.map(r => (
                    <Radar
                      key={r.provider}
                      name={PROVIDER_META[r.provider]?.label || r.provider}
                      dataKey={r.provider}
                      stroke={PROVIDER_META[r.provider]?.color || '#888'}
                      fill={PROVIDER_META[r.provider]?.color || '#888'}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  ))}
                  <Legend wrapperStyle={{ color: '#ccc', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8, color: '#eee' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Model Report Tabs */}
          <section className="bench-section">
            <h2 className="bench-section-title">모델별 상세 리포트</h2>
            <div className="bench-report-tabs">
              {result.ranking.map(r => (
                <button
                  key={r.provider}
                  className={`report-tab ${activeReportTab === r.provider ? 'active' : ''}`}
                  style={{ '--tab-color': PROVIDER_META[r.provider]?.color } as React.CSSProperties}
                  onClick={() => setActiveReportTab(r.provider)}
                >
                  {PROVIDER_META[r.provider]?.label || r.provider}
                  <span className="tab-score">{r.compositeScore}</span>
                </button>
              ))}
            </div>
            {activeReportTab && (
              <div className="bench-report-detail">
                <ModelReportDetail
                  result={bestPerProvider.get(activeReportTab)}
                  color={PROVIDER_META[activeReportTab]?.color || '#888'}
                />
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function scoreToHue(score: number): string {
  // 0 = red (0), 50 = yellow (60), 100 = green (120)
  const hue = Math.round((score / 100) * 120);
  return String(hue);
}

function ModelReportDetail({ result, color }: { result?: ModelResult; color: string }) {
  if (!result) return <p className="bench-empty">결과 없음</p>;

  const report = result.fullReport;
  return (
    <div className="report-detail-grid">
      <div className="detail-card">
        <h4>요약</h4>
        <div className="detail-row"><span>스크립트 ID</span><span>{report.scriptId}</span></div>
        <div className="detail-row"><span>주인공</span><span>{report.summary?.protagonist || '—'}</span></div>
        <div className="detail-row"><span>예상 ROI</span><span>{report.predictions?.roi?.tier || '—'}</span></div>
        <div className="detail-row"><span>등급</span><span>{report.predictions?.rating?.rating || '—'}</span></div>
        <div className="detail-row"><span>장르</span><span>{report.coverage?.genre || '—'}</span></div>
      </div>

      <div className="detail-card">
        <h4>엔진별 점수</h4>
        {result.engineScores.map(es => (
          <div key={es.engine} className="detail-engine-row">
            <span className="engine-name">{ENGINE_LABELS[es.engine] || es.engine}</span>
            <div className="engine-bar-wrap">
              <div
                className="engine-bar"
                style={{
                  width: `${es.overallScore}%`,
                  background: `hsl(${scoreToHue(es.overallScore)}, 70%, 50%)`,
                }}
              />
            </div>
            <span className="engine-score">{es.overallScore}</span>
            <span className={`engine-verdict ${es.validatorVerdict?.toLowerCase()}`}>
              {es.validatorVerdict}
            </span>
          </div>
        ))}
      </div>

      <div className="detail-card">
        <h4>성능 지표</h4>
        <div className="detail-row"><span>총 소요 시간</span><span>{(result.metrics.totalLatencyMs / 1000).toFixed(1)}초</span></div>
        <div className="detail-row"><span>총 비용</span><span>${result.metrics.totalCostUsd.toFixed(4)}</span></div>
        <div className="detail-row"><span>평균 품질</span><span>{result.metrics.avgQualityScore}/100</span></div>
        <div className="detail-row"><span>구조 완성도</span><span>{result.metrics.structuralCompleteness}/100</span></div>
      </div>

      {report.coverage?.logline && (
        <div className="detail-card full-width">
          <h4>로그라인</h4>
          <p className="detail-logline">{report.coverage.logline}</p>
        </div>
      )}

      {report.tropes && report.tropes.length > 0 && (
        <div className="detail-card full-width">
          <h4>트로프</h4>
          <div className="detail-tropes">
            {report.tropes.map((t: string, i: number) => (
              <span key={i} className="trope-chip">{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

