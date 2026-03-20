# WebSocket 실시간 파이프라인 모니터링 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 3-second HTTP polling with Bun native WebSocket for real-time pipeline monitoring.

**Architecture:** PipelineEventBus (EventEmitter class) is created in `apps/api` and injected into PipelineOrchestrator. The orchestrator emits events at key points (run start, step start/complete, progress, run complete). A WebSocket handler in `apps/api` listens on the bus and broadcasts to connected browser clients. The Next.js frontend uses a `usePipelineWS` hook that auto-connects, auto-reconnects, and falls back to polling.

**Tech Stack:** Bun native WebSocket, Hono (fetch wrapper for upgrade), Next.js 15, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-20-websocket-pipeline-monitoring-design.md`

---

### Task 1: Shared WS Event Types

**Files:**
- Create: `packages/shared/src/types/ws-events.ts`
- Modify: `packages/shared/src/types/index.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Create ws-events.ts with all event types**

```typescript
// packages/shared/src/types/ws-events.ts

export interface PipelineRunSnapshot {
  runId: string
  projectId: string
  projectTitle: string
  status: string
  currentStep: string | null
  progress: number
  steps: string[]
}

export type PipelineWSEvent =
  | { type: "run:snapshot"; runs: PipelineRunSnapshot[] }
  | { type: "run:started"; runId: string; projectId: string; projectTitle: string; steps: string[] }
  | { type: "step:started"; runId: string; step: string; stepIndex: number }
  | { type: "step:completed"; runId: string; step: string; success: boolean; message?: string }
  | { type: "progress"; runId: string; progress: number; currentStep: string }
  | { type: "run:completed"; runId: string; status: "completed" | "failed"; error?: string }
```

- [ ] **Step 2: Add export to types/index.ts**

Add to `packages/shared/src/types/index.ts`:
```typescript
export { type PipelineWSEvent, type PipelineRunSnapshot } from "./ws-events.js"
```

- [ ] **Step 3: Add export to shared barrel**

Add to `packages/shared/src/index.ts` (use direct path, not through types/index.js, to match existing barrel pattern):
```typescript
export { type PipelineWSEvent, type PipelineRunSnapshot } from "./types/ws-events.js"
```

- [ ] **Step 4: Verify typecheck**

Run: `cd packages/shared && bun run typecheck`
Expected: PASS with zero errors

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/types/ws-events.ts packages/shared/src/types/index.ts packages/shared/src/index.ts
git commit -m "feat: add PipelineWSEvent shared types for WebSocket monitoring"
```

---

### Task 2: PipelineEventBus Class

**Files:**
- Create: `packages/agents/src/base/pipeline-events.ts`
- Modify: `packages/agents/src/index.ts`

- [ ] **Step 1: Create PipelineEventBus**

```typescript
// packages/agents/src/base/pipeline-events.ts
import { EventEmitter } from "node:events"
import type { PipelineWSEvent } from "@marionette/shared"

export class PipelineEventBus extends EventEmitter {
  /** Emit a typed pipeline event to all listeners. */
  emitEvent(event: PipelineWSEvent): void {
    this.emit("pipeline:event", event)
  }

