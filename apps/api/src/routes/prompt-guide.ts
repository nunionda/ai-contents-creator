import { Hono } from "hono"
import { AIGateway } from "@marionette/ai-gateway"
import { GeminiProvider } from "@marionette/ai-gateway/providers/gemini.js"
import { ValidationError, AppError } from "../middleware/error-handler.ts"

export const promptGuideRoutes = new Hono()

// ─── Singleton AI gateway ───

let gateway: AIGateway | null = null

function getGateway(): AIGateway {
  if (!gateway) {
    gateway = new AIGateway()
    gateway.register("gemini", new GeminiProvider(), true)
  }
  return gateway
}

// ─── Model registry (image & video) ───

export const IMAGE_MODELS = {
  gemini: {
    name: "Google Imagen 3 (Gemini)",
    provider: "gemini",
    strengths: ["텍스트 렌더링 우수", "사실적 인물", "복잡한 구도", "한국어 프롬프트 지원"],
    weaknesses: ["스타일 일관성 약함", "극단적 종횡비 제한"],
    promptTips: "구체적이고 서술적인 문장 사용. 카메라 렌즈/조명 디테일 포함. 부정 프롬프트 불필요.",
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
    maxPromptLength: 4000,
    available: true,
  },
  midjourney: {
    name: "Midjourney v6.1",
    provider: "midjourney",
    strengths: ["아트 디렉션 최강", "일관된 스타일", "미적 감각 탁월", "아나모픽 시네마틱"],
    weaknesses: ["API 공식 미지원", "텍스트 렌더링 약함", "정확한 포즈 제어 어려움"],
    promptTips: "키워드 나열 + 파라미터 조합. --ar 21:9 --style raw --v 6.1. 형용사 > 문장. 스타일 참조 --sref 사용.",
    aspectRatios: ["1:1", "16:9", "9:16", "21:9", "2:3", "3:2", "4:7"],
    maxPromptLength: 6000,
    available: false,
  },
  flux: {
    name: "Flux 1.1 Pro (Black Forest Labs)",
    provider: "huggingface",
    strengths: ["오픈소스 최강", "텍스트 렌더링 우수", "빠른 속도", "HuggingFace 호환"],
    weaknesses: ["복잡한 다인물 구도 약함", "극사실 인물 약간 부자연스러움"],
    promptTips: "자연어 서술형 권장. 해상도/스타일 직접 명시. T5 인코더 기반으로 긴 프롬프트 효과적.",
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "21:9"],
    maxPromptLength: 2000,
    available: true,
  },
  dalle3: {
    name: "DALL-E 3 (OpenAI)",
    provider: "openai",
    strengths: ["프롬프트 이해도 최고", "텍스트 렌더링 최강", "자연어 대화형"],
    weaknesses: ["스타일 통제 제한", "콘텐츠 필터 엄격", "API 비용 높음"],
    promptTips: "ChatGPT 대화체로 상세 설명. 내부적으로 프롬프트 리라이팅됨. 짧은 프롬프트도 효과적.",
    aspectRatios: ["1:1", "16:9", "9:16"],
    maxPromptLength: 4000,
    available: false,
  },
  sdxl: {
    name: "Stable Diffusion XL / SD3.5",
    provider: "huggingface",
    strengths: ["완전 오픈소스", "LoRA/ControlNet 생태계", "로컬 실행 가능", "무제한 커스터마이징"],
    weaknesses: ["기본 품질 상업 모델 대비 낮음", "프롬프트 엔지니어링 필수", "손/얼굴 왜곡"],
    promptTips: "긍정+부정 프롬프트 필수. (best quality, masterpiece:1.2) 가중치 문법. 토큰 77개 제한 주의.",
    aspectRatios: ["1:1", "16:9", "9:16", "2:3", "3:2"],
    maxPromptLength: 500,
    available: true,
  },
  leonardo: {
    name: "Leonardo AI Phoenix",
    provider: "leonardo",
    strengths: ["게임/판타지 아트 특화", "실시간 캔버스", "일관된 캐릭터", "Alchemy 모드"],
    weaknesses: ["사실적 사진 약함", "API 크레딧 제한"],
    promptTips: "장르별 프리셋 활용. Alchemy 모드로 품질 향상. PhotoReal v2로 사실적 이미지.",
    aspectRatios: ["1:1", "16:9", "9:16", "2:3", "3:2", "4:3"],
    maxPromptLength: 1500,
    available: false,
  },
} as const

