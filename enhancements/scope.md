# Sprint 01 Scope — Browser Primary Runtime

This sprint establishes a browser-native version of Video Content Factory as
the primary local way to use the product. The completed FastAPI version remains
available, unchanged, as a parity reference and fallback throughout this pass.

## Agreed scope

- **a. Feature — Browser-native application.** Provide a standalone browser
  application in `poc-browser/` that users can run without starting the
  FastAPI application.
- **b. Feature — Baseline-MVP parity.** Preserve the current product behavior:
  seeded applications and companies; management of both catalogs; content
  projects with optional application and company links; and one saved script or
  prompt draft for each project.
- **c. Constraint — Persistent local workspace.** Keep the browser workspace
  available across sessions using local SQLite-based browser storage.
- **d. Feature — Workspace portability and recovery.** Let users export their
  workspace, import a workspace, and restore sample data. An import must be
  checked before it can replace the active workspace.
- **e. Boundary — Primary runtime after verification.** Document the browser
  runtime as the primary way to use the application only after it meets this
  sprint's verification expectations.
- **f. Constraint — Preserve the existing application.** Do not modify the
  existing FastAPI backend or frontend during this sprint; they remain the
  parity reference and fallback.
- **g. Boundary — Deferred capabilities.** AI/provider features,
  synchronization, authentication, multi-tab coordination, cloud deployment,
  schema migrations, and a native SQLite browser-storage integration are out of
  scope.

## Acceptance boundary

The browser runtime must be shown to work in a current Chromium-based browser.
A new workspace must contain sample data; data must survive refresh and
reopening; all baseline workflows must work without the FastAPI application;
an exported workspace must import into a new workspace; and invalid imports
must leave the existing workspace intact.
