# Plan: Phase 3 - Market Intelligence (ROI Predictor)

## 1. Objective
Combine the quantitative market data (Phase 1) and qualitative cognitive features (Phase 2) to forecast a screenplay's commercial viability. This mirrors the `Predictor` boundary that attempts to evaluate ROI tiers and audience ratings before production begins.

## 2. Core Features (Scope)

### A. Feature Engineering Pipeline (`Features.ts`)
- **Goal:** Create a normalized tensor/JSON feature set combining disparate data points.
- **Inputs:**
  1. Box Office Budget, Expected Genres (Phase 1).
  2. Character density, Emotional Valence variance, Beat structure (Phase 2).
  3. Extracted metadata (Page count, dialogue-to-action ratios).
- **Implementation:** Build a standardizer service that scales the numbers to feed into a predictive model.

### B. ROI Predictor Model (`BoxOfficePredictor.ts`)
- **Goal:** Given a screenplay's features, output an automated probability class: `Flop`, `Break-even`, `Hit`, `Blockbuster`.
- **Implementation:** 
  - Since training a full local XGBoost model natively requires massive historical training data, we will implement a generalized heuristic model first, backed by an LLM-assisted regression adapter.
  - LLM receives the numerical snapshot and attempts to estimate the multiplier ($Revenue / Budget$) based on training weights.

### C. MPAA Age Rating Classifier (`ContentRating.ts`)
- **Goal:** Predict whether the film will be rated PG, PG-13, or R.
- **Implementation:** Use deterministic scanning for profanity frequency and rely on the AI's semantic evaluation of violence/drug depictions to determine a regulatory rating.

### D. Trope & Audience Similarity (`SimilaritySearch.ts`)
- **Goal:** Determine "What existing successful movie is this most like?"
- **Implementation:** Once vector chunking is fully active, run a cosine similarity match against an established database of films (mocked for now) to output a "Comp Film" (e.g. "90% similar emotional arc to Inception").

## 3. Storage & Integration
- Output the predicted metrics directly to the unified `ScriptAnalysis` JSON interface which the final dashboard UI (Phase 4) will consume.
