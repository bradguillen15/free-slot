# schedule-guide-precedence Specification

## Purpose
TBD - created by archiving change schedule-actual-precedence. Update Purpose after archive.
## Requirements
### Requirement: Planned blocks clip against logged time in the day timeline

In the day timeline, a planned schedule block SHALL be rendered only for the portions of its span
that are NOT covered by any logged time entry on that day. Logged entries take visual precedence
over the schedule guide. The clipping SHALL be computed in minute-space and SHALL be overnight-aware
(a block or log crossing midnight is split into same-day segments before subtraction).

#### Scenario: A log covers part of a planned block

- **WHEN** a planned block spans 09:00–12:00 and a log exists for 09:00–10:30 on the same day
- **THEN** the planned block is rendered only for 10:30–12:00
- **AND** the logged entry is rendered for 09:00–10:30

#### Scenario: A log fully covers a planned block

- **WHEN** a planned block spans 13:00–14:00 and a log exists for 12:30–14:30 on the same day
- **THEN** the planned block is not rendered at all for that day
- **AND** the logged entry is rendered for its full span

#### Scenario: A log covers the middle of a planned block, splitting it

- **WHEN** a planned block spans 09:00–17:00 and a log exists for 12:00–13:00 on the same day
- **THEN** the planned block is rendered as two segments, 09:00–12:00 and 13:00–17:00

#### Scenario: No logs leave the planned block intact

- **WHEN** a planned block spans 23:00–08:00 (overnight) and no logs exist on that day
- **THEN** the planned block is rendered for its full span (23:00–24:00 and 00:00–08:00 segments)

#### Scenario: An overnight log clips an overnight planned block

- **WHEN** a planned block spans 23:00–08:00 and a log exists for 23:00–01:00 on the same day
- **THEN** the planned block is rendered only for 01:00–08:00
- **AND** the logged entry is rendered for the 23:00–24:00 and 00:00–01:00 segments

#### Scenario: Free-window calculation is unaffected

- **WHEN** planned blocks are clipped against logs in the day timeline
- **THEN** the free-window / gaps computation still treats both planned and logged time as busy
- **AND** no change to free-window results occurs as a result of clipping

