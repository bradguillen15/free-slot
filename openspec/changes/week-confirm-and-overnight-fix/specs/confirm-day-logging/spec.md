## MODIFIED Requirements

### Requirement: Confirming a day materializes schedule blocks into time logs
The system SHALL provide a "confirm my day" action for a given date `D` that creates a `time_logs` row for each eligible schedule-block instance relevant to `D`, with the block's exact `start_time`/`end_time` (including overnight spans as a single row), the block's `category_id`, and the category's `type`. A block instance is relevant to `D` in either of two ways:
- **Same-day instance**: the block's `days_of_week` includes `D`'s weekday. This instance is dated `D`.
- **Overnight tail instance**: the block is overnight (`end_time` earlier than `start_time`) and its `days_of_week` includes the weekday of `D - 1` (the day before `D`). This instance represents the block's occurrence that started on `D - 1` and ends during `D`'s daytime, and is dated `D - 1` (its start day), consistent with how manually-logged overnight entries are dated.

A block active every day of the week therefore produces two distinct instances when confirming any given date: its own same-day instance (dated `D`) and the previous night's tail instance (dated `D - 1`) — these represent two different real-world occurrences, not a duplicate.

#### Scenario: Confirming a day with no existing logs materializes every active block
- **WHEN** a day has three active schedule blocks (same-day instances) and no existing logs
- **AND** the user confirms that day
- **THEN** three time logs are created, one per block, matching each block's start/end time and category

#### Scenario: An overnight block becomes a single log row for its same-day instance
- **WHEN** an active schedule block spans 23:00–07:00 (overnight) and is scheduled to start on date `D`
- **AND** the user confirms date `D` for a fully past date (no elapsed-time gating)
- **THEN** exactly one time log is created dated `D` with `start_time: "23:00"` and `end_time: "07:00"`

#### Scenario: An overnight block's tail instance is confirmable from the day it ends
- **WHEN** an overnight schedule block spans 23:00–07:00 and is scheduled on the weekday before date `D`
- **AND** the current time (when confirming `D` as today) is at or after 07:00
- **THEN** confirming `D` creates one time log dated `D - 1` with `start_time: "23:00"` and `end_time: "07:00"`

#### Scenario: An overnight block's tail instance is not confirmable before it elapses
- **WHEN** an overnight schedule block spans 23:00–07:00 and is scheduled on the weekday before date `D`
- **AND** the current time (when confirming `D` as today) is before 07:00
- **THEN** confirming `D` does not create a log for that block's tail instance, and it is reported as not yet elapsed

#### Scenario: An overnight block's same-day instance is never elapsed while confirming today
- **WHEN** an overnight schedule block spans 23:00–07:00 and is scheduled to start on today's weekday
- **AND** the user confirms today at any time of day
- **THEN** the same-day instance of that block is never materialized (it has not ended yet, regardless of clock time), while its tail instance from the previous day (if scheduled) is evaluated independently

### Requirement: Blocks overlapping an existing log are skipped entirely
A schedule-block instance that overlaps any existing time log on its own instance date (fully or partially) SHALL NOT produce a confirm-day log. The instance is skipped in its entirety — no log is created for the overlapping portion or the remaining uncovered portion. For an overnight tail instance, the overlap check uses existing logs on the tail's own date (`D - 1`), not the confirmed date `D`.

#### Scenario: A fully covered block produces no log
- **WHEN** a schedule block spans 09:00–17:00 and an existing log already spans 09:00–17:00 on that day
- **AND** the user confirms that day
- **THEN** no additional time log is created for that block

#### Scenario: A partially covered block produces no log
- **WHEN** a schedule block spans 09:00–17:00 and an existing log spans 12:00–13:00 on that day
- **AND** the user confirms that day
- **THEN** no time log is created for that block (neither the covered nor uncovered portions)

#### Scenario: A previously-confirmed overnight tail instance is not duplicated
- **WHEN** an overnight block's tail instance for `D - 1` was already confirmed (a log exists dated `D - 1` matching its span)
- **AND** the user confirms `D` again
- **THEN** no duplicate log is created for that tail instance
