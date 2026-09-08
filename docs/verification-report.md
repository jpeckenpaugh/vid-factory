# Baseline MVP Verification Report

- **Date:** 2026-09-08
- **Scope:** Baseline UI, FastAPI API, and SQLite database MVP
- **Method:** Ran `./install.sh`; attempted `./run.sh`; used `curl` against a
  locally started equivalent Uvicorn entry point when the reload watcher could
  not run in this sandbox; statically reviewed `frontend/index.html`,
  `frontend/app.js`, and `frontend/styles.css`. Browser interaction was not
  automated.

## Checklist and Results

| ID | Traceability | Observable check | Result | Evidence |
| --- | --- | --- | --- | --- |
| V1 | Concept; application brief; architecture catalog routes | Seeded applications are available and application records support create, read, update, and delete. | Pass | `GET /api/applications` returned `200` with Instagram, TikTok, and YouTube. `POST /api/applications` returned `201` with `Verification App` (id 4); `GET /api/applications/4` returned `200`; `PUT` returned `200` with `Verification App Updated`; `DELETE` returned `200` with that record. |
| V2 | Concept; company brief; architecture catalog routes | Seeded companies are available and company records support create, update, and delete. | Pass | The startup seed setup completed; `POST /api/companies` returned `201` with `Verification Company` (id 4); `PUT /api/companies/4` returned `200` with `Verification Company Updated`; `DELETE /api/companies/4` returned `200`. |
| V3 | Architecture API conventions | Blank catalog names and duplicate names are rejected with JSON `422` errors. | Pass | `POST /api/applications` with `{"name":"   "}` returned `422` and `name must not be blank`; a second create using `Verification App Updated` returned `422` and `an application with that name already exists`. |
| V4 | Content Project Management brief; architecture project contract | A project can be created with optional associations, viewed, updated, and saved with associations cleared. | Pass | `POST /api/projects` with application and company id 1 returned `201`, resolved `YouTube` and `Acme Studio`, and `draft: null`. `PUT /api/projects/1` with both IDs `null` returned `200` with null IDs and names. |
| V5 | Content Project Management brief; architecture validation | Unknown non-null association IDs are rejected. | Pass | `POST /api/projects` with `application_id:99999` returned `422` and `application 99999 was not found`. |
| V6 | Draft Content brief; architecture draft contract | Each project has one stored script/prompt draft that can be edited in place and is returned in project detail. | Pass | First `PUT /api/projects/1/draft` returned id 1, type `script`; a second PUT returned the same id 1, type `prompt`, and updated body. `GET /api/projects/1` returned that prompt draft nested in the project detail. |
| V7 | Draft Content brief; architecture validation | Invalid draft types are rejected. | Pass | `PUT /api/projects/1/draft` with `draft_type:"invalid"` returned `422` stating the accepted values are script or prompt. |
| V8 | Content Project Management brief; architecture delete contract | Deleting a project removes it from retrieval. | Pass | `DELETE /api/projects/1` returned `200`; the subsequent `GET /api/projects/1` returned `404` with `project 1 was not found`. |
| V9 | Architecture frontend delivery | The backend serves the frontend shell. | Pass | `GET /` returned `200 text/html`, including the Bootstrap stylesheet, three navigation views, and `/static/app.js`. |
| V10 | All feature briefs; architecture frontend responsibilities | The static UI provides catalog CRUD controls, project create/edit/delete with optional catalog selectors, draft create/edit controls, refreshes after successful mutations, and displays API errors. | Pass (static review) | `index.html` provides Bootstrap shell and navigation. `app.js` renders list/detail/forms for applications, companies, and projects; `projectForm` uses optional selectors; `projectDetail` renders one draft editor/type; submit and delete handlers call the documented API then rerender affected views; failed submissions only show a notice and leave the form mounted. `node --check frontend/app.js` passed. No browser interaction was exercised. |
| V11 | Stage 4 environment contract | The provided environment scripts can set up and start the app. | Fail (sandbox limitation) | `./install.sh` completed with Python 3.12.14 and installed pinned requirements. `./run.sh` began Uvicorn reload setup but exited with `ERROR: [Errno 1] Operation not permitted` while enabling the filesystem watcher. Starting the identical entry point without `--reload` outside the sandbox succeeded and served all API checks above. |

## Failures and Limitations

The only failed check is V11: in this verification environment, `run.sh` cannot
start because its required `--reload` watcher is denied filesystem-watch
permission. This is not evidence of an API or frontend implementation failure:
the same `backend.main:app` process successfully served the application without
reload. A normal local environment that permits Uvicorn file watching should
re-run `./run.sh` before release.

Browser interaction was not run through automation. The frontend result is a
static implementation review, not end-to-end browser evidence.

## Overall Result

