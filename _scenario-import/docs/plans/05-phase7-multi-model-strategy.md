# Plan: Phase 7 - Multi-Model LLM Strategy System

## 1. Objective
Eliminate single-model fragility (Gemini 2.5 Flash 429 quota crashes) and enable intelligent per-engine provider routing. Users can select analysis strategies from the dashboard UI — from fast Gemini-only to deep Claude-powered narrative analysis — with automatic fallback to ensure zero-downtime analysis.

## 2. Core Features (Scope)

### A. GeminiProvider Model Chain Retry
- **Goal:** Survive daily free-tier quota exhaustion by cascading across 3 Gemini models with separate quotas.
- **Implementation:**
  - `modelChain` array: `gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-2.5-flash-lite`
  - `generateText()` loops through models on 429/RESOURCE_EXHAUSTED errors.
  - Non-rate-limit errors fail immediately (no unnecessary retries).
  - `LLMResponse.model` reflects the actual model that succeeded.
  - All models exhausted → returns structured error for upstream fallback handling.

### B. Analysis Strategy Type System
- **Goal:** Define a type-safe per-engine provider routing model.
- **Implementation:**
  - `AnalysisStrategyName`: `'auto' | 'fast' | 'deep' | 'custom'`
  - `EngineName`: `'beatSheet' | 'emotion' | 'rating' | 'roi'`
  - `ProviderChoice`: `'gemini' | 'anthropic' | 'openai' | 'mock'`
  - `AnalysisStrategy` interface: maps each engine to a provider.
  - `CustomStrategyInput` interface: optional per-engine overrides.

### C. Strategy Resolver
- **Goal:** Translate strategy names into concrete engine→provider mappings based on environment.
- **Implementation:**

  | Strategy | BeatSheet | Emotion | Rating | ROI |
  |----------|-----------|---------|--------|-----|
  | Auto | Best available (env priority) | Same | Same | Same |
  | Fast | Gemini | Gemini | Gemini | Gemini |
  | Deep | **Anthropic** | **Anthropic** | Gemini | Gemini |
  | Custom | User-selected | User-selected | User-selected | User-selected |

### D. API Strategy Support
- **Goal:** Accept strategy selection in `/analyze` and expose available providers via `/providers`.
- **Implementation:**
  - `POST /analyze` body extended with `strategy` and `customProviders` fields.
  - `resolveStrategy()` maps strategy to per-engine providers.
  - `withFallback()` tries engine-specific provider, falls back to MockProvider on error.
  - Response includes `strategy` name and `providers: { beatSheet, emotion, rating, roi }` attribution.
  - `GET /providers` returns available API keys and strategy metadata for UI hydration.

### E. Dashboard Strategy Selector UI
- **Goal:** Let users choose analysis strategy before running analysis.
- **Implementation:**
  - 4 strategy pill buttons: Auto, Fast, Deep Analysis, Custom.
  - Custom mode: 2×2 grid with per-engine provider dropdowns.
  - Unavailable providers (no API key) shown as disabled options.
  - Provider attribution bar in results view shows which provider served each engine.

### F. Parser & Environment Fixes
- **Goal:** Fix CJK parser edge cases and monorepo dotenv resolution.
- **Implementation:**
  - Korean transition markers (`다시 현재`, `CUT TO`) and angle bracket inserts detected correctly.
  - Korean particle filter prevents action lines ending with particles from being misidentified as characters.
  - PDF blank-line between CJK character name and dialogue handled correctly.
  - `dotenv.config()` resolves both `cwd/.env` and `../../.env` for monorepo structure.

## 3. Files Modified

| File | Change |
|------|--------|
| `packages/core/.../GeminiProvider.ts` | Model chain retry (3 models) |
| `packages/core/.../AnalysisStrategy.ts` | New file: strategy type definitions |
| `packages/core/.../StrategyResolver.ts` | New file: strategy → provider mapping |
| `packages/core/src/index.ts` | New exports for strategy types |
| `apps/api/src/index.ts` | `/analyze` strategy support, `/providers` endpoint |
| `apps/web/.../page.tsx` | Strategy selector UI + provider attribution bar |
| `apps/web/.../dashboard.css` | Pill, grid, badge, provider bar CSS |
| `packages/core/.../parser.ts` | Korean transition/particle detection |
| `packages/core/.../parser.test.ts` | 2 new test cases |
| `packages/core/.../pdfParser.ts` | Double space collapse |
| `packages/core/src/shared/env.ts` | Monorepo dotenv path resolution |
| `.env.example` | LLM API key documentation |
