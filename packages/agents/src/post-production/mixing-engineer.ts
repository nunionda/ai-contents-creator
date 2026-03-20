// ---------------------------------------------------------------------------
// MixingEngineerAgent — final audio-video merge using ffmpeg
// Combines: color-graded video + dialogue audio + BGM into one final output
// ---------------------------------------------------------------------------

import { join } from "node:path"
import { mkdir, readdir, stat } from "node:fs/promises"
import { ProductionPhase } from "@marionette/shared"
import { BaseAgent } from "../base/agent.js"
import type { AgentInput, AgentOutput } from "../base/agent.js"

// ─── Audio mix levels (dB relative) ───

/** Dialogue is the primary audio — loudest. */
const DIALOGUE_VOLUME = "0.5"
/** BGM sits underneath dialogue. */
const BGM_VOLUME = "0.15"
/** Original video audio (ambient/sfx) kept very low. */
const VIDEO_AUDIO_VOLUME = "0.08"

// ─── Input extension ───

export interface MixingEngineerInput extends AgentInput {
  videoPath?: string // color-graded video
  dialogueDir?: string // directory with dialogue WAV files
  bgmDir?: string // directory with BGM MP3 files
  outputDir?: string
}

// ─── Agent ───

export class MixingEngineerAgent extends BaseAgent {
  readonly name = "MixingEngineer"
  readonly phase = ProductionPhase.POST
  readonly description =
    "Merges color-graded video with dialogue audio and BGM into the final output using ffmpeg"

  async execute(input: MixingEngineerInput): Promise<AgentOutput> {
    const { projectId, runId } = input
    const outputDir = input.outputDir ?? "output/final"

    this.log(`Starting final audio-video mix for project ${projectId}`)
    await this.updateProgress(runId, 5)

    await mkdir(outputDir, { recursive: true })

    // Resolve input paths
    const videoPath =
      input.videoPath ??
      join("output/master", `color_graded_${projectId}.mp4`)
    const dialogueDir = input.dialogueDir ?? join("output/audio", projectId)
    const bgmDir = input.bgmDir ?? join("output/audio", projectId)

    // Verify video exists
    const videoExists = await stat(videoPath).catch(() => null)
    if (!videoExists) {
      // Fallback: try non-color-graded master
      const fallbackPath = join(
        "output/master",
        `final_master_${projectId}.mp4`,
      )
      const fallbackExists = await stat(fallbackPath).catch(() => null)
      if (!fallbackExists) {
        return {
          success: false,
          message: `No video found at ${videoPath} or ${fallbackPath}. Run MasterEditor/Colorist first.`,
        }
      }
      this.log(`Using non-color-graded master: ${fallbackPath}`)
      return this.performMix(
        fallbackPath,
        dialogueDir,
        bgmDir,
        outputDir,
        projectId,
        runId,
      )
    }

    return this.performMix(
      videoPath,
      dialogueDir,
      bgmDir,
      outputDir,
      projectId,
      runId,
    )
  }

  // ── Core mixing logic ─────────────────────────────────────────

