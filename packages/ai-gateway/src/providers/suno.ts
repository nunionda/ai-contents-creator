// ---------------------------------------------------------------------------
// SunoProvider — wraps Suno API v2 for AI music generation
// ---------------------------------------------------------------------------

import type { AudioProvider, AudioOptions } from "../types.js"

// ─── Constants ───

const SUNO_API_BASE = "https://apibox.erweima.ai/api/v1/generate"
const MAX_POLLS = 60
const POLL_INTERVAL = 5_000 // 5 seconds

// ─── Helpers ───

function getApiKey(): string {
  const key = process.env["SUNO_API_KEY"]
  if (!key) {
    throw new Error(
      "SUNO_API_KEY environment variable is not set. " +
        "Set it before using SunoProvider.",
    )
  }
  return key
}

// ─── Suno API response types ───

interface SunoGenerateResponse {
  code: number
  msg: string
  data?: {
    taskId: string
  }
}

interface SunoClipData {
  id: string
  status: string // "complete", "processing", "error"
  audioUrl?: string
  title?: string
  duration?: number
  errorMessage?: string
}

interface SunoTaskResponse {
  code: number
  msg: string
  data?: {
    status: string
    clips?: SunoClipData[]
  }
}

// ─── Provider ───

export class SunoProvider implements AudioProvider {
  private readonly apiKey: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? getApiKey()
  }

  async generateAudio(
    prompt: string,
    options: AudioOptions = {},
  ): Promise<Buffer> {
    const duration = options.duration ?? 30
    const style = options.style ?? ""
    const genre = options.genre ?? ""

    // Build descriptive prompt with style hints
    const fullPrompt = [
      prompt,
      genre ? `Genre: ${genre}` : "",
      style ? `Style: ${style}` : "",
      `Duration: approximately ${duration} seconds`,
    ]
      .filter(Boolean)
      .join(". ")

    // Step 1: Submit generation request
    const taskId = await this.submitGeneration(fullPrompt)

    // Step 2: Poll for completion
    const audioUrl = await this.pollForCompletion(taskId)

    // Step 3: Download audio file
    const audioBuffer = await this.downloadAudio(audioUrl)

    return audioBuffer
  }

  // ── Internal methods ──────────────────────────────────────────

  private async submitGeneration(prompt: string): Promise<string> {
    const res = await fetch(SUNO_API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        customMode: true,
        instrumental: true,
        model: "V4",
        callBackUrl: "",
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Suno API submit failed (${res.status}): ${errText}`)
    }

    const data = (await res.json()) as SunoGenerateResponse
    if (data.code !== 200 || !data.data?.taskId) {
      throw new Error(
        `Suno API error: ${data.msg ?? "Unknown error"} (code: ${data.code})`,
      )
    }

    return data.data.taskId
  }

  private async pollForCompletion(taskId: string): Promise<string> {
    const pollUrl = `${SUNO_API_BASE}/record?taskId=${taskId}`

    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL))

      const res = await fetch(pollUrl, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      if (!res.ok) continue

      const data = (await res.json()) as SunoTaskResponse

      if (data.data?.status === "complete") {
        const clip = data.data.clips?.[0]
        if (!clip?.audioUrl) {
          throw new Error("Suno completed but returned no audio URL")
        }
        return clip.audioUrl
      }

      if (data.data?.status === "error") {
        const clip = data.data.clips?.[0]
        throw new Error(
          `Suno generation failed: ${clip?.errorMessage ?? "Unknown error"}`,
        )
      }
    }

    throw new Error(
      `Suno music generation timed out after ${(MAX_POLLS * POLL_INTERVAL) / 1000}s`,
    )
  }

  private async downloadAudio(url: string): Promise<Buffer> {
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`Suno audio download failed (${res.status})`)
    }
    return Buffer.from(await res.arrayBuffer())
  }
}