export const VIDEO_MODELS = {
  gemini_veo: {
    name: "Google Veo 2 (Gemini)",
    provider: "gemini",
    strengths: ["8초 고품질", "물리 시뮬레이션 우수", "카메라 무브먼트 정확", "Gemini 통합"],
    weaknesses: ["생성 속도 느림", "접근 제한", "인물 일관성 약함"],
    promptTips: "영화적 서술 스타일. 카메라 동선 명시 (dolly in, crane shot). 조명/분위기 상세 기술.",
    maxDuration: 8,
    resolution: "1080p",
    available: true,
  },
  kling: {
    name: "Kling AI 1.6",
    provider: "kling",
    strengths: ["10초 긴 영상", "인물 움직임 자연스러움", "모션 컨트롤 우수", "가격 대비 성능 최고"],
    weaknesses: ["텍스트 렌더링 불가", "복잡한 카메라 워크 제한"],
    promptTips: "주체 + 동작 + 배경 순서로 작성. 카메라 움직임은 별도 파라미터로 제어. 영어 프롬프트 권장.",
    maxDuration: 10,
    resolution: "1080p",
    available: true,
  },
  runway_gen3: {
    name: "Runway Gen-3 Alpha Turbo",
    provider: "runway",
    strengths: ["실시간에 가까운 속도", "Motion Brush 정밀 제어", "이미지→비디오 최강", "스타일 전이 우수"],
    weaknesses: ["4초 제한 (기본)", "월정액 비용", "물리 시뮬레이션 약함"],
    promptTips: "첫 프레임 이미지 제공 시 최고 품질. 카메라: [Camera: dolly forward]. 동작 강도 명시.",
    maxDuration: 10,
    resolution: "1080p",
    available: false,
  },
  pika: {
    name: "Pika 2.0",
    provider: "pika",
    strengths: ["입문자 친화", "빠른 생성", "Lip Sync 기능", "Scene Ingredients 혁신"],
    weaknesses: ["해상도 제한", "긴 영상 불가", "복잡한 동작 약함"],
    promptTips: "간결한 동작 서술. 'A person walking' 같은 심플한 문장 효과적. 특수효과는 Pikaffects 사용.",
    maxDuration: 4,
    resolution: "1080p",
    available: false,
  },
  minimax: {
    name: "MiniMax (Hailuo AI)",
    provider: "minimax",
    strengths: ["무료 티어 제공", "자연스러운 인물 움직임", "6초 고품질", "오디오 동기화"],
    weaknesses: ["API 영어만 지원", "스타일 다양성 제한"],
    promptTips: "서술형 영어 프롬프트. 주어+동사+목적어 문장 구조. 분위기/감정 형용사 추가.",
    maxDuration: 6,
    resolution: "1080p",
    available: true,
  },
  luma: {
    name: "Luma Dream Machine 1.5",
    provider: "luma",
    strengths: ["3D 공간 이해 탁월", "물리 시뮬레이션 우수", "카메라 궤적 제어", "무료 체험"],
    weaknesses: ["인물 디테일 약함", "스타일 일관성 부족", "생성 시간 긴 편"],
    promptTips: "3D 공간/카메라 궤적 중심 서술. 물리적 상호작용 강조. 환경 설정 상세히.",
    maxDuration: 5,
    resolution: "1080p",
    available: false,
  },
} as const

// ─── System prompts ───

