# Stage 5 — Architect

## Role / Purpose

Translate the in-scope enhancements into an addition to the technical
specification: the *shape* of the code changes without the code itself. This
stage decides how the enhancements affect structure, data, and contracts so the
downstream engineers can implement independently.

Unlike the original build (which created `docs/architecture.md` from scratch),
this stage **extends the existing** `docs/architecture.md` with the deltas
needed for the enhancements, without rewriting the existing spec.

## Inputs

- `enhancements/scope.md` (Stage 1).
- `features/briefs/*.md` (Stage 3).
- Existing `docs/architecture.md` (the v0.1 technical specification).
- Environment definition: `requirements.txt`, `environment-notes.md` (Stage 4).

## Outputs

- `docs/architecture.md` — extended with an enhancement section describing:
  - Data model / schema changes (e.g., new or modified fields).
  - API contract changes (new or modified endpoints, payloads, responses).
  - Frontend/backend responsibility changes.
  - Any component interaction or state-flow changes.
  - What is explicitly unchanged / out of scope.

## Instructions

1. Read `enhancements/scope.md`, `features/briefs/*.md`, the existing
   `docs/architecture.md`, and the environment definition.
2. Read the existing `docs/architecture.md` carefully so the additions are
   consistent with it and do not contradict existing contracts.
3. Append a clearly-marked enhancement section to `docs/architecture.md`.
4. Define the data model and schema changes needed to support the enhancements.
5. Specify the API contract changes (routes, methods, payloads, responses) the
   backend must expose and the frontend must consume.
6. Specify any backend/frontend responsibility changes.
7. Describe any component interaction or application-state-flow changes.
8. Note explicitly what existing behavior and contracts remain unchanged (out
   of scope).
9. Produce the specification as reference documentation, not code.
10. Write your summary file (see below).

## What NOT to do

- Do NOT implement application code.
- Do NOT rewrite or remove the existing v0.1 architecture specification.
- Do NOT silently change existing product requirements or feature behavior.
- Do NOT change the approved environment without flagging it.
- Do NOT leave the API/data contract changes so vague that engineers must guess.
- Do NOT design unrelated architecture beyond what the enhancements demand.

## Summary

Write `instructions/enhancements/summaries/05-architecture.md` using
`instructions/enhancements/summaries/00-template.md`. Summarize the
architectural additions at a high level and flag any unresolved design
decisions, contract ambiguities, or schema concerns that backend and frontend
engineers will need clarified before implementation.

As the final step, commit your changes to the current branch and push to
`origin`, using a message in the form `stage 05: <brief summary>`.