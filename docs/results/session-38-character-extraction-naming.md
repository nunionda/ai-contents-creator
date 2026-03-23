# Session 38: Character Extraction Fix & Naming Convention Upgrade

## Summary

한국 시나리오 캐릭터 추출의 오탐지 문제를 수정하고, PDF 출력 잘림을 해결하고, Gemini 모델 체인을 낮은→높은 버전 순으로 재배열하고, 네이밍 컨벤션에서 한글 제목을 영어 번역으로 변환하도록 개선했다.

## Key Changes

### 1. Character Extraction — parser.ts

- **기관명 필터 확장**: `정찰국` suffix 추가 (술정찰국 필터링)
- **일반 단어/감탄사 제외 목록 추가**: 그냥, 그래, 씨발, 으악, 부웅, 하더니, 그러자, 제단, 수술실, 아마, 내가, 우리, 뉴스, 헤이
- `koreanCommonWordRe` 패턴에 동일 단어 추가

### 2. CharacterAnalyzer.ts — 6개 패스 추가/개선

| Pass | 기능 | 해결 문제 |
|------|------|----------|
| 1.6 | 이름 suffix 병합 | 강설희→설희, 한진우→진우 |
| 1.6b | particle prefix 제거 | 이리철→리철 (이 접두사) |
| 1.7 | 노이즈/기관 필터 | 정찰총국, 카르텔, 크기, 간격, 비트 세이버, 전설 때문인 |
| 1.8 | sceneCharacters + dialoguePairs 정리 | 엣지에 삭제된 캐릭터 참조 방지 |

### 3. PDF Print CSS

- `.location-list`, `.vfx-list`에 `@media print`에서 `max-height: none`, `overflow: visible` 추가
- 촬영지/VFX 섹션이 PDF에서 잘리지 않도록 수정

### 4. Gemini Model Chain — 낮→높 순서

| Tier | Before (high→low) | After (low→high) |
|------|-------------------|-------------------|
| standard | 2.5-flash → 2.0-flash | 1.5-flash → 2.0-flash → 2.5-flash |
| pro | 2.5-pro → 2.5-flash | 1.5-pro → 2.0-flash → 2.5-pro |
| long-context | 1.5-pro → 2.5-pro | (유지) |

### 5. Naming Convention — 한글→영어 번역

- `KO_EN_DICTIONARY` 30개 한국 영화 제목 매핑 추가
- `translateKorean()` 함수로 사전 검색 우선, 미등록 시 로마자 fallback
- MAX_SLUG_LENGTH 20→30 확장

| 파일명 | Before (로마자) | After (영어) |
|--------|----------------|-------------|
| 전율미궁_귀신의집.pdf | jeonyul-migung | thrill-maze-haunted-house |
| 비트세비어.pdf | biteu-sebieo | beat-savior |
| 더킹.pdf | deo-king | the-king |

## Verification Results

### Character Extraction — 3개 시나리오 ALL PASS

| 시나리오 | Characters | Suspicious | Bad Edges | Status |
|----------|-----------|------------|-----------|--------|
| 비트세비어 | 15 | 0 | 0 | ✅ |
| 더킹 | 36 | 0 | 0 | ✅ |
| 전율미궁 | 12 | 0 | 0 | ✅ |

### 비트세비어 수정 전 vs 후

**수정 전 오류:**
- 정찰총국 (기관) → 조연으로 인식
- 비트 세이버 (영화 제목) → 조연으로 인식
- 강설희 ≠ 설희 (미병합)
- 한진우 ≠ 진우 (미병합)
- 이리철 → 리철로 변환 안 됨
- 카르텔, 크기, 간격 → 단역으로 인식
- 엣지에 카르텔, 크기, 간격 참조

**수정 후:** 모든 오류 해결

## Files Changed

| File | Change |
|------|--------|
| `packages/core/src/script/infrastructure/parser.ts` | 기관/감탄사/대명사 필터 확장 |
| `packages/core/src/creative/application/CharacterAnalyzer.ts` | Pass 1.6/1.6b/1.7/1.8 추가 |
| `apps/web/src/app/dashboard/dashboard.css` | @media print 촬영지/VFX 잘림 수정 |
| `packages/core/src/creative/infrastructure/llm/GeminiProvider.ts` | 모델 체인 low→high |
| `apps/api/src/utils/naming.ts` | KO→EN 사전 번역 |
