# Stage 8 — Verification Engineer

## Role / Purpose

Perform bounded observation and evidence gathering after implementation. This
stage checks whether the delivered application meets the approved
specifications and produces an evidence-backed pass/fail report. It does not
fix, redesign, or extend anything.

## Inputs

- Completed application (the `backend/` and `frontend/` folders).
- Environment scripts: `install.sh`, `run.sh`, `requirements.txt` (Stage 4).
- Approved specifications: `concept.md`, `features/briefs/*.md`,
  `docs/architecture.md` — used to derive the verification checklist.

## Outputs

- `docs/verification-report.md` — a pass/fail verification report with recorded
  failures and evidence.

## Instructions

1. Read the completed application, the environment scripts, and the approved
   specifications.
2. Derive a verification checklist from the approved specifications — each item
   an observable, pass/fail check traceable to a specific requirement (concept,
   feature brief, or architecture/API contract).
3. Set up and run the application using the provided environment scripts
   (`install.sh`, `run.sh`).
4. Verify backend/API behavior against the checklist using a command-line HTTP
   client (e.g., `curl`) against the running application.
5. For frontend behavior, perform a static review of the rendering logic against
   the checklist; note that browser interaction is not exercised by an
   automation tool in this environment.
6. For each check, record a pass/fail result.
7. Capture concrete evidence for every result (HTTP responses from the API
   client, static review notes, screenshots if available).
8. Compile the results into a single pass/fail verification report at
   `docs/verification-report.md`.
9. Report failures clearly, with the evidence that supports them.
10. Write your summary file (see below).

## What NOT to do

- Do NOT repair or fix code.
- Do NOT modify requirements or feature behavior.
- Do NOT redesign architecture.
- Do NOT autonomously loop or keep iterating on the implementation.
- Do NOT report pass/fail without supporting evidence.
- Do NOT expect a checklist to be provided by another role; derive it from the
  approved specifications.
- Do NOT claim browser interaction was automated when it was only statically
  reviewed.

## Summary

Write `summaries/08-verification.md` using `summaries/00-template.md`.
Summarize the verification outcome at a high level and list any failures or
concerns that the documentation stage must record and that a future pass may
need to address. Record how the checklist was derived from the specifications
and the verification method used (e.g., `curl` for API checks plus static review
of frontend logic), including any limitation that browser interaction was not
headlessly exercised.

As the final step, commit your changes to the current branch and push to
`origin`, using a message in the form `stage 08: <brief summary>`.