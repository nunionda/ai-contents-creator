# Phase 4-F: 배치 프로덕션 — 씬/컷 단위 순차 실행 + 재생성

> Date: 2026-03-20

## Goal

DirectionPlan의 씬/컷 구조를 기반으로, 전체 프로덕션 파이프라인을 씬 단위로 순차 실행하고, 완료된 씬/컷을 개별적으로 재생성할 수 있는 배치 프로덕션 시스템을 구축한다.

## Context

현재 파이프라인은 `PipelineOrchestrator`가 에이전트를 순차 실행하는 단일 런 구조. 씬이 96개인 프로젝트에서 전체를 한 번에 돌리면 중간에 실패한 씬 때문에 전체가 멈추고, 마음에 안 드는 결과를 개별적으로 수정할 방법이 없다.

## Design Principles

1. **안정성 우선** — 동시 처리보다 순차 처리로 에러 격리
2. **실패 격리** — 하나가 실패해도 나머지는 계속 진행
3. **세밀한 재생성** — 씬 전체 또는 컷 하나만 선택적으로 재생성
4. **기존 호환** — 단일 PipelineRun 구조는 그대로 유지

---

## Data Model

### BatchRun (배치 실행 단위)

```prisma
model BatchRun {
  id              String      @id @default(cuid())
  projectId       String
  project         Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  status          RunStatus   @default(QUEUED)  // QUEUED, RUNNING, COMPLETED, FAILED
  totalScenes     Int
  completedScenes Int         @default(0)
  progress        Float       @default(0)
  errorMessage    String?
  sceneTasks      SceneTask[]
  startedAt       DateTime?
  completedAt     DateTime?
  createdAt       DateTime    @default(now())
}
```

### SceneTask (씬별 작업 단위)

```prisma
model SceneTask {
  id           String        @id @default(cuid())
  batchRunId   String
  batchRun     BatchRun      @relation(fields: [batchRunId], references: [id], onDelete: Cascade)
  sceneNumber  Int
  status       TaskStatus    @default(QUEUED)  // QUEUED, RUNNING, COMPLETED, FAILED, REGENERATING
  currentStep  String?
  stepResults  Json          @default("{}")
  attempt      Int           @default(1)
  errorMessage String?
  cutTasks     CutTask[]
  createdAt    DateTime      @default(now())
  completedAt  DateTime?

  @@unique([batchRunId, sceneNumber])
}
```

### CutTask (컷별 작업 단위)

```prisma
model CutTask {
  id           String      @id @default(cuid())
  sceneTaskId  String
  sceneTask    SceneTask   @relation(fields: [sceneTaskId], references: [id], onDelete: Cascade)
  cutNumber    Int
  status       TaskStatus  @default(QUEUED)  // QUEUED, RUNNING, COMPLETED, FAILED, REGENERATING
  steps        Json        // ["cinematographer", "generalist", "sound_designer"]
  currentStep  String?
  stepResults  Json        @default("{}")
  attempt      Int         @default(1)
  errorMessage String?
  createdAt    DateTime    @default(now())
  completedAt  DateTime?

  @@unique([sceneTaskId, cutNumber])
}
```

### New Enum

```prisma
enum TaskStatus {
  QUEUED
  RUNNING
  COMPLETED
  FAILED
  REGENERATING
}
```

### Project relation 추가

```prisma
model Project {
  // ... existing fields
  batchRuns  BatchRun[]
}
```

---

## Execution Engine: BatchOrchestrator

### 실행 흐름

```
BatchOrchestrator.run(batchRunId)
│
├── 1. DirectionPlan에서 씬/컷 목록 추출
├── 2. SceneTask + CutTask 레코드 일괄 생성
│
├── 3. 씬 순차 루프 (씬 1 → 씬 2 → ... → 씬 N)
│   │
│   ├── 3a. 씬 레벨 에이전트 실행
│   │   (concept_artist: 해당 씬 스토리보드 생성)
│   │
│   ├── 3b. 컷 순차 루프 (컷 1 → 컷 2 → ... → 컷 M)
│   │   ├── cinematographer (프롬프트 보강)
│   │   ├── generalist (비디오 생성)
│   │   └── sound_designer (TTS/SFX)
│   │
│   ├── 3c. 씬 완료 → WebSocket emit
│   └── 3d. progress 업데이트
│
└── 4. 전체 완료 → 후반작업 (master_editor 등)
```

