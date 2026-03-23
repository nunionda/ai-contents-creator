# Session 36: Deterministic Engine Calibration

## Summary
3개 LLM 의존 엔진(ContentRating, VFX, Trope)을 결정론적 키워드 기반 로직으로 전환하고, Groq LLM 결과를 기준 데이터로 사용하여 4차 교정 루프를 실행했다.

## Results

### Rating Engine — 100% 일치 달성

| 시나리오 | LLM (Groq) | DET (1차) | DET (4차) |
|----------|-----------|-----------|-----------|
| 전율미궁_귀신의집 (공포) | 15+ | 12+ ❌ | **15+ ✅** |
| 더킹 (범죄) | 15+ | ALL ❌ | **15+ ✅** |
| 비트세비어 (스릴러) | 15+ | 19+ ❌ | **15+ ✅** |

### VFX Engine — 편차 63% (116%→63%)

| 시나리오 | LLM shots | DET shots | LLM hours | DET hours |
|----------|-----------|-----------|-----------|-----------|
| 전율미궁 | 24 | 5 | 1,280h | 150h |
| 더킹 | 4 | 0 | 130h | 0h |
| 비트세비어 | 14 | 25 | 460h | 1,260h |

### Trope Engine — Jaccard 23% (12%→23%)

| 시나리오 | LLM Tropes | DET Tropes | Overlap | Jaccard |
|----------|-----------|-----------|---------|---------|
| 전율미궁 | 10 | 10 | 4 | 0.25 |
| 더킹 | 10 | 10 | 4 | 0.25 |
| 비트세비어 | 10 | 10 | 3 | 0.18 |

## Key Bug Fix: Korean `\b` Word Boundary

**근본 원인**: JavaScript의 `\b` (word boundary)는 `\w` (ASCII 기준)와 non-`\w` 사이에서만 작동. 한국어 문자는 `\w`에 포함되지 않으므로 `\b칼\b`, `\b피\b` 같은 패턴이 **절대 매칭되지 않음**.

**해결**: `isKoreanKeyword()` 함수로 한국어 키워드 감지 → 항상 `indexOf` 사용.

## Calibration Iterations

| Round | Rating | VFX (hrs diff) | Trope (Jaccard) | 주요 변경 |
|-------|--------|----------------|-----------------|----------|
| 1차 | 0% (0/3) | 116% | 12% | 초기 상태 |
| 2차 | 0% (0/3) | 63% | 13% | `\b` 수정 → 과다 매칭 |
| 3차 | 33% (1/3) | 63% | 23% | false positive 제거, KMRB 임계값 상향 |
| 4차 | **100% (3/3)** | **63%** | **23%** | `'성기'`→`'성행위'`, severe→moderate 재분류 |

## Files Changed

### New Files
| File | Purpose |
|------|---------|
| `packages/core/src/predictor/application/ContentRatingClassifierLLM.ts` | LLM 버전 백업 |
| `packages/core/src/production/application/VFXEstimatorLLM.ts` | LLM 버전 백업 |
| `packages/core/src/predictor/application/TropeAnalyzerLLM.ts` | LLM 버전 백업 |
| `packages/core/src/e2e/calibrationRunner.ts` | 교정 시뮬레이션 스크립트 |
| `packages/core/output/calibration/*.json` | 교정 결과 데이터 |

### Modified Files
| File | Changes |
|------|---------|
| `ContentRatingClassifier.ts` | 결정론적 전환 + 키워드 4차 교정 |
| `VFXEstimator.ts` | 결정론적 전환 + false positive 제거 |
| `TropeAnalyzer.ts` | 결정론적 전환 + 한국어 키워드 보강 |
| `apps/api/src/index.ts` | 듀얼 모드 파이프라인 (`useDeterministic`) |
| `packages/core/src/index.ts` | LLM 백업 클래스 export 추가 |

## How to Run

### Deterministic Mode
```bash
curl -X POST http://localhost:4005/analyze?deterministic=true \
  -H "Content-Type: application/json" \
  -d '{"scriptBase64": "...", "isPdf": true, "market": "korean"}'
```

### Calibration Runner
```bash
# Full run (Groq LLM + Deterministic + Comparison)
bun run packages/core/src/e2e/calibrationRunner.ts

# Deterministic only (reuse cached LLM results)
bun run packages/core/src/e2e/calibrationRunner.ts --det-only
```

### Output
교정 결과: `packages/core/output/calibration/calibration-report-*.json`
