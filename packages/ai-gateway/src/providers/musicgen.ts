// ---------------------------------------------------------------------------
// MusicGenProvider — wraps HuggingFace Inference API for Meta MusicGen (free)
// ---------------------------------------------------------------------------

import type { AudioProvider, AudioOptions } from "../types.js"

// ─── Constants ───

const HF_INFERENCE_URL =
  "https://router.huggingface.co/hf-inference/models/facebook/musicgen-small"
const REQUEST_TIMEOUT = 120_000 // 2 minutes

// ─── Provider ───

export class MusicGenProvider implements AudioProvider {
  private readonly apiToken: string | undefined

  constructor(apiToken?: string) {
    // HF token is optional — free tier works without it (with rate limits)
    this.apiToken = apiToken ?? process.env["HF_API_TOKEN"]
  }

  async generateAudio(
    prompt: string,
    options: AudioOptions = {},
  ): Promise<Buffer> {
    const genre = options.genre ?? ""
    const style = options.style ?? ""
    const duration = options.duration ?? 30

    // Build descriptive prompt with style hints
    const fullPrompt = [
      prompt,
      genre ? `Genre: ${genre}` : "",
      style ? `Style: ${style}` : "",
      `Duration: approximately ${duration} seconds`,
    ]
      .filter(Boolean)
      .join(". ")

    console.log("[MusicGenProvider] Generating audio via HuggingFace MusicGen...")

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (this.apiToken) {
      headers["Authorization"] = `Bearer ${this.apiToken}`
    }

    const res = await fetch(HF_INFERENCE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ inputs: fullPrompt }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    })

    if (!res.ok) {
      const errText = await res.text()

      // Handle model loading (503) — retry once after waiting
      if (res.status === 503) {
        console.log("[MusicGenProvider] Model loading, retrying in 30s...")
        await new Promise((r) => setTimeout(r, 30_000))

        const retryRes = await fetch(HF_INFERENCE_URL, {
          method: "POST",
          headers,
          body: JSON.stringify({ inputs: fullPrompt }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        })

        if (!retryRes.ok) {
          const retryErr = await retryRes.text()
          throw new Error(
            `MusicGen API retry failed (${retryRes.status}): ${retryErr}`,
          )
        }

        const audioBuffer = Buffer.from(await retryRes.arrayBuffer())
        console.log(
          `[MusicGenProvider] Audio generated (retry): ${(audioBuffer.length / 1024).toFixed(0)}KB`,
        )
        return audioBuffer
      }

      throw new Error(`MusicGen API failed (${res.status}): ${errText}`)
    }

    const audioBuffer = Buffer.from(await res.arrayBuffer())
    console.log(
      `[MusicGenProvider] Audio generated: ${(audioBuffer.length / 1024).toFixed(0)}KB`,
    )
    return audioBuffer
  }
}
