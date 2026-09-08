# Draft Content Brief

## Purpose

Let a user create and retain one early-stage draft script or prompt for each
content project.

## Expected Behavior

1. From an existing content project, show its current draft state.
2. Allow a user to enter and save one draft as either a script or a prompt.
3. When a draft already exists, allow the user to view and edit that same
   draft.
4. Show the saved draft when the user returns to the project.

## Inputs / Outputs

- **Inputs:** an existing content project; a draft type of script or prompt;
  and the draft text.
- **Outputs:** the project's single saved draft, including its selected type
  and text, and confirmation that it was saved; an error message when a
  request cannot be completed.

## User-Visible Behavior

Users see whether a project has a draft. They can create a draft when none is
present and edit the existing draft when one is present. The UI clearly shows
whether the saved draft is a script or prompt.

## Constraints

- Each content project has at most one stored draft in this MVP.
- A draft belongs to an existing content project and is persisted in the
  application's database.
- The feature stores user-provided draft text; it does not call an AI provider,
  automate drafting, or create visual/video assets.

## Basic Acceptance Expectations

- A user can save one script or prompt draft for a project.
- Reopening the project shows the saved draft type and text.
- Editing and saving the draft updates the same single draft rather than
  creating an additional draft.
