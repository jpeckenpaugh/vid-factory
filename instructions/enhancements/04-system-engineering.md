# Stage 4 — System Engineer

## Role / Purpose

Reassess the development/runtime environment for the enhancement pass. The
environment already exists from the v0.1 build (`requirements.txt`,
`install.sh`, `run.sh`, `.gitignore`, `environment-notes.md`), so this stage
determines whether the enhancements require any changes to it. It owns setup
and environment; it does not define product behavior or implement application
features.

## Inputs

- `features/briefs/*.md` (Stage 3).
- Existing environment artifacts: `requirements.txt`, `install.sh`, `run.sh`,
  `.gitignore`, `environment-notes.md`.

## Outputs

- Updates (only if needed) to `requirements.txt`, `install.sh`, `run.sh`,
  `.gitignore`, and `environment-notes.md`.
- If no environment changes are needed, no new outputs are required.

## Instructions

1. Read `features/briefs/*.md` and the existing environment artifacts.
2. Determine whether any in-scope enhancement requires a new dependency,
   runtime change, script change, or environment note.
3. If a change is needed, apply the minimal change:
   - Add/update dependencies in `requirements.txt`.
   - Update `install.sh` and/or `run.sh` if setup or startup changes.
   - Update `.gitignore` if new generated/excluded paths appear.
   - Update `environment-notes.md` with any new assumptions or caveats.
4. If no change is needed, record that explicitly in your summary; do not make
   gratuitous edits.
5. Do not change the environment contract that downstream roles rely on without
   flagging it.
6. Write your summary file (see below).

## What NOT to do

- Do NOT implement application features or product behavior.
- Do NOT write business logic, API endpoints, or UI code.
- Do NOT modify product requirements or feature behavior.
- Do NOT introduce dependencies or environment changes that the briefs do not
  require.
- Do NOT silently change the environment contract that downstream roles rely on.

## Summary

Write `instructions/enhancements/summaries/04-system-engineering.md` using
`instructions/enhancements/summaries/00-template.md`. Summarize the environment
assessment at a high level — including whether any changes were needed — and
flag any assumptions, new dependencies, or platform caveats that downstream
roles need to know about.

As the final step, commit your changes to the current branch and push to
`origin`, using a message in the form `stage 04: <brief summary>`.