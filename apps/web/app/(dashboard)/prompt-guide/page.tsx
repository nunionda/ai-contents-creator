"use client"

import { useState } from "react"
import { fetchAPI } from "../../../lib/api"

// ─── Types ───

interface PromptBreakdown {
  subject?: string
  environment?: string
  camera?: string
  lighting?: string
  style?: string
  action?: string
  audio?: string
}

interface ImageGenResult {
  imagePrompt: string
  negativePrompt: string
  parameters: Record<string, string>
  breakdown: PromptBreakdown
  tips: string[]
  model: string
  modelInfo: { name: string; strengths: string[] }
}

interface VideoGenResult {
  videoPrompt: string
  parameters: Record<string, string>
  breakdown: PromptBreakdown
  tips: string[]
  storyboardNote: string
  model: string
  modelInfo: { name: string; strengths: string[] }
}

interface AnalyzeResult {
  scores: {
    specificity: number
    composition: number
    atmosphere: number
    motion: number
    style_consistency: number
  }
  feedback: string
  improved: string
  modelFit: string
}

interface OptimizeResult {
  optimized: Record<
    string,
    { prompt: string; negativePrompt: string; parameters: Record<string, string>; notes: string }
  >
  comparison: string
}

// ─── Model Data ───

interface ImageModelInfo {
  key: string
  name: string
  provider: string
  elo: number | null
  huggingface: string | null
  strengths: string[]
  weaknesses: string[]
  promptTips: string
  aspectRatios: string[]
  maxPromptLength: number
  available: boolean
  color: string
}

interface VideoModelInfo {
  key: string
  name: string
  provider: string
  elo: number | null
  huggingface: string | null
  strengths: string[]
  weaknesses: string[]
  promptTips: string
  maxDuration: number
  resolution: string
  available: boolean
  color: string
}

const IMAGE_MODELS: ImageModelInfo[] = [
  {
    key: "gemini",
    name: "Google Imagen 3",
    provider: "gemini",
    elo: null,
    huggingface: null,
    strengths: ["텍스트 렌더링 우수", "사실적 인물", "복잡한 구도", "한국어 지원"],
    weaknesses: ["스타일 일관성 약함", "극단적 종횡비 제한"],
    promptTips: "자연어 max 480토큰. 주제+맥락+스타일 구조. 텍스트 25자 이하, 3구문 이하. enhancePrompt 옵션 활용.",
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
    maxPromptLength: 4000,
    available: true,
    color: "blue",
  },
  {
    key: "midjourney",
    name: "Midjourney v7",
    provider: "midjourney",
    elo: 1093,
    huggingface: null,
    strengths: ["아트 디렉션 최강", "일관된 스타일", "미적 감각 탁월", "시네마틱"],
    weaknesses: ["API 공식 미지원", "텍스트 렌더링 약함", "구독 전용"],
    promptTips: "자연어 권장 (v7). --ar 21:9 --s 500 --c 50 파라미터. ::가중치 멀티프롬프트. --sref 스타일참조. --oref 캐릭터 일관성.",
    aspectRatios: ["1:1", "16:9", "21:9", "2:3", "3:2", "4:7"],
    maxPromptLength: 6000,
    available: false,
    color: "purple",
  },
  {
    key: "flux",
    name: "Flux 1.1 Pro / 2.0",
    provider: "huggingface",
    elo: 1143,
    huggingface: "black-forest-labs/FLUX.1-dev",
    strengths: ["ELO 2위", "텍스트 렌더링 우수", "프롬프트 준수 94%", "HuggingFace"],
    weaknesses: ["Pro는 유료 API", "dev는 비상업 라이선스"],
    promptTips: "자연어 서술형. 핵심 요구사항 앞배치. 100단어 이내 최적. HEX 색상 코드 지원. Schnell 1-4스텝 고속.",
    aspectRatios: ["1:1", "16:9", "9:16", "21:9"],
    maxPromptLength: 2000,
    available: true,
    color: "green",
  },
  {
    key: "dalle3",
    name: "DALL-E 3 / GPT Image",
    provider: "openai",
    elo: 1264,
    huggingface: null,
    strengths: ["ELO 1위 (GPT Image)", "프롬프트 이해도 최고", "텍스트 렌더링 최강"],
    weaknesses: ["스타일 통제 제한", "부정 프롬프트 미지원", "콘텐츠 필터 엄격"],
    promptTips: "순수 자연어. 내부 리라이팅됨. 제외 항목은 'without...'으로 명시. vivid/natural 스타일 선택.",
    aspectRatios: ["1:1", "16:9", "9:16"],
    maxPromptLength: 4000,
    available: false,
    color: "teal",
  },
  {
    key: "sdxl",
    name: "SD 3.5 / SDXL",
    provider: "huggingface",
    elo: null,
    huggingface: "stabilityai/stable-diffusion-3.5-large",
    strengths: ["완전 오픈소스", "LoRA/ControlNet", "로컬 실행", "무제한 커스터마이징"],
    weaknesses: ["기본 품질 낮음", "프롬프트 엔지니어링 필수", "GPU 필요"],
    promptTips: "긍정+부정 프롬프트 필수. (keyword:1.2) 가중치 문법 (max 1.6). 토큰 77개 제한. CFG 7-12.",
    aspectRatios: ["1:1", "16:9", "2:3", "3:2"],
    maxPromptLength: 500,
    available: true,
    color: "orange",
  },
  {
    key: "leonardo",
    name: "Leonardo Phoenix",
    provider: "leonardo",
    elo: null,
    huggingface: null,
    strengths: ["게임/판타지 특화", "실시간 캔버스", "캐릭터 일관성", "Alchemy 모드"],
    weaknesses: ["사실적 사진 약함", "크레딧 기반 과금"],
    promptTips: "주제+매체+스타일+구도+조명 순서. 앞부분 가중치 높음. Alchemy 토글로 품질 향상. PhotoReal v2 사실적 모드.",
    aspectRatios: ["1:1", "16:9", "2:3", "4:3"],
    maxPromptLength: 1500,
    available: false,
    color: "pink",
  },
]

