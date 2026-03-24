# Result: Session 21 — i18n Translation Review & Missing Labels

## Overview
Comprehensive review of all Korean/English translations across 11 dashboard components. Fixed ambiguous labels, added missing translations to 3 previously English-only components, and translated all remaining hardcoded English strings.

## Changes

### 1. ROI "등급" → "티어" Disambiguation
- **Before:** Both ROI Tier and Content Rating used "등급" in Korean — confusing
- **After:** ROI Tier → "티어", Content Rating → "등급" (distinct terms)
- **File:** `MarketPredictions.tsx`

### 2. Missing Label Translations
- **ProductionBreakdown:** Budget range "Low/Likely/High" → "최소/예상/최대", VFX "Scene" → "장면", Cast roles "Protagonist/Antagonist/Supporting/Minor" → "주연/악역/조연/단역", cast "scenes" → "장면"
- **CharacterIntelligence:** Character roles → "주연/악역/조연/단역", Voice metrics "wpl/richness" → "평균단어/어휘다양성"
- **NarrativeArcPanel:** "confidence" → "신뢰도", "Sc." → "장면", Pacing "Scenes" → "장면"
- **Files:** `ProductionBreakdown.tsx`, `CharacterIntelligence.tsx`, `NarrativeArcPanel.tsx`

### 3. SectionNav — Full i18n
- Added `locale` prop and `labelKo` field to all 7 sections
- Translated: Coverage→커버리지, Production→제작, Stats→통계, Characters→캐릭터, Arc→아크, Market→마켓, Beats→비트
- Aria label: "Section navigation" → "섹션 탐색"
- **File:** `SectionNav.tsx`

### 4. AnalysisProgress — Full i18n
- Added `locale` prop with dual step arrays (STEPS_EN / STEPS_KO)
- 8 analysis steps translated: 시나리오 파싱 중, 피처 추출 중, 감정 분석 중, 비트 시트 생성 중, 등급 및 ROI 예측 중, 커버리지 분석 중, 제작 타당성 분석 중, 트로프 및 비교 작품 분석 중
- Heading: "Analyzing Script..." → "시나리오 분석 중..."
- **File:** `AnalysisProgress.tsx`

### 5. ReportCover — Full i18n (Print)
- Added `locale` prop, date locale (`ko-KR` / `en-US`)
- Translated: CONFIDENTIAL→대외비, Script Intelligence Report→시나리오 인텔리전스 리포트, Project ID→프로젝트 ID, Analysis Date→분석 날짜, Title→제목, Genre→장르, Rating→등급, ROI Tier→ROI 티어, Cast Members→등장인물, Scenes→장면 수, Overall Coverage Score→종합 커버리지 점수, For internal use only→내부 전용
- **File:** `ReportCover.tsx`

### 6. UploadPanel Strategy Descriptions
- Added `labelKo` and `descKo` to STRATEGIES array
- Auto→자동 (최적 제공자 + 폴백), Fast→빠른 분석 (Gemini Flash 저비용), Deep Analysis→심층 분석 (Claude + Gemini 하이브리드), Custom→사용자 지정 (엔진별 선택)
- **File:** `UploadPanel.tsx`

### 7. Print Section Headers — page.tsx
- All 7 print-only section headers translated:
  1. Script Coverage Report → 시나리오 커버리지 리포트
  2. Production Feasibility → 제작 타당성
  3. Overview & Emotional Arc → 개요 및 감정 아크
  4. Character Intelligence → 캐릭터 인텔리전스
  5. Narrative Arc → 서사 아크
  6. Market Predictions → 마켓 예측
  7. Narrative Beat Sheet → 비트 시트
- Locale passed to `<SectionNav>`, `<AnalysisProgress>`, `<ReportCover>`
- **File:** `page.tsx`

## Files Changed

| File | Changes |
|------|---------|
| `apps/web/src/app/dashboard/page.tsx` | Print section headers i18n, locale prop to SectionNav/AnalysisProgress/ReportCover |
| `apps/web/src/app/dashboard/components/MarketPredictions.tsx` | ROI "등급" → "티어" |
| `apps/web/src/app/dashboard/components/ProductionBreakdown.tsx` | Budget labels, VFX scene, cast roles/scenes translated |
| `apps/web/src/app/dashboard/components/CharacterIntelligence.tsx` | Role labels, voice metrics translated |
| `apps/web/src/app/dashboard/components/NarrativeArcPanel.tsx` | Confidence, scene prefix, pacing scenes translated |
| `apps/web/src/app/dashboard/components/SectionNav.tsx` | `locale` prop, all 7 nav labels translated |
| `apps/web/src/app/dashboard/components/AnalysisProgress.tsx` | `locale` prop, 8 steps + heading translated |
| `apps/web/src/app/dashboard/components/ReportCover.tsx` | `locale` prop, all labels/date/footer translated |
| `apps/web/src/app/dashboard/components/UploadPanel.tsx` | Strategy label/description Korean translations |

## Verification
- `tsc --noEmit` — clean (0 errors)
- `bun test` — 23 tests pass (0 failures)
