'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface PhaseSectionProps {
  id: string;
  number: number;
  title: string;
  titleKo: string;
  locale?: 'en' | 'ko';
  defaultExpanded?: boolean;
  expanded?: boolean;
  onToggle?: (id: string) => void;
  children: React.ReactNode;
}

export default function PhaseSection({
  id,
  number,
  title,
  titleKo,
  locale = 'en',
  defaultExpanded = true,
  expanded: controlledExpanded,
  onToggle,
  children,
}: PhaseSectionProps) {
  const ko = locale === 'ko';
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const bodyRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    if (onToggle) {
      onToggle(id);
    } else {
      setInternalExpanded(prev => !prev);
    }
  };

  return (
    <section id={id} className="phase-section">
      {/* Print-only section header */}
      <div className="print-section-header print-only" style={{ width: '100%' }}>
        <span className="print-section-number">{number}</span> {ko ? titleKo : title}
      </div>

      {/* Interactive phase header */}
      <div
        className={`phase-header no-print ${isExpanded ? 'phase-header-expanded' : ''}`}
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleToggle(); }}
      >
        <div className="phase-header-left">
          <span className="phase-number">{number}</span>
          <h2 className="phase-title">{ko ? titleKo : title}</h2>
        </div>
        <span className="phase-toggle">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </span>
      </div>

      {/* Collapsible body */}
      <div
        ref={bodyRef}
        className={`phase-body ${isExpanded ? 'phase-body-expanded' : 'phase-body-collapsed'}`}
      >
        {children}
      </div>
    </section>
  );
}
