# Stage 3 — Feature Brief Writer

## Role / Purpose

Describe each feature behaviorally and explicitly. This stage turns each
feature on the list into a short, unambiguous brief that a human and the
downstream engineering roles can implement against.

## Inputs

- `concept.md` (Stage 1).
- `features/*.md` (Stage 2) — the feature list.

## Outputs

- One brief per feature under `features/briefs/`, named
  `features/briefs/01-<name>.md`, `features/briefs/02-<name>.md`, and so on.
  Create the `features/briefs/` folder. Each brief covers:
  - Purpose.
  - Expected behavior.
  - Inputs / outputs.
  - User-visible behavior.
  - Constraints.
  - Basic acceptance expectations.

## Instructions

1. Read `concept.md` and every file in `features/`.
2. For every feature file in `features/`, write one brief.
3. Keep the numbering and naming in sync with the feature files: for each
   `features/NN-<name>.md` write `features/briefs/NN-<name>.md`.
4. For each brief, describe:
   - **Purpose** — why the feature exists.
   - **Expected behavior** — what the feature does, step by step at a
     behavioral level.
   - **Inputs / outputs** — what it takes in and produces from the user's
     perspective.
   - **User-visible behavior** — what the user sees and experiences.
   - **Constraints** — limits or rules it must respect.
   - **Basic acceptance expectations** — how one would recognize it works.
5. Be explicit and unambiguous so the behavior can be implemented without
   guesswork.
6. Ensure every feature has a brief; do not silently skip or merge features.
7. Write your summary file (see below).

## What NOT to do

- Do NOT write filenames, Python classes, SQL queries, or implementation code.
- Do NOT design technical architecture or choose frameworks.
- Do NOT invent behavior not implied by `concept.md` or the feature files.
- Do NOT modify `concept.md`; if behavior is underspecified, capture the
  clarification in the brief and flag it in your summary rather than rewriting
  the upstream concept.
- Do NOT drop or weaken constraints from upstream.
- Do NOT combine distinct features into one brief if they were decomposed
  separately.

## Summary

Write `summaries/03-write-feature-briefs.md` using `summaries/00-template.md`.
Summarize the briefs at a high level (including the numbered brief files
created) and flag any feature whose behavior is unclear, underspecified, or in
conflict with `concept.md` so it can be resolved before engineering begins.

As the final step, commit your changes to the current branch and push to
`origin`, using a message in the form `stage 03: <brief summary>`.