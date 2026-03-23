# Result: Session 28 — Autoresearch Phase 1: Prompt Engineering & Feature Expansion

## Overview
Major system upgrade following autoresearch methodology. Benchmarked against OnDesk, ScriptBook, and Prescene platforms. Upgraded all 5 LLM engine prompts to industry standard (CoT, structured output), expanded feature extraction from 6→27 metrics, enhanced domain models with new fields, reordered API pipeline for benchmark-informed ROI prediction, and extended film catalogs with runtime/release/VFX data.

## Competitive Audit Summary

| Capability | OnDesk | ScriptBook | Prescene | Before | After |
|------------|--------|------------|----------|--------|-------|
| Coverage Categories | 8+ | — | 8+ | 5 | **8** |
| Logline/Synopsis/Strengths/Weaknesses | ✅ | ✅ | ✅ | ❌ | **✅** |
| Market Potential + Comparable Titles | ✅ | — | ✅ | ❌ | **✅** |
| Save the Cat! Beat Framework | ✅ | — | — | Generic 3-act | **15-beat** |
| Pacing Deviation Detection | — | — | ✅ | ❌ | **✅** |
| Multi-dimensional Emotion | — | — | ✅ | 1D score | **3D (tension/humor/engagement)** |
| Benchmark-informed ROI | — | ✅ (220 params) | ✅ | LLM-only | **Comp-injected** |
| MPAA/KMRB Explicit Guidelines | ✅ | ✅ | ✅ | Minimal | **Full guidelines + content counts** |
| Feature Parameters | — | 220 | — | ~6 | **27** |

## Changes

### 1. LLM Prompt Upgrades (5 engines)

#### ScriptCoverageEvaluator — 8-category OnDesk-style
- 5→8 evaluation categories: Premise & Concept, Plot Structure & Logic, Character & Dialogue, Theme & Tone, Emotional Impact, Market Appeal, Production Feasibility, Dialogue & Voice
- Each category has 2-3 subcategories with individual scores
- 7-step Chain-of-Thought evaluation process
- New output fields: `marketPotential`, `comparableTitles`
- Verdict rules: ≥80 Recommend, ≥60 Consider, <60 Pass

#### BeatSheetGenerator — Save the Cat! 15-beat
- Generic 3-act → explicit 15-beat framework with ideal page-percentage positions
- `pagePercentage` (0-100) for each beat's actual position
- `pacingNote` generated when beat deviates >10% from ideal position
- 5-step CoT: scene count → beat mapping → percentage calculation → pacing check → act assignment

#### EmotionAnalyzer — Multi-dimensional
- Added `tension` (0-10), `humor` (0-10), `engagement` (high/medium/low) per scene
- 5-step CoT per scene: literal action → emotional subtext → tension → humor → engagement
- Backward-compatible defaults for all new fields

#### BoxOfficePredictor — Benchmark Comp Injection
- Now accepts `comps` parameter with comp film budget/revenue/ROI data
- Comp films formatted in prompt with similarity scores and shared traits
- New `revenueRange` output: { low, likely, high }
- Extended features in prompt: uniqueLocationCount, intExtRatio, monologueCount, speakingRolesCount, emotionalRange

#### ContentRatingClassifier — MPAA/KMRB Guidelines
- Market-conditional rating guidelines (MPAA for Hollywood, KMRB for Korean)
- Specific content thresholds per rating (e.g., PG-13: "One non-sexual F-word")
- `contentCounts` output: { violence, profanity, sexualContent, drugReferences }
- Sampling increased: 500→2000 elements

### 2. FeatureExtractor: 6→27 Metrics
21 new deterministic metrics computed from script elements:
- Scene heading analysis: intExtRatio, nightDayRatio, uniqueLocationCount
- Scene length stats: avgSceneLength, longestScene, shortestScene, pacingScore
- Dialogue distribution: protagonistDialoguePct, top3CharDialoguePct, speakingRolesCount
- Style metrics: monologueCount, questionDialoguePct, exclamationPct
- Element counts: parentheticalCount, transitionCount, montageCount, flashbackCount
- VFX analysis: vfxKeywordDensity (28-keyword dictionary)
- Emotion-derived: emotionalRange, emotionalVariance, turningPointCount

