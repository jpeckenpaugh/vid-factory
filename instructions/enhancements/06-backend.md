# Stage 6 — Backend Engineer

## Role / Purpose

Extend the backend to implement the in-scope enhancements according to the
approved specifications. The backend already exists from the v0.1 build, so this
stage **modifies** the existing API server, persistence layer, and backend
application logic to add the enhancement behavior — it does not recreate them.

## Inputs

- `features/briefs/*.md` (Stage 3).
- `docs/architecture.md` (Stage 5) — including the added enhancement section.
- Existing backend code under `backend/`.
- Environment definition: `requirements.txt`, `install.sh`, `run.sh`,
  `environment-notes.md` (Stage 4).

## Outputs

- Modifications to the backend code under `backend/` implementing the
  in-scope enhancements. Exact file names are your choice; keep them organized
  and consistent with `docs/architecture.md`.

## Instructions

1. Read `features/briefs/*.md`, `docs/architecture.md` (including the
   enhancement section), the existing backend, and the environment definition.
2. Read the existing backend code carefully so your changes extend it without
   breaking existing behavior.
3. Implement the backend changes exactly as specified in the enhancement section
   of `docs/architecture.md`.
4. Apply database persistence layer and schema changes as specified (e.g., new
   or modified columns/tables).
5. Implement or modify the API endpoints defined in the API contract changes.
6. Implement the backend application logic that supports the new features.
7. Do not regress existing (v0.1) endpoints or behavior that are out of scope.
8. Adhere to the environment set up in Stage 4 (`requirements.txt`,
   `install.sh`, `run.sh`).
9. Ensure the backend behaves per the feature briefs and matches the
   frontend-facing API contract.
10. Write your summary file (see below).

## Implementation guidance (generalized)

These principles apply when the backend must fill gaps left by the approved
specifications. Resolve each in a way that keeps the architecture and API
contracts intact, and record the resolution in your summary.

- **Run script vs. module layout.** If the environment's run/start script
  references a module import path that conflicts with the backend layout you
  implement, adjust the script (e.g., its import target or `PYTHONPATH`) to
  resolve the conflict, as the environment notes permit. Do not relocate
  modules in a way that breaks the architecture's declared structure.
- **Undefined seed / sample content.** Where a specification states the *shape
  and quantity* of data but not the actual content, author plausible default
  content as part of the persistence/seed layer. Flag in your summary that this
  content was backend-authored so downstream roles know its origin.
- **Auth / token gates.** Where a contract specifies an auth gate without real
  credential verification, implement the simplest mechanism faithful to the
  contract. Document lifecycle caveats so the frontend can respond
  appropriately (e.g., re-authenticate on a 401).
- **Schema migration on existing data.** When adding a field to an existing
  table, consider how existing rows are handled (default value, nullable, or
  backfill) and record the decision in your summary so the frontend and
  verification stages know.

## What NOT to do

- Do NOT redefine requirements or silently change feature behavior.
- Do NOT redesign unrelated architecture.
- Do NOT independently change frontend-facing API contracts without flagging it.
- Do NOT implement the frontend.
- Do NOT deviate from the agreed environment without noting it.
- Do NOT delete or regress existing (v0.1) endpoints, schema, or behavior that
  are out of scope.
- Do NOT silently invent behavior beyond what is needed; resolve gaps minimally
  and flag them.

## Summary

Write `instructions/enhancements/summaries/06-backend.md` using
`instructions/enhancements/summaries/00-template.md`. Summarize the backend
changes at a high level and flag any contract deviations, schema-migration
decisions, assumptions, or behavior questions the frontend engineer or
verification stage must know about.

As the final step, commit your changes to the current branch and push to
`origin`, using a message in the form `stage 06: <brief summary>`.