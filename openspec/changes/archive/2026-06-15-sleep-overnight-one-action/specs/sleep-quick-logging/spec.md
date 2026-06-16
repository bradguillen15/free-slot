## ADDED Requirements

### Requirement: A Sleep preset prefills an overnight log in one action

The create menu SHALL offer a "Sleep" preset that opens the log dialog pre-filled with an overnight
span and the default Sleep category, so recording last night's sleep is a single action.

#### Scenario: Sleep preset opens a prefilled overnight dialog

- **WHEN** the user chooses the "Sleep" preset
- **THEN** the log dialog opens with an overnight span (bedtime → morning) and the Sleep category selected
- **AND** the Sleep category is created from the default seed if it does not yet exist

#### Scenario: Saving creates a single overnight row

- **WHEN** the user confirms the prefilled Sleep log
- **THEN** exactly one `time_log` row is created with end ≤ start (overnight)
- **AND** the dialog shows a "next day" indicator on the end time

### Requirement: Overnight sleep can be adjusted in one action without touching the template

The system SHALL let a user adjust a single night's overnight sleep by editing or dragging the one
underlying log row (which may change its `date`), without modifying the recurring Sleep schedule block.

#### Scenario: Dragging the overnight log moves the single row

- **WHEN** the user drags an overnight sleep log to a new time/day
- **THEN** the single row's times (and date if changed) update via `updateTimeLog`
- **AND** the recurring Sleep schedule block is unchanged

### Requirement: Logging actual sleep clips the planned Sleep block

The system SHALL clip the planned Sleep block to the time not covered by the logged sleep on the
affected day(s), so logging real sleep removes the planned-sleep tail without editing the template.

#### Scenario: Logged sleep replaces the prior-day planned tail

- **WHEN** an overnight sleep is logged that differs from the recurring Sleep block
- **THEN** the planned Sleep block on the prior day's tail is clipped by the logged time
- **AND** the morning portion appears on the next day
- **AND** the change persists across reloads
