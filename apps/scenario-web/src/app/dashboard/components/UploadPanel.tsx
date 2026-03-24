'use client';

import React from 'react';
import { Upload, FileText, Loader, Clock, AlertCircle, Square } from 'lucide-react';

type Strategy = 'auto' | 'fast' | 'deep' | 'custom' | 'budget' | 'premium' | 'long-context';
type ProviderChoice = 'gemini' | 'gemini-pro' | 'gemini-long' | 'anthropic' | 'openai' | 'deepseek' | 'groq' | 'mock';
type MarketLocale = 'hollywood' | 'korean';
type ViewMode = 'idle' | 'analyzing' | 'viewing';

// Model-based selection (maps to strategy 'custom' with all engines = same provider)
type ModelChoice = 'gemini-pro' | 'anthropic' | 'openai' | 'groq' | 'custom';

const MODEL_CHOICES: { id: ModelChoice; label: string; labelKo: string; desc: string; descKo: string; color: string; icon: string }[] = [
  { id: 'gemini-pro', label: 'Gemini', labelKo: '제미나이', desc: 'Gemini 2.5 Pro', descKo: 'Gemini 2.5 Pro', color: '#4285F4', icon: '◆' },
  { id: 'anthropic', label: 'Claude', labelKo: '클로드', desc: 'Claude Sonnet 4.6', descKo: 'Claude Sonnet 4.6', color: '#D97757', icon: '◈' },
  { id: 'openai', label: 'OpenAI', labelKo: 'OpenAI', desc: 'GPT-4o', descKo: 'GPT-4o', color: '#10A37F', icon: '◇' },
  { id: 'groq', label: 'Groq', labelKo: 'Groq', desc: 'Llama 3.3 70B (무료)', descKo: 'Llama 3.3 70B (무료)', color: '#F97316', icon: '⚡' },
  { id: 'custom', label: 'Custom', labelKo: '사용자 지정', desc: 'Pick per engine', descKo: '엔진별 선택', color: '#8B5CF6', icon: '⚙' },
];

const ENGINE_LABELS: Record<string, string> = {
  beatSheet: 'Beat Sheet',
  emotion: 'Emotion',
  rating: 'Rating',
  roi: 'ROI Prediction',
  coverage: 'Coverage',
  vfx: 'VFX',
  trope: 'Trope',
};

const PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Gemini Flash',
  'gemini-pro': 'Gemini Pro',
  'gemini-long': 'Gemini 1.5 Pro (2M)',
  anthropic: 'Claude Sonnet 4.6',
  openai: 'GPT-4o',
  deepseek: 'DeepSeek V3',
  groq: 'Groq (Llama 3.3)',
  mock: 'Mock',
};

interface UploadPanelProps {
  mode: ViewMode;
  selectedFile: File | null;
  movieId: string;
  uploadError: string | null;
  dragOver: boolean;
  strategy: Strategy;
  selectedModel: ModelChoice;
  market: MarketLocale;
  customProviders: Record<string, ProviderChoice>;
  availableProviders: Record<string, boolean>;
  reports: any[];
  locale: 'en' | 'ko';
  onSetDragOver: (v: boolean) => void;
  onFileDrop: (e: React.DragEvent) => void;
  onFileSelect: () => void;
  onMovieIdChange: (v: string) => void;
  onStrategyChange: (s: Strategy) => void;
  onModelChange: (m: ModelChoice) => void;
  onMarketChange: (m: MarketLocale) => void;
  onCustomProviderChange: (engine: string, provider: ProviderChoice) => void;
  onAnalyze: () => void;
  onCancel?: () => void;
  onReset: () => void;
  onLoadReport: (scriptId: string) => void;
}

export { ENGINE_LABELS, PROVIDER_LABELS, MODEL_CHOICES };
export type { Strategy, ProviderChoice, MarketLocale, ViewMode, ModelChoice };

