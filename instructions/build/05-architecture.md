# Stage 5 — Architect

## Role / Purpose

Translate product requirements into a technical specification: the *shape* of
the code without the code itself. This stage decides structure, data, and
contracts so downstream engineers can implement independently.

## Inputs

- `concept.md` (Stage 1).
- `features/briefs/*.md` (Stage 3).
- Environment definition: `requirements.txt`, `environment-notes.md` (Stage 4).

## Outputs

- `docs/architecture.md` — a technical specification. Create the `docs/` folder.
  It describes:
  - Project/file structure.
  - Module boundaries.
  - Data model and SQLite (or chosen DB) schema.
  - API contracts.
  - Backend/frontend responsibilities.
  - Component interactions.

## Instructions

1. Read `concept.md`, `features/briefs/*.md`, and the environment definition
   (`requirements.txt`, `environment-notes.md`).
2. Create the `docs/` folder and write the specification to
   `docs/architecture.md`.
3. Define the project/file structure and module boundaries.
4. Define the data model and the database schema needed to support the
   features (including persistence of application state as required).
5. Specify the API contracts (routes, methods, payloads, responses) that the
   backend must expose and the frontend must consume.
6. Clearly separate backend responsibilities from frontend responsibilities.
7. Describe how components interact and how application state flows.
8. Produce the specification as reference documentation, not code.
9. Write your summary file (see below).

## What NOT to do

- Do NOT implement application code.
- Do NOT silently rewrite product requirements or feature behavior.
- Do NOT change the approved environment without flagging it.
- Do NOT leave the API/data contracts so vague that engineers must guess.
- Do NOT design unrelated architecture beyond what the requirements demand.

## Summary

Write `summaries/05-architecture.md` using `summaries/00-template.md`.
Summarize the architecture at a high level and flag any unresolved design
decisions, contract ambiguities, or schema concerns that backend and frontend
engineers will need clarified before implementation.

As the final step, commit your changes to the current branch and push to
`origin`, using a message in the form `stage 05: <brief summary>`.