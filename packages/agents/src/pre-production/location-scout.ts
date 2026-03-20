// ---------------------------------------------------------------------------
// LocationScoutAgent — generates environment concept art for each unique location
// ---------------------------------------------------------------------------

import { mkdir, writeFile, stat } from "node:fs/promises"
import { join } from "node:path"
import type { DirectionPlan, Scene } from "@marionette/shared"
import { ProductionPhase } from "@marionette/shared"
import { BaseAgent } from "../base/agent.js"
import type { AgentInput, AgentOutput } from "../base/agent.js"
import { cropToAspect } from "./style-presets.js"

// ─── Input extension ───

export interface LocationScoutInput extends AgentInput {
  directionPlan: DirectionPlan
  style?: string
  outputDir?: string
}

// ─── Unique location extracted from scenes ───

interface Location {
  setting: string
  timeOfDay: string
  sceneNumbers: number[]
}

// ─── Agent ───

export class LocationScoutAgent extends BaseAgent {
  readonly name = "LocationScout"
  readonly phase = ProductionPhase.PRE
  readonly description =
    "Generates environment concept art for each unique location (no characters, background only)"

  async execute(input: LocationScoutInput): Promise<AgentOutput> {
    const { directionPlan, projectId, runId } = input
    const outputDir =
      input.outputDir ?? join("output", "locations", projectId)

    this.log(
      `Starting location scouting for "${directionPlan.title}" (${directionPlan.scenes.length} scenes)`,
    )
    await this.updateProgress(runId, 5)

    await mkdir(outputDir, { recursive: true })

    // Extract unique locations from scenes
    const locations = this.extractUniqueLocations(directionPlan.scenes)
    this.log(`Found ${locations.length} unique locations`)
    await this.updateProgress(runId, 10)

    const generatedFiles: string[] = []

    for (let i = 0; i < locations.length; i++) {
      const location = locations[i]!
      this.log(
        `Generating concept art for "${location.setting}" (${location.timeOfDay})`,
      )

      const filePath = await this.generateLocationArt(
        location,
        directionPlan,
        outputDir,
        i,
        projectId,
      )

      if (filePath) {
        generatedFiles.push(filePath)

        await this.saveAsset({
          projectId,
          type: "IMAGE",
          agentName: this.name,
          filePath,
          fileName: filePath.split("/").pop() ?? `location_${i}.png`,
          mimeType: "image/png",
          sceneNumber: location.sceneNumbers[0],
          metadata: {
            setting: location.setting,
            timeOfDay: location.timeOfDay,
            sceneNumbers: location.sceneNumbers,
          },
        })
      }

      const progress = Math.round(10 + (85 * ((i + 1) / locations.length)))
      await this.updateProgress(runId, Math.min(progress, 95))
    }

    await this.updateProgress(runId, 100)

    this.log(
      `Location scouting complete (${generatedFiles.length}/${locations.length} locations)`,
    )

    return {
      success: generatedFiles.length > 0,
      message: `LocationScout generated ${generatedFiles.length} environment concept art images`,
      outputPath: outputDir,
      data: {
        generatedFiles,
        locationCount: generatedFiles.length,
        locations: locations.map((l) => ({
          setting: l.setting,
          timeOfDay: l.timeOfDay,
          sceneCount: l.sceneNumbers.length,
        })),
      },
    }
  }

  // ── Internal methods ──────────────────────────────────────────

  /** Group scenes by unique setting + time_of_day combinations. */
  private extractUniqueLocations(scenes: Scene[]): Location[] {
    const locationMap = new Map<string, Location>()

    for (const scene of scenes) {
      const key = `${scene.setting}|${scene.time_of_day}`

      if (locationMap.has(key)) {
        locationMap.get(key)!.sceneNumbers.push(scene.scene_number)
      } else {
        locationMap.set(key, {
          setting: scene.setting,
          timeOfDay: scene.time_of_day,
          sceneNumbers: [scene.scene_number],
        })
      }
    }

    return Array.from(locationMap.values())
  }

  private async generateLocationArt(
    location: Location,
    plan: DirectionPlan,
    outputDir: string,
    index: number,
    _projectId: string,
  ): Promise<string | null> {
    try {
      const prompt =
        `Professional film concept art. Environment only, NO characters, NO people. ` +
        `Cinematic ultra-wide 2.35:1 anamorphic composition. ` +
        `Atmospheric perspective, detailed environment design. ` +
        `Location: ${location.setting}. Time: ${location.timeOfDay}. ` +
        `Genre: ${plan.genre}. World: ${plan.worldview_settings}. ` +
        `Painterly digital matte painting style with cinematic teal and orange color grading. ` +
        `Empty scene — focus on architecture, lighting, atmosphere, and mood.`

      const imageBuffer = await this.gateway.image(prompt, {
        provider: "gemini",
        style: "concept_art",
        aspectRatio: "2.35:1",
      })

      // Crop to 2.35:1 cinematic aspect
      const croppedBuffer = await cropToAspect(imageBuffer, 2.35)

      const safeSetting = location.setting
        .replace(/[^a-zA-Z0-9가-힣]/g, "_")
        .toLowerCase()
        .slice(0, 30)
      const filename = `loc_${String(index + 1).padStart(2, "0")}_${safeSetting}.png`
      const filePath = join(outputDir, filename)

      await writeFile(filePath, croppedBuffer)

      const fileInfo = await stat(filePath)
      this.log(
        `${location.setting}: ${filePath} (${(fileInfo.size / 1024).toFixed(1)}KB)`,
      )

      return filePath
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      this.log(
        `Location art generation failed for "${location.setting}": ${errorMessage}`,
      )
      return null
    }
  }
}
