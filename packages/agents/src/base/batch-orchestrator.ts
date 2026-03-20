// ---------------------------------------------------------------------------
// BatchOrchestrator — sequentially executes scenes/cuts from a DirectionPlan
// ---------------------------------------------------------------------------

import type { PrismaClient } from "@prisma/client"
import type { BaseAgent, AgentInput, AgentOutput } from "./agent.js"
import type { PipelineEventBus } from "./pipeline-events.js"
import type { PipelineWSEvent } from "@marionette/shared"
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
        const batchRunRecord = await this.db.batchRun.findUnique({ where: { id: batchRunId }, select: { projectId: true } })
        const input: AgentInput = {
          projectId: batchRunRecord!.projectId,
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
    const batchRunRecord = await this.db.batchRun.findUnique({ where: { id: batchRunId }, select: { projectId: true } })
    const projectId = batchRunRecord!.projectId

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
    await this.db.sceneTask.update({ where: { id: sceneTaskId }, data: { stepResults: JSON.parse(JSON.stringify(results)) } })
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
    await this.db.cutTask.update({ where: { id: cutTaskId }, data: { stepResults: JSON.parse(JSON.stringify(results)) } })
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
