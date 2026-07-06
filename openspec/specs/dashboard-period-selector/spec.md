# dashboard-period-selector Specification

## Purpose
TBD - created by archiving change dashboard-activity-trends. Update Purpose after archive.
## Requirements
### Requirement: Period type selection
The dashboard SHALL provide a control to select the scope of displayed data as one of: Day, Week, or Month. The selected period type SHALL drive all data queries and charts on the page.

#### Scenario: Switching from Week to Day
- **WHEN** the user selects "Day" while "Week" was active
- **THEN** the dashboard re-scopes to the current day and all charts/stats update to reflect that single day's data

#### Scenario: Switching from Day to Month
- **WHEN** the user selects "Month" while "Day" was active
- **THEN** the dashboard re-scopes to the calendar month containing the previously selected day and all charts/stats update accordingly

### Requirement: Period navigation
For Day, Week, and Month period types, the dashboard SHALL provide previous/next navigation to move the anchor date by one unit of the selected period type, and a "jump to current" action that resets the anchor to today.

#### Scenario: Navigating to the previous week
- **WHEN** the period type is "Week" and the user activates "previous"
- **THEN** the anchor date moves back 7 days and all data re-scopes to the new week

#### Scenario: Jumping back to today
- **WHEN** the user has navigated away from the current period and activates "jump to current"
- **THEN** the anchor date resets to today and the period recomputes to contain today

### Requirement: Period persistence
The last-selected period (type and anchor date) SHALL be persisted in `localStorage` and restored on the next visit to the dashboard.

#### Scenario: A previously stored custom period is discarded
- **WHEN** the dashboard reads a persisted period preference with `kind: "custom"` from a prior version of the app
- **THEN** the dashboard falls back to the default "Week" period instead of crashing, since "Custom" is no longer a supported period type

#### Scenario: Returning to the dashboard after selecting Month
- **WHEN** the user selects "Month", navigates away from the app, and returns to the dashboard later
- **THEN** the dashboard opens with "Month" selected and the same anchor date as before

### Requirement: Empty state reflects the selected period
The dashboard SHALL show an empty state only when there are zero time logs AND zero schedule blocks for the currently selected period. It SHALL NOT factor in unrelated data (e.g. AI plan slot counts) when deciding whether to show the empty state.

#### Scenario: Empty state clears after logging time
- **WHEN** the user is shown the empty state, then logs time within the currently selected period
- **THEN** the empty state is no longer shown and the charts render the newly logged data

#### Scenario: Empty state shows for a period with no data
- **WHEN** the selected period has no time logs and no schedule blocks
- **THEN** the empty state is shown, directing the user to start logging or scheduling

