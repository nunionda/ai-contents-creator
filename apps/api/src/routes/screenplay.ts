import { Hono } from "hono"
import { prisma } from "@marionette/db"
import { AIGateway } from "@marionette/ai-gateway"
import { GeminiProvider } from "@marionette/ai-gateway/providers/gemini.js"
import { ReplicateProvider } from "@marionette/ai-gateway/providers/replicate.js"
import { EdgeTTSProvider } from "@marionette/ai-gateway/providers/edge-tts.js"
import { NotFoundError, ValidationError, AppError } from "../middleware/error-handler.ts"
import { createSnapshot } from "./snapshots.ts"
import { mkdir, writeFile, stat } from "node:fs/promises"
import { join } from "node:path"
import {
  STYLE_PRESETS,
  ASPECT_RATIOS,
  makeStoryboardFileName,
  buildEnhancedPrompt,
  cropToAspect,
} from "@marionette/agents/pre-production/style-presets.js"

export const screenplayRoutes = new Hono()

// ─── Singleton AI gateway ───

let gateway: AIGateway | null = null

function getGateway(): AIGateway {
  if (!gateway) {
    gateway = new AIGateway()
    gateway.register("gemini", new GeminiProvider(), true)
    // Free fallback providers
    if (process.env["REPLICATE_API_TOKEN"]) {
      gateway.register("replicate", new ReplicateProvider())
    }
    gateway.register("edge", new EdgeTTSProvider())
  }
  return gateway
}

// ─── System prompts ───

const OUTLINE_SYSTEM_PROMPT = `You are a senior screenwriter creating an 8-sequence film structure.
Given the idea, create a comprehensive outline with:
- Title and logline (use Antigravity High-Concept Formula: ironic setup + tactical detail + universal emotion)
- Genre and tone
- 8 sequences with: sequence name, scene range, key events, turning point
- Core thematic elements
Write in Korean. Format as markdown.`

const CHARACTER_SYSTEM_PROMPT = `You are a character designer for a professional film production.
Based on the outline, create 6-9 main characters. For each:
- name, age, role, cover (public identity)
- persona, motivation, tone (speech style)
- economic_bg, speech_habit
- casting: { actor: "suggestion", reason: "why" }
Return as JSON array.`

const TREATMENT_SYSTEM_PROMPT = `You are a screenplay treatment writer. Based on the outline and characters,
generate scene-by-scene logs for all 8 sequences (~120 scenes total).
Format: S#N. Location - Time: One-line summary of key visual action.
Organize by sequence. Write in Korean.`

const DRAFT_SYSTEM_PROMPT = `You are a professional screenwriter writing in Hollywood Master Scene Format.

CRITICAL: Scene numbers in the screenplay MUST be sequential starting from S#1.
The scene logs from treatment are reference material only — do NOT use their numbering.
Renumber all scenes sequentially: S#1, S#2, S#3, etc.

Format each scene as:
### S#N. LOCATION - TIME
(Camera direction and action in parentheses)
CHARACTER NAME
Dialogue in Korean matching character's tone.

Write exactly 5 scenes per batch. Each scene should be detailed with:
- Clear slug line (location + time)
- Visual action descriptions in parentheses
- Character names in CAPS
- Natural Korean dialogue matching each character's speech style`

// ─── Helper: get or create screenplay record ───

async function getOrCreateScreenplay(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) {
    throw new NotFoundError("Project", projectId)
  }

  const existing = await prisma.screenplay.findUnique({ where: { projectId } })
  if (existing) {
    return existing
  }

  return prisma.screenplay.create({
    data: { projectId },
  })
}

// ─── Routes ───

// GET /:projectId — get or create screenplay record
screenplayRoutes.get("/:projectId", async (c) => {
  const projectId = c.req.param("projectId")
  try {
    const screenplay = await getOrCreateScreenplay(projectId)
    return c.json(screenplay)
  } catch (err) {
    if (err instanceof AppError) throw err
    const message = err instanceof Error ? err.message : "Failed to fetch screenplay"
    throw new AppError(message, 500, "INTERNAL_SERVER_ERROR")
  }
})

// POST /:projectId/outline — AI generates 8-sequence outline + logline
screenplayRoutes.post("/:projectId/outline", async (c) => {
  const projectId = c.req.param("projectId")

  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) {
      throw new AppError(`Project '${projectId}' not found`, 404, "NOT_FOUND")
    }

    const idea = project.idea || project.title
    if (!idea) {
      throw new ValidationError("Project must have an idea or title to generate an outline")
    }

    const gw = getGateway()
    const outline = await gw.text(
      `Create a full 8-sequence film outline for this idea:\n\n${idea}`,
      {
        provider: "gemini",
        systemPrompt: OUTLINE_SYSTEM_PROMPT,
        temperature: 0.7,
      },
    )

    if (!outline || outline.trim().length === 0) {
      throw new AppError("AI returned empty outline. Please try again.", 502, "BAD_GATEWAY")
    }

    const screenplay = await getOrCreateScreenplay(projectId)
    if (screenplay.outline) {
      await createSnapshot(projectId, "SCREENPLAY_OUTLINE", screenplay.outline)
    }
    const updated = await prisma.screenplay.update({
      where: { id: screenplay.id },
      data: { outline, currentStep: Math.max(screenplay.currentStep, 1) },
    })

    return c.json(updated)
  } catch (err) {
    if (err instanceof AppError) throw err
    const message = err instanceof Error ? err.message : "Unknown error"
    throw new AppError(`Outline generation failed: ${message}`, 500, "AI_ERROR")
  }
})

// PUT /:projectId/outline — save edited outline
screenplayRoutes.put("/:projectId/outline", async (c) => {
  const projectId = c.req.param("projectId")
  try {
    const body = await c.req.json<{ outline: string }>()

    if (!body.outline || typeof body.outline !== "string") {
      throw new ValidationError("outline is required and must be a string")
    }

    const screenplay = await getOrCreateScreenplay(projectId)
    const updated = await prisma.screenplay.update({
      where: { id: screenplay.id },
      data: { outline: body.outline },
    })

    return c.json(updated)
  } catch (err) {
    if (err instanceof AppError) throw err
    const message = err instanceof Error ? err.message : "Unknown error"
    throw new AppError(`Save failed: ${message}`, 500, "INTERNAL_SERVER_ERROR")
  }
})

