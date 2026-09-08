# Workspace Portability and Recovery Brief

## Purpose

Give users local control over their browser workspace through export, validated
import, and sample-data restoration, so they can back up, move, or recover a
browser-native Video Content Factory workspace safely.

## Expected Behavior

1. A user can export the active browser workspace as a portable workspace
   backup.
2. A user can choose a workspace backup to import.
3. Before replacing the active workspace, the application checks that the
   chosen import is a valid, compatible workspace.
4. When validation succeeds and the user completes the import action, the
   imported workspace becomes the active workspace and its catalog, project,
   association, and draft data are available in the browser application.
5. When an import is invalid, corrupt, or incompatible, the application shows
   a clear error and leaves the active workspace unchanged.
6. A user can restore sample data to recover a known initial workspace.
7. After a successful restore, the browser application shows the baseline
   sample applications and companies and no longer shows prior user-created
   workspace data.

## Inputs / Outputs

- **Inputs:** an export request; a selected workspace backup for import; an
  import confirmation after validation; or a request to restore sample data.
- **Outputs:** a portable workspace backup; an active imported workspace after
  a valid import; a clear validation error with the existing workspace retained
  after a rejected import; or a restored sample-data workspace.

## User-Visible Behavior

Users have visible controls to export their current workspace, select a backup
to import, and restore sample data. Import feedback makes clear whether a
backup was accepted or rejected. Restoring sample data replaces the current
browser workspace with the product's initial sample workspace.

## Constraints

- An import must be checked before it can replace the active workspace.
- A rejected import must not alter the active workspace.
- Exported and successfully imported workspaces must preserve the baseline
  applications, companies, projects, optional associations, and single drafts.
- Restore sample data is an intentional replacement of the active workspace;
  users must receive clear notice before that replacement occurs.
- Do not modify the existing FastAPI backend or frontend.
- Synchronization, authentication, cloud backup, schema migrations, and
  multi-tab coordination are out of scope.

## Basic Acceptance Expectations

- A user can export a workspace and import it into a new browser workspace.
- After a successful import, the imported records and drafts are available.
- Invalid, corrupt, or incompatible imports are rejected without changing the
  active workspace.
- A user can restore sample data and see the known initial catalog state.