  /** Subscribe to pipeline events. */
  onEvent(handler: (event: PipelineWSEvent) => void): void {
    this.on("pipeline:event", handler)
  }
}
```

- [ ] **Step 2: Export from agents barrel**

Add to `packages/agents/src/index.ts` (in the Base section):
```typescript
export { PipelineEventBus } from "./base/pipeline-events.js"
```

- [ ] **Step 3: Verify typecheck**

Run: `cd packages/agents && bun run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/agents/src/base/pipeline-events.ts packages/agents/src/index.ts
git commit -m "feat: add PipelineEventBus class for DI-based event propagation"
```

---

### Task 3: Wire EventBus into PipelineOrchestrator

**Files:**
- Modify: `packages/agents/src/base/pipeline.ts`

- [ ] **Step 1: Add eventBus to constructor and import**

At top of `packages/agents/src/base/pipeline.ts`, add import:
```typescript
import type { PipelineEventBus } from "./pipeline-events.js"
```

Change the constructor from:
```typescript
constructor(private readonly db: PrismaClient) {}
```
to:
```typescript
constructor(private readonly db: PrismaClient, private readonly eventBus?: PipelineEventBus) {}
```

- [ ] **Step 2: Add emit helper**

Add top-level import to `pipeline.ts`:
```typescript
import type { PipelineWSEvent } from "@marionette/shared"
```

Add private helper method to `PipelineOrchestrator`:
```typescript
private emit(event: PipelineWSEvent): void {
  this.eventBus?.emitEvent(event)
}
```

- [ ] **Step 3: Emit run:started after RUNNING update**

After the `RUNNING` DB update (line ~61), add:
```typescript
// Fetch project title for the event
const project = await this.db.project.findUnique({ where: { id: projectId }, select: { title: true } })
this.emit({ type: "run:started", runId, projectId, projectTitle: project?.title ?? "Untitled", steps })
```

- [ ] **Step 4: Emit step:started before agent.execute()**

Inside the for loop, before `agent.execute(input)` (line ~91), add:
```typescript
this.emit({ type: "step:started", runId, step, stepIndex: steps.indexOf(step) })
```

- [ ] **Step 5: Emit step:completed + progress after successful step**

After the progress DB update (line ~117), add:
```typescript
this.emit({ type: "step:completed", runId, step, success: true, message: output.message })
this.emit({ type: "progress", runId, progress, currentStep: step })
```

- [ ] **Step 6: Emit step:completed(false) + run:completed on failure**

In the `catch` block (line ~120) and the `!output.success` block (line ~93), before `markFailed`, add:
```typescript
this.emit({ type: "step:completed", runId, step, success: false, message: errorMessage })
```

In `markFailed` method, after the DB update, add:
```typescript
this.emit({ type: "run:completed", runId, status: "failed", error: errorMessage })
```

- [ ] **Step 7: Emit run:completed on success**

After the final `COMPLETED` DB update (line ~137), add:
```typescript
this.emit({ type: "run:completed", runId, status: "completed" })
```

- [ ] **Step 8: Verify typecheck**

Run: `cd packages/agents && bun run typecheck`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add packages/agents/src/base/pipeline.ts
git commit -m "feat: emit WebSocket events from PipelineOrchestrator via injected EventBus"
```

---

### Task 4: WebSocket Handler (Server)

**Files:**
- Create: `apps/api/src/ws/handler.ts`

- [ ] **Step 1: Create WebSocket connection manager**

```typescript
// apps/api/src/ws/handler.ts
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
```

- [ ] **Step 2: Verify typecheck**

Run: `cd apps/api && bun run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/ws/handler.ts
git commit -m "feat: add WebSocket handler with client management and snapshot on connect"
```

---

### Task 5: Wire WebSocket into API Server

**Files:**
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/services/pipeline.service.ts`

- [ ] **Step 1: Update pipeline.service.ts — create and inject EventBus**

Add import at top of `apps/api/src/services/pipeline.service.ts`:
```typescript
import { PipelineEventBus } from "@marionette/agents"
```

Add a shared bus instance and export it:
```typescript
// ─── Shared event bus (created once, injected into orchestrator + WS handler) ───
export const pipelineBus = new PipelineEventBus()
```

Change `getOrchestrator()` to pass the bus:
```typescript
function getOrchestrator(): PipelineOrchestrator {
  if (!orchestrator) {
    const gw = getGateway()
    const registry = createAgentRegistry(gw, prisma)
    orchestrator = new PipelineOrchestrator(prisma, pipelineBus)  // ← pass bus
    for (const [name, agent] of registry) {
      orchestrator.register(name, agent)
    }
  }
  return orchestrator
}
```

- [ ] **Step 2: Update index.ts — Bun fetch wrapper + websocket**

Replace `apps/api/src/index.ts` with:
```typescript
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import type { Server } from "bun"
import { projectRoutes } from "./routes/projects.ts"
import { pipelineRoutes } from "./routes/pipeline.ts"
import { agentRoutes } from "./routes/agents.ts"
import { assetRoutes } from "./routes/assets.ts"
import { screenplayRoutes } from "./routes/screenplay.ts"
import { brainstormRoutes } from "./routes/brainstorm.ts"
import { loglineRoutes } from "./routes/logline.ts"
import { promptGuideRoutes } from "./routes/prompt-guide.ts"
import { errorHandler } from "./middleware/error-handler.ts"
import { wsHandler, initWSHandler } from "./ws/handler.ts"
import { pipelineBus } from "./services/pipeline.service.ts"
import { prisma } from "@marionette/db"

const app = new Hono()

app.use("*", logger())
app.use("*", cors())
app.onError(errorHandler)

app.get("/api/health", (c) => c.json({ status: "ok", service: "marionette-studio-api", version: "0.1.0" }))

app.route("/api/projects", projectRoutes)
app.route("/api/pipeline", pipelineRoutes)
app.route("/api/agents", agentRoutes)
app.route("/api/assets", assetRoutes)
app.route("/api/screenplay", screenplayRoutes)
app.route("/api/brainstorm", brainstormRoutes)
app.route("/api/logline", loglineRoutes)
app.route("/api/prompt-guide", promptGuideRoutes)

// Initialize WebSocket handler with shared dependencies
initWSHandler(pipelineBus, prisma)