// POST /:projectId/characters — AI generates characters from outline
screenplayRoutes.post("/:projectId/characters", async (c) => {
  const projectId = c.req.param("projectId")

  try {
    const screenplay = await getOrCreateScreenplay(projectId)
    if (!screenplay.outline) {
      throw new ValidationError("Outline must exist before generating characters")
    }

    const gw = getGateway()
    const charactersRaw = await gw.text(
      `Based on this outline, create the main characters:\n\n${screenplay.outline}`,
      {
        provider: "gemini",
        systemPrompt: CHARACTER_SYSTEM_PROMPT,
        temperature: 0.7,
      },
    )

    if (!charactersRaw || charactersRaw.trim().length === 0) {
      throw new AppError("AI returned empty character data. Please try again.", 502, "BAD_GATEWAY")
    }

    // Attempt to parse as JSON; store raw string if parsing fails
    let characters: unknown
    try {
      const jsonMatch = charactersRaw.match(/\[[\s\S]*\]/)
      characters = jsonMatch ? JSON.parse(jsonMatch[0]) : charactersRaw
    } catch {
      characters = charactersRaw
    }

    const updated = await prisma.screenplay.update({
      where: { id: screenplay.id },
      data: {
        characters: characters as Record<string, unknown> | Record<string, unknown>[],
        currentStep: Math.max(screenplay.currentStep, 2),
      },
    })

    return c.json(updated)
  } catch (err) {
    if (err instanceof AppError) throw err
    const message = err instanceof Error ? err.message : "Unknown error"
    throw new AppError(`Character generation failed: ${message}`, 500, "AI_ERROR")
  }
})

// PUT /:projectId/characters — save edited characters
screenplayRoutes.put("/:projectId/characters", async (c) => {
  const projectId = c.req.param("projectId")
  try {
    const body = await c.req.json<{ characters: unknown }>()

    if (!body.characters) {
      throw new ValidationError("characters is required")
    }

    const screenplay = await getOrCreateScreenplay(projectId)
    const updated = await prisma.screenplay.update({
      where: { id: screenplay.id },
      data: { characters: body.characters as Record<string, unknown> | Record<string, unknown>[] },
    })

    return c.json(updated)
  } catch (err) {
    if (err instanceof AppError) throw err
    const message = err instanceof Error ? err.message : "Unknown error"
    throw new AppError(`Save failed: ${message}`, 500, "INTERNAL_SERVER_ERROR")
  }
})

// POST /:projectId/treatment/:sequence — AI generates scene logs for one sequence
screenplayRoutes.post("/:projectId/treatment/:sequence", async (c) => {
  const projectId = c.req.param("projectId")
  const sequence = parseInt(c.req.param("sequence"))

  if (isNaN(sequence) || sequence < 1 || sequence > 8) {
    throw new ValidationError("sequence must be a number between 1 and 8")
  }

  try {
    const screenplay = await getOrCreateScreenplay(projectId)
    if (!screenplay.outline) {
      throw new ValidationError("Outline must exist before generating treatment")
    }
    if (!screenplay.characters) {
      throw new ValidationError("Characters must exist before generating treatment")
    }

    const charactersText = typeof screenplay.characters === "string"
      ? screenplay.characters
      : JSON.stringify(screenplay.characters, null, 2)

    const gw = getGateway()
    const response = await gw.text(
      `Generate scene-by-scene logs for SEQUENCE ${sequence} ONLY based on:

## Outline
${screenplay.outline}

## Characters
${charactersText}

Generate ~15 scenes for Sequence ${sequence} only. Number scenes sequentially starting from ${(sequence - 1) * 15 + 1}.`,
      {
        provider: "gemini",
        systemPrompt: `You are a screenplay treatment writer. Generate scene-by-scene logs for ONE sequence only (~15 scenes).

Return a JSON array where each element has:
- scene_number: integer (sequential)
- sequence: ${sequence}
- sequence_title: string (name of this sequence from the outline)
- location: string (scene location in Korean)
- time_of_day: string (낮/밤/새벽/저녁/심야)
- summary: string (one-line visual action summary in Korean)
- breakdown: { cast: string[], props: string[], location: string[] }

Return ONLY the JSON array. No markdown wrapping.`,
        temperature: 0.5,
      },
    )

    if (!response || response.trim().length === 0) {
      throw new AppError("AI returned empty scene logs. Please try again.", 502, "BAD_GATEWAY")
    }

    // Parse JSON array from response
    let newScenes: Record<string, unknown>[]
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new AppError("AI response was not a valid JSON array", 502, "BAD_GATEWAY")
      }
      newScenes = JSON.parse(jsonMatch[0]) as Record<string, unknown>[]
    } catch (e) {
      if (e instanceof AppError) throw e
      throw new AppError("Failed to parse AI response as JSON", 502, "BAD_GATEWAY")
    }

    // Merge with existing scene logs: replace scenes from this sequence, keep others
    let existingScenes: Record<string, unknown>[] = []
    if (screenplay.sceneLogs) {
      try {
        existingScenes = JSON.parse(screenplay.sceneLogs) as Record<string, unknown>[]
      } catch {
        existingScenes = []
      }
    }

    const otherScenes = existingScenes.filter(
      (s) => (s as { sequence?: number }).sequence !== sequence
    )
    const mergedScenes = [...otherScenes, ...newScenes].sort(
      (a, b) => ((a as { scene_number?: number }).scene_number ?? 0) - ((b as { scene_number?: number }).scene_number ?? 0)
    )

    const updated = await prisma.screenplay.update({
      where: { id: screenplay.id },
      data: {
        sceneLogs: JSON.stringify(mergedScenes),
        currentStep: Math.max(screenplay.currentStep, 3),
      },
    })

    return c.json(updated)
  } catch (err) {
    if (err instanceof AppError) throw err
    const message = err instanceof Error ? err.message : "Unknown error"
    throw new AppError(`Treatment generation failed: ${message}`, 500, "AI_ERROR")
  }
})

