# Result: Session 11 - Phase 7 (Multi-Model LLM Strategy System)

## Overview
Phase 7 eliminates single-model fragility by introducing a multi-model retry chain, per-engine provider routing, and a dashboard strategy selector. The system now gracefully handles Gemini 429 rate limits (cascading across 3 models), supports Claude for deep narrative analysis, and lets users choose their analysis strategy from the UI.

## Key Features Built & Verified

### A. GeminiProvider Model Chain Retry
- **Path:** `packages/core/src/creative/infrastructure/llm/GeminiProvider.ts`
- Cascading retry: `gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-2.5-flash-lite`.
- Each model has a separate free-tier quota (~20 req/day), tripling effective capacity to ~60 req/day.
- 429/RESOURCE_EXHAUSTED errors trigger next model; other errors fail immediately.
- `LLMResponse.model` reflects the actual model that succeeded.

### B. Analysis Strategy Type System
- **Path:** `packages/core/src/creative/infrastructure/llm/AnalysisStrategy.ts` (new file)
- `AnalysisStrategyName`, `EngineName`, `ProviderChoice` types.
- `AnalysisStrategy` interface maps each engine to its assigned provider.
- `CustomStrategyInput` for user-specified per-engine overrides.

### C. Strategy Resolver
- **Path:** `packages/core/src/creative/infrastructure/llm/StrategyResolver.ts` (new file)
- `resolveStrategy(name, custom?)` translates strategy names into engine→provider mappings.
- Auto: uses best available provider from environment (Gemini > Anthropic > OpenAI > Mock).
- Fast: all engines use Gemini (low cost, high speed).
- Deep: BeatSheet + Emotion use Anthropic (deep reasoning), Rating + ROI use Gemini (fast classification).
- Custom: per-engine selection with environment-based defaults.

### D. API Strategy Support
- **Path:** `apps/api/src/index.ts`
- `POST /analyze` accepts optional `strategy` and `customProviders` in request body.
- `withFallback(engine, label, fn)` tries engine-specific provider, falls back to MockProvider on error.
- Response includes `strategy` name and `providers: { beatSheet, emotion, rating, roi }` attribution.
- `GET /providers` returns `{ available: { gemini, anthropic, openai, mock }, strategies: [...] }`.
- Full backward compatibility: omitting `strategy` defaults to `auto`.

### E. Dashboard Strategy Selector UI
- **Path:** `apps/web/src/app/dashboard/page.tsx`, `apps/web/src/app/dashboard/dashboard.css`
- 4 strategy pill buttons between upload zone and Analyze button: Auto, Fast, Deep Analysis, Custom.
- Custom mode expands a 2×2 grid with per-engine provider dropdowns.
- Providers without API keys shown as disabled `<option>` with lock icon.
- Fetches `GET /providers` on mount to hydrate available providers.
- Provider attribution bar in results view: color-coded badges (blue=Gemini, orange=Claude, green=OpenAI, gray=Mock).

### F. Parser & Environment Fixes
- **Path:** `packages/core/src/script/infrastructure/parser.ts`, `pdfParser.ts`, `packages/core/src/shared/env.ts`
- Korean transition markers (`다시 현재`, `CUT TO – 대기실`) correctly classified.
- Angle bracket inserts (`<인서트 – 씬 19>`) classified as action, not character.
- Korean particle filter prevents lines ending with 이/을/를/에/는 from being characters.
- PDF blank-line between CJK character name and dialogue handled correctly.
- `dotenv.config()` now resolves both `cwd/.env` and `../../.env` for monorepo apps.

## How to Run
1. **Start Database**: `docker-compose up -d db`
2. **Start Backend**: `cd apps/api && bun run dev` (Port 4005)
3. **Start Frontend**: `cd apps/web && bun run dev` (Port 4000)
4. **Open Dashboard**: `http://localhost:4000/dashboard`
5. **Select Strategy**: Choose Auto/Fast/Deep/Custom before uploading
6. **Upload & Analyze**: Drag a screenplay file → click Analyze → view results with provider attribution

## Verification
- **Tests**: 22/22 unit tests passing across 12 test files.
- **Build**: Next.js production build compiles successfully with zero errors.
- **Backward Compatibility**: `POST /analyze` without `strategy` param returns `strategy: "auto"`, all engines use Gemini.
- **Provider Endpoint**: `GET /providers` returns correct availability based on environment API keys.
- **Provider Attribution**: Response includes `providers: { beatSheet: "gemini", emotion: "gemini", rating: "gemini", roi: "gemini" }`.

## Status
- **Milestone**: The system is now resilient to single-model rate limits and supports multi-provider analysis strategies. Users can leverage Claude's deep reasoning for narrative analysis while using Gemini for fast classification tasks.
