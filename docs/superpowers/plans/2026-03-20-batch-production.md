# 배치 프로덕션 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 씬/컷 단위 순차 배치 실행 + 개별 재생성이 가능한 프로덕션 파이프라인 구축

**Architecture:** BatchOrchestrator가 DirectionPlan의 씬/컷 구조를 읽어 SceneTask/CutTask 레코드를 생성하고 순차 실행한다. 각 씬/컷은 독립적으로 실패할 수 있으며, 완료 후 개별 재생성을 지원한다. WebSocket으로 실시간 상태를 전달하고, BatchMonitor UI가 이를 표시한다.

**Tech Stack:** Bun, TypeScript, Prisma (PostgreSQL), Hono, Next.js 15, WebSocket

**Spec:** `docs/superpowers/specs/2026-03-20-batch-production-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `packages/db/prisma/schema.prisma` | Modify | BatchRun, SceneTask, CutTask 모델 + TaskStatus enum |
| `packages/shared/src/types/ws-events.ts` | Modify | Batch WS 이벤트 타입 + BatchRunSnapshot |
| `packages/shared/src/types/batch.ts` | Create | BatchAgentInput, StepResults 타입 |
| `packages/agents/src/base/batch-orchestrator.ts` | Create | BatchOrchestrator 클래스 (씬/컷 순차 실행 엔진) |
| `packages/agents/src/index.ts` | Modify | BatchOrchestrator export 추가 |
| `apps/api/src/services/batch.service.ts` | Create | 배치 서비스 (싱글톤 오케스트레이터 + CRUD) |
| `apps/api/src/routes/batch.ts` | Create | 배치 API 라우트 (실행/조회/취소/재생성) |
| `apps/api/src/index.ts` | Modify | batchRoutes 등록 |
| `apps/api/src/ws/handler.ts` | Modify | batch 이벤트 구독 + snapshot 확장 |
| `apps/web/components/batch-monitor.tsx` | Create | 배치 모니터 UI 컴포넌트 |
| `apps/web/app/(dashboard)/projects/[id]/page.tsx` | Modify | Production 탭에 BatchMonitor 추가 |

---

## Task 1: Prisma 스키마 — BatchRun, SceneTask, CutTask 모델

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: TaskStatus enum 추가**

`schema.prisma` 끝에 (`AssetType` enum 뒤) 추가:

```prisma
enum TaskStatus {
  QUEUED
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
  REGENERATING
}
```

- [ ] **Step 2: BatchRun 모델 추가**

```prisma
model BatchRun {
  id              String      @id @default(cuid())
  projectId       String
  project         Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  status          RunStatus   @default(QUEUED)
  totalScenes     Int
  completedScenes Int         @default(0)
  progress        Float       @default(0)
  errorMessage    String?
  sceneTasks      SceneTask[]
  startedAt       DateTime?
  completedAt     DateTime?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}
```

- [ ] **Step 3: SceneTask 모델 추가**

```prisma
model SceneTask {
  id           String     @id @default(cuid())
  batchRunId   String
  batchRun     BatchRun   @relation(fields: [batchRunId], references: [id], onDelete: Cascade)
  sceneNumber  Int
  status       TaskStatus @default(QUEUED)
  currentStep  String?
  stepResults  Json       @default("{}")
  attempt      Int        @default(1)
  errorMessage String?
  cutTasks     CutTask[]
  startedAt    DateTime?
  completedAt  DateTime?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@unique([batchRunId, sceneNumber])
}
```

- [ ] **Step 4: CutTask 모델 추가**

```prisma
model CutTask {
  id           String     @id @default(cuid())
  sceneTaskId  String
  sceneTask    SceneTask  @relation(fields: [sceneTaskId], references: [id], onDelete: Cascade)
  cutNumber    Int
  status       TaskStatus @default(QUEUED)
  steps        Json
  currentStep  String?
  stepResults  Json       @default("{}")
  attempt      Int        @default(1)
  errorMessage String?
  startedAt    DateTime?
  completedAt  DateTime?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@unique([sceneTaskId, cutNumber])
}
```

- [ ] **Step 5: Project 모델에 batchRuns relation 추가**

`Project` 모델에 기존 `snapshots` 라인 아래에 추가:

```prisma
  batchRuns         BatchRun[]
```

- [ ] **Step 6: DB push**

Run: `cd packages/db && bunx prisma db push`
Expected: schema applied successfully

- [ ] **Step 7: Prisma client 재생성**

Run: `cd packages/db && bunx prisma generate`

- [ ] **Step 8: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "feat: BatchRun, SceneTask, CutTask Prisma 모델 추가"
```

---

## Task 2: 공유 타입 — Batch WS 이벤트 + BatchAgentInput

**Files:**
- Modify: `packages/shared/src/types/ws-events.ts`
- Create: `packages/shared/src/types/batch.ts`
- Modify: `packages/shared/src/index.ts` (barrel export에 batch.ts 추가)

- [ ] **Step 1: batch.ts 타입 파일 생성**

Create `packages/shared/src/types/batch.ts`:

```typescript
// ─── Step Result shape (stored in SceneTask.stepResults / CutTask.stepResults) ───

export type StepResult = {
  status: "completed" | "failed"
  message?: string
  outputPath?: string
  completedAt: string // ISO date
}

export type StepResults = Record<string, StepResult>

// ─── Batch Agent Input (adapts AgentInput for batch context) ───

export interface BatchAgentInput {
  projectId: string
  runId: string // batchRunId — agents receive this but skip PipelineRun updates
  sceneNumber: number
  cutNumber?: number
  batchRunId: string
  sceneTaskId: string
  cutTaskId?: string
  [key: string]: unknown
}
```

- [ ] **Step 2: ws-events.ts에 Batch 이벤트 타입 추가**

`packages/shared/src/types/ws-events.ts`의 `PipelineWSEvent` union 끝에 추가:

