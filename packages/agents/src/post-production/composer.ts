// ---------------------------------------------------------------------------
// ComposerAgent — generates BGM/score for each scene using Suno API
// ---------------------------------------------------------------------------

import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { DirectionPlan, Scene } from "@marionette/shared"
import { ProductionPhase } from "@marionette/shared"
import { BaseAgent } from "../base/agent.js"
import type { AgentInput, AgentOutput } from "../base/agent.js"

// ─── System prompt for music prompt generation ───

const COMPOSER_SYSTEM_PROMPT = `You are a world-class Film Composer at Marionette Studio.
Your job: Analyze each scene's mood, setting, and action, then create a precise music generation prompt.

For each scene (or scene group), generate a music prompt that includes:
1. **Genre/Style**: specific music genre (orchestral, electronic, ambient, jazz, etc.)
2. **Mood**: emotional tone (tense, melancholic, triumphant, eerie, etc.)
3. **Instruments**: key instruments (strings, synth pads, piano, percussion, etc.)
4. **Tempo**: BPM range (slow 60-80, moderate 80-120, fast 120-160)
5. **Dynamics**: volume/intensity arc (build-up, sustained, fade-out)

RULES:
- Output MUST be in English
- Consider the global_audio_concept for overall tone consistency
- Group consecutive scenes with similar moods into one BGM track
- Each prompt should be 2-3 sentences, vivid and descriptive
- Think Hans Zimmer meets Ryuichi Sakamoto meets Trent Reznor
- Output JSON array: [{ "group_label": "string", "scene_numbers": [1,2,3], "music_prompt": "string", "genre": "string", "duration_seconds": number }]`

// ─── Input extension ───

export interface ComposerInput extends AgentInput {
  directionPlan: DirectionPlan
  outputDir?: string
}

// ─── Music prompt entry ───

interface MusicPromptEntry {
  group_label: string
  scene_numbers: number[]
  music_prompt: string
  genre: string
  duration_seconds: number
}

// ─── Agent ───

export class ComposerAgent extends BaseAgent {
  readonly name = "Composer"
  readonly phase = ProductionPhase.POST
  readonly description =
    "Generates BGM/score tracks for scene groups using AI music generation (Suno)"

  async execute(input: ComposerInput): Promise<AgentOutput> {
    const { directionPlan, projectId, runId } = input
    const outputDir = input.outputDir ?? join("output", "audio", projectId)

    this.log(
      `Starting BGM composition for "${directionPlan.title}" (${directionPlan.scenes.length} scenes)`,
    )
    await this.updateProgress(runId, 5)

    mkdirSync(outputDir, { recursive: true })

    try {
      // Step 1: Generate music prompts via Gemini (scene analysis)
      const musicPrompts = await this.generateMusicPrompts(directionPlan)
      this.log(`Generated ${musicPrompts.length} music prompt groups`)
      await this.updateProgress(runId, 20)

      // Step 2: Generate BGM tracks via Suno for each group
      const generatedFiles: string[] = []

      for (let i = 0; i < musicPrompts.length; i++) {
        const group = musicPrompts[i]!
        this.log(
          `Generating BGM for "${group.group_label}" (scenes ${group.scene_numbers.join(",")})`,
        )

        const filePath = await this.generateBGM(
          group,
          outputDir,
          projectId,
          i,
        )

        if (filePath) {
          generatedFiles.push(filePath)

          // Save asset to DB for each scene in the group
          await this.saveAsset({
            projectId,
            type: "AUDIO",
            agentName: this.name,
            filePath,
            fileName: filePath.split("/").pop() ?? `bgm_group_${i}.mp3`,
            mimeType: "audio/mpeg",
            sceneNumber: group.scene_numbers[0],
            metadata: {
              groupLabel: group.group_label,
              sceneNumbers: group.scene_numbers,
              genre: group.genre,
              durationSeconds: group.duration_seconds,
              musicPrompt: group.music_prompt,
            },
          })
        }

        const progress = Math.round(20 + (70 * ((i + 1) / musicPrompts.length)))
        await this.updateProgress(runId, Math.min(progress, 95))
      }

      await this.updateProgress(runId, 100)

      this.log(
        `BGM composition complete (${generatedFiles.length} tracks from ${musicPrompts.length} groups)`,
      )

      return {
        success: true,
        message: `Composer generated ${generatedFiles.length} BGM tracks for "${directionPlan.title}"`,
        outputPath: outputDir,
        data: {
          generatedFiles,
          trackCount: generatedFiles.length,
          totalGroups: musicPrompts.length,
          musicPrompts,
        },
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      this.log(`Error during BGM composition: ${errorMessage}`)
      return {
        success: false,
        message: `Failed to compose BGM: ${errorMessage}`,
      }
    }
  }

  // ── Internal methods ──────────────────────────────────────────

  /** Use Gemini to analyze scenes and create music prompts grouped by mood. */
  private async generateMusicPrompts(
    plan: DirectionPlan,
  ): Promise<MusicPromptEntry[]> {
    const scenesText = plan.scenes
      .map(
        (s: Scene) =>
          `--- Scene ${s.scene_number} ---\nSetting: ${s.setting}\nTime: ${s.time_of_day}\nAction: ${s.action_description}\nDialogue: ${s.dialogue ?? "none"}`,
      )
      .join("\n\n")

    const userPrompt = `Analyze the scenes below and create music prompts grouped by similar mood/atmosphere.
Each group should cover 2-5 consecutive scenes. Aim for 3-8 total groups depending on scene count.

Title: ${plan.title}
Genre: ${plan.genre}
Global Audio Concept: ${plan.global_audio_concept}

${scenesText}`

    const response = await this.gateway.text(userPrompt, {
      provider: "gemini",
      systemPrompt: COMPOSER_SYSTEM_PROMPT,
      temperature: 0.6,
    })

    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim()
    const parsed = JSON.parse(cleaned) as MusicPromptEntry[]

    return parsed
  }

  /** Generate a single BGM track via Suno API. */
  private async generateBGM(
    group: MusicPromptEntry,
    outputDir: string,
    projectId: string,
    groupIndex: number,
  ): Promise<string | null> {
    try {
      const audioBuffer = await this.gateway.audio(group.music_prompt, {
        provider: "suno",
        genre: group.genre,
        duration: group.duration_seconds,
        style: `Film score for ${group.group_label}`,
      })

      const filename = `bgm_${String(groupIndex + 1).padStart(2, "0")}_${group.group_label.replace(/\s+/g, "_").toLowerCase()}.mp3`
      const filePath = join(outputDir, filename)

      writeFileSync(filePath, audioBuffer)

      this.log(
        `BGM saved: ${filePath} (${Math.round(audioBuffer.length / 1024)}KB)`,
      )

      return filePath
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      this.log(
        `BGM generation error for "${group.group_label}": ${errorMessage}`,
      )
      return null
    }
  }
}
