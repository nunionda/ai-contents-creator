# Result: Session 18 — Dashboard Design Refinements

## Overview
Six targeted design improvements addressing i18n, data accuracy, naming conventions, layout, and responsive design across the dashboard and API.

## Changes

### 1. Korean/English Toggle Button
- Added `Globe` icon button in dashboard header with `locale` state (`en` | `ko`)
- Key UI labels translated: upload panel titles, drop zone, strategy labels, history panel, warning banner, subtitle
- Styled `.btn-locale` with hover effects, hidden in print
- **Files:** `page.tsx`, `UploadPanel.tsx`, `dashboard.css`

### 2. Mock Fallback Warning Accuracy
- **Before:** `"Some results used mock fallback due to LLM rate limits"` — vague, misleading
- **After:** `"Mock placeholder data used for: Emotion, Coverage. These results are not actual AI analysis."` — explicit engine list + clear message
- Added `mockEngines` string array in API response for frontend to display specific engines
- Korean translation in warning banner when `locale === 'ko'`
- **Files:** `apps/api/src/index.ts`, `page.tsx`

### 3. Recent Reports Naming Convention (filename$)
- Frontend passes `fileName` (e.g. `fight_club.fountain`) in API request body
- API generates `scriptId = baseName + "$"` → `fight_club$`
- Falls back to `movieId` or `script-{timestamp}` if no filename provided
- Added `fileName` to Elysia body schema validation
- **Files:** `page.tsx`, `apps/api/src/index.ts`

### 4. Coverage Report Categories — All Expanded by Default
- Changed from single-expand (`expandedCategory: number | null`) to collapse-tracking (`collapsedCategories: Set<number>`)
- All 5 categories (Plot Structure & Logic → Production Feasibility) expanded on load
- Added "Expand All / Collapse All" toggle button
- Subcategories redesigned: 2-column grid, score badge with `/100` label, color-coded Excellent/Good/Fair/Weak labels
- Subcategory cards with subtle background and rounded border
- Mobile: single-column subcategories
- **Files:** `CoverageReport.tsx`, `dashboard.css`

### 5. PDCA: Emotional Valence Arc — Full Scene Coverage
- **P(Plan):** `scenario-analysis-system.md` specifies analyzing each segment's emotional tone. The real `EmotionAnalyzer` already processes ALL scenes. MockProvider returned fixed 10 scenes regardless of script.
- **D(Do):** Updated `MockProvider` to parse `[Scene N]` markers from the user prompt and generate dynamic scene count. Emotion arc follows a "Man in a Hole" sine curve mapped to the actual scene count.
- **C(Check):** 23 tests pass. TypeScript clean on web + API.
- **A(Act):** Applied — mock now mirrors actual scene count instead of hardcoded 10.
- **Files:** `packages/core/src/creative/infrastructure/llm/MockProvider.ts`

### 6. Beat Sheet — Responsive Card Layout Redesign
- **Before:** Horizontal scroll with fixed-width 200px `inline-block` nodes, truncated on tablet/mobile
- **After:** Act-grouped card grid with color-coded headers:
  - Act 1 = green, Act 2 = blue, Act 3 = gold
  - Act section headers with colored divider line
  - Beat cards with left border accent, scene range badge, hover lift effect
- Responsive breakpoints: 3-col (desktop) → 2-col (tablet) → 1-col (mobile)
- Print: 2-column grid with color preservation
- **Files:** `BeatSheetTimeline.tsx`, `dashboard.css`

## Files Changed

| File | Changes |
|------|---------|
| `apps/web/src/app/dashboard/page.tsx` | Locale state, Globe toggle, fileName in API payload, warning banner i18n |
| `apps/web/src/app/dashboard/components/UploadPanel.tsx` | `locale` prop, Korean translations for all labels |
| `apps/web/src/app/dashboard/components/CoverageReport.tsx` | All-expanded default, collapse-tracking, subcategory grid with score badges |
| `apps/web/src/app/dashboard/components/BeatSheetTimeline.tsx` | Act-grouped responsive card grid, color-coded acts |
| `apps/web/src/app/dashboard/dashboard.css` | `.btn-locale`, `.beat-grid`/`.beat-card`, `.subcategory-*`, responsive breakpoints, print rules |
| `apps/api/src/index.ts` | `fileName` body param, `baseName$` scriptId, `mockEngines` array, improved warning |
| `packages/core/src/creative/infrastructure/llm/MockProvider.ts` | Dynamic scene count from prompt parsing, sine-curve emotion arc |

## Verification
- `tsc --noEmit` — clean on both API and web
- `bun test` — 23 tests pass (0 failures)
