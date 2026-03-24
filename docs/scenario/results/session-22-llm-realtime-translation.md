# Result: Session 22 — LLM Real-time Translation

## Overview
Added real-time Korean translation of all LLM-generated report content. When the KO locale toggle is pressed, the frontend calls a new `/translate` API endpoint that uses an LLM to translate all report text fields to Korean in a single bulk call.

## Changes

### 1. API: `POST /translate` Endpoint
- Accepts `{ report, targetLanguage, strategy? }` body
- Extracts all translatable text fields into a structured JSON object:
  - Coverage: synopsis, logline, strengths, weaknesses, recommendation, subcategory assessments
  - Beat Sheet: beat name + description per beat
  - Emotion Graph: dominantEmotion + explanation per scene
  - Narrative Arc: arcDescription, pacing issue descriptions, genre fit deviation
  - Predictions: ROI reasoning, rating reasons
  - Tropes: trope names
- Single LLM call with film industry translation prompt (cost-optimized)
- Parses LLM JSON response and merges translated values back into the report
- Graceful fallback: returns original report if translation fails
- Uses `resolveStrategy()` to pick the coverage-tier provider for translation
- **File:** `apps/api/src/index.ts`

### 2. Frontend: Translation State Management
- New state: `translatedData`, `isTranslating`, `translationCache` (useRef Map)
- `useEffect` triggers `translateReport()` when locale switches to 'ko' and no cached translation exists
- `displayData` computed value: uses translated data in KO mode, original data in EN mode
- All content-rendering components receive `displayData` instead of `data`
- Header metadata (scriptId, summary badges, stat cards) still uses original `data`
- Translation cache keyed by `scriptId` prevents re-translation within session
- `translatedData` cleared on new analysis or report load
- **File:** `apps/web/src/app/dashboard/page.tsx`

### 3. Translation Loading Indicator
- "번역 중..." / "Translating..." spinner in header during LLM translation
- Uses Loader2 icon with CSS spin animation
- Hidden in print mode (`.no-print`)
- **File:** `apps/web/src/app/dashboard/dashboard.css`

## Files Changed

| File | Changes |
|------|---------|
| `apps/api/src/index.ts` | `POST /translate` endpoint — field extraction, LLM translation, merge logic |
| `apps/web/src/app/dashboard/page.tsx` | `translatedData` state, `translateReport()`, `displayData` pattern, loading indicator |
| `apps/web/src/app/dashboard/dashboard.css` | `.translating-indicator`, `.spin-icon` styles |

## Verification
- `tsc --noEmit` — api, web both clean (0 errors)
- `bun test` — 23 tests pass (0 failures)
