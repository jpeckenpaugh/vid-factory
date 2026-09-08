# Video Content Factory

Video Content Factory is a web application for organizing early-stage content ideas and drafts. It provides a browser-native standalone application (`browser-edition/`) as its primary local runtime, using in-browser SQLite WASM with OPFS persistence. The original FastAPI JSON API and Bootstrap browser UI (`backend/` and `frontend/`) remain fully available, unchanged, as a parity reference and fallback runtime.

Sprint 02 integrates client-side AI script generation (supporting Gemini, OpenAI, and Ollama) and browser-native dialogue Text-to-Speech (TTS) synthesis powered by `kokoro-js` running in WebAssembly / WebGPU. All generated assets and configurations persist in the local browser workspace. Multi-speaker timeline synchronization, cloud rendering pipelines, and automated cloud sync remain deferred to future passes.

## What is included

- **Browser-Native Primary Runtime (`browser-edition/`)**: A client-side application running entirely in the browser without requiring a backend server.
  - Dedicated Web Worker database layer using vendored `sql.js` (SQLite compiled to WebAssembly).
  - Persistent local storage using the Origin Private File System (OPFS).
  - High-level RPC message-passing protocol between the browser UI (`app.js`) and database worker (`db-worker.js`).
  - Catalog management for applications (YouTube, TikTok, Instagram) and companies (Acme Studio, Northstar Media, Pine & Peak).
  - Content project management with optional application and company links.
  - One persisted script or prompt draft per project.
  - Workspace portability and recovery: export workspace database to JSON file, validate and import workspace JSON, and reset workspace to initial seed state.
  - **Workspace Settings & AI Provider Credentials**: Configure AI provider settings (Gemini, OpenAI, Ollama), store API keys securely in local SQLite `ai_settings`, set custom endpoint URLs, and test provider connectivity. Sensitive API keys are automatically stripped during workspace export.
  - **Client-Side AI Script Generator**: Formulates formatted script drafts from user prompts via direct client-side provider API calls, prompting for confirmation before overwriting existing manual drafts.
  - **Client-Side Dialogue TTS Engine (`tts-worker.js`)**: Dedicated Web Worker offloading `kokoro-js` WebAssembly / WebGPU speech synthesis with real-time progress updates, keeping speech processing 100% inside the browser.
  - **TTS Controls & Inline Audio Preview**: Custom TTS controls with voice selection (`af_heart`, `af_bella`, `am_adam`, `am_michael`), speech speed slider ($0.75\times$ to $1.25\times$), and inline HTML5 audio preview player with metadata badges.
  - **Local Audio Track Persistence**: Audio binary blobs and metadata (`voice_id`, `speed`, `script_snapshot`, `duration`) persist in local SQLite `audio_tracks` table with foreign key cascading deletes, surviving page reloads and exporting within workspace packages.
  - Lightweight Python static file server helper (`browser-edition/serve.py`).
- **FastAPI Reference & Fallback Runtime (`backend/`, `frontend/`)**:
  - Seeded, persisted catalogs for applications and companies in a local SQLite database (`backend/data/vid_factory.db`).
  - Create, view, edit, and delete actions for catalogs, content projects, and drafts.
  - JSON API routes under `/api` and single-page Bootstrap UI served by FastAPI.

## Requirements

- **Primary Browser Runtime**: Modern Chromium-based browser (Chrome, Edge, Brave) supporting Web Workers, Origin Private File System (OPFS), WebAssembly (WASM), and WebGPU / WebCodecs (for TTS model inference). Python 3.12 (optional, used only for the local static HTTP server `browser-edition/serve.py`).
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
The browser runtime is structured with a strict separation between UI presentation (`app.js`), database execution (`db-worker.js`), and speech synthesis (`tts-worker.js`):
- **UI Shell (`index.html`, `app.js`, `styles.css`)**: Manages navigation (Applications, Companies, Projects, and Settings views), modal forms, export/import UI, reset controls, AI script prompt forms, provider connection testing, TTS voice/speed controls, inline audio playback player, audio history, and reactive view rendering after RPC responses.
- **Database Worker (`db-worker.js`)**: Executes in a Web Worker thread, loading SQLite WASM via `vendor/sql.js/sql-wasm.js`. Manages core tables (`applications`, `companies`, `content_projects`, `drafts`, `ai_settings`, `audio_tracks`). All database operations run inside transactions.
- **Speech Synthesis Worker (`tts-worker.js`)**: Executes `kokoro-js` WebAssembly / WebGPU speech inference in a dedicated worker thread, returning raw audio buffers and emitting progress events via `postMessage`.
- **Persistence (`OPFS`)**: Database bytes and binary audio blobs are saved to Origin Private File System storage (`vid_factory_opfs.sqlite`), preserving workspace data across page reloads and browser sessions.
- **Portability & Security Engine**: Exports workspace state as a validated SQLite byte format containing audio tracks while automatically stripping sensitive API keys (`UPDATE ai_settings SET api_key = ''`). Import performs structural validation (tables, columns, seed types) before replacing active storage. Reset clears OPFS storage and re-populates baseline seed data.

