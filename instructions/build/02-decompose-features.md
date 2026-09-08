# Stage 2 — Feature Decomposition

## Role / Purpose

Break the approved concept into manageable product capabilities. This stage
decides *what* capabilities the product has, not *how* they are implemented.

## Inputs

- `concept.md` (from Stage 1).

## Outputs

- One file per feature under `features/`, named `features/01-<name>.md`,
  `features/02-<name>.md`, and so on. Create the `features/` folder.
- Each feature file lists the capability it represents. The features are
  app-specific and derived from `concept.md`; they are not prescribed here.

## Instructions

1. Read `concept.md`.
2. Identify the discrete capabilities the product must provide to satisfy the
   concept.
3. Name each capability clearly and concisely.
4. Create the `features/` folder.
5. Write one file per feature, numbered sequentially in the order you list
   them, e.g., `features/01-<name>.md`, `features/02-<name>.md`, … Use the
   feature name in place of `<name>`.
6. Ensure the feature files fully cover every requirement in `concept.md`; do
   not silently drop any.
7. Stay at the capability level. Do not describe behavior, workflows, or
   implementation.
8. Write your summary file (see below).

## What NOT to do

- Do NOT describe how features are technically implemented.
- Do NOT write filenames, classes, SQL, API routes, or any code.
- Do NOT add features that are not present in `concept.md`.
- Do NOT omit or rename features such that concept requirements are lost.
- Do NOT write product decisions, constraints, or clarifications back into
  `concept.md`; capture them in the feature files and your summary.
- Do NOT jump ahead to design or architecture.

## Summary

Write `summaries/02-decompose-features.md` using `summaries/00-template.md`.
Record the resulting feature list at a high level (including the numbered
feature files created) and note any features that are ambiguous or whose scope
needs clarification before briefs are written.

As the final step, commit your changes to the current branch and push to
`origin`, using a message in the form `stage 02: <brief summary>`.