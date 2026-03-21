// ---------------------------------------------------------------------------
// ReplicateProvider — wraps Replicate API for Wan 2.5 video generation (free tier)
// ---------------------------------------------------------------------------

import type { VideoProvider, VideoOptions, VideoResult } from "../types.js"

// ─── Constants ───

const REPLICATE_API_BASE = "https://api.replicate.com/v1"
const MAX_POLLS = 120
const POLL_INTERVAL = 5_000 // 5 seconds

// ─── Helpers ───

function getApiToken(): string {
  const key = process.env["REPLICATE_API_TOKEN"]
  if (!key) {
    throw new Error(
      "REPLICATE_API_TOKEN environment variable is not set. " +
        "Get a free token at https://replicate.com/account/api-tokens",
    )
  }
  return key
}

// ─── Replicate API response types ───

interface ReplicatePrediction {
  id: string
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled"
  output?: string | string[] | null
  error?: string | null
  urls?: {
    get?: string
    cancel?: string
  }
}

// ─── Provider ───

export class ReplicateProvider implements VideoProvider {
  private readonly apiToken: string

  constructor(apiToken?: string) {
    this.apiToken = apiToken ?? getApiToken()
  }

  async generateVideo(
    prompt: string,
    options: VideoOptions = {},
  ): Promise<VideoResult> {
    const duration = options.duration ?? 5
    const aspectRatio = options.aspectRatio ?? "16:9"

    console.log("[ReplicateProvider] Submitting Wan 2.5 video generation...")

    // Step 1: Create prediction
    const prediction = await this.createPrediction(prompt, duration, aspectRatio)

    // Step 2: Poll for completion
    const outputUrl = await this.pollForCompletion(prediction)

    // Step 3: Download video
    const videoBuffer = await this.downloadVideo(outputUrl)

    console.log(
      `[ReplicateProvider] Video generated: ${(videoBuffer.length / 1024 / 1024).toFixed(1)}MB`,
    )

    return {
      videoBuffer,
      duration,
      mimeType: "video/mp4",
    }
  }

  // ── Internal methods ──────────────────────────────────────────

  private async createPrediction(
    prompt: string,
    duration: number,
    aspectRatio: string,
  ): Promise<ReplicatePrediction> {
    const res = await fetch(`${REPLICATE_API_BASE}/predictions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiToken}`,
        Prefer: "respond-async",
      },
      body: JSON.stringify({
        model: "wan-video/wan-2.5-t2v-480p",
        input: {
          prompt,
          duration,
          aspect_ratio: aspectRatio,
        },
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Replicate API submit failed (${res.status}): ${errText}`)
    }

    const data = (await res.json()) as ReplicatePrediction
    if (!data.id) {
      throw new Error("Replicate API returned no prediction ID")
    }

    console.log(`[ReplicateProvider] Prediction created: ${data.id}`)
    return data
  }

  private async pollForCompletion(
    prediction: ReplicatePrediction,
  ): Promise<string> {
    const pollUrl =
      prediction.urls?.get ??
      `${REPLICATE_API_BASE}/predictions/${prediction.id}`

    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL))

      const res = await fetch(pollUrl, {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
        },
      })

      if (!res.ok) continue

      const data = (await res.json()) as ReplicatePrediction

      if (data.status === "succeeded") {
        const output = Array.isArray(data.output)
          ? data.output[0]
          : data.output
        if (!output) {
          throw new Error("Replicate completed but returned no output URL")
        }
        return output
      }

      if (data.status === "failed" || data.status === "canceled") {
        throw new Error(
          `Replicate prediction ${data.status}: ${data.error ?? "Unknown error"}`,
        )
      }

      if (i % 12 === 0 && i > 0) {
        console.log(
          `[ReplicateProvider] Still generating... (${i * 5}s elapsed, status: ${data.status})`,
        )
      }
    }

    throw new Error(
      `Replicate video generation timed out after ${(MAX_POLLS * POLL_INTERVAL) / 1000}s`,
    )
  }

  private async downloadVideo(url: string): Promise<Buffer> {
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`Replicate video download failed (${res.status})`)
    }
    return Buffer.from(await res.arrayBuffer())
  }
}
