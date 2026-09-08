# Stage 3 — Bug Verification (Human Confirmation + Archive)

## Role / Purpose

Confirm a fixed bug is resolved and archive its report. This stage does **not**
implement or change code. It presents the fix and evidence for a human to
confirm after their own testing; on human approval it records the resolution and
moves the report to `bugs/resolved/`. This is the final confirmation and
archival stage.

## Inputs

- `bugs/*.md` — the batch of bug reports, each with `Status: Fixed`.
- The implemented code from Stage 2 and its automated verification evidence.
- Human confirmation that the bugs are fixed after their own testing.

## Outputs

- Updated reports — for **each** report, a basic verification record (who
  confirmed, when, and the outcome), `Status` set to `Resolved`, moved to
  `bugs/resolved/NN-<slug>.md` (create the `bugs/resolved/` folder).
- `instructions/debug/summaries/03-<slug>.md` — one per report in the batch.

## Instructions

Process every report in the batch. For **each** `bugs/NN-<slug>.md` with
`Status: Fixed`:

1. Read it and the Stage 2 summary to understand the fix and its automated
   verification evidence.
2. Present the fix and its verification evidence for human confirmation.
   **Do not mark the bug resolved without explicit human approval.**
3. On human confirmation:
   - Record a basic verification entry in the report: who confirmed, the
     confirmation date, and the outcome.
   - Set the report's `Status` to `Resolved`.
4. Create the `bugs/resolved/` folder if it does not exist, and move the report
   to `bugs/resolved/NN-<slug>.md`.

Only once **all** reports in the batch are resolved and moved:

5. Write one summary file per report (see below).

## What NOT to do

- Do NOT modify, re-implement, or extend the fix.
- Do NOT mark any bug `Resolved` or move it to `bugs/resolved/` without human
  confirmation.
- Do NOT alter the root cause analysis, proposed fix, or implementation notes
  already in a report.
- Do NOT leave any report in `bugs/` once confirmed resolved — each must be
  moved.
- Do NOT hand off until every report in the batch is resolved and moved.

## Summary

Write `instructions/debug/summaries/03-<slug>.md` for **each** report in the
batch, using `instructions/debug/summaries/00-template.md`. Summarize the
confirmation and the move to `bugs/resolved/` at a high level.

As the final step, commit your changes to the current branch and push to
`origin`, in a single commit covering the whole batch, using a message in the
form `debug 03: <brief summary>`.