'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Download, Globe, Loader2, Sparkles } from 'lucide-react';
import './dashboard.css';

import UploadPanel, { ENGINE_LABELS, PROVIDER_LABELS } from './components/UploadPanel';
import type { Strategy, ProviderChoice, MarketLocale, ViewMode, ModelChoice } from './components/UploadPanel';
import CoverageReport from './components/CoverageReport';
import ProductionBreakdown from './components/ProductionBreakdown';
import EmotionChart from './components/EmotionChart';
import CharacterIntelligence from './components/CharacterIntelligence';
import NarrativeArcPanel from './components/NarrativeArcPanel';
import MarketPredictions from './components/MarketPredictions';
import BeatSheetTimeline from './components/BeatSheetTimeline';
import SectionNav from './components/SectionNav';
import AnalysisProgress from './components/AnalysisProgress';
import ReportCover from './components/ReportCover';
import ChatPanel from './components/ChatPanel';
import SceneExplorer from './components/SceneExplorer';
import DraftComparison from './components/DraftComparison';
import StatisticalROIPanel from './components/StatisticalROIPanel';
import PhaseSection from './components/PhaseSection';
import InvestmentVerdict from './components/InvestmentVerdict';
import { generateExportFileName } from './utils/naming';

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="dashboard-grid"><main className="main-content" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}><Loader2 className="animate-spin" size={32} /></main></div>}>
      <Dashboard />
    </Suspense>
  );
}