const IMAGE_PROMPT_GENERATE = `You are a VFX Supervisor and Prompt Engineer at Marionette Studio, specializing in AI image generation.

Given a scene description and target model, generate an optimized image prompt following this 5-part structure:
1. [Subject + Action] — What/who is in the frame and what they're doing
2. [Environment / Background] — Setting, location, world-building details
3. [Camera / Composition] — Shot type, lens, angle, framing
4. [Lighting / Atmosphere] — Light source, mood, time of day, weather
5. [Visual Style] — Art style, film stock, color grading, reference

Adapt the prompt style to the target model:
- gemini: Natural language, detailed sentences, camera/lens specs
- midjourney: Keyword-driven, --ar --style --v parameters, adjective-heavy
- flux: Descriptive natural language, resolution/style explicit
- dalle3: Conversational detailed description
- sdxl: Weighted tokens (keyword:1.2), positive + negative prompt pair
- leonardo: Genre preset hints, Alchemy mode markers

Return ONLY a JSON object:
{
  "imagePrompt": "the optimized prompt in English",
  "negativePrompt": "negative prompt if applicable (sdxl/leonardo), otherwise empty string",
  "parameters": { "model-specific key-value pairs like ar, style, etc" },
  "breakdown": {
    "subject": "...",
    "environment": "...",
    "camera": "...",
    "lighting": "...",
    "style": "..."
  },
  "tips": ["1-3 model-specific tips for this particular prompt"]
}

No markdown wrapping.`

const VIDEO_PROMPT_GENERATE = `You are a Cinematographer and Motion Director at Marionette Studio, specializing in AI video generation.

Given a scene description and target model, generate an optimized video prompt following this 6-part structure:
1. [Camera Movement / Shot] — Dolly, crane, pan, static, steadicam, etc.
2. [Subject] — Main subject in the frame
3. [Action / Motion] — What movement occurs during the clip
4. [Environment] — Setting and background elements
5. [Style / Mood] — Visual tone, color grade, film style
6. [Audio] — Sound design hints (SFX, BGM, ambient)

Adapt the prompt style to the target model:
- gemini_veo: Cinematic narrative style, explicit camera paths, lighting detail
- kling: Subject + action focused, camera as separate parameter, English required
- runway_gen3: First-frame reference focus, Motion Brush hints, [Camera: ...] syntax
- pika: Simple action sentences, Pikaffects for VFX
- minimax: Narrative English, subject-verb-object structure, mood adjectives
- luma: 3D space emphasis, physics/trajectory focus, environment detail

Return ONLY a JSON object:
{
  "videoPrompt": "the optimized prompt in English",
  "parameters": { "model-specific key-value pairs like duration, camera_movement, etc" },
  "breakdown": {
    "camera": "...",
    "subject": "...",
    "action": "...",
    "environment": "...",
    "style": "...",
    "audio": "..."
  },
  "tips": ["1-3 model-specific tips for this particular prompt"],
  "storyboardNote": "brief note on what the first/last frames should look like"
}

No markdown wrapping.`

const PROMPT_ANALYZE = `You are a Prompt Engineering Expert at Marionette Studio.

Analyze the given image or video prompt and score it on these criteria (0-10):
1. specificity (구체성): How detailed and unambiguous is the description?
2. composition (구도): Camera angle, framing, spatial arrangement
3. atmosphere (분위기): Lighting, mood, color palette
4. motion (동적 표현): Movement, action, temporal flow (for video prompts)
5. style_consistency (스타일 일관성): Clear and consistent visual direction

Also provide:
- feedback: 2-3 sentences of constructive feedback in Korean
- improved: An improved version of the prompt in English
- modelFit: Which AI model would work best for this prompt and why (Korean)

Return ONLY a JSON object:
{
  "scores": { "specificity": number, "composition": number, "atmosphere": number, "motion": number, "style_consistency": number },
  "feedback": "...",
  "improved": "...",
  "modelFit": "..."
}

No markdown wrapping.`

const PROMPT_OPTIMIZE = `You are a Multi-Platform Prompt Optimizer at Marionette Studio.

Given a base image or video prompt, optimize it for MULTIPLE target models simultaneously.
Show how the same creative intent translates differently across platforms.

Return ONLY a JSON object:
{
  "optimized": {
    "modelKey1": { "prompt": "...", "negativePrompt": "...", "parameters": {}, "notes": "1-2 sentences in Korean about why this format works for this model" },
    "modelKey2": { "prompt": "...", "negativePrompt": "...", "parameters": {}, "notes": "..." }
  },
  "comparison": "2-3 sentences in Korean comparing how each model will interpret this prompt differently"
}

No markdown wrapping.`

