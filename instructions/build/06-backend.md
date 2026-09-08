# Stage 6 — Backend Engineer

## Role / Purpose

Implement the backend according to the approved specifications: the API server,
persistence, and backend application logic that the frontend and the features
depend on.

## Inputs

- `features/briefs/*.md` (Stage 3).
- `docs/architecture.md` (Stage 5).
- Environment definition: `requirements.txt`, `install.sh`, `run.sh`,
  `environment-notes.md` (Stage 4).

## Outputs

- All backend code placed under the `backend/` folder. Create the `backend/`
  folder. This includes the API server, the persistence layer, and backend
  application logic. Exact file names are your choice; keep them organized and
  consistent with `docs/architecture.md`.

## Instructions

1. Read `features/briefs/*.md`, `docs/architecture.md`, and the environment
   definition.
2. Create the `backend/` folder and implement the backend there.
3. Implement the backend exactly as specified in `docs/architecture.md`.
4. Build the database persistence layer and schema as specified.
5. Implement every API endpoint defined in the API contracts.
6. Implement the backend application logic that supports the features.
7. Adhere to the environment set up in Stage 4 (`requirements.txt`,
   `install.sh`, `run.sh`).
8. Ensure the backend behaves per the feature briefs and matches the
   frontend-facing API contract.
9. Write your summary file (see below).

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
  and quantity* of data (e.g., a fixed number of seed records) but not the
  actual content, author plausible default content as part of the
  persistence/seed layer. Flag in your summary that this content was
  backend-authored so downstream roles know its origin.
- **Auth / token gates.** Where a contract specifies an auth gate (e.g., an
  opaque token) without real credential verification, implement the simplest
  mechanism faithful to the contract — for example, an in-memory set of issued
  tokens checked on protected routes. Document lifecycle caveats (such as
  tokens becoming invalid on restart) so the frontend can respond appropriately
  (e.g., re-authenticate when it receives a 401).

## What NOT to do

- Do NOT redefine requirements or silently change feature behavior.
- Do NOT redesign unrelated architecture.
- Do NOT independently change frontend-facing API contracts without flagging it.
- Do NOT implement the frontend.
- Do NOT deviate from the agreed environment without noting it.
- Do NOT silently invent content, auth, or run-script behavior beyond what is
  needed; resolve gaps minimally and flag them.

## Summary

Write `summaries/06-backend.md` using `summaries/00-template.md`.
Summarize the backend at a high level and flag any contract deviations,
assumptions, or behavior questions the frontend engineer or verification stage
must know about. Include any backend-authored content, run-script adjustments,
or auth-gate lifecycle caveats.

As the final step, commit your changes to the current branch and push to
`origin`, using a message in the form `stage 06: <brief summary>`.