const VIDEO_MODELS: VideoModelInfo[] = [
  {
    key: "gemini_veo",
    name: "Google Veo 3.1",
    provider: "gemini",
    elo: 1226,
    huggingface: null,
    strengths: ["ELO 2위", "네이티브 오디오/대사", "립싱크 최강", "1분+ 가능"],
    weaknesses: ["Google 생태계 종속", "8초 기본", "커뮤니티 도구 부족"],
    promptTips: "감독 노트 스타일. 5파트: [촬영]+[주체]+[동작]+[배경]+[스타일]. 대사는 짧게 (8초 내). 오디오 별도 문장.",
    maxDuration: 8,
    resolution: "1080p",
    available: true,
    color: "blue",
  },
  {
    key: "kling",
    name: "Kling AI 3.0",
    provider: "kling",
    elo: 1150,
    huggingface: null,
    strengths: ["15초 긴 영상", "멀티샷 (6앵글)", "네이티브 대사", "가성비 최고"],
    weaknesses: ["콘텐츠 필터 엄격", "구버전 물리 약함"],
    promptTips: "Scene→Characters→Action→Camera→Audio 순서. 카메라 모션 종점 명시. 요소 3-5개 이내. 영어 프롬프트.",
    maxDuration: 15,
    resolution: "1080p",
    available: true,
    color: "cyan",
  },
  {
    key: "runway_gen4",
    name: "Runway Gen-4.5",
    provider: "runway",
    elo: 1247,
    huggingface: null,
    strengths: ["ELO 1위", "광고/상업 품질", "Motion Brush", "이미지→비디오 최강"],
    weaknesses: ["비싼 크레딧", "짧은 클립", "참조 이미지 필요"],
    promptTips: "[Camera] shot of [subject] [action] in [environment]. 부정 표현 금지. 시각적 언어 중심. 단순 동작=5초, 복잡=10초.",
    maxDuration: 10,
    resolution: "1080p",
    available: false,
    color: "purple",
  },
  {
    key: "pika",
    name: "Pika 2.0",
    provider: "pika",
    elo: null,
    huggingface: null,
    strengths: ["입문자 친화", "빠른 생성", "Lip Sync", "Pikaffects 특수효과"],
    weaknesses: ["낮은 리얼리즘", "짧은 클립", "복잡한 동작 약함"],
    promptTips: "단일 동작 집중. 스타일 명확히 명시. 루프 비주얼/SNS 콘텐츠에 최적.",
    maxDuration: 4,
    resolution: "1080p",
    available: false,
    color: "pink",
  },
  {
    key: "minimax",
    name: "MiniMax / Hailuo 2.3",
    provider: "minimax",
    elo: null,
    huggingface: null,
    strengths: ["무료 티어", "자연스러운 인물", "다양한 아트 스타일", "오디오 동기화"],
    weaknesses: ["1080p는 6초 제한", "서양 시장 약함"],
    promptTips: "[카메라+동선]+[주체+묘사]+[동작]+[배경+묘사]+[조명]+[스타일/무드]. 스토리텔링 중심. 참조 이미지 멀티모달.",
    maxDuration: 10,
    resolution: "1080p",
    available: true,
    color: "amber",
  },
  {
    key: "luma",
    name: "Luma Dream Machine 1.5",
    provider: "luma",
    elo: null,
    huggingface: null,
    strengths: ["3D 공간 이해", "물리 시뮬레이션", "카메라 궤적", "@character 일관성"],
    weaknesses: ["인물 디테일 약함", "스타일 일관성 부족", "모션 제어 약함"],
    promptTips: "자연어 3-4문장. @character/@style 태그로 일관성. Enhance Prompt 항상 활성화. 사실적 콘텐츠에 최적.",
    maxDuration: 5,
    resolution: "1080p",
    available: false,
    color: "indigo",
  },
]

const CAMERA_MOVEMENTS = [
  "Static", "Pan left", "Pan right", "Tilt up", "Tilt down",
  "Dolly in", "Dolly out", "Crane up", "Crane down",
  "Steadicam follow", "Handheld", "Orbit", "Zoom in", "Zoom out",
]