```typescript
export interface BatchRunSnapshot {
  batchRunId: string
  projectId: string
  projectTitle: string
  status: string
  progress: number
  totalScenes: number
  completedScenes: number
  currentScene?: number
}

// PipelineWSEvent union에 다음 멤버 추가:
  | { type: "batch:started"; batchRunId: string; projectId: string; totalScenes: number }
  | { type: "batch:scene:started"; batchRunId: string; sceneNumber: number }
  | { type: "batch:scene:completed"; batchRunId: string; sceneNumber: number; success: boolean }
  | { type: "batch:cut:started"; batchRunId: string; sceneNumber: number; cutNumber: number; step: string }
  | { type: "batch:cut:completed"; batchRunId: string; sceneNumber: number; cutNumber: number; success: boolean }
  | { type: "batch:cut:step:completed"; batchRunId: string; sceneNumber: number; cutNumber: number; step: string; success: boolean }
  | { type: "batch:progress"; batchRunId: string; progress: number; currentScene: number; currentCut?: number }
  | { type: "batch:completed"; batchRunId: string; status: "completed" | "failed" | "cancelled" }
  | { type: "batch:snapshot"; batchRuns: BatchRunSnapshot[] }
```

- [ ] **Step 3: barrel export에 batch.ts 추가**

`packages/shared/src/index.ts`에 추가:

```typescript
export * from "./types/batch.js"
```

- [ ] **Step 4: Typecheck**

Run: `bun run typecheck 2>&1 | grep -E "batch|shared"`
Expected: 새 파일에 에러 없음

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/types/batch.ts packages/shared/src/types/ws-events.ts packages/shared/src/index.ts
git commit -m "feat: Batch WS 이벤트 타입 + BatchAgentInput 공유 타입 추가"
```

---

## Task 3: BatchOrchestrator 엔진

**Files:**
- Create: `packages/agents/src/base/batch-orchestrator.ts`
- Modify: `packages/agents/src/index.ts`

**Reference:** `packages/agents/src/base/pipeline.ts` (PipelineOrchestrator 패턴 따름)

- [ ] **Step 1: BatchOrchestrator 클래스 생성**

Create `packages/agents/src/base/batch-orchestrator.ts`:

```typescript
import type { PrismaClient } from "@prisma/client"
import type { BaseAgent, AgentInput, AgentOutput } from "./agent.js"
import type { PipelineEventBus } from "./pipeline-events.js"
import type { PipelineWSEvent } from "@marionette/shared"
import type { StepResults, StepResult } from "@marionette/shared"
import type { DirectionPlan, Scene, Cut } from "@marionette/shared"

export class BatchOrchestrator {
  private abortController: AbortController | null = null
  private readonly registry: Map<string, BaseAgent>

  constructor(
    private readonly db: PrismaClient,
    registry: Map<string, BaseAgent>,
    private readonly eventBus?: PipelineEventBus,
  ) {
    this.registry = registry
  }

  // ─── Main run ───

  async run(batchRunId: string): Promise<void> {
    this.abortController = new AbortController()

    const batchRun = await this.db.batchRun.findUniqueOrThrow({
      where: { id: batchRunId },
      include: { project: true },
    })

    const directionPlan = batchRun.project.directionPlan as unknown as DirectionPlan | null
    if (!directionPlan?.scenes?.length) {
      await this.db.batchRun.update({
        where: { id: batchRunId },
        data: { status: "FAILED", errorMessage: "No DirectionPlan or scenes found" },
      })
      return
    }

    // Mark as RUNNING
    await this.db.batchRun.update({
      where: { id: batchRunId },
      data: { status: "RUNNING", startedAt: new Date() },
    })
    this.emit({ type: "batch:started", batchRunId, projectId: batchRun.projectId, totalScenes: batchRun.totalScenes })

    // Create scene/cut tasks if not already created
    const existingTasks = await this.db.sceneTask.count({ where: { batchRunId } })
    if (existingTasks === 0) {
      await this.createTasks(batchRunId, directionPlan)
    }

    // Load scene tasks
    const sceneTasks = await this.db.sceneTask.findMany({
      where: { batchRunId },
      orderBy: { sceneNumber: "asc" },
    })

    let completedScenes = 0

    for (const sceneTask of sceneTasks) {
      // Check cancellation
      if (this.abortController.signal.aborted) break

      // Skip already completed scenes (for rerunFrom support)
      if (sceneTask.status === "COMPLETED") {
        completedScenes++
        continue
      }

      // Skip cancelled scenes
      if (sceneTask.status === "CANCELLED") continue

      const sceneData = directionPlan.scenes.find((s) => s.scene_number === sceneTask.sceneNumber)
      if (!sceneData) continue

      await this.executeScene(batchRunId, sceneTask.id, sceneData)

      // Re-read status after execution
      const updated = await this.db.sceneTask.findUnique({ where: { id: sceneTask.id }, select: { status: true } })
      if (updated?.status === "COMPLETED") completedScenes++

      // Update batch progress
      await this.updateBatchProgress(batchRunId, completedScenes)
    }

    // Final status
    if (this.abortController.signal.aborted) return // cancel() already set status

    const failedCount = await this.db.sceneTask.count({ where: { batchRunId, status: "FAILED" } })
    const finalStatus = failedCount > 0 ? "FAILED" : "COMPLETED"

    await this.db.batchRun.update({
      where: { id: batchRunId },
      data: { status: finalStatus as "COMPLETED" | "FAILED", completedScenes, completedAt: new Date() },
    })
    this.emit({ type: "batch:completed", batchRunId, status: finalStatus.toLowerCase() as "completed" | "failed" })
  }

  // ─── Scene execution ───