// PUT /:projectId/treatment-text — save edited scene logs as text
screenplayRoutes.put("/:projectId/treatment-text", async (c) => {
  const projectId = c.req.param("projectId")
  try {
    const body = await c.req.json<{ sceneLogs: string }>()
    if (!body.sceneLogs || typeof body.sceneLogs !== "string") {
      throw new ValidationError("sceneLogs is required and must be a string")
    }

    const screenplay = await getOrCreateScreenplay(projectId)
    const updated = await prisma.screenplay.update({
      where: { id: screenplay.id },
      data: { sceneLogs: body.sceneLogs },
    })

    return c.json(updated)
  } catch (err) {
    if (err instanceof AppError) throw err
    const message = err instanceof Error ? err.message : "Unknown error"
    throw new AppError(`Save failed: ${message}`, 500, "INTERNAL_SERVER_ERROR")
  }
})

// POST /:projectId/draft — AI writes 5 scenes of screenplay
screenplayRoutes.post("/:projectId/draft", async (c) => {
  const projectId = c.req.param("projectId")

  try {
    const screenplay = await getOrCreateScreenplay(projectId)
    if (!screenplay.outline) {
      throw new ValidationError("Outline must exist before generating draft")
    }
    if (!screenplay.characters) {
      throw new ValidationError("Characters must exist before generating draft")
    }
    if (!screenplay.sceneLogs) {
      throw new ValidationError("Scene logs must exist before generating draft")
    }

    const charactersText = typeof screenplay.characters === "string"
      ? screenplay.characters
      : JSON.stringify(screenplay.characters, null, 2)

    const existingDraft = screenplay.draft ?? ""
    const draftVersion = screenplay.draftVersion

    const gw = getGateway()
    const newScenes = await gw.text(
      `Write scenes S#${(draftVersion - 1) * 5 + 1} through S#${draftVersion * 5} of the screenplay.

IMPORTANT: Scene numbers MUST be S#${(draftVersion - 1) * 5 + 1}, S#${(draftVersion - 1) * 5 + 2}, S#${(draftVersion - 1) * 5 + 3}, S#${(draftVersion - 1) * 5 + 4}, S#${draftVersion * 5}.

## Outline
${screenplay.outline}

## Characters
${charactersText}

## Scene Logs (reference only — do NOT use these scene numbers)
${screenplay.sceneLogs}

## Previously Written Draft
${existingDraft || "(No scenes written yet — start from S#1)"}`,
      {
        provider: "gemini",
        systemPrompt: DRAFT_SYSTEM_PROMPT,
        temperature: 0.7,
      },
    )

    if (!newScenes || newScenes.trim().length === 0) {
      throw new AppError("AI returned empty draft scenes. Please try again.", 502, "BAD_GATEWAY")
    }

    const combinedDraft = existingDraft
      ? `${existingDraft}\n\n${newScenes}`
      : newScenes

    const updated = await prisma.screenplay.update({
      where: { id: screenplay.id },
      data: {
        draft: combinedDraft,
        draftVersion: draftVersion + 1,
        currentStep: Math.max(screenplay.currentStep, 4),
      },
    })

    return c.json(updated)
  } catch (err) {
    if (err instanceof AppError) throw err
    const message = err instanceof Error ? err.message : "Unknown error"
    throw new AppError(`Draft generation failed: ${message}`, 500, "AI_ERROR")
  }
})

// POST /:projectId/apply-feedback — AI revises draft based on feedback
screenplayRoutes.post("/:projectId/apply-feedback", async (c) => {
  const projectId = c.req.param("projectId")

  try {
    const body = await c.req.json<{ feedback: string }>()
    if (!body.feedback?.trim()) {
      throw new ValidationError("feedback is required")
    }

    const screenplay = await getOrCreateScreenplay(projectId)
    if (!screenplay.draft) {
      throw new ValidationError("Draft must exist before applying feedback")
    }

    const charactersText = typeof screenplay.characters === "string"
      ? screenplay.characters
      : JSON.stringify(screenplay.characters, null, 2)

    // Extract first 10 scenes for context (to avoid token limit)
    const draftLines = screenplay.draft.split("\n")
    const draftPreview = draftLines.slice(0, 200).join("\n")

    const gw = getGateway()
    const revisionNotes = await gw.text(
      `Based on this feedback, identify which scenes need changes and provide specific revision instructions.

## Feedback
${body.feedback}

## Draft Preview (first scenes)
${draftPreview}

## Characters
${charactersText}

Return a JSON object with:
- "scenes_to_revise": array of scene numbers (integers) that need changes
- "revision_instructions": specific instructions for each scene
- "general_notes": overall feedback summary

Return ONLY JSON.`,
      {
        provider: "gemini",
        systemPrompt: "You are a screenplay editor analyzing feedback. Identify affected scenes and provide revision instructions. Return JSON only.",
        temperature: 0.5,
      },
    )

    // Store feedback as a note and advance — actual revision happens per-scene
    const updated = await prisma.screenplay.update({
      where: { id: screenplay.id },
      data: {
        draftVersion: screenplay.draftVersion + 1,
      },
    })

    // Parse revision notes for response
    let parsedNotes = { feedback: body.feedback, ai_analysis: revisionNotes }
    try {
      const jsonMatch = revisionNotes.match(/\{[\s\S]*\}/)
      if (jsonMatch) parsedNotes = { feedback: body.feedback, ai_analysis: JSON.parse(jsonMatch[0]) }
    } catch { /* use raw text */ }

    return c.json({ ...updated, revision: parsedNotes })
  } catch (err) {
    if (err instanceof AppError) throw err
    const message = err instanceof Error ? err.message : "Unknown error"
    throw new AppError(`Feedback application failed: ${message}`, 500, "AI_ERROR")
  }
})

