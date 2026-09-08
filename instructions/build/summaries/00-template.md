# Role Summary Template

Every role writes one markdown file into the `summaries/` folder using this
template. Name the file `NN-<slug>.md` to match the role's stage number (for
example `summaries/02-decompose-features.md`).

Copy the template below, replace the placeholder text, and remove any section
you do not need. Keep the summary high-level; it is an overview for downstream
roles and humans, not a place to duplicate the role's full work.

---

# Summary: <Role Name> (Stage <NN>)

- **Date:** <YYYY-MM-DD>
- **Author / Executor:** <name>
- **Instruction file:** `instructions/<NN>-<slug>.md`
- **Commit:** `stage <NN>: <brief summary>`

## Work Completed

<A concise, high-level overview of what this role accomplished.>

## Outputs Produced

- <Artifact 1 — e.g., `path/to/file`>
- <Artifact 2>

## Key Decisions

<Optional. Notable choices made and the reason behind them.>

## Open Questions & Concerns

<Items that need resolution before or during the next stage. Be explicit about
anything ambiguous, blocked, or risky. If there are none, state "None.">

## Status

- [ ] Complete
- [ ] Needs review