const IMAGE_EXAMPLES = [
  {
    title: "네오누아르 도시 추격",
    scene: "비 내리는 밤, 네온사인이 반짝이는 도심 골목에서 탐정이 용의자를 추격하는 장면",
    gemini:
      "A private detective in a long trenchcoat sprints through a rain-soaked neon-lit alleyway at night. Puddles reflect magenta and cyan neon signs from Korean shop fronts. Shot on ARRI Alexa with 35mm anamorphic lens, slight Dutch angle. Low-key lighting with neon rim lights cutting through steam and rain. Neo-noir cinematic style, high contrast, film grain, teal-orange color grade.",
    midjourney:
      "detective chasing suspect, rain-soaked neon alley, Korean signs, puddle reflections, magenta cyan neon glow, anamorphic bokeh, film noir, cinematic, dramatic rim lighting, rain droplets, 35mm film grain --ar 21:9 --style raw --v 6.1",
    kling:
      "A detective in a trenchcoat running through a narrow alley. Neon signs glow in the rain. Puddles splash with each step. Camera follows from behind in steadicam movement. Dark neo-noir atmosphere with high contrast neon lighting.",
  },
  {
    title: "SF 우주 정거장 내부",
    scene: "거대한 우주 정거장의 관제실에서 승무원들이 미지의 신호를 분석하는 장면",
    gemini:
      "Inside a massive space station control room, crew members huddle around holographic displays showing an unknown signal pattern. The room is bathed in cool blue ambient light from translucent screens, with warm orange warning indicators pulsing. Wide angle shot on 14mm lens, deep depth of field. Volumetric light beams cut through the sterile atmosphere. Hard sci-fi aesthetic inspired by Blade Runner 2049, clean futuristic design with practical lighting.",
    midjourney:
      "space station control room interior, holographic displays, unknown signal analysis, crew silhouettes, blue ambient glow, orange warning lights, volumetric light beams, hard sci-fi, futuristic clean design, cinematic wide shot, ultra detailed --ar 21:9 --style raw --v 6.1",
    kling:
      "Crew members inside a futuristic space station control room analyzing holographic data displays. Blue ambient lighting with pulsing orange warnings. Camera slowly dollies forward through the room. Hard science fiction atmosphere, clean metallic surfaces.",
  },
]

const NAV_SECTIONS = [
  { id: "formula", label: "프롬프트 공식" },
  { id: "models-image", label: "이미지 모델" },
  { id: "models-video", label: "비디오 모델" },
  { id: "generator", label: "AI 생성" },
  { id: "analyzer", label: "품질 분석" },
  { id: "optimizer", label: "멀티 최적화" },
  { id: "examples", label: "예시 비교" },
]

// ─── Color utility ───

function colorClass(color: string, variant: "border" | "bg" | "text" | "ring"): string {
  const map: Record<string, Record<string, string>> = {
    blue: { border: "border-blue-500/30", bg: "bg-blue-950/20", text: "text-blue-400", ring: "ring-blue-500" },
    purple: { border: "border-purple-500/30", bg: "bg-purple-950/20", text: "text-purple-400", ring: "ring-purple-500" },
    green: { border: "border-green-500/30", bg: "bg-green-950/20", text: "text-green-400", ring: "ring-green-500" },
    teal: { border: "border-teal-500/30", bg: "bg-teal-950/20", text: "text-teal-400", ring: "ring-teal-500" },
    orange: { border: "border-orange-500/30", bg: "bg-orange-950/20", text: "text-orange-400", ring: "ring-orange-500" },
    pink: { border: "border-pink-500/30", bg: "bg-pink-950/20", text: "text-pink-400", ring: "ring-pink-500" },
    cyan: { border: "border-cyan-500/30", bg: "bg-cyan-950/20", text: "text-cyan-400", ring: "ring-cyan-500" },
    amber: { border: "border-amber-500/30", bg: "bg-amber-950/20", text: "text-amber-400", ring: "ring-amber-500" },
    indigo: { border: "border-indigo-500/30", bg: "bg-indigo-950/20", text: "text-indigo-400", ring: "ring-indigo-500" },
  }
  return map[color]?.[variant] ?? ""
}

// ─── Component ───