// PUT /:projectId/draft — save edited draft
screenplayRoutes.put("/:projectId/draft", async (c) => {
  const projectId = c.req.param("projectId")
  try {
    const body = await c.req.json<{ draft: string }>()

    if (!body.draft || typeof body.draft !== "string") {
      throw new ValidationError("draft is required and must be a string")
    }

    const screenplay = await getOrCreateScreenplay(projectId)
    const updated = await prisma.screenplay.update({
      where: { id: screenplay.id },
      data: { draft: body.draft },
    })

    return c.json(updated)
  } catch (err) {
    if (err instanceof AppError) throw err
    const message = err instanceof Error ? err.message : "Unknown error"
    throw new AppError(`Save failed: ${message}`, 500, "INTERNAL_SERVER_ERROR")
  }
})

// DELETE /:projectId/draft — reset draft (start over)
screenplayRoutes.delete("/:projectId/draft", async (c) => {
  const projectId = c.req.param("projectId")
  try {
    const screenplay = await getOrCreateScreenplay(projectId)
    const updated = await prisma.screenplay.update({
      where: { id: screenplay.id },
      data: { draft: null, draftVersion: 1 },
    })
    return c.json(updated)
  } catch (err) {
    if (err instanceof AppError) throw err
    const message = err instanceof Error ? err.message : "Unknown error"
    throw new AppError(`Reset failed: ${message}`, 500, "INTERNAL_SERVER_ERROR")
  }
})

// PATCH /:projectId/step — update current step (1-6)
screenplayRoutes.patch("/:projectId/step", async (c) => {
  const projectId = c.req.param("projectId")
  try {
    const body = await c.req.json<{ step: number }>()

    if (typeof body.step !== "number" || body.step < 1 || body.step > 6) {
      throw new ValidationError("step must be a number between 1 and 6")
    }

    const screenplay = await getOrCreateScreenplay(projectId)
    const updated = await prisma.screenplay.update({
      where: { id: screenplay.id },
      data: { currentStep: body.step },
    })

    return c.json(updated)
  } catch (err) {
    if (err instanceof AppError) throw err
    const message = err instanceof Error ? err.message : "Unknown error"
    throw new AppError(`Step update failed: ${message}`, 500, "INTERNAL_SERVER_ERROR")
  }
})

// ─── Direction Plan: System prompts ───

const SEQUENCE_ANALYSIS_PROMPT = `You are a Film Script Analyzer. Parse the screenplay draft for the specified sequence and extract scene information.

For each scene in this sequence, extract:
- scene_number: integer
- sequence: the sequence number
- setting: location in Korean
- time_of_day: 낮/밤/새벽/저녁/심야
- camera_angle: the primary camera angle
- action_description: 2-3 sentence visual action summary in Korean
- dialogue: most important dialogue line (Korean), or null

Return ONLY a JSON array of scene objects.`

const CUT_DESIGN_PROMPT = `You are a Cinematographer and Shot Designer. Design 3-5 camera cuts for this scene.

For each cut:
- cut_number: integer (1-based within scene)
- shot_type: WIDE SHOT, MEDIUM SHOT, CLOSE UP, EXTREME CLOSE UP, OVER THE SHOULDER, TWO SHOT, etc.
- camera_angle: Eye level, High angle, Low angle, Bird's eye, Dutch angle, Worm's eye
- camera_movement: Static, Pan left/right, Tilt up/down, Dolly in/out, Crane up/down, Steadicam follow, Handheld
- duration: integer seconds (3-8)
- subject: what/who is in frame (English)
- action: what happens in this cut (English)
- image_prompt: "" (empty, generated in Stage 3)
- video_prompt: "" (empty, generated in Stage 3)

Return ONLY a JSON array of cut objects.`

const PROMPT_GENERATION_PROMPT = `You are a VFX Supervisor creating AI generation prompts.

Generate two prompts:
1. image_prompt: 5-part English prompt: [Subject + Action] + [Environment/Background] + [Camera angle/Composition] + [Lighting/Atmosphere] + [Visual Style]
2. video_prompt: 6-part English prompt: [Camera movement/Shot] + [Subject] + [Action] + [Environment] + [Style/Mood] + [Audio: SFX/BGM description]

Return a JSON object: { "image_prompt": "...", "video_prompt": "..." }`

// ─── Direction Plan: Routes ───

