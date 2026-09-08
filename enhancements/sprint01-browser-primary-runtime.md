# Sprint 01 — Browser Primary Runtime

## Intent

Make the browser-native Video Content Factory the primary local deployment
model, while retaining the completed FastAPI application unchanged as a parity
reference and fallback during this sprint.

## Sprint concepts

a. Add a browser-only application under `poc-browser/` that runs without a
   FastAPI process.

b. Preserve the current MVP behavior: seeded applications and companies,
   catalog CRUD, content-project CRUD with optional catalog associations, and
   one stored script-or-prompt draft per project.

c. Persist the local workspace through SQLite in a Web Worker and browser OPFS
   storage.

d. Provide workspace export, import, and sample-data reset. Imports must be
   validated before replacing the active workspace.

e. Make the browser runtime the documented primary way to use the application
   after it passes verification.

f. Keep the existing FastAPI backend and frontend unchanged during this sprint
   as a parity reference and fallback.

g. Defer AI/provider features, synchronization, authentication, multi-tab
   coordination, cloud deployment, schema migrations, and a native SQLite OPFS
   VFS.

## Acceptance boundary

The browser runtime must be verified in a current Chromium-based browser: a
fresh launch seeds data, browser data survives refresh/reopen, all baseline
workflows work without a backend process, exports can be imported into a fresh
workspace, and invalid imports do not replace existing data.
