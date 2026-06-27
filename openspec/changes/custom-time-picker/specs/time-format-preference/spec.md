## ADDED Requirements

### Requirement: Time format preference on profile

The system SHALL store a user time display preference as `time_format` with values `"12h"` or `"24h"`, defaulting to `"24h"`. The preference SHALL persist in guest mode via `LocalProfile` in localStorage and in cloud mode via the `profiles` table.

#### Scenario: Guest saves 12-hour preference

- **WHEN** a guest user toggles time format to 12-hour in Settings and saves preferences
- **THEN** `time_format` is `"12h"` in local profile storage
- **AND** subsequent page loads read `"12h"` without reset

#### Scenario: Cloud user saves 24-hour preference

- **WHEN** a signed-in user saves preferences with 24-hour format enabled
- **THEN** the `profiles.time_format` column is updated to `"24h"`
- **AND** a refetched profile reflects the saved value

### Requirement: Settings control for time format

Settings SHALL expose a control in the planner preferences section to choose between 12-hour and 24-hour display. The control SHALL save with the existing "Save preferences" action.

#### Scenario: Toggle visible on Settings page

- **WHEN** the user opens Settings
- **THEN** a labeled time format control is visible alongside other planner preferences

### Requirement: App-wide display respects preference

All user-visible clock times SHALL render using the active `time_format` preference. Internal storage and API payloads SHALL remain 24-hour `HH:MM` strings.

#### Scenario: Timeline hour labels follow preference

- **WHEN** `time_format` is `"24h"`
- **THEN** day and week timeline hour labels show values like `09:00` and `14:00`

#### Scenario: Timeline hour labels in 12-hour mode

- **WHEN** `time_format` is `"12h"`
- **THEN** day and week timeline hour labels show values like `9 AM` and `2 PM`

#### Scenario: Tooltip and inline ranges follow preference

- **WHEN** the user hovers or reads a time range in month cells, week grid tooltips, or similar
- **THEN** displayed start and end times use the active format while stored values stay `HH:MM`
