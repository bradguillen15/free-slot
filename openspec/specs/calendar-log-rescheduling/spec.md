### Requirement: A time log can be rescheduled across time and day in the Week view

The Week view SHALL allow a log bar to be dragged to a new start/end time and to a different day,
snapping to 15-minute increments, and SHALL persist the change via `updateTimeLog`.

#### Scenario: Drag a log to a new time on the same day

- **WHEN** the user drags a Week log bar vertically and releases
- **THEN** `onLogReschedule(logId, newDate, newStartMin, newEndMin)` fires with 15-minute-snapped
  times and the same date
- **AND** the log persists at the new time and re-renders in the new position

#### Scenario: Drag a log to a different day

- **WHEN** the user drags a Week log bar horizontally to another day column and releases
- **THEN** `onLogReschedule` fires with the new date
- **AND** the log persists on the new day and renders there after reload

#### Scenario: A category-less log cannot be dragged

- **WHEN** the user attempts to drag a log that has no category assigned
- **THEN** the drag is blocked and a toast prompts assigning a category first

### Requirement: updateTimeLog supports moving a log to a new date

`updateTimeLog` SHALL accept an optional `date` and move the log to that date in both guest and cloud
modes, leaving existing callers (no `date`) unchanged.

#### Scenario: Cloud move updates the row's date

- **WHEN** `updateTimeLog` runs in cloud mode with a new `date`
- **THEN** the row's date is updated via `resources.timeLogs.update` and time-log queries are invalidated

#### Scenario: Guest move relocates the log across month buckets

- **WHEN** `updateTimeLog` runs in guest mode with a `date` in a different month
- **THEN** `localStore` removes the log from the old month bucket and writes it to the new one

### Requirement: A log is consistent across all views

A log created, edited, or rescheduled in any view SHALL be reflected in the Day, Week, and Month
views, because all views derive from the same logs through the shared cell builder.

#### Scenario: Cross-view visibility

- **WHEN** a log is created or moved in the Week view
- **THEN** navigating to the Day view for that date shows the same log
- **AND** the Month view for that date reflects the same log
