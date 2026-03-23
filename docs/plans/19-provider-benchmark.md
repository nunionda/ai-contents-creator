# Plan 19: LLM Provider Benchmark

## Goal
3편 한국 시나리오 × 6개 LLM 프로바이더를 벤치마크하여 엔진별 최적 프로바이더 조합(Optimal Mix)을 도출한다.

## Architecture

### Test Matrix
- **Providers (6)**: gemini, gemini-pro, groq, deepseek, anthropic, openai
- **Engines (7)**: beatSheet, emotion, rating, roi, coverage, vfx, trope
- **Scenarios (3)**: 전율미궁 (58p), 더킹 (107p), 비트세비어 (130p)
- **Total**: 18 pipeline runs

### Scoring System
- Engine Rubrics: `scoreStructure()` (0-100) + `scoreContent()` (0-100)
- `overallScore = 0.4 * structural + 0.6 * content`
- Fallback detection: `response.providers[engine]` vs intended provider
- Validator integration: PASS/WARN/FAIL verdict

### Optimal Mix Strategies (3)
1. **QUALITY-FIRST**: 엔진별 최고 점수 프로바이더
2. **BUDGET-OPTIMIZED**: 품질 ≥ 65 중 최저 비용
3. **VALUE-BALANCED**: `score / (1 + cost * 100)` 최적화

### Implementation
| File | Purpose |
|------|---------|
| `benchmarkTypes.ts` | ProviderRun, EngineScore, BenchmarkMatrix 타입 |
| `benchmarkScorer.ts` | 루브릭 + validator 스코어링 |
| `benchmarkReport.ts` | 콘솔 테이블 + JSON + Optimal Mix |
| `providerBenchmark.ts` | CLI 러너 (checkpoint, cooldown, resume) |

### Execution
- Rate-limit-friendly order: groq → deepseek → openai → anthropic → gemini → gemini-pro
- Cooldowns: 10s between scenarios, 15s between providers
- Checkpoint/resume for long-running benchmarks
- `POST /analyze` with `strategy: 'custom'` via curl subprocess (Bun 300s timeout bypass)

### CLI
```bash
bun run benchmark:providers                           # Full (18 runs)
bun run benchmark:providers -- --providers gemini,groq # Specific
bun run benchmark:providers -- --resume                # Resume
```
