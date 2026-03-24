# Session 30: Phase 3-5 Completion — Draft Comparison, Statistical ROI, Scene Explorer

## Objective
Autoresearch 업그레이드 남은 3개 Phase를 일괄 구현하여 OnDesk/ScriptBook/Prescene 벤치마크 대비 기능 완성도를 높인다.

## Phase 3: Draft Comparison (버전 비교 diff 엔진)

### Core
- **DraftComparator** (`packages/core/src/creative/application/DraftComparator.ts`)
  - 순수 결정론적 비교 (LLM 미사용)
  - 7개 서브 분석: metrics, coverage, characters, emotion arc, production, predictions, narrative
  - Impact 분류: positive/negative/neutral
  - CharacterDelta: added/removed/changed 캐릭터 추적

### API
- `POST /compare` — 두 리포트 scriptId 비교 → DraftComparisonResult 반환

### UI
- **DraftComparison.tsx** — 접이식 패널, 드롭다운 리포트 선택, 비교 결과 시각화
  - Summary bar (total/positive/negative changes)
  - Score delta 강조 표시
  - Metric deltas 테이블 (색상 화살표)
  - Character change 태그 (추가/삭제/변경)
  - Emotion arc shift 통계
  - Narrative changes 리스트

## Phase 4: Statistical k-NN ROI Model

### Core
- **StatisticalROIModel** (`packages/core/src/predictor/application/StatisticalROIModel.ts`)
  - 가중 k-NN 회귀 (k=7, weight = similarity^2)
  - 기존 Benchmarker와 동일한 7차원 피처 벡터 활용
  - 80개 영화 카탈로그 (50 Hollywood + 30 Korean) 기반
  - P25/P75 퍼센타일 수익 범위 추정
  - 시장별 ROI 티어 분류 (Hollywood/Korean 별도 임계값)

### API Pipeline 통합
- `/analyze` 파이프라인에 `StatisticalROIModel.predict()` 추가 (step 10b)
- `predictions.statisticalRoi` 필드로 결과 포함

### UI
- **StatisticalROIPanel.tsx** — AI vs Statistical 모델 나란히 비교
  - Consensus indicator (합의/불일치)
  - 모델별 카드 (tier badge, multiplier, confidence bar)
  - Revenue range 시각화 바
  - k-NN 이웃 영화 테이블 (유사도, 예산, 수익, ROI)

## Phase 5: Scene-by-Scene Tagging/Filtering

### UI
- **SceneExplorer.tsx** — 장면별 탐색기
  - 4개 필터: Engagement, Emotion, Tension, Act
  - 장면 카드 그리드 (반응형 3/2/1열)
  - 각 카드: 감정 점수 바, dominant emotion, engagement badge, tension/humor meter
  - Location/VFX 인디케이터 (production 데이터 연동)
  - 클릭 확장: beat context, location details, VFX details
  - SectionNav에 "Scenes" 항목 추가

## Files Changed

### New Files (8)
| File | Description |
|------|-------------|
| `packages/core/src/creative/application/DraftComparator.ts` | Draft comparison service |
| `packages/core/src/predictor/application/StatisticalROIModel.ts` | k-NN ROI model |
| `apps/web/.../DraftComparison.tsx` + `.css` | Draft comparison UI |
| `apps/web/.../StatisticalROIPanel.tsx` + `.css` | Statistical ROI comparison UI |
| `apps/web/.../SceneExplorer.tsx` + `.css` | Scene explorer UI |

### Modified Files (4)
| File | Change |
|------|--------|
| `packages/core/src/index.ts` | DraftComparator, StatisticalROIModel exports |
| `apps/api/src/index.ts` | `POST /compare`, statisticalRoi pipeline step, imports |
| `apps/web/.../page.tsx` | SceneExplorer, DraftComparison, StatisticalROIPanel 통합 |
| `apps/web/.../SectionNav.tsx` | Scenes 항목 추가 |

## Verification
- `apps/web`: `npx tsc --noEmit` — 0 errors
- `apps/api`: `npx tsc --noEmit` — 0 errors
- `packages/core`: DraftComparator, StatisticalROIModel — 0 errors

## Competitive Gap: Final Status
| Feature | OnDesk | ScriptBook | Prescene | Our System |
|---------|--------|------------|----------|------------|
| Coverage Report | O | O | O | O |
| ROI/Box Office | — | O (220 params) | O | O (LLM + k-NN ensemble) |
| Emotion Arc | — | — | O | O |
| AI Chat Agent | O | — | O | O |
| Draft Comparison | O | — | — | O |
| Scene Tagging/Filter | — | — | O | O |
| Statistical Model | — | O | — | O (k-NN regression) |
