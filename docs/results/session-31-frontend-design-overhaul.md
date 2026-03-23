# Session 31: Frontend Design Overhaul — Landing Page, Dashboard Frame, Grid & PDF Print

## Objective
프론트엔드 전반 디자인 리뉴얼: 랜딩 페이지 신규 제작, 대시보드 프레임 강화, 그리드 공백 제거, CSS 변수 통합, PDF 익스포트 레이아웃 최적화.

## Changes

### Landing Page (Complete Rewrite)
- **page.tsx**: Next.js 기본 보일러플레이트 → 프로덕트 랜딩 페이지
  - Hero: 그래디언트 텍스트 타이틀, 한국어 설명, 골드 CTA 버튼
  - Features: 2×2 그리드 (감정 분석, 캐릭터 인텔리전스, ROI 예측, 제작 분석)
  - How It Works: 3단계 (업로드 → AI 분석 → 리포트)
  - Stats: 4개 지표 (87%+ 정확도, 15+ 분석 항목, 2 시장, 5+ AI 엔진)
  - Bottom CTA + Footer
- **page.module.css**: 다크 글래스모피즘 테마, 반응형 (1024/768/480px)

### Dashboard Frame
- `dashboard-bg` 래퍼 — radial-gradient 배경
- `dashboard-header` — 브랜드 헤더 (홈 링크 아이콘, 로케일 토글)
- `welcome-hero` — idle 상태 환영 메시지 (그래디언트 텍스트)
- `section-label` — COVERAGE, PRODUCTION, ANALYSIS RESULTS 골드 라벨

### Grid Whitespace Elimination
| Panel | Before | After |
|-------|--------|-------|
| `main-chart` | span 8 | span 12 |
| `sidebar-panel` | span 4 | span 6 |
| `diversity-panel` | span 4 | span 6 |
| `trope-panel` | span 4 | span 12 |
| Beat grid | `auto-fill` | `auto-fit` |
| Scene Explorer | — | `grid-column: 1 / -1` |

### CSS Variable Unification
6개 컴포넌트의 하드코딩된 hex 색상을 CSS custom properties로 통합:
- `CharacterIntelligence.tsx`: `#2ecc71` → `var(--color-success)`
- `EmotionChart.tsx`: engagement 색상 → CSS 변수
- `MarketPredictions.tsx`: badge 색상 → CSS 변수
- `NarrativeArcPanel.tsx`, `ProductionBreakdown.tsx`, `UploadPanel.tsx` 등

### PDF Print Layout Fixes
- 모든 패널 `width: 100%; display: block` — A4 전폭 채움
- 컨테이너 `text-align: center`, 콘텐츠 `text-align: left`
- **Orphan card 처리**: `last-child:nth-child(odd) { grid-column: span 2 }`
  - Coverage categories (Production Feasibility 홀수 카드)
  - Comparable Films grid (3열→2열, 홀수 카드 전폭)
  - Scene Explorer cards (#15 홀수 카드 전폭)

## Files Changed

### Rewritten (2)
| File | Description |
|------|-------------|
| `apps/web/src/app/page.tsx` | Product landing page |
| `apps/web/src/app/page.module.css` | Landing page styles |

### Modified (14)
| File | Change |
|------|--------|
| `apps/web/src/app/dashboard/page.tsx` | Header, welcome hero, section labels, dashboard-bg |
| `apps/web/src/app/dashboard/dashboard.css` | Grid spans, print styles, CSS variables, frame |
| `apps/web/.../SceneExplorer.css` | grid-column: 1/-1, print orphan fix |
| `apps/web/.../CharacterIntelligence.tsx` | Hex → CSS variables |
| `apps/web/.../EmotionChart.tsx` | Hex → CSS variables |
| `apps/web/.../MarketPredictions.tsx` | Hex → CSS variables |
| `apps/web/.../NarrativeArcPanel.tsx` | Hex → CSS variables |
| `apps/web/.../ProductionBreakdown.tsx` | Hex → CSS variables |
| `apps/web/.../UploadPanel.tsx` | Hex → CSS variables |
| `apps/web/.../DraftComparison.tsx` | Hex → CSS variables |
| `apps/web/.../DraftComparison.css` | Print styles |
| `apps/web/.../StatisticalROIPanel.css` | Print styles |
| `.claude/settings.json` | Permission updates |
| `.claude/launch.json` | Preview server config (new) |

## Verification
- `npx next build` — 0 errors, all pages static
- Visual verification via Claude Preview — print emulation on A4 viewport (794×1123)
- All orphan cards (coverage, comps, scene) confirmed spanning full width