// POST /:projectId/direction-plan/sequence/:seq — Stage 1: Analyze sequence → Scene[] basic info
screenplayRoutes.post("/:projectId/direction-plan/sequence/:seq", async (c) => {
  const projectId = c.req.param("projectId")
  const seq = parseInt(c.req.param("seq"))

  if (isNaN(seq) || seq < 1 || seq > 8) {
    throw new ValidationError("seq must be a number between 1 and 8")
  }

  try {
    const screenplay = await getOrCreateScreenplay(projectId)
    if (!screenplay.outline) {
      throw new ValidationError("Outline must exist before analyzing sequences")
    }
    if (!screenplay.draft) {
      throw new ValidationError("Draft must exist before analyzing sequences")
    }

    const gw = getGateway()
    const response = await gw.text(
      `Analyze SEQUENCE ${seq} from the following screenplay draft and extract scene information.

## Outline
${screenplay.outline}

## Draft
${screenplay.draft}

Extract all scenes belonging to Sequence ${seq}.`,
      {
        provider: "gemini",
        systemPrompt: SEQUENCE_ANALYSIS_PROMPT,
        temperature: 0.5,
      },
    )

    if (!response || response.trim().length === 0) {
      throw new AppError("AI returned empty analysis. Please try again.", 502, "BAD_GATEWAY")
    }

    // Parse JSON array from response
    let newScenes: Record<string, unknown>[]
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new AppError("AI response was not a valid JSON array", 502, "BAD_GATEWAY")
      }
      newScenes = JSON.parse(jsonMatch[0]) as Record<string, unknown>[]
    } catch (e) {
      if (e instanceof AppError) throw e
      throw new AppError("Failed to parse AI response as JSON", 502, "BAD_GATEWAY")
    }

    // Merge into project.directionPlan
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) {
      throw new AppError(`Project '${projectId}' not found`, 404, "NOT_FOUND")
    }

    const directionPlan = (project.directionPlan as Record<string, unknown> | null) ?? {
      title: "",
      logline: "",
      genre: "",
      target_audience: "",
      planning_intent: "",
      worldview_settings: "",
      character_settings: "",
      global_audio_concept: "",
      scenes: [],
    }

    const existingScenes = (directionPlan.scenes as Record<string, unknown>[]) ?? []
    const otherScenes = existingScenes.filter(
      (s) => (s as { sequence?: number }).sequence !== seq
    )
    const mergedScenes = [...otherScenes, ...newScenes].sort(
      (a, b) =>
        ((a as { scene_number?: number }).scene_number ?? 0) -
        ((b as { scene_number?: number }).scene_number ?? 0)
    )
    directionPlan.scenes = mergedScenes

    await createSnapshot(projectId, "DIRECTION_PLAN", project.directionPlan)
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { directionPlan: directionPlan as Record<string, unknown> },
    })

    return c.json({ directionPlan: updatedProject.directionPlan })
  } catch (err) {
    if (err instanceof AppError) throw err
    const message = err instanceof Error ? err.message : "Unknown error"
    throw new AppError(`Sequence analysis failed: ${message}`, 500, "AI_ERROR")
  }
})

// POST /:projectId/direction-plan/scene/:sceneNumber/cuts — Stage 2: Generate 3-5 cuts for a scene
screenplayRoutes.post("/:projectId/direction-plan/scene/:sceneNumber/cuts", async (c) => {
  const projectId = c.req.param("projectId")
  const sceneNumber = parseInt(c.req.param("sceneNumber"))

  if (isNaN(sceneNumber) || sceneNumber < 1) {
    throw new ValidationError("sceneNumber must be a positive integer")
  }

  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) {
      throw new AppError(`Project '${projectId}' not found`, 404, "NOT_FOUND")
    }

    const directionPlan = project.directionPlan as Record<string, unknown> | null
    if (!directionPlan || !directionPlan.scenes) {
      throw new ValidationError("Direction plan with scenes must exist before generating cuts")
    }

    const scenes = directionPlan.scenes as Record<string, unknown>[]
    const scene = scenes.find(
      (s) => (s as { scene_number?: number }).scene_number === sceneNumber
    )
    if (!scene) {
      throw new AppError(`Scene ${sceneNumber} not found in direction plan`, 404, "NOT_FOUND")
    }

    const gw = getGateway()
    const response = await gw.text(
      `Design camera cuts for this scene:

Scene Number: ${sceneNumber}
Setting: ${(scene as { setting?: string }).setting ?? ""}
Time of Day: ${(scene as { time_of_day?: string }).time_of_day ?? ""}
Camera Angle: ${(scene as { camera_angle?: string }).camera_angle ?? ""}
Action: ${(scene as { action_description?: string }).action_description ?? ""}
Dialogue: ${(scene as { dialogue?: string | null }).dialogue ?? "None"}`,
      {
        provider: "gemini",
        systemPrompt: CUT_DESIGN_PROMPT,
        temperature: 0.6,
      },
    )

    if (!response || response.trim().length === 0) {
      throw new AppError("AI returned empty cut design. Please try again.", 502, "BAD_GATEWAY")
    }

    let cuts: Record<string, unknown>[]
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new AppError("AI response was not a valid JSON array", 502, "BAD_GATEWAY")
      }
      cuts = JSON.parse(jsonMatch[0]) as Record<string, unknown>[]
    } catch (e) {
      if (e instanceof AppError) throw e
      throw new AppError("Failed to parse AI response as JSON", 502, "BAD_GATEWAY")
    }

    // Update scene with cuts
    scene.cuts = cuts

    await createSnapshot(projectId, "DIRECTION_PLAN", project.directionPlan)
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { directionPlan: directionPlan as Record<string, unknown> },
    })

    return c.json({ directionPlan: updatedProject.directionPlan })
  } catch (err) {
    if (err instanceof AppError) throw err
    const message = err instanceof Error ? err.message : "Unknown error"
    throw new AppError(`Cut generation failed: ${message}`, 500, "AI_ERROR")
  }
})

