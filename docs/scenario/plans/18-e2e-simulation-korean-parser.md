# Plan 18: E2E Simulation & Korean Parser Enhancement

## Objective
3개 한국 시나리오 PDF를 전체 분석 파이프라인(15개 엔진)에 통과시켜 검증하고, 한국 시나리오 특유의 인라인 대사 포맷을 지원하도록 파서를 확장한다.

## Scope

### E2E Simulation Test Framework
- 시나리오 3편(더킹, 비트세비어, 전율미궁)을 API `/analyze` 엔드포인트로 전송
- 15개 엔진별 출력 구조 및 데이터 품질 검증
- 시나리오 간 비교 테이블 및 JSON 리포트 저장
- PASS / WARN(mock) / FAIL 3단계 판정

### Korean Inline Dialogue Parser
- 한국 시나리오 PDF 포맷: `Name DialogueText` 동일 라인 형식 감지
- 빈도 분석 기반 캐릭터명 자동 식별 (≥5회 등장)
- 조사/동사어미/일반명사 필터로 false positive 방지
- 전처리 단계에서 표준 Fountain 포맷으로 자동 분리

### CharacterAnalyzer Inline Extraction
- `Name(age/gender)` 패턴 지원 확장: `오유진(17/여)`, `아키(50대/남)`
- 씬 등장 기준 완화 (≥2 → ≥1)

### MockProvider & TropeAnalyzer Fixes
- BeatSheet mock 조건 수정 (15-beat framework 키워드)
- Coverage/BeatSheet mock 충돌 해소
- TropeAnalyzer JSON 파싱 로버스트니스 강화

## Architecture
```
PDF → pdfParser → preprocessKoreanInlineDialogue() → parseFountain()
                                                          ↓
                                              CharacterAnalyzer.analyze()
                                                (+ extractInlineCharacters)
```

## Files
| File | Action |
|------|--------|
| `packages/core/src/e2e/types.ts` | NEW |
| `packages/core/src/e2e/validators.ts` | NEW |
| `packages/core/src/e2e/report.ts` | NEW |
| `packages/core/src/e2e/simulationTest.ts` | NEW |
| `packages/core/src/script/infrastructure/parser.ts` | EDIT |
| `packages/core/src/creative/application/CharacterAnalyzer.ts` | EDIT |
| `packages/core/src/creative/infrastructure/llm/MockProvider.ts` | EDIT |
| `packages/core/src/predictor/application/TropeAnalyzer.ts` | EDIT |
| `package.json` | EDIT |