function Dashboard() {
  const [mode, setMode] = useState<ViewMode>('idle');
  const [data, setData] = useState<any>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [movieId, setMovieId] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [reports, setReports] = useState<any[]>([]);
  const [strategy, setStrategy] = useState<Strategy>('custom');
  const [selectedModel, setSelectedModel] = useState<ModelChoice>('gemini-pro');
  const [market, setMarket] = useState<MarketLocale>('korean');
  const [customProviders, setCustomProviders] = useState<Record<string, ProviderChoice>>({
    beatSheet: 'gemini-pro',
    emotion: 'gemini-pro',
    rating: 'gemini-pro',
    roi: 'gemini-pro',
    coverage: 'gemini-pro',
    vfx: 'gemini-pro',
    trope: 'gemini-pro',
  });

  // When a model is selected, set all engines to that provider
  const handleModelChange = useCallback((model: ModelChoice) => {
    setSelectedModel(model);
    if (model !== 'custom') {
      setStrategy('custom');
      const provider = model as ProviderChoice;
      setCustomProviders({
        beatSheet: provider,
        emotion: provider,
        rating: provider,
        roi: provider,
        coverage: provider,
        vfx: provider,
        trope: provider,
      });
    } else {
      setStrategy('custom');
    }
  }, []);
  const [availableProviders, setAvailableProviders] = useState<Record<string, boolean>>({});
  const [locale, setLocale] = useState<'en' | 'ko'>('ko');
  const [translatedData, setTranslatedData] = useState<any>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const translationCache = useRef<Map<string, any>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Phase expand/collapse state
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(
    new Set(['verdict', 'financials'])
  );

  const togglePhase = useCallback((id: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandPhase = useCallback((id: string) => {
    setExpandedPhases(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const searchParams = useSearchParams();

  useEffect(() => {
    fetchReportHistory();
    fetch('http://localhost:4005/providers')
      .then(r => r.json())
      .then(d => setAvailableProviders(d.available || {}))
      .catch(() => {});
  }, []);

  // URL query parameter support for automated export
  useEffect(() => {
    const reportId = searchParams.get('reportId');
    const paramLocale = searchParams.get('locale');
    const expandAll = searchParams.get('expandAll');

    if (!reportId) return;

    if (expandAll === 'true') {
      setExpandedPhases(new Set(['verdict', 'financials', 'quality', 'production', 'deep-dive']));
    }
    if (paramLocale === 'ko') {
      setLocale('ko');
    }

    // Load the report
    (async () => {
      setMode('analyzing');
      try {
        const res = await fetch(`http://localhost:4005/report/${encodeURIComponent(reportId)}`);
        if (!res.ok) throw new Error('Failed to load report');
        const result = await res.json();
        setData(result);
        setTranslatedData(null);
        setMode('viewing');
      } catch (err: any) {
        setUploadError(err.message);
        setMode('idle');
      }
    })();
  }, [searchParams]);

  const translateReport = useCallback(async (report: any) => {
    const cacheKey = report.scriptId;
    if (translationCache.current.has(cacheKey)) {
      setTranslatedData(translationCache.current.get(cacheKey));
      return;
    }
    setIsTranslating(true);
    try {
      const res = await fetch('http://localhost:4005/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report, targetLanguage: 'ko', strategy }),
      });
      if (!res.ok) throw new Error('Translation failed');
      const translated = await res.json();
      translationCache.current.set(cacheKey, translated);
      setTranslatedData(translated);
    } catch {
      // keep original data on failure
    } finally {
      setIsTranslating(false);
    }
  }, [strategy]);

  useEffect(() => {
    if (locale === 'ko' && data && !translatedData) {
      translateReport(data);
    }
  }, [locale, data, translatedData, translateReport]);

  // Export-ready signal for Playwright automation
  useEffect(() => {
    if (mode !== 'viewing' || !data) {
      (window as any).__EXPORT_READY = false;
      return;
    }
    // For KO locale, wait until translation completes
    if (locale === 'ko' && isTranslating) {
      (window as any).__EXPORT_READY = false;
      return;
    }
    // For KO locale, also wait until translatedData is populated
    if (locale === 'ko' && !translatedData) {
      (window as any).__EXPORT_READY = false;
      return;
    }
    (window as any).__EXPORT_READY = true;
  }, [mode, data, locale, isTranslating, translatedData]);

  async function fetchReportHistory() {
    try {
      const res = await fetch('http://localhost:4005/reports?pageSize=10');
      if (res.ok) {
        const result = await res.json();
        setReports(result.data || []);
      }
    } catch {
      // silently fail — history is optional
    }
  }

  async function handleAnalyze() {
    if (!selectedFile) return;
    setMode('analyzing');
    setUploadError(null);

    try {
      const isPdf = selectedFile.name.endsWith('.pdf');
      let bodyPayload: Record<string, unknown>;

      if (isPdf) {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((s, b) => s + String.fromCharCode(b), '')
        );
        bodyPayload = { scriptBase64: base64, isPdf: true, movieId: movieId.trim() || undefined };
      } else {
        const scriptText = await selectedFile.text();
        bodyPayload = { scriptText, movieId: movieId.trim() || undefined };
      }

      bodyPayload.fileName = selectedFile.name;
      bodyPayload.strategy = strategy;
      bodyPayload.market = market;
      bodyPayload.customProviders = customProviders;

      abortControllerRef.current = new AbortController();
      const res = await fetch('http://localhost:4005/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Analysis failed (${res.status}): ${errBody}`);
      }

      const result = await res.json();
      setData(result);
      setTranslatedData(null);
      setMode('viewing');
      fetchReportHistory();
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setUploadError(err.message || 'Analysis failed. Is the API running?');
      setMode('idle');
    }
  }

  function handleCancel() {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setMode('idle');
  }

  async function loadReport(scriptId: string) {
    setMode('analyzing');
    setUploadError(null);
    try {
      const res = await fetch(`http://localhost:4005/report/${encodeURIComponent(scriptId)}`);
      if (!res.ok) throw new Error('Failed to load report');
      const result = await res.json();
      setData(result);
      setTranslatedData(null);
      setMode('viewing');
    } catch (err: any) {
      setUploadError(err.message);
      setMode('idle');
    }
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.fountain') || file.name.endsWith('.txt') || file.name.endsWith('.pdf'))) {
      setSelectedFile(file);
      setUploadError(null);
    } else {
      setUploadError('Please drop a .fountain, .txt, or .pdf file');
    }
  }

  function handleFileSelect() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.fountain,.txt,.pdf';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        setSelectedFile(file);
        setUploadError(null);
      }
    };
    input.click();
  }

  function resetToIdle() {
    setMode('idle');
    setData(null);
    setTranslatedData(null);
    setSelectedFile(null);
    setUploadError(null);
    setMovieId('');
  }

  const ko = locale === 'ko';
  const displayData = (ko && translatedData) ? translatedData : data;

  return (
    <div className="dashboard-bg">
    <main className="dashboard-container" aria-label="Script Intelligence Dashboard">
      <a href="#verdict" className="skip-link">Skip to results</a>
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <Link href="/" className="dashboard-home-link" title={ko ? '홈으로' : 'Home'}>
            <Sparkles size={18} />
          </Link>
          <div>
            <h1 className="dashboard-title">{ko ? '시나리오 분석' : 'Script Intelligence'}</h1>
            <p className="dashboard-subtitle">
              {data ? `${ko ? '프로젝트' : 'Project'} ID: ${data.scriptId}` : (ko ? '시나리오를 업로드하여 분석을 시작하세요' : 'Upload a screenplay to begin analysis')}
            </p>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="btn-locale no-print"
            onClick={() => setLocale(prev => prev === 'en' ? 'ko' : 'en')}
            aria-label={ko ? '영어로 전환' : 'Switch to Korean'}
            title={ko ? 'Switch to English' : '한국어로 전환'}
          >
            <Globe size={16} />
            <span>{ko ? 'EN' : 'KO'}</span>
          </button>
          {data && (
            <div className="header-badges">
              <div className="badge badge-r">{ko ? '등급' : 'Rating'}: {data.summary.predictedRating}</div>
              <div className={`badge ${data.summary.predictedRoi === 'Blockbuster' ? 'badge-blockbuster' : 'badge-hit'}`}>
                ROI: {data.summary.predictedRoi}
              </div>
              <button className="btn-export no-print" onClick={() => {
                const originalTitle = document.title;
                document.title = generateExportFileName(data.scriptId);
                window.print();
                setTimeout(() => { document.title = originalTitle; }, 1000);
              }}>
                <Download size={16} /> {ko ? 'PDF 내보내기' : 'Export PDF'}
              </button>
            </div>
          )}
          {isTranslating && (
            <div className="translating-indicator no-print">
              <Loader2 size={14} className="spin-icon" />
              <span>{ko ? '번역 중...' : 'Translating...'}</span>
            </div>
          )}
        </div>
      </header>

      {data?.warning && (
        <div className="warning-banner">
          <AlertCircle size={16} />
          <div>
            <strong>{ko ? '주의' : 'Warning'}:</strong>{' '}
            {ko
              ? 'Mock 데이터가 사용된 항목이 있습니다. 해당 결과는 실제 AI 분석이 아닌 샘플 데이터입니다.'
              : data.warning}
            {data.mockEngines?.length > 0 && (
              <span className="mock-engines">
                {' '}({data.mockEngines.join(', ')})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Provider attribution bar */}
      {data?.providers && (
        <div className="provider-bar">
          {data.strategy && <span className="provider-strategy">{data.strategy.toUpperCase()}</span>}
          {Object.entries(data.providers).map(([engine, prov]: [string, any]) => (
            <span key={engine} className="provider-badge-item">
              <span className="provider-engine">{ENGINE_LABELS[engine] || engine}</span>
              <span className={`provider-name provider-${prov}`}>{PROVIDER_LABELS[prov] || prov}</span>
            </span>
          ))}
        </div>
      )}

      {/* Welcome Hero (idle state) */}
      {!data && mode === 'idle' && (
        <div className="welcome-hero">
          <h2>{ko ? '시나리오 분석을 시작하세요' : 'Start Your Script Analysis'}</h2>
          <p>
            {ko
              ? '시나리오 파일을 업로드하면 AI가 감정 흐름, 캐릭터, 시장성, 제작 타당성을 즉시 분석합니다.'
              : 'Upload a screenplay file and AI will instantly analyze emotion flow, characters, marketability, and production feasibility.'}
          </p>
        </div>
      )}

      {/* Upload + History */}
      <UploadPanel
        mode={mode}
        selectedFile={selectedFile}
        movieId={movieId}
        uploadError={uploadError}
        dragOver={dragOver}
        strategy={strategy}
        selectedModel={selectedModel}
        market={market}
        customProviders={customProviders}
        availableProviders={availableProviders}
        reports={reports}
        locale={locale}
        onSetDragOver={setDragOver}
        onFileDrop={handleFileDrop}
        onFileSelect={handleFileSelect}
        onMovieIdChange={setMovieId}
        onStrategyChange={setStrategy}
        onModelChange={handleModelChange}
        onMarketChange={setMarket}
        onCustomProviderChange={(engine, provider) =>
          setCustomProviders(prev => ({ ...prev, [engine]: provider }))
        }
        onAnalyze={handleAnalyze}
        onCancel={handleCancel}
        onReset={resetToIdle}
        onLoadReport={loadReport}
      />

      {/* Loading Progress */}
      {mode === 'analyzing' && <AnalysisProgress locale={locale} />}

      {/* Phase Navigation */}
      {data && <SectionNav locale={locale} onExpandPhase={expandPhase} />}

      {/* Print-only Report Cover */}
      {data && <ReportCover data={displayData} locale={locale} providers={data?.providers} />}

      {/* ═══════════════════════════════════════════════════
          Phase 1: Investment Verdict — 투자 판정
          ═══════════════════════════════════════════════════ */}
      {data && (
        <PhaseSection
          id="verdict"
          number={1}
          title="Investment Verdict"
          titleKo="투자 판정"
          locale={locale}
          expanded={expandedPhases.has('verdict')}
          onToggle={togglePhase}
          defaultExpanded
        >
          <InvestmentVerdict data={displayData} locale={locale} />
          {data.coverage && (
            <CoverageReport coverage={displayData.coverage} locale={locale} summaryMode />
          )}
        </PhaseSection>
      )}

      {/* ═══════════════════════════════════════════════════
          Phase 2: Financial Viability — 재무 분석
          ═══════════════════════════════════════════════════ */}
      {data && (
        <PhaseSection
          id="financials"
          number={2}
          title="Financial Viability"
          titleKo="재무 분석"
          locale={locale}
          expanded={expandedPhases.has('financials')}
          onToggle={togglePhase}
          defaultExpanded
        >
          <div className="grid-section">
            <MarketPredictions predictions={displayData.predictions} tropes={displayData.tropes} locale={locale} market={data?.market || 'hollywood'} />
            <StatisticalROIPanel
              statisticalRoi={displayData.predictions?.statisticalRoi}
              llmRoi={displayData.predictions?.roi}
              locale={locale}
              market={data?.market || 'hollywood'}
            />
          </div>
        </PhaseSection>
      )}

      {/* ═══════════════════════════════════════════════════
          Phase 3: Content Quality — 콘텐츠 품질
          ═══════════════════════════════════════════════════ */}
      {data && (
        <PhaseSection
          id="quality"
          number={3}
          title="Content Quality"
          titleKo="콘텐츠 품질"
          locale={locale}
          expanded={expandedPhases.has('quality')}
          onToggle={togglePhase}
        >
          {data.coverage && (
            <CoverageReport coverage={displayData.coverage} locale={locale} />
          )}
          <EmotionChart emotionGraph={displayData.emotionGraph} locale={locale} />
          <div className="grid-section">
            <CharacterIntelligence characterNetwork={displayData.characterNetwork} locale={locale} />
          </div>
          {data.narrativeArc && (
            <div className="grid-section">
              <NarrativeArcPanel narrativeArc={displayData.narrativeArc} locale={locale} />
            </div>
          )}
        </PhaseSection>
      )}

      {/* ═══════════════════════════════════════════════════
          Phase 4: Production Feasibility — 제작 타당성
          ═══════════════════════════════════════════════════ */}
      {data?.production && (
        <PhaseSection
          id="production"
          number={4}
          title="Production Feasibility"
          titleKo="제작 타당성"
          locale={locale}
          expanded={expandedPhases.has('production')}
          onToggle={togglePhase}
        >
          <ProductionBreakdown production={displayData.production} locale={locale} market={data?.market || 'hollywood'} />
        </PhaseSection>
      )}

      {/* ═══════════════════════════════════════════════════
          Phase 5: Deep Dive — 상세 분석
          ═══════════════════════════════════════════════════ */}
      {data && (
        <PhaseSection
          id="deep-dive"
          number={5}
          title="Deep Dive"
          titleKo="상세 분석"
          locale={locale}
          expanded={expandedPhases.has('deep-dive')}
          onToggle={togglePhase}
        >
          {reports.length > 1 && (
            <DraftComparison currentScriptId={data.scriptId} reports={reports} locale={locale} />
          )}
          <div className="grid-section">
            <BeatSheetTimeline beatSheet={displayData.beatSheet} locale={locale} />
          </div>
          {displayData.emotionGraph && (
            <div className="grid-section">
              <SceneExplorer
                emotionGraph={displayData.emotionGraph}
                beatSheet={displayData.beatSheet || []}
                production={displayData.production}
                locale={locale}
              />
            </div>
          )}
        </PhaseSection>
      )}

      {/* AI Chat Panel — only visible when analysis results exist */}
      {data && <ChatPanel scriptId={data.scriptId} locale={locale} strategy={strategy} />}
    </main>
    </div>
  );
}
