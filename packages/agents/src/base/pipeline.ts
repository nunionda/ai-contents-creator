// ---------------------------------------------------------------------------
// PipelineOrchestrator — runs agents sequentially, tracks progress in DB
// ---------------------------------------------------------------------------

import type { PrismaClient } from "@prisma/client"
import type { BaseAgent, AgentInput, AgentOutput } from "./agent.js"

// ─── Step weight presets for progress calculation ───

const STEP_WEIGHTS: Record<string, number> = {
  script_writer: 20,
  scripter: 20,
  concept_artist: 15,
  cinematographer: 10,
  generalist: 25,
  asset_designer: 10,
  vfx_compositor: 10,
  master_editor: 10,
  colorist: 10,
  sound_designer: 10,
  composer: 15,
  mixing_engineer: 10,
}

const DEFAULT_WEIGHT = 10

// ─── Orchestrator ───

export class PipelineOrchestrator {
  private readonly registry = new Map<string, BaseAgent>()

  constructor(private readonly db: PrismaClient) {}

  /** Register an agent under a step name (e.g. "script_writer"). */
  register(name: string, agent: BaseAgent): this {
    this.registry.set(name, agent)
    return this
  }

  /**
   * Execute a full pipeline run.
   *
   * - Looks up agents by step name from the registry
   * - Runs them sequentially, passing each output as context to the next
   * - Updates PipelineRun status in the database (QUEUED -> RUNNING -> COMPLETED/FAILED)
   */
  async run(runId: string, projectId: string, steps: string[], initialContext: Record<string, unknown> = {}): Promise<void> {
    const totalWeight = steps.reduce((sum, s) => sum + (STEP_WEIGHTS[s] ?? DEFAULT_WEIGHT), 0)
    let completedWeight = 0

    // Mark run as RUNNING
    await this.db.pipelineRun.update({
      where: { id: runId },
      data: {
        status: "RUNNING",
        startedAt: new Date(),
      },
    })

    let previousOutput: AgentOutput | undefined
    const stepResults: Record<string, Record<string, unknown>> = {}

    for (const step of steps) {
      const agent = this.registry.get(step)
      if (!agent) {
        await this.markFailed(runId, stepResults, `No agent registered for step "${step}"`)
        return
      }

      // Update current step
      await this.db.pipelineRun.update({
        where: { id: runId },
        data: {
          currentStep: step,
          progress: (completedWeight / totalWeight) * 100,
        },
      })

      try {
        // Build input — merge initial context + previous agent output data
        const input: AgentInput = {
          projectId,
          runId,
          ...initialContext,
          ...(previousOutput?.data ?? {}),
        }

        const output = await agent.execute(input)

        if (!output.success) {
          stepResults[step] = { status: "failed", error: output.message }
          await this.markFailed(runId, stepResults, `${step}: ${output.message}`)
          return
        }

        // Record step result
        stepResults[step] = {
          status: "completed",
          message: output.message,
          outputPath: output.outputPath ?? null,
          completedAt: new Date().toISOString(),
        }

        // Update run progress
        completedWeight += STEP_WEIGHTS[step] ?? DEFAULT_WEIGHT
        const progress = (completedWeight / totalWeight) * 100

        await this.db.pipelineRun.update({
          where: { id: runId },
          data: {
            progress,
            stepResults: JSON.parse(JSON.stringify(stepResults)),
          },
        })

        previousOutput = output
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        stepResults[step] = { status: "failed", error: errorMessage }
        await this.markFailed(runId, stepResults, `${step} threw: ${errorMessage}`)
        return
      }
    }

    // All steps completed
    await this.db.pipelineRun.update({
      where: { id: runId },
      data: {
        status: "COMPLETED",
        progress: 100,
        stepResults: JSON.parse(JSON.stringify(stepResults)),
        completedAt: new Date(),
      },
    })
  }

  // ── Internal helpers ───

  private async markFailed(runId: string, stepResults: Record<string, Record<string, unknown>>, errorMessage: string) {
    await this.db.pipelineRun.update({
      where: { id: runId },
      data: {
        status: "FAILED",
        errorMessage,
        stepResults: JSON.parse(JSON.stringify(stepResults)),
        completedAt: new Date(),
      },
    })
  }
}
