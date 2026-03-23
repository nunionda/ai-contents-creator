# Plan: Phase 12 - Benchmarker Expansion + Comp Film DB

## 1. Objective
Replace hardcoded 3-film catalog with 50+ film database, implement cosine similarity matching, add trope tagging via LLM, and expand comp results to 5 films.

## 2. Core Features

### A. Film Catalog (50+ films)
- Genre-balanced catalog: Action 10, Drama 10, Sci-Fi 8, Comedy 6, Horror 6, Romance 5, Animation 5.
- Each film: title, year, genres, budget, revenue, roi, rating, tropes, narrativeTraits.
- Trope dictionary: 50 standard narrative tropes.

### B. Benchmarker Refactoring
- Feature vector: dialogueRatio, volatility, sceneCountNorm, charCountNorm, avgWordsNorm, dialogueHeavy, actionHeavy.
- Cosine similarity between script vector and catalog film vectors.
- Trope overlap bonus (15% max boost).
- Trait auto-matching (dialogue heavy, action heavy, volatility level).
- Top 5 results (was 2).

### C. TropeAnalyzer (LLM Engine)
- LLM prompt: identify 5-10 narrative tropes from screenplay excerpt.
- Validates against 50-trope dictionary.
- New `EngineName`: `trope`.

### D. Integration
- API: trope analysis step, tropes in response, tropes passed to Benchmarker.
- DB: `tropes Json?` column.
- Dashboard: trope tag cloud, enhanced comp cards with similarity badges.
