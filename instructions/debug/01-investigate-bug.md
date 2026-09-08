# Stage 1 — Bug Investigation (Root-Cause Analysis)

## Role / Purpose

Analyze a reported bug without changing application code. Reproduce or observe
the failure, trace it to a root cause with specific evidence (files and line
numbers), and propose a fix so that the human and the fix stage understand
exactly what to change. This is the *diagnosis* stage.

## Inputs

- `bugs/*.md` — the batch of open bug reports (symptom, environment,
  reproduction steps). These are the single, authoritative sources for this
  stage; each report is processed.
- The relevant codebase (`frontend/`, `backend/`, `docs/`).
- Optionally the running application (via `./install.sh`, `./run.sh`) to
  reproduce or observe the bugs.

## Outputs

- Updated `bugs/*.md` — for **each** report, appending a **Root Cause Analysis**
  section (with specific `file:line` evidence) and a **Proposed Fix** section,
  and setting its `Status` to `Analyzed`.
- `instructions/debug/summaries/01-<slug>.md` — one per report in the batch.

## Instructions

Process every report in the batch. For **each** `bugs/NN-<slug>.md`:

1. Read it in full; treat the reported symptom as the target.
2. Reproduce or observe the failure if feasible, using the running application.
   Capture any logs or scratch output under `./tmp/`.
3. Trace the failure back to its root cause. Support every conclusion with
   specific evidence — cite the exact files and line numbers involved.
4. If multiple independent causes exist, separate them and state each clearly.
5. For each cause, propose a fix (including any data cleanup needed) and note
   the files that would be changed.
6. Append the Root Cause Analysis and Proposed Fix sections to the bug report,
   keeping the original symptom and reproduction steps intact.
7. Set the report's `Status` to `Analyzed`.

Only once **all** reports in the batch have been analyzed:

8. Write one summary file per report (see below).

## What NOT to do

- Do NOT modify or fix application code.
- Do NOT commit fixes.
- Do NOT guess; support every proposed cause with code evidence.
- Do NOT redesign unrelated architecture.
- Do NOT delete, rewrite, or weaken the original symptom or reproduction steps
  in a report.
- Do NOT move any bug report to `bugs/resolved/`.
- Do NOT hand off until every report in the batch has been analyzed.

## Summary

Write `instructions/debug/summaries/01-<slug>.md` for **each** report in the
batch, using `instructions/debug/summaries/00-template.md`. Record the root
cause and proposed fix at a high level, and flag anything the human must approve
before the fix stage runs.

As the final step, commit your changes to the current branch and push to
`origin`, in a single commit covering the whole batch, using a message in the
form `debug 01: <brief summary>`.