export default {
  port: 3001,
  fetch(req: Request, server: Server) {
    // Intercept WebSocket upgrade before Hono
    if (new URL(req.url).pathname === "/api/pipeline/ws") {
      const upgraded = server.upgrade(req)
      if (upgraded) return undefined
      return new Response("WebSocket upgrade failed", { status: 400 })
    }
    return app.fetch(req)
  },
  websocket: wsHandler,
  idleTimeout: 255,
}
```

- [ ] **Step 3: Verify typecheck**

Run: `cd apps/api && bun run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/index.ts apps/api/src/services/pipeline.service.ts
git commit -m "feat: wire WebSocket server into Bun with fetch wrapper and EventBus DI"
```

---

### Task 6: Client usePipelineWS Hook

**Files:**
- Create: `apps/web/hooks/use-pipeline-ws.ts`

- [ ] **Step 1: Create hooks directory and hook file**

```typescript
// apps/web/hooks/use-pipeline-ws.ts
"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { API_BASE } from "../lib/api"

export interface PipelineRun {
  id: string
  projectId: string
  projectTitle: string
  status: string
  currentStep: string
  progress: number
  startedAt: string
  completedAt?: string
}

interface PipelineWSEvent {
  type: string
  runId?: string
  projectId?: string
  projectTitle?: string
  steps?: string[]
  step?: string
  stepIndex?: number
  success?: boolean
  message?: string
  progress?: number
  currentStep?: string
  status?: string
  error?: string
  runs?: Array<{
    runId: string
    projectId: string
    projectTitle: string
    status: string
    currentStep: string | null
    progress: number
    steps: string[]
  }>
}

const MAX_RECONNECT = 5
const RECONNECT_DELAY = 3000
const POLL_INTERVAL = 3000

export function usePipelineWS() {
  const [runs, setRuns] = useState<Map<string, PipelineRun>>(new Map())
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const wsRef = useRef<WebSocket | null>(null)
  const isMounted = useRef(true)
  const reconnectCount = useRef(0)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current)
      pollTimer.current = null
    }
  }, [])

  const fetchRunsHTTP = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/pipeline/runs`)
      if (!res.ok) return
      const data = await res.json()
      const list = data.runs ?? []
      setRuns((prev) => {
        const next = new Map(prev)
        for (const run of list) {
          next.set(run.id, {
            id: run.id,
            projectId: run.project_id ?? run.projectId,
            projectTitle: run.projectTitle ?? run.project_id ?? "",
            status: run.status,
            currentStep: run.current_step ?? run.currentStep ?? "",
            progress: run.progress ?? 0,
            startedAt: run.started_at ?? run.startedAt ?? new Date().toISOString(),
            completedAt: run.completed_at ?? run.completedAt,
          })
        }
        return next
      })
    } catch {
      // ignore fetch errors during polling
    } finally {
      setLoading(false)
    }
  }, [])

  const startPolling = useCallback(() => {
    stopPolling()
    void fetchRunsHTTP()
    pollTimer.current = setInterval(fetchRunsHTTP, POLL_INTERVAL)
  }, [fetchRunsHTTP, stopPolling])

  const handleEvent = useCallback((event: PipelineWSEvent) => {
    setRuns((prev) => {
      const next = new Map(prev)

      switch (event.type) {
        case "run:snapshot": {
          // Merge snapshot over existing state (don't clear — preserves completed/failed runs)
          for (const r of event.runs ?? []) {
            next.set(r.runId, {
              id: r.runId,
              projectId: r.projectId,
              projectTitle: r.projectTitle,
              status: r.status,
              currentStep: r.currentStep ?? "",
              progress: r.progress,
              startedAt: new Date().toISOString(),
            })
          }
          break
        }
        case "run:started": {
          if (event.runId) {
            next.set(event.runId, {
              id: event.runId,
              projectId: event.projectId ?? "",
              projectTitle: event.projectTitle ?? "",
              status: "running",
              currentStep: "",
              progress: 0,
              startedAt: new Date().toISOString(),
            })
          }
          break
        }
        case "step:started": {
          if (event.runId) {
            const run = next.get(event.runId)
            if (run) {
              next.set(event.runId, { ...run, currentStep: event.step ?? "" })
            }
          }
          break
        }
        case "step:completed": {
          // Updated via progress event
          break
        }
        case "progress": {
          if (event.runId) {
            const run = next.get(event.runId)
            if (run) {
              next.set(event.runId, {
                ...run,
                progress: event.progress ?? run.progress,
                currentStep: event.currentStep ?? run.currentStep,
              })
            }
          }
          break
        }
        case "run:completed": {
          if (event.runId) {
            const run = next.get(event.runId)
            if (run) {
              next.set(event.runId, {
                ...run,
                status: event.status ?? "completed",
                progress: event.status === "completed" ? 100 : run.progress,
                completedAt: new Date().toISOString(),
              })
            }
          }
          break
        }
      }

      return next
    })
  }, [])

  const connectWS = useCallback(() => {
    const wsUrl = API_BASE.replace(/^http/, "ws") + "/api/pipeline/ws"

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        setLoading(false)
        reconnectCount.current = 0
        stopPolling()
      }

      ws.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data as string) as PipelineWSEvent
          handleEvent(event)
        } catch {
          // ignore malformed messages
        }
      }

      ws.onclose = () => {
        setConnected(false)
        wsRef.current = null

        if (!isMounted.current) return  // unmounted, skip reconnect

        if (reconnectCount.current < MAX_RECONNECT) {
          reconnectCount.current++
          reconnectTimer.current = setTimeout(connectWS, RECONNECT_DELAY)
        } else {
          // Fallback to polling
          startPolling()
        }
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch {
      // WebSocket constructor failed — fallback to polling
      startPolling()
    }
  }, [handleEvent, startPolling, stopPolling])

  useEffect(() => {
    isMounted.current = true
    connectWS()

    return () => {
      isMounted.current = false
      wsRef.current?.close()
      stopPolling()
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    }
  }, [connectWS, stopPolling])

  return {
    runs: Array.from(runs.values()),
    connected,
    loading,
  }
}
```

