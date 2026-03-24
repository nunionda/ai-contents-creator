# Plan: Korean Film Market Engine Expansion — MarketLocale Pattern

## Overview
Expand the analysis system from Hollywood-only to dual-market (Hollywood + Korean) by introducing a `MarketLocale` pattern that threads market-specific constants through every layer: domain types, LLM prompts, production costs, rating systems, film catalogs, and UI display.

## CROS Analysis
- **C (Cross-functional)**: Domain types -> LLM prompts -> API -> Frontend — all layers affected
- **R (Result-oriented)**: Korean screenplay input -> Korean market analysis report output
- **O (Optimized)**: Existing Hollywood engine preserved; `MarketLocale` pattern enables coexistence
- **S (Systemic)**: `MarketConfig` single configuration object manages all market-specific variables

## Scope

### Hollywood vs Korean Variable Mapping

| Area | Hollywood (Existing) | Korean (New) |
|------|---------------------|-------------|
| Rating | MPAA: G, PG, PG-13, R, NC-17 | KMRB: ALL, 12+, 15+, 19+, RESTRICTED |
| ROI Break-even | 2.5x multiplier | 2.0x multiplier |
| ROI Tiers | Flop<1.0, Break-even<2.5, Hit<5.0, Blockbuster>=5.0 | Flop<1.0, Break-even<2.0, Hit<4.0, Blockbuster>=4.0 (or 10M admissions) |
| Cast Cost | Protagonist $500K | Protagonist ₩800M |
| Location | INT $5K/day, EXT $15K/day | INT ₩2.5M/day, EXT ₩6.5M/day |
| Crew | $50K/day, fringe 1.4x | ₩17.5M/day, fringe 1.3x |
| VFX | $300/hour | ₩400K/hour |
| Currency | USD ($) | KRW (₩), 억/만 units |
| Film Catalog | 50 Hollywood films | 30 Korean films |
| Trope Dictionary | 47 Hollywood tropes | 50 Korean tropes (bilingual) |
| Box Office API | TMDB (global/US) | KOFIC KOBIS (Korean) |
| LLM Prompts | "Hollywood script consultant" | "한국 시나리오 전문 컨설턴트" |

## Implementation Phases

### Phase 1: Foundation — MarketConfig + Currency
- `MarketConfig.ts`: MarketLocale type, HOLLYWOOD_CONFIG, KOREAN_CONFIG, factory function
- `currency.ts`: formatToKRW with 억/만 suffixes, formatCurrency dispatcher
- Domain types: ContentRating union, market field on PredictionResult/BoxOfficeData
- `env.ts`: KOFIC_API_KEY

### Phase 2: Korean Film Catalog + Trope Dictionary
- `koreanFilmCatalog.ts`: 30 Korean films with KRW budgets, KMRB ratings
- `koreanTropeDictionary.ts`: 50 bilingual Korean cinema tropes
- Benchmarker/TropeAnalyzer: market-aware catalog/dictionary selection

### Phase 3: Engine Market-aware Adaptation
- 7 engines updated: BudgetEstimator, ContentRatingClassifier, BoxOfficePredictor, EvaluationService, VFXEstimator, BeatSheetGenerator, ScriptCoverageEvaluator
- All use `market?: MarketLocale = 'hollywood'` for backward compatibility

### Phase 4: KOFIC API Client
- `koficClient.ts`: Korean Film Council Open API (daily/weekly box office, movie search/info)

### Phase 5: API Layer Integration
- `/analyze` accepts `market` parameter
- `/providers` returns available markets
- All engine calls threaded with market

### Phase 6: Frontend Market Selector
- Hollywood/Korean toggle in UploadPanel
- ProductionBreakdown: KRW currency formatting
- MarketPredictions: KRW currency for comp films

### Phase 7: Testing + Verification
- tsc --noEmit: 0 errors
- bun test: all tests pass
- Backward compatibility: Hollywood default preserved

## Files

| Type | File | Phase |
|------|------|-------|
| New | `packages/core/src/shared/MarketConfig.ts` | 1 |
| New | `packages/core/src/predictor/data/koreanFilmCatalog.ts` | 2 |
| New | `packages/core/src/predictor/data/koreanTropeDictionary.ts` | 2 |
| New | `packages/core/src/market/infrastructure/koficClient.ts` | 4 |
| Mod | `packages/core/src/shared/currency.ts` | 1 |
| Mod | `packages/core/src/shared/env.ts` | 1 |
| Mod | `packages/core/src/predictor/domain/PredictionResult.ts` | 1 |
| Mod | `packages/core/src/market/domain/BoxOfficeData.ts` | 1 |
| Mod | `packages/core/src/predictor/data/filmCatalog.ts` | 2 |
| Mod | `packages/core/src/predictor/application/Benchmarker.ts` | 2 |
| Mod | `packages/core/src/predictor/application/TropeAnalyzer.ts` | 2 |
| Mod | `packages/core/src/production/application/BudgetEstimator.ts` | 3 |
| Mod | `packages/core/src/predictor/application/ContentRatingClassifier.ts` | 3 |
| Mod | `packages/core/src/predictor/application/BoxOfficePredictor.ts` | 3 |
| Mod | `packages/core/src/market/application/EvaluationService.ts` | 3 |
| Mod | `packages/core/src/production/application/VFXEstimator.ts` | 3 |
| Mod | `packages/core/src/creative/application/BeatSheetGenerator.ts` | 3 |
| Mod | `packages/core/src/creative/application/ScriptCoverageEvaluator.ts` | 3 |
| Mod | `packages/core/src/index.ts` | 1, 2 |
| Mod | `apps/api/src/index.ts` | 5 |
| Mod | `apps/web/.../UploadPanel.tsx` | 6 |
| Mod | `apps/web/.../page.tsx` | 6 |
| Mod | `apps/web/.../ProductionBreakdown.tsx` | 6 |
| Mod | `apps/web/.../MarketPredictions.tsx` | 6 |
| Mod | `packages/database/src/repository/types.ts` | 5 |
