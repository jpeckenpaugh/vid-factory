# Stage 7 — Frontend Engineer

## Role / Purpose

Implement the browser interface against the approved product behavior and the
API contracts defined upstream. This stage builds what the user sees and how
it interacts with the backend.

## Inputs

- `features/briefs/*.md` (Stage 3).
- `docs/architecture.md` (Stage 5).
- Backend / API contract (Stage 6), i.e., the running `backend/` API.

## Outputs

- All frontend code placed under the `frontend/` folder. Create the
  `frontend/` folder. This includes HTML, CSS, JavaScript, and the baseline UI
  framework interface (per `docs/architecture.md`). Exact file names are your
  choice; keep them organized and consistent with `docs/architecture.md`.

## Instructions

1. Read `features/briefs/*.md`, `docs/architecture.md`, and the backend/API
   contract.
2. Create the `frontend/` folder and build the interface there.
3. Build the interface to match the approved product behavior.
4. Consume the backend via the API contract as defined; do not invent endpoints.
5. Implement all user-visible modes/behaviors from the feature briefs, with the
   feedback behavior (e.g., immediate vs. end-of-session results) that each mode
   specifies.
6. Apply the baseline UI framework as specified in `docs/architecture.md`.
7. Ensure application state displayed in the UI is sourced from the backend as
   specified.
8. Write your summary file (see below).

## What NOT to do

- Do NOT redesign APIs or invent new backend endpoints.
- Do NOT silently change product requirements.
- Do NOT redefine the architecture or module boundaries.
- Do NOT implement backend logic in the frontend.
- Do NOT introduce features not present in the briefs.

## Summary

Write `summaries/07-frontend.md` using `summaries/00-template.md`.
Summarize the frontend at a high level and flag any API mismatches, behavior
ambiguities, or assumptions the verification stage must check.

As the final step, commit your changes to the current branch and push to
`origin`, using a message in the form `stage 07: <brief summary>`.