  private async performMix(
    videoPath: string,
    dialogueDir: string,
    bgmDir: string,
    outputDir: string,
    projectId: string,
    runId: string,
  ): Promise<AgentOutput> {
    // Find audio files
    const dialogueFiles = await this.findAudioFiles(dialogueDir, ".wav")
    const bgmFiles = await this.findAudioFiles(bgmDir, ".mp3")

    this.log(
      `Found ${dialogueFiles.length} dialogue files, ${bgmFiles.length} BGM files`,
    )
    await this.updateProgress(runId, 20)

    const outputPath = join(outputDir, `final_${projectId}.mp4`)

    try {
      if (dialogueFiles.length === 0 && bgmFiles.length === 0) {
        // No audio to mix — just copy the video
        this.log("No additional audio found, copying video as final output")
        await this.copyVideo(videoPath, outputPath)
      } else {
        // Build ffmpeg command for multi-track mixing
        await this.mixAudioVideo(
          videoPath,
          dialogueFiles,
          bgmFiles,
          outputPath,
          runId,
        )
      }

      const fileStats = await stat(outputPath).catch(() => null)

      // Save final asset
      await this.saveAsset({
        projectId,
        type: "VIDEO",
        agentName: this.name,
        filePath: outputPath,
        fileName: outputPath.split("/").pop() ?? "final.mp4",
        mimeType: "video/mp4",
        fileSize: fileStats?.size,
        metadata: {
          dialogueTrackCount: dialogueFiles.length,
          bgmTrackCount: bgmFiles.length,
          videoSource: videoPath,
        },
      })

      await this.updateProgress(runId, 100)

      this.log(`Final mix complete: ${outputPath}`)

      return {
        success: true,
        message: `MixingEngineer produced final output with ${dialogueFiles.length} dialogue + ${bgmFiles.length} BGM tracks`,
        outputPath,
        data: {
          finalPath: outputPath,
          dialogueTrackCount: dialogueFiles.length,
          bgmTrackCount: bgmFiles.length,
        },
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      this.log(`Mixing error: ${errorMessage}`)
      return {
        success: false,
        message: `Final mix failed: ${errorMessage}`,
      }
    }
  }

  // ── ffmpeg operations ─────────────────────────────────────────

  private async mixAudioVideo(
    videoPath: string,
    dialogueFiles: string[],
    bgmFiles: string[],
    outputPath: string,
    runId: string,
  ): Promise<void> {
    // First, concatenate dialogue files into one track
    const mergedDialogue =
      dialogueFiles.length > 0
        ? await this.mergeAudioFiles(dialogueFiles, "dialogue", outputPath)
        : null

    // Concatenate BGM files into one track
    const mergedBgm =
      bgmFiles.length > 0
        ? await this.mergeAudioFiles(bgmFiles, "bgm", outputPath)
        : null

    await this.updateProgress(runId, 50)

    // Build ffmpeg command for final mix
    const cmd: string[] = ["ffmpeg", "-y", "-i", videoPath]
    const filterParts: string[] = []
    let inputIndex = 1

    if (mergedDialogue) {
      cmd.push("-i", mergedDialogue)
      filterParts.push(`[${inputIndex}:a]volume=${DIALOGUE_VOLUME}[da]`)
      inputIndex++
    }

    if (mergedBgm) {
      cmd.push("-i", mergedBgm)
      filterParts.push(`[${inputIndex}:a]volume=${BGM_VOLUME}[ba]`)
      inputIndex++
    }

    // Video audio (ambient)
    filterParts.push(`[0:a]volume=${VIDEO_AUDIO_VOLUME}[va]`)

    // Determine amix inputs
    const mixInputs: string[] = ["[va]"]
    if (mergedDialogue) mixInputs.push("[da]")
    if (mergedBgm) mixInputs.push("[ba]")

    const amixFilter = `${mixInputs.join("")}amix=inputs=${mixInputs.length}:duration=longest:normalize=0[out]`
    filterParts.push(amixFilter)

    const filterComplex = filterParts.join(";")

    cmd.push(
      "-filter_complex",
      filterComplex,
      "-map",
      "0:v",
      "-map",
      "[out]",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      outputPath,
    )

    this.log(`Running ffmpeg mix with ${mixInputs.length} audio inputs...`)

    const result = await Bun.spawn({
      cmd,
      env: {
        ...process.env,
        PATH: `/opt/homebrew/bin:${process.env["HOME"]}/.bun/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:${process.env["PATH"] ?? ""}`,
      },
      stdout: "ignore",
      stderr: "pipe",
    }).exited

    if (result !== 0) {
      throw new Error(`ffmpeg mix exited with code ${result}`)
    }
  }

  /** Merge multiple audio files into a single track using ffmpeg concat. */
  private async mergeAudioFiles(
    files: string[],
    label: string,
    outputBase: string,
  ): Promise<string> {
    if (files.length === 1) return files[0]!

    const dir = outputBase.substring(0, outputBase.lastIndexOf("/"))
    const mergedPath = join(dir, `_merged_${label}.wav`)

    // Build concat filter
    const inputs: string[] = []
    const filterInputs: string[] = []

    for (let i = 0; i < files.length; i++) {
      inputs.push("-i", files[i]!)
      filterInputs.push(`[${i}:a]`)
    }

    const filter = `${filterInputs.join("")}concat=n=${files.length}:v=0:a=1[out]`

    const cmd = [
      "ffmpeg",
      "-y",
      ...inputs,
      "-filter_complex",
      filter,
      "-map",
      "[out]",
      mergedPath,
    ]

    const result = await Bun.spawn({
      cmd,
      env: {
        ...process.env,
        PATH: `/opt/homebrew/bin:${process.env["HOME"]}/.bun/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:${process.env["PATH"] ?? ""}`,
      },
      stdout: "ignore",
      stderr: "pipe",
    }).exited

    if (result !== 0) {
      throw new Error(`ffmpeg ${label} merge exited with code ${result}`)
    }

    return mergedPath
  }

  /** Copy video without re-encoding when no audio mixing is needed. */
  private async copyVideo(
    inputPath: string,
    outputPath: string,
  ): Promise<void> {
    const result = await Bun.spawn({
      cmd: [
        "ffmpeg",
        "-y",
        "-i",
        inputPath,
        "-c",
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
      throw new Error(`ffmpeg copy exited with code ${result}`)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────

  private async findAudioFiles(
    dir: string,
    extension: string,
  ): Promise<string[]> {
    let entries: string[]
    try {
      entries = await readdir(dir)
    } catch {
      this.log(`Audio directory not found: ${dir}`)
      return []
    }

    return entries
      .filter((name) => name.endsWith(extension))
      .sort()
      .map((name) => join(dir, name))
  }
}
