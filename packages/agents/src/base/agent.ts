// ---------------------------------------------------------------------------
// BaseAgent — abstract base class for all Marionette pipeline agents
// ---------------------------------------------------------------------------

import type { PrismaClient } from "@prisma/client"
import type { AIGateway } from "@marionette/ai-gateway"
import type { ProductionPhase } from "@marionette/shared"

// ─── Agent I/O contracts ───

export interface AgentInput {
  projectId: string
  runId: string
  [key: string]: unknown
}

export interface AgentOutput {
  success: boolean
  message: string
  outputPath?: string
  data?: Record<string, unknown>
}

// ─── Abstract base ───

export abstract class BaseAgent {
  abstract readonly name: string
  abstract readonly phase: ProductionPhase
  abstract readonly description: string

  constructor(
    protected readonly gateway: AIGateway,
    protected readonly db: PrismaClient,
  ) {}

  /** Execute the agent's primary task. */
  abstract execute(input: AgentInput): Promise<AgentOutput>

  /**
   * Look up provider/model from AgentConfig for this agent.
   * Returns empty object if no config found → gateway uses default routing.
   */
  protected async getProviderConfig(): Promise<{ provider?: string; model?: string }> {
    const config = await this.db.agentConfig.findUnique({
      where: { agentName: this.name },
      select: { provider: true, model: true },
    })
    return config ? { provider: config.provider, model: config.model } : {}
  }

  /** Persist a produced asset to the database. */
  protected async saveAsset(params: {
    projectId: string
    type: "IMAGE" | "VIDEO" | "AUDIO" | "MODEL_3D" | "DOCUMENT"
    agentName: string
    filePath: string
    fileName: string
    mimeType: string
    sceneNumber?: number
    fileSize?: number
    metadata?: Record<string, unknown>
  }) {
    const { metadata, ...rest } = params
    return this.db.asset.create({
      data: {
        ...rest,
        phase: this.phase,
        ...(metadata ? { metadata: JSON.parse(JSON.stringify(metadata)) } : {}),
      },
    })
  }

  /** Update the pipeline run's progress percentage. */
  protected async updateProgress(runId: string, progress: number) {
    await this.db.pipelineRun.update({
      where: { id: runId },
      data: { progress },
    })
  }

  /** Structured log with agent name prefix. */
  protected log(message: string) {
    console.log(`[${this.name}] ${message}`)
  }
}
