# Stage 8 — Verification Engineer

## Role / Purpose

Perform bounded observation and evidence gathering after the enhancement pass.
This stage checks whether the in-scope enhancements work and that the existing
application still behaves correctly, and produces an evidence-backed pass/fail
report. It does not fix, redesign, or extend anything.

## Inputs

- The enhanced application (the `backend/` and `frontend/` folders).
- Environment scripts: `install.sh`, `run.sh`, `requirements.txt` (Stage 4).
- Approved specifications: `enhancements/scope.md`, `features/briefs/*.md`,
  `docs/architecture.md` (including the enhancement section) — used to derive
  the verification checklist.
- The existing v0.1 verification report (`docs/verification-report.md`) as
  context for prior results.

## Outputs

- `docs/verification-report.md` — extended with a pass/fail verification section
  for the enhancement pass, with recorded failures and evidence. Existing v0.1
  results are preserved.

## Instructions

1. Read the enhanced application, the environment scripts, and the approved
   specifications.
2. Derive a verification checklist from the approved specifications — each item
   an observable, pass/fail check traceable to a specific requirement
   (enhancement scope, feature brief, or architecture/API contract change).
3. Include checks that the enhancements do not regress existing (v0.1) behavior.
4. Set up and run the application using the provided environment scripts
   (`install.sh`, `run.sh`).
5. Verify backend/API behavior against the checklist using a command-line HTTP
   client (e.g., `curl`) against the running application.
6. For frontend behavior, perform a static review of the rendering logic against
   the checklist; note that browser interaction is not exercised by an
   automation tool in this environment.
7. For each check, record a pass/fail result.
8. Capture concrete evidence for every result (HTTP responses from the API
   client, static review notes, screenshots if available).
9. Compile the results into the verification report, appending an enhancement
   section to `docs/verification-report.md` while preserving the v0.1 results.
10. Report failures clearly, with the evidence that supports them.
11. Write your summary file (see below).

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
- Do NOT erase or rewrite the existing v0.1 verification results.

## Summary

Write `instructions/enhancements/summaries/08-verification.md` using
`instructions/enhancements/summaries/00-template.md`. Summarize the verification
outcome at a high level and list any failures or concerns that the documentation
stage must record and that a future pass may need to address. Record how the
checklist was derived from the specifications and the verification method used.

As the final step, commit your changes to the current branch and push to
`origin`, using a message in the form `stage 08: <brief summary>`.