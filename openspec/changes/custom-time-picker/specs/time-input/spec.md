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

#### Scenario: Selects via scroll-snap wheels

- **WHEN** the picker is open
- **THEN** hours and minutes are presented as scroll-snap wheels with a center selection band
- **AND** the selected row stays aligned to the primary (blue) center selection band
- **AND** the wheels allow continuous scrolling past the first and last values without visibly resetting to a boundary
- **AND** scrolling a wheel to a new row, or clicking a row, emits the corresponding `HH:MM`
- **AND** minutes advance in 5-minute steps, while an off-step current minute remains selectable

#### Scenario: Mobile picker stays inside the current dialog

- **WHEN** the user activates a `TimeInput` field on a mobile viewport inside a dialog
- **THEN** the picker appears as a partial-height panel in the current dialog flow
- **AND** the picker does not create a separate fullscreen modal or portal outside the dialog
- **AND** wheel scrolling and AM/PM buttons remain interactive

#### Scenario: Types a time directly into the field

- **WHEN** the user types a valid time into the editable field and commits (blur or Enter)
- **THEN** `onChange` receives the equivalent 24-hour `HH:MM` value
- **AND** in 12-hour mode the field accepts `h:mm AM/PM` input
- **AND** invalid input reverts the field to the last valid value without calling `onChange`

### Requirement: TimeInput integrates with react-hook-form

`TimeInput` SHALL accept controlled `value` and `onChange` props so it can replace native time fields in `QuickLogDialog`, `ScheduleBlockDialog`, and `ScheduleEditor` without changing save logic.

#### Scenario: Quick log start and end fields

- **WHEN** the user creates or edits a time log
- **THEN** start and end fields use `TimeInput`
- **AND** overnight log behavior (end before start) remains unchanged

### Requirement: TimeInput display follows format preference

The closed `TimeInput` field SHALL show the current value formatted per the user's `time_format` preference and SHALL always include minutes. The open picker SHALL adapt (24h: 00–23 wheel; 12h: 1–12 wheel with a full-width AM/PM segmented toggle below the wheels).

#### Scenario: 24-hour trigger label

- **WHEN** `time_format` is `"24h"` and value is `14:30`
- **THEN** the trigger displays `14:30`

#### Scenario: 12-hour picker interaction

- **WHEN** `time_format` is `"12h"` and the user picks 2:30 PM
- **THEN** `onChange` emits `14:30`
- **AND** the field displays `2:30 PM`
- **AND** AM/PM is chosen via the segmented toggle below the wheels, whose active segment uses the primary (blue) fill

#### Scenario: 12-hour field displays zero minutes

- **WHEN** `time_format` is `"12h"` and value is `09:00`
- **THEN** the field displays `9:00 AM`

### Requirement: Remove native time input styling hack

Once all `type="time"` inputs are replaced, the `::-webkit-calendar-picker-indicator` rule in `index.css` SHALL be removed.