export default function PromptGuidePage() {
  // Generator state
  const [genTab, setGenTab] = useState<"image" | "video">("image")
  const [genScene, setGenScene] = useState("")
  const [genImageModel, setGenImageModel] = useState("gemini")
  const [genVideoModel, setGenVideoModel] = useState("gemini_veo")
  const [genStyle, setGenStyle] = useState("")
  const [genAspect, setGenAspect] = useState("")
  const [genDuration, setGenDuration] = useState("")
  const [genCamera, setGenCamera] = useState("")
  const [genLoading, setGenLoading] = useState(false)
  const [genImageResult, setGenImageResult] = useState<ImageGenResult | null>(null)
  const [genVideoResult, setGenVideoResult] = useState<VideoGenResult | null>(null)
  const [genError, setGenError] = useState<string | null>(null)

  // Analyzer state
  const [analyzeInput, setAnalyzeInput] = useState("")
  const [analyzeType, setAnalyzeType] = useState<"image" | "video">("image")
  const [analyzeLoading, setAnalyzeLoading] = useState(false)
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  // Optimizer state
  const [optInput, setOptInput] = useState("")
  const [optType, setOptType] = useState<"image" | "video">("image")
  const [optModels, setOptModels] = useState<string[]>([])
  const [optLoading, setOptLoading] = useState(false)
  const [optResult, setOptResult] = useState<OptimizeResult | null>(null)
  const [optError, setOptError] = useState<string | null>(null)

  // ─── Handlers ───

  const handleGenerate = async () => {
    if (!genScene.trim()) return
    setGenLoading(true)
    setGenError(null)
    setGenImageResult(null)
    setGenVideoResult(null)

    try {
      if (genTab === "image") {
        const result = await fetchAPI<ImageGenResult>("/api/prompt-guide/image/generate", {
          method: "POST",
          body: JSON.stringify({
            scene: genScene,
            model: genImageModel,
            style: genStyle || undefined,
            aspectRatio: genAspect || undefined,
          }),
        })
        setGenImageResult(result)
      } else {
        const result = await fetchAPI<VideoGenResult>("/api/prompt-guide/video/generate", {
          method: "POST",
          body: JSON.stringify({
            scene: genScene,
            model: genVideoModel,
            duration: genDuration ? Number(genDuration) : undefined,
            cameraMovement: genCamera || undefined,
          }),
        })
        setGenVideoResult(result)
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : String(err))
    } finally {
      setGenLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!analyzeInput.trim()) return
    setAnalyzeLoading(true)
    setAnalyzeError(null)
    setAnalyzeResult(null)
    try {
      const result = await fetchAPI<AnalyzeResult>("/api/prompt-guide/analyze", {
        method: "POST",
        body: JSON.stringify({ prompt: analyzeInput, type: analyzeType }),
      })
      setAnalyzeResult(result)
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : String(err))
    } finally {
      setAnalyzeLoading(false)
    }
  }

  const handleOptimize = async () => {
    if (!optInput.trim() || !optModels.length) return
    setOptLoading(true)
    setOptError(null)
    setOptResult(null)
    try {
      const result = await fetchAPI<OptimizeResult>("/api/prompt-guide/optimize", {
        method: "POST",
        body: JSON.stringify({ prompt: optInput, type: optType, targetModels: optModels }),
      })
      setOptResult(result)
    } catch (err) {
      setOptError(err instanceof Error ? err.message : String(err))
    } finally {
      setOptLoading(false)
    }
  }

  const toggleOptModel = (key: string) => {
    setOptModels((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  // ─── Score bar helper ───

  const ScoreBar = ({ label, score, color }: { label: string; score: number; color: string }) => (
    <div className="flex items-center gap-3">
      <span className="w-24 text-sm text-gray-400">{label}</span>
      <div className="h-2.5 flex-1 rounded-full bg-gray-800">
        <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${score * 10}%` }} />
      </div>
      <span className="w-8 text-right text-sm font-medium text-gray-300">{score}</span>
    </div>
  )

  return (
    <div className="mx-auto flex max-w-[1600px] gap-8">
      {/* Sidebar Navigation */}
      <aside className="sticky top-8 hidden h-fit w-48 flex-shrink-0 lg:block">
        <nav className="space-y-1">
          {NAV_SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="block rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-900 hover:text-white"
            >
              {section.label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="min-w-0 flex-1 space-y-10">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Image / Video 프롬프트 가이드
          </h1>
          <p className="mt-2 text-gray-400">
            Direction Plan 이미지/비디오 프롬프트 작성 공식, AI 모델별 최적화, 품질 분석 도구
          </p>
        </div>

        {/* ──────────────────────────────────────────── */}
        {/* Section 1: Prompt Formula */}
        {/* ──────────────────────────────────────────── */}
        <section id="formula" className="scroll-mt-8">
          <h2 className="mb-4 text-xl font-semibold">프롬프트 작성 공식</h2>
          <p className="mb-6 text-sm text-gray-400">
            이미지와 비디오 생성 프롬프트의 핵심 구조를 이해하세요.
          </p>

          {/* Image Prompt Formula */}
          <div className="mb-6">
            <h3 className="mb-3 text-base font-semibold text-blue-300">Image Prompt — 5-Part Formula</h3>
            <div className="grid gap-3 md:grid-cols-5">
              {[
                { part: "1", title: "Subject + Action", desc: "프레임 속 인물/사물과 동작", color: "blue", ex: "A detective in trenchcoat running" },
                { part: "2", title: "Environment", desc: "배경, 장소, 세계관 디테일", color: "green", ex: "rain-soaked neon alleyway at night" },
                { part: "3", title: "Camera", desc: "샷 타입, 렌즈, 앵글, 프레이밍", color: "purple", ex: "35mm anamorphic, Dutch angle" },
                { part: "4", title: "Lighting", desc: "광원, 분위기, 시간대, 날씨", color: "amber", ex: "neon rim lights through rain" },
                { part: "5", title: "Style", desc: "아트 스타일, 필름, 컬러 그레이딩", color: "pink", ex: "neo-noir, teal-orange grade" },
              ].map((item) => (
                <div
                  key={item.part}
                  className={`rounded-xl border ${colorClass(item.color, "border")} bg-gray-900/50 p-4`}
                >
                  <div className={`mb-1 text-xs font-semibold uppercase tracking-wider ${colorClass(item.color, "text")}`}>
                    Part {item.part}
                  </div>
                  <h4 className="mb-0.5 text-sm font-bold text-gray-200">{item.title}</h4>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                  <p className="mt-2 rounded bg-gray-800/50 px-2 py-1 text-xs italic text-gray-400">
                    {item.ex}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Video Prompt Formula */}
          <div>
            <h3 className="mb-3 text-base font-semibold text-cyan-300">Video Prompt — 6-Part Formula</h3>
            <div className="grid gap-3 md:grid-cols-6">
              {[
                { part: "1", title: "Camera Move", desc: "카메라 무브먼트/샷", color: "cyan", ex: "Steadicam follow shot" },
                { part: "2", title: "Subject", desc: "주요 피사체", color: "blue", ex: "a woman in red coat" },
                { part: "3", title: "Action", desc: "클립 내 움직임/동작", color: "green", ex: "walks through crowd" },
                { part: "4", title: "Environment", desc: "배경/환경 설정", color: "purple", ex: "busy Tokyo street at dusk" },
                { part: "5", title: "Style / Mood", desc: "비주얼 톤, 컬러", color: "amber", ex: "warm golden hour, nostalgic" },
                { part: "6", title: "Audio", desc: "SFX, BGM, 앰비언스", color: "pink", ex: "[Audio] city ambience, piano" },
              ].map((item) => (
                <div
                  key={item.part}
                  className={`rounded-xl border ${colorClass(item.color, "border")} bg-gray-900/50 p-3`}
                >
                  <div className={`mb-1 text-xs font-semibold uppercase tracking-wider ${colorClass(item.color, "text")}`}>
                    Part {item.part}
                  </div>
                  <h4 className="mb-0.5 text-xs font-bold text-gray-200">{item.title}</h4>
                  <p className="text-[10px] text-gray-500">{item.desc}</p>
                  <p className="mt-1.5 rounded bg-gray-800/50 px-1.5 py-0.5 text-[10px] italic text-gray-400">
                    {item.ex}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ──────────────────────────────────────────── */}
        {/* Section 2: Image Model Comparison */}
        {/* ──────────────────────────────────────────── */}
        <section id="models-image" className="scroll-mt-8">
          <h2 className="mb-4 text-xl font-semibold">이미지 생성 모델 비교</h2>
          <p className="mb-6 text-sm text-gray-400">
            각 모델의 강점, 약점, 프롬프트 작성 팁을 비교하세요. HuggingFace/API 연동 가능 모델은 별도 표시.
          </p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {IMAGE_MODELS.map((model) => (
              <div
                key={model.key}
                className={`rounded-xl border ${colorClass(model.color, "border")} bg-gray-900/50 p-5`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-base font-bold ${colorClass(model.color, "text")}`}>{model.name}</h3>
                    {model.elo && (
                      <span className="rounded-full bg-yellow-900/40 px-2 py-0.5 text-[10px] font-bold text-yellow-400">
                        ELO {model.elo}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {model.available ? (
                      <span className="rounded-full bg-green-900/50 px-2 py-0.5 text-[10px] font-medium text-green-400">
                        API 연동
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                        수동
                      </span>
                    )}
                    <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] text-gray-500">
                      {model.provider}
                    </span>
                  </div>
                </div>

                <div className="mb-3 flex flex-wrap gap-1">
                  {model.strengths.map((s) => (
                    <span key={s} className="rounded bg-green-900/30 px-1.5 py-0.5 text-[10px] text-green-400">
                      {s}
                    </span>
                  ))}
                </div>
                <div className="mb-3 flex flex-wrap gap-1">
                  {model.weaknesses.map((w) => (
                    <span key={w} className="rounded bg-red-900/30 px-1.5 py-0.5 text-[10px] text-red-400">
                      {w}
                    </span>
                  ))}
                </div>

                <div className="rounded-lg bg-gray-800/50 p-3">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    Prompt Tips
                  </div>
                  <p className="text-xs text-gray-300">{model.promptTips}</p>
                </div>

                <div className="mt-3 flex items-center justify-between text-[10px] text-gray-500">
                  <span>종횡비: {model.aspectRatios.join(", ")}</span>
                  <span>Max: {model.maxPromptLength} chars</span>
                </div>
                {model.huggingface && (
                  <div className="mt-2 truncate rounded bg-gray-800/50 px-2 py-1 text-[10px] text-gray-500">
                    HF: <span className="text-green-400">{model.huggingface}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ──────────────────────────────────────────── */}
        {/* Section 3: Video Model Comparison */}
        {/* ──────────────────────────────────────────── */}
        <section id="models-video" className="scroll-mt-8">
          <h2 className="mb-4 text-xl font-semibold">비디오 생성 모델 비교</h2>
          <p className="mb-6 text-sm text-gray-400">
            AI 비디오 생성 모델별 특성과 최적 활용법을 비교하세요.
          </p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {VIDEO_MODELS.map((model) => (
              <div
                key={model.key}
                className={`rounded-xl border ${colorClass(model.color, "border")} bg-gray-900/50 p-5`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-base font-bold ${colorClass(model.color, "text")}`}>{model.name}</h3>
                    {model.elo && (
                      <span className="rounded-full bg-yellow-900/40 px-2 py-0.5 text-[10px] font-bold text-yellow-400">
                        ELO {model.elo}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {model.available ? (
                      <span className="rounded-full bg-green-900/50 px-2 py-0.5 text-[10px] font-medium text-green-400">
                        API 연동
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                        수동
                      </span>
                    )}
                    <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] text-gray-500">
                      {model.provider}
                    </span>
                  </div>
                </div>

                <div className="mb-3 flex flex-wrap gap-1">
                  {model.strengths.map((s) => (
                    <span key={s} className="rounded bg-green-900/30 px-1.5 py-0.5 text-[10px] text-green-400">
                      {s}
                    </span>
                  ))}
                </div>
                <div className="mb-3 flex flex-wrap gap-1">
                  {model.weaknesses.map((w) => (
                    <span key={w} className="rounded bg-red-900/30 px-1.5 py-0.5 text-[10px] text-red-400">
                      {w}
                    </span>
                  ))}
                </div>

                <div className="rounded-lg bg-gray-800/50 p-3">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    Prompt Tips
                  </div>
                  <p className="text-xs text-gray-300">{model.promptTips}</p>
                </div>

                <div className="mt-3 flex items-center justify-between text-[10px] text-gray-500">
                  <span>Max: {model.maxDuration}s</span>
                  <span>{model.resolution}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ──────────────────────────────────────────── */}
        {/* Section 4: AI Generator */}
        {/* ──────────────────────────────────────────── */}
        <section id="generator" className="scroll-mt-8">
          <h2 className="mb-4 text-xl font-semibold">AI 프롬프트 생성</h2>
          <p className="mb-6 text-sm text-gray-400">
            장면을 설명하면 선택한 모델에 최적화된 프롬프트를 자동 생성합니다.
          </p>
          <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-900/50 p-6">
            {/* Tab selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setGenTab("image")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  genTab === "image"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                Image Prompt
              </button>
              <button
                onClick={() => setGenTab("video")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  genTab === "video"
                    ? "bg-cyan-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                Video Prompt
              </button>
            </div>

            {/* Scene input */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">장면 설명 (한국어/영어)</label>
              <textarea
                value={genScene}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setGenScene(e.target.value)}
                placeholder="예: 비 내리는 밤, 네온사인이 반짝이는 골목에서 탐정이 용의자를 추격하는 장면"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                rows={3}
              />
            </div>

            {/* Model-specific options */}
            {genTab === "image" ? (
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">Target Model</label>
                  <select
                    value={genImageModel}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGenImageModel(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
                  >
                    {IMAGE_MODELS.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.name} {m.available ? "" : "(수동)"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">Style (선택)</label>
                  <input
                    type="text"
                    value={genStyle}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGenStyle(e.target.value)}
                    placeholder="e.g. neo-noir, anime, photorealistic"
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">Aspect Ratio</label>
                  <select
                    value={genAspect}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGenAspect(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">기본 (21:9 시네마틱)</option>
                    <option value="21:9">21:9 (Anamorphic)</option>
                    <option value="16:9">16:9 (Widescreen)</option>
                    <option value="2.35:1">2.35:1 (Cinemascope)</option>
                    <option value="4:3">4:3 (Classic)</option>
                    <option value="1:1">1:1 (Square)</option>
                    <option value="9:16">9:16 (Vertical)</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">Target Model</label>
                  <select
                    value={genVideoModel}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGenVideoModel(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
                  >
                    {VIDEO_MODELS.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.name} {m.available ? "" : "(수동)"} — max {m.maxDuration}s
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">Duration (초)</label>
                  <input
                    type="number"
                    value={genDuration}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGenDuration(e.target.value)}
                    placeholder="e.g. 5"
                    min={1}
                    max={10}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">Camera Movement</label>
                  <select
                    value={genCamera}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGenCamera(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">자동 (AI 결정)</option>
                    {CAMERA_MOVEMENTS.map((cm) => (
                      <option key={cm} value={cm}>{cm}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={genLoading || !genScene.trim()}
              className={`rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                genTab === "image"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-cyan-600 hover:bg-cyan-700"
              }`}
            >
              {genLoading ? "생성 중..." : `${genTab === "image" ? "Image" : "Video"} 프롬프트 생성`}
            </button>

            {genError && <p className="text-sm text-red-400">{genError}</p>}

            {/* Image Result */}
            {genImageResult && (
              <div className="mt-4 space-y-4">
                <div className="rounded-lg border border-blue-500/30 bg-blue-950/20 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                      Generated Image Prompt — {genImageResult.modelInfo.name}
                    </span>
                    <button
                      onClick={() => navigator.clipboard.writeText(genImageResult.imagePrompt)}
                      className="rounded bg-gray-800 px-2 py-1 text-[10px] text-gray-400 hover:text-white"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-200">{genImageResult.imagePrompt}</p>
                  {genImageResult.negativePrompt && (
                    <div className="mt-2 rounded bg-red-950/20 p-2">
                      <span className="text-[10px] font-semibold text-red-400">Negative: </span>
                      <span className="text-xs text-gray-400">{genImageResult.negativePrompt}</span>
                    </div>
                  )}
                </div>

                {/* Breakdown */}
                <div className="grid gap-3 md:grid-cols-5">
                  {Object.entries(genImageResult.breakdown).map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-gray-700 bg-gray-800/50 p-3">
                      <div className="mb-1 text-[10px] font-medium uppercase text-gray-500">{key}</div>
                      <p className="text-xs text-gray-300">{value as string}</p>
                    </div>
                  ))}
                </div>

                {/* Tips */}
                {genImageResult.tips.length > 0 && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-950/10 p-4">
                    <div className="mb-2 text-xs font-semibold text-amber-400">Model-Specific Tips</div>
                    <ul className="space-y-1">
                      {genImageResult.tips.map((tip, i) => (
                        <li key={i} className="text-xs text-gray-300">
                          <span className="text-amber-400">*</span> {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Parameters */}
                {Object.keys(genImageResult.parameters).length > 0 && (
                  <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-3">
                    <div className="mb-1 text-[10px] font-semibold uppercase text-gray-500">Parameters</div>
                    <code className="text-xs text-gray-300">
                      {Object.entries(genImageResult.parameters)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" | ")}
                    </code>
                  </div>
                )}
              </div>
            )}

            {/* Video Result */}
            {genVideoResult && (
              <div className="mt-4 space-y-4">
                <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                      Generated Video Prompt — {genVideoResult.modelInfo.name}
                    </span>
                    <button
                      onClick={() => navigator.clipboard.writeText(genVideoResult.videoPrompt)}
                      className="rounded bg-gray-800 px-2 py-1 text-[10px] text-gray-400 hover:text-white"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-200">{genVideoResult.videoPrompt}</p>
                </div>

                {/* Breakdown */}
                <div className="grid gap-3 md:grid-cols-6">
                  {Object.entries(genVideoResult.breakdown).map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-gray-700 bg-gray-800/50 p-3">
                      <div className="mb-1 text-[10px] font-medium uppercase text-gray-500">{key}</div>
                      <p className="text-xs text-gray-300">{value as string}</p>
                    </div>
                  ))}
                </div>

                {/* Storyboard Note */}
                {genVideoResult.storyboardNote && (
                  <div className="rounded-lg border border-purple-500/20 bg-purple-950/10 p-3">
                    <div className="mb-1 text-[10px] font-semibold text-purple-400">Storyboard Note</div>
                    <p className="text-xs text-gray-300">{genVideoResult.storyboardNote}</p>
                  </div>
                )}

                {/* Tips */}
                {genVideoResult.tips.length > 0 && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-950/10 p-4">
                    <div className="mb-2 text-xs font-semibold text-amber-400">Model-Specific Tips</div>
                    <ul className="space-y-1">
                      {genVideoResult.tips.map((tip, i) => (
                        <li key={i} className="text-xs text-gray-300">
                          <span className="text-amber-400">*</span> {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ──────────────────────────────────────────── */}
        {/* Section 5: Quality Analyzer */}
        {/* ──────────────────────────────────────────── */}
        <section id="analyzer" className="scroll-mt-8">
          <h2 className="mb-4 text-xl font-semibold">프롬프트 품질 분석</h2>
          <p className="mb-6 text-sm text-gray-400">
            작성한 프롬프트의 품질을 5가지 기준으로 점수를 매기고, 개선안과 최적 모델을 제안합니다.
          </p>
          <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-900/50 p-6">
            <div className="flex gap-2">
              <button
                onClick={() => setAnalyzeType("image")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  analyzeType === "image" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"
                }`}
              >
                Image
              </button>
              <button
                onClick={() => setAnalyzeType("video")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  analyzeType === "video" ? "bg-cyan-600 text-white" : "bg-gray-800 text-gray-400"
                }`}
              >
                Video
              </button>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">프롬프트</label>
              <textarea
                value={analyzeInput}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAnalyzeInput(e.target.value)}
                placeholder="분석할 이미지/비디오 프롬프트를 입력하세요..."
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                rows={4}
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={analyzeLoading || !analyzeInput.trim()}
              className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {analyzeLoading ? "분석 중..." : "품질 분석"}
            </button>
            {analyzeError && <p className="text-sm text-red-400">{analyzeError}</p>}
            {analyzeResult && (
              <div className="mt-4 space-y-5">
                <div className="space-y-3 rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">품질 점수</div>
                  <ScoreBar label="구체성" score={analyzeResult.scores.specificity} color="bg-blue-500" />
                  <ScoreBar label="구도" score={analyzeResult.scores.composition} color="bg-purple-500" />
                  <ScoreBar label="분위기" score={analyzeResult.scores.atmosphere} color="bg-amber-500" />
                  <ScoreBar label="동적 표현" score={analyzeResult.scores.motion} color="bg-cyan-500" />
                  <ScoreBar label="스타일 일관성" score={analyzeResult.scores.style_consistency} color="bg-green-500" />
                </div>
                <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">피드백</div>
                  <p className="text-sm leading-relaxed text-gray-300">{analyzeResult.feedback}</p>
                </div>
                <div className="rounded-lg border border-green-500/30 bg-green-950/20 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-green-400">개선된 프롬프트</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(analyzeResult.improved)}
                      className="rounded bg-gray-800 px-2 py-1 text-[10px] text-gray-400 hover:text-white"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-200">{analyzeResult.improved}</p>
                </div>
                <div className="rounded-lg border border-indigo-500/30 bg-indigo-950/20 p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                    추천 모델
                  </div>
                  <p className="text-sm leading-relaxed text-gray-300">{analyzeResult.modelFit}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ──────────────────────────────────────────── */}
        {/* Section 6: Multi-Model Optimizer */}
        {/* ──────────────────────────────────────────── */}
        <section id="optimizer" className="scroll-mt-8">
          <h2 className="mb-4 text-xl font-semibold">멀티 모델 최적화</h2>
          <p className="mb-6 text-sm text-gray-400">
            하나의 프롬프트를 여러 모델에 동시 최적화하여 각 플랫폼별 차이를 비교하세요.
          </p>
          <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-900/50 p-6">
            <div className="flex gap-2">
              <button
                onClick={() => { setOptType("image"); setOptModels([]) }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  optType === "image" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"
                }`}
              >
                Image
              </button>
              <button
                onClick={() => { setOptType("video"); setOptModels([]) }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  optType === "video" ? "bg-cyan-600 text-white" : "bg-gray-800 text-gray-400"
                }`}
              >
                Video
              </button>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Base Prompt</label>
              <textarea
                value={optInput}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setOptInput(e.target.value)}
                placeholder="최적화할 기본 프롬프트를 입력하세요..."
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                rows={3}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Target Models (2개 이상 선택)
              </label>
              <div className="flex flex-wrap gap-2">
                {(optType === "image" ? IMAGE_MODELS : VIDEO_MODELS).map((m) => (
                  <button
                    key={m.key}
                    onClick={() => toggleOptModel(m.key)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      optModels.includes(m.key)
                        ? `${colorClass(m.color, "border")} ${colorClass(m.color, "bg")} ${colorClass(m.color, "text")}`
                        : "border-gray-700 bg-gray-800 text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleOptimize}
              disabled={optLoading || !optInput.trim() || optModels.length < 1}
              className="rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {optLoading ? "최적화 중..." : `${optModels.length}개 모델 최적화`}
            </button>
            {optError && <p className="text-sm text-red-400">{optError}</p>}
            {optResult && (
              <div className="mt-4 space-y-4">
                {/* Comparison */}
                <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    모델 간 차이 분석
                  </div>
                  <p className="text-sm leading-relaxed text-gray-300">{optResult.comparison}</p>
                </div>

                {/* Per-model results */}
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(optResult.optimized).map(([modelKey, data]) => {
                    const models = optType === "image" ? IMAGE_MODELS : VIDEO_MODELS
                    const modelInfo = models.find((m) => m.key === modelKey)
                    const clr = modelInfo?.color ?? "blue"
                    return (
                      <div
                        key={modelKey}
                        className={`rounded-xl border ${colorClass(clr, "border")} bg-gray-900/50 p-4`}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className={`text-sm font-semibold ${colorClass(clr, "text")}`}>
                            {modelInfo?.name ?? modelKey}
                          </span>
                          <button
                            onClick={() => navigator.clipboard.writeText(data.prompt)}
                            className="rounded bg-gray-800 px-2 py-1 text-[10px] text-gray-400 hover:text-white"
                          >
                            Copy
                          </button>
                        </div>
                        <p className="mb-2 text-xs leading-relaxed text-gray-200">{data.prompt}</p>
                        {data.negativePrompt && (
                          <div className="mb-2 rounded bg-red-950/20 px-2 py-1">
                            <span className="text-[10px] text-red-400">Negative: </span>
                            <span className="text-[10px] text-gray-400">{data.negativePrompt}</span>
                          </div>
                        )}
                        {data.parameters && Object.keys(data.parameters).length > 0 && (
                          <div className="mb-2 rounded bg-gray-800/50 px-2 py-1">
                            <code className="text-[10px] text-gray-400">
                              {Object.entries(data.parameters)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(" | ")}
                            </code>
                          </div>
                        )}
                        <p className="text-[10px] italic text-gray-500">{data.notes}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ──────────────────────────────────────────── */}
        {/* Section 7: Examples */}
        {/* ──────────────────────────────────────────── */}
        <section id="examples" className="scroll-mt-8">
          <h2 className="mb-4 text-xl font-semibold">모델별 프롬프트 예시 비교</h2>
          <p className="mb-6 text-sm text-gray-400">
            동일한 장면에 대해 Gemini, Midjourney, Kling 프롬프트가 어떻게 다른지 비교하세요.
          </p>
          <div className="space-y-6">
            {IMAGE_EXAMPLES.map((ex) => (
              <div key={ex.title} className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                <h3 className="mb-2 text-base font-semibold text-gray-200">{ex.title}</h3>
                <p className="mb-4 text-sm text-gray-400">{ex.scene}</p>
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Gemini */}
                  <div className="rounded-lg border border-blue-500/20 bg-blue-950/10 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-xs font-semibold text-blue-400">Gemini / Imagen 3</span>
                      <span className="rounded bg-blue-900/30 px-1.5 py-0.5 text-[10px] text-blue-300">서술형</span>
                    </div>
                    <p className="text-xs leading-relaxed text-gray-300">{ex.gemini}</p>
                  </div>
                  {/* Midjourney */}
                  <div className="rounded-lg border border-purple-500/20 bg-purple-950/10 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-xs font-semibold text-purple-400">Midjourney v6.1</span>
                      <span className="rounded bg-purple-900/30 px-1.5 py-0.5 text-[10px] text-purple-300">키워드형</span>
                    </div>
                    <p className="text-xs leading-relaxed text-gray-300">{ex.midjourney}</p>
                  </div>
                  {/* Kling */}
                  <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/10 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-xs font-semibold text-cyan-400">Kling AI 1.6</span>
                      <span className="rounded bg-cyan-900/30 px-1.5 py-0.5 text-[10px] text-cyan-300">비디오용</span>
                    </div>
                    <p className="text-xs leading-relaxed text-gray-300">{ex.kling}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
