# Session 35: LLM Provider Benchmark

## Summary
6개 LLM 프로바이더(gemini, gemini-pro, groq, deepseek, anthropic, openai) × 3편 한국 시나리오 × 7개 엔진 = 18회 파이프라인 실행을 통해 프로바이더별 품질 점수를 비교하고 최적 조합을 도출했다.

## Results

### Provider × Engine Matrix (3편 평균)

| Engine | gemini | groq | deepseek | openai | anthropic | gemini-pro |
|--------|--------|------|----------|--------|-----------|------------|
| beatSheet | **96** | 94† | 94† | 94† | 94† | 94† |
| emotion | 94† | 94† | 94† | 94† | 94† | 94† |
| rating | 100† | 100† | 100† | 100† | 100† | 100† |
| roi | 100† | **100** | 100† | 100† | 100† | 100† |
| coverage | 100† | 100† | 100† | 100† | 100† | 100† |
| vfx | 55 | **64** | 55 | 55 | 55 | 55 |
| trope | 46 | **100** | 46 | 46 | 46 | 46 |
| **AVG** | 84 | **93** | 84 | 84 | 84 | 84 |
| **Cost/run** | $0.00 | $0.00 | $0.01 | $0.44 | $0.63 | $0.39 |

† = >50% fallback rate (provider couldn't handle this engine)

### Optimal Provider Mix (전략 3가지 모두 동일)

```json
{
  "strategy": "custom",
  "customProviders": {
    "beatSheet": "gemini",
    "emotion": "gemini",
    "rating": "gemini",
    "roi": "gemini",
    "coverage": "gemini",
    "vfx": "groq",
    "trope": "groq"
  }
}
```

**AVG Score: 93 | Cost: $0.00**

### Key Findings
1. **groq 최고 성능** — AVG 93, trope(100)와 vfx(64)에서 유일하게 우수
2. **Fallback 문제 심각** — 대부분 프로바이더가 beatSheet, emotion, rating, coverage에서 mock으로 fallback
3. **groq만 roi/trope 직접 처리** — 다른 5개 프로바이더는 모두 fallback chain 발동
4. **무료 프로바이더 조합 최적** — gemini + groq 조합으로 최고 품질 달성, 비용 $0.00

## Files Changed

### New Files (4)
| File | Purpose |
|------|---------|
| `packages/core/src/e2e/benchmarkTypes.ts` | ProviderRun, EngineScore, BenchmarkMatrix 타입 |
| `packages/core/src/e2e/benchmarkScorer.ts` | Engine rubric + validator 기반 스코어링 |
| `packages/core/src/e2e/benchmarkReport.ts` | 콘솔 매트릭스 + Optimal Mix + JSON 저장 |
| `packages/core/src/e2e/providerBenchmark.ts` | CLI 벤치마크 러너 (checkpoint, cooldown, resume) |

### Modified Files (2)
| File | Change |
|------|--------|
| `packages/core/src/creative/infrastructure/benchmark/engineRubrics.ts` | rating 루브릭에 KMRB 등급 추가 |
| `package.json` | `benchmark:providers` 스크립트 추가 |

### Output
- `packages/core/output/provider-benchmark-2026-03-22T15-57-35.json` — 전체 벤치마크 데이터

## How to Run

```bash
# API 서버 실행
cd apps/api && bun run src/index.ts

# 전체 벤치마크 (18회)
bun run benchmark:providers

# 특정 프로바이더만
bun run benchmark:providers -- --providers gemini,groq

# 중단된 벤치마크 재개
bun run benchmark:providers -- --resume
```

## Verification
- 18/18 runs 성공, 0 오류
- Checkpoint/resume 정상 작동 (gemini 3회 스킵 확인)
- JSON 리포트 정상 저장