### 클래스 구조

```typescript
class BatchOrchestrator {
  constructor(
    private db: PrismaClient,
    private agentRegistry: Map<string, BaseAgent>,
    private eventBus: EventEmitter,
  ) {}

  // 메인 실행
  async run(batchRunId: string): Promise<void>

  // 씬 하나 실행 (씬 레벨 에이전트 + 컷 루프)
  private async executeScene(sceneTask: SceneTask, sceneData: DirectionPlanScene): Promise<void>

  // 컷 하나 실행 (에이전트 체인)
  private async executeCut(cutTask: CutTask, cutData: DirectionPlanCut, sceneContext: unknown): Promise<void>

  // 재생성
  async regenerateScene(batchRunId: string, sceneNumber: number): Promise<void>
  async regenerateCut(sceneTaskId: string, cutNumber: number): Promise<void>
  async rerunFrom(batchRunId: string, fromSceneNumber: number): Promise<void>
}
```

### 에러 처리 정책

- **컷 실패**: 해당 CutTask만 FAILED, 같은 씬의 나머지 컷은 계속 진행
- **씬 레벨 에이전트 실패**: 해당 SceneTask 전체 FAILED, 다음 씬으로 넘어감
- **전체 중단 없음**: 실패한 씬/컷은 나중에 개별 재생성 가능
- **BatchRun 최종 상태**: 모든 씬 COMPLETED → COMPLETED, 하나라도 FAILED → FAILED (하지만 중단하지 않음)

### Progress 계산

```
씬 가중치 = 각 씬의 컷 수에 비례
컷 가중치 = 1 (동일)
progress = (완료된 컷 가중치 합 / 전체 컷 가중치 합) × 100
```

---

## API Endpoints

### 배치 실행

```
POST /api/batch/:projectId/run
  Body: { steps?: string[] }  // 기본: ["concept_artist", "cinematographer", "generalist", "sound_designer"]
  Response: { batchRun: BatchRun }
  동작: DirectionPlan에서 씬/컷 추출 → BatchRun + SceneTask + CutTask 생성 → 비동기 실행

GET /api/batch/:projectId/runs
  Response: { batchRuns: BatchRun[] }

GET /api/batch/:projectId/run/:batchRunId
  Response: { batchRun: BatchRun & { sceneTasks: (SceneTask & { cutTasks: CutTask[] })[] } }
```

### 재생성

```
POST /api/batch/:batchRunId/scene/:sceneNumber/regenerate
  동작: SceneTask + 모든 CutTask 초기화 → attempt++ → 재실행

POST /api/batch/:batchRunId/scene/:sceneNumber/cut/:cutNumber/regenerate
  동작: CutTask만 초기화 → attempt++ → 즉시 실행

POST /api/batch/:batchRunId/rerun-from/:sceneNumber
  동작: 씬 N~끝까지 모든 SceneTask/CutTask 초기화 → 순차 재실행
```

### 라우트 등록

```typescript
// apps/api/src/index.ts
import { batchRoutes } from "./routes/batch.ts"
app.route("/api/batch", batchRoutes)
```

---

## WebSocket Events

```typescript
// 기존 PipelineWSEvent에 추가
| { type: "batch:started"; batchRunId: string; projectId: string; totalScenes: number }
| { type: "batch:scene:started"; batchRunId: string; sceneNumber: number }
| { type: "batch:scene:completed"; batchRunId: string; sceneNumber: number; success: boolean }
| { type: "batch:cut:started"; batchRunId: string; sceneNumber: number; cutNumber: number; step: string }
| { type: "batch:cut:completed"; batchRunId: string; sceneNumber: number; cutNumber: number; success: boolean }
| { type: "batch:progress"; batchRunId: string; progress: number; currentScene: number; currentCut?: number }
| { type: "batch:completed"; batchRunId: string; status: "completed" | "failed" }
```

