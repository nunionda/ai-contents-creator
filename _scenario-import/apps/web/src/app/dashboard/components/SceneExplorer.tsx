'use client';

import React, { useState, useMemo } from 'react';
import { Filter, MapPin, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import './SceneExplorer.css';

/* ─── Types ─── */

interface EmotionPoint {
  sceneNumber: number;
  score: number;
  dominantEmotion: string;
  explanation: string;
  tension: number;
  humor: number;
  engagement: 'high' | 'medium' | 'low';
}

interface Beat {
  act: number;
  name: string;
  sceneStart: number;
  sceneEnd: number;
  description: string;
}

interface Location {
  name: string;
  setting: string;
  time: string;
  sceneNumbers: number[];
}

interface VfxRequirement {
  sceneNumber: number;
  description: string;
  tier: string;
}

interface SceneExplorerProps {
  emotionGraph: EmotionPoint[];
  beatSheet: Beat[];
  production?: {
    locations?: Location[];
    vfxRequirements?: VfxRequirement[];
  };
  locale: 'en' | 'ko';
}

/* ─── Filter Types ─── */

type EngagementFilter = 'all' | 'high' | 'medium' | 'low';
type EmotionFilter = 'all' | 'positive' | 'negative' | 'neutral';
type TensionFilter = 'all' | 'high' | 'medium' | 'low';
type ActFilter = 'all' | 1 | 2 | 3;

/* ─── Component ─── */

export default function SceneExplorer({
  emotionGraph,
  beatSheet,
  production,
  locale,
}: SceneExplorerProps) {
  const ko = locale === 'ko';

  const [engagementFilter, setEngagementFilter] = useState<EngagementFilter>('all');
  const [emotionFilter, setEmotionFilter] = useState<EmotionFilter>('all');
  const [tensionFilter, setTensionFilter] = useState<TensionFilter>('all');
  const [actFilter, setActFilter] = useState<ActFilter>('all');
  const [expandedScene, setExpandedScene] = useState<number | null>(null);

  /* ─── Lookup Maps ─── */

  const sceneBeatMap = useMemo(() => {
    const map = new Map<number, Beat>();
    for (const beat of beatSheet) {
      for (let s = beat.sceneStart; s <= beat.sceneEnd; s++) {
        map.set(s, beat);
      }
    }
    return map;
  }, [beatSheet]);

  const sceneLocationMap = useMemo(() => {
    const map = new Map<number, Location>();
    if (production?.locations) {
      for (const loc of production.locations) {
        for (const sn of loc.sceneNumbers) {
          map.set(sn, loc);
        }
      }
    }
    return map;
  }, [production?.locations]);

  const sceneVfxMap = useMemo(() => {
    const map = new Map<number, VfxRequirement>();
    if (production?.vfxRequirements) {
      for (const vfx of production.vfxRequirements) {
        map.set(vfx.sceneNumber, vfx);
      }
    }
    return map;
  }, [production?.vfxRequirements]);

  /* ─── Scene-to-Act Mapping ─── */

  const sceneActMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const beat of beatSheet) {
      for (let s = beat.sceneStart; s <= beat.sceneEnd; s++) {
        map.set(s, beat.act);
      }
    }
    return map;
  }, [beatSheet]);

  /* ─── Filtering Logic ─── */

  const filteredScenes = useMemo(() => {
    return emotionGraph.filter((scene) => {
      // Engagement filter
      if (engagementFilter !== 'all' && scene.engagement !== engagementFilter) {
        return false;
      }

      // Emotion filter
      if (emotionFilter === 'positive' && scene.score <= 2) return false;
      if (emotionFilter === 'negative' && scene.score >= -2) return false;
      if (emotionFilter === 'neutral' && (scene.score > 2 || scene.score < -2)) return false;

      // Tension filter
      if (tensionFilter === 'high' && scene.tension <= 7) return false;
      if (tensionFilter === 'medium' && (scene.tension < 4 || scene.tension > 7)) return false;
      if (tensionFilter === 'low' && scene.tension >= 4) return false;

      // Act filter
      if (actFilter !== 'all') {
        const act = sceneActMap.get(scene.sceneNumber);
        if (act !== actFilter) return false;
      }

      return true;
    });
  }, [emotionGraph, engagementFilter, emotionFilter, tensionFilter, actFilter, sceneActMap]);

  /* ─── Helpers ─── */

  function getEmotionBarWidth(score: number): number {
    // score ranges from -10 to 10; bar represents magnitude as percentage of half-width
    return Math.min(Math.abs(score) * 5, 50); // 50% max fill per side
  }

  function toggleExpand(sceneNumber: number) {
    setExpandedScene((prev) => (prev === sceneNumber ? null : sceneNumber));
  }

  /* ─── Render ─── */

  return (
    <div className="scene-explorer">
      <div className="scene-explorer-panel">
        {/* Header */}
        <div className="scene-explorer-header">
          <h3 className="scene-explorer-title">
            <Filter size={20} />
            {ko ? '장면 탐색기' : 'Scene Explorer'}
          </h3>
          <span className="scene-explorer-count">
            {filteredScenes.length} / {emotionGraph.length}{' '}
            {ko ? '장면' : 'scenes'}
          </span>
        </div>

        {/* Filters */}
        <div className="scene-explorer-filters no-print">
          {/* Engagement */}
          <div className="scene-filter-row">
            <span className="scene-filter-label">
              {ko ? '몰입도' : 'Engagement'}
            </span>
            <div className="scene-filter-chips">
              {(
                [
                  { key: 'all', label: ko ? '전체' : 'All' },
                  { key: 'high', label: ko ? '높음' : 'High' },
                  { key: 'medium', label: ko ? '보통' : 'Medium' },
                  { key: 'low', label: ko ? '낮음' : 'Low' },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  className={`scene-filter-chip${engagementFilter === key ? ' active' : ''}`}
                  onClick={() => setEngagementFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Emotion */}
          <div className="scene-filter-row">
            <span className="scene-filter-label">
              {ko ? '감정' : 'Emotion'}
            </span>
            <div className="scene-filter-chips">
              {(
                [
                  { key: 'all', label: ko ? '전체' : 'All' },
                  { key: 'positive', label: ko ? '긍정' : 'Positive' },
                  { key: 'negative', label: ko ? '부정' : 'Negative' },
                  { key: 'neutral', label: ko ? '중립' : 'Neutral' },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  className={`scene-filter-chip${emotionFilter === key ? ' active' : ''}`}
                  onClick={() => setEmotionFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tension */}
          <div className="scene-filter-row">
            <span className="scene-filter-label">
              {ko ? '긴장감' : 'Tension'}
            </span>
            <div className="scene-filter-chips">
              {(
                [
                  { key: 'all', label: ko ? '전체' : 'All' },
                  { key: 'high', label: ko ? '높음 (>7)' : 'High (>7)' },
                  { key: 'medium', label: ko ? '보통 (4-7)' : 'Medium (4-7)' },
                  { key: 'low', label: ko ? '낮음 (<4)' : 'Low (<4)' },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  className={`scene-filter-chip${tensionFilter === key ? ' active' : ''}`}
                  onClick={() => setTensionFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Act */}
          <div className="scene-filter-row">
            <span className="scene-filter-label">
              {ko ? '막' : 'Act'}
            </span>
            <div className="scene-filter-chips">
              {(
                [
                  { key: 'all' as const, label: ko ? '전체' : 'All' },
                  { key: 1 as const, label: ko ? '제1막' : 'Act 1' },
                  { key: 2 as const, label: ko ? '제2막' : 'Act 2' },
                  { key: 3 as const, label: ko ? '제3막' : 'Act 3' },
                ]
              ).map(({ key, label }) => (
                <button
                  key={String(key)}
                  className={`scene-filter-chip${actFilter === key ? ' active' : ''}`}
                  onClick={() => setActFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scene Cards Grid */}
        {filteredScenes.length === 0 ? (
          <div className="scene-explorer-empty">
            <Filter size={32} />
            <p className="scene-explorer-empty-text">
              {ko
                ? '현재 필터 조건에 맞는 장면이 없습니다.'
                : 'No scenes match the current filters.'}
            </p>
          </div>
        ) : (
          <div className="scene-cards-grid">
            {filteredScenes.map((scene) => {
              const beat = sceneBeatMap.get(scene.sceneNumber);
              const location = sceneLocationMap.get(scene.sceneNumber);
              const vfx = sceneVfxMap.get(scene.sceneNumber);
              const isExpanded = expandedScene === scene.sceneNumber;
              const barWidth = getEmotionBarWidth(scene.score);
              const isPositive = scene.score >= 0;

              return (
                <div
                  key={scene.sceneNumber}
                  className={`scene-card${isExpanded ? ' expanded' : ''}`}
                  onClick={() => toggleExpand(scene.sceneNumber)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  aria-label={`${ko ? '장면' : 'Scene'} ${scene.sceneNumber}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleExpand(scene.sceneNumber);
                    }
                  }}
                >
                  {/* Top Row: Scene Number + Beat Tag */}
                  <div className="scene-card-top">
                    <span className="scene-number-badge">
                      #{scene.sceneNumber}
                    </span>
                    {beat && (
                      <span className="scene-beat-tag" title={beat.name}>
                        {beat.name}
                      </span>
                    )}
                  </div>

                  {/* Emotion Score Bar */}
                  <div className="scene-emotion-bar-container">
                    <div className="scene-emotion-bar-track">
                      <div className="scene-emotion-bar-center" />
                      <div
                        className={`scene-emotion-bar-fill ${isPositive ? 'positive' : 'negative'}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>

                  {/* Tags Row: Emotion + Engagement */}
                  <div className="scene-tags-row">
                    <span className="scene-emotion-tag">
                      {scene.dominantEmotion}
                    </span>
                    <span
                      className={`scene-engagement-badge ${scene.engagement}`}
                    >
                      {scene.engagement === 'high'
                        ? ko ? '높음' : 'HIGH'
                        : scene.engagement === 'medium'
                          ? ko ? '보통' : 'MED'
                          : ko ? '낮음' : 'LOW'}
                    </span>
                  </div>

                  {/* Tension & Humor Meters */}
                  <div className="scene-meters">
                    <div className="scene-meter">
                      <div className="scene-meter-label">
                        <span>{ko ? '긴장' : 'Tension'}</span>
                        <span className="scene-meter-value">
                          {scene.tension}/10
                        </span>
                      </div>
                      <div className="scene-meter-track">
                        <div
                          className="scene-meter-fill tension"
                          style={{ width: `${scene.tension * 10}%` }}
                        />
                      </div>
                    </div>
                    <div className="scene-meter">
                      <div className="scene-meter-label">
                        <span>{ko ? '유머' : 'Humor'}</span>
                        <span className="scene-meter-value">
                          {scene.humor}/10
                        </span>
                      </div>
                      <div className="scene-meter-track">
                        <div
                          className="scene-meter-fill humor"
                          style={{ width: `${scene.humor * 10}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Location & VFX Meta */}
                  {(location || vfx) && (
                    <div className="scene-meta-row">
                      {location && (
                        <span className="scene-location-tag">
                          <MapPin size={11} />
                          {location.name}
                        </span>
                      )}
                      {vfx && (
                        <span className="scene-vfx-tag">
                          <Zap size={11} />
                          VFX
                        </span>
                      )}
                    </div>
                  )}

                  {/* Explanation */}
                  <p
                    className={`scene-explanation${!isExpanded ? ' truncated' : ''}`}
                  >
                    {scene.explanation}
                  </p>

                  {/* Expand/Collapse Toggle */}
                  <button
                    className="scene-expand-toggle"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(scene.sceneNumber);
                    }}
                    aria-label={isExpanded ? (ko ? '접기' : 'Collapse') : (ko ? '펼치기' : 'Expand')}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp size={14} />
                        {ko ? '접기' : 'Less'}
                      </>
                    ) : (
                      <>
                        <ChevronDown size={14} />
                        {ko ? '더 보기' : 'More'}
                      </>
                    )}
                  </button>

                  {/* Expanded Detail Section */}
                  {isExpanded && (
                    <div className="scene-detail-section">
                      {/* Beat Context */}
                      {beat && (
                        <div className="scene-detail-block">
                          <div className="scene-detail-label">
                            {ko ? '비트 컨텍스트' : 'Beat Context'}
                          </div>
                          <p className="scene-detail-text">
                            <strong>{beat.name}</strong> ({ko ? '제' : 'Act '}
                            {beat.act}
                            {ko ? '막' : ''}, {ko ? '장면' : 'Scenes'}{' '}
                            {beat.sceneStart}&ndash;{beat.sceneEnd})
                          </p>
                          <p className="scene-detail-text">{beat.description}</p>
                        </div>
                      )}

                      {/* Location Details */}
                      {location && (
                        <div className="scene-detail-block">
                          <div className="scene-detail-label">
                            {ko ? '촬영지 정보' : 'Location Details'}
                          </div>
                          <p className="scene-detail-text">
                            <MapPin
                              size={12}
                              style={{
                                verticalAlign: 'middle',
                                marginRight: '0.3rem',
                                color: 'var(--accent-blue)',
                              }}
                            />
                            {location.name} &mdash; {location.setting},{' '}
                            {location.time}
                          </p>
                        </div>
                      )}

                      {/* VFX Details */}
                      {vfx && (
                        <div className="scene-detail-block">
                          <div className="scene-detail-label">
                            {ko ? 'VFX 요구사항' : 'VFX Requirements'}
                            <span
                              className={`scene-detail-vfx-tier ${vfx.tier.toLowerCase()}`}
                            >
                              {vfx.tier}
                            </span>
                          </div>
                          <p className="scene-detail-text">{vfx.description}</p>
                        </div>
                      )}

                      {/* Full Emotion Score */}
                      <div className="scene-detail-block">
                        <div className="scene-detail-label">
                          {ko ? '감정 점수' : 'Emotion Score'}
                        </div>
                        <p className="scene-detail-text">
                          {scene.dominantEmotion} &mdash;{' '}
                          <span
                            style={{
                              fontWeight: 700,
                              color:
                                scene.score >= 0
                                  ? 'var(--color-success)'
                                  : 'var(--color-danger)',
                            }}
                          >
                            {scene.score > 0 ? '+' : ''}
                            {scene.score}
                          </span>
                          /10
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
