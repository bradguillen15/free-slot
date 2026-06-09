## ADDED Requirements

### Requirement: Schedule blocks and time-log bars take full width in day view

In `DayTimeline`, schedule block bars and time-log bars SHALL both render with full column width (left edge to right edge within the timeline area). When a time-log bar overlaps a schedule block at the same time, the log bar SHALL render on top (`z-index` higher) with the schedule block visible underneath at reduced opacity so both are distinguishable.

#### Scenario: Schedule block fills the column width

- **WHEN** a schedule block is active for the current day
- **THEN** its bar spans from the left edge to the right edge of the timeline column
- **AND** is not constrained to 46% width or any half-lane

#### Scenario: Overlapping log renders above schedule block

- **WHEN** a time log and a schedule block share overlapping time
- **THEN** the log bar renders visually on top
- **AND** the schedule block underneath remains partially visible (opacity ≤ 0.4)

---

### Requirement: Schedule blocks and time-log bars take full width in week view

In `WeekGrid`, block bars and log bars SHALL both span the full day-column width. The same overlap/stacking rule applies (logs on top).

#### Scenario: Week view block fills column

- **WHEN** the week view renders a schedule block for a day
- **THEN** its bar fills the full column width for that day
- **AND** is not constrained to a partial-width right sub-column

---

### Requirement: Clicking a schedule block in day view opens an edit dialog

Schedule block bars in `DayTimeline` SHALL be interactive (`pointer-events-auto`). Clicking one SHALL open a `ScheduleBlockDialog` pre-filled with that block's current data (name, start time, end time, days, color). Saving SHALL call `upsertScheduleBlock` and refresh the block list. Deleting SHALL call `deleteScheduleBlock` and refresh.

#### Scenario: User clicks a schedule block bar

- **WHEN** the user clicks a schedule block bar in the day timeline
- **THEN** a dialog opens showing the block's name, time range, color, and selected days
- **AND** the user can edit any field and save

#### Scenario: User deletes a block from the edit dialog

- **WHEN** the user clicks "Delete" inside the schedule block edit dialog
- **THEN** the block is deleted via `deleteScheduleBlock`
- **AND** the dialog closes and the timeline refreshes

---

### Requirement: Clicking a time-log bar in day view opens the log edit dialog

Time-log bars in `DayTimeline` SHALL be interactive. Clicking one SHALL open `QuickLogDialog` in edit mode (`editId` set), pre-filled with the log's category, start time, end time, and notes.

#### Scenario: User clicks a logged time bar

- **WHEN** the user clicks a time-log bar in the day timeline
- **THEN** `QuickLogDialog` opens with that log's data pre-filled
- **AND** saving updates the log and refreshes the timeline

---

### Requirement: Clicking blocks and logs in week view opens edit dialogs

The same click-to-edit behaviour from the day view SHALL apply in `WeekGrid`. Clicking a schedule block opens `ScheduleBlockDialog`; clicking a log bar opens `QuickLogDialog` in edit mode.

#### Scenario: User clicks a block in week view

- **WHEN** the user clicks a schedule block bar in the week grid
- **THEN** `ScheduleBlockDialog` opens pre-filled with that block's data

#### Scenario: User clicks a log in week view

- **WHEN** the user clicks a log bar in the week grid
- **THEN** `QuickLogDialog` opens in edit mode for that log

---

### Requirement: ScheduleBlockDialog includes a recurrence day-picker

`ScheduleBlockDialog` SHALL include a visual day-picker that lets the user select which days of the week the block repeats. It SHALL offer one-click presets:

- **Every day** — selects all 7 days
- **Weekdays** — selects Mon–Fri (indices 1–5)
- **Weekends** — selects Sat–Sun (indices 0, 6)

And individual day toggles (Sun Mon Tue Wed Thu Fri Sat) for custom selection. The selected days map to the `days_of_week` integer array on `schedule_blocks`.

#### Scenario: User creates a "Work" block with Weekdays preset

- **WHEN** the user opens `ScheduleBlockDialog` for a new block
- **AND** clicks "Weekdays"
- **THEN** Mon, Tue, Wed, Thu, Fri toggle buttons appear selected
- **AND** saving stores `days_of_week: [1, 2, 3, 4, 5]`

#### Scenario: User toggles individual days

- **WHEN** the user clicks individual day chips
- **THEN** that day is added or removed from the selection
- **AND** the preset buttons deactivate if the selection no longer matches a preset

#### Scenario: Saving with no days selected is blocked

- **WHEN** the user deselects all days
- **THEN** the Save button is disabled
- **AND** an inline message reads "Select at least one day"

---

### Requirement: "Add schedule block here" option from the day timeline

A right-click or long-press on an empty hour slot in `DayTimeline` SHALL offer a context menu with two options: **"Log time here"** (existing behaviour) and **"Add schedule block here"** (new). Selecting the latter opens `ScheduleBlockDialog` with the start time pre-filled to the clicked hour.

#### Scenario: User right-clicks an empty hour

- **WHEN** the user right-clicks an empty hour slot in the day timeline
- **THEN** a small context menu appears with "Log time here" and "Add schedule block here"

#### Scenario: User chooses "Add schedule block here"

- **WHEN** the user selects "Add schedule block here" from the context menu
- **THEN** `ScheduleBlockDialog` opens with `start_time` pre-filled to the clicked hour
- **AND** the day of the week of the current date is pre-selected in the day-picker

---

### Requirement: Guest and cloud parity

All new interactions (block edit, log edit, block create from timeline) SHALL work in both guest mode (localStorage via `dataStore`) and cloud mode (Supabase). No direct `supabase.from()` calls in page or timeline components — use `upsertScheduleBlock`, `deleteScheduleBlock`, `updateTimeLog`, `insertTimeLog` from `dataStore`.

#### Scenario: Guest user edits a schedule block

- **WHEN** a guest user (not signed in) clicks a schedule block bar
- **THEN** `ScheduleBlockDialog` opens and saves via localStorage
- **AND** the timeline reflects the change without requiring sign-in

---

### Requirement: Application compiles and tests pass

After all changes, `bun run build` SHALL succeed and `bun run test` SHALL pass with no regressions.

#### Scenario: CI verification

- **WHEN** `bun run build` and `bun run test` are run
- **THEN** both exit with code 0
