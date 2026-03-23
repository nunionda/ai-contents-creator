# Plan: Phase 8 - Script Coverage Report & PDF Export

## 1. Objective
Implement a comprehensive Hollywood-standard Script Coverage evaluation system based on the 5 evaluation criteria defined in `docs/design/evaluation criteria.md`. Generate a scored, verdict-bearing report (Pass/Consider/Recommend) and enable PDF export from the dashboard.

## 2. Core Features (Scope)

### A. ScriptCoverage Domain Model
- **Goal:** Define the domain types for a scored Script Coverage report.
- **Implementation:**
  - `ScriptCoverage` interface with 5 evaluation categories, subcategory scores (0-100), overall score, verdict, synopsis, logline, strengths/weaknesses, and analyst recommendation.
  - `Verdict` type: `'Pass' | 'Consider' | 'Recommend'`
  - `CoverageCategory` and `CoverageSubcategory` interfaces.

### B. ScriptCoverageEvaluator Engine
- **Goal:** LLM-powered comprehensive screenplay evaluation across 5 categories.
- **Implementation:**
  - Follows existing engine pattern (ILLMProvider injection, JSON parsing).
  - Takes condensed script + existing analysis results (beats, emotion, characters, ROI, rating, comps) as context.
  - LLM prompt: Hollywood Script Coverage analyst role, 5 categories with subcategories, 0-100 scoring.
  - Verdict: overallScore >= 80 → Recommend, >= 60 → Consider, < 60 → Pass.
  - Added to `EngineName` type and `StrategyResolver` (deep → anthropic for high reasoning).

### C. API Pipeline Integration
- **Goal:** Add coverage evaluation as the final step in the analysis pipeline.
- **Implementation:**
  - `POST /analyze` runs `ScriptCoverageEvaluator` after ROI/comps, response includes `coverage` field.
  - `GET /providers` custom providers schema extended with `coverage` engine.
  - Prisma schema: `coverage Json?` nullable column (backward compatible).
  - Repository save/load handles coverage field.

### D. Dashboard Coverage Report UI
- **Goal:** Display the Script Coverage report prominently in the results view.
- **Implementation:**
  - Report header: title, genre, logline, overall score (large number), verdict badge (color-coded).
  - 5 category score bars with expandable subcategories.
  - Synopsis text block.
  - Strengths/Weaknesses 2-column layout with green/red markers.
  - Analyst recommendation box with gold left border.

### E. PDF Export
- **Goal:** Enable PDF download of the analysis report.
- **Implementation:**
  - `window.print()` + CSS `@media print` — zero external dependencies.
  - "Export PDF" button with Download icon in results header.
  - Print styles: hide interactive UI, white background, single-column layout, page break control, color preservation for charts and badges.

## 3. Files Modified

| File | Change |
|------|--------|
| `packages/core/src/creative/domain/ScriptCoverage.ts` | New file: domain model |
| `packages/core/src/creative/application/ScriptCoverageEvaluator.ts` | New file: LLM evaluation engine |
| `packages/core/src/creative/infrastructure/llm/AnalysisStrategy.ts` | `EngineName` + `CustomStrategyInput` extended |
| `packages/core/src/creative/infrastructure/llm/StrategyResolver.ts` | Coverage provider mapping |
| `packages/core/src/creative/infrastructure/llm/MockProvider.ts` | Mock coverage response |
| `packages/core/src/index.ts` | New exports |
| `apps/api/src/index.ts` | Coverage pipeline step + schema |
| `packages/database/prisma/schema.prisma` | `coverage Json?` column |
| `packages/database/src/repository/AnalysisReportRepository.ts` | Coverage save/load |
| `packages/database/src/repository/types.ts` | Coverage type |
| `apps/web/src/app/dashboard/page.tsx` | Coverage UI + Export PDF button |
| `apps/web/src/app/dashboard/dashboard.css` | Coverage styles + `@media print` |
