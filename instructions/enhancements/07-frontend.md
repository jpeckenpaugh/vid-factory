# Stage 7 — Frontend Engineer

## Role / Purpose

Extend the browser interface to implement the in-scope enhancements against the
approved product behavior and the API contracts defined upstream. The frontend
already exists from the v0.1 build, so this stage **modifies** the existing
HTML/CSS/JS to add the enhancement behavior — it does not recreate the interface.

## Inputs

- `features/briefs/*.md` (Stage 3).
- `docs/architecture.md` (Stage 5) — including the added enhancement section.
- Backend / API contract (Stage 6), i.e., the running `backend/` API.
- Existing frontend code under `frontend/`.

## Outputs

- Modifications to the frontend code under `frontend/` implementing the
  in-scope enhancements. Exact file names are your choice; keep them organized
  and consistent with `docs/architecture.md`.

## Instructions

1. Read `features/briefs/*.md`, `docs/architecture.md` (including the
   enhancement section), the backend/API contract, and the existing frontend.
2. Read the existing frontend code carefully so your changes extend it without
   breaking existing behavior.
3. Modify the interface to match the approved enhancement behavior, in the
   context of the existing screens.
4. Consume the backend via the API contract as defined; do not invent endpoints.
5. Implement all new user-visible behaviors from the feature briefs, integrating
   them with the existing modes/screens.
6. Apply the baseline UI framework as specified in `docs/architecture.md`.
7. Ensure application state displayed in the UI is sourced from the backend as
   specified.
8. Do not regress existing (v0.1) UI behavior or navigation that is out of scope.
9. Write your summary file (see below).

## What NOT to do

- Do NOT redesign APIs or invent new backend endpoints.
- Do NOT silently change product requirements.
- Do NOT redefine the architecture or module boundaries.
- Do NOT implement backend logic in the frontend.
- Do NOT introduce features not present in the briefs.
- Do NOT delete or regress existing (v0.1) UI behavior, views, or navigation
  that are out of scope.

## Summary

Write `instructions/enhancements/summaries/07-frontend.md` using
`instructions/enhancements/summaries/00-template.md`. Summarize the frontend
changes at a high level and flag any API mismatches, behavior ambiguities, or
assumptions the verification stage must check.

As the final step, commit your changes to the current branch and push to
`origin`, using a message in the form `stage 07: <brief summary>`.