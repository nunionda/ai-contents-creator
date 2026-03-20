# WebSocket 실시간 파이프라인 모니터링

> Date: 2026-03-20 | Status: Approved | Rev: 2 (spec review 반영)

## Problem

파이프라인 모니터링 UI가 3초 간격 HTTP 폴링(`setInterval(fetchRuns, 3000)`)에 의존. 불필요한 네트워크 요청, 최대 3초 지연, 서버 부하 증가.

## Solution

Bun 네이티브 WebSocket + Hono fetch 래핑으로 서버→클라이언트 실시간 이벤트 푸시. 연결 실패 시 기존 폴링 자동 폴백.

## Architecture

```
[PipelineOrchestrator(eventBus)]  ──emit──→  [PipelineEventBus]  ──ws.send──→  [Browser]
      (agents pkg, injected)                   (api에서 생성)                    (Next.js)
```

### PipelineEventBus (의존성 주입 방식)

- `packages/agents/src/base/pipeline-events.ts` — EventEmitter 클래스 (싱글톤 아님)
- `PipelineOrchestrator` 생성자에서 `eventBus?: PipelineEventBus` 파라미터로 주입
- `apps/api/src/services/pipeline.service.ts`에서 bus 인스턴스를 생성하여 orchestrator + WS handler 양쪽에 전달
- **이유**: 모노레포 workspace 패키지 간 모듈 싱글톤이 보장되지 않으므로 DI 패턴 사용

### WebSocket Server (Bun 네이티브 업그레이드)

- `apps/api/src/ws/handler.ts` — 연결 관리, 클라이언트 Set, broadcast
- **핵심**: Hono route가 아닌 `fetch` 래퍼에서 `server.upgrade(req)` 호출
- Bun `export default { fetch, websocket }` 패턴 사용

```typescript
// apps/api/src/index.ts (개념)
export default {
  port: 3001,
  fetch(req: Request, server: Server) {
    if (new URL(req.url).pathname === "/api/pipeline/ws") {
      return server.upgrade(req) ? undefined : new Response("Upgrade failed", { status: 400 })
    }
    return app.fetch(req)
  },
  websocket: wsHandler,
}
```

### Client Hook

- `apps/web/hooks/use-pipeline-ws.ts` — `usePipelineWS` 커스텀 훅
- 자동 연결, 자동 재연결 (3초 간격, 최대 5회), 폴링 폴백
- WebSocket `open` 시 폴링 `clearInterval` 명시적 호출

## Event Types

```typescript
// packages/shared/src/types/ws-events.ts

export type PipelineWSEvent =
  | { type: "run:snapshot"; runs: PipelineRunSnapshot[] }
  | { type: "run:started"; runId: string; projectId: string; projectTitle: string; steps: string[] }
  | { type: "step:started"; runId: string; step: string; stepIndex: number }
  | { type: "step:completed"; runId: string; step: string; success: boolean; message?: string }
  | { type: "progress"; runId: string; progress: number; currentStep: string }
  | { type: "run:completed"; runId: string; status: "completed" | "failed"; error?: string }

export interface PipelineRunSnapshot {
  runId: string
  projectId: string
  projectTitle: string
  status: string
  currentStep: string | null
  progress: number
  steps: string[]
}
```

### 이벤트 발행 지점 (pipeline.ts)

| 코드 위치 | 이벤트 | 설명 |
|-----------|--------|------|
| `RUNNING` DB 업데이트 후 | `run:started` | 실행 시작 알림 (projectTitle 포함) |
| `agent.execute()` 호출 전 | `step:started` | 각 에이전트 단계 시작 |
| `agent.execute()` 성공 후 | `step:completed` + `progress` | 단계 완료 + 진행률 |
| `agent.execute()` 실패 시 | `step:completed(success:false)` | 실패한 단계 알림 |
| `COMPLETED/FAILED` 업데이트 후 | `run:completed` | 최종 완료/실패 |
| WebSocket `open` 이벤트 | `run:snapshot` | 접속 시 현재 활성 런 전체 상태 전송 |

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `packages/shared/src/types/ws-events.ts` | CREATE | WSEvent 타입 + PipelineRunSnapshot |
| `packages/shared/src/index.ts` | MODIFY | ws-events export 추가 |
| `packages/agents/src/base/pipeline-events.ts` | CREATE | PipelineEventBus 클래스 (DI용, 싱글톤 아님) |
| `packages/agents/src/base/pipeline.ts` | MODIFY | 생성자에 eventBus 주입 + 이벤트 발행 |
| `packages/agents/src/index.ts` | MODIFY | PipelineEventBus export 추가 |
| `apps/api/src/ws/handler.ts` | CREATE | WebSocket 연결 관리 + broadcast |
| `apps/api/src/services/pipeline.service.ts` | MODIFY | bus 생성 → orchestrator + WS handler 연결 |
| `apps/api/src/index.ts` | MODIFY | fetch 래퍼 + websocket 핸들러 등록 |
| `apps/web/hooks/use-pipeline-ws.ts` | CREATE | usePipelineWS 훅 (새 디렉토리) |
| `apps/web/app/(dashboard)/pipeline/page.tsx` | MODIFY | 폴링→WebSocket 전환, Map 기반 상태 관리 |

## Fallback Strategy

1. WebSocket 연결 시도
2. 연결 끊김 → 3초 후 재연결 (최대 5회)
3. 5회 모두 실패 → 기존 HTTP 폴링 `setInterval` 시작
4. WebSocket `open` 이벤트 시 → `clearInterval`로 폴링 명시적 중단
5. 초기 연결 성공 시 `run:snapshot` 이벤트로 현재 상태 동기화

## Client State Management

- `Map<string, PipelineRun>` 기반 상태 관리
- `run:snapshot` → 전체 Map 초기화
- `run:started` → Map에 새 항목 추가 (projectTitle 포함)
- `step:*` / `progress` → Map.get(runId)로 해당 항목 업데이트
- `run:completed` → 해당 항목 status 업데이트

## Constraints

- 추가 npm 의존성 없음 (Bun 네이티브 WebSocket)
- 로컬 맥북 환경 우선
- 기존 REST API 엔드포인트 유지 (폴백용)
