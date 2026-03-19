"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { fetchAPI } from "../../../../lib/api"
import { AssetGallery } from "../../../../components/asset-gallery"

// ─── Types ───

interface Scene {
  scene_number: number
  setting: string
  time_of_day: string
  camera_angle: string
  action_description: string
  dialogue: string | null
  image_prompt: string
  video_prompt: string
}

interface DirectionPlan {
  title: string
  logline: string
  genre: string
  target_audience: string
  planning_intent: string
  worldview_settings: string
  character_settings: string
  global_audio_concept: string
  scenes: Scene[]
}

interface PipelineRun {
  id: string
  status: string
  current_step: string | null
  progress: number
  steps: string[]
  step_results: Record<string, { status: string; message?: string; error?: string }>
  started_at: string | null
  completed_at: string | null
}

interface Project {
  id: string
  title: string
  genre: string
  logline: string
  status: string
  progress: number
  idea: string
  protagonist: string | null
  antagonist: string | null
  worldview: string | null
  direction_plan_json: DirectionPlan | null
  created_at: string
  updated_at: string
}

// ─── Constants ───

type Phase = "development" | "pre-production" | "production" | "post-production"

const PHASES: { key: Phase; label: string; icon: string }[] = [
  { key: "development", label: "Development", icon: "📝" },
  { key: "pre-production", label: "Pre-Production", icon: "🎨" },
  { key: "production", label: "Production", icon: "🎥" },
  { key: "post-production", label: "Post-Production", icon: "🎬" },
]

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-green-500/20 text-green-400",
  completed: "bg-green-500/20 text-green-400",
  RUNNING: "bg-blue-500/20 text-blue-400",
  running: "bg-blue-500/20 text-blue-400",
  QUEUED: "bg-yellow-500/20 text-yellow-400",
  queued: "bg-yellow-500/20 text-yellow-400",
  FAILED: "bg-red-500/20 text-red-400",
  failed: "bg-red-500/20 text-red-400",
  DRAFT: "bg-gray-500/20 text-gray-400",
}

function getPhaseFromStatus(status: string): Phase {
  switch (status) {
    case "PRE_PRODUCTION": return "pre-production"
    case "MAIN_PRODUCTION": return "production"
    case "POST_PRODUCTION": return "post-production"
    case "COMPLETED": return "post-production"
    default: return "development"
  }
}

