# Browser-Native Application Runtime Brief

## Purpose

Make Video Content Factory usable as a standalone browser application and
establish that browser application as the future primary local runtime, while
keeping the completed FastAPI application available unchanged as a parity
reference and fallback.

## Expected Behavior

1. A user can start and open the browser application without starting the
   FastAPI application.
2. The browser application presents the baseline Video Content Factory
   workflows: application management, company management, content-project
   management, and one draft script or prompt per project.
3. Catalogs open with the workspace's application and company records.
4. Users can create, view, edit, and delete application and company records.
5. Users can create, view, edit, and delete content projects, including
   optional application and company associations.
6. From a project, users can create, view, and update its single saved script
   or prompt draft.
7. The browser application does not depend on FastAPI API availability to
   perform these workflows.
8. The existing FastAPI backend and frontend remain available and unchanged
   throughout this sprint as the parity reference and fallback.

## Inputs / Outputs

- **Inputs:** browser interaction; application and company names; project
  titles, optional descriptions, and optional catalog associations; and draft
  type and text.
- **Outputs:** the current browser workspace state, including updated catalogs,
  project details, and each project's saved draft; clear success or error
  feedback for requested actions.

## User-Visible Behavior

Users can use Video Content Factory in a current Chromium-based browser through
a standalone local browser application rather than the existing server-backed
interface. The product capabilities and rules match the baseline MVP, while
the FastAPI version remains separately usable as a fallback during this sprint.

## Constraints

- Do not modify or regress the existing FastAPI backend or frontend.
- Preserve the baseline catalog, project, and one-draft-per-project behavior.
- The browser application must work without the FastAPI application running.
- AI/provider features, synchronization, authentication, multi-tab
  coordination, cloud deployment, schema migrations, and a native SQLite
  browser-storage integration are out of scope.

## Basic Acceptance Expectations

- A user can open the browser application in a current Chromium-based browser
  without starting FastAPI.
- All baseline catalog, project, and draft workflows can be completed in the
  browser application.
- The FastAPI application remains unchanged and usable as a fallback.