  private async executeScene(batchRunId: string, sceneTaskId: string, sceneData: Scene): Promise<void> {
    await this.db.sceneTask.update({
      where: { id: sceneTaskId },
      data: { status: "RUNNING", startedAt: new Date() },
    })

    const sceneTask = await this.db.sceneTask.findUniqueOrThrow({ where: { id: sceneTaskId } })
    this.emit({ type: "batch:scene:started", batchRunId, sceneNumber: sceneTask.sceneNumber })

    // Scene-level agent (concept_artist)
    const conceptArtist = this.registry.get("concept_artist")
    if (conceptArtist) {
      try {
        const input: AgentInput = {
          projectId: (await this.db.batchRun.findUnique({ where: { id: batchRunId }, select: { projectId: true } }))!.projectId,
          runId: batchRunId,
          sceneNumber: sceneTask.sceneNumber,
          sceneData,
        }
        const output = await conceptArtist.execute(input)
        await this.recordSceneStep(sceneTaskId, "concept_artist", output)
      } catch (err) {
        await this.recordSceneStep(sceneTaskId, "concept_artist", {
          success: false,
          message: err instanceof Error ? err.message : String(err),
        })
        await this.db.sceneTask.update({
          where: { id: sceneTaskId },
          data: { status: "FAILED", errorMessage: `concept_artist failed: ${err}`, completedAt: new Date() },
        })
        this.emit({ type: "batch:scene:completed", batchRunId, sceneNumber: sceneTask.sceneNumber, success: false })
        return
      }
    }

    // Cut-level execution
    const cutTasks = await this.db.cutTask.findMany({
      where: { sceneTaskId },
      orderBy: { cutNumber: "asc" },
    })

    const cuts = sceneData.cuts ?? []

    for (const cutTask of cutTasks) {
      if (this.abortController?.signal.aborted) break
      if (cutTask.status === "COMPLETED" || cutTask.status === "CANCELLED") continue

      const cutData = cuts.find((c) => c.cut_number === cutTask.cutNumber)
      if (!cutData) continue

      await this.executeCut(batchRunId, sceneTask.sceneNumber, cutTask.id, cutData, sceneData)
    }

    // Scene final status
    if (this.abortController?.signal.aborted) return

    const failedCuts = await this.db.cutTask.count({ where: { sceneTaskId, status: "FAILED" } })
    const sceneStatus = failedCuts > 0 ? "FAILED" : "COMPLETED"

    await this.db.sceneTask.update({
      where: { id: sceneTaskId },
      data: {
        status: sceneStatus as "COMPLETED" | "FAILED",
        completedAt: new Date(),
        ...(failedCuts > 0 ? { errorMessage: `${failedCuts} cut(s) failed` } : {}),
      },
    })
    this.emit({ type: "batch:scene:completed", batchRunId, sceneNumber: sceneTask.sceneNumber, success: failedCuts === 0 })
  }

  // ─── Cut execution ───

  private async executeCut(
    batchRunId: string,
    sceneNumber: number,
    cutTaskId: string,
    cutData: Cut,
    sceneData: Scene,
  ): Promise<void> {
    const cutTask = await this.db.cutTask.findUniqueOrThrow({ where: { id: cutTaskId } })
    const steps = cutTask.steps as string[]
    const projectId = (await this.db.batchRun.findUnique({ where: { id: batchRunId }, select: { projectId: true } }))!.projectId

    await this.db.cutTask.update({
      where: { id: cutTaskId },
      data: { status: "RUNNING", startedAt: new Date() },
    })

    this.emit({ type: "batch:cut:started", batchRunId, sceneNumber, cutNumber: cutTask.cutNumber, step: steps[0] ?? "" })

    for (const step of steps) {
      if (this.abortController?.signal.aborted) break

      const agent = this.registry.get(step)
      if (!agent) continue

      await this.db.cutTask.update({ where: { id: cutTaskId }, data: { currentStep: step } })

      try {
        const input: AgentInput = {
          projectId,
          runId: batchRunId,
          sceneNumber,
          cutNumber: cutTask.cutNumber,
          cutData,
          sceneData,
        }
        const output = await agent.execute(input)
        await this.recordCutStep(cutTaskId, step, output)
        this.emit({ type: "batch:cut:step:completed", batchRunId, sceneNumber, cutNumber: cutTask.cutNumber, step, success: output.success })

        if (!output.success) {
          await this.db.cutTask.update({
            where: { id: cutTaskId },
            data: { status: "FAILED", errorMessage: `${step}: ${output.message}`, completedAt: new Date() },
          })
          this.emit({ type: "batch:cut:completed", batchRunId, sceneNumber, cutNumber: cutTask.cutNumber, success: false })
          return
        }
      } catch (err) {
        await this.recordCutStep(cutTaskId, step, {
          success: false,
          message: err instanceof Error ? err.message : String(err),
        })
        await this.db.cutTask.update({
          where: { id: cutTaskId },
          data: { status: "FAILED", errorMessage: `${step}: ${err}`, completedAt: new Date() },
        })
        this.emit({ type: "batch:cut:completed", batchRunId, sceneNumber, cutNumber: cutTask.cutNumber, success: false })
        return
      }

      // Update batch progress after each step
      await this.updateBatchProgressFromSteps(batchRunId)
    }

    if (this.abortController?.signal.aborted) return

    await this.db.cutTask.update({
      where: { id: cutTaskId },
      data: { status: "COMPLETED", currentStep: null, completedAt: new Date() },
    })
    this.emit({ type: "batch:cut:completed", batchRunId, sceneNumber, cutNumber: cutTask.cutNumber, success: true })
  }

  // ─── Cancel ───

  async cancel(batchRunId: string): Promise<void> {
    this.abortController?.abort()

    await this.db.batchRun.update({
      where: { id: batchRunId },
      data: { status: "CANCELLED", completedAt: new Date() },
    })
    await this.db.sceneTask.updateMany({
      where: { batchRunId, status: { in: ["RUNNING", "QUEUED"] } },
      data: { status: "CANCELLED" },
    })
    await this.db.cutTask.updateMany({
      where: { sceneTask: { batchRunId }, status: { in: ["RUNNING", "QUEUED"] } },
      data: { status: "CANCELLED" },
    })
    this.emit({ type: "batch:completed", batchRunId, status: "cancelled" })
  }

  // ─── Regeneration ───