// ─── POST /image/generate ───

promptGuideRoutes.post("/image/generate", async (c) => {
  const body = await c.req.json<{
    scene: string
    model: string
    style?: string
    aspectRatio?: string
  }>()

  if (!body.scene?.trim()) {
    throw new ValidationError("scene description is required")
  }

  const modelKey = body.model || "gemini"
  const modelInfo = IMAGE_MODELS[modelKey as keyof typeof IMAGE_MODELS]
  if (!modelInfo) {
    throw new ValidationError(`Unknown image model: ${modelKey}. Available: ${Object.keys(IMAGE_MODELS).join(", ")}`)
  }

  const userPrompt = `Target Model: ${modelInfo.name}
Model Prompt Tips: ${modelInfo.promptTips}
Supported Aspect Ratios: ${modelInfo.aspectRatios.join(", ")}
${body.style ? `Desired Style: ${body.style}` : ""}
${body.aspectRatio ? `Desired Aspect Ratio: ${body.aspectRatio}` : "Default: 21:9 cinematic"}

Scene Description:
"${body.scene}"

Generate an optimized image prompt for this model.`

  try {
    const gw = getGateway()
    const response = await gw.text(userPrompt, {
      provider: "gemini",
      systemPrompt: IMAGE_PROMPT_GENERATE,
      temperature: 0.7,
    })

    const objMatch = response.match(/\{[\s\S]*\}/)
    if (!objMatch) {
      throw new AppError("Failed to parse AI response", 500, "INTERNAL_SERVER_ERROR")
    }

    const result = JSON.parse(objMatch[0]) as Record<string, unknown>
    return c.json({ ...result, model: modelKey, modelInfo: { name: modelInfo.name, strengths: modelInfo.strengths } })
  } catch (err) {
    if (err instanceof AppError) throw err
    const message = err instanceof Error ? err.message : String(err)
    throw new AppError(`Image prompt generation failed: ${message}`, 500, "AI_ERROR")
  }
})

// ─── POST /video/generate ───

promptGuideRoutes.post("/video/generate", async (c) => {
  const body = await c.req.json<{
    scene: string
    model: string
    duration?: number
    cameraMovement?: string
  }>()

  if (!body.scene?.trim()) {
    throw new ValidationError("scene description is required")
  }

  const modelKey = body.model || "gemini_veo"
  const modelInfo = VIDEO_MODELS[modelKey as keyof typeof VIDEO_MODELS]
  if (!modelInfo) {
    throw new ValidationError(`Unknown video model: ${modelKey}. Available: ${Object.keys(VIDEO_MODELS).join(", ")}`)
  }

  const userPrompt = `Target Model: ${modelInfo.name}
Model Prompt Tips: ${modelInfo.promptTips}
Max Duration: ${modelInfo.maxDuration}s
Resolution: ${modelInfo.resolution}
${body.duration ? `Desired Duration: ${body.duration}s` : ""}
${body.cameraMovement ? `Camera Movement: ${body.cameraMovement}` : ""}

Scene Description:
"${body.scene}"

Generate an optimized video prompt for this model.`

  try {
    const gw = getGateway()
    const response = await gw.text(userPrompt, {
      provider: "gemini",
      systemPrompt: VIDEO_PROMPT_GENERATE,
      temperature: 0.7,
    })

    const objMatch = response.match(/\{[\s\S]*\}/)
    if (!objMatch) {
      throw new AppError("Failed to parse AI response", 500, "INTERNAL_SERVER_ERROR")
    }

    const result = JSON.parse(objMatch[0]) as Record<string, unknown>
    return c.json({ ...result, model: modelKey, modelInfo: { name: modelInfo.name, strengths: modelInfo.strengths } })
  } catch (err) {
    if (err instanceof AppError) throw err
    const message = err instanceof Error ? err.message : String(err)
    throw new AppError(`Video prompt generation failed: ${message}`, 500, "AI_ERROR")
  }
})

