# 씬별 교차 에셋 생성 (Interleaved Scene Asset Generation)

> Date: 2026-03-21 | Status: Approved | Rev: 2 (spec review 반영)

## Problem

현재 파이프라인은 전체 씬의 연출기획(Direction Plan)이 완성된 후, Pre-Production 탭에서 전체 스토리보드를 일괄 생성하고, Production 탭에서 전체 비디오를 일괄 생성하는 순차 구조. 씬 하나의 프롬프트가 완성되어도 이미지/비디오 생성을 시작할 수 없어 대기 시간이 발생.

## Solution

Screenplay 페이지 Step 6(연출기획)에 "에셋 생성" 서브탭을 추가하여, 씬별로 프롬프트 완성 즉시 이미지→비디오→오디오를 교차 생성할 수 있게 한다. 프론트엔드 UI 변경 + 백엔드 씬 단위 생성 API 2개 추가 + 에셋 필터링 API 보강.

## Architecture

### 씬별 상태 흐름

```
프롬프트 미완성 → 프롬프트 완료 → 🖼 이미지 생성 가능
                                      ↓ (생성 완료)
                                 🎬 비디오 생성 가능
                                      ↓ (생성 완료)
                                 🔊 오디오 생성 가능
                                      ↓ (생성 완료)
                                 ✅ 전체 완료
```

활성화 조건:
- 이미지 버튼: 해당 씬의 모든 컷에 `image_prompt`가 존재
- 비디오 버튼: 해당 씬의 이미지 Asset이 DB에 존재 **AND** 모든 컷에 `video_prompt`가 존재
- 오디오 버튼: 해당 씬의 비디오 Asset이 DB에 존재

### 프론트엔드 — 에셋 생성 서브탭

**위치**: `apps/web/app/(dashboard)/projects/[id]/screenplay/page.tsx`
**Step 6 서브탭**: 기존 [씬 분석 | 컷 설계 | 프롬프트] → [씬 분석 | 컷 설계 | 프롬프트 | **에셋 생성**]

에셋 생성 탭 레이아웃:
- 씬 카드 목록 (시퀀스별 그룹핑)
- 카드마다:
  - 씬 번호 + 시퀀스 + 컷 수
  - 3단계 진행 표시: 이미지 | 비디오 | 오디오
  - 각 단계별: "생성" / "재생성" / 스피너(진행 중) 버튼
  - 완료 시 썸네일 미리보기

### 백엔드 API

#### 이미지 생성 (기존 API 활용)

```
POST /api/screenplay/:projectId/direction-plan/storyboard/generate
Body: { scope: "scene", sceneNumber: N, style?: "webtoon" }
Response: { assets: [{ id, filePath, sceneNumber, type }] }
```
- ConceptArtist 에이전트가 해당 씬의 `image_prompt`로 이미지 생성
- Asset(type: IMAGE, sceneNumber: N) DB 저장

#### 비디오 생성 (새 API)

```
POST /api/screenplay/:projectId/scene/:sceneNumber/generate-video
Response: { assets: [{ id, filePath, sceneNumber, cutNumber, type }] }
```

**에이전트 호출 전략**: 라우트 핸들러에서 `directionPlan.scenes`에서 해당 씬만 추출하여 단일 씬 `DirectionPlan` 래퍼를 구성한 후 `generalist.execute()`에 전달. 기존 storyboard 엔드포인트와 동일한 scope 필터링 패턴.

```typescript
const targetScene = directionPlan.scenes.find(s => s.scene_number === sceneNumber)
const scopedPlan = { ...directionPlan, scenes: [targetScene] }
// generalist.execute({ directionPlan: scopedPlan, ... })
```

- 해당 씬의 모든 컷에 대해 Generalist 에이전트 호출
- 각 컷의 `video_prompt`로 비디오 생성 (Veo 3.0)
- Asset(type: VIDEO, sceneNumber: N) DB 저장

#### 오디오 생성 (새 API)

```
POST /api/screenplay/:projectId/scene/:sceneNumber/generate-audio
Response: { assets: [{ id, filePath, sceneNumber, type }] }
```

동일한 단일 씬 `DirectionPlan` 래퍼 패턴으로 `soundDesigner.execute()` 호출.

#### 에셋 상태 조회 (기존 API 보강)

현재 `GET /api/assets/:projectId`는 필터링 미지원. `sceneNumber`, `type` 쿼리 파라미터 추가:

```
GET /api/assets/:projectId?sceneNumber=N&type=IMAGE
GET /api/assets/:projectId?sceneNumber=N&type=VIDEO
GET /api/assets/:projectId?sceneNumber=N&type=AUDIO
```

Prisma where 절에 `sceneNumber`, `type` 조건 추가.

### 동시성 및 에러 처리

- **동시성**: 씬당 하나의 생성 작업만 허용. 진행 중인 씬의 버튼은 비활성화 (스피너 표시)
- **실패 시**: 에러 메시지 표시 + "재시도" 버튼. 부분 실패 시 성공한 에셋은 유지
- **페이지 이동 후 복귀**: 페이지 로드 시 에셋 조회 API로 각 씬의 생성 상태 복원
- **기존 배치와의 관계**: 배치 실행 시 이미 생성된 에셋이 있는 씬은 기존 에셋을 덮어씀 (배치는 전체 재생성 용도)

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/routes/screenplay.ts` | MODIFY | generate-video, generate-audio 엔드포인트 추가 |
| `apps/api/src/routes/assets.ts` | MODIFY | sceneNumber, type 쿼리 파라미터 필터링 추가 |
| `apps/web/app/(dashboard)/projects/[id]/screenplay/page.tsx` | MODIFY | "에셋 생성" 서브탭 + 씬별 카드 UI |

## Constraints

- 기존 API 최대한 재사용 (이미지 생성)
- 에이전트 코드 변경 없음 — 단일 씬 DirectionPlan 래퍼로 기존 에이전트 재사용
- 기존 Pre-Production / Production 탭 기능 유지 (일괄 생성 경로 보존)
- 추가 npm 의존성 없음
- 진행 상태는 프론트엔드 로컬 state로 관리 (API 요청 중 = 스피너, 완료 = 에셋 조회로 확인)
