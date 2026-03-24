# Result: Session 12 - Phase 8 (Script Coverage Report & PDF Export)

## Overview
Phase 8 implements a comprehensive Hollywood-standard Script Coverage evaluation system. The LLM evaluates screenplays across 5 categories from `docs/design/evaluation criteria.md` (Plot Structure, Character & Dialogue, Theme & Tone, Market Appeal, Production Feasibility), producing scored reports with Pass/Consider/Recommend verdicts. Reports can be exported as PDF directly from the dashboard.

## Key Features Built & Verified

### A. ScriptCoverage Domain Model
- **Path:** `packages/core/src/creative/domain/ScriptCoverage.ts` (new file)
- `ScriptCoverage` interface: title, genre, logline, synopsis, 5 categories with subcategories, overallScore (0-100), verdict, strengths, weaknesses, recommendation.
- `CoverageCategory` and `CoverageSubcategory` with name, score, assessment.
- `Verdict` type: `'Pass' | 'Consider' | 'Recommend'`.

### B. ScriptCoverageEvaluator Engine
- **Path:** `packages/core/src/creative/application/ScriptCoverageEvaluator.ts` (new file)
- Follows existing engine pattern (ILLMProvider injection, condensed script, JSON parsing).
- Takes existing analysis results (beats, emotions, characters, ROI, rating, comps) as reference context.
- LLM system prompt: Senior Hollywood script coverage analyst role with 5 evaluation categories and 12 subcategories.
- Verdict rules: overallScore >= 80 → Recommend, >= 60 → Consider, < 60 → Pass.
- `EngineName` extended with `'coverage'`; Deep strategy routes to `anthropic`.

### C. API Pipeline Integration
- **Path:** `apps/api/src/index.ts`
- Coverage evaluation runs after ROI/comps step in the analysis pipeline.
- `withFallback('coverage', ...)` provides mock fallback on LLM failure.
- Response includes `coverage` field and `providers.coverage` attribution.
- `customProviders` schema extended with `coverage` engine option.

### D. Database Schema
- **Path:** `packages/database/prisma/schema.prisma`
- Added `coverage Json?` nullable column (backward compatible with existing reports).
- Migration `20260320223023_add_coverage_field` applied.
- Repository save/load handles optional coverage field via spread operator.

### E. Dashboard Coverage Report UI
- **Path:** `apps/web/src/app/dashboard/page.tsx`
- Report header with title, genre, logline, overall score (large number), and color-coded verdict badge (green=Recommend, orange=Consider, gray=Pass).
- 5 category score bars (color-coded: green >= 80, orange >= 60, red < 60) with click-to-expand subcategories.
- Synopsis text block.
- Strengths/Weaknesses 2-column grid with +/- markers.
- Analyst recommendation box with gold left border accent.

### F. PDF Export
- **Path:** `apps/web/src/app/dashboard/dashboard.css`
- "Export PDF" button (gold gradient) in results header, triggers `window.print()`.
- `@media print` stylesheet: hides interactive UI (upload, history, strategy, buttons), white background, single-column layout, `page-break-inside: avoid`, A4 page setup, color preservation for charts/badges via `print-color-adjust: exact`.

## How to Run
1. **Start Database**: `docker-compose up -d db`
2. **Start Backend**: `cd apps/api && bun run dev` (Port 4005)
3. **Start Frontend**: `cd apps/web && bun run dev` (Port 4000)
4. **Open Dashboard**: `http://localhost:4000/dashboard`
5. **Upload & Analyze**: Drag a screenplay file → click Analyze → view Coverage Report at top
6. **Export PDF**: Click "Export PDF" button → browser print dialog → Save as PDF

## Verification
- **Tests**: 22/22 unit tests passing across 12 test files.
- **Build**: Next.js production build compiles successfully.
- **API**: `POST /analyze` returns `coverage` field with 5 categories, overallScore, verdict.
- **Prisma**: Migration applied, coverage column in database.
- **Backward Compatibility**: Old reports without coverage render normally (nullable field).
- **Provider Attribution**: Response includes `providers.coverage` showing which LLM handled evaluation.

## Status
- **Milestone**: The system now produces professional Hollywood Script Coverage reports with scored evaluations across 5 industry-standard criteria, exportable as PDF.
