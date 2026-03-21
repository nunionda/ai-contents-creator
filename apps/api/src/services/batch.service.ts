import { prisma } from "@marionette/db"
import { AIGateway } from "@marionette/ai-gateway"
import { GeminiProvider } from "@marionette/ai-gateway/providers/gemini.js"
import { SunoProvider } from "@marionette/ai-gateway/providers/suno.js"
import { OpenAIProvider } from "@marionette/ai-gateway/providers/openai.js"
import { ReplicateProvider } from "@marionette/ai-gateway/providers/replicate.js"
import { MusicGenProvider } from "@marionette/ai-gateway/providers/musicgen.js"
import { EdgeTTSProvider } from "@marionette/ai-gateway/providers/edge-tts.js"
import { createAgentRegistry, BatchOrchestrator } from "@marionette/agents"
import { pipelineBus } from "./pipeline.service.ts"
import { NotFoundError, AppError } from "../middleware/error-handler.ts"

// ─── Singleton gateway + orchestrator ───

let gateway: AIGateway | null = null
let orchestrator: BatchOrchestrator | null = null

function getGateway(): AIGateway {
  if (!gateway) {
    gateway = new AIGateway()
    gateway.register("gemini", new GeminiProvider(), true)
    gateway.register("suno", new SunoProvider())
    if (process.env["OPENAI_API_KEY"]) {
      gateway.register("openai", new OpenAIProvider())
      console.log("[BatchGateway] OpenAI provider registered")
    }
    // Free fallback providers — always registered
    if (process.env["REPLICATE_API_TOKEN"]) {
      gateway.register("replicate", new ReplicateProvider())
      console.log("[BatchGateway] Replicate provider registered (free fallback)")
    }
    gateway.register("musicgen", new MusicGenProvider())
    gateway.register("edge", new EdgeTTSProvider())
    console.log("[BatchGateway] MusicGen + EdgeTTS providers registered (free fallback)")
  }
  return gateway
}

function getOrchestrator(): BatchOrchestrator {
  if (!orchestrator) {
    const gw = getGateway()
    const registry = createAgentRegistry(gw, prisma)
    orchestrator = new BatchOrchestrator(prisma, registry, pipelineBus)
  }
  return orchestrator
}

// ─── Concurrency error ───

export class ConcurrencyError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONCURRENCY_CONFLICT")
  }
}

// ─── Service methods ───

export async function createBatchRun(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) {
    throw new NotFoundError("Project", projectId)
  }

  // Guard against concurrent runs
  const existing = await prisma.batchRun.findFirst({
    where: { projectId, status: "RUNNING" },
  })
  if (existing) {
    throw new ConcurrencyError(`A batch run is already RUNNING for project ${projectId}`)
  }

  const totalScenes =
    (project.directionPlan as { scenes?: unknown[] } | null)?.scenes?.length ?? 0

  const batchRun = await prisma.batchRun.create({
    data: {
      projectId,
      status: "QUEUED",
      totalScenes,
    },
  })

  // Fire-and-forget
  void getOrchestrator()
    .run(batchRun.id)
    .catch((err: unknown) => {
      console.error(`[Batch] Run ${batchRun.id} failed:`, err)
    })

  return batchRun
}

export async function listBatchRuns(projectId: string) {
  return prisma.batchRun.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: {
      sceneTasks: {
        include: { cutTasks: true },
        orderBy: { sceneNumber: "asc" },
      },
    },
  })
}

export async function getBatchRun(batchRunId: string) {
  const batchRun = await prisma.batchRun.findUnique({
    where: { id: batchRunId },
    include: {
      sceneTasks: {
        include: { cutTasks: true },
        orderBy: { sceneNumber: "asc" },
      },
    },
  })
  if (!batchRun) {
    throw new NotFoundError("BatchRun", batchRunId)
  }
  return batchRun
}

export async function cancelBatchRun(batchRunId: string) {
  const batchRun = await prisma.batchRun.findUnique({ where: { id: batchRunId } })
  if (!batchRun) {
    throw new NotFoundError("BatchRun", batchRunId)
  }
  if (batchRun.status !== "RUNNING") {
    throw new ConcurrencyError(`BatchRun ${batchRunId} is not RUNNING (status: ${batchRun.status})`)
  }

  await getOrchestrator().cancel(batchRunId)
}

export async function regenerateScene(batchRunId: string, sceneNumber: number) {
  const batchRun = await prisma.batchRun.findUnique({ where: { id: batchRunId } })
  if (!batchRun) {
    throw new NotFoundError("BatchRun", batchRunId)
  }
  if (batchRun.status === "RUNNING") {
    throw new ConcurrencyError(`BatchRun ${batchRunId} is currently RUNNING; cancel it first`)
  }

  // Fire-and-forget
  void getOrchestrator()
    .regenerateScene(batchRunId, sceneNumber)
    .catch((err: unknown) => {
      console.error(`[Batch] regenerateScene ${batchRunId}/scene-${sceneNumber} failed:`, err)
    })
}

export async function regenerateCut(batchRunId: string, sceneNumber: number, cutNumber: number) {
  const batchRun = await prisma.batchRun.findUnique({ where: { id: batchRunId } })
  if (!batchRun) {
    throw new NotFoundError("BatchRun", batchRunId)
  }
  if (batchRun.status === "RUNNING") {
    throw new ConcurrencyError(`BatchRun ${batchRunId} is currently RUNNING; cancel it first`)
  }

  // Fire-and-forget
  void getOrchestrator()
    .regenerateCut(batchRunId, sceneNumber, cutNumber)
    .catch((err: unknown) => {
      console.error(`[Batch] regenerateCut ${batchRunId}/scene-${sceneNumber}/cut-${cutNumber} failed:`, err)
    })
}

export async function rerunFrom(batchRunId: string, fromSceneNumber: number) {
  const batchRun = await prisma.batchRun.findUnique({ where: { id: batchRunId } })
  if (!batchRun) {
    throw new NotFoundError("BatchRun", batchRunId)
  }
  if (batchRun.status === "RUNNING") {
    throw new ConcurrencyError(`BatchRun ${batchRunId} is currently RUNNING; cancel it first`)
  }

  // Fire-and-forget
  void getOrchestrator()
    .rerunFrom(batchRunId, fromSceneNumber)
    .catch((err: unknown) => {
      console.error(`[Batch] rerunFrom ${batchRunId}/scene-${fromSceneNumber} failed:`, err)
    })
}
