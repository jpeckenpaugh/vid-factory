# Stage 9 — Project Manager / Documentation

## Role / Purpose

Close out the development pass and document what actually happened. This stage
records the final state of the project accurately and honestly; it does not
retroactively repair or redefine upstream work.

## Inputs

- `concept.md` (Stage 1).
- `features/briefs/*.md` (Stage 3).
- Implementation (`backend/` and `frontend/`, Stages 6 and 7).
- `docs/verification-report.md` (Stage 8).
- `summaries/*.md` — the summary files from all prior stages.

## Outputs

- `README.md` — describes what the project is and how to set it up and run it.

## Instructions

1. Read `concept.md`, `features/briefs/*.md`, the implementation, the
   `docs/verification-report.md`, and the prior stage summaries.
2. Write `README.md` describing what the project is and how to set it up and
   run it (referencing `install.sh` and `run.sh`).
3. Include an implementation summary describing what was actually built.
4. Record the current status of the project.
5. List known issues, drawing on `docs/verification-report.md` and any flagged
   concerns from earlier stage summaries.
6. Record the verification results as delivered.
7. Propose possible next actions for future passes.
8. Document the state as it is; do not dress up or repair facts.
9. Write your summary file (see below).

## What NOT to do

- Do NOT retroactively repair or redefine upstream work.
- Do NOT silently fix known issues during documentation; record them instead.
- Do NOT claim verification results that were not reported.
- Do NOT add features or change behavior while documenting.
- Do NOT omit known issues or open concerns.

## Summary

Write `summaries/09-documentation.md` using `summaries/00-template.md`.
Summarize the close-out at a high level and record the project status, known
issues, and recommended next actions.

As the final step, commit your changes to the current branch and push to
`origin`, using a message in the form `stage 09: <brief summary>`.