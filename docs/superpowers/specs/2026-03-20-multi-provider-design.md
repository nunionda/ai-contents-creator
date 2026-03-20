# 멀티 프로바이더 지원

> Date: 2026-03-20 | Status: Approved

## Problem

에이전트들이 `provider: "gemini"` 하드코딩. DB의 AgentConfig 테이블이 존재하지만 실제 사용되지 않아 런타임 프로바이더 전환 불가.

## Solution

1. BaseAgent에 AgentConfig 조회 헬퍼 추가 → 에이전트가 런타임에 프로바이더/모델 선택
2. OpenAI 프로바이더 추가 (Text: GPT-4o, Image: DALL-E 3)
3. Gateway에 조건부 등록 (API 키 존재 시)

## AgentConfig 연동

### BaseAgent 변경

```typescript
// packages/agents/src/base/agent.ts
protected async getProviderConfig(agentName: string): Promise<{ provider?: string; model?: string }> {
  const config = await this.db.agentConfig.findUnique({
    where: { agentName },
    select: { provider: true, model: true },
  })
  return config ? { provider: config.provider, model: config.model } : {}
}
```

에이전트들은 gateway 호출 시 이 설정을 spread:
```typescript
const providerConfig = await this.getProviderConfig("concept_artist")
const imageBuffer = await this.gateway.image(prompt, {
  ...providerConfig,
  style: "photorealistic",
})
```

### 기존 에이전트 호환성

- AgentConfig가 없으면 빈 객체 반환 → Gateway 기본 라우팅 사용
- 기존 하드코딩된 `provider: "gemini"` 제거
- Gateway의 기존 resolve 로직이 default provider로 폴백

## OpenAI Provider

### 구현

```typescript
// packages/ai-gateway/src/providers/openai.ts
export class OpenAIProvider implements TextProvider, ImageProvider {
  // Text: POST /v1/chat/completions (GPT-4o)
  // Image: POST /v1/images/generations (DALL-E 3)
}
```

### Text 옵션 매핑

| Gateway Option | OpenAI Parameter |
|---------------|-----------------|
| systemPrompt | messages[0].role = "system" |
| temperature | temperature |
| responseSchema | response_format.type = "json_schema" |
| model | model (default: "gpt-4o") |

### Image 옵션 매핑

| Gateway Option | OpenAI Parameter |
|---------------|-----------------|
| model | model (default: "dall-e-3") |
| aspectRatio "16:9" | size: "1792x1024" |
| aspectRatio "1:1" | size: "1024x1024" |
| aspectRatio "9:16" | size: "1024x1792" |

## Gateway 등록

```typescript
// apps/api/src/services/pipeline.service.ts
const gw = new AIGateway()
gw.register("gemini", new GeminiProvider(), true) // default
gw.register("suno", new SunoProvider())
if (process.env.OPENAI_API_KEY) {
  gw.register("openai", new OpenAIProvider())
}
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `packages/ai-gateway/src/providers/openai.ts` | CREATE | OpenAI 프로바이더 (Text + Image) |
| `packages/ai-gateway/src/providers/index.ts` | MODIFY | OpenAIProvider export 추가 |
| `packages/ai-gateway/src/index.ts` | MODIFY | OpenAIProvider export 추가 |
| `packages/agents/src/base/agent.ts` | MODIFY | getProviderConfig() 헬퍼 추가 |
| `apps/api/src/services/pipeline.service.ts` | MODIFY | OpenAI 조건부 등록 |

## Error Handling

- OpenAI API 키 없으면 등록하지 않음 (기존 동작 유지)
- AgentConfig 레코드 없으면 빈 설정 반환 → Gateway 기본 라우팅
- OpenAI API 호출 실패 시 기존 에러 처리 흐름 유지

## Constraints

- 추가 npm 의존성 없음 (OpenAI REST API 직접 호출, fetch 사용)
- 기존 Gemini 프로바이더 변경 없음
- 기존 에이전트 동작 변경 없음 (AgentConfig 없으면 기존 기본값)
