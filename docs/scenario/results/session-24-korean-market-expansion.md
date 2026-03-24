# Result: Session 24 — Korean Film Market Engine Expansion

## Overview
Expanded the scenario analysis system from Hollywood-only to dual-market (Hollywood + Korean) by introducing a `MarketLocale` pattern. All 7 analysis engines, the API layer, and the frontend now support market-aware analysis with Korean-specific constants: KMRB rating system, KRW currency formatting, Korean production cost structure, 30 Korean benchmark films, 50 bilingual tropes, and KOFIC box office API integration.

## Changes

### 1. Foundation — MarketConfig + Currency (Phase 1)

#### MarketConfig.ts (New)
- `MarketLocale` type: `'hollywood' | 'korean'`
- `ContentRating` union: MPAA + KMRB values
- `MarketConfig` interface: locale, currency, ratings, roi tiers, production costs, LLM prompts
- `HOLLYWOOD_CONFIG` / `KOREAN_CONFIG` — all market-specific constants
- `getMarketConfig(locale)` factory function

#### Currency System
- `formatToKRW(amount)` — ₩ with 억/만 suffixes (e.g., ₩152.0억, ₩8,000만)
- `formatCurrency(amount, market)` — dispatches to USD or KRW formatter

#### Domain Types
- `PredictionResult`: rating field → `ContentRating` type, added `market?: MarketLocale`
- `BoxOfficeData`: added `market?`, `currencyCode?`, `admissions?` (Korean 천만 관객 metric)
- `AnalysisResultInput` (database): added `market?`, `protagonist?` made optional

### 2. Korean Film Catalog + Trope Dictionary (Phase 2)

#### koreanFilmCatalog.ts (New) — 30 Korean Films
범죄도시, 베테랑, 부산행, 도둑들, 암살, 실미도, 올드보이, 추격자, 서울의 봄, 기생충, 택시운전사, 국제시장, 변호인, 명량, 밀양, 공동경비구역 JSA, 극한직업, 과속스캔들, 7번방의 선물, 완벽한 타인, 파묘, 곡성, 타짜, 아가씨, 달콤한 인생, 신과함께, 해운대, 광해, 건축학개론, 클래식

#### koreanTropeDictionary.ts (New) — 50 Bilingual Tropes
- Historical/Political: 군사쿠데타, 항일독립운동, 한국전쟁분단, 민주화운동
- Social/Class: 계층갈등, 재벌비리, 입시지옥, 주거문제
- Family/Relationship: 가족의 희생, 세대갈등, 부자관계, 효도
- Cultural/Spiritual: 무속신앙, 한(恨), 정(情), 유교적 위계, 토속공포
- Genre: 복수극, 조폭영화, 생존게임, 반전

#### Catalog/Trope Integration
- `Benchmarker.findComps()` — selects Korean or Hollywood catalog by market
- `TropeAnalyzer.analyze()` — selects Korean or Hollywood trope dictionary + prompt

### 3. Engine Market-aware Adaptation (Phase 3) — 7 Engines

| Engine | Changes |
|--------|---------|
| `BudgetEstimator` | Hardcoded costs → `getMarketConfig(market).production` |
| `ContentRatingClassifier` | MPAA → KMRB prompt switch, `ContentRating` return type |
| `BoxOfficePredictor` | Market-specific ROI tiers + box office role prompt |
| `EvaluationService` | 2.5x → `config.roi.breakEvenMultiplier` (Korean: 2.0x) |
| `VFXEstimator` | English + Korean VFX keywords (폭발, 괴물, 변신, etc.) |
| `BeatSheetGenerator` | `config.prompts.consultantRole` prompt switch |
| `ScriptCoverageEvaluator` | `config.prompts.analystRole` prompt switch |

All engines use `market?: MarketLocale = 'hollywood'` — **100% backward compatible**.

### 4. KOFIC API Client (Phase 4)

#### koficClient.ts (New)
- Base URL: `https://www.kobis.or.kr/kobisopenapi/webservice/rest`
- Endpoints: `searchMovieList`, `searchMovieInfo`, `searchDailyBoxOfficeList`, `searchWeeklyBoxOfficeList`
- API key: `KOFIC_API_KEY` (env.ts)
- Rate limit: 3,000 requests/day
- `toBoxOfficeData()` — converts KOFIC response to common `BoxOfficeData` format

