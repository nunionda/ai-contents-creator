// ---------------------------------------------------------------------------
// OpenAIProvider — wraps OpenAI REST API for text (GPT-4o) and image (DALL-E 3)
// ---------------------------------------------------------------------------

import type { TextProvider, ImageProvider, TextOptions, ImageOptions } from "../types.js"

// ─── Constants ───

const OPENAI_API_BASE = "https://api.openai.com/v1"
const DEFAULT_TEXT_MODEL = "gpt-4o"
const DEFAULT_IMAGE_MODEL = "dall-e-3"

// ─── Helpers ───

function getApiKey(): string {
  const key = process.env["OPENAI_API_KEY"]
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY environment variable is not set. " +
        "Set it before using OpenAIProvider.",
    )
  }
  return key
}

/** Map gateway aspect ratio strings to DALL-E 3 size parameters. */
function aspectToSize(aspectRatio?: string): string {
  switch (aspectRatio) {
    case "9:16":
      return "1024x1792"
    case "16:9":
    case "2.35:1":
      return "1792x1024"
    default:
      return "1024x1024"
  }
}

// ─── OpenAI API response types ───

interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

interface ChatCompletionResponse {
  choices: { message: { content: string } }[]
}

interface ImageGenerationResponse {
  data: { b64_json?: string; url?: string }[]
}

// ─── Provider ───

export class OpenAIProvider implements TextProvider, ImageProvider {
  // ── Text (Chat Completions) ──────────────────────────────────────

  async generateText(prompt: string, options?: TextOptions): Promise<string> {
    const apiKey = getApiKey()
    const model = DEFAULT_TEXT_MODEL

    const messages: ChatMessage[] = []
    if (options?.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt })
    }
    messages.push({ role: "user", content: prompt })

    const body: Record<string, unknown> = {
      model,
      messages,
    }

    if (options?.temperature !== undefined) {
      body.temperature = options.temperature
    }
    if (options?.maxTokens !== undefined) {
      body.max_tokens = options.maxTokens
    }
    if (options?.responseSchema) {
      body.response_format = {
        type: "json_schema",
        json_schema: {
          name: "response",
          schema: options.responseSchema,
          strict: true,
        },
      }
    }

    const res = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`[OpenAI] Chat completion failed (${res.status}): ${err}`)
    }

    const data = (await res.json()) as ChatCompletionResponse
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error("[OpenAI] Empty response from chat completion")
    }
    return content
  }

  // ── Image (DALL-E 3) ─────────────────────────────────────────────

  async generateImage(prompt: string, options?: ImageOptions): Promise<Buffer> {
    const apiKey = getApiKey()
    const model = DEFAULT_IMAGE_MODEL
    const size = aspectToSize(options?.aspectRatio)

    const body: Record<string, unknown> = {
      model,
      prompt,
      n: 1,
      size,
      response_format: "b64_json",
    }

    if (options?.style === "photorealistic" || options?.style === "concept_art") {
      body.style = "natural"
    } else {
      body.style = "vivid"
    }

    const res = await fetch(`${OPENAI_API_BASE}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`[OpenAI] Image generation failed (${res.status}): ${err}`)
    }

    const data = (await res.json()) as ImageGenerationResponse
    const b64 = data.data?.[0]?.b64_json
    if (!b64) {
      throw new Error("[OpenAI] No image data in response")
    }

    return Buffer.from(b64, "base64")
  }
}