  async regenerateScene(batchRunId: string, sceneNumber: number): Promise<void> {
    const sceneTask = await this.db.sceneTask.findFirst({
      where: { batchRunId, sceneNumber },
    })
    if (!sceneTask) throw new Error(`SceneTask not found: scene ${sceneNumber}`)

    await this.db.sceneTask.update({
      where: { id: sceneTask.id },
      data: { status: "QUEUED", attempt: { increment: 1 }, stepResults: "{}", currentStep: null, errorMessage: null, startedAt: null, completedAt: null },
    })
    await this.db.cutTask.updateMany({
      where: { sceneTaskId: sceneTask.id },
      data: { status: "QUEUED", attempt: { increment: 1 }, stepResults: "{}", currentStep: null, errorMessage: null, startedAt: null, completedAt: null },
    })

    // Re-run batch (only this scene will execute, others will be skipped as COMPLETED)
    await this.db.batchRun.update({
      where: { id: batchRunId },
      data: { status: "RUNNING", completedAt: null },
    })

    // Load scene data and execute just this scene
    const batchRun = await this.db.batchRun.findUniqueOrThrow({
      where: { id: batchRunId },
      include: { project: true },
    })
    const directionPlan = batchRun.project.directionPlan as unknown as DirectionPlan
    const sceneData = directionPlan.scenes.find((s) => s.scene_number === sceneNumber)
    if (!sceneData) throw new Error(`Scene ${sceneNumber} not found in DirectionPlan`)

    this.abortController = new AbortController()
    await this.executeScene(batchRunId, sceneTask.id, sceneData)
    await this.finalizeBatch(batchRunId)
  }

  async regenerateCut(batchRunId: string, sceneNumber: number, cutNumber: number): Promise<void> {
    const sceneTask = await this.db.sceneTask.findFirst({ where: { batchRunId, sceneNumber } })
    if (!sceneTask) throw new Error(`SceneTask not found: scene ${sceneNumber}`)

    const cutTask = await this.db.cutTask.findFirst({ where: { sceneTaskId: sceneTask.id, cutNumber } })
    if (!cutTask) throw new Error(`CutTask not found: cut ${cutNumber}`)

    await this.db.cutTask.update({
      where: { id: cutTask.id },
      data: { status: "QUEUED", attempt: { increment: 1 }, stepResults: "{}", currentStep: null, errorMessage: null, startedAt: null, completedAt: null },
    })

    await this.db.batchRun.update({
      where: { id: batchRunId },
      data: { status: "RUNNING", completedAt: null },
    })

    const batchRun = await this.db.batchRun.findUniqueOrThrow({
      where: { id: batchRunId },
      include: { project: true },
    })
    const directionPlan = batchRun.project.directionPlan as unknown as DirectionPlan
    const sceneData = directionPlan.scenes.find((s) => s.scene_number === sceneNumber)
    if (!sceneData) throw new Error(`Scene ${sceneNumber} not found in DirectionPlan`)
    const cutData = sceneData.cuts?.find((c) => c.cut_number === cutNumber)
    if (!cutData) throw new Error(`Cut ${cutNumber} not found in scene ${sceneNumber}`)

    this.abortController = new AbortController()
    await this.executeCut(batchRunId, sceneNumber, cutTask.id, cutData, sceneData)
    await this.finalizeBatch(batchRunId)
  }

  async rerunFrom(batchRunId: string, fromSceneNumber: number): Promise<void> {
    // Reset all scenes from N onwards
    const sceneTasks = await this.db.sceneTask.findMany({
      where: { batchRunId, sceneNumber: { gte: fromSceneNumber } },
    })

    for (const st of sceneTasks) {
      await this.db.sceneTask.update({
        where: { id: st.id },
        data: { status: "QUEUED", attempt: { increment: 1 }, stepResults: "{}", currentStep: null, errorMessage: null, startedAt: null, completedAt: null },
      })
      await this.db.cutTask.updateMany({
        where: { sceneTaskId: st.id },
        data: { status: "QUEUED", attempt: { increment: 1 }, stepResults: "{}", currentStep: null, errorMessage: null, startedAt: null, completedAt: null },
      })
    }

    // Re-run the full batch (completed scenes before fromSceneNumber will be skipped)
    await this.db.batchRun.update({
      where: { id: batchRunId },
      data: { status: "QUEUED", completedAt: null },
    })
    await this.run(batchRunId)
  }

  // ─── Helpers ───

  private async createTasks(batchRunId: string, plan: DirectionPlan): Promise<void> {
    const defaultSteps = ["cinematographer", "generalist", "sound_designer"]

    for (const scene of plan.scenes) {
      const sceneTask = await this.db.sceneTask.create({
        data: { batchRunId, sceneNumber: scene.scene_number },
      })

      const cuts = scene.cuts ?? []
      if (cuts.length > 0) {
        await this.db.cutTask.createMany({
          data: cuts.map((cut) => ({
            sceneTaskId: sceneTask.id,
            cutNumber: cut.cut_number,
            steps: defaultSteps,
          })),
        })
      }
    }
  }

  private async recordSceneStep(sceneTaskId: string, step: string, output: AgentOutput): Promise<void> {
    const scene = await this.db.sceneTask.findUnique({ where: { id: sceneTaskId }, select: { stepResults: true } })
    const results = (scene?.stepResults ?? {}) as Record<string, unknown>
    results[step] = {
      status: output.success ? "completed" : "failed",
      message: output.message,
      outputPath: output.outputPath,
      completedAt: new Date().toISOString(),
    }
    await this.db.sceneTask.update({ where: { id: sceneTaskId }, data: { stepResults: results } })
  }

  private async recordCutStep(cutTaskId: string, step: string, output: AgentOutput): Promise<void> {
    const cut = await this.db.cutTask.findUnique({ where: { id: cutTaskId }, select: { stepResults: true } })
    const results = (cut?.stepResults ?? {}) as Record<string, unknown>
    results[step] = {
      status: output.success ? "completed" : "failed",
      message: output.message,
      outputPath: output.outputPath,
      completedAt: new Date().toISOString(),
    }
    await this.db.cutTask.update({ where: { id: cutTaskId }, data: { stepResults: results } })
  }

