# dashboard-schedule-vs-actual Delta Specification

## ADDED Requirements

### Requirement: Per-label schedule vs actual comparison for the selected week
The dashboard SHALL show a Schedule vs Actual card for the selected week with one row per label that has scheduled or logged time (after filters). Each row SHALL show: scheduled minutes (recurring blocks with that label expanded across the week's dates, overnight blocks attributed per calendar day), logged minutes (time logs with that label), and the delta (logged − scheduled). Rows SHALL be sorted by scheduled+logged descending.

#### Scenario: Label with schedule and logs
- **WHEN** Deep work is scheduled 09:00–12:00 on 5 weekdays (15h) and 8h of Deep work logs exist that week
- **THEN** the Deep work row shows scheduled 15h, logged 8h, delta −7h

#### Scenario: Label logged but never scheduled
- **WHEN** Gaming has no schedule blocks but 6h of logs
- **THEN** a Gaming row shows scheduled 0h, logged 6h, delta +6h

#### Scenario: Overnight block attribution
- **WHEN** Sleep is scheduled 23:00–07:00 daily
- **THEN** each day contributes 23:00–24:00 on its own date and 00:00–07:00 on the following date to Sleep's scheduled minutes

### Requirement: Adherence is computed by time overlap, not totals
For each label, adherence minutes SHALL be the interval intersection between the label's scheduled windows and time logs of the same label on the same date — logging the same label outside its scheduled window does not count as adherence. A global adherence KPI SHALL show sum(adherence) / sum(scheduled) as a percentage across non-excluded labels, shown only when scheduled minutes exist.

#### Scenario: Same label logged at the wrong time
- **WHEN** Deep work is scheduled 09:00–12:00 and a 3h Deep work log exists 15:00–18:00 that day
- **THEN** Deep work adherence for that day is 0 minutes while its logged total is 3h

#### Scenario: Partial overlap
- **WHEN** Deep work is scheduled 09:00–12:00 and a Deep work log spans 10:00–14:00
- **THEN** adherence for that day is 120 minutes (10:00–12:00)

#### Scenario: Global adherence KPI
- **WHEN** total scheduled time (after filters) is 20h and same-label overlap totals 13h
- **THEN** the adherence KPI shows 65%

### Requirement: Displacement breakdown per label
Each row with scheduled time SHALL be expandable to a displacement breakdown of its scheduled windows: minutes logged as the same label (kept), minutes logged as each other label (displaced, listed per label sorted descending), and unlogged minutes (nothing logged). The three parts SHALL sum to the label's scheduled minutes.

#### Scenario: Scheduled window eaten by another activity
- **WHEN** Deep work is scheduled 09:00–12:00 and that window contains a 09:00–10:00 Deep work log and a 10:00–11:30 Gaming log
- **THEN** the Deep work breakdown shows kept 1h, Gaming 1.5h, unlogged 30m

#### Scenario: Overlapping logs are not double-counted
- **WHEN** two logs overlap inside a scheduled window
- **THEN** each minute of the window is attributed at most once (union per label; total attributed never exceeds the window)

### Requirement: View toggle
The card SHALL offer three views: Compare (scheduled and logged side by side, default), Actual only, and Schedule only. The toggle affects the card's rows only, not the rest of the dashboard.

#### Scenario: Schedule-only view
- **WHEN** the user selects Schedule only
- **THEN** rows show only scheduled minutes, hiding logged/delta columns

### Requirement: Card integrates with dashboard conventions
The card SHALL respect the label filter (both sides), appear in the card-visibility menu, show a localized empty state when there are no schedule blocks (pointing to the Schedule page), and be fully localized (en/es). It SHALL work identically for guests and signed-in users.

#### Scenario: No schedule yet
- **WHEN** the user has no schedule blocks
- **THEN** the card shows an empty state inviting them to set up their schedule instead of an empty table
