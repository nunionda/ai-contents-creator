# Plan: Phase 11 - Character Intelligence

## 1. Objective
Extend character analysis with SNA relationship edges, voice uniqueness scoring, and dialogue distribution diversity metrics.

## 2. Core Features

### A. CharacterNetwork Domain Extension
- `CharacterNode`: add optional voiceScore, avgWordsPerLine, vocabularyRichness, sceneAppearances.
- `CharacterEdge`: source, target, weight (co-appearance scenes), dialogueExchanges.
- `DiversityMetrics`: speakingRoleDistribution (top1Pct, top3Pct), centralityGap.

### B. CharacterAnalyzer Extension (Deterministic)
- **Scene tracking**: scene_heading-based character-per-scene mapping.
- **Edge generation**: co-appearance character pairs per scene → edge with weight = shared scenes.
- **Dialogue exchange detection**: sequential speaker pairs → exchange count.
- **Voice score**: avgWordsPerLine + vocabularyRichness → deviation from cast mean → uniqueness score 0-100.
- **Diversity metrics**: top-1/top-3 dialogue share %, centrality gap (edge weight difference #1 vs #2).

### C. Integration
- API response: `characterNetwork` changed from array to `{ characters, edges, diversityMetrics }`.
- DB: No schema change (characterNetwork is already `Json` type).
- Dashboard: relationship list, voice uniqueness bars, diversity donut chart.
