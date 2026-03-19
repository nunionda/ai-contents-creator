import { Hono } from "hono"
import { prisma } from "@marionette/db"
import { AIGateway } from "@marionette/ai-gateway"
import { GeminiProvider } from "@marionette/ai-gateway/providers/gemini.js"
import { NotFoundError, ValidationError } from "../middleware/error-handler.ts"

export const screenplayRoutes = new Hono()

// ─── Singleton AI gateway ───

let gateway: AIGateway | null = null

function getGateway(): AIGateway {
  if (!gateway) {
    gateway = new AIGateway()
    gateway.register("gemini", new GeminiProvider(), true)
  }
  return gateway
}

// ─── System prompts ───

const OUTLINE_SYSTEM_PROMPT = `You are a senior screenwriter creating an 8-sequence film structure.
Given the idea, create a comprehensive outline with:
- Title and logline (use antigravity formula: ironic setup + tactical detail + universal emotion)
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
Write the next 5 scenes based on the scene logs, characters, and outline.
Format: ### S#N. LOCATION - TIME
(Camera direction and action in parentheses)
CHARACTER NAME
Dialogue in Korean matching character's tone from characters.json`

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
  const screenplay = await getOrCreateScreenplay(projectId)
  return c.json(screenplay)
})

// POST /:projectId/outline — AI generates 8-sequence outline + logline
screenplayRoutes.post("/:projectId/outline", async (c) => {
  const projectId = c.req.param("projectId")

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) {
    throw new NotFoundError("Project", projectId)
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

  const screenplay = await getOrCreateScreenplay(projectId)
  const updated = await prisma.screenplay.update({
    where: { id: screenplay.id },
    data: { outline, currentStep: Math.max(screenplay.currentStep, 1) },
  })

  return c.json(updated)
})

// PUT /:projectId/outline — save edited outline
screenplayRoutes.put("/:projectId/outline", async (c) => {
  const projectId = c.req.param("projectId")
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
})

// POST /:projectId/characters — AI generates characters from outline
screenplayRoutes.post("/:projectId/characters", async (c) => {
  const projectId = c.req.param("projectId")

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
    data: { characters, currentStep: Math.max(screenplay.currentStep, 2) },
  })

  return c.json(updated)
})

// PUT /:projectId/characters — save edited characters
screenplayRoutes.put("/:projectId/characters", async (c) => {
  const projectId = c.req.param("projectId")
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
})

// POST /:projectId/treatment — AI generates ~120 scene logs
screenplayRoutes.post("/:projectId/treatment", async (c) => {
  const projectId = c.req.param("projectId")

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
  const sceneLogs = await gw.text(
    `Generate scene-by-scene logs based on:\n\n## Outline\n${screenplay.outline}\n\n## Characters\n${charactersText}`,
    {
      provider: "gemini",
      systemPrompt: TREATMENT_SYSTEM_PROMPT,
      temperature: 0.5,
    },
  )

  const updated = await prisma.screenplay.update({
    where: { id: screenplay.id },
    data: { sceneLogs, currentStep: Math.max(screenplay.currentStep, 3) },
  })

  return c.json(updated)
})

// POST /:projectId/draft — AI writes 5 scenes of screenplay
screenplayRoutes.post("/:projectId/draft", async (c) => {
  const projectId = c.req.param("projectId")

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
    `Write the next 5 scenes (batch ${draftVersion}) of the screenplay.

## Outline
${screenplay.outline}

## Characters
${charactersText}

## Scene Logs
${screenplay.sceneLogs}

## Previously Written Draft
${existingDraft || "(No scenes written yet)"}`,
    {
      provider: "gemini",
      systemPrompt: DRAFT_SYSTEM_PROMPT,
      temperature: 0.7,
    },
  )

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
})

// PUT /:projectId/draft — save edited draft
screenplayRoutes.put("/:projectId/draft", async (c) => {
  const projectId = c.req.param("projectId")
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
})

// PATCH /:projectId/step — update current step (1-5)
screenplayRoutes.patch("/:projectId/step", async (c) => {
  const projectId = c.req.param("projectId")
  const body = await c.req.json<{ step: number }>()

  if (typeof body.step !== "number" || body.step < 1 || body.step > 5) {
    throw new ValidationError("step must be a number between 1 and 5")
  }

  const screenplay = await getOrCreateScreenplay(projectId)
  const updated = await prisma.screenplay.update({
    where: { id: screenplay.id },
    data: { currentStep: body.step },
  })

  return c.json(updated)
})
