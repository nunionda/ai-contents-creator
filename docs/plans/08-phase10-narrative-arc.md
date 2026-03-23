# Plan: Phase 10 - Narrative Arc Intelligence

## 1. Objective
Classify screenplays into Vonnegut's 6 narrative arc types using emotion graph data, detect pacing issues (sagging, flat, rushed), and evaluate genre fit.

## 2. Core Features

### A. NarrativeArc Domain Model
- `VonnegutArcType`: rags-to-riches, riches-to-rags, man-in-a-hole, icarus, cinderella, oedipus.
- `PacingIssue`: type (sagging/rushed/flat), scene range, severity.
- `TurningPoint`: scene number, type (rise/fall/plateau), magnitude.
- `NarrativeArc`: arc classification with confidence, turning points, pacing issues, genre fit.

### B. NarrativeArcClassifier (Deterministic + LLM Hybrid)
- **Deterministic**: Split emotion scores into 3 acts, compute act averages, pattern-match against 6 arc templates with weighted scoring.
- **Turning Point Detection**: Scene-to-scene changes ≥3 points = rise/fall; consecutive changes <1 = plateau.
- **Pacing Issue Detection**:
  - Flat: 3+ consecutive scenes with change < 1.0.
  - Sagging: 4+ consecutive negative slopes in Act 2.
  - Rushed: 2+ consecutive jumps > 6 points.
- **LLM**: Genre detection from emotional arc data (single-word classification).
- **Genre Fit**: Arc-to-genre matching with similarity scoring.

### C. Integration
- Core exports: NarrativeArc domain + NarrativeArcClassifier.
- MockProvider: genre classifier mock response.
- API: narrative arc classification after emotion analysis, uses emotion provider.
- DB: `narrativeArc Json?` column.
- Dashboard: arc badge, turning points chips, genre fit bar, pacing issues list.
