# Role Summary Template (Enhancement Pass)

Every role in the enhancement pass writes one markdown file into the
`instructions/enhancements/summaries/` folder using this template. Name the file
`NN-<slug>.md` to match the role's stage number (for example
`instructions/enhancements/summaries/06-backend.md`).

Copy the template below, replace the placeholder text, and remove any section
you do not need. Keep the summary high-level; it is an overview for downstream
roles and humans, not a place to duplicate the role's full work.

---

# Summary: <Role Name> (Stage <NN>)

- **Date:** <YYYY-MM-DD>
- **Author / Executor:** <name>
- **Instruction file:** `instructions/enhancements/<NN>-<slug>.md`
- **Scope reference:** `enhancements/scope.md`
- **Commit:** `stage <NN>: <brief summary>`

## Work Completed

<A concise, high-level overview of what this role accomplished in this
enhancement pass.>

## Outputs Produced / Modified

- <Artifact created or modified — e.g., `path/to/file`>
- <Describe whether each is a new artifact or a modification to existing v0.1
  artifacts.>

## Key Decisions

<Optional. Notable choices made and the reason behind them, including any
decisions about how the enhancement integrates with the existing app.>

## Open Questions & Concerns

<Items that need resolution before or during the next stage. Be explicit about
anything ambiguous, blocked, or risky. If there are none, state "None.">

## Status

- [ ] Complete
- [ ] Needs review