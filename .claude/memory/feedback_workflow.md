---
name: phase-branch-pr-workflow
description: Each implementation phase gets its own branch and PR — Chris merges manually
type: feedback
---

Use a branch-per-phase workflow:
- Create a branch for each phase (e.g., `phase-0/scaffold`, `phase-1/physics`)
- Open a PR to `main` via `gh pr create` at the end of each phase
- Chris reviews, approves, and merges manually before moving to the next phase

**Why:** Chris wants to review each phase independently before it lands on main.
**How to apply:** At the end of each phase, open a PR and stop. Wait for Chris to confirm the merge before starting the next phase.
