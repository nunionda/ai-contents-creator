// ---------------------------------------------------------------------------
// CastingDirectorAgent — generates character visual reference sheets
// ---------------------------------------------------------------------------

import { mkdir, writeFile, stat } from "node:fs/promises"
import { join } from "node:path"
import type { DirectionPlan } from "@marionette/shared"
import { ProductionPhase } from "@marionette/shared"
import { BaseAgent } from "../base/agent.js"
import type { AgentInput, AgentOutput } from "../base/agent.js"
import { cropToAspect } from "./style-presets.js"

// ─── System prompt for character analysis ───

const CASTING_SYSTEM_PROMPT = `You are a Casting Director at Marionette Studio.
Your job: Analyze the character_settings and generate detailed visual descriptions for each main character.

For each character, produce:
1. **Name**: Character name
2. **Age/Gender**: Approximate age and gender
3. **Physical description**: Height, build, hair, skin, distinguishing features
4. **Wardrobe**: Signature outfit and style
5. **Expression/Pose**: Default emotional state and body language
6. **Reference actor**: Real actor who could play this role (for visual reference)
7. **image_prompt**: A detailed English prompt for generating a character reference sheet showing front view, 3/4 view, and full-body view on a neutral background. Include all physical details.

RULES:
- Output MUST be in English
- Output JSON array of character objects
- image_prompt should be 3-5 sentences, highly detailed for AI image generation
- Include "character reference sheet, multiple angles, front view, 3/4 view, full body" in every prompt
- Style: clean white/gray background, professional character design sheet
- Think Pixar character design sheets meets fashion lookbook`

// ─── Input extension ───

export interface CastingDirectorInput extends AgentInput {
  directionPlan: DirectionPlan
  outputDir?: string
}

// ─── Character entry from LLM ───

interface CharacterEntry {
  name: string
  age_gender: string
  physical_description: string
  wardrobe: string
  expression_pose: string
  reference_actor: string
  image_prompt: string
}

// ─── Agent ───

export class CastingDirectorAgent extends BaseAgent {
  readonly name = "CastingDirector"
  readonly phase = ProductionPhase.PRE
  readonly description =
    "Generates character visual reference sheets (front/3-4/full-body) for each main character"

  async execute(input: CastingDirectorInput): Promise<AgentOutput> {
    const { directionPlan, projectId, runId } = input
    const outputDir = input.outputDir ?? join("output", "characters", projectId)

    this.log(
      `Starting character reference sheet generation for "${directionPlan.title}"`,
    )
    await this.updateProgress(runId, 5)

    await mkdir(outputDir, { recursive: true })

    try {
      // Step 1: Analyze characters via Gemini
      const characters = await this.analyzeCharacters(directionPlan)
      this.log(`Identified ${characters.length} characters for reference sheets`)
      await this.updateProgress(runId, 20)

      // Step 2: Generate reference sheet image for each character
      const generatedFiles: string[] = []

      for (let i = 0; i < characters.length; i++) {
        const character = characters[i]!
        this.log(`Generating reference sheet for "${character.name}"`)

        const filePath = await this.generateReferenceSheet(
          character,
          outputDir,
          projectId,
          i,
        )

        if (filePath) {
          generatedFiles.push(filePath)

          await this.saveAsset({
            projectId,
            type: "IMAGE",
            agentName: this.name,
            filePath,
            fileName: filePath.split("/").pop() ?? `character_${i}.png`,
            mimeType: "image/png",
            metadata: {
              characterName: character.name,
              ageGender: character.age_gender,
              referenceActor: character.reference_actor,
            },
          })
        }

        const progress = Math.round(20 + (70 * ((i + 1) / characters.length)))
        await this.updateProgress(runId, Math.min(progress, 95))
      }

      await this.updateProgress(runId, 100)

      this.log(
        `Character reference sheets complete (${generatedFiles.length}/${characters.length})`,
      )

      return {
        success: generatedFiles.length > 0,
        message: `CastingDirector generated ${generatedFiles.length} character reference sheets`,
        outputPath: outputDir,
        data: {
          generatedFiles,
          characterCount: generatedFiles.length,
          characters: characters.map((c) => ({
            name: c.name,
            referenceActor: c.reference_actor,
          })),
        },
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      this.log(`Error generating character sheets: ${errorMessage}`)
      return {
        success: false,
        message: `Failed to generate character reference sheets: ${errorMessage}`,
      }
    }
  }

  // ── Internal methods ──────────────────────────────────────────

  private async analyzeCharacters(
    plan: DirectionPlan,
  ): Promise<CharacterEntry[]> {
    const userPrompt = `Analyze the characters in this project and generate visual reference descriptions.

Title: ${plan.title}
Genre: ${plan.genre}
Character Settings: ${plan.character_settings}
Worldview: ${plan.worldview_settings}

Extract the main characters (up to 8) and create detailed visual descriptions for reference sheet generation.`

    const response = await this.gateway.text(userPrompt, {
      provider: "gemini",
      systemPrompt: CASTING_SYSTEM_PROMPT,
      temperature: 0.5,
    })

    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim()
    return JSON.parse(cleaned) as CharacterEntry[]
  }

  private async generateReferenceSheet(
    character: CharacterEntry,
    outputDir: string,
    projectId: string,
    index: number,
  ): Promise<string | null> {
    try {
      const prompt =
        `Professional character reference sheet. Clean white background. ` +
        `Three views: front view, 3/4 angle view, and full-body view side by side. ` +
        `${character.image_prompt}`

      const imageBuffer = await this.gateway.image(prompt, {
        provider: "gemini",
        style: "concept_art",
        aspectRatio: "16:9",
      })

      // Crop to 16:9 for reference sheet layout
      const croppedBuffer = await cropToAspect(imageBuffer, 16 / 9)

      const safeName = character.name
        .replace(/[^a-zA-Z0-9가-힣]/g, "_")
        .toLowerCase()
      const filename = `char_${String(index + 1).padStart(2, "0")}_${safeName}.png`
      const filePath = join(outputDir, filename)

      await writeFile(filePath, croppedBuffer)

      const fileInfo = await stat(filePath)
      this.log(
        `${character.name}: ${filePath} (${(fileInfo.size / 1024).toFixed(1)}KB)`,
      )

      return filePath
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      this.log(
        `Reference sheet generation failed for "${character.name}": ${errorMessage}`,
      )
      return null
    }
  }
}
