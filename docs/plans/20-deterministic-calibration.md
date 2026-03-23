# Plan 20: Deterministic Engine Calibration

## Goal
3개 LLM 의존 엔진(ContentRating, VFX, Trope)을 결정론적 키워드 기반 로직으로 전환하고, Groq LLM 결과를 기준 데이터(ground truth)로 사용하여 키워드 사전·임계값을 교정한다.

## Architecture

### Dual Mode Pipeline
- `useDeterministic: true` → 키워드 기반 결정론적 엔진 사용
- `useDeterministic: false` → 기존 LLM 기반 엔진 사용
- API: `POST /analyze?deterministic=true`

### Deterministic Engine Design

| Engine | 방식 | 핵심 로직 |
|--------|------|----------|
| ContentRatingClassifier | 키워드 심각도 분류 | 4카테고리(V/P/S/D) × 3심각도(severe/moderate/mild) → KMRB/MPAA 규칙 |
| VFXEstimator | 키워드→티어 매핑 | VFX_TIER_MAP + AMPLIFIER/DIMINISHER 수정자 |
| TropeAnalyzer | 키워드 클러스터 빈도 | 트로프별 키워드 셋, 최소 2매칭 + 상위 10개 |

### Calibration Loop
```
Groq LLM 분석 (ground truth) → 결정론적 분석 → 비교 리포트 → 키워드/임계값 조정 → 반복
```

### 비교 메트릭
- **Rating**: 등급 일치율 (KMRB 5등급)
- **VFX**: 복잡도 점수 차이, 시간 추정 편차(%)
- **Trope**: Jaccard 유사도 (교집합/합집합)

## Implementation

| File | Purpose |
|------|---------|
| `ContentRatingClassifier.ts` | 키워드 기반 결정론적 등급 분류 (수정) |
| `VFXEstimator.ts` | 키워드 기반 결정론적 VFX 추정 (수정) |
| `TropeAnalyzer.ts` | 키워드 기반 결정론적 트로프 분석 (수정) |
| `ContentRatingClassifierLLM.ts` | 기존 LLM 버전 백업 (신규) |
| `VFXEstimatorLLM.ts` | 기존 LLM 버전 백업 (신규) |
| `TropeAnalyzerLLM.ts` | 기존 LLM 버전 백업 (신규) |
| `calibrationRunner.ts` | Groq 시뮬레이션 + 비교 리포트 스크립트 (신규) |
| `apps/api/src/index.ts` | 듀얼 모드 파이프라인 분기 (수정) |
| `packages/core/src/index.ts` | LLM 백업 클래스 export 추가 (수정) |

## Key Decisions
- 한국어 `\b` word boundary 미작동 → `isKoreanKeyword()` 함수로 한국어는 항상 indexOf
- 1~2자 한국어 키워드('총','칼','불','빛') → 조사 포함 형태('총을','칼로','불길','화염')로 교체
- KMRB 임계값을 한국어 키워드 밀도에 맞게 상향 조정
- '살인','시체','잔혹' → severe에서 moderate로 재분류 (언급 ≠ 극단적 폭력)
