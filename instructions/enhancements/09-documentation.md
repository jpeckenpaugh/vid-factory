# Stage 9 — Project Manager / Documentation

## Role / Purpose

Close out the enhancement pass and document what actually happened. This stage
updates the project documentation to reflect the new state accurately and
honestly; it does not retroactively repair or redefine upstream work.

## Inputs

- `enhancements/scope.md` (Stage 1).
- `features/briefs/*.md` (Stage 3).
- Implementation (`backend/` and `frontend/`, Stages 6 and 7).
- `docs/verification-report.md` (Stage 8) — including the enhancement section.
- `instructions/enhancements/summaries/*.md` — the summary files from all prior
  stages.
- Existing `README.md` (and related docs such as `COMPARISON.md`).

## Outputs

- `README.md` — updated to describe the enhancements and the current state of
  the project.

## Instructions

1. Read `enhancements/scope.md`, `features/briefs/*.md`, the implementation, the
   `docs/verification-report.md`, and the prior stage summaries.
2. Read the existing `README.md` carefully so your updates extend it without
   breaking existing content.
3. Update `README.md` to describe the newly added enhancements and any
   behavioral changes, while preserving the existing setup/run instructions.
4. Update the implementation summary to include what the enhancement pass added.
5. Record the current status of the project, including the enhancement pass
   results.
6. List known issues, drawing on `docs/verification-report.md` and any flagged
   concerns from earlier stage summaries.
7. Record the verification results as delivered.
8. Propose possible next actions for future passes.
9. Update related documentation (e.g., `COMPARISON.md`) if the project's
   feature set has materially changed.
10. Document the state as it is; do not dress up or repair facts.
11. Write your summary file (see below).

## What NOT to do

- Do NOT retroactively repair or redefine upstream work.
- Do NOT silently fix known issues during documentation; record them instead.
- Do NOT claim verification results that were not reported.
- Do NOT add features or change behavior while documenting.
- Do NOT omit known issues or open concerns.
- Do NOT erase existing (v0.1) documentation content; extend it.

## Summary

Write `instructions/enhancements/summaries/09-documentation.md` using
`instructions/enhancements/summaries/00-template.md`. Summarize the close-out at
a high level and record the project status, known issues, and recommended next
actions.

As the final step, commit your changes to the current branch and push to
`origin`, using a message in the form `stage 09: <brief summary>`.