  private async updateBatchProgress(batchRunId: string, completedScenes: number): Promise<void> {
    const batch = await this.db.batchRun.findUnique({ where: { id: batchRunId }, select: { totalScenes: true } })
    if (!batch) return
    const progress = batch.totalScenes > 0 ? (completedScenes / batch.totalScenes) * 100 : 0
    await this.db.batchRun.update({ where: { id: batchRunId }, data: { progress, completedScenes } })
    this.emit({ type: "batch:progress", batchRunId, progress, currentScene: completedScenes + 1 })
  }

  private async updateBatchProgressFromSteps(batchRunId: string): Promise<void> {
    // Count completed steps across all cuts for fine-grained progress
    const allCuts = await this.db.cutTask.findMany({
      where: { sceneTask: { batchRunId } },
      select: { steps: true, stepResults: true, status: true },
    })

    let totalSteps = 0
    let completedSteps = 0

    for (const cut of allCuts) {
      const steps = cut.steps as string[]
      totalSteps += steps.length
      const results = (cut.stepResults ?? {}) as Record<string, { status: string }>
      completedSteps += Object.values(results).filter((r) => r.status === "completed").length
    }

    const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0
    const completedScenes = await this.db.sceneTask.count({ where: { batchRunId, status: "COMPLETED" } })

    await this.db.batchRun.update({ where: { id: batchRunId }, data: { progress, completedScenes } })

    const currentScene = await this.db.sceneTask.findFirst({
      where: { batchRunId, status: "RUNNING" },
      select: { sceneNumber: true },
    })
    const currentCut = await this.db.cutTask.findFirst({
      where: { sceneTask: { batchRunId }, status: "RUNNING" },
      select: { cutNumber: true },
    })

    this.emit({
      type: "batch:progress",
      batchRunId,
      progress,
      currentScene: currentScene?.sceneNumber ?? completedScenes + 1,
      currentCut: currentCut?.cutNumber,
    })
  }

  private async finalizeBatch(batchRunId: string): Promise<void> {
    const failedCount = await this.db.sceneTask.count({ where: { batchRunId, status: "FAILED" } })
    const completedScenes = await this.db.sceneTask.count({ where: { batchRunId, status: "COMPLETED" } })
    const finalStatus = failedCount > 0 ? "FAILED" : "COMPLETED"

    await this.db.batchRun.update({
      where: { id: batchRunId },
      data: { status: finalStatus as "COMPLETED" | "FAILED", completedScenes, completedAt: new Date() },
    })
    this.emit({ type: "batch:completed", batchRunId, status: finalStatus.toLowerCase() as "completed" | "failed" })
  }

  private emit(event: PipelineWSEvent): void {
    this.eventBus?.emitEvent(event)
  }
}
```

- [ ] **Step 2: agents/index.ts에 export 추가**

`packages/agents/src/index.ts`에 추가:

```typescript
export { BatchOrchestrator } from "./base/batch-orchestrator.js"
```

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck 2>&1 | grep -E "batch-orchestrator"`
Expected: 에러 없음

- [ ] **Step 4: Commit**

```bash
git add packages/agents/src/base/batch-orchestrator.ts packages/agents/src/index.ts
git commit -m "feat: BatchOrchestrator 엔진 — 씬/컷 순차 실행, 취소, 재생성"
```

---

## Task 4: 배치 서비스 + API 라우트

**Files:**
- Create: `apps/api/src/services/batch.service.ts`
- Create: `apps/api/src/routes/batch.ts`
- Modify: `apps/api/src/index.ts`

**Reference:** `apps/api/src/services/pipeline.service.ts` + `apps/api/src/routes/pipeline.ts` 패턴 따름

- [ ] **Step 1: batch.service.ts 생성**

Create `apps/api/src/services/batch.service.ts`:

