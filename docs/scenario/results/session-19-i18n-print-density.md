# Result: Session 19 — Full i18n, Character Robustness & PDF Density

## Overview
Three targeted fixes: comprehensive Korean/English translations across all dashboard components, Character Prominence robustness for legacy report formats, and a dense professional PDF export layout.

## Changes

### 1. KO/EN Toggle — Full i18n Coverage
- **Before:** Toggle button state worked but only UploadPanel and warning banner translated — users saw no visible change
- **After:** All 8 dashboard components now respond to locale toggle
- Translated labels in:
  - **page.tsx**: title (시나리오 분석), subtitle, stat cards (주인공, ROI 배수, 등장인물, 장면 수), header badges (등급), export button (PDF 내보내기)
  - **CoverageReport**: 시나리오 커버리지 리포트, score labels (우수/양호/보통/미흡), 강점/약점, 시놉시스, 애널리스트 의견, 모두 펼치기/접기
  - **CharacterIntelligence**: 캐릭터 비중, 캐릭터 관계, 보이스 고유성, 대사 분포, 주연 비율, 상위 3인 비율, 중심성 격차
  - **EmotionChart**: 감정 밸런스 아크, 장면 tooltip
  - **BeatSheetTimeline**: 비트 시트, 제N막, N 비트
  - **MarketPredictions**: ROI 분석, 등급/배수/신뢰도, 콘텐츠 등급, 서사 트로프, 비교 작품, 예산/수익
  - **ProductionBreakdown**: 제작 타당성, 촬영 일수, 촬영지, 대사 배역, VFX 점수, 예산 추정, VFX 요구사항, 캐스트 구성
  - **NarrativeArcPanel**: 서사 아크, 전환점, 장르 적합성, 페이싱 이슈
- Button styling made more prominent: gold border + gold text + press animation
- **Files:** `page.tsx`, all 7 component files, `dashboard.css`

### 2. Character Prominence — Legacy Format Robustness
- Old reports (e.g. `script-1774081499294`) store `characterNetwork` as a flat array `[{name, role, totalLines, totalWords}]` without `edges`, `diversityMetrics`, or `voiceScore`
- Added explicit `Array.isArray()` guard for safer type detection
- Added empty-state fallback with localized "No character data available" message
- Added `totalWords` display as secondary metric for old-format reports
- Used index-composite keys (`${char.name}-${idx}`) to prevent duplicate React key warnings
- **Files:** `CharacterIntelligence.tsx`

### 3. PDF Export — Dense Professional Layout
- **Page margins** reduced: 15mm×20mm → 12mm×15mm
- **Base font** reduced: 10pt → 9pt, tighter line-height (1.4)
- **Headings** reduced: h1 16pt, h2 12pt, h3 10pt, section headers 11pt
- **Glass panels** compact: padding 0.6rem, margin 0.4rem, border-radius 4px
- **Stat cards**: tighter padding, 8pt labels, smaller icons
- **Emotion chart**: 280px → 220px height
- **Coverage**: 2-column category grid, compact subcategories, hidden expand/collapse buttons
- **Character panels**: side-by-side (2×48% inline-block) for Prominence + Relationships
- **Market ROI + Rating**: side-by-side (58% + 39%)
- **Beat Sheet**: 3-column grid with smaller text (8.5pt names, 7.5pt descriptions)
- **Report Cover**: proportionally reduced (30pt title, 2.5rem padding)
- **Production**: own page break, compact stat labels, tighter grids
- **Hidden in print**: `.btn-toggle-all`, `.coverage-categories-header`
- Added `score-circle` and `category-score-badge` to color preservation list
- **Files:** `dashboard.css`

## Files Changed

| File | Changes |
|------|---------|
| `apps/web/src/app/dashboard/page.tsx` | `ko` shorthand, all stat/badge/button labels translated, locale prop to all components |
| `apps/web/src/app/dashboard/components/CharacterIntelligence.tsx` | `locale` prop, Array.isArray guard, empty state, totalWords display, i18n labels |
| `apps/web/src/app/dashboard/components/CoverageReport.tsx` | `locale` prop, scoreLabel i18n, all section headings translated |
| `apps/web/src/app/dashboard/components/EmotionChart.tsx` | `locale` prop, title + tooltip translated |
| `apps/web/src/app/dashboard/components/BeatSheetTimeline.tsx` | `locale` prop, act/beat labels translated |
| `apps/web/src/app/dashboard/components/MarketPredictions.tsx` | `locale` prop, all metric/section labels translated |
| `apps/web/src/app/dashboard/components/ProductionBreakdown.tsx` | `locale` prop, all section/stat labels translated |
| `apps/web/src/app/dashboard/components/NarrativeArcPanel.tsx` | `locale` prop, arc/turning-point/genre/pacing labels translated |
| `apps/web/src/app/dashboard/dashboard.css` | `.btn-locale` gold styling, full `@media print` rewrite for density |

## Verification
- `tsc --noEmit` — clean (0 errors)
- `bun test` — 23 tests pass (0 failures)
