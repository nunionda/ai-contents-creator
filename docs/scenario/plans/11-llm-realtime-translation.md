# Plan: LLM Real-time Translation (Report Content KO/EN)

## Overview
When the KO locale toggle is pressed, all LLM-generated report text (coverage synopsis, beat descriptions, emotion explanations, ROI reasoning, etc.) should be translated to Korean in real time via an LLM API call.

## Scope
- New `POST /translate` API endpoint that accepts a full report + target language
- Extracts all translatable text fields, sends a single LLM call for bulk translation
- Frontend `displayData` pattern: switches between original and translated data based on locale
- In-memory cache prevents re-translation of same report within a session

## Architecture
- **API**: Extract → Translate → Merge pattern using existing `LLMFactory` + `resolveStrategy()`
- **Frontend**: `translatedData` state + `useEffect` on locale change + `displayData` computed value
- **Fallback**: On translation failure, original English text is preserved (graceful degradation)

## Translatable Fields
- Coverage: synopsis, logline, strengths[], weaknesses[], recommendation, subcategory assessments
- Beat Sheet: beat descriptions
- Emotion Graph: dominantEmotion, explanation
- Narrative Arc: arcDescription, pacing issue descriptions, genre fit deviation
- Predictions: ROI reasoning, rating reasons
- Tropes: trope names

## Files
| File | Change |
|------|--------|
| `apps/api/src/index.ts` | `POST /translate` endpoint |
| `apps/web/src/app/dashboard/page.tsx` | Translation state, displayData switching |
| `apps/web/src/app/dashboard/dashboard.css` | Translating indicator styles |
