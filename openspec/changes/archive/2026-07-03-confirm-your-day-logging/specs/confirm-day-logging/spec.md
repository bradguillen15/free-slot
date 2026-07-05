## ADDED Requirements

### Requirement: Confirming a day materializes schedule blocks into time logs
The system SHALL provide a "confirm my day" action for a given date that, for each schedule block active on that date (its `days_of_week` includes that date's weekday), creates a `time_logs` row with the block's exact `start_time`/`end_time` (including overnight spans as a single row), the block's `category_id`, and the category's `type`.

#### Scenario: Confirming a day with no existing logs materializes every active block
- **WHEN** a day has three active schedule blocks and no existing logs
- **AND** the user confirms that day
- **THEN** three time logs are created, one per block, matching each block's start/end time and category

#### Scenario: An overnight block becomes a single log row
- **WHEN** an active schedule block spans 23:00–07:00 (overnight)
- **AND** the user confirms that day
- **THEN** exactly one time log is created for that day with `start_time: "23:00"` and `end_time: "07:00"`

### Requirement: Blocks overlapping an existing log are skipped entirely
A schedule block that overlaps any existing time log on the confirmed date (fully or partially) SHALL NOT produce a confirm-day log. The block is skipped in its entirety — no log is created for the overlapping portion or the remaining uncovered portion.

#### Scenario: A fully covered block produces no log
- **WHEN** a schedule block spans 09:00–17:00 and an existing log already spans 09:00–17:00 on that day
- **AND** the user confirms that day
- **THEN** no additional time log is created for that block

#### Scenario: A partially covered block produces no log
- **WHEN** a schedule block spans 09:00–17:00 and an existing log spans 12:00–13:00 on that day
- **AND** the user confirms that day
- **THEN** no time log is created for that block (neither the covered nor uncovered portions)

### Requirement: Blocks without a category are skipped
A schedule block with `category_id: null` SHALL NOT produce a confirm-day log, since `time_logs.category_id` is required.

#### Scenario: An uncategorized block is skipped
- **WHEN** an active schedule block has no `category_id` assigned
- **AND** the user confirms that day
- **THEN** no time log is created for that block
- **THEN** the confirm action's result indicates it was skipped for missing a category

### Requirement: Confirming a day is idempotent
Running the confirm action again for the same date SHALL NOT create duplicate logs for blocks already confirmed.

#### Scenario: Re-confirming the same day changes nothing
- **WHEN** a day has already been confirmed once, creating a log for each eligible block
- **AND** the user confirms the same day again
- **THEN** no additional time logs are created

### Requirement: Confirm-day works identically for guest and cloud
The confirm action SHALL be available and behave identically whether the user is a guest (localStorage) or a signed-in cloud user (Supabase), for any day with schedule blocks — today or a past day.

#### Scenario: Guest confirms a day
- **WHEN** a guest user confirms a day with eligible blocks
- **THEN** the resulting logs are written to `localStorage` and visible in Day/Week/Month views like any other guest log

#### Scenario: Cloud user confirms a day
- **WHEN** a signed-in user confirms a day with eligible blocks
- **THEN** the resulting logs are written to `time_logs` via the cloud resources provider and visible like any other log

### Requirement: Confirm affordance communicates empty and fully-covered states
The confirm action's UI SHALL distinguish between a day with no schedule blocks at all and a day that is already fully covered by existing logs, rather than presenting the same disabled state for both.

#### Scenario: No schedule for the day
- **WHEN** the confirmed date has no active schedule blocks at all
- **THEN** the UI indicates there is nothing to confirm because no schedule exists for that day

#### Scenario: Day already fully covered
- **WHEN** every active schedule block for the date already fully overlaps an existing log
- **THEN** the UI indicates the day is already fully logged