export default function UploadPanel({
  mode, selectedFile, movieId, uploadError, dragOver, strategy, selectedModel, market,
  customProviders, availableProviders, reports, locale,
  onSetDragOver, onFileDrop, onFileSelect, onMovieIdChange,
  onStrategyChange, onModelChange, onMarketChange, onCustomProviderChange, onAnalyze, onCancel, onReset, onLoadReport,
}: UploadPanelProps) {
  const t = locale === 'ko';
  return (
    <div className="upload-row">
      <div className="glass-panel upload-panel">
        <div className="upload-panel-header">
          <h3>
            <Upload size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            {t ? '새 시나리오 분석' : 'Analyze New Script'}
          </h3>
          {mode === 'viewing' && (
            <button className="btn-reset" onClick={onReset}>{t ? '새 분석' : 'New Analysis'}</button>
          )}
        </div>

        {mode !== 'viewing' && (
          <>
            <div
              className={`drop-zone ${dragOver ? 'drop-zone-active' : ''} ${selectedFile ? 'drop-zone-selected' : ''}`}
              onDragOver={(e) => { e.preventDefault(); onSetDragOver(true); }}
              onDragLeave={() => onSetDragOver(false)}
              onDrop={onFileDrop}
              onClick={onFileSelect}
              role="button"
              tabIndex={0}
              aria-label={selectedFile ? `Selected file: ${selectedFile.name}` : 'Drop zone: click or drag to upload screenplay'}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFileSelect(); } }}
            >
              {selectedFile ? (
                <div className="file-info">
                  <FileText size={24} style={{ color: 'var(--accent-gold)' }} />
                  <div>
                    <div className="file-info-name">{selectedFile.name}</div>
                    <div className="file-info-size">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
              ) : (
                <div className="drop-zone-placeholder">
                  <Upload size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                  <div>{t ? <><strong>.fountain</strong>, <strong>.txt</strong>, 또는 <strong>.pdf</strong> 파일을 드래그 앤 드롭</> : <>Drag & drop a <strong>.fountain</strong>, <strong>.txt</strong>, or <strong>.pdf</strong> file</>}</div>
                  <div className="drop-zone-subtext">{t ? '또는 클릭하여 찾아보기' : 'or click to browse'}</div>
                </div>
              )}
            </div>

            {/* Market Selector */}
            <div className="strategy-row strategy-row-market">
              <button
                className={`strategy-pill ${market === 'hollywood' ? 'active' : ''}`}
                onClick={() => onMarketChange('hollywood')}
              >
                <span className="pill-label">Hollywood</span>
                <span className="pill-desc">{t ? 'MPAA / USD' : 'MPAA / USD'}</span>
              </button>
              <button
                className={`strategy-pill ${market === 'korean' ? 'active' : ''}`}
                onClick={() => onMarketChange('korean')}
              >
                <span className="pill-label">{t ? '한국 영화' : 'Korean'}</span>
                <span className="pill-desc">{t ? 'KMRB / KRW' : 'KMRB / KRW'}</span>
              </button>
            </div>

            {/* Model Selector */}
            <div className="model-selector">
              <div className="model-selector-label">{t ? '분석 모델' : 'Analysis Model'}</div>
              <div className="model-grid">
                {MODEL_CHOICES.map(m => {
                  const isAvailable = m.id === 'custom' || availableProviders[m.id] || m.id === 'groq';
                  return (
                    <button
                      key={m.id}
                      className={`model-card ${selectedModel === m.id ? 'active' : ''} ${!isAvailable ? 'unavailable' : ''}`}
                      style={{ '--model-color': m.color } as React.CSSProperties}
                      onClick={() => isAvailable && onModelChange(m.id)}
                      disabled={!isAvailable}
                    >
                      <span className="model-icon">{m.icon}</span>
                      <span className="model-name">{t ? m.labelKo : m.label}</span>
                      <span className="model-desc">{t ? m.descKo : m.desc}</span>
                      {!isAvailable && <span className="model-no-key">No API Key</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Provider Grid — only when 사용자 지정 is selected */}
            {selectedModel === 'custom' && (
              <div className="custom-grid">
                {(['beatSheet', 'emotion', 'rating', 'roi', 'coverage', 'vfx', 'trope'] as const).map(engine => (
                  <div key={engine} className="custom-grid-item">
                    <label>{ENGINE_LABELS[engine]}</label>
                    <select
                      className="select-glass"
                      value={customProviders[engine]}
                      onChange={(e) => onCustomProviderChange(engine, e.target.value as ProviderChoice)}
                    >
                      {(['gemini-pro', 'gemini', 'anthropic', 'openai', 'deepseek', 'groq', 'mock'] as const).map(p => (
                        <option key={p} value={p} disabled={p !== 'mock' && !availableProviders[p] && !availableProviders[p.split('-')[0]]}>
                          {PROVIDER_LABELS[p] || p}{p !== 'mock' && !availableProviders[p] && !availableProviders[p.split('-')[0]] ? ' (no key)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

            <div className="upload-panel-action-row">
              <input
                type="text"
                placeholder={t ? '영화 ID / 제목 (선택사항)' : 'Movie ID / Title (optional)'}
                value={movieId}
                onChange={(e) => onMovieIdChange(e.target.value)}
                className="input-glass"
              />
              {mode === 'analyzing' ? (
                <button className="btn-cancel" onClick={onCancel}>
                  <Square size={14} /> {t ? '중지' : 'Stop'}
                </button>
              ) : (
                <button
                  className="btn-analyze"
                  disabled={!selectedFile}
                  onClick={onAnalyze}
                >
                  {t ? '분석' : 'Analyze'}
                </button>
              )}
            </div>

            {uploadError && (
              <div className="upload-error">
                <AlertCircle size={16} /> {uploadError}
              </div>
            )}
          </>
        )}
      </div>

      <div className="glass-panel history-panel">
        <h3>
          <Clock size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
          {t ? '최근 리포트' : 'Recent Reports'}
        </h3>
        <div className="history-list">
          {reports.length === 0 ? (
            <div className="history-empty">
              {t ? '리포트 없음' : 'No reports yet'}
            </div>
          ) : (
            reports.map((report: any) => (
              <div
                key={report.scriptId}
                className="history-item"
                onClick={() => onLoadReport(report.scriptId)}
              >
                <FileText size={14} style={{ color: 'var(--accent-gold)', flexShrink: 0 }} />
                <div className="history-item-content">
                  <div className="history-item-title">
                    {report.scriptId}
                  </div>
                  <div className="history-item-meta">
                    {report.summary.predictedRating} / {report.summary.predictedRoi}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
