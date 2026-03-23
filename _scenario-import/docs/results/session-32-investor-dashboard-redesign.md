# Session 32: Investor-Focused 5-Phase Dashboard Redesign

## Objective
온데스크 플랫폼 프로세스를 참고하여 대시보드를 투자 의사결정 5단계 플로우로 재구성. 투자자가 빠르게 판단하고 필요 시 상세 분석으로 진입하는 Progressive Disclosure 패턴 적용.

## Changes

### New Components (2 files)
- **PhaseSection.tsx** — 접기/펼치기 래퍼 컴포넌트
  - Props: `id, number, title, titleKo, locale, expanded, onToggle, children`
  - Phase 번호 골드 배지 + 제목 + ChevronUp/Down 토글
  - `phase-body-expanded` / `phase-body-collapsed` CSS 트랜지션
  - Print: `.phase-header` 숨김, `.phase-body` 강제 펼침

- **InvestmentVerdict.tsx** — Phase 1 히어로 컴포넌트
  - 대형 판정 배지 (RECOMMEND/CONSIDER/PASS, 컬러 코딩)
  - SVG 스코어 링 (120x120, stroke-dasharray 애니메이션)
  - ROI 등급 + 배수 배지
  - 로그라인 인용구
  - 4개 스탯 카드 그리드 (page.tsx에서 이동)

### Modified Components (5 files)
- **SectionNav.tsx** — 8-탭 세로 필 → 5-Phase 수평 스테퍼
  - `PHASES` 배열: verdict, financials, quality, production, deep-dive
  - `.phase-nav-step` + `.phase-nav-connector` 수평 레이아웃
  - `step-active` (blue glow), `step-completed` (green check) 상태
  - `onExpandPhase` 콜백으로 접힌 Phase 자동 펼침
  - 모바일: 라벨 숨기고 번호만 표시

- **CoverageReport.tsx** — `summaryMode` prop 추가
  - `summaryMode=true`: 전체 점수 + 판정 헤더만 표시
  - 카테고리, 시놉시스, 강점/약점, 시장성, 추천 섹션 숨김

- **ReportCover.tsx** — TOC 업데이트
  - 7개 섹션 → 5개 Phase (Investment Verdict, Financial Viability, Content Quality, Production Feasibility, Deep Dive)

- **page.tsx** — 핵심 구조 변경
  - `expandedPhases` 상태 (`Set<string>`, 기본: verdict + financials)
  - `grid-layout` 래퍼 제거 → PhaseSection 래퍼로 교체
  - 컴포넌트 순서 재배치 (투자 판정 → 재무 → 품질 → 제작 → 상세)
  - 스탯 카드 인라인 JSX → InvestmentVerdict 컴포넌트로 이동

- **dashboard.css** — ~370줄 추가/변경
  - `.phase-nav` — sticky 수평 스테퍼 (backdrop-blur)
  - `.phase-nav-step`, `.phase-nav-number`, `.phase-nav-connector`
  - `.phase-section`, `.phase-header`, `.phase-body`
  - `.verdict-hero`, `.verdict-top-row`, `.verdict-badge-large`, `.verdict-score-ring`
  - `.verdict-stats-row` (4-column grid → 2-column @768px → 1-column @480px)
  - `@media print`: phase-body 강제 펼침, phase-nav/header 숨김

## Layout Structure (Before → After)

### Before (Flat 8-section scroll)
```
Header → Upload → Coverage → Production → Stats/Emotion → Characters → Arc → Market → Beats → Scenes
```

### After (5-Phase investment flow)
```
Header → Upload → Phase Nav (sticky stepper)
├─ Phase 1: Verdict (expanded) — InvestmentVerdict + Coverage summary
├─ Phase 2: Financials (expanded) — MarketPredictions + StatisticalROI
├─ Phase 3: Quality (collapsed) — Coverage full + Emotion + Characters + Arc
├─ Phase 4: Production (collapsed) — ProductionBreakdown
└─ Phase 5: Deep Dive (collapsed) — DraftComparison + Beats + Scenes
```

## Verification
- `npm run build` — 성공 (TypeScript 컴파일 + 정적 페이지 생성)
- Preview 확인: Phase 스테퍼 네비, Verdict 히어로, 접기/펼치기 동작 정상
- Phase 1-2 기본 펼침, 3-5 기본 접힘 확인

## How to Run
```bash
cd apps/web && npm run dev    # http://localhost:4000/dashboard
```
