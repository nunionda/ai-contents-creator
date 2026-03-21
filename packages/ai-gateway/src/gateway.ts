import type {
  TextProvider,
  ImageProvider,
  VideoProvider,
  AudioProvider,
  TTSProvider,
  TextOptions,
  ImageOptions,
  VideoOptions,
  AudioOptions,
  TTSOptions,
  VideoResult,
} from "./types.js"

// ─── Capability checks ───

function isTextProvider(p: unknown): p is TextProvider {
  return typeof (p as TextProvider).generateText === "function"
}

function isImageProvider(p: unknown): p is ImageProvider {
  return typeof (p as ImageProvider).generateImage === "function"
}

function isVideoProvider(p: unknown): p is VideoProvider {
  return typeof (p as VideoProvider).generateVideo === "function"
}

function isAudioProvider(p: unknown): p is AudioProvider {
  return typeof (p as AudioProvider).generateAudio === "function"
}

function isTTSProvider(p: unknown): p is TTSProvider {
  return typeof (p as TTSProvider).generateTTS === "function"
}

// ─── Provider entry ───

type AnyProvider =
  | TextProvider
  | ImageProvider
  | VideoProvider
  | AudioProvider
  | TTSProvider

interface ProviderEntry {
  provider: AnyProvider
  isDefault: boolean
}

// ─── Gateway ───

export class AIGateway {
  private readonly providers = new Map<string, ProviderEntry>()

  /**
   * Register a provider under a name.
   *
   * @param name     Unique provider name (e.g. "gemini", "openai")
   * @param provider Provider instance implementing one or more capability interfaces
   * @param isDefault If true, this provider is used when no name is specified
   */
  register(
    name: string,
    provider: AnyProvider,
    isDefault = false,
  ): this {
    this.providers.set(name, { provider, isDefault })
    return this
  }

  // ── Capability methods ───────────────────────────────────────────

  async text(
    prompt: string,
    options?: TextOptions & { provider?: string },
  ): Promise<string> {
    const p = this.resolve(options?.provider, isTextProvider, "text")
    return p.generateText(prompt, options)
  }

  async image(
    prompt: string,
    options?: ImageOptions & { provider?: string },
  ): Promise<Buffer> {
    const p = this.resolve(options?.provider, isImageProvider, "image")
    return p.generateImage(prompt, options)
  }

  async video(
    prompt: string,
    options?: VideoOptions & { provider?: string },
  ): Promise<VideoResult> {
    const p = this.resolve(options?.provider, isVideoProvider, "video")
    return p.generateVideo(prompt, options)
  }

  async audio(
    prompt: string,
    options?: AudioOptions & { provider?: string },
  ): Promise<Buffer> {
    const p = this.resolve(options?.provider, isAudioProvider, "audio")
    return p.generateAudio(prompt, options)
  }

  async tts(
    text: string,
    options?: TTSOptions & { provider?: string },
  ): Promise<Buffer> {
    const p = this.resolve(options?.provider, isTTSProvider, "tts")
    return p.generateTTS(text, options)
  }

  // ── Fallback helper ─────────────────────────────────────────────

  /**
   * Execute a primary call and fall back to an alternative provider on failure.
   *
   * @example
   * const result = await gateway.withFallback(
   *   () => gateway.video(prompt, { provider: "gemini" }),
   *   () => gateway.video(prompt, { provider: "replicate" }),
   * )
   */
  async withFallback<T>(
    primary: () => Promise<T>,
    fallback: () => Promise<T>,
  ): Promise<T> {
    try {
      return await primary()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[AIGateway] Primary failed, falling back: ${msg}`)
      return fallback()
    }
  }

  // ── Internal helpers ─────────────────────────────────────────────

  private resolve<T>(
    name: string | undefined,
    guard: (p: unknown) => p is T,
    capability: string,
  ): T {
    if (name) {
      const entry = this.providers.get(name)
      if (!entry) {
        throw new Error(
          `[AIGateway] No provider registered with name "${name}". ` +
            `Registered: ${[...this.providers.keys()].join(", ") || "(none)"}`,
        )
      }
      if (!guard(entry.provider)) {
        throw new Error(
          `[AIGateway] Provider "${name}" does not support the "${capability}" capability.`,
        )
      }
      return entry.provider
    }

    // Fall back to default provider that supports the capability
    for (const [entryName, entry] of this.providers) {
      if (entry.isDefault && guard(entry.provider)) {
        return entry.provider
      }
      void entryName
    }

    // No default found — try any provider that supports the capability
    for (const [, entry] of this.providers) {
      if (guard(entry.provider)) {
        return entry.provider
      }
    }

    throw new Error(
      `[AIGateway] No registered provider supports the "${capability}" capability. ` +
        `Registered: ${[...this.providers.keys()].join(", ") || "(none)"}`,
    )
  }
}
