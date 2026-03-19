"use client"

import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { fetchAPI } from "../../../../../lib/api"

// ─── Types ───

interface CharacterCasting {
  actor: string
  reason: string
}

interface Character {
  name: string
  age: number
  role: string
  persona: string
  motivation: string
  tone: string
  casting: CharacterCasting
}

interface SceneBreakdownElement {
  cast: string[]
  props: string[]
  location: string[]
}

interface SceneLog {
  scene_number: number
  sequence: number
  sequence_title: string
  location: string
  time_of_day: string
  summary: string
  breakdown: SceneBreakdownElement
}

interface ReviewChecklist {
  character_consistency: boolean
  master_scene_format: boolean
  scene_count: number
  target_scenes: number
  pacing_check: boolean
}

interface ScreenplayData {
  id: string
  project_id: string
  current_step: number
  idea: string
  outline: string | null
  characters: Character[]
  scene_logs: SceneLog[]
  draft: string | null
  draft_version: number
  review: ReviewChecklist | null
  feedback: string | null
  created_at: string
  updated_at: string
}

interface Project {
  id: string
  title: string
  idea: string
}

interface SequenceCard {
  index: number
  title: string
  content: string
}

// ─── Constants ───

const STEPS = [
  { key: 1, label: "기획", labelEn: "Planning" },
  { key: 2, label: "인물설계", labelEn: "Characters" },
  { key: 3, label: "트리트먼트", labelEn: "Treatment" },
  { key: 4, label: "집필", labelEn: "Screenplay" },
  { key: 5, label: "피드백", labelEn: "Review" },
] as const

const SEQUENCE_COLORS = [
  "border-blue-500 bg-blue-500/10",
  "border-cyan-500 bg-cyan-500/10",
  "border-green-500 bg-green-500/10",
  "border-yellow-500 bg-yellow-500/10",
  "border-orange-500 bg-orange-500/10",
  "border-red-500 bg-red-500/10",
  "border-purple-500 bg-purple-500/10",
  "border-pink-500 bg-pink-500/10",
]

const CHARACTER_BORDER_COLORS = [
  "border-l-blue-500",
  "border-l-cyan-500",
  "border-l-green-500",
  "border-l-yellow-500",
  "border-l-orange-500",
  "border-l-red-500",
  "border-l-purple-500",
  "border-l-pink-500",
]

// ─── Helpers ───

function parseSequences(outline: string): SequenceCard[] {
  const sequences: SequenceCard[] = []
  const sections = outline.split(/^#{2,3}\s+/m).filter(Boolean)

  for (let i = 0; i < sections.length && sequences.length < 8; i++) {
    const section = sections[i].trim()
    const lines = section.split("\n")
    const title = lines[0]?.trim() ?? `Sequence ${sequences.length + 1}`
    const content = lines.slice(1).join("\n").trim()
    if (title) {
      sequences.push({ index: sequences.length, title, content })
    }
  }

  // If no sections found, create a single card with the full outline
  if (sequences.length === 0 && outline.trim()) {
    sequences.push({ index: 0, title: "Outline", content: outline.trim() })
  }

  return sequences
}

function parseScreenplayFormatting(text: string): { type: "heading" | "action" | "character" | "dialogue" | "camera" | "text"; content: string }[] {
  const lines = text.split("\n")
  const result: { type: "heading" | "action" | "character" | "dialogue" | "camera" | "text"; content: string }[] = []

  const cameraKeywords = ["WIDE SHOT", "CLOSE UP", "CLOSE-UP", "ECU", "CU", "MS", "LS", "ELS", "DOLLY", "CRANE", "TRACKING", "PAN", "TILT", "ZOOM", "HANDHELD", "STEADICAM", "JIB", "POV", "ONE SHOT", "TWO SHOT", "OVER THE SHOULDER"]

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (/^S#\d+\./.test(trimmed)) {
      result.push({ type: "heading", content: trimmed })
    } else if (/^\(.*\)$/.test(trimmed)) {
      result.push({ type: "action", content: trimmed })
    } else if (cameraKeywords.some((kw) => trimmed.toUpperCase().startsWith(kw))) {
      result.push({ type: "camera", content: trimmed })
    } else if (/^[A-Z가-힣\s]+:?$/.test(trimmed) && trimmed.length < 30) {
      result.push({ type: "character", content: trimmed })
    } else if (result.length > 0 && result[result.length - 1].type === "character") {
      result.push({ type: "dialogue", content: trimmed })
    } else {
      result.push({ type: "text", content: trimmed })
    }
  }

  return result
}

