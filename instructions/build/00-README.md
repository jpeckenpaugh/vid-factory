# Role Pipeline Orchestration

This project is built through a sequence of clearly separated roles. Each role
reads the artifacts produced by upstream roles, does a bounded amount of work,
writes its own artifacts, and hands off to the next role.

The role instructions live in the `instructions/` folder. The folders and files
the roles read and write are described below.

## Folder / file layout

```
.
├── concept.md                      Stage 1
├── features/
│   ├── 01-<name>.md                Stage 2 (one file per feature)
│   ├── 02-<name>.md
│   └── briefs/
│       ├── 01-<name>.md            Stage 3 (one brief per feature)
│       ├── 02-<name>.md
│       └── ...
├── requirements.txt                Stage 4
├── install.sh                      Stage 4
├── run.sh                          Stage 4
├── .gitignore                      Stage 4
├── environment-notes.md            Stage 4
├── backend/                        Stage 6 (all backend code)
├── frontend/                       Stage 7 (all frontend code)
├── docs/
│   ├── architecture.md             Stage 5
│   └── verification-report.md      Stage 8
├── README.md                       Stage 9
├── instructions/                   (this folder — pipeline docs)
└── summaries/
    ├── 00-template.md
    └── NN-<slug>.md                (each role's summary)
```

The `features/` folder is created by Stage 2 and `features/briefs/` by Stage 3.
The `docs/` folder is created by Stage 5.

## Roles in order

| Order | Role                    | Instruction file                    | Produces                                        |
|-------|-------------------------|-------------------------------------|-------------------------------------------------|
| 1     | Concept Seed (Human)    | `01-write-concept.md`               | `concept.md` (human-supplied; skipped if present) |
| 2     | Feature Decomposition   | `02-decompose-features.md`          | `features/01-<name>.md`, `features/02-<name>.md`, … |
| 3     | Feature Brief Writer    | `03-write-feature-briefs.md`        | `features/briefs/01-<name>.md`, …               |
| 4     | System Engineer         | `04-system-engineering.md`          | `requirements.txt`, `install.sh`, `run.sh`, `.gitignore`, `environment-notes.md` |
| 5     | Architect               | `05-architecture.md`                | `docs/architecture.md`                          |
| 6     | Backend Engineer        | `06-backend.md`                     | code under `backend/`                           |
| 7     | Frontend Engineer       | `07-frontend.md`                    | code under `frontend/`                          |
| 8     | Verification Engineer  | `08-verification.md`                | `docs/verification-report.md`                   |
| 9     | Project Manager / Docs  | `09-documentation.md`               | `README.md`                                     |

## Handoffs

Each role is the sole owner of its stage. A role must not reach backwards and
redo an upstream role's work, and must not reach forwards and do the next
role's work. The outputs of one role become the inputs of the next:

```
concept.md (human-supplied seed) -> features/*.md -> features/briefs/*.md ->
env scripts -> docs/architecture.md -> backend/ -> frontend/ ->
docs/verification-report.md -> README.md
```

Stage 1 is a human role: `concept.md` is supplied by the human and the stage is
skipped when it already exists. It is the only stage not executed by an agent.

## Summary requirement

Every role must write a single markdown summary of its completed work into the
`summaries/` folder, named `NN-<slug>.md` to match its stage number (for
example `summaries/02-decompose-features.md`). Use
`summaries/00-template.md` as the basis. The summary records a high-level
overview of what was done and any open questions or concerns that downstream
roles (or a human) may need to address.

## Per-stage commits

Each stage commits its work as the **final step** of the stage, after producing
all of its artifacts and writing its summary. Nothing is committed until the
stage is fully done.

- Commit all of the stage's changes (artifacts plus summary) to the current
  branch and push to `origin`.
- Use a commit message in the form `stage <NN>: <brief summary>`, where `<NN>`
  is the stage number and the summary briefly describes the stage's changes
  (for example `stage 06: implement backend per architecture`).
- Do not commit work that is incomplete or from another stage.

## Temporary files and logs

Temporary files, server/test logs, and scratch output produced while a role works
(such as capturing the running server's output during verification) are written
to the project's `./tmp/` folder. `./tmp/` is gitignored (except its `.gitkeep`
placeholder) and lives inside the worktree, so writes there are auto-writable
and never committed. Do **not** write temporary files or logs to the OS temp
directory (e.g. `/tmp`) or into the project tree.

## Verification of the pipeline

- Stage 1 is a human role: it is skipped when `concept.md` already exists and
  otherwise runs a brainstorming session to produce it (see
  `01-write-concept.md`). It is not executed by an agent.
- Each role works only from the artifacts listed under "Inputs" in its
  instruction file.
- Each role produces only the artifacts listed under "Outputs".
- Each role writes its summary before handing off.
- No role performs the work of another role, silently rewrites requirements,
  or repairs/redesigns work outside its scope.
- No role writes data-model or implementation decisions, constraints, or
  clarifications back into `concept.md`. The concept is the human-owned seed
  that shapes the app (identity, default stack, seed data, capabilities); it
  does not pre-decide the data model. Downstream stages make and record those
  decisions in their own artifacts (`features/*.md`, `features/briefs/*.md`,
  summaries). The human edits `concept.md` directly if they wish.
- Each stage commits and pushes its work to the current branch as its final
  step (see "Per-stage commits").