// ---------------------------------------------------------------------------
// PrevisualizerAgent — generates low-res previz videos from storyboard images
// Uses Veo 3.0 image-to-video for camera blocking simulation
// ---------------------------------------------------------------------------

import { mkdir, writeFile, stat } from "node:fs/promises"
import { join } from "node:path"
import type { DirectionPlan, Scene } from "@marionette/shared"
import { ProductionPhase } from "@marionette/shared"
import { BaseAgent } from "../base/agent.js"
import type { AgentInput, AgentOutput } from "../base/agent.js"

// ─── Input extension ───

export interface PrevisualizerInput extends AgentInput {
  directionPlan: DirectionPlan
  storyboardDir?: string // directory containing storyboard PNGs
  outputDir?: string
}

// ─── Agent ───

export class PrevisualizerAgent extends BaseAgent {
  readonly name = "Previsualizer"
  readonly phase = ProductionPhase.PRE
  readonly description =
    "Generates low-resolution previz videos from storyboard images with camera movement simulation"

  async execute(input: PrevisualizerInput): Promise<AgentOutput> {
    const { directionPlan, projectId, runId } = input
    const storyboardDir = input.storyboardDir ?? "output/storyboards"
    const outputDir =
      input.outputDir ?? join("output", "previz", projectId)

    this.log(
      `Starting previz generation for "${directionPlan.title}" (${directionPlan.scenes.length} scenes)`,
    )
    await this.updateProgress(runId, 5)

    await mkdir(outputDir, { recursive: true })

    const generatedVideos: string[] = []

    for (let i = 0; i < directionPlan.scenes.length; i++) {
      const scene = directionPlan.scenes[i]!

      this.log(
        `Scene #${scene.scene_number} — generating previz (${scene.camera_angle})`,
      )

      const filePath = await this.generatePreviz(
        scene,
        storyboardDir,
        outputDir,
        projectId,
      )

      if (filePath) {
        generatedVideos.push(filePath)

        await this.saveAsset({
          projectId,
          type: "VIDEO",
          agentName: this.name,
          filePath,
          fileName:
            filePath.split("/").pop() ??
            `previz_scene_${scene.scene_number}.mp4`,
          mimeType: "video/mp4",
          sceneNumber: scene.scene_number,
          metadata: {
            cameraAngle: scene.camera_angle,
            setting: scene.setting,
            timeOfDay: scene.time_of_day,
          },
        })
      }

      const progress = Math.round(5 + (90 * ((i + 1) / directionPlan.scenes.length)))
      await this.updateProgress(runId, Math.min(progress, 95))
    }

    await this.updateProgress(runId, 100)

    this.log(
      `Previz generation complete (${generatedVideos.length}/${directionPlan.scenes.length} scenes)`,
    )

    return {
      success: generatedVideos.length > 0,
      message: `Previsualizer generated ${generatedVideos.length} previz clips for "${directionPlan.title}"`,
      outputPath: outputDir,
      data: {
        generatedVideos,
        clipCount: generatedVideos.length,
        totalScenes: directionPlan.scenes.length,
      },
    }
  }

  // ── Internal methods ──────────────────────────────────────────

  private async generatePreviz(
    scene: Scene,
    _storyboardDir: string,
    outputDir: string,
    _projectId: string,
  ): Promise<string | null> {
    try {
      // Build a camera-movement-focused video prompt from the scene data
      const cameraMovement = this.inferCameraMovement(scene)

      const videoPrompt =
        `Low-resolution previz camera test. ${cameraMovement}. ` +
        `Scene: ${scene.setting}, ${scene.time_of_day}. ` +
        `Camera angle: ${scene.camera_angle}. ` +
        `${scene.action_description}. ` +
        `Rough previz quality — focus on camera movement and blocking, not visual fidelity.`

      const result = await this.gateway.video(videoPrompt, {
        provider: "gemini",
        duration: 5,
        aspectRatio: "16:9",
      })

      const filename = `previz_scene_${String(scene.scene_number).padStart(3, "0")}.mp4`
      const filePath = join(outputDir, filename)

      await writeFile(filePath, result.videoBuffer)

      const fileInfo = await stat(filePath)
      this.log(
        `Scene #${scene.scene_number}: ${filePath} (${(fileInfo.size / 1024).toFixed(1)}KB, ${result.duration}s)`,
      )

      return filePath
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      this.log(
        `Previz generation failed for scene #${scene.scene_number}: ${errorMessage}`,
      )
      return null
    }
  }

  /** Infer camera movement description from scene camera_angle field. */
  private inferCameraMovement(scene: Scene): string {
    const angle = scene.camera_angle.toLowerCase()

    if (angle.includes("tracking") || angle.includes("dolly")) {
      return "Slow dolly forward tracking the subject, smooth steadicam movement"
    }
    if (angle.includes("crane") || angle.includes("aerial")) {
      return "Crane shot rising upward revealing the full environment"
    }
    if (angle.includes("pan")) {
      return "Slow horizontal pan across the scene, revealing the environment"
    }
    if (angle.includes("tilt")) {
      return "Vertical tilt from ground level upward to reveal the setting"
    }
    if (angle.includes("close") || angle.includes("cu")) {
      return "Subtle push-in from medium to close-up on the subject"
    }
    if (angle.includes("wide") || angle.includes("establishing")) {
      return "Static wide establishing shot with subtle camera drift"
    }
    if (angle.includes("over") || angle.includes("ots")) {
      return "Over-the-shoulder shot with slight rack focus"
    }

    // Default: gentle drift
    return "Gentle camera drift with subtle parallax movement"
  }
}