// POST /:projectId/direction-plan/scene/:sceneNumber/cut/:cutNumber/prompts — Stage 3: Generate image + video prompts
screenplayRoutes.post("/:projectId/direction-plan/scene/:sceneNumber/cut/:cutNumber/prompts", async (c) => {
  const projectId = c.req.param("projectId")
  const sceneNumber = parseInt(c.req.param("sceneNumber"))
  const cutNumber = parseInt(c.req.param("cutNumber"))

  if (isNaN(sceneNumber) || sceneNumber < 1) {
    throw new ValidationError("sceneNumber must be a positive integer")
  }
  if (isNaN(cutNumber) || cutNumber < 1) {
    throw new ValidationError("cutNumber must be a positive integer")
  }

  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) {
      throw new AppError(`Project '${projectId}' not found`, 404, "NOT_FOUND")
    }

    const directionPlan = project.directionPlan as Record<string, unknown> | null
    if (!directionPlan || !directionPlan.scenes) {
      throw new ValidationError("Direction plan with scenes must exist")
    }

    const scenes = directionPlan.scenes as Record<string, unknown>[]
    const scene = scenes.find(
      (s) => (s as { scene_number?: number }).scene_number === sceneNumber
    )
    if (!scene) {
      throw new AppError(`Scene ${sceneNumber} not found in direction plan`, 404, "NOT_FOUND")
    }

    const cuts = (scene as { cuts?: Record<string, unknown>[] }).cuts
    if (!cuts || cuts.length === 0) {
      throw new ValidationError(`Scene ${sceneNumber} has no cuts. Generate cuts first (Stage 2).`)
    }

    const cut = cuts.find(
      (ct) => (ct as { cut_number?: number }).cut_number === cutNumber
    )
    if (!cut) {
      throw new AppError(`Cut ${cutNumber} not found in scene ${sceneNumber}`, 404, "NOT_FOUND")
    }

    const gw = getGateway()
    const response = await gw.text(
      `Generate image and video prompts for this camera cut:

Scene Setting: ${(scene as { setting?: string }).setting ?? ""}
Time of Day: ${(scene as { time_of_day?: string }).time_of_day ?? ""}
Shot Type: ${(cut as { shot_type?: string }).shot_type ?? ""}
Camera Angle: ${(cut as { camera_angle?: string }).camera_angle ?? ""}
Camera Movement: ${(cut as { camera_movement?: string }).camera_movement ?? ""}
Duration: ${(cut as { duration?: number }).duration ?? 5} seconds
Subject: ${(cut as { subject?: string }).subject ?? ""}
Action: ${(cut as { action?: string }).action ?? ""}`,
      {
        provider: "gemini",
        systemPrompt: PROMPT_GENERATION_PROMPT,
        temperature: 0.7,
      },
    )

    if (!response || response.trim().length === 0) {
      throw new AppError("AI returned empty prompts. Please try again.", 502, "BAD_GATEWAY")
    }

    let prompts: { image_prompt: string; video_prompt: string }
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new AppError("AI response was not a valid JSON object", 502, "BAD_GATEWAY")
      }
      prompts = JSON.parse(jsonMatch[0]) as { image_prompt: string; video_prompt: string }
    } catch (e) {
      if (e instanceof AppError) throw e
      throw new AppError("Failed to parse AI response as JSON", 502, "BAD_GATEWAY")
    }

    // Update cut with prompts
    cut.image_prompt = prompts.image_prompt
    cut.video_prompt = prompts.video_prompt

    await createSnapshot(projectId, "DIRECTION_PLAN", project.directionPlan)
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { directionPlan: directionPlan as Record<string, unknown> },
    })

    return c.json({ directionPlan: updatedProject.directionPlan })
  } catch (err) {
    if (err instanceof AppError) throw err
    const message = err instanceof Error ? err.message : "Unknown error"
    throw new AppError(`Prompt generation failed: ${message}`, 500, "AI_ERROR")
  }
})

// POST /:projectId/direction-plan/scene/:sceneNumber/generate-all — Convenience: cuts + all prompts in one call
screenplayRoutes.post("/:projectId/direction-plan/scene/:sceneNumber/generate-all", async (c) => {
  const projectId = c.req.param("projectId")
  const sceneNumber = parseInt(c.req.param("sceneNumber"))

  if (isNaN(sceneNumber) || sceneNumber < 1) {
    throw new ValidationError("sceneNumber must be a positive integer")
  }

  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) {
      throw new AppError(`Project '${projectId}' not found`, 404, "NOT_FOUND")
    }

    const directionPlan = project.directionPlan as Record<string, unknown> | null
    if (!directionPlan || !directionPlan.scenes) {
      throw new ValidationError("Direction plan with scenes must exist before generating cuts")
    }

    const scenes = directionPlan.scenes as Record<string, unknown>[]
    const scene = scenes.find(
      (s) => (s as { scene_number?: number }).scene_number === sceneNumber
    )
    if (!scene) {
      throw new AppError(`Scene ${sceneNumber} not found in direction plan`, 404, "NOT_FOUND")
    }

    const gw = getGateway()

    // Stage 2: Generate cuts
    const cutsResponse = await gw.text(
      `Design camera cuts for this scene:

Scene Number: ${sceneNumber}
Setting: ${(scene as { setting?: string }).setting ?? ""}
Time of Day: ${(scene as { time_of_day?: string }).time_of_day ?? ""}
Camera Angle: ${(scene as { camera_angle?: string }).camera_angle ?? ""}
Action: ${(scene as { action_description?: string }).action_description ?? ""}
Dialogue: ${(scene as { dialogue?: string | null }).dialogue ?? "None"}`,
      {
        provider: "gemini",
        systemPrompt: CUT_DESIGN_PROMPT,
        temperature: 0.6,
      },
    )

    if (!cutsResponse || cutsResponse.trim().length === 0) {
      throw new AppError("AI returned empty cut design. Please try again.", 502, "BAD_GATEWAY")
    }

    let cuts: Record<string, unknown>[]
    try {
      const jsonMatch = cutsResponse.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new AppError("AI cut response was not a valid JSON array", 502, "BAD_GATEWAY")
      }
      cuts = JSON.parse(jsonMatch[0]) as Record<string, unknown>[]
    } catch (e) {
      if (e instanceof AppError) throw e
      throw new AppError("Failed to parse AI cut response as JSON", 502, "BAD_GATEWAY")
    }

    // Stage 3: Generate prompts for each cut
    for (const cut of cuts) {
      const promptResponse = await gw.text(
        `Generate image and video prompts for this camera cut:

Scene Setting: ${(scene as { setting?: string }).setting ?? ""}
Time of Day: ${(scene as { time_of_day?: string }).time_of_day ?? ""}
Shot Type: ${(cut as { shot_type?: string }).shot_type ?? ""}
Camera Angle: ${(cut as { camera_angle?: string }).camera_angle ?? ""}
Camera Movement: ${(cut as { camera_movement?: string }).camera_movement ?? ""}
Duration: ${(cut as { duration?: number }).duration ?? 5} seconds
Subject: ${(cut as { subject?: string }).subject ?? ""}
Action: ${(cut as { action?: string }).action ?? ""}`,
        {
          provider: "gemini",
          systemPrompt: PROMPT_GENERATION_PROMPT,
          temperature: 0.7,
        },
      )

      if (promptResponse && promptResponse.trim().length > 0) {
        try {
          const jsonMatch = promptResponse.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const prompts = JSON.parse(jsonMatch[0]) as { image_prompt: string; video_prompt: string }
            cut.image_prompt = prompts.image_prompt
            cut.video_prompt = prompts.video_prompt
          }
        } catch {
          // Continue with empty prompts if parsing fails for this cut
          console.error(`[direction-plan generate-all] Failed to parse prompts for cut ${(cut as { cut_number?: number }).cut_number}`)
        }
      }
    }

    // Save everything at once
    scene.cuts = cuts

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { directionPlan: directionPlan as Record<string, unknown> },
    })

    return c.json({ directionPlan: updatedProject.directionPlan })
  } catch (err) {
    if (err instanceof AppError) throw err
    const message = err instanceof Error ? err.message : "Unknown error"
    throw new AppError(`Generate-all failed: ${message}`, 500, "AI_ERROR")
  }
})

