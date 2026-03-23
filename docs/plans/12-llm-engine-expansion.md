# Plan: LLM Engine Expansion — Multi-Provider + Benchmark Framework

## Overview
Expand the LLM provider ecosystem from 4 providers (Gemini, Anthropic, OpenAI, Mock) to 8 providers with tiered model chains, add cost-optimized analysis strategies, and build a benchmark framework for provider-vs-engine quality comparison.

## Scope
- **New Providers**: DeepSeek V3 ($0.14/MTok), Groq Llama 3.3 70B (free tier)
- **Provider Upgrades**: Gemini 3-tier model chains, Anthropic Sonnet 4.6, OpenAI gpt-4o-mini
- **Strategy Expansion**: budget, premium, long-context strategies
- **Benchmark Framework**: CLI tool to compare all providers × engines with scoring rubrics

## Architecture

### Provider Tiers
| Tier | Provider | Model | Cost (Input/Output $/MTok) |
|------|----------|-------|----------------------------|
| Free | Groq | Llama 3.3 70B | $0 / $0 |
| Free | Gemini Flash | 2.5-flash | $0 (rate-limited) |
| Budget | DeepSeek | V3 (deepseek-chat) | $0.14 / $0.28 |
| Mid | Gemini Pro | 2.5-pro | $1.25 / $10.00 |
| Premium | Claude Sonnet 4.6 | claude-sonnet-4-6 | $3.00 / $15.00 |

### Gemini Tier System
- **Standard**: gemini-2.5-flash → gemini-2.0-flash → gemini-2.5-flash-lite
- **Pro**: gemini-2.5-pro → gemini-2.5-flash → gemini-2.0-flash
- **Long-context**: gemini-1.5-pro (2M) → gemini-2.5-pro (1M) → gemini-2.5-flash (1M)

### Strategy Matrix
| Strategy | Use Case | Estimated Cost/Run |
|----------|----------|-------------------|
| budget | Dev/test, batch processing | ~$0.002 |
| fast | Quick preview, free users | ~$0.04 |
| auto | Default experience | $0.04–$0.30 |
| deep | Deep narrative analysis | ~$0.20 |
| premium | Studio-grade analysis | ~$0.50–$1.00 |
| long-context | Scripts >100K tokens | ~$0.30 |

## Files
| Type | File | Change |
|------|------|--------|
| New | `packages/core/.../llm/DeepSeekProvider.ts` | DeepSeek V3 via OpenAI SDK |
| New | `packages/core/.../llm/GroqProvider.ts` | Groq free tier via OpenAI SDK |
| New | `packages/core/.../benchmark/ProviderBenchmark.ts` | Benchmark types + cost table |
| New | `packages/core/.../benchmark/engineRubrics.ts` | Per-engine scoring rubrics |
| New | `packages/core/.../benchmark/BenchmarkRunner.ts` | Benchmark execution engine |
| New | `packages/core/.../benchmark/run.ts` | CLI entry point |
| Mod | `packages/core/.../llm/GeminiProvider.ts` | 3-tier model chains |
| Mod | `packages/core/.../llm/AnthropicProvider.ts` | Sonnet 4.6, model selection |
| Mod | `packages/core/.../llm/OpenAIProvider.ts` | gpt-4o-mini support |
| Mod | `packages/core/.../llm/AnalysisStrategy.ts` | ProviderChoice, StrategyName expansion |
| Mod | `packages/core/.../llm/StrategyResolver.ts` | budget, premium, long-context strategies |
| Mod | `packages/core/.../llm/LLMFactory.ts` | 8-provider registry |
| Mod | `packages/core/src/shared/env.ts` | DEEPSEEK_API_KEY, GROQ_API_KEY |
| Mod | `apps/api/src/index.ts` | Elysia validation + /providers endpoint |
| Mod | `apps/web/.../UploadPanel.tsx` | Strategy/provider labels in UI |
