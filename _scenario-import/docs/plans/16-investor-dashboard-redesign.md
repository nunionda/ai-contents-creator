# Plan: Investor-Focused 5-Phase Dashboard Redesign

## Overview
온데스크(itsondesk.com) 플랫폼의 투자자 중심 분석 프로세스를 참고하여, 대시보드를 8개 플랫 섹션에서 5단계 투자 의사결정 플로우로 재구성. Progressive Disclosure 패턴으로 투자자가 10초 안에 판단 → 필요 시 상세 분석으로 진입하는 구조.

## Scope

### Phase 1: Investment Verdict (투자 판정)
- InvestmentVerdict hero component: 대형 Recommend/Consider/Pass 배지, SVG 스코어 링, ROI 등급 배지
- 4개 핵심 스탯 카드 (주인공, ROI 배수, 등장인물, 장면 수)
- CoverageReport summaryMode (점수 + 판정만)

### Phase 2: Financial Viability (재무 분석)
- MarketPredictions + StatisticalROIPanel 그룹핑

### Phase 3: Content Quality (콘텐츠 품질)
- CoverageReport (전체), EmotionChart, CharacterIntelligence, NarrativeArcPanel

### Phase 4: Production Feasibility (제작 타당성)
- ProductionBreakdown

### Phase 5: Deep Dive (상세 분석)
- DraftComparison, BeatSheetTimeline, SceneExplorer

### Navigation
- SectionNav: 8-탭 세로 필 → 5-Phase 수평 스테퍼 (번호 원 + 연결선 + active/completed 상태)

### Progressive Disclosure
- PhaseSection 래퍼: 접기/펼치기 게이트
- Phase 1-2 기본 펼침, Phase 3-5 기본 접힘
- 스테퍼 클릭 → 해당 Phase 스크롤 + 자동 펼침

### Print/PDF
- @media print: 모든 Phase 강제 펼침, phase-nav/phase-header 숨김

## Key Files
- `apps/web/src/app/dashboard/page.tsx`
- `apps/web/src/app/dashboard/dashboard.css`
- `apps/web/src/app/dashboard/components/PhaseSection.tsx` (신규)
- `apps/web/src/app/dashboard/components/InvestmentVerdict.tsx` (신규)
- `apps/web/src/app/dashboard/components/SectionNav.tsx`
- `apps/web/src/app/dashboard/components/CoverageReport.tsx`
- `apps/web/src/app/dashboard/components/ReportCover.tsx`
