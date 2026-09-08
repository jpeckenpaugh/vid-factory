# Stage 1 — Enhancement Intake

## Role / Purpose

Agree the scope of the enhancement pass. This is the first stage of the
enhancement pipeline. Its job is to translate the sprint concept into the agreed
scope for this pass and to record that agreement in plain words, with no
technical detail.

Unlike the original build (which started from a clean concept), this workflow
extends an existing application. There is no new product concept to write —
instead, the agreed scope is drawn from the sprint concept.

## Inputs

- `enhancements/sprintNN.md` — the sprint concept (the single, authoritative
  source for this pass). The concrete sprint file path is supplied by the Stage
  Manager as the run-specific target (e.g. `enhancements/sprint02.md`).
- The existing application and its constraints — read the existing documentation
  **and code** (`docs/architecture.md`, `features/completed/`, `backend/`,
  `frontend/`) as needed for context on what is being extended.
- Stakeholder guidance on scope.

## Outputs

- `enhancements/scope.md` — a concise scope document stating:
  - Every concept/idea in `enhancements/sprintNN.md`, categorized as a feature,
    a constraint, or a boundary (no concept dropped).
  - The high-level intent of each item.
  - Any constraints or boundaries on the pass.

## Instructions

1. Read the sprint concept file (`enhancements/sprintNN.md`, per the run target)
   in full (do not skip any item).
2. For every concept in the sprint concept file, determine whether it is a
   feature, a constraint, or a boundary; nothing is left out of `scope.md`.
   The sprint items do not map 1-to-1 to features.
3. Write `enhancements/scope.md` listing every item by its letter (a., b., c.,
   …) from the sprint concept file, each tagged with its category.
4. For each item, record its high-level intent in plain language.
5. Record any constraints or boundaries on the pass (for example, scope limits,
   or that no out-of-scope existing behavior should be changed).
6. Keep the document short and readable; it is the reference for every
   downstream stage.
7. Write your summary file (see below).

## What NOT to do

- Do NOT specify API routes, packages, schemas, or any code structure.
- Do NOT design the architecture or technical implementation.
- Do NOT add items that are not present in the sprint concept file
  (`enhancements/sprintNN.md`).
- Do NOT produce code or configuration of any kind.
- Do NOT rewrite the existing product concept or drop existing product
  constraints.
- Do NOT silently change or drop agreed constraints.
- Do NOT use the codebase reading to specify implementation; `scope.md` remains
  non-technical (no API routes, packages, schemas, or code structure).

## Summary

Write `instructions/enhancements/summaries/01-enhancement-intake.md` using
`instructions/enhancements/summaries/00-template.md`. Record the agreed scope at
a high level and any open questions or concerns about scope that the next
stages (or a human) should address.

As the final step, commit your changes to the current branch and push to
`origin`, using a message in the form `stage 01: <brief summary>`.