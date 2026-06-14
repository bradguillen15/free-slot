# guest-e2e-testing Specification

## Purpose
TBD - created by archiving change add-guest-e2e-tests. Update Purpose after archive.
## Requirements
### Requirement: E2E harness runs the guest flow without a backend

The E2E suite SHALL exercise the application as a guest using a real browser, with no dependency on a live Supabase project, network access, or seeded database. The harness MUST be isolated from the Vitest test runner and MUST produce deterministic results regardless of the host machine's locale.

#### Scenario: App boots into guest mode with placeholder backend config
- **WHEN** the Playwright `webServer` starts the app with placeholder `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` values
- **THEN** the app loads and reaches a guest-usable state (no auth required) without any successful network call to Supabase

#### Scenario: E2E and Vitest do not collide
- **WHEN** `pnpm test` (Vitest) and `pnpm test:e2e` (Playwright) are run
- **THEN** Vitest executes only `src/**` and `supabase/**` specs and Playwright executes only `e2e/**/*.e2e.ts`, with neither runner picking up the other's files

#### Scenario: Language is pinned for deterministic selectors
- **WHEN** any E2E test starts
- **THEN** the app renders in English (`en`) by default so accessible-name selectors are stable across CI runners

### Requirement: Guest can navigate all guest-accessible views

The suite SHALL verify a guest can enter the app from the landing page and reach every non-authenticated view (Day, Week, Month, Schedule, Labels, Dashboard, Activities), with each view rendering and the navigation reflecting the active route.

#### Scenario: Enter app from landing
- **WHEN** a guest opens the landing page and activates "Try app"
- **THEN** the app routes into the guest experience (onboarding or `/app`) without requiring sign-in

#### Scenario: Each guest view renders
- **WHEN** a guest navigates to Day, Week, Month, Schedule, Labels, Dashboard, and Activities in turn
- **THEN** each view renders its primary heading/content and the active nav item reflects the current route

#### Scenario: Settings is not reachable as a guest
- **WHEN** a guest attempts to open `/app/settings`
- **THEN** the app redirects to the auth screen rather than rendering Settings

### Requirement: Guest can complete and skip onboarding

The suite SHALL verify the three-step onboarding wizard for both the skip path and the finish path, asserting the resulting guest profile state and redirect.

#### Scenario: Skip onboarding
- **WHEN** a new guest is routed to onboarding and chooses to skip
- **THEN** the guest profile records `onboarding_skipped` and the app redirects to `/app`

#### Scenario: Finish onboarding with preferences
- **WHEN** a guest steps through schedule, activities, and preferences and finishes with chosen peak hours, weekend, and review-day settings
- **THEN** the guest profile records `onboarding_completed` with the chosen preferences and the app redirects to `/app`

#### Scenario: Completed guest is not sent back to onboarding
- **WHEN** a guest whose onboarding is completed or skipped opens `/onboarding`
- **THEN** the app redirects to `/app`

### Requirement: Guest can manage schedule blocks

The suite SHALL verify create, edit, reorder, and delete of recurring schedule blocks from `/app/schedule`, with changes persisting across a page reload.

#### Scenario: Create a schedule block
- **WHEN** a guest creates a schedule block with a title, day(s), and time range
- **THEN** the block appears in the schedule list and remains after reload

#### Scenario: Edit a schedule block
- **WHEN** a guest edits an existing block's title or time range
- **THEN** the updated values are shown and persist after reload

#### Scenario: Reorder schedule blocks
- **WHEN** a guest drags a block to a new position in the list
- **THEN** the new order is reflected and persists after reload

#### Scenario: Delete a schedule block
- **WHEN** a guest deletes a block
- **THEN** the block is removed from the list and does not reappear after reload

### Requirement: Guest can manage activities

The suite SHALL verify creating, editing, and deactivating activities from `/app/activities`.

#### Scenario: Create an activity
- **WHEN** a guest creates an activity with a name (and category/label as applicable)
- **THEN** the activity appears in the active list and persists after reload

#### Scenario: Edit and deactivate an activity
- **WHEN** a guest edits an activity and then deactivates it
- **THEN** the edited values are shown and the deactivated activity is excluded from the active list

### Requirement: Guest can manage labels

The suite SHALL verify creating, editing, and deleting labels from `/app/labels`.

#### Scenario: Create a label
- **WHEN** a guest creates a label with a name and color
- **THEN** the label appears in the labels list and persists after reload

#### Scenario: Delete a label
- **WHEN** a guest deletes a label
- **THEN** the label is removed and does not reappear after reload

### Requirement: Guest can log time and see it reflected

The suite SHALL verify quick-logging a time entry and confirming it appears on the Day/Calendar view and survives reload.

#### Scenario: Quick-log a time entry
- **WHEN** a guest quick-logs a time entry with a title and time range
- **THEN** the entry appears on the Day view for that date and persists after reload

### Requirement: Guest can navigate calendar views and see the dashboard

The suite SHALL verify date navigation across Day, Week, and Month views and that the Dashboard renders aggregates derived from logged data.

#### Scenario: Page through dates
- **WHEN** a guest moves to the next and previous period on the Day, Week, and Month views
- **THEN** each view updates to show the corresponding date range

#### Scenario: Dashboard reflects logged data
- **WHEN** a guest with at least one logged time entry opens the Dashboard
- **THEN** the Dashboard renders without error and reflects the logged data in its aggregates

### Requirement: Guest can switch language

The suite SHALL verify that switching the interface language updates visible copy and persists the preference.

#### Scenario: Switch to Spanish
- **WHEN** a guest switches the language to Spanish via the language switcher
- **THEN** representative interface copy renders in Spanish and the preference persists across reload

### Requirement: E2E runs at deploy time with a local pre-push gate

The guest E2E suite SHALL run automatically at continuous-deployment time (on merge to the main branch) rather than on every pull-request commit, to avoid spending CI minutes on each push of a PR. It SHALL run headless and SHALL publish diagnostic artifacts when a run fails. A local pre-push git hook SHALL run the suite before code is pushed so regressions are caught locally, and the hook MUST be bypassable for exceptional cases.

#### Scenario: CD runs the guest E2E suite on merge to main
- **WHEN** code is pushed to the main branch (e.g. a pull request is merged)
- **THEN** a dedicated workflow installs the required browser, runs the guest E2E suite headless, and fails the run if any E2E test fails

#### Scenario: PR commits do not trigger the E2E suite
- **WHEN** a commit is pushed to a pull-request branch
- **THEN** the pull-request CI runs lint, typecheck, unit tests, and build, but does NOT run the E2E suite

#### Scenario: Failure artifacts are available
- **WHEN** an E2E test fails in CD
- **THEN** the HTML report and trace for the failing run are uploaded as build artifacts

#### Scenario: Pre-push hook runs the suite locally
- **WHEN** a developer runs `git push`
- **THEN** a pre-push hook runs the guest E2E suite and blocks the push if it fails, unless the developer bypasses it with `git push --no-verify`