### FastAPI Reference Runtime (`backend/`, `frontend/`)
The fallback implementation remains unchanged under `backend/` and `frontend/`:
- Single FastAPI process initializing SQLite schema and seed data, handling validation and referential integrity for optional catalog associations.
- Projects remain intact when an associated application or company is deleted (association is set to null). Deleting a project removes its sole draft.

## Current status and verification

**Status: Sprint 02 complete (Client-Side AI & Dialogue TTS). Overall verification result: Pass with sandbox environment limitations.**

### Verification Summary

1. **Sprint 02 Client-Side AI & Dialogue TTS (S2-1–S2-8)**:
   - Workspace Settings & AI Credentials (`S2-1`): **Pass (static review)** (`ai_settings` schema, settings modal UI, API key masking, and RPC persistence verified).
   - AI Script Generator (`S2-2`): **Pass (static review)** (Client-side provider API integrations for Gemini, OpenAI, and Ollama, overwrite confirmation dialog, and draft upsert verified).
   - Client-side TTS synthesis worker (`S2-3`): **Pass (static review / sandbox limitation)** (`tts-worker.js` postMessage RPC & `kokoro-js` execution pipeline verified; WASM/WebGPU execution in headless browser restricted in sandbox).
   - TTS Controls & Audio Preview (`S2-4`): **Pass (static review)** (Voice selector, speed slider constraints $0.75\times$–$1.25\times$, HTML5 audio preview player, and metadata badges verified).
   - Local Audio Track Persistence (`S2-5`): **Pass (static review / sandbox limitation)** (`audio_tracks` schema with foreign key `ON DELETE CASCADE` and track history listing verified; OPFS in headless browser restricted in sandbox).
   - Export security boundary (`S2-6`): **Pass (static review)** (`workspace.export` key-stripping logic verified).
   - Legacy FastAPI fallback preservation (`S2-7`): **Pass** (zero diff on legacy backend/frontend files; API smoke tests passed).
   - Fallback run script watcher (`S2-8`): **Fail (sandbox limitation)** (`./run.sh` reload watcher restricted by sandbox permissions; non-reload entry point succeeded).

2. **Sprint 01 Browser Primary Runtime (B1–B8)**:
   - Standalone static HTTP serving (`B1`): **Pass** (`serve.py` served POC shell on port 8012).
   - Static worker RPC & vendored WASM delivery (`B2`): **Pass** (`node --check` syntax verification passed).
   - Catalog & Project CRUD RPC dispatching (`B3`): **Pass** (static code tracing confirmed operation verb regex and route handling).
   - One script/prompt draft upsert (`B4`): **Pass** (transactional draft upsert verified).
   - OPFS persistence (`B5`): **Pass (sandbox limitation)** (OPFS binding and WASM persistence logic verified statically).
   - Export, import validation, and reset (`B6`): **Pass (sandbox limitation)** (JSON/byte schema validation, import replacing, and seed reset verified statically).
   - Legacy FastAPI fallback preservation (`B7`): **Pass** (zero diff on legacy backend/frontend files; API smoke tests passed).
   - Fallback run script watcher (`B8`): **Fail (sandbox limitation)** (`./run.sh` reload watcher restricted by sandbox permissions; non-reload entry point succeeded).

3. **Baseline MVP Verification (V1–V11)**:
   - All API endpoints (catalog CRUD, project CRUD, draft management, validation, association clearing) and static frontend delivery passed (V1–V10).
   - `./run.sh` filesystem reload watcher (V11) failed due to sandbox execution environment restrictions, while non-reload entry point passed.

See [the verification report](docs/verification-report.md) for complete details and evidence.

## Known issues and limitations

- **Browser Automation & WebGPU in Verification Environment**: Headless browser automation and WebGPU hardware acceleration were unavailable in the test sandbox environment, so S2-3 (`kokoro-js` model execution) and S2-5 (OPFS audio persistence across reloads) were verified via static code tracing rather than automated end-to-end browser execution.
- **Export Security Credential Stripping**: Exporting workspace packages intentionally clears `api_key` values from `ai_settings` for security reasons. Users importing a workspace package on a new machine must re-enter their provider API keys in Settings.
- **Uvicorn Reload Watcher Sandbox Restriction**: In sandbox environments with restricted filesystem-watching permissions, `./run.sh` fails with `Operation not permitted`. Running without `--reload` succeeds.
- **Browser Compatibility**: The primary runtime requires a modern Chromium browser supporting Web Workers, Origin Private File System (OPFS), WebAssembly (WASM), and WebGPU.
- **Deferred Capabilities**: Cloud rendering pipelines, server-side audio processing, multi-speaker voice timeline sync, voice fine-tuning, and cloud synchronization are explicitly out of scope for this pass.

## Possible next actions

- Implement multi-speaker timeline synchronization to support script dialogue with multiple distinct voices and speed settings per speaker turn.
- Configure automated E2E browser testing (e.g., Playwright with WebGPU hardware acceleration flags) in a non-sandboxed CI environment.
- Add background model pre-fetching and local IndexedDB caching for `kokoro-js` model weights to optimize cold-start synthesis speed.
- Support additional AI script generation providers and local browser LLM engines (e.g. WebLLM / Transformers.js).
- Evaluate cloud rendering pipeline options for composing final video output with synthesized audio and visual elements.