// ─── Main Component ───

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [activePhase, setActivePhase] = useState<Phase | null>(null) // null = not yet decided
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [runningPipeline, setRunningPipeline] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({ title: "", genre: "", logline: "", idea: "" })
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refreshProject = useCallback(() => {
    return fetchAPI<Project>(`/api/projects/${id}`)
      .then(setProject)
      .catch((err: Error) => setError(err.message))
  }, [id])

  // Initial load — set active tab based on project data
  useEffect(() => {
    fetchAPI<Project>(`/api/projects/${id}`)
      .then((p) => {
        setProject(p)
        setActivePhase(p.direction_plan_json ? "pre-production" : "development")
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))

    fetchAPI<{ runs: PipelineRun[] }>(`/api/pipeline/${id}/runs`)
      .then((data) => setRuns(data.runs ?? []))
      .catch(() => {})

    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  // eslint-disable-next-line
  }, [id])

  const pollRuns = () => {
    fetchAPI<{ runs: PipelineRun[] }>(`/api/pipeline/${id}/runs`)
      .then((data) => {
        setRuns(data.runs ?? [])
        const hasActive = (data.runs ?? []).some(
          (r) => r.status === "running" || r.status === "RUNNING" || r.status === "queued" || r.status === "QUEUED",
        )
        if (!hasActive && pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
          setRunningPipeline(false)
          refreshProject()
        }
      })
      .catch(() => {})
  }

  const runPipeline = async (steps: string[]) => {
    setRunningPipeline(true)
    setError(null)
    try {
      await fetchAPI(`/api/pipeline/${id}/run`, {
        method: "POST",
        body: JSON.stringify({ steps, idea: project?.idea }),
      })
      pollRuns()
      if (pollingRef.current) clearInterval(pollingRef.current)
      pollingRef.current = setInterval(pollRuns, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pipeline error")
      setRunningPipeline(false)
    }
  }

  const saveProject = async () => {
    try {
      const updated = await fetchAPI<Project>(`/api/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(editData),
      })
      setProject(updated)
      setEditMode(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Loading project...</div>
  if (!project) return <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error ?? "Project not found"}</div>

  const plan = project.direction_plan_json
  const hasDirectionPlan = !!plan
  const activeRun = runs.find((r) => r.status === "running" || r.status === "RUNNING")

  return (
    <div className="max-w-6xl">
      {/* Back button */}
      <button onClick={() => router.push("/projects")} className="mb-4 text-sm text-gray-400 hover:text-white">
        &larr; Back to Projects
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{project.title}</h1>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-sm text-gray-400">{project.genre}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[project.status] ?? STATUS_COLORS.DRAFT}`}>
                {project.status}
              </span>
            </div>
          </div>
        </div>
        {project.logline && <p className="mt-2 text-sm text-gray-400">{project.logline}</p>}
      </div>

      {/* Phase Progress Tracker */}
      <div className="mb-6 flex items-center gap-0 rounded-xl border border-gray-800 bg-gray-900/50 p-1">
        {PHASES.map((phase, i) => {
          const phaseIndex = PHASES.findIndex((p) => p.key === getPhaseFromStatus(project.status))
          const currentIndex = PHASES.findIndex((p) => p.key === activePhase)
          const isCompleted = i < phaseIndex || (project.status === "COMPLETED" && i <= 3)
          const isCurrent = phase.key === activePhase
          const isLocked = !hasDirectionPlan && i > 0

          return (
            <button
              key={phase.key}
              onClick={() => !isLocked && setActivePhase(phase.key)}
              disabled={isLocked}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                isCurrent
                  ? "bg-gray-800 text-white shadow-lg"
                  : isCompleted
                    ? "text-green-400 hover:bg-gray-800/50"
                    : isLocked
                      ? "cursor-not-allowed text-gray-600"
                      : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
              }`}
            >
              <span>{isCompleted && !isCurrent ? "✅" : isLocked ? "🔒" : phase.icon}</span>
              <span className="hidden sm:inline">{phase.label}</span>
            </button>
          )
        })}
      </div>

      {/* Active Pipeline Run */}
      {activeRun && (
        <div className="mb-6 rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
          <div className="mb-2 flex items-center gap-3">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            <span className="text-sm font-medium">Pipeline Running</span>
            <span className="text-sm text-gray-400">Step: {activeRun.current_step}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
            <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${Math.round(activeRun.progress)}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {activeRun.steps.map((step) => {
              const result = activeRun.step_results[step]
              const icon = result?.status === "completed" ? "✅" : result?.status === "running" ? "⏳" : result?.status === "failed" ? "❌" : "⬜"
              return <span key={step} className="flex items-center gap-1 rounded bg-gray-800 px-2 py-1 text-xs">{icon} {step}</span>
            })}
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activePhase === "development" && (
        <DevelopmentTab
          project={project}
          editMode={editMode}
          editData={editData}
          onEditStart={() => {
            setEditMode(true)
            setEditData({ title: project.title, genre: project.genre, logline: project.logline, idea: project.idea })
          }}
          onEditChange={setEditData}
          onEditSave={saveProject}
          onEditCancel={() => setEditMode(false)}
          onRunScriptWriter={() => runPipeline(["script_writer"])}
          runningPipeline={runningPipeline}
          error={error}
        />
      )}

      {activePhase === "pre-production" && (
        <PreProductionTab
          plan={plan}
          onRunConceptArtist={() => runPipeline(["concept_artist"])}
          runningPipeline={runningPipeline}
          projectId={id}
        />
      )}

      {activePhase === "production" && (
        <ProductionTab
          plan={plan}
          onRunCinematographer={() => runPipeline(["cinematographer"])}
          onRunGeneralist={() => runPipeline(["generalist"])}
          runningPipeline={runningPipeline}
          projectId={id}
        />
      )}

      {activePhase === "post-production" && (
        <PostProductionTab
          plan={plan}
          onRunSoundDesigner={() => runPipeline(["sound_designer"])}
          onRunMasterEditor={() => runPipeline(["master_editor"])}
          runningPipeline={runningPipeline}
          projectId={id}
        />
      )}

      {/* Past Pipeline Runs */}
      {runs.length > 0 && !activeRun && (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-medium text-gray-400">Pipeline History</h3>
          <div className="space-y-2">
            {runs.slice(0, 5).map((run) => (
              <div key={run.id} className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-2.5 text-sm">
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[run.status] ?? STATUS_COLORS.DRAFT}`}>{run.status}</span>
                  <span className="text-gray-400">{run.steps.join(" → ")}</span>
                </div>
                <span className="text-xs text-gray-500">{run.started_at ? new Date(run.started_at).toLocaleString() : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Development Tab ───

function DevelopmentTab({
  project, editMode, editData, onEditStart, onEditChange, onEditSave, onEditCancel, onRunScriptWriter, runningPipeline, error,
}: {
  project: Project
  editMode: boolean
  editData: { title: string; genre: string; logline: string; idea: string }
  onEditStart: () => void
  onEditChange: (data: { title: string; genre: string; logline: string; idea: string }) => void
  onEditSave: () => void
  onEditCancel: () => void
  onRunScriptWriter: () => void
  runningPipeline: boolean
  error: string | null
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Project Information</h2>
          {!editMode && (
            <button onClick={onEditStart} className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:text-white">
              Edit
            </button>
          )}
        </div>

        {editMode ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Title</label>
              <input value={editData.title} onChange={(e) => onEditChange({ ...editData, title: e.target.value })} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Genre</label>
              <input value={editData.genre} onChange={(e) => onEditChange({ ...editData, genre: e.target.value })} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Logline</label>
              <input value={editData.logline} onChange={(e) => onEditChange({ ...editData, logline: e.target.value })} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Idea</label>
              <textarea value={editData.idea} onChange={(e) => onEditChange({ ...editData, idea: e.target.value })} rows={4} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={onEditSave} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Save</button>
              <button onClick={onEditCancel} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <div><span className="text-gray-500">Title:</span> <span>{project.title}</span></div>
            <div><span className="text-gray-500">Genre:</span> <span>{project.genre}</span></div>
            <div><span className="text-gray-500">Logline:</span> <span>{project.logline || "—"}</span></div>
            <div><span className="text-gray-500">Idea:</span> <span>{project.idea || "—"}</span></div>
          </div>
        )}
      </div>

      {/* Screenplay Development Link */}
      <Link
        href={`/projects/${project.id}/screenplay`}
        className="block rounded-xl border border-purple-500/30 bg-purple-500/5 p-6 transition hover:border-purple-500/50 hover:bg-purple-500/10"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">📖</span>
          <div>
            <h2 className="text-lg font-semibold">시나리오 개발 (Screenplay Development)</h2>
            <p className="mt-1 text-sm text-gray-400">
              5단계 워크플로우: 기획 → 인물설계 → 트리트먼트 → 집필 → 피드백
            </p>
          </div>
          <span className="ml-auto text-gray-500">→</span>
        </div>
      </Link>

      {/* ScriptWriter Action */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-2 text-lg font-semibold">Generate Direction Plan</h2>
        <p className="mb-4 text-sm text-gray-400">
          AI ScriptWriter가 아이디어를 기반으로 씬별 연출기획안(DirectionPlan)을 자동 생성합니다.
          각 씬에 대한 image_prompt, video_prompt, 대사, 카메라 설정이 포함됩니다.
        </p>
        {project.direction_plan_json && (
          <p className="mb-4 text-sm text-green-400">
            ✅ Direction Plan 생성 완료 ({project.direction_plan_json.scenes.length}개 씬) — 재실행하면 덮어쓰기됩니다.
          </p>
        )}
        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
        <button
          onClick={onRunScriptWriter}
          disabled={runningPipeline || !project.idea}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {runningPipeline ? "Generating..." : project.direction_plan_json ? "Re-generate Direction Plan" : "Generate Direction Plan"}
        </button>
        {!project.idea && <p className="mt-2 text-xs text-yellow-400">아이디어를 먼저 입력하세요.</p>}
      </div>
    </div>
  )
}

// ─── Pre-Production Tab ───

function PreProductionTab({
  plan, onRunConceptArtist, runningPipeline, projectId,
}: {
  plan: DirectionPlan | null
  onRunConceptArtist: () => void
  runningPipeline: boolean
  projectId: string
}) {
  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-800 bg-gray-900 py-16">
        <p className="text-lg text-gray-400">Direction Plan이 필요합니다</p>
        <p className="mt-1 text-sm text-gray-500">Development 탭에서 먼저 Direction Plan을 생성하세요.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Direction Plan Overview */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-1 text-lg font-semibold">Direction Plan</h2>
        <p className="mb-4 text-sm text-gray-500">{plan.scenes.length} scenes | {plan.genre} | {plan.global_audio_concept}</p>

        <div className="space-y-3">
          {plan.scenes.map((scene) => (
            <div key={scene.scene_number} className="rounded-lg border border-gray-800 bg-gray-950 p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs font-bold text-blue-400">S#{scene.scene_number}</span>
                <span className="text-sm font-medium">{scene.setting}</span>
                <span className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-gray-400">{scene.time_of_day}</span>
                <span className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-gray-500">{scene.camera_angle}</span>
              </div>
              <p className="text-sm text-gray-300">{scene.action_description}</p>
              {scene.dialogue && (
                <p className="mt-2 border-l-2 border-yellow-500/50 pl-3 text-sm italic text-yellow-400/80">{scene.dialogue}</p>
              )}
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-300">AI Prompts</summary>
                <div className="mt-2 space-y-1 text-xs text-gray-500">
                  <p><span className="font-medium text-gray-400">Image:</span> {scene.image_prompt}</p>
                  <p><span className="font-medium text-gray-400">Video:</span> {scene.video_prompt}</p>
                </div>
              </details>
            </div>
          ))}
        </div>
      </div>

      {/* Storyboard Generation */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-2 text-lg font-semibold">Storyboard Generation</h2>
        <p className="mb-4 text-sm text-gray-400">
          AI ConceptArtist가 각 씬의 image_prompt를 기반으로 스토리보드 이미지를 생성합니다.
          스타일: Webtoon, Photorealistic, Anime, Noir, Concept Art
        </p>
        <button
          onClick={onRunConceptArtist}
          disabled={runningPipeline}
          className="rounded-lg bg-purple-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-purple-700 disabled:opacity-50"
        >
          {runningPipeline ? "Generating..." : "Generate Storyboards"}
        </button>
      </div>

      {/* Storyboard Gallery */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 text-lg font-semibold">Storyboard Gallery</h2>
        <AssetGallery projectId={projectId} filter="IMAGE" />
      </div>
    </div>
  )
}

// ─── Production Tab ───

function ProductionTab({
  plan, onRunCinematographer, onRunGeneralist, runningPipeline, projectId,
}: {
  plan: DirectionPlan | null
  onRunCinematographer: () => void
  onRunGeneralist: () => void
  runningPipeline: boolean
  projectId: string
}) {
  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-800 bg-gray-900 py-16">
        <p className="text-lg text-gray-400">Pre-Production을 먼저 완료하세요</p>
        <p className="mt-1 text-sm text-gray-500">Direction Plan이 필요합니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Cinematography */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs font-bold text-blue-400">Step 1</span>
          <h2 className="text-lg font-semibold">Cinematography Enhancement</h2>
        </div>
        <p className="mb-4 text-sm text-gray-400">
          AI Cinematographer가 각 씬의 video_prompt를 전문 촬영감독 관점에서 강화합니다.
          렌즈 선택, 조명 설계, 카메라 무빙, 컬러 팔레트 디테일이 추가됩니다.
        </p>
        <button
          onClick={onRunCinematographer}
          disabled={runningPipeline}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {runningPipeline ? "Enhancing..." : "Enhance Video Prompts"}
        </button>
      </div>

      {/* Step 2: Video Generation */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded bg-green-500/20 px-2 py-0.5 text-xs font-bold text-green-400">Step 2</span>
          <h2 className="text-lg font-semibold">AI Video Generation</h2>
        </div>
        <p className="mb-4 text-sm text-gray-400">
          AI Generalist가 Veo 3.0을 통해 씬별 비디오 클립을 생성합니다.
          각 씬의 video_prompt를 기반으로 8초 분량의 AI 영상이 제작됩니다.
        </p>
        <button
          onClick={onRunGeneralist}
          disabled={runningPipeline}
          className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
        >
          {runningPipeline ? "Generating..." : "Generate Scene Videos"}
        </button>
        <p className="mt-2 text-xs text-gray-500">Veo 3.0 REST API 연동 완료 — 씬당 약 60초 소요</p>
      </div>

      {/* Video Gallery */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 text-lg font-semibold">Generated Videos</h2>
        <AssetGallery projectId={projectId} filter="VIDEO" />
      </div>
    </div>
  )
}

// ─── Post-Production Tab ───

function PostProductionTab({
  plan, onRunSoundDesigner, onRunMasterEditor, runningPipeline, projectId,
}: {
  plan: DirectionPlan | null
  onRunSoundDesigner: () => void
  onRunMasterEditor: () => void
  runningPipeline: boolean
  projectId: string
}) {
  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-800 bg-gray-900 py-16">
        <p className="text-lg text-gray-400">Production을 먼저 완료하세요</p>
      </div>
    )
  }

  const dialogueScenes = plan.scenes.filter((s) => s.dialogue)

  return (
    <div className="space-y-6">
      {/* Step 1: Sound Design */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded bg-yellow-500/20 px-2 py-0.5 text-xs font-bold text-yellow-400">Step 1</span>
          <h2 className="text-lg font-semibold">Sound Design & TTS</h2>
        </div>
        <p className="mb-4 text-sm text-gray-400">
          AI SoundDesigner가 각 씬의 대사를 Gemini TTS로 음성 생성합니다.
          {dialogueScenes.length > 0
            ? ` ${dialogueScenes.length}개 씬에 대사가 있습니다.`
            : " (대사가 있는 씬이 없습니다)"}
        </p>
        <button
          onClick={onRunSoundDesigner}
          disabled={runningPipeline || dialogueScenes.length === 0}
          className="rounded-lg bg-yellow-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-yellow-700 disabled:opacity-50"
        >
          {runningPipeline ? "Generating..." : "Generate Dialogue Audio"}
        </button>
      </div>

      {/* Step 2: Video Editing */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded bg-orange-500/20 px-2 py-0.5 text-xs font-bold text-orange-400">Step 2</span>
          <h2 className="text-lg font-semibold">Master Edit</h2>
        </div>
        <p className="mb-4 text-sm text-gray-400">
          AI MasterEditor가 FFMPEG를 이용하여 개별 씬 영상을 하나의 마스터 영상으로 병합합니다.
        </p>
        <button
          onClick={onRunMasterEditor}
          disabled={runningPipeline}
          className="rounded-lg bg-orange-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-orange-700 disabled:opacity-50"
        >
          {runningPipeline ? "Merging..." : "Merge Videos"}
        </button>
      </div>

      {/* Audio & Video Assets */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 text-lg font-semibold">Generated Assets</h2>
        <AssetGallery projectId={projectId} />
      </div>
    </div>
  )
}