**Pass with one environment-specific run-script limitation.** All verified MVP
API and static frontend checks passed; test-created catalog and project records
were deleted after verification.

## Sprint 01 Browser-Primary Runtime Verification

- **Date:** 2026-09-08
- **Scope:** `enhancements/scope.md`; browser-native primary-runtime sprint.
- **Method:** Read the approved feature briefs and browser-runtime architecture;
  ran the supplied environment scripts; served `poc-browser/` with
  `poc-browser/serve.py`; syntax-checked the browser scripts; statically
  traced Worker RPC, OPFS, and import/reset paths; and smoke-tested the
  unchanged FastAPI fallback. A Chromium interaction run was attempted but
  browser-control access was not available in this environment.

| ID | Traceability | Observable check | Result | Evidence |
| --- | --- | --- | --- | --- |
| B1 | Scope a; brief 05 | The standalone POC is served without FastAPI. | Pass | `python3 poc-browser/serve.py --port 8012` returned `HTTP/1.0 200 OK` for `/`; the response was the browser POC shell. This required an allowed local loopback server and did not start FastAPI. |
| B2 | Architecture runtime boundary | The POC has a valid static browser/Worker delivery path with vendored sql.js/WASM. | Pass (static) | `node --check poc-browser/app.js` and `node --check poc-browser/db-worker.js` passed. `app.js` creates only `new Worker('db-worker.js')`; the Worker imports `vendor/sql.js/sql-wasm.js` and resolves the WASM from `vendor/sql.js/`. |
| B3 | Scope b; brief 05 | Catalog CRUD, project CRUD with optional links, and project list/detail work in the browser runtime. | Fail | Static inspection found the project dispatcher captures `projects.(list|get|create|update|delete)` but calls `projectMatch[1]` at `poc-browser/db-worker.js:349`; capture group 1 is the literal `projects`, not the verb. Thus `projects.list` is sent to `projectOperation('projects', ...)`, which attempts to validate a missing title and returns an error. The UI invokes `projects.list` on its initial render (`poc-browser/app.js:50`), so the primary Projects view cannot load. |
| B4 | Scope b; brief 05 | One script-or-prompt draft can be created and updated for a project. | Blocked by B3 | `drafts.upsert` is implemented, but the failed project dispatcher prevents creating, listing, or opening a project through the UI. No Chromium run was available to observe the remaining flow. |
| B5 | Scope c; brief 06 | A fresh Chromium workspace seeds catalogs and saved changes survive refresh/reopen through OPFS. | Blocked | The acceptance boundary requires current-Chromium evidence. The available managed Chrome session was unavailable to the browser automation interface, and direct Chrome automation returned `Computer Use permissions are not granted`. Therefore no OPFS fresh-launch, refresh, or reopen result can be claimed. |
| B6 | Scope d; brief 07 | Export/import preserves a valid workspace, invalid imports leave it unchanged, and reset restores seed data. | Blocked | Chromium file/download and OPFS interaction could not be performed for the reason in B5. Static review confirms explicit validate/confirm controls and in-memory validation paths, but it is not evidence of export/import/reset behavior. |
| B7 | Scope f; brief 05; architecture unchanged contracts | The legacy FastAPI fallback remains unchanged and usable. | Pass | `git diff --quiet 1aadbfc..HEAD -- backend frontend requirements.txt install.sh run.sh` exited 0. `./install.sh` completed with the pinned installed dependencies. An equivalent Uvicorn process returned `200` and the deterministic application seed records from `GET /api/applications`. |
| B8 | Stage 4 environment contract | `./run.sh` starts the fallback runtime in this environment. | Fail (sandbox limitation) | `./run.sh` reached Uvicorn reload setup then returned `ERROR: [Errno 1] Operation not permitted`, the same filesystem-watch restriction recorded in the baseline verification. The equivalent non-reload Uvicorn smoke in B7 passed. |

### Failures and Limitations

B3 is a release-blocking browser-runtime defect: the Worker uses the wrong
regular-expression capture group for every `projects.*` operation. It prevents
the initial primary Projects view from loading and consequently blocks project
and draft workflow parity.

B5 and B6 remain unverified because the required Chromium/OPFS browser-control
permission was unavailable. The static POC server itself was successfully
observed, but neither static analysis nor the server response proves browser
persistence or safe import behavior.

The existing fallback run-script watcher limitation (B8) is environmental and
pre-existing; the non-reload fallback API smoke passed.

### Sprint 01 Result

**Fail.** The browser-primary runtime does not meet its acceptance boundary:
the initial project workflow is broken, and Chromium/OPFS persistence and
portability behavior could not be verified in this environment. The browser
runtime must be repaired and re-verified in Chromium before documentation can
identify it as the primary deployment model.