// ─── Main Component ───

export default function ScreenplayPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [screenplay, setScreenplay] = useState<ScreenplayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeStep, setActiveStep] = useState(1)

  // Step 1 state
  const [idea, setIdea] = useState("")
  const [editingOutline, setEditingOutline] = useState(false)
  const [outlineEdit, setOutlineEdit] = useState("")

  // Step 2 state
  const [editingCharacterIdx, setEditingCharacterIdx] = useState<number | null>(null)
  const [newCharacterForm, setNewCharacterForm] = useState(false)
  const [newCharacter, setNewCharacter] = useState<Character>({
    name: "", age: 0, role: "", persona: "", motivation: "", tone: "",
    casting: { actor: "", reason: "" },
  })

  // Step 4 state
  const [editingDraft, setEditingDraft] = useState(false)
  const [draftEdit, setDraftEdit] = useState("")
  const [activeScene, setActiveScene] = useState(1)

  // Step 5 state
  const [feedbackText, setFeedbackText] = useState("")

  // ─── Data Loading ───

  const loadData = useCallback(async () => {
    try {
      const [proj, sp] = await Promise.all([
        fetchAPI<Project>(`/api/projects/${projectId}`),
        fetchAPI<ScreenplayData>(`/api/screenplay/${projectId}`),
      ])
      setProject(proj)
      setScreenplay(sp)
      setActiveStep(sp.current_step || 1)
      setIdea(sp.idea || proj.idea || "")
      if (sp.draft) setDraftEdit(sp.draft)
      if (sp.outline) setOutlineEdit(sp.outline)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ─── API Actions ───

  const generateOutline = async () => {
    setGenerating(true)
    setError(null)
    try {
      const updated = await fetchAPI<ScreenplayData>(`/api/screenplay/${projectId}/outline`, {
        method: "POST",
        body: JSON.stringify({ idea }),
      })
      setScreenplay(updated)
      if (updated.outline) setOutlineEdit(updated.outline)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Outline generation failed")
    } finally {
      setGenerating(false)
    }
  }

  const saveOutline = async () => {
    setError(null)
    try {
      const updated = await fetchAPI<ScreenplayData>(`/api/screenplay/${projectId}/outline`, {
        method: "PUT",
        body: JSON.stringify({ outline: outlineEdit }),
      })
      setScreenplay(updated)
      setEditingOutline(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    }
  }

  const generateCharacters = async () => {
    setGenerating(true)
    setError(null)
    try {
      const updated = await fetchAPI<ScreenplayData>(`/api/screenplay/${projectId}/characters`, {
        method: "POST",
      })
      setScreenplay(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Character generation failed")
    } finally {
      setGenerating(false)
    }
  }

  const saveCharacters = async (characters: Character[]) => {
    setError(null)
    try {
      const updated = await fetchAPI<ScreenplayData>(`/api/screenplay/${projectId}/characters`, {
        method: "PUT",
        body: JSON.stringify({ characters }),
      })
      setScreenplay(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    }
  }

  const generateTreatment = async () => {
    setGenerating(true)
    setError(null)
    try {
      const updated = await fetchAPI<ScreenplayData>(`/api/screenplay/${projectId}/treatment`, {
        method: "POST",
      })
      setScreenplay(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Treatment generation failed")
    } finally {
      setGenerating(false)
    }
  }

  const writeNextScenes = async () => {
    setGenerating(true)
    setError(null)
    try {
      const updated = await fetchAPI<ScreenplayData>(`/api/screenplay/${projectId}/draft`, {
        method: "POST",
      })
      setScreenplay(updated)
      if (updated.draft) setDraftEdit(updated.draft)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Draft generation failed")
    } finally {
      setGenerating(false)
    }
  }

  const saveDraft = async () => {
    setError(null)
    try {
      const updated = await fetchAPI<ScreenplayData>(`/api/screenplay/${projectId}/draft`, {
        method: "PUT",
        body: JSON.stringify({ draft: draftEdit }),
      })
      setScreenplay(updated)
      setEditingDraft(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    }
  }

  const advanceStep = async (nextStep: number) => {
    setError(null)
    try {
      const updated = await fetchAPI<ScreenplayData>(`/api/screenplay/${projectId}/step`, {
        method: "PATCH",
        body: JSON.stringify({ step: nextStep }),
      })
      setScreenplay(updated)
      setActiveStep(nextStep)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Step update failed")
    }
  }

  const applyFeedback = async () => {
    setGenerating(true)
    setError(null)
    try {
      const updated = await fetchAPI<ScreenplayData>(`/api/screenplay/${projectId}/draft`, {
        method: "POST",
        body: JSON.stringify({ feedback: feedbackText }),
      })
      setScreenplay(updated)
      if (updated.draft) setDraftEdit(updated.draft)
      setFeedbackText("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feedback application failed")
    } finally {
      setGenerating(false)
    }
  }

  // ─── Render Helpers ───

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-t-blue-500" />
          Loading screenplay...
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        {error ?? "Project not found"}
      </div>
    )
  }

  const completedSteps = screenplay?.current_step ?? 1

  return (
    <div className="max-w-7xl">
      {/* Back button */}
      <button
        onClick={() => router.push(`/projects/${projectId}`)}
        className="mb-4 text-sm text-gray-400 hover:text-white transition"
      >
        &larr; Back to Project
      </button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{project.title}</h1>
        <p className="mt-1 text-sm text-gray-400">Screenplay Development</p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-3 text-red-300 hover:text-white">&times;</button>
        </div>
      )}

      {/* Content Layout: Main + Sidebar */}
      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* 5-Step Progress Tracker */}
          <div className="mb-6 flex items-center gap-0 rounded-xl border border-gray-800 bg-gray-900/50 p-1">
            {STEPS.map((step, i) => {
              const isCompleted = step.key < completedSteps
              const isActive = step.key === activeStep
              const isLocked = step.key > completedSteps + 1

              return (
                <div key={step.key} className="flex flex-1 items-center">
                  <button
                    onClick={() => !isLocked && setActiveStep(step.key)}
                    disabled={isLocked}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-blue-600/20 text-blue-400 shadow-lg ring-1 ring-blue-500/30"
                        : isCompleted
                          ? "text-green-400 hover:bg-gray-800/50"
                          : isLocked
                            ? "cursor-not-allowed text-gray-600"
                            : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                    }`}
                  >
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      isActive
                        ? "bg-blue-500 text-white"
                        : isCompleted
                          ? "bg-green-500 text-white"
                          : "bg-gray-700 text-gray-400"
                    }`}>
                      {isCompleted ? "\u2713" : step.key}
                    </span>
                    <span className="hidden md:inline">{step.label}</span>
                    <span className="hidden lg:inline text-xs text-gray-500">({step.labelEn})</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={`h-px w-4 flex-shrink-0 ${isCompleted ? "bg-green-500" : "bg-gray-700"}`} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Step Content */}
          {activeStep === 1 && (
            <Step1Planning
              idea={idea}
              onIdeaChange={setIdea}
              outline={screenplay?.outline ?? null}
              editingOutline={editingOutline}
              outlineEdit={outlineEdit}
              onOutlineEditChange={setOutlineEdit}
              onToggleEdit={() => {
                if (editingOutline) {
                  saveOutline()
                } else {
                  setOutlineEdit(screenplay?.outline ?? "")
                  setEditingOutline(true)
                }
              }}
              onCancelEdit={() => setEditingOutline(false)}
              onGenerate={generateOutline}
              onApprove={() => advanceStep(2)}
              generating={generating}
            />
          )}

          {activeStep === 2 && (
            <Step2Characters
              characters={screenplay?.characters ?? []}
              editingIdx={editingCharacterIdx}
              onEditStart={(idx) => setEditingCharacterIdx(idx)}
              onEditEnd={() => setEditingCharacterIdx(null)}
              onSaveCharacter={(idx, char) => {
                const updated = [...(screenplay?.characters ?? [])]
                updated[idx] = char
                saveCharacters(updated)
                setEditingCharacterIdx(null)
              }}
              newCharacterForm={newCharacterForm}
              onToggleNewForm={() => setNewCharacterForm(!newCharacterForm)}
              newCharacter={newCharacter}
              onNewCharacterChange={setNewCharacter}
              onAddCharacter={() => {
                const updated = [...(screenplay?.characters ?? []), newCharacter]
                saveCharacters(updated)
                setNewCharacterForm(false)
                setNewCharacter({
                  name: "", age: 0, role: "", persona: "", motivation: "", tone: "",
                  casting: { actor: "", reason: "" },
                })
              }}
              onGenerate={generateCharacters}
              onApprove={() => advanceStep(3)}
              generating={generating}
            />
          )}

          {activeStep === 3 && (
            <Step3Treatment
              sceneLogs={screenplay?.scene_logs ?? []}
              onGenerate={generateTreatment}
              onApprove={() => advanceStep(4)}
              generating={generating}
            />
          )}

          {activeStep === 4 && (
            <Step4Screenplay
              draft={screenplay?.draft ?? null}
              draftVersion={screenplay?.draft_version ?? 1}
              editingDraft={editingDraft}
              draftEdit={draftEdit}
              onDraftEditChange={setDraftEdit}
              onToggleEdit={() => {
                if (editingDraft) {
                  saveDraft()
                } else {
                  setDraftEdit(screenplay?.draft ?? "")
                  setEditingDraft(true)
                }
              }}
              onCancelEdit={() => setEditingDraft(false)}
              activeScene={activeScene}
              onSceneChange={setActiveScene}
              onWriteNext={writeNextScenes}
              onApprove={() => advanceStep(5)}
              generating={generating}
            />
          )}

          {activeStep === 5 && (
            <Step5Review
              review={screenplay?.review ?? null}
              feedbackText={feedbackText}
              onFeedbackChange={setFeedbackText}
              onApplyFeedback={applyFeedback}
              onFinalize={() => router.push(`/projects/${projectId}`)}
              generating={generating}
            />
          )}
        </div>

        {/* Artifacts Sidebar */}
        <div className="hidden xl:block w-64 flex-shrink-0">
          <div className="sticky top-6 rounded-xl border border-gray-800 bg-gray-900 p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-300">Deliverables</h3>
            <div className="space-y-2">
              <ArtifactItem label="Outline" done={!!screenplay?.outline} />
              <ArtifactItem label="Characters" done={(screenplay?.characters?.length ?? 0) > 0} />
              <ArtifactItem label="Scene Logs" done={(screenplay?.scene_logs?.length ?? 0) > 0} />
              <ArtifactItem label="Draft" done={!!screenplay?.draft} />
              <ArtifactItem label="Review" done={!!screenplay?.review} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Artifact Sidebar Item ───

function ArtifactItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
      done ? "bg-green-500/10 text-green-400" : "bg-gray-800/50 text-gray-500"
    }`}>
      <span className="text-xs">{done ? "\u2705" : "\u2B1C"}</span>
      <span>{label}</span>
    </div>
  )
}

// ─── Step 1: Planning ───

function Step1Planning({
  idea, onIdeaChange, outline, editingOutline, outlineEdit, onOutlineEditChange,
  onToggleEdit, onCancelEdit, onGenerate, onApprove, generating,
}: {
  idea: string
  onIdeaChange: (v: string) => void
  outline: string | null
  editingOutline: boolean
  outlineEdit: string
  onOutlineEditChange: (v: string) => void
  onToggleEdit: () => void
  onCancelEdit: () => void
  onGenerate: () => void
  onApprove: () => void
  generating: boolean
}) {
  const sequences = outline ? parseSequences(outline) : []

  return (
    <div className="space-y-6">
      {/* Idea Input */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-2 text-lg font-semibold">Idea</h2>
        <textarea
          value={idea}
          onChange={(e) => onIdeaChange(e.target.value)}
          rows={4}
          placeholder="Enter your story idea..."
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={onGenerate}
          disabled={generating || !idea.trim()}
          className="mt-3 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Generating Outline...
            </span>
          ) : "Generate Outline"}
        </button>
      </div>

      {/* Outline Display */}
      {outline && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Outline</h2>
            <div className="flex gap-2">
              <button
                onClick={onToggleEdit}
                className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:text-white transition"
              >
                {editingOutline ? "Save" : "Edit"}
              </button>
              {editingOutline && (
                <button
                  onClick={onCancelEdit}
                  className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:text-white transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {editingOutline ? (
            <textarea
              value={outlineEdit}
              onChange={(e) => onOutlineEditChange(e.target.value)}
              rows={20}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 font-mono text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
            />
          ) : (
            <pre className="whitespace-pre-wrap rounded-lg bg-gray-950 p-4 text-sm text-gray-300 leading-relaxed">
              {outline}
            </pre>
          )}
        </div>
      )}

      {/* Beat Board */}
      {sequences.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 text-lg font-semibold">8-Sequence Beat Board</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {sequences.map((seq) => (
              <div
                key={seq.index}
                className={`min-w-[200px] max-w-[240px] flex-shrink-0 rounded-lg border-l-4 bg-gray-950 p-4 ${SEQUENCE_COLORS[seq.index % 8]}`}
              >
                <div className="mb-1 text-xs font-bold text-gray-400">SEQ {seq.index + 1}</div>
                <div className="mb-2 text-sm font-semibold text-gray-200">{seq.title}</div>
                <p className="text-xs text-gray-400 line-clamp-4">{seq.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approve */}
      {outline && (
        <button
          onClick={onApprove}
          className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-green-700"
        >
          Approve &amp; Next Step &rarr;
        </button>
      )}
    </div>
  )
}

// ─── Step 2: Characters ───

function Step2Characters({
  characters, editingIdx, onEditStart, onEditEnd, onSaveCharacter,
  newCharacterForm, onToggleNewForm, newCharacter, onNewCharacterChange, onAddCharacter,
  onGenerate, onApprove, generating,
}: {
  characters: Character[]
  editingIdx: number | null
  onEditStart: (idx: number) => void
  onEditEnd: () => void
  onSaveCharacter: (idx: number, char: Character) => void
  newCharacterForm: boolean
  onToggleNewForm: () => void
  newCharacter: Character
  onNewCharacterChange: (c: Character) => void
  onAddCharacter: () => void
  onGenerate: () => void
  onApprove: () => void
  generating: boolean
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Characters</h2>
          <div className="flex gap-2">
            <button
              onClick={onGenerate}
              disabled={generating}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Generating...
                </span>
              ) : "Generate Characters"}
            </button>
            <button
              onClick={onToggleNewForm}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:text-white transition"
            >
              + Add Character
            </button>
          </div>
        </div>

        {/* Character Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {characters.map((char, idx) => (
            <CharacterCard
              key={idx}
              character={char}
              colorClass={CHARACTER_BORDER_COLORS[idx % CHARACTER_BORDER_COLORS.length]}
              editing={editingIdx === idx}
              onEdit={() => onEditStart(idx)}
              onCancel={onEditEnd}
              onSave={(updated) => onSaveCharacter(idx, updated)}
            />
          ))}
        </div>

        {/* New Character Form */}
        {newCharacterForm && (
          <div className="mt-4 rounded-lg border border-gray-700 bg-gray-950 p-4">
            <h3 className="mb-3 text-sm font-semibold">New Character</h3>
            <CharacterForm
              character={newCharacter}
              onChange={onNewCharacterChange}
            />
            <div className="mt-3 flex gap-2">
              <button onClick={onAddCharacter} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                Add
              </button>
              <button onClick={onToggleNewForm} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:text-white">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Approve */}
      {characters.length > 0 && (
        <button
          onClick={onApprove}
          className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-green-700"
        >
          Approve &amp; Next Step &rarr;
        </button>
      )}
    </div>
  )
}

function CharacterCard({
  character, colorClass, editing, onEdit, onCancel, onSave,
}: {
  character: Character
  colorClass: string
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (c: Character) => void
}) {
  const [editChar, setEditChar] = useState<Character>(character)

  useEffect(() => {
    setEditChar(character)
  }, [character])

  if (editing) {
    return (
      <div className={`rounded-lg border-l-4 bg-gray-950 p-4 ${colorClass}`}>
        <CharacterForm character={editChar} onChange={setEditChar} />
        <div className="mt-3 flex gap-2">
          <button onClick={() => onSave(editChar)} className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700">Save</button>
          <button onClick={onCancel} className="rounded border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:text-white">Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`cursor-pointer rounded-lg border-l-4 bg-gray-950 p-4 transition hover:bg-gray-900 ${colorClass}`}
      onClick={onEdit}
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <span className="text-base font-bold text-gray-100">{character.name}</span>
          <span className="ml-2 text-sm text-gray-500">{character.age}세</span>
        </div>
        <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">{character.role}</span>
      </div>
      <div className="space-y-1.5 text-xs text-gray-400">
        <p><span className="font-medium text-gray-300">Persona:</span> {character.persona}</p>
        <p><span className="font-medium text-gray-300">Motivation:</span> {character.motivation}</p>
        <p><span className="font-medium text-gray-300">Tone:</span> {character.tone}</p>
      </div>
      <div className="mt-3 border-t border-gray-800 pt-2">
        <p className="text-xs text-gray-500">
          <span className="font-medium text-gray-400">Casting:</span> {character.casting.actor}
        </p>
        <p className="text-xs text-gray-600">{character.casting.reason}</p>
      </div>
    </div>
  )
}

function CharacterForm({ character, onChange }: { character: Character; onChange: (c: Character) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="mb-1 block text-xs text-gray-400">Name</label>
        <input
          value={character.name}
          onChange={(e) => onChange({ ...character, name: e.target.value })}
          className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-400">Age</label>
        <input
          type="number"
          value={character.age}
          onChange={(e) => onChange({ ...character, age: parseInt(e.target.value) || 0 })}
          className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div className="col-span-2">
        <label className="mb-1 block text-xs text-gray-400">Role</label>
        <input
          value={character.role}
          onChange={(e) => onChange({ ...character, role: e.target.value })}
          className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div className="col-span-2">
        <label className="mb-1 block text-xs text-gray-400">Persona</label>
        <textarea
          value={character.persona}
          onChange={(e) => onChange({ ...character, persona: e.target.value })}
          rows={2}
          className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div className="col-span-2">
        <label className="mb-1 block text-xs text-gray-400">Motivation</label>
        <textarea
          value={character.motivation}
          onChange={(e) => onChange({ ...character, motivation: e.target.value })}
          rows={2}
          className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div className="col-span-2">
        <label className="mb-1 block text-xs text-gray-400">Tone</label>
        <input
          value={character.tone}
          onChange={(e) => onChange({ ...character, tone: e.target.value })}
          className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-400">Casting (Actor)</label>
        <input
          value={character.casting.actor}
          onChange={(e) => onChange({ ...character, casting: { ...character.casting, actor: e.target.value } })}
          className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-400">Casting (Reason)</label>
        <input
          value={character.casting.reason}
          onChange={(e) => onChange({ ...character, casting: { ...character.casting, reason: e.target.value } })}
          className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
    </div>
  )
}

// ─── Step 3: Treatment ───

function Step3Treatment({
  sceneLogs, onGenerate, onApprove, generating,
}: {
  sceneLogs: SceneLog[]
  onGenerate: () => void
  onApprove: () => void
  generating: boolean
}) {
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({})

  const grouped = sceneLogs.reduce<Record<number, SceneLog[]>>((acc, log) => {
    const seq = log.sequence ?? 1
    if (!acc[seq]) acc[seq] = []
    acc[seq].push(log)
    return acc
  }, {})

  const toggleCollapse = (seq: number) => {
    setCollapsed((prev) => ({ ...prev, [seq]: !prev[seq] }))
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Scene Logs (Treatment)</h2>
          <button
            onClick={onGenerate}
            disabled={generating}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Generating...
              </span>
            ) : "Generate Scene Logs"}
          </button>
        </div>

        {sceneLogs.length === 0 && !generating && (
          <p className="text-sm text-gray-500">No scene logs yet. Click &quot;Generate Scene Logs&quot; to create the treatment.</p>
        )}

        {/* Skeleton Loading */}
        {generating && sceneLogs.length === 0 && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-lg bg-gray-800 p-4">
                <div className="mb-2 h-4 w-48 rounded bg-gray-700" />
                <div className="h-3 w-full rounded bg-gray-700" />
                <div className="mt-1 h-3 w-3/4 rounded bg-gray-700" />
              </div>
            ))}
          </div>
        )}

        {/* Grouped Scene Logs */}
        <div className="space-y-3">
          {Object.entries(grouped).map(([seqStr, logs]) => {
            const seq = parseInt(seqStr)
            const isCollapsed = collapsed[seq]
            const firstScene = logs[0]?.scene_number ?? 0
            const lastScene = logs[logs.length - 1]?.scene_number ?? 0
            const seqTitle = logs[0]?.sequence_title ?? `Sequence ${seq}`

            return (
              <div key={seq} className={`rounded-lg border border-gray-800 ${SEQUENCE_COLORS[(seq - 1) % 8]}`}>
                <button
                  onClick={() => toggleCollapse(seq)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-gray-800 px-2 py-0.5 text-xs font-bold text-gray-300">SEQ {seq}</span>
                    <span className="text-sm font-medium text-gray-200">{seqTitle}</span>
                    <span className="text-xs text-gray-500">(S#{firstScene} ~ S#{lastScene})</span>
                  </div>
                  <span className="text-xs text-gray-500">{isCollapsed ? "\u25B6" : "\u25BC"}</span>
                </button>

                {!isCollapsed && (
                  <div className="space-y-2 px-4 pb-4">
                    {logs.map((log) => (
                      <div key={log.scene_number} className="rounded-lg bg-gray-950 p-3">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs font-bold text-blue-400">
                            S#{log.scene_number}
                          </span>
                          <span className="text-sm text-gray-300">{log.location}</span>
                          <span className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-gray-400">
                            {log.time_of_day}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">{log.summary}</p>

                        {/* Breakdown Badges */}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {log.breakdown?.cast?.map((c) => (
                            <span key={c} className="rounded bg-red-500/15 px-1.5 py-0.5 text-xs text-red-400">{c}</span>
                          ))}
                          {log.breakdown?.props?.map((p) => (
                            <span key={p} className="rounded bg-orange-500/15 px-1.5 py-0.5 text-xs text-orange-400">{p}</span>
                          ))}
                          {log.breakdown?.location?.map((l) => (
                            <span key={l} className="rounded bg-green-500/15 px-1.5 py-0.5 text-xs text-green-400">{l}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Approve */}
      {sceneLogs.length > 0 && (
        <button
          onClick={onApprove}
          className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-green-700"
        >
          Approve &amp; Next Step &rarr;
        </button>
      )}
    </div>
  )
}

// ─── Step 4: Screenplay ───

function Step4Screenplay({
  draft, draftVersion, editingDraft, draftEdit, onDraftEditChange,
  onToggleEdit, onCancelEdit, activeScene, onSceneChange, onWriteNext, onApprove, generating,
}: {
  draft: string | null
  draftVersion: number
  editingDraft: boolean
  draftEdit: string
  onDraftEditChange: (v: string) => void
  onToggleEdit: () => void
  onCancelEdit: () => void
  activeScene: number
  onSceneChange: (n: number) => void
  onWriteNext: () => void
  onApprove: () => void
  generating: boolean
}) {
  // Extract scene numbers from draft text
  const sceneNumbers: number[] = []
  if (draft) {
    const matches = draft.matchAll(/S#(\d+)\./g)
    for (const match of matches) {
      const num = parseInt(match[1])
      if (!sceneNumbers.includes(num)) sceneNumbers.push(num)
    }
  }

  const formattedLines = draft ? parseScreenplayFormatting(draft) : []

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Screenplay</h2>
            <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
              Draft v{draftVersion}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onWriteNext}
              disabled={generating}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Writing...
                </span>
              ) : "Write Next 5 Scenes"}
            </button>
            {draft && (
              <button
                onClick={onToggleEdit}
                className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:text-white transition"
              >
                {editingDraft ? "Save" : "Edit"}
              </button>
            )}
            {editingDraft && (
              <button
                onClick={onCancelEdit}
                className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:text-white transition"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Scene Navigation */}
        {sceneNumbers.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {sceneNumbers.map((num) => (
              <button
                key={num}
                onClick={() => onSceneChange(num)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                  activeScene === num
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                }`}
              >
                S#{num}
              </button>
            ))}
          </div>
        )}

        {/* Draft Display */}
        {!draft && !generating && (
          <p className="text-sm text-gray-500">No draft yet. Click &quot;Write Next 5 Scenes&quot; to begin.</p>
        )}

        {generating && !draft && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-lg bg-gray-800 p-4">
                <div className="mb-2 h-4 w-32 rounded bg-gray-700" />
                <div className="h-3 w-full rounded bg-gray-700" />
                <div className="mt-1 h-3 w-5/6 rounded bg-gray-700" />
                <div className="mt-1 h-3 w-2/3 rounded bg-gray-700" />
              </div>
            ))}
          </div>
        )}

        {draft && editingDraft ? (
          <textarea
            value={draftEdit}
            onChange={(e) => onDraftEditChange(e.target.value)}
            rows={30}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 font-mono text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
          />
        ) : draft ? (
          <div className="rounded-lg bg-gray-950 p-6 font-mono text-sm leading-relaxed">
            {formattedLines.map((line, i) => {
              switch (line.type) {
                case "heading":
                  return (
                    <div key={i} className="mb-3 mt-6 first:mt-0">
                      <span className="mr-2 rounded bg-blue-500/20 px-2 py-0.5 text-xs font-bold text-blue-400">
                        {line.content.split(".")[0]}
                      </span>
                      <span className="font-bold text-gray-200">{line.content.split(".").slice(1).join(".").trim()}</span>
                    </div>
                  )
                case "action":
                  return <p key={i} className="my-1 text-gray-500 italic">{line.content}</p>
                case "character":
                  return <p key={i} className="mb-0.5 mt-3 font-bold text-yellow-400">{line.content}</p>
                case "dialogue":
                  return <p key={i} className="mb-2 pl-8 text-gray-200">{line.content}</p>
                case "camera":
                  return (
                    <div key={i} className="my-1">
                      <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-xs text-blue-400">{line.content}</span>
                    </div>
                  )
                default:
                  return <p key={i} className="my-1 text-gray-300">{line.content}</p>
              }
            })}
          </div>
        ) : null}
      </div>

      {/* Approve */}
      {draft && (
        <button
          onClick={onApprove}
          className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-green-700"
        >
          Approve &amp; Next Step &rarr;
        </button>
      )}
    </div>
  )
}

