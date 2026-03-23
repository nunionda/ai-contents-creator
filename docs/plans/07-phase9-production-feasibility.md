# Plan: Phase 9 - Production Feasibility Engine

## 1. Objective
Implement a full production feasibility analysis pipeline that deterministically extracts locations, cast, INT/EXT ratio, and shooting day estimates from parsed screenplays, classifies VFX requirements via LLM, and produces a three-tier budget estimate (Low/Likely/High).

## 2. Core Features (Scope)

### A. ProductionBreakdown Domain Model
- **Goal:** Define domain types for production feasibility analysis.
- **Implementation:**
  - `LocationBreakdown`: name, setting (INT/EXT/INT-EXT), time, sceneNumbers, frequency.
  - `CastBreakdown`: name, role, sceneNumbers, totalScenes.
  - `VFXRequirement`: sceneNumber, description, tier (none/simple/moderate/complex), estimatedHours.
  - `BudgetEstimate`: low/likely/high with cast/locations/vfx/crew/postProduction breakdown.
  - `ProductionBreakdown`: aggregate interface combining all sub-analyses.

### B. ProductionAnalyzer (Deterministic)
- **Goal:** Extract production elements from parsed script without LLM.
- **Implementation:**
  - Parse `scene_heading` elements for INT/EXT setting, location name, time of day.
  - Track character appearances per scene for cast breakdown.
  - Compute INT/EXT ratio as percentages.
  - Estimate shooting days: `ceil(sceneCount / 5)` (industry average).

### C. VFXEstimator (LLM Engine)
- **Goal:** Classify VFX complexity of action lines using LLM.
- **Implementation:**
  - Filter action lines containing VFX keywords (36-word dictionary).
  - Send candidates to LLM as VFX Supervisor role for tier classification.
  - Compute `vfxComplexityScore` (0-100) from weighted tier sum.
  - Fallback: assign 'simple' tier on LLM parse failure.

### D. BudgetEstimator (Deterministic)
- **Goal:** Produce a three-tier budget estimate from production data.
- **Cost model:**
  - Locations: INT=$5K/day, EXT=$15K/day × frequency.
  - Cast: Protagonist=$500K, Antagonist=$300K, Supporting=$100K, Minor=$10K.
  - VFX: estimatedHours × $300/h.
  - Crew: shootingDays × $50K/day × 1.4 fringe.
  - Post-production: shootingDays × $20K.
  - Low/Likely/High = 0.8×/1.0×/1.3× of total.

### E. Infrastructure Integration
- `EngineName` extended with `'vfx'`.
- `StrategyResolver`: vfx mapped across all 4 strategies.
- `MockProvider`: VFX mock response for offline development.
- API pipeline: production analysis step after coverage.
- DB: `production Json?` column in `AnalysisReport`.
- Repository: save/load production field.

### F. Dashboard UI
- Production Feasibility header with shooting days, locations, speaking roles, VFX score.
- Budget Estimate range bar (Low/Likely/High) with category breakdown.
- Location list with INT/EXT badges and frequency counts.
- VFX Requirements table with tier badges and hour estimates.
- Cast Breakdown heatmap with role-colored bars.