- [ ] **Step 2: Verify lint**

Run: `cd apps/web && bun run lint -- hooks/use-pipeline-ws.ts`
Expected: PASS (no errors)

- [ ] **Step 3: Commit**

```bash
git add apps/web/hooks/use-pipeline-ws.ts
git commit -m "feat: add usePipelineWS hook with auto-reconnect and polling fallback"
```

---

### Task 7: Update Pipeline Page to Use WebSocket

**Files:**
- Modify: `apps/web/app/(dashboard)/pipeline/page.tsx`

- [ ] **Step 1: Replace polling with WebSocket hook**

Replace the entire file with:
```typescript
"use client";

import { usePipelineWS } from "../../../hooks/use-pipeline-ws";

const statusColors: Record<string, string> = {
  completed: "bg-green-500/20 text-green-400",
  running: "bg-blue-500/20 text-blue-400",
  queued: "bg-yellow-500/20 text-yellow-400",
  failed: "bg-red-500/20 text-red-400",
  idle: "bg-gray-500/20 text-gray-400",
};

export default function PipelinePage() {
  const { runs, connected, loading } = usePipelineWS();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <p className="mt-1 text-sm text-gray-400">
            Monitor active and recent pipeline runs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              connected ? "bg-green-400" : "bg-yellow-400"
            }`}
          />
          <span className="text-xs text-gray-500">
            {connected ? "Live" : "Polling"}
          </span>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          Loading pipeline runs...
        </div>
      )}

      {!loading && runs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <p className="text-lg">No pipeline runs</p>
          <p className="mt-1 text-sm">
            Start a pipeline from a project to see runs here
          </p>
        </div>
      )}

      <div className="space-y-3">
        {runs.map((run) => (
          <div
            key={run.id}
            className="rounded-xl border border-gray-800 bg-gray-900 p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="font-medium">{run.projectTitle}</h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[run.status] ?? statusColors.idle}`}
                >
                  {run.status}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {new Date(run.startedAt).toLocaleString()}
              </span>
            </div>

            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-gray-400">{run.currentStep}</span>
              <span className="text-gray-500">{Math.round(run.progress)}%</span>
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
              <div
                className={`h-full rounded-full transition-all ${
                  run.status === "failed" ? "bg-red-500" : "bg-blue-500"
                }`}
                style={{ width: `${run.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify lint**

Run: `cd apps/web && bun run lint -- app/\(dashboard\)/pipeline/page.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(dashboard\)/pipeline/page.tsx
git commit -m "feat: replace polling with WebSocket for real-time pipeline monitoring"
```

---

### Task 8: Final Integration Verification

- [ ] **Step 1: Typecheck all packages**

Run: `cd packages/shared && bun run typecheck && cd ../agents && bun run typecheck`
Expected: PASS

- [ ] **Step 2: Typecheck API**

Run: `cd apps/api && bun run typecheck`
Expected: PASS

- [ ] **Step 3: Lint all changed files**

Run: `bun run lint`
Expected: PASS (or only pre-existing warnings)

- [ ] **Step 4: Start API server and verify WebSocket upgrade**

Run: `cd apps/api && bun run dev`
Test: `wscat -c ws://localhost:3001/api/pipeline/ws` (or browser devtools)
Expected: Connection opens, receives `run:snapshot` event with empty `runs` array

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A && git commit -m "fix: integration fixes for WebSocket pipeline monitoring"
```
