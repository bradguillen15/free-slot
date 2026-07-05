## ADDED Requirements

### Requirement: Period type selection
The dashboard SHALL provide a control to select the scope of displayed data as one of: Day, Week, Month, or Custom range. The selected period type SHALL drive all data queries and charts on the page.

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

### Requirement: Custom range selection
When the period type is "Custom", the dashboard SHALL let the user pick an explicit start and end date, and SHALL clamp the range to a maximum of 92 days.

#### Scenario: Selecting a valid custom range
- **WHEN** the user selects "Custom" and picks a start and end date within 92 days of each other
- **THEN** the dashboard scopes all data to that exact date range

#### Scenario: Selecting an oversized custom range
- **WHEN** the user selects a custom start/end date range spanning more than 92 days
- **THEN** the dashboard clamps the end date so the range does not exceed 92 days and indicates the range was adjusted

### Requirement: Period persistence
The last-selected period (type, anchor date, and custom range if applicable) SHALL be persisted in `localStorage` and restored on the next visit to the dashboard.

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
