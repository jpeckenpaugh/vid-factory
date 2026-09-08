# Stage 10 — Archive

## Role / Purpose

Relocate a completed phase/sprint's artifacts into `archive/<phase>/` so the
live working folders (`enhancements/`, `features/`) reflect only the current
sprint. Archiving is relocation, not deletion: the files remain in the
repository under `archive/` as durable reference, and their contents are not
altered. This stage runs at the end of a sprint and can also be invoked
on-demand to archive an earlier phase/sprint (e.g. the pre-existing v0.1 build
or a prior sprint).

## Inputs

- Run-specific target: the phase(s) to archive (e.g. `build`, `sprint01`,
  `sprint02`). Supplied by the Stage Manager for this run.
- The artifacts produced for that phase:
  - For a **build** phase: `features/completed/` and `features/completed/briefs/`.
  - For a **sprint** phase: the sprint concept file (`enhancements/sprintNN.md`),
    the agreed scope (`enhancements/scope.md`), that sprint's feature files under
    `features/`, its `features/briefs/`, and its per-stage summaries under
    `instructions/enhancements/summaries/`.

## Outputs

- `archive/<phase>/` populated with that phase's files, preserving their
  internal structure.
- The source files removed from their working locations, using `git mv`.

## Instructions

1. Determine the phase(s) from the run target.
2. For a **build** phase: `git mv features/completed` to
   `archive/build/features/completed` (including its `briefs/`).
3. For a **sprint** phase: `git mv` into `archive/<phase>/`:
   - the sprint concept file (`sprintNN.md`),
   - `scope.md`,
   - that sprint's feature files and `briefs/` (the `features/` files created
     by Stages 2 and 3 for that sprint),
   - that sprint's per-stage summaries under
     `instructions/enhancements/summaries/`.
4. Preserve each file's internal folder structure under its archive root.
5. Keep in place (do not archive): `00-template.md`, `docs/`, `backend/`,
   `frontend/`, environment scripts, and the live working files belonging to the
   current (unarchived) sprint.
6. Do NOT edit, delete, or regress any file content; move files only.
7. Write your summary file (see below).

## What NOT to do

- Do NOT delete files; use `git mv` so history and content are preserved.
- Do NOT edit or reformat the content of archived files.
- Do NOT archive persistent/cumulative artifacts (`docs/`, `backend/`,
  `frontend/`, `00-template.md`, environment scripts).
- Do NOT archive the current sprint's in-progress working files.
- Do NOT perform any other stage's work.

## Summary

Write `instructions/enhancements/summaries/10-archive.md` using
`instructions/enhancements/summaries/00-template.md`. Record which phase(s) were
archived, the archive roots created, and any open concerns.

As the final step, commit your changes to the current branch and push to
`origin`, using a message in the form `stage 10: archive <phase> artifacts`.