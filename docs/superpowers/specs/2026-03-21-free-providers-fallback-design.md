# 무료 AI 프로바이더 3종 + 폴백 체인 설계

> 작성일: 2026-03-21 | Rev 1

## 목적

E2E 파이프라인 테스트를 비용 없이 실행하기 위해 무료 프로바이더 3종을 추가하고, 기존 유료 프로바이더 실패 시 자동 폴백하는 체인을 구현한다.

## 프로바이더 매핑

| 용도 | 기존 (유료) | 신규 (무료) | 인터페이스 |
|------|------------|------------|-----------|
| Video | GeminiProvider (Veo 3.0) | ReplicateProvider (Wan 2.5) | VideoProvider |
| Audio/BGM | SunoProvider (Suno v4) | MusicGenProvider (HF MusicGen) | AudioProvider |
| TTS | GeminiProvider (Gemini TTS) | EdgeTTSProvider (Edge-TTS) | TTSProvider |

## 아키텍처

```
AIGateway
  ├─ register("gemini", GeminiProvider, default=true)
  ├─ register("suno", SunoProvider)
  ├─ register("replicate", ReplicateProvider)    ← 신규
  ├─ register("musicgen", MusicGenProvider)      ← 신규
  └─ register("edge", EdgeTTSProvider)           ← 신규

폴백 흐름:
  video()  → gemini(Veo) ─실패→ replicate(Wan 2.5)
  audio()  → suno(v4)    ─실패→ musicgen(HF)
  tts()    → gemini(TTS) ─실패→ edge(Edge-TTS)
```

## 폴백 구현

gateway.ts에 `withFallback()` 헬퍼 메서드 추가:

```typescript
async withFallback<T>(
  primary: () => Promise<T>,
  fallbackProvider: string,
  fallbackFn: (provider: string) => Promise<T>,
): Promise<T> {
  try {
    return await primary()
  } catch (err) {
    console.warn(`[AIGateway] Primary failed, falling back:`, err)
    return fallbackFn(fallbackProvider)
  }
}
```

기존 `video()`, `audio()`, `tts()` 시그니처는 변경하지 않는다. 폴백 체인은 에이전트/서비스 레벨에서 `withFallback()` 호출로 구성한다.

## 신규 파일

### 1. `providers/replicate.ts` — ReplicateProvider

- **implements**: `VideoProvider`
- **모델**: `wan-video/wan-2.5-t2v-480p`
- **API**: POST `https://api.replicate.com/v1/predictions`
- **인증**: `REPLICATE_API_TOKEN` 환경변수
- **패턴**: 비동기 폴링 (prediction 생성 → status 폴링 → 완료 시 output URL에서 다운로드)
- **폴링**: 최대 120회, 5초 간격 (비디오 생성은 수 분 소요)
- **반환**: `VideoResult { videoBuffer, duration: 5, mimeType: "video/mp4" }`

### 2. `providers/musicgen.ts` — MusicGenProvider

- **implements**: `AudioProvider`
- **모델**: `facebook/musicgen-small`
- **API**: POST `https://router.huggingface.co/hf-inference/models/facebook/musicgen-small`
- **인증**: `HF_API_TOKEN` 환경변수 (선택, 없으면 rate limit 적용)
- **패턴**: 동기 — 요청 → 응답 (audio bytes)
- **입력**: `{ inputs: prompt }` JSON body
- **반환**: `Buffer` (FLAC 오디오)

### 3. `providers/edge-tts.ts` — EdgeTTSProvider

- **implements**: `TTSProvider`
- **패키지**: `edge-tts` (npm)
- **인증**: 불필요
- **음성 매핑**:
  - 한국어: `ko-KR-SunHiNeural` (기본), `ko-KR-InJoonNeural`
  - 영어: `en-US-AriaNeural` (기본)
- **옵션**: `voice`, `language`, `speed` 지원
- **반환**: `Buffer` (MP3)

## 등록 위치

`batch.service.ts`와 `pipeline.service.ts`의 `getGateway()` 함수에서 조건부 등록:

```typescript
// 무료 프로바이더 — 항상 등록 (폴백용)
gateway.register("replicate", new ReplicateProvider())
gateway.register("musicgen", new MusicGenProvider())
gateway.register("edge", new EdgeTTSProvider())
```

## 의존성

```
bun add edge-tts    # EdgeTTSProvider용 npm 패키지
```

Replicate, HuggingFace는 REST API 직접 호출 — 추가 패키지 불필요.

## 변경 없는 것

- `gateway.ts`의 기존 `video()`, `audio()`, `tts()` 시그니처
- `types.ts`의 인터페이스 정의
- 기존 프로바이더 코드 (gemini.ts, suno.ts, openai.ts)
- Prisma 스키마
- 프론트엔드
