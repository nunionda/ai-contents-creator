// ---------------------------------------------------------------------------
// EdgeTTSProvider — wraps Microsoft Edge TTS for free text-to-speech
// Supports Korean (ko-KR) and English (en-US) with no API key required.
// ---------------------------------------------------------------------------

import type { TTSProvider, TTSOptions } from "../types.js"

// ─── Voice mapping ───

const VOICE_MAP: Record<string, string> = {
  // Korean
  "ko-female": "ko-KR-SunHiNeural",
  "ko-male": "ko-KR-InJoonNeural",
  // English
  "en-female": "en-US-AriaNeural",
  "en-male": "en-US-GuyNeural",
  // Japanese
  "ja-female": "ja-JP-NanamiNeural",
  "ja-male": "ja-JP-KeitaNeural",
}

const DEFAULT_VOICES: Record<string, string> = {
  ko: "ko-KR-SunHiNeural",
  en: "en-US-AriaNeural",
  ja: "ja-JP-NanamiNeural",
}

// ─── Provider ───

export class EdgeTTSProvider implements TTSProvider {
  async generateTTS(
    text: string,
    options: TTSOptions = {},
  ): Promise<Buffer> {
    const language = options.language ?? "ko"
    const speed = options.speed ?? 1.0

    // Resolve voice: explicit voice → language default
    const voice =
      options.voice ??
      DEFAULT_VOICES[language] ??
      DEFAULT_VOICES["ko"]

    // Build rate string (e.g., "+20%" for speed 1.2, "-10%" for speed 0.9)
    const ratePercent = Math.round((speed - 1.0) * 100)
    const rate =
      ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`

    console.log(
      `[EdgeTTSProvider] Generating TTS: voice=${voice}, rate=${rate}, text=${text.slice(0, 50)}...`,
    )

    // edge-tts exports a simple tts() function
    const edgeTts = await import("edge-tts")
    const audioBuffer = await edgeTts.tts(text, { voice, rate })

    console.log(
      `[EdgeTTSProvider] TTS generated: ${(audioBuffer.length / 1024).toFixed(0)}KB`,
    )

    return audioBuffer
  }
}

// Export voice map for external use
export { VOICE_MAP, DEFAULT_VOICES }
