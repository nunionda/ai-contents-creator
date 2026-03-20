// ---------------------------------------------------------------------------
// ColoristAgent — applies color grading to the master edit using ffmpeg
// ---------------------------------------------------------------------------

import { join } from "node:path"
import { mkdir, stat } from "node:fs/promises"
import type { DirectionPlan } from "@marionette/shared"
import { ProductionPhase } from "@marionette/shared"
import { BaseAgent } from "../base/agent.js"
import type { AgentInput, AgentOutput } from "../base/agent.js"

// ─── Color grading presets ───
// Each preset maps to ffmpeg video filter parameters.
// Since we cannot ship .cube LUT files, we use ffmpeg's built-in
// eq (equalizer) and colorbalance filters to achieve the look.

interface ColorPreset {
  name: string
  description: string
  /** Genre keywords that trigger this preset */
  keywords: string[]
  /** ffmpeg -vf filter chain */
  filter: string
}

const COLOR_PRESETS: ColorPreset[] = [
  {
    name: "cinematic_warm",
    description: "Warm golden tones — drama, romance, historical",
    keywords: ["drama", "romance", "historical", "period", "family"],
    filter:
      "eq=brightness=0.04:contrast=1.15:saturation=1.1," +
      "colorbalance=rs=0.08:gs=0.02:bs=-0.05:rm=0.06:gm=0.02:bm=-0.04",
  },
  {
    name: "noir_cold",
    description: "Cold blue/teal tones — noir, thriller, mystery",
    keywords: ["noir", "thriller", "mystery", "crime", "detective", "horror"],
    filter:
      "eq=brightness=-0.03:contrast=1.25:saturation=0.7," +
      "colorbalance=rs=-0.06:gs=-0.02:bs=0.12:rm=-0.04:gm=0.0:bm=0.08",
  },
  {
    name: "neon_cyberpunk",
    description: "Neon high-contrast — sci-fi, cyberpunk, action",
    keywords: ["sci-fi", "cyberpunk", "action", "neon", "future", "sf"],
    filter:
      "eq=brightness=0.02:contrast=1.3:saturation=1.4," +
      "colorbalance=rs=0.05:gs=-0.06:bs=0.1:rm=0.08:gm=-0.04:bm=0.12",
  },
  {
    name: "natural",
    description: "Natural color correction — documentary, slice-of-life",
    keywords: ["documentary", "nature", "slice-of-life", "reality"],
    filter:
      "eq=brightness=0.02:contrast=1.05:saturation=1.05," +
      "colorbalance=rs=0.01:gs=0.01:bs=0.0",
  },
  {
    name: "vintage",
    description: "Vintage film grain look — period drama, retro",
    keywords: ["vintage", "retro", "period", "80s", "70s", "classic"],
    filter:
      "eq=brightness=0.03:contrast=1.1:saturation=0.85," +
      "colorbalance=rs=0.06:gs=0.04:bs=-0.02:rh=0.04:gh=0.02:bh=-0.03",
  },
]

const DEFAULT_PRESET = COLOR_PRESETS[0]! // cinematic_warm

// ─── Input extension ───

export interface ColoristInput extends AgentInput {
  directionPlan?: DirectionPlan
  inputPath?: string // path to master edit video
  outputDir?: string
}

// ─── Agent ───

export class ColoristAgent extends BaseAgent {
  readonly name = "Colorist"
  readonly phase = ProductionPhase.POST
  readonly description =
    "Applies color grading to the master edit using ffmpeg filters based on genre/mood analysis"

  async execute(input: ColoristInput): Promise<AgentOutput> {
    const { projectId, runId, directionPlan } = input
    const outputDir = input.outputDir ?? "output/master"

    this.log(`Starting color grading for project ${projectId}`)
    await this.updateProgress(runId, 5)

    await mkdir(outputDir, { recursive: true })

    // Find the master edit video
    const inputPath =
      input.inputPath ?? join("output/master", `final_master_${projectId}.mp4`)

    const inputExists = await stat(inputPath).catch(() => null)
    if (!inputExists) {
      this.log(`Master edit not found at ${inputPath}`)
      return {
        success: false,
        message: `Master edit video not found at ${inputPath}. Run MasterEditor first.`,
      }
    }

    // Select color preset based on genre/mood
    const preset = this.selectPreset(directionPlan)
    this.log(`Selected color preset: ${preset.name} — ${preset.description}`)
    await this.updateProgress(runId, 20)

    // Apply color grading via ffmpeg
    const outputPath = join(outputDir, `color_graded_${projectId}.mp4`)

    try {
      this.log(`Applying ffmpeg color grading (${preset.name})...`)
      await this.updateProgress(runId, 40)

      const result = await Bun.spawn({
        cmd: [
          "ffmpeg",
          "-y",
          "-i",
          inputPath,
          "-vf",
          preset.filter,
          "-c:v",
          "libx264",
          "-preset",
          "fast",
          "-crf",
          "20",
          "-c:a",
          "copy",
          "-movflags",
          "+faststart",
          outputPath,
        ],
        env: {
          ...process.env,
          PATH: `/opt/homebrew/bin:${process.env["HOME"]}/.bun/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:${process.env["PATH"] ?? ""}`,
        },
        stdout: "ignore",
        stderr: "pipe",
      }).exited

      if (result !== 0) {
        throw new Error(`ffmpeg exited with code ${result}`)
      }

      const fileStats = await stat(outputPath).catch(() => null)

      // Save asset
      await this.saveAsset({
        projectId,
        type: "VIDEO",
        agentName: this.name,
        filePath: outputPath,
        fileName: outputPath.split("/").pop() ?? "color_graded.mp4",
        mimeType: "video/mp4",
        fileSize: fileStats?.size,
        metadata: {
          preset: preset.name,
          filter: preset.filter,
          inputPath,
        },
      })

      await this.updateProgress(runId, 100)

      this.log(`Color grading complete: ${outputPath}`)

      return {
        success: true,
        message: `Colorist applied "${preset.name}" grading to master edit`,
        outputPath,
        data: {
          preset: preset.name,
          outputPath,
          inputPath,
        },
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      this.log(`ffmpeg color grading error: ${errorMessage}`)
      return {
        success: false,
        message: `Color grading failed: ${errorMessage}`,
      }
    }
  }

  // ── Preset selection ──────────────────────────────────────────

  /** Select the best color preset based on the direction plan's genre and tone. */
  private selectPreset(plan?: DirectionPlan): ColorPreset {
    if (!plan) return DEFAULT_PRESET

    const genreLower = plan.genre.toLowerCase()
    const audioLower = plan.global_audio_concept?.toLowerCase() ?? ""
    const searchText = `${genreLower} ${audioLower}`

    // Score each preset by keyword matches
    let bestPreset = DEFAULT_PRESET
    let bestScore = 0

    for (const preset of COLOR_PRESETS) {
      let score = 0
      for (const keyword of preset.keywords) {
        if (searchText.includes(keyword)) {
          score++
        }
      }
      if (score > bestScore) {
        bestScore = score
        bestPreset = preset
      }
    }

    return bestPreset
  }
}