WS 핸들러의 `run:snapshot`에도 활성 BatchRun 포함.

---

## UI: 배치 모니터

### 위치

프로젝트 상세 페이지 → Production 탭에 "배치 프로덕션" 섹션 추가.

### 레이아웃

```
┌──────────────────────────────────────────────────┐
│ 배치 프로덕션                       [실행] [중단]  │
│ Progress: ████████░░░░░░░░ 52% (씬 5/10)         │
├──────────────────────────────────────────────────┤
│ 씬 1  ✅ 완료  (컷 4/4)                 [재생성]  │
│ 씬 2  ✅ 완료  (컷 3/3)                 [재생성]  │
│ 씬 3  ❌ 실패  (컷 2 실패)              [재생성]  │
│   ├ 컷 1  ✅                                     │
│   ├ 컷 2  ❌ "Veo API timeout"       [재생성]    │
│   └ 컷 3  ✅                                     │
│ 씬 4  ✅ 완료  (컷 5/5)                 [재생성]  │
│ 씬 5  🔄 진행중 (컷 2/4 - generalist)            │
│   ├ 컷 1  ✅                                     │
│   ├ 컷 2  🔄 비디오 생성 중...                    │
│   ├ 컷 3  ⏳ 대기                                │
│   └ 컷 4  ⏳ 대기                                │
│ 씬 6~10  ⏳ 대기                                 │
├──────────────────────────────────────────────────┤
│ [씬 ▼ 부터 재실행]                                │
└──────────────────────────────────────────────────┘
```

### 컴포넌트 구조

```
BatchMonitor (메인 컨테이너)
├── BatchHeader (진행률 바, 실행/중단 버튼)
├── SceneTaskList (씬 목록)
│   └── SceneTaskRow (씬 1줄 — 접기/펼치기)
│       └── CutTaskList (컷 목록 — 펼친 상태)
│           └── CutTaskRow (컷 1줄)
└── RerunFromSelector (씬 N부터 재실행 드롭다운)
```

### 인터랙션

- **씬 접기/펼치기**: 기본 접힌 상태. 진행 중/실패 씬은 자동 펼침.
- **재생성 버튼**: 씬/컷별 개별 재생성. 확인 다이얼로그 후 실행.
- **실시간 업데이트**: WebSocket으로 상태/진행률 자동 갱신.
- **실행 버튼**: DirectionPlan이 있을 때만 활성화.

---

## Critical Files

| 파일 | 변경 | 설명 |
|------|------|------|
| `packages/db/prisma/schema.prisma` | 수정 | BatchRun, SceneTask, CutTask 모델 + TaskStatus enum |
| `packages/agents/src/base/batch-orchestrator.ts` | 신규 | BatchOrchestrator 클래스 |
| `apps/api/src/routes/batch.ts` | 신규 | 배치 API 라우트 |
| `apps/api/src/services/batch.service.ts` | 신규 | 배치 실행 서비스 (싱글톤 오케스트레이터) |
| `apps/api/src/index.ts` | 수정 | batchRoutes 등록 |
| `packages/shared/src/types/ws-events.ts` | 수정 | batch:* 이벤트 타입 추가 |
| `apps/api/src/ws/handler.ts` | 수정 | batch 이벤트 구독 + snapshot 포함 |
| `apps/web/components/batch-monitor.tsx` | 신규 | 배치 모니터 UI 컴포넌트 |
| `apps/web/app/(dashboard)/projects/[id]/page.tsx` | 수정 | Production 탭에 BatchMonitor 추가 |

---

## Scope Exclusions

- 에이전트 간 병렬 실행 (향후 확장)
- 동시 다중 배치 실행 (한 프로젝트에 동시에 하나만)
- 씬 순서 변경/건너뛰기
- 에이전트 체인 커스터마이징 UI (API에서만 steps 파라미터로 지원)