// ─── Step 5: Review ───

function Step5Review({
  review, feedbackText, onFeedbackChange, onApplyFeedback, onFinalize, generating,
}: {
  review: ReviewChecklist | null
  feedbackText: string
  onFeedbackChange: (v: string) => void
  onApplyFeedback: () => void
  onFinalize: () => void
  generating: boolean
}) {
  const checkIcon = (val: boolean) => val ? "\u2705" : "\u274C"

  return (
    <div className="space-y-6">
      {/* Checklist */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 text-lg font-semibold">Review Checklist</h2>

        {review ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg bg-gray-950 px-4 py-3">
              <span className="text-lg">{checkIcon(review.character_consistency)}</span>
              <span className="text-sm text-gray-300">Character Consistency</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-gray-950 px-4 py-3">
              <span className="text-lg">{checkIcon(review.master_scene_format)}</span>
              <span className="text-sm text-gray-300">Master Scene Format</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-gray-950 px-4 py-3">
              <span className="text-lg">{review.scene_count >= review.target_scenes ? "\u2705" : "\u274C"}</span>
              <span className="text-sm text-gray-300">
                Scene Count: {review.scene_count} / {review.target_scenes}
              </span>
              <div className="ml-auto h-2 w-32 overflow-hidden rounded-full bg-gray-800">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${Math.min(100, (review.scene_count / review.target_scenes) * 100)}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-gray-950 px-4 py-3">
              <span className="text-lg">{checkIcon(review.pacing_check)}</span>
              <span className="text-sm text-gray-300">Pacing Check</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Review data will appear after the draft is analyzed.</p>
        )}
      </div>

      {/* Feedback */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-2 text-lg font-semibold">Feedback</h2>
        <p className="mb-3 text-sm text-gray-400">
          Provide feedback for AI to revise the screenplay.
        </p>
        <textarea
          value={feedbackText}
          onChange={(e) => onFeedbackChange(e.target.value)}
          rows={5}
          placeholder="Enter your feedback for revision..."
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
        <div className="mt-3 flex gap-3">
          <button
            onClick={onApplyFeedback}
            disabled={generating || !feedbackText.trim()}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Applying...
              </span>
            ) : "Apply Feedback"}
          </button>
          <button
            onClick={onFinalize}
            className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-green-700"
          >
            Finalize &rarr; Generate DirectionPlan
          </button>
        </div>
      </div>
    </div>
  )
}
