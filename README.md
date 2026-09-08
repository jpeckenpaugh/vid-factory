# Video Content Factory

Video Content Factory is a small baseline web application for organizing
early-stage content ideas and drafts. It provides a Bootstrap browser UI, a
FastAPI JSON API, and a local SQLite database. Advanced agentic automation,
AI-generated content, and visual or video asset creation are intentionally
deferred to a future pass.

## What is included

- Seeded, persisted catalogs for applications and companies.
- Create, view, edit, and delete actions for both catalogs.
- Content projects with a required title, optional description, and optional
  application and company associations.
- One persisted draft per project, stored as either a script or prompt and
  editable in place.
- JSON API routes under `/api` and a single-page Bootstrap interface served by
  the FastAPI application.

The initial seed data is YouTube, TikTok, and Instagram for applications, and
Acme Studio, Northstar Media, and Pine & Peak for companies. Repeated startup
does not duplicate or overwrite existing seed records.

## Requirements

- Python 3.12

SQLite is supplied by Python's standard library. The frontend uses Bootstrap
from a browser CDN, so there is no Node.js build step.

## Setup and run

From the project root, create the project-local virtual environment and install
the pinned dependencies:

```sh
./install.sh
```

Start the development server:

```sh
./run.sh
```

Then open [http://127.0.0.1:8000](http://127.0.0.1:8000). The local SQLite
database is created at `backend/data/vid_factory.db` on startup and is ignored
by Git.

## Implementation summary

The backend is a single FastAPI process. It initializes SQLite schema and seed
data, validates requests, preserves referential integrity for optional catalog
associations, and serves both the API and frontend files. The browser UI has
Applications, Companies, and Content Projects views. It refreshes relevant
data after successful changes and displays API-provided errors when requests
fail.

Projects remain intact when an associated application or company is deleted;
the corresponding association is cleared. Deleting a project also deletes its
sole draft.

## Current status and verification

**Status: baseline MVP complete, with verification caveats below.**

The delivered verification report found all API checks passing: seeded catalog
availability; application and company CRUD; validation for blank and duplicate
catalog names; project CRUD and association clearing; association validation;
draft creation/editing; invalid draft rejection; project deletion; and
frontend shell delivery. The frontend implementation was also statically
reviewed for all approved UI controls, refresh behavior, and API error display.

The only failed check was environment-specific. `./install.sh` completed, but
`./run.sh` could not start in the verification sandbox because Uvicorn's
`--reload` filesystem watcher was denied permission. Starting the identical
FastAPI entry point without reload succeeded and served the API checks. This
does not establish that `./run.sh` will succeed in every normal local
environment; it should be re-run there before release.

Browser interactions were not automated. The frontend verification result is a
static code review, not end-to-end browser evidence. Test-created catalog and
project records were removed after verification.

See [the verification report](docs/verification-report.md) for the full
evidence and checklist.

## Possible next actions

- Run `./run.sh` in a normal local environment that permits filesystem
  watching, then confirm browser access at `http://127.0.0.1:8000`.
- Add browser-based end-to-end coverage for catalog, project, association, and
  draft workflows, including API error presentation.
- Consider authentication, AI/provider integrations, agentic workflows,
  background jobs, and visual/video asset creation only in a separately scoped
  future pass.
