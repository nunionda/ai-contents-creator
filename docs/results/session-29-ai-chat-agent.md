# Session 29: Phase 2 — AI Chat Agent

## Objective
OnDesk/Prescene 벤치마크 대비 가장 큰 갭이었던 **AI Chat Agent** 구현. 분석 완료 후 사용자가 대본에 대해 자유롭게 질문할 수 있는 대화형 어시스턴트.

## Architecture Decisions
- **컨텍스트 주입 방식**: Pinecone RAG 대신 DB에 저장된 분석 리포트 JSON을 LLM 시스템 프롬프트에 압축 주입 (토큰 효율적, 임베딩 오버헤드 회피)
- **비스트리밍**: 기존 `ILLMProvider.generateText()` 인터페이스 활용 (스트리밍은 향후 Phase)
- **프론트엔드 상태 관리**: 채팅 히스토리 클라이언트 상태에서만 관리 (DB 미저장)

## Changes

### New Files
| File | Description |
|------|-------------|
| `packages/core/src/creative/application/ScriptChatAgent.ts` | 채팅 에이전트 서비스 — 리포트 컨텍스트 압축, 대화 히스토리 관리, 후속 질문 자동 생성 |
| `apps/web/src/app/dashboard/components/ChatPanel.tsx` | 플로팅 채팅 UI — FAB 버튼, 슬라이드업 패널, 메시지 버블, 후속 질문 칩 |
| `apps/web/src/app/dashboard/components/ChatPanel.css` | 글래스모피즘 스타일, 반응형 모바일, 프린트 숨김 |

### Modified Files
| File | Change |
|------|--------|
| `packages/core/src/index.ts` | `ScriptChatAgent` export 추가 |
| `apps/api/src/index.ts` | `POST /chat` 엔드포인트 (DB 리포트 로드 → LLM 호출 → 응답) |
| `apps/web/src/app/dashboard/page.tsx` | `ChatPanel` 통합 (분석 결과 있을 때만 표시) |

## Key Features
- **리포트 컨텍스트 압축**: Coverage, Beat Sheet, Emotion Graph, Character Network, ROI, Tropes, Narrative Arc, Production 데이터를 구조화된 텍스트로 변환하여 토큰 절약
- **후속 질문 자동 생성**: LLM 응답에서 FOLLOW_UPS JSON 파싱, 실패 시 기본 질문 3개 제공
- **한/영 바이링구얼**: locale에 따라 UI 텍스트 및 LLM 응답 언어 자동 전환
- **프로바이더 폴백**: 기존 withFallback 패턴 활용, coverage 엔진 우선 → gemini → anthropic → ... → mock
- **예시 질문 칩**: 빈 상태에서 "가장 큰 강점은?", "캐릭터 아크 분석", "흥행 가능성 개선" 등 클릭 가능

## Verification
- `apps/api`: `npx tsc --noEmit` — 0 errors
- `apps/web`: `npx tsc --noEmit` — 0 errors
- `packages/core`: ScriptChatAgent 관련 0 errors

## Competitive Gap Update
| Feature | OnDesk | ScriptBook | Our System |
|---------|--------|------------|------------|
| AI Chat Agent | ✅ | — | ✅ (NEW) |
| Draft Comparison | ✅ | — | ❌ (Phase 3) |
| Semantic Search | ✅ | — | ❌ (Phase 3+) |
