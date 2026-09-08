# Company Management Brief

## Purpose

Maintain the companies catalog so users can keep the reference companies used
by content projects current.

## Expected Behavior

1. Show the seeded companies when the catalog is opened.
2. Allow a user to create a company by providing its name.
3. Allow a user to view a company's stored details.
4. Allow a user to change a company's name.
5. Allow a user to delete a company.
6. After a create, edit, or delete action succeeds, show the updated catalog.

## Inputs / Outputs

- **Inputs:** a company name for creation or editing; an existing company
  selected for viewing, editing, or deletion.
- **Outputs:** the current catalog and confirmation that a requested change
  succeeded; an error message when a request cannot be completed.

## User-Visible Behavior

Users can browse the catalog and use clear actions to add, open, edit, or
delete companies. The initial catalog contains the seed data.

## Constraints

- Company data is persisted in the application's database.
- This feature manages only the companies catalog; it does not generate
  content or automate workflows.

## Basic Acceptance Expectations

- Seeded companies are visible after the application starts.
- A user can create, view, edit, and delete a company.
- Successful changes remain visible after returning to the catalog.
