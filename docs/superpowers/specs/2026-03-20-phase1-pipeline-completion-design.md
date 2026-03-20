# Phase 1: 핵심 파이프라인 완성 — 설계 문서

> 작성일: 2026-03-20

## Context

마리오네트 스튜디오의 E2E 파이프라인에서 후반작업 체인(촬영감독→컬러→믹싱)이 미완성.
Phase 1은 4개 에이전트를 완성하여 "아이디어→완성 영상+음향" 전체 흐름을 작동시키는 것이 목표.

## 구현 대상

### 1. Cinematographer (촬영감독) — 활성화

**현재 상태**: 코드 95% 완성, DB에서 `enabled: false`

**변경 사항**:
- `packages/db/src/seed.ts`: `enabled: true`
- `packages/agents/src/base/pipeline.ts`: STEP_WEIGHTS에 `cinematographer: 10` 추가

**수정 파일**:
- `packages/db/src/seed.ts`
- `packages/agents/src/base/pipeline.ts`

---

### 2. Composer (작곡가) — 신규 구현

**역할**: DirectionPlan의 씬별 분위기를 분석하여 BGM/스코어 생성

**아키텍처**:
```
DirectionPlan.scenes
    │
    ▼
[Gemini 2.5 Flash] — 씬별 음악 프롬프트 생성
    │                  (장르, 무드, 악기, BPM, 길이)
    ▼
[Suno API] — 프롬프트 → MP3 음악 파일
    │
    ▼
output/audio/{projectId}/bgm_scene_{NNN}.mp3
```

**신규 파일**:
- `packages/ai-gateway/src/providers/suno.ts` — SunoProvider (AudioProvider 구현)
- `packages/agents/src/post-production/composer.ts` — ComposerAgent

**수정 파일**:
- `packages/agents/src/index.ts` — 레지스트리에 composer 등록
- `packages/agents/src/base/pipeline.ts` — STEP_WEIGHTS에 `composer: 15` 추가
- `apps/api/src/services/pipeline.service.ts` — postSteps에 composer 추가
- `packages/db/src/seed.ts` — enabled: true

**SunoProvider 인터페이스**:
```typescript
// AudioProvider 인터페이스 구현
class SunoProvider implements AudioProvider {
  async generateAudio(prompt: string, options?: AudioOptions): Promise<Buffer>
}

// Suno API v2 엔드포인트:
// POST https://api.suno.ai/v2/generate — 음악 생성 요청
// GET  https://api.suno.ai/v2/clips/{id} — 생성 상태 폴링
```

**ComposerAgent 흐름**:
1. DirectionPlan에서 씬 그룹화 (연속된 분위기별)
2. Gemini로 씬별 음악 프롬프트 생성 (장르/무드/악기/BPM)
3. global_audio_concept를 기반으로 전체 톤 통일
4. Suno API로 BGM MP3 생성 (씬당 ~30초)
5. output/audio/에 저장 + Asset DB 등록

---

### 3. Colorist (컬러리스트) — 신규 구현

**역할**: FFMPEG LUT 필터로 영상 컬러 그레이딩

**아키텍처**:
```
MasterEditor 출력 (final_master_{id}.mp4)
    │
    ▼
[Gemini 2.5 Flash] — 장르/분위기 분석 → LUT 프리셋 선택
    │
    ▼
[FFMPEG lut3d] — LUT 적용 + 밝기/대비/채도 조정
    │
    ▼
output/master/color_graded_{projectId}.mp4
```

**신규 파일**:
- `packages/agents/src/post-production/colorist.ts`
- `packages/agents/src/post-production/lut-presets.ts` — 내장 LUT 데이터

**LUT 프리셋**:
- `cinematic_warm` — 따뜻한 영화 톤 (드라마, 로맨스)
- `noir_cold` — 차가운 블루/틸 톤 (느와르, 스릴러)
- `neon_cyberpunk` — 네온 하이컨트라스트 (SF, 사이버펑크)
- `natural` — 자연색 보정 (다큐멘터리)
- `vintage` — 빈티지 필름 그레인 (시대극)

**FFMPEG 커맨드 패턴**:
```bash
ffmpeg -i input.mp4 -vf "lut3d=file.cube,eq=brightness=0.05:contrast=1.1:saturation=1.2" -c:a copy output.mp4
```

**수정 파일**:
- `packages/agents/src/index.ts`
- `packages/agents/src/base/pipeline.ts` — STEP_WEIGHTS
- `apps/api/src/services/pipeline.service.ts`
- `packages/db/src/seed.ts`

---

### 4. MixingEngineer (믹싱 엔지니어) — 신규 구현

**역할**: 영상 + 대사 오디오 + BGM을 최종 합본

**아키텍처**:
```
Colorist 출력 (color_graded_{id}.mp4) — 영상 트랙
SoundDesigner 출력 (scene_*_dialogue.wav) — 대사 트랙
Composer 출력 (bgm_scene_*.mp3) — BGM 트랙
    │
    ▼
[FFMPEG] — 멀티 트랙 오디오 믹싱
    │       - 대사: -6dB (메인)
    │       - BGM: -18dB (배경)
    │       - 오리지널 비디오 오디오: -24dB (앰비언트)
    ▼
output/final/final_{projectId}.mp4 — 최종 완성 영상
```

**신규 파일**:
- `packages/agents/src/post-production/mixing-engineer.ts`

**FFMPEG 믹싱 패턴**:
```bash
ffmpeg -i video.mp4 -i dialogue.wav -i bgm.mp3 \
  -filter_complex "[0:a]volume=0.1[va];[1:a]volume=0.5[da];[2:a]volume=0.15[ba];[va][da][ba]amix=inputs=3:duration=longest[out]" \
  -map 0:v -map "[out]" -c:v copy -c:a aac output.mp4
```

**수정 파일**:
- `packages/agents/src/index.ts`
- `packages/agents/src/base/pipeline.ts`
- `apps/api/src/services/pipeline.service.ts`
- `packages/db/src/seed.ts`

---

## 파이프라인 실행 순서 (최종)

```
POST: sound_designer → composer → master_editor → colorist → mixing_engineer
```

## 검증 방법

1. `bun run typecheck` — 타입 에러 0개
2. `bun run test` — 전체 테스트 패스
3. `bun run lint` — 린트 에러 0개
4. DB 시드 실행: `bun run --cwd packages/db seed`
5. API 서버 기동 후 파이프라인 실행 테스트