```typescript
import { prisma } from "@marionette/db"
import { AIGateway } from "@marionette/ai-gateway"
import { GeminiProvider } from "@marionette/ai-gateway"
import { createAgentRegistry, BatchOrchestrator, PipelineEventBus } from "@marionette/agents"
import type { DirectionPlan } from "@marionette/shared"

// Re-use the pipeline event bus from pipeline service
import { pipelineBus } from "./pipeline.service.ts"

let batchOrchestrator: BatchOrchestrator | null = null

function getOrchestrator(): BatchOrchestrator {
  if (!batchOrchestrator) {
    const gateway = new AIGateway()
    gateway.register("gemini", new GeminiProvider())
    const registry = createAgentRegistry(gateway, prisma)
    batchOrchestrator = new BatchOrchestrator(prisma, registry, pipelineBus)
  }
  return batchOrchestrator
}

export async function createBatchRun(projectId: string) {
  // Guard: no concurrent batch runs
  const running = await prisma.batchRun.findFirst({
    where: { projectId, status: "RUNNING" },
  })
  if (running) {
    throw new Error("A batch is already running for this project")
  }

  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } })
  const plan = project.directionPlan as unknown as DirectionPlan | null
  if (!plan?.scenes?.length) {
    throw new Error("No DirectionPlan found")
  }

  const batchRun = await prisma.batchRun.create({
    data: {
      projectId,
      totalScenes: plan.scenes.length,
    },
  })

  // Fire and forget
  getOrchestrator().run(batchRun.id).catch((err) => {
    console.error(`[BatchRun ${batchRun.id}] Unhandled error:`, err)
  })

  return batchRun
}

export async function listBatchRuns(projectId: string) {
  return prisma.batchRun.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: {
      sceneTasks: {
        orderBy: { sceneNumber: "asc" },
        include: { cutTasks: { orderBy: { cutNumber: "asc" } } },
      },
    },
  })
}

export async function getBatchRun(batchRunId: string) {
  return prisma.batchRun.findUniqueOrThrow({
    where: { id: batchRunId },
    include: {
      sceneTasks: {
        orderBy: { sceneNumber: "asc" },
        include: { cutTasks: { orderBy: { cutNumber: "asc" } } },
      },
    },
  })
}

export async function cancelBatchRun(batchRunId: string) {
  const batch = await prisma.batchRun.findUniqueOrThrow({ where: { id: batchRunId } })
  if (batch.status !== "RUNNING") {
    throw new Error("Batch is not running")
  }
  await getOrchestrator().cancel(batchRunId)
}

export async function regenerateScene(batchRunId: string, sceneNumber: number) {
  const batch = await prisma.batchRun.findUniqueOrThrow({ where: { id: batchRunId } })
  if (batch.status === "RUNNING") {
    throw new Error("Cannot regenerate while batch is running")
  }
  getOrchestrator().regenerateScene(batchRunId, sceneNumber).catch((err) => {
    console.error(`[BatchRun ${batchRunId}] Regenerate scene ${sceneNumber} error:`, err)
  })
}

export async function regenerateCut(batchRunId: string, sceneNumber: number, cutNumber: number) {
  const batch = await prisma.batchRun.findUniqueOrThrow({ where: { id: batchRunId } })
  if (batch.status === "RUNNING") {
    throw new Error("Cannot regenerate while batch is running")
  }
  getOrchestrator().regenerateCut(batchRunId, sceneNumber, cutNumber).catch((err) => {
    console.error(`[BatchRun ${batchRunId}] Regenerate cut ${sceneNumber}/${cutNumber} error:`, err)
  })
}

export async function rerunFrom(batchRunId: string, fromSceneNumber: number) {
  const batch = await prisma.batchRun.findUniqueOrThrow({ where: { id: batchRunId } })
  if (batch.status === "RUNNING") {
    throw new Error("Cannot rerun while batch is running")
  }
  getOrchestrator().rerunFrom(batchRunId, fromSceneNumber).catch((err) => {
    console.error(`[BatchRun ${batchRunId}] Rerun from scene ${fromSceneNumber} error:`, err)
  })
}
```

- [ ] **Step 2: batch.ts 라우트 생성**

Create `apps/api/src/routes/batch.ts`:

```typescript
import { Hono } from "hono"
import {
  createBatchRun,
  listBatchRuns,
  getBatchRun,
  cancelBatchRun,
  regenerateScene,
  regenerateCut,
  rerunFrom,
} from "../services/batch.service.ts"

export const batchRoutes = new Hono()

// POST /:projectId/run — start batch
batchRoutes.post("/:projectId/run", async (c) => {
  try {
    const projectId = c.req.param("projectId")
    const batchRun = await createBatchRun(projectId)
    return c.json({ batchRun }, 201)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("already running")) {
      return c.json({ error: msg }, 409)
    }
    throw err
  }
})

// GET /:projectId/runs — list batch runs
batchRoutes.get("/:projectId/runs", async (c) => {
  const projectId = c.req.param("projectId")
  const batchRuns = await listBatchRuns(projectId)
  return c.json({ batchRuns })
})

// GET /:projectId/run/:batchRunId — get batch run detail
batchRoutes.get("/:projectId/run/:batchRunId", async (c) => {
  const batchRunId = c.req.param("batchRunId")
  const batchRun = await getBatchRun(batchRunId)
  return c.json({ batchRun })
})

// POST /:batchRunId/cancel — cancel running batch
batchRoutes.post("/:batchRunId/cancel", async (c) => {
  try {
    const batchRunId = c.req.param("batchRunId")
    await cancelBatchRun(batchRunId)
    return c.json({ cancelled: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("not running")) {
      return c.json({ error: msg }, 409)
    }
    throw err
  }
})

// POST /:batchRunId/scene/:sceneNumber/regenerate
batchRoutes.post("/:batchRunId/scene/:sceneNumber/regenerate", async (c) => {
  try {
    const batchRunId = c.req.param("batchRunId")
    const sceneNumber = Number.parseInt(c.req.param("sceneNumber"), 10)
    await regenerateScene(batchRunId, sceneNumber)
    return c.json({ regenerating: true, sceneNumber })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("running")) {
      return c.json({ error: msg }, 409)
    }
    throw err
  }
})

// POST /:batchRunId/scene/:sceneNumber/cut/:cutNumber/regenerate
batchRoutes.post("/:batchRunId/scene/:sceneNumber/cut/:cutNumber/regenerate", async (c) => {
  try {
    const batchRunId = c.req.param("batchRunId")
    const sceneNumber = Number.parseInt(c.req.param("sceneNumber"), 10)
    const cutNumber = Number.parseInt(c.req.param("cutNumber"), 10)
    await regenerateCut(batchRunId, sceneNumber, cutNumber)
    return c.json({ regenerating: true, sceneNumber, cutNumber })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("running")) {
      return c.json({ error: msg }, 409)
    }
    throw err
  }
})

// POST /:batchRunId/rerun-from/:sceneNumber
batchRoutes.post("/:batchRunId/rerun-from/:sceneNumber", async (c) => {
  try {
    const batchRunId = c.req.param("batchRunId")
    const fromSceneNumber = Number.parseInt(c.req.param("sceneNumber"), 10)
    await rerunFrom(batchRunId, fromSceneNumber)
    return c.json({ rerunning: true, fromSceneNumber })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("running")) {
      return c.json({ error: msg }, 409)
    }
    throw err
  }
})
```

- [ ] **Step 3: index.ts에 batchRoutes 등록**

`apps/api/src/index.ts`에 추가:

import 추가:
```typescript
import { batchRoutes } from "./routes/batch.ts"
```

route 등록 (기존 `app.route("/api/snapshots", snapshotRoutes)` 뒤에):
```typescript
app.route("/api/batch", batchRoutes)
```

- [ ] **Step 4: Typecheck**

