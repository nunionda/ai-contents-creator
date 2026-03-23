# Session 33: Naming Convention — Script Import & PDF Export

## Objective
스크립트 임포트 및 PDF 익스포트에 표준 네이밍 컨벤션을 적용하여 파일 관리의 일관성을 확보.

## Changes

### New Files (2)
- **`apps/api/src/utils/naming.ts`** — 네이밍 유틸리티 (API)
  - `romanizeKorean()`, `hasKorean()` — index.ts에서 이동
  - `sanitizeBaseName()` — 파일명 정제 (확장자 제거, 로마자 변환, 소문자, 특수문자 제거)
  - `getDateStamp()` — YYMMDD 포맷
  - `formatVersion()` — v001, v002 포맷
  - `generateScriptId()` — 전체 scriptId 생성
  - `getVersionSearchPattern()` — DB 버전 조회용 prefix
  - `generateExportFileName()` — investor_analysis 형식 변환
  - `extractBaseName()`, `extractVersion()` — scriptId 파싱

- **`apps/web/src/app/dashboard/utils/naming.ts`** — 네이밍 유틸리티 (Frontend)
  - `generateExportFileName()` — scriptId → investor_analysis 파일명 (레거시 호환)

### Modified Files (4)
- **`apps/api/src/index.ts`**
  - 인라인 romanize/hasKorean/capitalizeFirst 함수 삭제 → utils/naming.ts로 이동
  - scriptId 생성: `generateScriptId(fileName, nextVersion)` 호출
  - 버전 자동 증가: `reportRepo.countByPrefix(prefix)` 조회

- **`apps/web/src/app/dashboard/page.tsx`**
  - PDF Export 버튼: `document.title` 임시 변경 → 브라우저가 해당 이름으로 PDF 저장

- **`apps/web/src/app/dashboard/components/ReportCover.tsx`**
  - "프로젝트 ID" → "문서 ID" (Document ID)
  - investor_analysis 형식 파일명 표시

- **`packages/database/src/repository/AnalysisReportRepository.ts`**
  - `countByPrefix(prefix)` 메서드 추가 (버전 자동 증가용)

## Naming Convention Examples

| Input | scriptId (DB) | PDF Export |
|-------|--------------|------------|
| `미궁.fountain` | `migung_analysis_260322_v001` | `migung_investor_analysis_260322_v001.pdf` |
| `The Matrix.txt` | `thematrix_analysis_260322_v001` | `thematrix_investor_analysis_260322_v001.pdf` |
| `빛과그림자.pdf` | `bitgwageulimja_analysis_260322_v001` | `bitgwageulimja_investor_analysis_260322_v001.pdf` |
| 같은 파일 재분석 | `migung_analysis_260322_v002` | `migung_investor_analysis_260322_v002.pdf` |

## Verification
- `npx next build` — 프론트엔드 빌드 성공
- `npx tsc --noEmit` — API 타입체크 성공
- 버전 자동 증가: DB prefix 조회 후 +1

## How to Run
```bash
cd apps/api && bun run dev     # API server :4005
cd apps/web && npm run dev     # Web :4000
```
