# AI-Native Development: Autoresearch Integration

## Overview of Autoresearch Algorithm

The `autoresearch` algorithm, inspired by Karpathy's autonomous agent research approach, provides a framework where an AI agent iteratively improves a target metric within a fixed time budget autonomously. 

**Key Principles:**
1. **Single File Modification**: The agent only modifies the core logic (`train.py` in the original, or a specific prediction/analysis module in our case).
2. **Fixed Time Budget**: Experiments run for a strictly defined duration (e.g., 5 minutes). This ensures comparability of results regardless of architectural changes and allows for rapid, predictable iteration cycles (e.g., overnight runs).
3. **Programmatic Guidance**: A single markdown file (`program.md`) contains the human-defined instructions, constraints, and objectives for the agent. The human iterates on this meta-prompt, while the AI iterates on the code.
4. **Single Deterministic Metric**: Success is measured by a single, robust metric (like `val_bpb` - validation bits per byte).

## Application to the Hollywood Scenario Evaluation System

We can adapt this powerful AI-native workflow to accelerate the development of our core predictive models in Stage 2 (Creative NLP) and Stage 3 (Market Intelligence).

### 1. Stage 3: ROI & Box Office Predictor

The most direct application is optimizing the financial prediction models.

*   **Target Metric**: `Mean Absolute Percentage Error (MAPE)` or `R² score` on a pinned validation set of recent box-office data.
*   **Target File (`src/predictor/model.ts` or Python equivalent)**: The script containing the XGBoost/LSTM ensemble architecture, feature engineering pipelines, and hyperparameter definitions.
*   **The Workflow**:
    1.  The AI agent modifies feature combinations, model architectures, or hyperparameters in the target file.
    2.  The script trains on historical data and evaluates against the validation set within a tight, fixed time budget (e.g., 5 minutes per run).
    3.  If the MAPE improves, the agent keeps the change; otherwise, it reverts.

### 2. Stage 2: Creative Quality & Trope Matching

We can also apply this to optimize the NLP extraction algorithms.

*   **Target Metric**: `F1 Score` or `Cosine Similarity Accuracy` against a human-annotated ground truth dataset of script tropes and emotional arcs (e.g., the TrUMAn dataset).
*   **Target File (`src/analyzer/nlp_engine.ts`)**: The script responsible for RAG chunking strategies, prompt templates for the LLM, and knowledge graph construction logic.
*   **The Workflow**:
    1.  The agent experiments with different text chunking sizes, embedding models, or system prompts for feature extraction.
    2.  The output is evaluated against the ground truth.
    3.  The agent iteratively refines the NLP pipeline to maximize accuracy within the time budget.

## Orchestration Update (`Gemini.md` Integration)

To support this AI-native approach, our orchestration must define the "Agent Loop" environment.

**Required Infrastructure:**
1.  **Fixed Evaluation Pipeline**: We need a highly optimized, reproducible evaluation script (`evaluate.ts`) that calculates our target metrics quickly and deterministically.
2.  **Meta-Prompting File (`autoresearch.md`)**: A living document guiding the AI agent on *what* to optimize next in the Scenario Evaluation System.
3.  **Data Sharding**: Fast, easy access to training and validation datasets (parquet files) without network bottlenecks.

By treating our core algorithms as evolving entities driven by autonomous agents, we shift the human role from writing boilerplate ML code to designing the *experiment topology* and the *evaluation metrics*—true Decision Intelligence.
