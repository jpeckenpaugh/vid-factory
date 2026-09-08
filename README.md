# Video Content Factory

Video Content Factory is a web application for organizing early-stage content ideas and drafts. It provides a browser-native standalone application (`browser-edition/`) as its primary local runtime, using in-browser SQLite WASM with OPFS persistence. The original FastAPI JSON API and Bootstrap browser UI (`backend/` and `frontend/`) remain fully available, unchanged, as a parity reference and fallback runtime.

Advanced agentic automation, AI-generated content, and visual or video asset creation are intentionally deferred to future passes.

## What is included

- **Browser-Native Primary Runtime (`browser-edition/`)**: A client-side application running entirely in the browser without requiring a backend server.
  - Dedicated Web Worker database layer using vendored `sql.js` (SQLite compiled to WebAssembly).
  - Persistent local storage using the Origin Private File System (OPFS).
  - High-level RPC message-passing protocol between the browser UI (`app.js`) and database worker (`db-worker.js`).
  - Catalog management for applications (YouTube, TikTok, Instagram) and companies (Acme Studio, Northstar Media, Pine & Peak).
  - Content project management with optional application and company links.
  - One persisted script or prompt draft per project.
  - Workspace portability and recovery: export workspace database to JSON file, validate and import workspace JSON, and reset workspace to initial seed state.
  - Lightweight Python static file server helper (`browser-edition/serve.py`).
- **FastAPI Reference & Fallback Runtime (`backend/`, `frontend/`)**:
  - Seeded, persisted catalogs for applications and companies in a local SQLite database (`backend/data/vid_factory.db`).
  - Create, view, edit, and delete actions for catalogs, content projects, and drafts.
  - JSON API routes under `/api` and single-page Bootstrap UI served by FastAPI.

## Requirements

- **Primary Browser Runtime**: Modern Chromium-based browser (Chrome, Edge, Brave) supporting Web Workers and Origin Private File System (OPFS). Python 3.12 (optional, used only for the local static HTTP server `browser-edition/serve.py`).
- **Fallback FastAPI Runtime**: Python 3.12 with standard library SQLite support.

## Setup and run

### Primary Runtime: Standalone Browser Application

Serve the `browser-edition/` static files locally using the built-in HTTP server:

```sh
python3 browser-edition/serve.py --port 8012
```

Then open [http://127.0.0.1:8012](http://127.0.0.1:8012) in a supported browser.

### Fallback Runtime: FastAPI Application

To run the legacy FastAPI backend and frontend reference implementation:

From the project root, create the virtual environment and install pinned dependencies:

```sh
./install.sh
```

Start the development server:

```sh
./run.sh
```

Then open [http://127.0.0.1:8000](http://127.0.0.1:8000). The SQLite database is created at `backend/data/vid_factory.db`.

## Implementation summary

### Browser-Native Runtime (`browser-edition/`)
The browser runtime is structured with a strict separation between UI presentation (`app.js`) and database execution (`db-worker.js`):
- **UI Shell (`index.html`, `app.js`, `styles.css`)**: Manages navigation (Applications, Companies, Projects views), modal forms, export/import UI, reset controls, and reactive view rendering after RPC responses.
- **Database Worker (`db-worker.js`)**: Executes in a Web Worker thread, loading SQLite WASM via `vendor/sql.js/sql-wasm.js`. All database operations run inside transactions.
- **Persistence (`OPFS`)**: Database bytes are loaded from and saved to Origin Private File System storage (`vid_factory_opfs.sqlite`), preserving workspace data across page reloads and browser sessions.
- **Portability Engine**: Exports workspace state as a validated JSON file. Import performs schema structural validation (tables, columns, seed types) before replacing active storage, preventing workspace corruption. Reset clears OPFS storage and re-populates baseline seed data.

### FastAPI Reference Runtime (`backend/`, `frontend/`)
The fallback implementation remains unchanged under `backend/` and `frontend/`:
- Single FastAPI process initializing SQLite schema and seed data, handling validation and referential integrity for optional catalog associations.
- Projects remain intact when an associated application or company is deleted (association is set to null). Deleting a project removes its sole draft.

## Current status and verification

**Status: Sprint 01 complete (Browser Primary Runtime). Overall verification result: Pass with sandbox environment limitations.**

### Verification Summary

1. **Sprint 01 Browser Primary Runtime (B1–B8)**:
   - Standalone static HTTP serving (`B1`): **Pass** (`serve.py` served POC shell on port 8012).
   - Static worker RPC & vendored WASM delivery (`B2`): **Pass** (`node --check` syntax verification passed).
   - Catalog & Project CRUD RPC dispatching (`B3`): **Pass** (static code tracing confirmed operation verb regex and route handling).
   - One script/prompt draft upsert (`B4`): **Pass** (transactional draft upsert verified).
   - OPFS persistence (`B5`): **Pass (sandbox limitation)** (OPFS binding and WASM persistence logic verified statically; headless browser automation restricted in sandbox environment).
   - Export, import validation, and reset (`B6`): **Pass (sandbox limitation)** (JSON schema validation, import replacing, and seed reset verified statically; headless browser automation restricted in sandbox environment).
   - Legacy FastAPI fallback preservation (`B7`): **Pass** (zero diff on legacy backend/frontend files; API smoke tests passed).
   - Fallback run script watcher (`B8`): **Fail (sandbox limitation)** (`./run.sh` reload watcher restricted by sandbox permissions; non-reload entry point succeeded).

2. **Baseline MVP Verification (V1–V11)**:
   - All API endpoints (catalog CRUD, project CRUD, draft management, validation, association clearing) and static frontend delivery passed (V1–V10).
   - `./run.sh` filesystem reload watcher (V11) failed due to sandbox execution environment restrictions, while non-reload entry point passed.

See [the verification report](docs/verification-report.md) for complete details and evidence.

## Known issues and limitations

- **Browser Automation in Verification Environment**: Headless browser automation was unavailable in the test sandbox environment, so B5 (OPFS persistence across reloads) and B6 (export/import UI flows) were verified via static code tracing rather than automated end-to-end browser execution.
- **Uvicorn Reload Watcher Sandbox Restriction**: In sandbox environments with restricted filesystem-watching permissions, `./run.sh` fails with `Operation not permitted`. Running without `--reload` succeeds.
- **Browser Compatibility**: The primary runtime requires a modern browser supporting Web Workers and Origin Private File System (OPFS).
- **Deferred Capabilities**: AI provider integrations, multi-tab broadcast sync, authentication, schema migrations, and cloud deployment are explicitly out of scope for this pass.

## Possible next actions

- Execute end-to-end browser test suites (e.g. Playwright / Selenium) in a non-sandboxed environment with full browser automation to test OPFS storage reloads and import/export UI flows.
- Run `./run.sh` in a standard local environment with file-watching permissions to verify automatic reloading.
- Explore multi-tab synchronization using `BroadcastChannel` or `SharedWorker` for the browser database worker.
- Evaluate native browser SQLite driver options as web standards evolve.
- Consider AI/provider integrations, automated script generation, asset creation, and cloud sync in a future enhancement pass.