// ─── Storyboard Image Generation ───

interface StoryboardGenerateBody {
  scope: "sequence" | "scene" | "cut"
  sequence?: number
  sceneNumber?: number
  cutNumber?: number
  style?: string
}

interface DPSceneShape {
  scene_number: number
  sequence?: number
  setting?: string
  time_of_day?: string
  image_prompt?: string
  cuts?: DPCutShape[]
}

interface DPCutShape {
  cut_number: number
  image_prompt?: string
  video_prompt?: string
}

// POST /:projectId/direction-plan/storyboard/generate — Generate storyboard images per scope
screenplayRoutes.post("/:projectId/direction-plan/storyboard/generate", async (c) => {
  const projectId = c.req.param("projectId")
  const body = await c.req.json<StoryboardGenerateBody>()

  const { scope, style: styleKey = "webtoon" } = body

  // Validate scope-specific params
  if (scope === "sequence" && (body.sequence == null || body.sequence < 1)) {
    throw new ValidationError("sequence is required for scope='sequence'")
  }
  if ((scope === "scene" || scope === "cut") && (body.sceneNumber == null || body.sceneNumber < 1)) {
    throw new ValidationError("sceneNumber is required for scope='scene' or 'cut'")
  }
  if (scope === "cut" && (body.cutNumber == null || body.cutNumber < 1)) {
    throw new ValidationError("cutNumber is required for scope='cut'")
  }

  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) {
      throw new AppError(`Project '${projectId}' not found`, 404, "NOT_FOUND")
    }

    const directionPlan = project.directionPlan as { scenes?: DPSceneShape[] } | null
    if (!directionPlan?.scenes?.length) {
      throw new ValidationError("Direction plan has no scenes")
    }

    const style = STYLE_PRESETS[styleKey] ?? STYLE_PRESETS.webtoon!
    const aspectKey = style.aspect
    const aspectRatio = ASPECT_RATIOS[aspectKey] ?? 2.35

    // Collect targets: { prompt, sequence, sceneNumber, cutNumber? }
    const targets: Array<{
      prompt: string
      sequence: number
      sceneNumber: number
      cutNumber?: number
    }> = []

    if (scope === "cut") {
      const scene = directionPlan.scenes.find((s) => s.scene_number === body.sceneNumber)
      if (!scene) throw new AppError(`Scene ${body.sceneNumber} not found`, 404, "NOT_FOUND")
      const cut = scene.cuts?.find((ct) => ct.cut_number === body.cutNumber)
      if (!cut) throw new AppError(`Cut ${body.cutNumber} not found in scene ${body.sceneNumber}`, 404, "NOT_FOUND")
      if (!cut.image_prompt) throw new ValidationError("Cut has no image_prompt")
      targets.push({
        prompt: cut.image_prompt,
        sequence: scene.sequence ?? 1,
        sceneNumber: scene.scene_number,
        cutNumber: cut.cut_number,
      })
    } else if (scope === "scene") {
      const scene = directionPlan.scenes.find((s) => s.scene_number === body.sceneNumber)
      if (!scene) throw new AppError(`Scene ${body.sceneNumber} not found`, 404, "NOT_FOUND")
      if (!scene.image_prompt) throw new ValidationError("Scene has no image_prompt")
      targets.push({
        prompt: scene.image_prompt,
        sequence: scene.sequence ?? 1,
        sceneNumber: scene.scene_number,
      })
    } else {
      // sequence scope
      const seqScenes = directionPlan.scenes.filter((s) => (s.sequence ?? 1) === body.sequence)
      if (seqScenes.length === 0) throw new AppError(`No scenes in sequence ${body.sequence}`, 404, "NOT_FOUND")
      for (const scene of seqScenes) {
        if (scene.image_prompt) {
          targets.push({
            prompt: scene.image_prompt,
            sequence: scene.sequence ?? 1,
            sceneNumber: scene.scene_number,
          })
        }
      }
      if (targets.length === 0) throw new ValidationError("No scenes with image_prompt in this sequence")
    }

    const gw = getGateway()
    const outputDir = join("output", "storyboards", projectId)
    await mkdir(outputDir, { recursive: true })

    const assets: Array<{
      id: string
      sceneNumber: number
      cutNumber?: number
      fileName: string
    }> = []

    for (const target of targets) {
      const enhancedPrompt = buildEnhancedPrompt(target.prompt, style, aspectKey)

      try {
        const imageBuffer = await gw.image(enhancedPrompt, {
          provider: "gemini",
          style: styleKey,
          aspectRatio: aspectKey,
        })

        const croppedBuffer = await cropToAspect(imageBuffer, aspectRatio)

        // Check for existing file and add timestamp if needed
        const baseFileName = makeStoryboardFileName({
          sequence: target.sequence,
          sceneNumber: target.sceneNumber,
          cutNumber: target.cutNumber,
        })
        let fileName = baseFileName
        try {
          await stat(join(outputDir, baseFileName))
          // File exists — append timestamp
          fileName = makeStoryboardFileName({
            sequence: target.sequence,
            sceneNumber: target.sceneNumber,
            cutNumber: target.cutNumber,
            timestamp: Math.floor(Date.now() / 1000),
          })
        } catch {
          // File doesn't exist — use base name
        }

        const filePath = join(outputDir, fileName)
        await writeFile(filePath, croppedBuffer)

        const fileInfo = await stat(filePath)
        console.log(`[storyboard] ${fileName} (${(fileInfo.size / 1024).toFixed(1)}KB)`)

        const asset = await prisma.asset.create({
          data: {
            projectId,
            type: "IMAGE",
            phase: "PRE",
            agentName: "StoryboardGenerator",
            filePath,
            fileName,
            mimeType: "image/png",
            sceneNumber: target.sceneNumber,
            fileSize: fileInfo.size,
            metadata: {
              style: styleKey,
              aspect: aspectKey,
              sequence: target.sequence,
              cutNumber: target.cutNumber ?? null,
              scope,
            },
          },
        })

        assets.push({
          id: asset.id,
          sceneNumber: target.sceneNumber,
          cutNumber: target.cutNumber,
          fileName,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[storyboard] Failed to generate for scene ${target.sceneNumber}: ${msg}`)
        // Continue with remaining targets
      }
    }

    return c.json({ assets })
  } catch (err) {
    if (err instanceof AppError) throw err
    const message = err instanceof Error ? err.message : "Unknown error"
    throw new AppError(`Storyboard generation failed: ${message}`, 500, "AI_ERROR")
  }
})

// ─── 씬 단위 비디오 생성 ───

screenplayRoutes.post("/:projectId/scene/:sceneNumber/generate-video", async (c) => {
  const projectId = c.req.param("projectId")
  const sceneNumber = Number(c.req.param("sceneNumber"))

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) throw new NotFoundError("Project", projectId)

  const directionPlan = project.directionPlan as { scenes?: DPSceneShape[] } | null
  if (!directionPlan?.scenes?.length) {
    throw new ValidationError("Direction plan has no scenes")
  }

  const targetScene = directionPlan.scenes.find((s) => s.scene_number === sceneNumber)
  if (!targetScene) throw new ValidationError(`Scene ${sceneNumber} not found in direction plan`)
  if (!targetScene.cuts?.length) throw new ValidationError(`Scene ${sceneNumber} has no cuts`)

  const gw = getGateway()
  const outputDir = join("output", "videos", projectId)
  await mkdir(outputDir, { recursive: true })

  const assets: Array<Record<string, unknown>> = []

  for (const cut of targetScene.cuts) {
    if (!cut.video_prompt) continue

    try {
      const result = await gw.video(cut.video_prompt, {
        provider: "gemini",
        aspectRatio: "16:9",
      })

      const fileName = `scene_${sceneNumber}_cut_${cut.cut_number}.mp4`
      const filePath = join(outputDir, fileName)
      await writeFile(filePath, result.videoBuffer)

      const asset = await prisma.asset.create({
        data: {
          projectId,
          type: "VIDEO",
          phase: "MAIN",
          agentName: "Generalist",
          sceneNumber,
          filePath,
          fileName,
          mimeType: "video/mp4",
          fileSize: result.videoBuffer.length,
          metadata: {
            cutNumber: cut.cut_number,
            duration: result.duration,
            prompt: cut.video_prompt,
          } as Record<string, unknown>,
        },
      })

      assets.push({
        id: asset.id, fileName, filePath, sceneNumber,
        cutNumber: cut.cut_number, type: "VIDEO",
      })
    } catch (err) {
      console.error(`[generate-video] Scene ${sceneNumber} Cut ${cut.cut_number} failed:`, err)
    }
  }

  return c.json({ assets, sceneNumber, totalCuts: targetScene.cuts.length })
})

// ─── 씬 단위 오디오 생성 ───

screenplayRoutes.post("/:projectId/scene/:sceneNumber/generate-audio", async (c) => {
  const projectId = c.req.param("projectId")
  const sceneNumber = Number(c.req.param("sceneNumber"))

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) throw new NotFoundError("Project", projectId)

  const directionPlan = project.directionPlan as { scenes?: DPSceneShape[] } | null
  if (!directionPlan?.scenes?.length) {
    throw new ValidationError("Direction plan has no scenes")
  }

  const targetScene = directionPlan.scenes.find((s) => s.scene_number === sceneNumber)
  if (!targetScene) throw new ValidationError(`Scene ${sceneNumber} not found in direction plan`)

  const gw = getGateway()
  const outputDir = join("output", "audio", projectId)
  await mkdir(outputDir, { recursive: true })

  const assets: Array<Record<string, unknown>> = []

  for (const cut of (targetScene.cuts ?? [])) {
    // video_prompt에서 대화/오디오 내용 추출
    const prompt = cut.video_prompt ?? ""
    if (!prompt) continue

    try {
      const dialogueBuffer = await gw.tts(prompt, {
        provider: "gemini",
        voice: "Kore",
        language: "ko",
      })

      const fileName = `scene_${sceneNumber}_cut_${cut.cut_number}_dialogue.wav`
      const filePath = join(outputDir, fileName)
      await writeFile(filePath, dialogueBuffer)

      const asset = await prisma.asset.create({
        data: {
          projectId,
          type: "AUDIO",
          phase: "POST",
          agentName: "SoundDesigner",
          sceneNumber,
          filePath,
          fileName,
          mimeType: "audio/wav",
          fileSize: dialogueBuffer.length,
          metadata: {
            cutNumber: cut.cut_number,
            audioType: "dialogue",
          } as Record<string, unknown>,
        },
      })

      assets.push({
        id: asset.id, fileName, filePath, sceneNumber,
        cutNumber: cut.cut_number, type: "AUDIO",
      })
    } catch (err) {
      console.error(`[generate-audio] Scene ${sceneNumber} Cut ${cut.cut_number} failed:`, err)
    }
  }

  return c.json({ assets, sceneNumber })
})
