# Role Summary Template (Debug)

Every role in a stage writes **one summary per bug report in the batch** into the
`instructions/debug/summaries/` folder using this template. Name each file
`NN-<slug>.md` to match the role's stage number and the bug it worked on (for
example `instructions/debug/summaries/02-bug-issue.md`). A stage with a batch of
several bugs writes one `NN-<slug>.md` per report.

Copy the template below, replace the placeholder text, and remove any section
you do not need. Keep the summary high-level; it is an overview for downstream
roles and humans, not a place to duplicate the role's full work.

---

# Summary: <Role Name> (Stage <NN>)

- **Date:** <YYYY-MM-DD>
- **Author / Executor:** <name>
- **Instruction file:** `instructions/debug/<NN>-<slug>.md`
- **Bug report:** `bugs/NN-<slug>.md`
- **Commit:** `debug <NN>: <brief summary>`

## Work Completed

<A concise, high-level overview of what this role accomplished for this bug.>

## Outputs Produced / Modified

- <Artifact created or modified — e.g., `path/to/file`>
- <Describe whether each is a new artifact or a modification.>

## Key Decisions

<Optional. Notable choices made and the reason behind them.>

## Open Questions & Concerns

<Items that need resolution before or during the next stage. If there are none,
state "None.">

## Status

- [ ] Complete
- [ ] Needs review