### 3. Domain Model Extensions
- `ScriptCoverage`: +marketPotential, +comparableTitles
- `SceneEmotion`: +tension, +humor, +engagement
- `Beat`: +pagePercentage, +pacingNote
- `ScreenplayFeatures.metrics`: 21 new fields
- `CatalogFilm`: +runtime, +releaseMonth, +castSize, +vfxComplexity, +locationCount, +awards

### 4. API Pipeline Reorder
- Benchmarker (comps) now runs **before** BoxOfficePredictor
- Comp film data injected into ROI prediction prompt
- Step 9: Comps (deterministic) → Step 10: ROI (LLM with comp context)

### 5. Film Catalog Enhancement
- 50 Hollywood + 30 Korean films: added runtime, releaseMonth, vfxComplexity to all 80 entries

### 6. Dashboard UI
- CoverageReport: Market Potential + Comparable Titles sections added

## Files Changed

| File | Changes |
|------|---------|
| `packages/core/src/creative/application/ScriptCoverageEvaluator.ts` | 8-category prompt, CoT, return parsing |
| `packages/core/src/creative/application/BeatSheetGenerator.ts` | Save the Cat! 15-beat, pagePercentage, pacingNote |
| `packages/core/src/creative/application/EmotionAnalyzer.ts` | tension/humor/engagement, CoT |
| `packages/core/src/predictor/application/BoxOfficePredictor.ts` | comps param, revenueRange, extended features |
| `packages/core/src/predictor/application/ContentRatingClassifier.ts` | MPAA/KMRB guidelines, contentCounts |
| `packages/core/src/predictor/application/FeatureExtractor.ts` | 6→27 metrics, 12 new helper methods |
| `packages/core/src/predictor/domain/ScreenplayFeatures.ts` | 21 new metric fields |
| `packages/core/src/creative/domain/ScriptCoverage.ts` | +marketPotential, +comparableTitles |
| `packages/core/src/creative/domain/EmotionGraph.ts` | +tension, +humor, +engagement |
| `packages/core/src/creative/domain/BeatSheet.ts` | +pagePercentage, +pacingNote |
| `packages/core/src/predictor/data/filmCatalog.ts` | Extended CatalogFilm interface, 50 films enhanced |
| `packages/core/src/predictor/data/koreanFilmCatalog.ts` | 30 Korean films enhanced |
| `apps/api/src/index.ts` | Benchmarker→ROI pipeline reorder, comp injection |
| `apps/web/src/app/dashboard/components/CoverageReport.tsx` | Market Potential + Comparable Titles UI |

## Verification
- `apps/web` — `tsc --noEmit` — 0 errors
- `apps/api` — `tsc --noEmit` — 0 errors

## Autoresearch Metrics

| Target Metric | File | Before → After |
|---------------|------|----------------|
| Coverage categories | ScriptCoverageEvaluator.ts | 5 → 8 (with subcategories) |
| Feature parameters | FeatureExtractor.ts | 6 → 27 |
| BeatSheet framework | BeatSheetGenerator.ts | Generic 3-act → Save the Cat! 15-beat |
| Emotion dimensions | EmotionAnalyzer.ts | 1D → 3D (score + tension + humor) |
| ROI context | BoxOfficePredictor.ts | No comps → 5 benchmark films injected |
| Rating guidelines | ContentRatingClassifier.ts | Minimal → Full MPAA/KMRB |

## How to Run
```bash
cd apps/api && bun run dev    # API on port 4005
cd apps/web && bun run dev    # Web on port 4000

# Verify:
# 1. Upload Fight Club script → check 8-category Coverage with strengths/weaknesses/marketPotential
# 2. Beat Sheet → 15 Save the Cat! beats with pagePercentage
# 3. Emotion graph data → tension/humor/engagement per scene
# 4. ROI prediction → should reference comp films in reasoning
# 5. Rating → contentCounts in response
```
