'use client';

import React, { useState, useEffect } from 'react';

interface Phase {
  id: string;
  label: string;
  labelKo: string;
  icon: string;
  number: number;
}

const PHASES: Phase[] = [
  { id: 'verdict',    label: 'Verdict',    labelKo: '투자 판정',   icon: '🎯', number: 1 },
  { id: 'financials', label: 'Financials', labelKo: '재무 분석',   icon: '💰', number: 2 },
  { id: 'quality',    label: 'Quality',    labelKo: '콘텐츠 품질', icon: '📋', number: 3 },
  { id: 'production', label: 'Production', labelKo: '제작 타당성', icon: '🎬', number: 4 },
  { id: 'deep-dive',  label: 'Deep Dive',  labelKo: '상세 분석',   icon: '🔍', number: 5 },
];

interface SectionNavProps {
  locale?: 'en' | 'ko';
  onExpandPhase?: (id: string) => void;
}

export default function SectionNav({ locale = 'en', onExpandPhase }: SectionNavProps) {
  const ko = locale === 'ko';
  const [activePhase, setActivePhase] = useState('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActivePhase(entry.target.id);
          }
        }
      },
      { rootMargin: '-10% 0px -70% 0px' }
    );

    for (const phase of PHASES) {
      const el = document.getElementById(phase.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  function scrollTo(id: string) {
    onExpandPhase?.(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const activeIndex = PHASES.findIndex(p => p.id === activePhase);

  return (
    <nav className="phase-nav no-print" aria-label={ko ? '분석 단계 탐색' : 'Analysis phase navigation'}>
      {PHASES.map((phase, idx) => {
        const isActive = activePhase === phase.id;
        const isCompleted = activeIndex > idx;

        return (
          <React.Fragment key={phase.id}>
            {idx > 0 && (
              <div className={`phase-nav-connector ${isCompleted ? 'connector-completed' : ''}`} />
            )}
            <button
              className={`phase-nav-step ${isActive ? 'step-active' : ''} ${isCompleted ? 'step-completed' : ''}`}
              onClick={() => scrollTo(phase.id)}
              title={ko ? phase.labelKo : phase.label}
            >
              <span className="phase-nav-number">
                {isCompleted ? '✓' : phase.number}
              </span>
              <span className="phase-nav-label">{ko ? phase.labelKo : phase.label}</span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}
