# Result: Session 25 — Pipeline Reliability & Data Integrity

## Overview
Fixed critical pipeline issues: provider fallback chain not activating (API keys not loaded), false mock warnings, ROI analysis using hardcoded mock data instead of real budget/genre, and narrative arc genre-fit miscalculation for composite genres. Also added provider chain fallback (tries all available providers before mock), Groq 413 error handling, verdict criteria UI legend, and benchmark tests for Korean market.

## Changes

### 1. Provider Chain Fallback
**Problem**: When primary provider failed (e.g., Gemini 429), system fell directly to mock.
**Fix**: `withFallback()` now chains through all available providers in priority order before mock.

```
Gemini → Groq → DeepSeek → Anthropic → OpenAI → Mock
```

Each engine independently tries the chain. If Gemini is rate-limited, Groq serves BeatSheet; if Groq also fails, DeepSeek is tried, etc.

### 2. Mock Warning Accuracy
**Problem**: Warning banner showed "Mock placeholder data" for engines that used any fallback provider (e.g., Groq instead of Gemini), even though Groq returned real AI analysis.
**Fix**: Changed check from `result.fallback` (used non-primary) to `result.provider === 'mock'` (actually used mock).

### 3. ROI Pipeline Data Integrity
**Problem**: ROI prediction received hardcoded `{ budget: 50000000, genres: ["Action", "Sci-Fi"] }` regardless of actual screenplay content or market.
**Fix**: Reordered pipeline so Production (budget) and Coverage (genre) run before ROI:

```
Before: BeatSheet → Emotion → Rating → [Mock $50M, Action/Sci-Fi] → ROI → Coverage → Production
After:  BeatSheet → Emotion → Rating → Production → VFX → Trope → Coverage → ROI → Comps → Arc
```

ROI now receives real `budgetEstimate.likely` (e.g., ₩2,075,750,000) and coverage-detected genre (e.g., "Crime, Drama").

### 4. Narrative Arc Composite Genre Fix
**Problem**: `computeGenreFit()` failed to match composite genres like "Crime, Drama" — `GENRE_EXPECTED_ARC["Crime, Drama"]` returned undefined, defaulting to `man-in-a-hole`.
**Fix**: Split composite genre string on `,` or `/`, try each part against the lookup table, use first match.

### 5. Groq Provider 413 Handling
**Problem**: Large scripts exceeded `llama-3.3-70b-versatile` context limit → 413 error → immediate failure.
**Fix**: Added 413/too-large detection in GroqProvider retry loop. On 413, skips to next model in chain:
- `llama-3.3-70b-versatile` → `mixtral-8x7b-32768` (32K) → `llama-3.1-8b-instant`

### 6. Provider Priority Order
Updated `StrategyResolver.getDefaultProvider()` to: Gemini (free) → Groq (free) → DeepSeek (cheap) → Anthropic → OpenAI → Mock

### 7. Verdict Criteria UI
Added verdict criteria legend to CoverageReport header showing score thresholds:
- **Recommend** ≥ 80 — Greenlight for production / 제작 추천
- **Consider** 60–79 — Revise and resubmit / 수정 후 재검토
- **Pass** < 60 — Not recommended / 제작 부적합

Current verdict is highlighted; inactive ones are dimmed.

### 8. Korean Market Benchmark Tests
- `koreanFilmCatalog.test.ts` — 17 tests: catalog integrity, KMRB ratings, KRW scale, bilingual titles, genre/trope coverage
- `BudgetEstimator.test.ts` — 14 tests: Korean vs Hollywood cost comparison, config-driven rates
- `Benchmarker.test.ts` — 7 Korean market tests: KRW-scale comps, no Hollywood overlap, Korean trope boost
- `korean_sample.fountain` — Korean crime/drama screenplay sample (15 scenes)

## Files Changed

| File | Changes |
|------|---------|
| `apps/api/src/index.ts` | Pipeline reorder (Production→Coverage→ROI), provider chain fallback, mock detection fix |
| `packages/core/src/creative/infrastructure/llm/GroqProvider.ts` | 413 handling, `llama-3.1-8b-instant` model chain |
| `packages/core/src/creative/infrastructure/llm/StrategyResolver.ts` | Provider priority: Gemini→Groq→DeepSeek→Anthropic→OpenAI→Mock |
| `packages/core/src/creative/application/NarrativeArcClassifier.ts` | Composite genre split for genre-fit calculation |
| `apps/web/src/app/dashboard/components/CoverageReport.tsx` | Verdict criteria legend with active highlight |
| `apps/web/src/app/dashboard/dashboard.css` | Verdict criteria styles |
| `.env.example` | All 5 LLM provider keys + KOFIC_API_KEY |
| `packages/core/src/predictor/data/koreanFilmCatalog.test.ts` | **New** — 17 Korean catalog tests |
| `packages/core/src/production/application/BudgetEstimator.test.ts` | **New** — 14 budget comparison tests |
| `packages/core/src/predictor/application/Benchmarker.test.ts` | 7 Korean market tests added |
| `data/korean_sample.fountain` | **New** — Korean screenplay sample |
| `packages/core/src/creative/infrastructure/llm/GeminiProvider.ts` | Rate limit cooldown improvements |
| `packages/core/src/creative/infrastructure/llm/MockProvider.ts` | KMRB detection for Korean market |
| `packages/database/prisma/schema.prisma` | Market field, optional protagonist |
| `packages/database/src/repository/AnalysisReportRepository.ts` | Market-aware persistence |

## Verification
- All 62 tests pass (`bun test`)
- Korean sample analysis: KMRB 19+ rating, ₩2.07B budget, Crime/Drama genre — all from real AI (Groq)
- ROI reasoning now references actual budget (₩2,075,750,000) and genre (Crime, Drama)
- No false mock warnings when fallback providers serve real analysis
- Provider chain fallback works: Gemini 429 → Groq serves all engines successfully

## How to Run
```bash
# Ensure API keys in .env (at least GEMINI_API_KEY or GROQ_API_KEY for free tier)
cd apps/api && bun run dev    # API on port 4005
cd apps/web && bun run dev    # Web on port 4000

# Test Korean market analysis via curl
curl -s -X POST 'http://localhost:4005/analyze' \
  -H 'Content-Type: application/json' \
  -d '{"scriptText": "...", "market": "korean", "fileName": "test.fountain"}'
```