Run: `bun run typecheck 2>&1 | grep -E "batch"`
Expected: 새 파일에 에러 없음

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/batch.service.ts apps/api/src/routes/batch.ts apps/api/src/index.ts
git commit -m "feat: 배치 API 라우트 + 서비스 — 실행/조회/취소/재생성"
```

---

## Task 5: WebSocket 핸들러 확장

**Files:**
- Modify: `apps/api/src/ws/handler.ts`

**Reference:** 기존 `sendSnapshot` 함수와 event bus 구독 패턴

- [ ] **Step 1: handler.ts에 batch snapshot 추가**

`sendSnapshot` 함수에서 기존 `PipelineRun` 스냅샷 전송 후, 활성 BatchRun도 전송:

```typescript
// sendSnapshot 함수 끝에 추가
const activeBatchRuns = await db!.batchRun.findMany({
  where: { status: { in: ["RUNNING", "QUEUED"] } },
  include: { project: { select: { title: true } } },
})

if (activeBatchRuns.length > 0) {
  const batchSnapshot: PipelineWSEvent = {
    type: "batch:snapshot",
    batchRuns: activeBatchRuns.map((br) => ({
      batchRunId: br.id,
      projectId: br.projectId,
      projectTitle: br.project.title,
      status: br.status,
      progress: br.progress,
      totalScenes: br.totalScenes,
      completedScenes: br.completedScenes,
    })),
  }
  ws.send(JSON.stringify(batchSnapshot))
}
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck 2>&1 | grep "handler.ts"`
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/ws/handler.ts
git commit -m "feat: WS 핸들러에 batch snapshot 전송 추가"
```

---

## Task 6: BatchMonitor UI 컴포넌트

**Files:**
- Create: `apps/web/components/batch-monitor.tsx`
- Modify: `apps/web/app/(dashboard)/projects/[id]/page.tsx`

**Reference:** 기존 `apps/web/components/version-history.tsx` (fetch + state 패턴), `apps/web/hooks/use-pipeline-ws.ts` (WS 패턴)

- [ ] **Step 1: batch-monitor.tsx 생성**

Create `apps/web/components/batch-monitor.tsx`:

