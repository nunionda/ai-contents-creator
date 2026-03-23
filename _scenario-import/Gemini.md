# Scenario Analysis System Orchestration

This project follows a 4-stage development process to build a Hollywood Script Intelligence System.

## Project Structure (Orchestration)

- `src/fetcher/`: (Stage 1) Data pipeline - Screenplay scraping & Box office data collection.
- `src/analyzer/`: (Stage 2) Creative NLP - Narrative arc, emotion, and character analysis.
- `src/predictor/`: (Stage 3) Market Intelligence - ROI, success, and MPAA rating prediction.
- `src/ui/`: (Stage 4) Visualization Dashboard - Next.js based interface (to be implemented later).

## Orchestration Flow

1.  **Ingestion**: Screenplay (Fountain/PDF) via `Fetcher`.
2.  **Parsing**: Convert script to structured JSON objects.
3.  **Analysis**: Extract features (beats, sentiment, network) via `Analyzer`.
4.  **Prediction**: Input features into ML models via `Predictor`.
5.  **Output**: Generate reports and visualization data.

## AI-Native Development Engine (Autoresearch)

Inspired by autonomous AI research loops, the development of core analytical models (Stages 2 & 3) will utilize an `autoresearch` approach:
- **Agent Loop**: An autonomous agent iteratively modifies a single target file (e.g., the prediction model) to optimize a specific, deterministic metric (e.g., Box Office MAPE, Trope Matching F1 Score).
- **Fixed Budget**: Each agent experiment runs for a fixed time budget to ensure comparable iterations.
- **Human Role**: Human developers focus on optimizing the `autoresearch_integration.md` (the agent's prompt/goals) rather than manually tuning model architectures.

## Environment Guide
- **Runtime**: Bun
- **Language**: TypeScript
- **Entry**: `index.ts` (orchestrator)