### 5. API Layer Integration (Phase 5)

- `/analyze` POST: accepts `market?: 'hollywood' | 'korean'`, threads to all engines
- `/providers` GET: returns `markets: ['hollywood', 'korean']`
- Result object includes `market` field
- Elysia validation schema updated

### 6. Frontend Market Selector (Phase 6)

- **UploadPanel**: Hollywood / Korean toggle pill buttons (MPAA/USD vs KMRB/KRW labels)
- **ProductionBreakdown**: `formatBudget()` — displays ₩억/만 for Korean market
- **MarketPredictions**: `formatAmount()` — comp film budget/revenue in KRW
- **Dashboard page**: `market` state, threaded to API request and display components

## Files Changed

| File | Changes |
|------|---------|
| `packages/core/src/shared/MarketConfig.ts` | **New** — MarketLocale, MarketConfig, HOLLYWOOD/KOREAN configs |
| `packages/core/src/predictor/data/koreanFilmCatalog.ts` | **New** — 30 Korean benchmark films |
| `packages/core/src/predictor/data/koreanTropeDictionary.ts` | **New** — 50 bilingual Korean tropes |
| `packages/core/src/market/infrastructure/koficClient.ts` | **New** — KOFIC KOBIS API client |
| `packages/core/src/shared/currency.ts` | formatToKRW, formatCurrency dispatcher |
| `packages/core/src/shared/env.ts` | KOFIC_API_KEY |
| `packages/core/src/predictor/domain/PredictionResult.ts` | ContentRating type, market field |
| `packages/core/src/market/domain/BoxOfficeData.ts` | admissions, market, currencyCode fields |
| `packages/core/src/predictor/data/filmCatalog.ts` | market field on CatalogFilm |
| `packages/core/src/predictor/application/Benchmarker.ts` | Market-aware catalog selection |
| `packages/core/src/predictor/application/TropeAnalyzer.ts` | Market-aware dictionary + prompt |
| `packages/core/src/production/application/BudgetEstimator.ts` | MarketConfig production costs |
| `packages/core/src/predictor/application/ContentRatingClassifier.ts` | KMRB prompt + ContentRating |
| `packages/core/src/predictor/application/BoxOfficePredictor.ts` | Market-specific ROI tiers |
| `packages/core/src/market/application/EvaluationService.ts` | Market-specific break-even multiplier |
| `packages/core/src/production/application/VFXEstimator.ts` | Korean VFX keywords |
| `packages/core/src/creative/application/BeatSheetGenerator.ts` | Market-specific consultant prompt |
| `packages/core/src/creative/application/ScriptCoverageEvaluator.ts` | Market-specific analyst prompt |
| `packages/core/src/creative/infrastructure/benchmark/BenchmarkRunner.ts` | Fix TropeAnalyzer import path |
| `packages/core/src/index.ts` | New exports (Korean catalog, tropes, KOFIC, MarketConfig) |
| `apps/api/src/index.ts` | market param, /providers markets, engine threading |
| `apps/web/.../UploadPanel.tsx` | MarketLocale type, market toggle UI |
| `apps/web/.../page.tsx` | market state, API request, component props |
| `apps/web/.../ProductionBreakdown.tsx` | KRW budget formatting |
| `apps/web/.../MarketPredictions.tsx` | KRW comp film formatting |
| `packages/database/src/repository/types.ts` | market field, optional protagonist |

## Verification
- `tsc --noEmit` — 0 errors across all packages
- `bun test` — 24 tests pass (0 failures)
- All engines default to `'hollywood'` — backward compatible
- Korean market: KMRB ratings, KRW budgets, Korean comps, Korean tropes

## How to Run
```bash
# Set KOFIC API key (optional, for live Korean box office data)
echo "KOFIC_API_KEY=your-key" >> .env

# Start API
cd apps/api && bun run dev

# Start frontend
cd apps/web && bun run dev

# Select "Korean" market toggle in the upload panel before analyzing
```
