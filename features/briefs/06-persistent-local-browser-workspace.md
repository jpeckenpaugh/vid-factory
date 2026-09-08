# Persistent Local Browser Workspace Brief

## Purpose

Retain a user's Video Content Factory workspace locally in the browser across
sessions so the browser-native application can serve as a practical primary
local runtime.

## Expected Behavior

1. On first use, the browser application creates a local workspace containing
   the baseline sample applications and companies.
2. The workspace retains the applications, companies, content projects,
   optional project associations, and one saved draft per project that the user
   creates or changes.
3. A successful change remains available after the user refreshes the browser
   application.
4. A successful change remains available when the user closes and reopens the
   browser application in the same browser workspace.
5. The browser application reads and updates its local workspace without
   relying on the FastAPI application's database or API.

## Inputs / Outputs

- **Inputs:** first use of the browser application and all baseline catalog,
  project, and draft changes made by a user.
- **Outputs:** a browser-local workspace containing deterministic initial
  sample data on first use and the user's subsequently saved workspace state.

## User-Visible Behavior

The browser application opens with sample data for a new workspace. After a
user saves catalog, project, or draft work, that work is still present after a
refresh or later reopening the browser application. This differs from the
current FastAPI application because the browser runtime owns its local
workspace rather than relying on the server application's database.

## Constraints

- The workspace is local to the browser and is SQLite-based.
- Preserve the baseline data rules: project associations are optional and each
  project has at most one draft, which is either a script or a prompt.
- Do not modify or use the existing FastAPI backend or frontend as a runtime
  dependency.
- Synchronization, authentication, multi-tab coordination, cloud deployment,
  schema migrations, and a native SQLite browser-storage integration are out
  of scope.

## Basic Acceptance Expectations

- A new browser workspace contains the baseline sample applications and
  companies.
- User changes to every baseline record type survive a refresh.
- User changes remain available after reopening the browser application in the
  same browser workspace.
- Baseline workflows remain usable when FastAPI is not running.
