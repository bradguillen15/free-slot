## ADDED Requirements

### Requirement: Themed time input component

The application SHALL provide a reusable `TimeInput` component for selecting times that matches the shadcn dark theme. It SHALL NOT use `<input type="time">`.

#### Scenario: Opens themed picker

- **WHEN** the user activates a `TimeInput` field
- **THEN** a popover time picker styled with app design tokens appears
- **AND** no native OS time picker is shown

#### Scenario: Emits HH:MM value

- **WHEN** the user selects a time in `TimeInput`
- **THEN** `onChange` receives a valid 24-hour `HH:MM` string suitable for existing zod `timeString` validation

### Requirement: TimeInput integrates with react-hook-form

`TimeInput` SHALL accept controlled `value` and `onChange` props so it can replace native time fields in `QuickLogDialog`, `ScheduleBlockDialog`, and `ScheduleEditor` without changing save logic.

#### Scenario: Quick log start and end fields

- **WHEN** the user creates or edits a time log
- **THEN** start and end fields use `TimeInput`
- **AND** overnight log behavior (end before start) remains unchanged

### Requirement: TimeInput display follows format preference

The closed `TimeInput` trigger label SHALL show the current value formatted per the user's `time_format` preference. The open picker SHALL adapt (24h: 00–23; 12h: 1–12 with AM/PM segment).

#### Scenario: 24-hour trigger label

- **WHEN** `time_format` is `"24h"` and value is `14:30`
- **THEN** the trigger displays `14:30`

#### Scenario: 12-hour picker interaction

- **WHEN** `time_format` is `"12h"` and the user picks 2:30 PM
- **THEN** `onChange` emits `14:30`
- **AND** the trigger displays `2:30 PM`

### Requirement: Remove native time input styling hack

Once all `type="time"` inputs are replaced, the `::-webkit-calendar-picker-indicator` rule in `index.css` SHALL be removed.
