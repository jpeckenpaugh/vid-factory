# Enhancement Role Pipeline Orchestration

Enhancements to the existing application are implemented through a sequence of
clearly separated roles. Each role reads the artifacts produced by upstream
roles, does a bounded amount of work, writes its own artifacts, and hands off to
the next role.

The role instructions live in the `instructions/enhancements/` folder. The
folders and files the roles read and write are described below. This workflow
**extends an existing, already-built application** (the v0.1 build) rather than
creating one from a clean slate: upstream artifacts already exist, and the roles
modify or add to them rather than creating them fresh.

## Folder / file layout

```
.
├── enhancements/                    Stage 1 (sprint concept intake)
│   ├── sprintNN.md                  current sprint concept (Stage 1 source)
│   └── scope.md                     agreed scope of this pass (Stage 1 output)
├── archive/                         Stage 10 (on-demand archive)
│   ├── build/                       archived v0.1 baseline (features/completed/)
│   └── sprintNN/                    archived prior-sprint artifacts
├── features/                        Stage 2 (one file per feature)
│   ├── 01-<name>.md
│   ├── 02-<name>.md
│   └── briefs/
│       ├── 01-<name>.md             Stage 3 (one brief per feature)
│       └── ...
├── backend/                         existing — Stage 6 extends it
├── frontend/                        existing — Stage 7 extends it
├── docs/
│   └── architecture.md              existing — Stage 5 extends it
├── requirements.txt                 existing (Stage 4 reassesses)
├── environment-notes.md             existing (Stage 4 reassesses)
├── install.sh / run.sh / .gitignore existing
├── README.md                        Stage 9 updates it
└── instructions/
    └── enhancements/
        ├── 00-README.md             (this file)
        ├── 01-...-10-*.md           role instructions
        └── summaries/
            ├── 00-template.md       enhancement-specific summary template
            └── NN-<slug>.md         (each role's summary)
```

The fresh `features/` folder is created by Stage 2 and `features/briefs/` by
Stage 3. `docs/architecture.md`, `backend/`, `frontend/`, and the environment
scripts already exist from the v0.1 build and are **extended**, not recreated.

The archived v0.1 baseline lives under `archive/build/` (previously
`features/completed/`); it remains available as context for Stages 2 and 3.
Completed sprint artifacts live under `archive/sprintNN/` (Stage 10).

## Roles in order

| Order | Role                     | Instruction file                  | Produces / Modifies                                  |
|-------|--------------------------|-----------------------------------|------------------------------------------------------|
| 1     | Enhancement Intake      | `01-enhancement-intake.md`        | `enhancements/scope.md` (agreed scope)               |
| 2     | Feature Decomposition   | `02-decompose-features.md`        | `features/01-<name>.md`, `features/02-<name>.md`, …  |
| 3     | Feature Brief Writer    | `03-write-feature-briefs.md`      | `features/briefs/01-<name>.md`, …                    |
| 4     | System Engineer         | `04-system-engineering.md`        | reassesses env scripts/deps (only changes if needed) |
| 5     | Architect               | `05-architecture.md`              | extends `docs/architecture.md`                       |
| 6     | Backend Engineer        | `06-backend.md`                   | modifies code under `backend/`                       |
| 7     | Frontend Engineer       | `07-frontend.md`                  | modifies code under `frontend/`                      |
| 8     | Verification Engineer  | `08-verification.md`              | extends/updates `docs/verification-report.md`        |
| 9     | Project Manager / Docs  | `09-documentation.md`             | updates `README.md` and related docs                 |
| 10    | Archive                 | `10-archive.md`                   | relocates a phase/sprint's artifacts to `archive/`   |

## Handoffs

Each role is the sole owner of its stage. A role must not reach backwards and
redo an upstream role's work, and must not reach forwards and do the next
role's work. The outputs of one role become the inputs of the next:

```
sprintNN.md -> scope.md -> features/*.md -> features/briefs/*.md ->
architecture.md (extended) -> backend/ edits -> frontend/ edits ->
verification-report.md (updated) -> README.md (updated) ->
archive/<sprintNN>/ (Stage 10, relocates the completed sprint)
```

## Temporary files and logs

Temporary files, server/test logs, and scratch output produced while a role works
(such as capturing the running server's output during verification) are written
to the project's `./tmp/` folder. `./tmp/` is gitignored (except its `.gitkeep`
placeholder) and lives inside the worktree, so writes there are auto-writable
and never committed. Do **not** write temporary files or logs to the OS temp
directory (e.g. `/tmp`) or into the project tree.

## Summary requirement

Every role must write a single markdown summary of its completed work into the
`instructions/enhancements/summaries/` folder, named `NN-<slug>.md` to match its
stage number (for example `instructions/enhancements/summaries/02-decompose-features.md`).
Use `instructions/enhancements/summaries/00-template.md` as the basis. The
summary records a high-level overview of what was done and any open questions or
concerns that downstream roles (or a human) may need to address.

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

## Verification of the pipeline

- Each role works only from the artifacts listed under "Inputs" in its
  instruction file.
- Each role produces only the artifacts listed under "Outputs".
- Each role writes its summary before handing off.
- No role performs the work of another role, silently rewrites requirements,
  or repairs/redesigns work outside its scope.
- No role may delete or regress existing (v0.1) behavior that is outside the
  agreed scope of this enhancement pass.
- No role writes product decisions, constraints, or clarifications back into
  `enhancements/scope.md`. The scope is the agreed high-level boundary for the
  pass, drawn from the sprint concept; downstream stages make and record
  product decisions in their own artifacts (`features/*.md`,
  `features/briefs/*.md`, summaries).
- Each stage commits and pushes its work to the current branch as its final
  step (see "Per-stage commits").