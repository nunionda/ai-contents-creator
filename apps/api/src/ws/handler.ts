import type { ServerWebSocket } from "bun"
import type { PipelineEventBus } from "@marionette/agents"
import type { PipelineWSEvent, PipelineRunSnapshot } from "@marionette/shared"
import type { PrismaClient } from "@prisma/client"

const clients = new Set<ServerWebSocket<unknown>>()

let eventBus: PipelineEventBus | null = null
let db: PrismaClient | null = null

/** Initialize the WS handler with dependencies. Call once at server startup. Idempotent. */
export function initWSHandler(bus: PipelineEventBus, prisma: PrismaClient): void {
  if (eventBus) return  // already initialized — prevent duplicate listeners
  eventBus = bus
  db = prisma

  bus.onEvent((event: PipelineWSEvent) => {
    const message = JSON.stringify(event)
    for (const ws of clients) {
      ws.send(message)
    }
  })
}

/** Send active run snapshots to a newly connected client. */
async function sendSnapshot(ws: ServerWebSocket<unknown>): Promise<void> {
  if (!db) return

  const activeRuns = await db.pipelineRun.findMany({
    where: { status: { in: ["RUNNING", "QUEUED"] } },
    include: { project: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
  })

  const runs: PipelineRunSnapshot[] = activeRuns.map((r) => ({
    runId: r.id,
    projectId: r.projectId,
    projectTitle: r.project.title,
    status: r.status.toLowerCase(),
    currentStep: r.currentStep,
    progress: r.progress,
    steps: r.steps as string[],
  }))

  ws.send(JSON.stringify({ type: "run:snapshot", runs } satisfies PipelineWSEvent))

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
}

/** Bun WebSocket handler object — pass to `export default { websocket }`. */
export const wsHandler = {
  open(ws: ServerWebSocket<unknown>) {
    clients.add(ws)
    void sendSnapshot(ws)
  },
  close(ws: ServerWebSocket<unknown>) {
    clients.delete(ws)
  },
  message(_ws: ServerWebSocket<unknown>, _message: string | Buffer) {
    // Client→server messages not used yet; reserved for future (cancel, etc.)
  },
}
