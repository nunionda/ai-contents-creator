# Session 34: E2E Simulation & Korean Parser Enhancement

## Objective
3개 한국 시나리오 PDF를 전체 15엔진 파이프라인으로 검증하고, 한국 시나리오 특유의 인라인 대사 포맷 지원을 추가.

## Changes

### New Files (4) — E2E Simulation Framework
- **`packages/core/src/e2e/types.ts`** — ScenarioConfig, EngineResult, ScenarioReport, E2EReport 타입
- **`packages/core/src/e2e/validators.ts`** — 15개 엔진별 출력 검증기 (PASS/WARN/FAIL)
- **`packages/core/src/e2e/report.ts`** — 콘솔 리포트 포맷터, 시나리오 간 비교, JSON 저장
- **`packages/core/src/e2e/simulationTest.ts`** — 메인 E2E 러너 (curl subprocess, 10분 타임아웃)

### Modified Files (5)

- **`packages/core/src/script/infrastructure/parser.ts`**
  - `preprocessKoreanInlineDialogue()` 추가: 한국 시나리오 `Name DialogueText` 포맷 자동 감지
  - 빈도 분석으로 캐릭터명 식별 (≥5회), 조사/동사어미/일반명사 필터
  - 파티클 중복 제거 (유진이→유진 존재 시 제거)

- **`packages/core/src/creative/application/CharacterAnalyzer.ts`**
  - `extractInlineCharacters()` 정규식 확장: `Name(age/gender)` 패턴 지원
  - 매칭 예: `오유진(17/여)`, `아키(50대/남)`, `마유(30대)`
  - 씬 등장 기준 ≥2 → ≥1로 완화

- **`packages/core/src/creative/infrastructure/llm/MockProvider.ts`**
  - BeatSheet 조건: `"3-Act"` → `"3-Act" || "15-beat framework"` + `!coverage` 가드

- **`packages/core/src/predictor/application/TropeAnalyzer.ts`**
  - JSON 파싱: markdown fences 제거, `content.match(/\[[\s\S]*\]/)` 배열 추출
  - 사전 매칭 완화: partial match + canonical name 매핑

- **`package.json`** (root)
  - `"test:e2e:sim"` 스크립트 추가

## Verification Results

### E2E Simulation (3 scenarios × 15 engines)

| 시나리오 | Elements | Characters | Protagonist | Locations | Budget | ROI | Result |
|---------|----------|-----------|-------------|-----------|--------|-----|--------|
| 더킹 (범죄 드라마) | 4,115 | 48 | 동수 | 160 | ₩4.7B | Hit (2.8x) | 9P / 6W / 0F |
| 비트세비어 (테크노 스릴러) | 3,458 | 23 | 진우 | 123 | ₩3.1B | Hit (2.8x) | 9P / 6W / 0F |
| 전율미궁 (심리 공포) | 2,200 | 16 | 해영 | 14 | ₩2.8B | Hit (3.2x) | 9P / 6W / 0F |

**SUMMARY: 27/45 PASS | 18 WARN | 0 FAIL**

- 6 WARN per scenario: BeatSheet, Emotion, NarrativeArc, Rating, Tropes, Coverage — LLM rate limit로 mock fallback (인프라 이슈)
- Character detection: 더킹 0→48, 비트세비어 5→23, 전율미궁 1→16

### Unit Tests
- Parser: 6/6 pass
- Creative Analysis: 7/7 pass

## How to Run

```bash
# API 서버 시작
cd apps/api && bun run src/index.ts

# E2E 시뮬레이션 실행
bun run test:e2e:sim

# JSON 리포트 확인
ls packages/core/output/e2e-report-*.json
```
