# Plan: Phase 2 - Creative NLP Engine

## 1. Objective
Build an AI-driven text analysis pipeline capable of replicating a human script reader's cognitive breakdown of a screenplay. This maps to the core features benchmarked against industry standard tools (e.g., OnDesk, ScriptBook).

## 2. Core Features (Scope)

### A. Narrative Structure Extraction (Beat Sheet)
- **Goal:** Analyze the script linearly to extract a 15-point or traditional 3-Act structure "Beat Sheet".
- **Implementation:** Utilize the Multi-LLM Orchestrator built in Session 4. Construct prompts to iteratively feed chunked scenes into Anthropic (Claude 3.5 Sonnet) to detect Inciting Incidents, Midpoints, and Climaxes.

### B. Sentiment & Emotion Graph
- **Goal:** Trace the emotional valence (positive vs negative) of the script scene-by-scene to map the overall story arc (e.g., "Man in a Hole", "Rags to Riches").
- **Implementation:** Prompt LLMs to score the emotional tone of each scene on a scale of -10 to +10. Output array of scores to be rendered on the Next.js Dashboard.

### C. Character Network Analysis
- **Goal:** Quantify character prominence.
- **Implementation:** 
  1. Extract character names and calculate dialogue density (line counts, word counts).
  2. Map co-occurrences in identical scenes to build an edges/nodes Graph highlighting the Central Protagonist vs Supporting Cast.

## 3. Storage & Integration
- **Vector DB (Pinecone):** Future-proofing the architecture to store chunks of text embeddings for semantic search and retrieval augmented generation (RAG) during deep script Q&A.
