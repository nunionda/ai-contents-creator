---
description: Run this workflow at the end of a coding session to sync documentation and commit changes.
---
# Session Wrap-up Workflow

This workflow automates the process of saving the session's architectural plans and implementation results into the `docs/` folder, updating the README, and committing to git.

1. **Verify Implementation Plan:** Ensure that any architectural planning done during this session was properly documented as a sequential markdown file in the `docs/plans/` directory (e.g., `docs/plans/02-creative-nlp-engine.md`). If not, generate one summarizing the intended architecture and scope for this phase.
2. **Summarize Execution Results:** Review the code implemented in the current session. Create a new markdown file in the `docs/results/` directory using the same naming convention (e.g., `docs/results/02-creative-nlp-engine.md`) detailing the APIs built, infrastructure updates, and features completed against the plan.
3. **Update README:** Read the files in `docs/plans/` and `docs/results/` and automatically update the `README.md` file's `## Development Track` section to include links to both the Plan and the Result for the session/phase.
// turbo
4. `git add docs/plans/ docs/results/ README.md`
// turbo
5. `git commit -m "docs: auto-sync implementation plans and results"`

### Git Flow Branch Strategy
5. **Branch Verification:** Ensure that your current session's work was committed to an appropriate branch according to standard Git Flow:
   - `main`: Production-ready code only.
   - `develop`: Main development branch containing the latest stable features.
   - `feature/<name>`: For new features or updates (e.g., `feature/pdf-parser`).
   - `hotfix/<name>`: For urgent production fixes.
6. **Merge to Develop:** If the feature is completed, run the appropriate git commands to merge the `feature/` branch into the `develop` branch.
// turbo
7. `git push origin develop` (or the current active branch if remote is configured)
