# Application Management Brief

## Purpose

Maintain the applications catalog so users can keep the reference applications
used by content projects current.

## Expected Behavior

1. Show the seeded applications when the catalog is opened.
2. Allow a user to create an application by providing its name.
3. Allow a user to view an application's stored details.
4. Allow a user to change an application's name.
5. Allow a user to delete an application.
6. After a create, edit, or delete action succeeds, show the updated catalog.

## Inputs / Outputs

- **Inputs:** an application name for creation or editing; an existing
  application selected for viewing, editing, or deletion.
- **Outputs:** the current catalog and confirmation that a requested change
  succeeded; an error message when a request cannot be completed.

## User-Visible Behavior

Users can browse the catalog and use clear actions to add, open, edit, or
delete applications. The initial catalog contains the seed data.

## Constraints

- Application data is persisted in the application's database.
- This feature manages only the applications catalog; it does not generate
  content or automate workflows.

## Basic Acceptance Expectations

- Seeded applications are visible after the application starts.
- A user can create, view, edit, and delete an application.
- Successful changes remain visible after returning to the catalog.
