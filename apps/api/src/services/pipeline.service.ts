import { prisma } from "@marionette/db"
import { AIGateway } from "@marionette/ai-gateway"
import { GeminiProvider } from "@marionette/ai-gateway/providers/gemini.js"
import { SunoProvider } from "@marionette/ai-gateway/providers/suno.js"
import { OpenAIProvider } from "@marionette/ai-gateway/providers/openai.js"
import { ReplicateProvider } from "@marionette/ai-gateway/providers/replicate.js"
import { MusicGenProvider } from "@marionette/ai-gateway/providers/musicgen.js"
import { EdgeTTSProvider } from "@marionette/ai-gateway/providers/edge-tts.js"
import { createAgentRegistry, PipelineOrchestrator, PipelineEventBus } from "@marionette/agents"
import type { PipelineRunResponse, StepResult, RunStatus } from "@marionette/shared/types/pipeline.ts"
import { NotFoundError } from "../middleware/error-handler.ts"

// ─── Singleton gateway + orchestrator ───

let gateway: AIGateway | null = null
let orchestrator: PipelineOrchestrator | null = null

// ─── Shared event bus (created once, injected into orchestrator + WS handler) ───
export const pipelineBus = new PipelineEventBus()

function getGateway(): AIGateway {
  if (!gateway) {
    gateway = new AIGateway()
    gateway.register("gemini", new GeminiProvider(), true)
    gateway.register("suno", new SunoProvider())
    if (process.env["OPENAI_API_KEY"]) {
      gateway.register("openai", new OpenAIProvider())
      console.log("[Gateway] OpenAI provider registered")
    }
    // Free fallback providers — always registered
    if (process.env["REPLICATE_API_TOKEN"]) {
      gateway.register("replicate", new ReplicateProvider())
      console.log("[Gateway] Replicate provider registered (free fallback)")
    }
    gateway.register("musicgen", new MusicGenProvider())
    gateway.register("edge", new EdgeTTSProvider())
    console.log("[Gateway] MusicGen + EdgeTTS providers registered (free fallback)")
  }
  return gateway
}

function getOrchestrator(): PipelineOrchestrator {
  if (!orchestrator) {
    const gw = getGateway()
    const registry = createAgentRegistry(gw, prisma)
    orchestrator = new PipelineOrchestrator(prisma, pipelineBus)
    for (const [name, agent] of registry) {
      orchestrator.register(name, agent)
    }
  }
  return orchestrator
}

// ─── Response mapping ───

function toRunResponse(run: {
  id: string
  projectId: string
  steps: unknown
  currentStep: string | null
  status: string
  progress: number
  stepResults: unknown
  errorMessage: string | null
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
}): PipelineRunResponse {
  return {
    id: run.id,
    project_id: run.projectId,
    steps: run.steps as string[],
    current_step: run.currentStep,
    status: run.status.toLowerCase() as RunStatus,
    progress: run.progress,
    step_results: (run.stepResults as StepResult[]) ?? [],
    error_message: run.errorMessage,
    started_at: run.startedAt?.toISOString() ?? null,
    completed_at: run.completedAt?.toISOString() ?? null,
    created_at: run.createdAt.toISOString(),
  }
}

// ─── Service methods ───

export async function createRun(projectId: string, steps: string[], idea?: string): Promise<PipelineRunResponse> {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) {
    throw new NotFoundError("Project", projectId)
  }

  // Determine phase from first step
  const preSteps = ["script_writer", "scripter", "concept_artist", "previsualizer", "casting_director", "location_scout"]
  const mainSteps = ["cinematographer", "generalist", "asset_designer"]
  // Post steps: sound_designer, composer, master_editor, colorist, mixing_engineer
  const firstStep = steps[0] ?? ""
  const phase = preSteps.includes(firstStep) ? "PRE" : mainSteps.includes(firstStep) ? "MAIN" : "POST"

  const run = await prisma.pipelineRun.create({
    data: {
      projectId,
      phase,
      steps,
      status: "QUEUED",
      stepResults: {},
    },
  })

  return toRunResponse(run)
}

export async function listRuns(projectId: string): Promise<PipelineRunResponse[]> {
  const runs = await prisma.pipelineRun.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  })
  return runs.map(toRunResponse)
}

export async function getRun(runId: string): Promise<PipelineRunResponse> {
  const run = await prisma.pipelineRun.findUnique({ where: { id: runId } })
  if (!run) {
    throw new NotFoundError("PipelineRun", runId)
  }
  return toRunResponse(run)
}

export async function executeRun(runId: string, idea?: string): Promise<void> {
  const run = await prisma.pipelineRun.findUnique({
    where: { id: runId },
    include: { project: true },
  })
  if (!run) {
    console.error(`[Pipeline] Run ${runId} not found`)
    return
  }

  const steps = run.steps as string[]
  const orch = getOrchestrator()

  // Build initial context from project data
  const initialContext: Record<string, unknown> = {
    idea: idea ?? run.project.idea ?? run.project.title,
  }

  // If project already has a directionPlan, pass it for downstream agents
  if (run.project.directionPlan) {
    initialContext["directionPlan"] = run.project.directionPlan
  }

  console.log(`[Pipeline] Starting run ${runId} with steps: ${steps.join(", ")}`)

  try {
    await orch.run(runId, run.projectId, steps, initialContext)
    console.log(`[Pipeline] Run ${runId} completed`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[Pipeline] Run ${runId} failed: ${msg}`)
  }
}