// ─── POST /analyze ───

promptGuideRoutes.post("/analyze", async (c) => {
  const body = await c.req.json<{
    prompt: string
    type: "image" | "video"
  }>()

  if (!body.prompt?.trim()) {
    throw new ValidationError("prompt is required")
  }

  if (!["image", "video"].includes(body.type)) {
    throw new ValidationError("type must be 'image' or 'video'")
  }

  const userPrompt = `Prompt Type: ${body.type}

Prompt to analyze:
"${body.prompt}"

Analyze this ${body.type} generation prompt on the 5 quality criteria.`

  try {
    const gw = getGateway()
    const response = await gw.text(userPrompt, {
      provider: "gemini",
      systemPrompt: PROMPT_ANALYZE,
      temperature: 0.6,
    })

    const objMatch = response.match(/\{[\s\S]*\}/)
    if (!objMatch) {
      throw new AppError("Failed to parse AI response", 500, "INTERNAL_SERVER_ERROR")
    }

    const result = JSON.parse(objMatch[0]) as Record<string, unknown>
    return c.json(result)
  } catch (err) {
    if (err instanceof AppError) throw err
    const message = err instanceof Error ? err.message : String(err)
    throw new AppError(`Prompt analysis failed: ${message}`, 500, "AI_ERROR")
  }
})

// ─── POST /optimize ───

promptGuideRoutes.post("/optimize", async (c) => {
  const body = await c.req.json<{
    prompt: string
    type: "image" | "video"
    targetModels: string[]
  }>()

  if (!body.prompt?.trim()) {
    throw new ValidationError("prompt is required")
  }

  if (!body.targetModels?.length) {
    throw new ValidationError("targetModels array is required (at least 1)")
  }

  const modelDetails = body.targetModels.map((key) => {
    if (body.type === "image") {
      const info = IMAGE_MODELS[key as keyof typeof IMAGE_MODELS]
      return info ? `- ${key}: ${info.name} — Tips: ${info.promptTips}` : `- ${key}: unknown`
    }
    const info = VIDEO_MODELS[key as keyof typeof VIDEO_MODELS]
    return info ? `- ${key}: ${info.name} — Tips: ${info.promptTips}` : `- ${key}: unknown`
  })

  const userPrompt = `Prompt Type: ${body.type}
Target Models:
${modelDetails.join("\n")}

Base Prompt:
"${body.prompt}"

Optimize this prompt for each target model. Show how the same creative intent adapts to each platform.`

  try {
    const gw = getGateway()
    const response = await gw.text(userPrompt, {
      provider: "gemini",
      systemPrompt: PROMPT_OPTIMIZE,
      temperature: 0.7,
    })

    const objMatch = response.match(/\{[\s\S]*\}/)
    if (!objMatch) {
      throw new AppError("Failed to parse AI response", 500, "INTERNAL_SERVER_ERROR")
    }

    const result = JSON.parse(objMatch[0]) as Record<string, unknown>
    return c.json(result)
  } catch (err) {
    if (err instanceof AppError) throw err
    const message = err instanceof Error ? err.message : String(err)
    throw new AppError(`Prompt optimization failed: ${message}`, 500, "AI_ERROR")
  }
})

// ─── GET /models ───

promptGuideRoutes.get("/models", (c) => {
  return c.json({
    image: Object.entries(IMAGE_MODELS).map(([key, m]) => ({
      key,
      name: m.name,
      provider: m.provider,
      strengths: m.strengths,
      weaknesses: m.weaknesses,
      promptTips: m.promptTips,
      available: m.available,
    })),
    video: Object.entries(VIDEO_MODELS).map(([key, m]) => ({
      key,
      name: m.name,
      provider: m.provider,
      strengths: m.strengths,
      weaknesses: m.weaknesses,
      promptTips: m.promptTips,
      maxDuration: m.maxDuration,
      resolution: m.resolution,
      available: m.available,
    })),
  })
})
