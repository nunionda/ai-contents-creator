# Plan: Naming Convention — Script Import & PDF Export

## Overview
스크립트 임포트와 PDF 익스포트에 일관된 네이밍 컨벤션 적용. 기존의 불규칙한 scriptId(`MyScript$`, `[Romanized]한글$`)를 날짜/버전이 포함된 표준 형식으로 교체.

## Naming Rules

### Script Import (DB scriptId)
```
패턴: {name}_analysis_{YYMMDD}_v{NNN}
변환: 파일명 → 확장자 제거 → 한글 로마자 변환 → 특수문자 제거 → 소문자 → 날짜 → 버전(자동증가)
```

### PDF Export
```
패턴: {name}_investor_analysis_{YYMMDD}_v{NNN}.pdf
변환: scriptId의 _analysis_ → _investor_analysis_ 치환
```

## Scope
- API naming utility (`apps/api/src/utils/naming.ts`)
- Frontend naming utility (`apps/web/src/app/dashboard/utils/naming.ts`)
- API scriptId generation refactor (`apps/api/src/index.ts`)
- PDF export filename via `document.title` override
- ReportCover Document ID display
- DB repository `countByPrefix()` for version auto-increment
