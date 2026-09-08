# Stage 2 — Bug Fix

## Role / Purpose

Implement the fix approved in the bug report. This stage works only from the
report's confirmed root cause and proposed fix. It changes application code,
runs an automated verification of the fix, and updates the report's status — but
it does **not** move the report or claim human confirmation.

## Inputs

- `bugs/*.md` — the batch of bug reports, each with `Status: Approved` (root
  cause and proposed fix confirmed by a human).
- The codebase files identified in the reports.

## Outputs

- Code changes implementing the approved fixes.
- Updated `bugs/*.md` — for **each** report, a note of what changed, the
  automated verification result, and `Status` set to `Fixed`.
- `instructions/debug/summaries/02-<slug>.md` — one per report in the batch.

## Instructions

Process every report in the batch. For **each** `bugs/NN-<slug>.md` with
`Status: Approved`:

1. Read it in full. Implement **only** the proposed fix; do not extend scope.
2. Apply the changes following the repo's existing code conventions, staying
   within the files identified in the report.
3. Run an automated verification of the fix per the report's Follow-up steps,
   using the running application (`./install.sh`, `./run.sh`). Capture any logs
   or scratch output under `./tmp/`.
4. If automated verification fails, iterate on the fix until it passes.
5. Record in the report: what changed (files + lines), the automated
   verification result, and that human confirmation is still pending.
6. Set the report's `Status` to `Fixed`. Do NOT move the report.

Only once **all** reports in the batch are fixed:

7. Write one summary file per report (see below).

## What NOT to do

- Do NOT fix any report without an approved root cause / proposed fix
  (`Status: Approved`) — the whole batch must be `Approved` before Stage 2 runs.
- Do NOT add features or behavior beyond the approved fixes.
- Do NOT regress unrelated existing behavior.
- Do NOT redesign unrelated architecture.
- Do NOT mark any bug `Resolved` or move it to `bugs/resolved/` — that is
  Stage 3's job, after human confirmation.
- Do NOT hand off until every report in the batch is fixed.

## Summary

Write `instructions/debug/summaries/02-<slug>.md` for **each** report in the
batch, using `instructions/debug/summaries/00-template.md`. Summarize the fix at
a high level and note the automated verification result and anything the human
should test before confirming resolution.

As the final step, commit your changes to the current branch and push to
`origin`, in a single commit covering the whole batch, using a message in the
form `debug 02: <brief summary>`.