```typescript
"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchAPI } from "../lib/api"

// ─── Types ───

interface CutTask {
  id: string
  cutNumber: number
  status: string
  currentStep: string | null
  steps: string[]
  stepResults: Record<string, { status: string; message?: string }>
  attempt: number
  errorMessage: string | null
}

interface SceneTask {
  id: string
  sceneNumber: number
  status: string
  currentStep: string | null
  stepResults: Record<string, { status: string; message?: string }>
  attempt: number
  errorMessage: string | null
  cutTasks: CutTask[]
}

interface BatchRun {
  id: string
  status: string
  totalScenes: number
  completedScenes: number
  progress: number
  errorMessage: string | null
  sceneTasks: SceneTask[]
  createdAt: string
}

// ─── Status helpers ───

function statusIcon(status: string): string {
  switch (status) {
    case "COMPLETED": return "\u2705"
    case "FAILED": return "\u274c"
    case "RUNNING": return "\ud83d\udd04"
    case "QUEUED": return "\u23f3"
    case "CANCELLED": return "\u23f9"
    case "REGENERATING": return "\ud83d\udd01"
    default: return "\u2753"
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "COMPLETED": return "완료"
    case "FAILED": return "실패"
    case "RUNNING": return "진행중"
    case "QUEUED": return "대기"
    case "CANCELLED": return "취소됨"
    case "REGENERATING": return "재생성 대기"
    default: return status
  }
}

// ─── Component ───

export function BatchMonitor({ projectId }: { projectId: string }) {
  const [batchRun, setBatchRun] = useState<BatchRun | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedScenes, setExpandedScenes] = useState<Set<number>>(new Set())

  const fetchLatest = useCallback(async () => {
    try {
      const res = await fetchAPI(`/batch/${projectId}/runs`)
      const runs = res.batchRuns as BatchRun[]
      setBatchRun(runs.length > 0 ? runs[0]! : null)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchLatest()
    const interval = setInterval(fetchLatest, 3000)
    return () => clearInterval(interval)
  }, [fetchLatest])

  // Auto-expand running/failed scenes
  useEffect(() => {
    if (!batchRun) return
    const autoExpand = new Set<number>()
    for (const st of batchRun.sceneTasks) {
      if (st.status === "RUNNING" || st.status === "FAILED") {
        autoExpand.add(st.sceneNumber)
      }
    }
    setExpandedScenes((prev) => new Set([...prev, ...autoExpand]))
  }, [batchRun])

  const startBatch = async () => {
    try {
      await fetchAPI(`/batch/${projectId}/run`, { method: "POST" })
      await fetchLatest()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to start batch")
    }
  }

  const cancelBatch = async () => {
    if (!batchRun || !window.confirm("배치를 중단하시겠습니까?")) return
    try {
      await fetchAPI(`/batch/${batchRun.id}/cancel`, { method: "POST" })
      await fetchLatest()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to cancel")
    }
  }

  const regenerateScene = async (sceneNumber: number) => {
    if (!batchRun || !window.confirm(`씬 ${sceneNumber}을 재생성하시겠습니까?`)) return
    try {
      await fetchAPI(`/batch/${batchRun.id}/scene/${sceneNumber}/regenerate`, { method: "POST" })
      await fetchLatest()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to regenerate")
    }
  }

  const regenerateCut = async (sceneNumber: number, cutNumber: number) => {
    if (!batchRun || !window.confirm(`씬 ${sceneNumber} 컷 ${cutNumber}을 재생성하시겠습니까?`)) return
    try {
      await fetchAPI(`/batch/${batchRun.id}/scene/${sceneNumber}/cut/${cutNumber}/regenerate`, { method: "POST" })
      await fetchLatest()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to regenerate cut")
    }
  }

  const rerunFrom = async (sceneNumber: number) => {
    if (!batchRun || !window.confirm(`씬 ${sceneNumber}부터 재실행하시겠습니까?`)) return
    try {
      await fetchAPI(`/batch/${batchRun.id}/rerun-from/${sceneNumber}`, { method: "POST" })
      await fetchLatest()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to rerun")
    }
  }

  const toggleScene = (sceneNumber: number) => {
    setExpandedScenes((prev) => {
      const next = new Set(prev)
      if (next.has(sceneNumber)) next.delete(sceneNumber)
      else next.add(sceneNumber)
      return next
    })
  }

  const isRunning = batchRun?.status === "RUNNING"

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-48 rounded bg-gray-800" />
          <div className="h-4 w-full rounded bg-gray-800" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">배치 프로덕션</h2>
        <div className="flex gap-2">
          {!isRunning && (
            <button
              onClick={startBatch}
              className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium hover:bg-green-500 transition"
            >
              실행
            </button>
          )}
          {isRunning && (
            <button
              onClick={cancelBatch}
              className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium hover:bg-red-500 transition"
            >
              중단
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {batchRun && (
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between text-sm text-gray-400">
            <span>{statusLabel(batchRun.status)}</span>
            <span>{Math.round(batchRun.progress)}% (씬 {batchRun.completedScenes}/{batchRun.totalScenes})</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${batchRun.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Scene list */}
      {batchRun && batchRun.sceneTasks.length > 0 && (
        <div className="space-y-1">
          {batchRun.sceneTasks.map((scene) => {
            const expanded = expandedScenes.has(scene.sceneNumber)
            const completedCuts = scene.cutTasks.filter((c) => c.status === "COMPLETED").length
            const totalCuts = scene.cutTasks.length

            return (
              <div key={scene.id}>
                {/* Scene row */}
                <div
                  className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-800/50 transition"
                  onClick={() => toggleScene(scene.sceneNumber)}
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-xs text-gray-500">{expanded ? "\u25bc" : "\u25b6"}</span>
                    <span>{statusIcon(scene.status)}</span>
                    <span className="font-medium">씬 {scene.sceneNumber}</span>
                    <span className="text-gray-500">
                      ({completedCuts}/{totalCuts} 컷)
                    </span>
                    {scene.attempt > 1 && (
                      <span className="text-xs text-yellow-500">({scene.attempt}회차)</span>
                    )}
                    {scene.errorMessage && (
                      <span className="text-xs text-red-400">{scene.errorMessage}</span>
                    )}
                  </div>
                  {!isRunning && (scene.status === "COMPLETED" || scene.status === "FAILED") && (
                    <button
                      onClick={(e) => { e.stopPropagation(); regenerateScene(scene.sceneNumber) }}
                      className="rounded bg-gray-700 px-2 py-0.5 text-xs hover:bg-gray-600 transition"
                    >
                      재생성
                    </button>
                  )}
                </div>

                {/* Cut list (expanded) */}
                {expanded && (
                  <div className="ml-8 space-y-0.5 pb-1">
                    {scene.cutTasks.map((cut) => (
                      <div key={cut.id} className="flex items-center justify-between rounded px-2 py-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span>{statusIcon(cut.status)}</span>
                          <span className="text-gray-400">컷 {cut.cutNumber}</span>
                          {cut.status === "RUNNING" && cut.currentStep && (
                            <span className="text-xs text-blue-400">{cut.currentStep}</span>
                          )}
                          {cut.attempt > 1 && (
                            <span className="text-xs text-yellow-500">({cut.attempt}회차)</span>
                          )}
                          {cut.errorMessage && (
                            <span className="text-xs text-red-400">{cut.errorMessage}</span>
                          )}
                        </div>
                        {!isRunning && cut.status === "FAILED" && (
                          <button
                            onClick={() => regenerateCut(scene.sceneNumber, cut.cutNumber)}
                            className="rounded bg-gray-700 px-2 py-0.5 text-xs hover:bg-gray-600 transition"
                          >
                            재생성
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Rerun from selector */}
      {batchRun && !isRunning && batchRun.sceneTasks.length > 0 && (
        <div className="mt-4 border-t border-gray-800 pt-3">
          <div className="flex items-center gap-2">
            <select
              id="rerun-from"
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm"
              defaultValue=""
              onChange={(e) => {
                const val = e.target.value
                if (val) rerunFrom(Number(val))
              }}
            >
              <option value="" disabled>씬 선택...</option>
              {batchRun.sceneTasks.map((st) => (
                <option key={st.sceneNumber} value={st.sceneNumber}>
                  씬 {st.sceneNumber}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-500">부터 재실행</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!batchRun && (
        <div className="flex flex-col items-center py-8 text-gray-500">
          <p>배치 실행 이력이 없습니다</p>
          <p className="text-xs mt-1">DirectionPlan이 있으면 실행 버튼을 눌러 시작하세요</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Production 탭에 BatchMonitor 추가**

`apps/web/app/(dashboard)/projects/[id]/page.tsx`에서:

1. import 추가:
```typescript
import { BatchMonitor } from "../../../../components/batch-monitor"
```

2. `ProductionTab` 함수 내부, 기존 컨텐츠 앞에 추가:
```tsx
{/* Batch Production */}
<BatchMonitor projectId={projectId} />
```

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck 2>&1 | grep -E "batch-monitor|page\.tsx"`
Expected: 새 코드에 에러 없음

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/batch-monitor.tsx apps/web/app/\(dashboard\)/projects/\[id\]/page.tsx
git commit -m "feat: BatchMonitor UI — 씬/컷 진행 상태, 재생성, 재실행"
```

---

## Task 7: 통합 검증

- [ ] **Step 1: Typecheck 전체**

Run: `bun run typecheck`
Expected: 새 코드에서 에러 없음 (기존 pre-existing 에러만 허용)

- [ ] **Step 2: 브라우저 검증**

프로젝트 상세 → Production 탭에서:
- BatchMonitor 컴포넌트가 렌더링되는지 확인
- "배치 실행 이력이 없습니다" 빈 상태 표시
- "실행" 버튼 표시

- [ ] **Step 3: 최종 커밋 (필요 시)**

모든 미커밋 변경사항 정리.
