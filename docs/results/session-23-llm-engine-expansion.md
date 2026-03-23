# Result: Session 23 — LLM Engine Expansion + Benchmark Framework

## Overview
Expanded the LLM provider system from 4 providers to 8 providers across 5 cost tiers (free → premium), added 3 new analysis strategies (budget, premium, long-context), upgraded all existing providers to latest models, and built a CLI benchmark framework for cross-provider quality comparison.

## Changes

### 1. New Providers

#### DeepSeek V3 Provider
- Uses OpenAI SDK with `baseURL: 'https://api.deepseek.com'`
- Models: `deepseek-chat` (V3) / `deepseek-reasoner` (R1)
- Cost: $0.14/$0.28 per MTok (input/output) — cheapest paid option
- 164K context window
- **File:** `packages/core/src/creative/infrastructure/llm/DeepSeekProvider.ts`

#### Groq Provider (Free Tier)
- Uses OpenAI SDK with `baseURL: 'https://api.groq.com/openai/v1'`
- Model chain: `llama-3.3-70b-versatile` → `mixtral-8x7b-32768`
- Free tier: 14,400 req/day, 300+ tok/s (fastest inference)
- Retry + exponential backoff on rate limits
- **File:** `packages/core/src/creative/infrastructure/llm/GroqProvider.ts`

### 2. Provider Upgrades

#### Gemini 3-Tier System
- `standard`: gemini-2.5-flash → gemini-2.0-flash → gemini-2.5-flash-lite
- `pro`: gemini-2.5-pro → gemini-2.5-flash → gemini-2.0-flash
- `long-context`: gemini-1.5-pro (2M context) → gemini-2.5-pro → gemini-2.5-flash
- Retry with exponential backoff (2 retries, 5s base delay)
- Markdown code fence stripping at provider level
- **File:** `packages/core/src/creative/infrastructure/llm/GeminiProvider.ts`

#### Anthropic Sonnet 4.6
- Default model upgraded to `claude-sonnet-4-6` (Creative Writing Elo #1)
- Selectable models: `sonnet` / `opus` / `haiku`
- max_tokens increased to 8192
- **File:** `packages/core/src/creative/infrastructure/llm/AnthropicProvider.ts`

#### OpenAI gpt-4o-mini
- Added `gpt-4o-mini` model option (15x cheaper than gpt-4o)
- **File:** `packages/core/src/creative/infrastructure/llm/OpenAIProvider.ts`

### 3. Strategy System Expansion
- **ProviderChoice**: Added `deepseek`, `groq`, `gemini-pro`, `gemini-long`
- **StrategyName**: Added `budget`, `premium`, `long-context`
- Strategy mapping:
  - `budget`: Groq (narrative) + DeepSeek (metrics) — ~$0.002/run
  - `premium`: Anthropic (narrative) + Gemini Pro (metrics) — ~$0.50–$1.00/run
  - `long-context`: Gemini 1.5 Pro 2M (narrative) + DeepSeek (metrics) — ~$0.30/run
- Default provider priority: Gemini → Groq → DeepSeek → Anthropic → OpenAI → Mock
- **Files:** `AnalysisStrategy.ts`, `StrategyResolver.ts`

### 4. Benchmark Framework
- **ProviderBenchmark.ts**: Result types, provider cost table
- **engineRubrics.ts**: Per-engine scoring rubrics (structural + content scores)
- **BenchmarkRunner.ts**: Executes all provider×engine combinations, computes quality scores
- **run.ts**: CLI entry (`bun run benchmark`)
- Output: Tabular comparison of quality scores, latency, and cost per provider
- **Directory:** `packages/core/src/creative/infrastructure/benchmark/`

### 5. Integration
- LLMFactory: 8 providers registered (openai, anthropic, gemini, gemini-pro, gemini-long, deepseek, groq, mock)
- API `/providers` endpoint: Returns availability for all 8 providers + 7 strategies
- API `/analyze`: Elysia validation updated with all new provider/strategy options
- Frontend UploadPanel: Strategy selector shows budget/premium/long-context with descriptive labels
- Env: `DEEPSEEK_API_KEY`, `GROQ_API_KEY` added to env schema
- Core exports: GeminiProvider, DeepSeekProvider, GroqProvider, benchmark types

### 6. Parser Fixes (from PDCA)
- Bracket detection for system messages (`[WARNING: ...]`)
- Unmatched closing paren filter (`LINE)`)
- Per-word Korean common word matching (`단계 행동`)
- Expanded Korean particles and common word blocklist
- **File:** `packages/core/src/script/infrastructure/parser.ts`

## Files Changed

| File | Changes |
|------|---------|
| `packages/core/.../llm/DeepSeekProvider.ts` | **New** — DeepSeek V3 provider |
| `packages/core/.../llm/GroqProvider.ts` | **New** — Groq free-tier provider |
| `packages/core/.../benchmark/ProviderBenchmark.ts` | **New** — Benchmark types + cost table |
| `packages/core/.../benchmark/engineRubrics.ts` | **New** — Per-engine scoring rubrics |
| `packages/core/.../benchmark/BenchmarkRunner.ts` | **New** — Benchmark execution engine |
| `packages/core/.../benchmark/run.ts` | **New** — Benchmark CLI entry point |
| `packages/core/.../llm/GeminiProvider.ts` | 3-tier model chains, retry backoff |
| `packages/core/.../llm/AnthropicProvider.ts` | Sonnet 4.6 upgrade, model selection |
| `packages/core/.../llm/OpenAIProvider.ts` | gpt-4o-mini model support |
| `packages/core/.../llm/AnalysisStrategy.ts` | ProviderChoice + StrategyName expansion |
| `packages/core/.../llm/StrategyResolver.ts` | budget/premium/long-context strategies |
| `packages/core/.../llm/LLMFactory.ts` | 8-provider registry |
| `packages/core/.../llm/MockProvider.ts` | Emotion template fix (`explanations[]`) |
| `packages/core/.../llm/LLMFactory.test.ts` | Tests for all 8 providers + tier variants |
| `packages/core/src/shared/env.ts` | DEEPSEEK_API_KEY, GROQ_API_KEY |
| `packages/core/src/index.ts` | New provider/benchmark exports |
| `packages/core/package.json` | `benchmark` script |
| `apps/api/src/index.ts` | /providers endpoint, Elysia validation, sequential engine execution |
| `apps/web/.../UploadPanel.tsx` | Strategy/provider labels for new options |
| `packages/core/src/script/infrastructure/parser.ts` | Korean parser edge case fixes |

## Verification
- `tsc --noEmit` — 0 errors in all changed files
- `bun test` — 24 tests pass (0 failures)
- API `/providers` — Returns all 8 providers and 7 strategies correctly
- Benchmark CLI — `bun run benchmark` entry point configured

## How to Run
```bash
# Set API keys for new providers (optional)
echo "DEEPSEEK_API_KEY=your-key" >> .env
echo "GROQ_API_KEY=your-key" >> .env

# Run benchmark
cd packages/core && bun run benchmark

# Run benchmark with specific engines/providers
bun run packages/core/src/creative/infrastructure/benchmark/run.ts --engines beatSheet,emotion --providers gemini,groq
```
