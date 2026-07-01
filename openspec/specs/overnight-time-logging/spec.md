# overnight-time-logging Specification

## Purpose
TBD - created by archiving change schedule-actual-precedence. Update Purpose after archive.
## Requirements
### Requirement: Time entries may span midnight

The log dialog SHALL accept time entries whose end time is at or before the start time, treating
them as crossing midnight. The system SHALL only reject an entry when start and end are exactly
equal (a zero-length entry). This applies to both creating a new entry and editing an existing one.

#### Scenario: Logging an overnight sleep entry

- **WHEN** the user enters start 23:00 and end 06:00 and saves
- **THEN** the entry is accepted and persisted with start_time 23:00 and end_time 06:00

#### Scenario: Editing an entry into an overnight span

- **WHEN** the user edits an existing entry to start 22:30 and end 07:00 and saves
- **THEN** the updated entry is accepted and persisted

#### Scenario: Zero-length entry is rejected

- **WHEN** the user enters start 09:00 and end 09:00 and saves
- **THEN** the entry is rejected with a validation message

### Requirement: Duration is computed by wrapping past midnight

When the end time is at or before the start time, the duration SHALL be computed as the time from
start to midnight plus the time from midnight to end. The live duration readout in the log dialog
SHALL reflect this wrapped value.

#### Scenario: Wrapped duration readout

- **WHEN** the user enters start 23:00 and end 06:00
- **THEN** the duration readout shows 7h 0m

#### Scenario: Same-day duration is unchanged

- **WHEN** the user enters start 09:00 and end 10:30
- **THEN** the duration readout shows 1h 30m

### Requirement: Logging from a schedule block prefills its real span

The log dialog SHALL prefill the start and end with the block's actual span when the user clicks a schedule block in the day or week timeline, rather than a truncated window. For overnight blocks (end at or before start), the full overnight span is used.

#### Scenario: Log actual from an overnight sleep block

- **WHEN** the user clicks an overnight Sleep block of 23:00–08:00 in the timeline
- **THEN** the log dialog opens prefilled with start 23:00 and end 08:00

#### Scenario: Log actual from a same-day block

- **WHEN** the user clicks a Work block of 09:00–17:00 in the timeline
- **THEN** the log dialog opens prefilled with start 09:00 and end 17:00

