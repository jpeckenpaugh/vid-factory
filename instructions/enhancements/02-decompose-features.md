# Stage 2 — Feature Decomposition

## Role / Purpose

Break the agreed enhancement scope into manageable product capabilities. This
stage decides *what* new capabilities the enhancements add, not *how* they are
implemented.

Because this pass extends an existing app, the features produced here are
**additions** to the existing v0.1 features (which live under
`features/completed/`). The fresh `features/` folder holds only the new
capabilities for this pass.

## Inputs

- `enhancements/scope.md` (Stage 1).
- Existing features under `features/completed/` (for context on what already
  exists, to avoid duplicating it).

## Outputs

- One file per new feature under `features/`, named `features/01-<name>.md`,
  `features/02-<name>.md`, and so on. Create the `features/` folder.
- Each feature file lists the capability it represents. The features are
  app-specific and derived from the in-scope enhancements; they are not
  prescribed here.

## Instructions

1. Read `enhancements/scope.md`.
2. Identify the discrete capabilities the in-scope enhancements require beyond
   what already exists in `features/completed/`.
3. Name each capability clearly and concisely.
4. Create the `features/` folder.
5. Write one file per new feature, numbered sequentially, e.g.,
   `features/01-<name>.md`, `features/02-<name>.md`, … Use the feature name in
   place of `<name>`.
6. Ensure the feature files fully cover every in-scope enhancement; do not
   silently drop any.
7. Do not duplicate capabilities that already exist in `features/completed/`;
   decompose only the new work.
8. Stay at the capability level. Do not describe behavior, workflows, or
   implementation.
9. Write your summary file (see below).

## What NOT to do

- Do NOT describe how features are technically implemented.
- Do NOT write filenames, classes, SQL, API routes, or any code.
- Do NOT add features not implied by `enhancements/scope.md`.
- Do NOT omit or rename features such that in-scope enhancement requirements
  are lost.
- Do NOT write product decisions, constraints, or clarifications back into
  `enhancements/scope.md`; capture them in the feature files and your summary.
- Do NOT re-decompose existing v0.1 features that are already in
  `features/completed/`.
- Do NOT jump ahead to design or architecture.

## Summary

Write `instructions/enhancements/summaries/02-decompose-features.md` using
`instructions/enhancements/summaries/00-template.md`. Record the resulting new
feature list at a high level (including the numbered feature files created) and
note any features that are ambiguous or whose scope needs clarification before
briefs are written.

As the final step, commit your changes to the current branch and push to
`origin`, using a message in the form `stage 02: <brief summary>`.