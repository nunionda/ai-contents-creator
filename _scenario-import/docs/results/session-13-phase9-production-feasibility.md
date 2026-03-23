# Result: Session 13 - Phase 9 (Production Feasibility Engine)

## Overview
Phase 9 implements a production feasibility analysis pipeline that deterministically extracts locations, cast, INT/EXT ratio, and shooting day estimates from parsed screenplays, classifies VFX requirements via LLM, and produces a three-tier budget estimate. This adds a new `production` module to the core package, integrates it into the API pipeline and database, and visualizes all production data on the dashboard.

## Key Features Built & Verified

### A. ProductionBreakdown Domain Model
- **Path:** `packages/core/src/production/domain/ProductionBreakdown.ts` (new file)
- `LocationBreakdown`: name, setting (INT/EXT/INT-EXT), time, sceneNumbers, frequency.
- `CastBreakdown`: name, role, sceneNumbers, totalScenes.
- `VFXTier`: 'none' | 'simple' | 'moderate' | 'complex'.
- `VFXRequirement`: sceneNumber, description, tier, estimatedHours.
- `BudgetEstimate`: low/likely/high USD with breakdown by cast, locations, vfx, crew, postProduction.
- `ProductionBreakdown`: aggregate interface tying all sub-analyses together.

### B. ProductionAnalyzer (Deterministic Extraction)
- **Path:** `packages/core/src/production/application/ProductionAnalyzer.ts` (new file)
- `analyzeLocations(elements)`: parses scene_heading for INT/EXT, location name, time of day. Groups by location name, counts frequency.
- `analyzeCast(elements, characters)`: tracks character appearances per scene, maps to roles from CharacterNetwork.
- `computeIntExtRatio(locations)`: INT vs EXT scene percentage.
- `estimateShootingDays(sceneCount)`: `ceil(sceneCount / 5)` industry standard.
- Handles Korean/English scene headings via existing parser metadata.

### C. VFXEstimator (LLM Engine)
- **Path:** `packages/core/src/production/application/VFXEstimator.ts` (new file)
- 36-keyword VFX dictionary (explosion, alien, teleport, dragon, etc.).
- Filters action lines by keyword match, sends up to 30 candidates to LLM.
- LLM role: VFX Supervisor classifying tier + estimating hours.
- `complexityScore = min(100, (weightedSum / sceneCount) × 20)` where simple=1, moderate=3, complex=5.
- Graceful fallback: on JSON parse failure, assigns all candidates as 'simple' tier.

### D. BudgetEstimator (Deterministic)
- **Path:** `packages/core/src/production/application/BudgetEstimator.ts` (new file)
- Cost constants: INT=$5K/day, EXT=$15K/day, Protagonist=$500K, Antagonist=$300K, Supporting=$100K, Minor=$10K, VFX=$300/h, Crew=$50K/day × 1.4 fringe, Post=$20K/day.
- Returns Low/Likely/High (0.8×/1.0×/1.3×) with 5-category breakdown.

### E. Strategy Infrastructure
- **Modified:** `AnalysisStrategy.ts` — added `'vfx'` to `EngineName` union type and `CustomStrategyInput`.
- **Modified:** `StrategyResolver.ts` — vfx mapped to all 4 strategies (fast→gemini, deep→fastClassifier, custom→custom, auto→default).
- **Modified:** `MockProvider.ts` — VFX mock response (3 sample entries) triggered by "VFX Supervisor" keyword.

### F. API Pipeline Integration
- **Modified:** `apps/api/src/index.ts`
- Production analysis runs as step 6 after coverage evaluation.
- Deterministic: `ProductionAnalyzer` for locations/cast/ratio/days.
- LLM: `VFXEstimator` with `withFallback('vfx', ...)` for mock fallback.
- Deterministic: `BudgetEstimator` combines all data into budget estimate.
- Response includes `production` field and `providers.vfx` attribution.
- `customProviders` schema extended with `vfx` engine option.

### G. Database Schema
- **Modified:** `packages/database/prisma/schema.prisma` — added `production Json?` column.
- **Migration:** `20260321001203_add_production_field` applied successfully.
- **Modified:** `AnalysisReportRepository.ts` — save/load/return production field.
- **Modified:** `types.ts` — `AnalysisResultInput` extended with `production?: any`.

### H. Dashboard UI
- **Modified:** `apps/web/src/app/dashboard/page.tsx`
- **Production Feasibility** section between Coverage Report and Results Dashboard.
- Header metrics: Shooting Days, Locations, Speaking Roles, VFX Score (color-coded).
- **Budget Estimate:** range bar (Low/Likely/High) with gradient + 5-category breakdown grid.
- **Locations:** list with INT/EXT/INT-EXT setting badges, time of day, frequency counts.
- **VFX Requirements:** per-shot table with tier badges (color-coded), hour estimates, descriptions.
- **Cast Breakdown:** heatmap bars colored by role (gold=Protagonist, red=Antagonist, blue=Supporting, gray=Minor).
- **Modified:** `dashboard.css` — 120+ lines of production-specific styles, responsive layout, print support.
- `ENGINE_LABELS` and custom provider grid extended with 'vfx' engine.

## Files Changed

### New Files (4)
| File | Description |
|------|-------------|
| `packages/core/src/production/domain/ProductionBreakdown.ts` | Domain model interfaces |
| `packages/core/src/production/application/ProductionAnalyzer.ts` | Deterministic location/cast extraction |
| `packages/core/src/production/application/VFXEstimator.ts` | LLM-based VFX tier classification |
| `packages/core/src/production/application/BudgetEstimator.ts` | Deterministic budget calculation |

### Modified Files (11)
| File | Changes |
|------|---------|
| `packages/core/src/index.ts` | Added 4 production exports |
| `packages/core/src/creative/infrastructure/llm/AnalysisStrategy.ts` | Added 'vfx' to EngineName |
| `packages/core/src/creative/infrastructure/llm/StrategyResolver.ts` | Added vfx to all strategies |
| `packages/core/src/creative/infrastructure/llm/MockProvider.ts` | Added VFX mock response |
| `apps/api/src/index.ts` | Production pipeline step, vfx provider, response fields |
| `packages/database/prisma/schema.prisma` | `production Json?` column |
| `packages/database/src/repository/AnalysisReportRepository.ts` | Save/load production |
| `packages/database/src/repository/types.ts` | `production?: any` |
| `apps/web/src/app/dashboard/page.tsx` | Production Breakdown UI section |
| `apps/web/src/app/dashboard/dashboard.css` | Production styles |
| `apps/web/src/app/layout.tsx` | Page title fix (from earlier in session) |

## Verification
- `bun test` — 22 tests pass across 12 files.
- `tsc --noEmit` — clean on both `apps/api` and `apps/web`.
- Prisma migration `20260321001203_add_production_field` applied successfully.
- Mock fallback provides meaningful production data for offline development.

## How to Run
```bash
# 1. Start database
docker compose up -d

# 2. Start API (port 4005)
cd apps/api && bun run dev

# 3. Start web dashboard (port 4000)
cd apps/web && bun run dev

# 4. Upload a .fountain/.txt/.pdf screenplay
# → Production Feasibility section appears with locations, cast, VFX, budget
```
