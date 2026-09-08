# Stage 3 — Feature Brief Writer

## Role / Purpose

Describe each new feature behaviorally and explicitly. This stage turns each
feature on the list into a short, unambiguous brief that the downstream
engineering roles can implement against.

Because this pass extends an existing app, each brief should describe the new
behavior **in the context of the existing application** — what changes or is
added to the current user experience — rather than describing a brand-new
product.

## Inputs

- `enhancements/scope.md` (Stage 1).
- `features/*.md` (Stage 2) — the new feature list.
- Existing feature briefs under `features/completed/briefs/` (for context on
  the existing behavior these features extend).

## Outputs

- One brief per new feature under `features/briefs/`, named
  `features/briefs/01-<name>.md`, `features/briefs/02-<name>.md`, and so on.
  Create the `features/briefs/` folder. Each brief covers:
  - Purpose.
  - Expected behavior.
  - Inputs / outputs.
  - User-visible behavior.
  - Constraints.
  - Basic acceptance expectations.

## Instructions

1. Read `enhancements/scope.md` and every file in `features/`.
2. Read the relevant existing briefs under `features/completed/briefs/` so the
   new behavior is described relative to what already exists.
3. For every feature file in `features/`, write one brief.
4. Keep the numbering and naming in sync with the feature files: for each
   `features/NN-<name>.md` write `features/briefs/NN-<name>.md`.
5. For each brief, describe:
   - **Purpose** — why the feature exists and what it adds to the app.
   - **Expected behavior** — what the feature does, step by step at a
     behavioral level, including how it interacts with existing behavior.
   - **Inputs / outputs** — what it takes in and produces from the user's
     perspective.
   - **User-visible behavior** — what the user sees and experiences, and how it
     differs from the current experience.
   - **Constraints** — limits or rules it must respect (including not regressing
     existing behavior).
   - **Basic acceptance expectations** — how one would recognize it works.
6. Be explicit and unambiguous so the behavior can be implemented without
   guesswork.
7. Ensure every new feature has a brief; do not silently skip or merge features.
8. Write your summary file (see below).

## What NOT to do

- Do NOT write filenames, Python classes, SQL queries, or implementation code.
- Do NOT design technical architecture or choose frameworks.
- Do NOT invent behavior not implied by `enhancements/scope.md` or the feature
  files.
- Do NOT modify `enhancements/scope.md`; if behavior is underspecified, capture
  the clarification in the brief and flag it in your summary rather than
  rewriting the upstream scope.
- Do NOT drop or weaken constraints from upstream.
- Do NOT combine distinct features into one brief if they were decomposed
  separately.
- Do NOT rewrite or redefine existing v0.1 briefs; only describe the new deltas.

## Summary

Write `instructions/enhancements/summaries/03-write-feature-briefs.md` using
`instructions/enhancements/summaries/00-template.md`. Summarize the briefs at a
high level (including the numbered brief files created) and flag any feature
whose behavior is unclear, underspecified, or in conflict with
`enhancements/scope.md` so it can be resolved before engineering begins.

As the final step, commit your changes to the current branch and push to
`origin`, using a message in the form `stage 03: <brief summary>`.