## ADDED Requirements

### Requirement: A pure builder assembles per-day calendar cells

The system SHALL provide a pure function `buildDayCells({ days, blocks, logs, categories, profile,
aiPlan? })` that returns one `DayCellData` per day, containing the day's block segments, log
segments, free-time gaps, peak-free flag, optional AI slots, and total free minutes.

#### Scenario: Overnight blocks and logs attribute to the correct days

- **WHEN** a block or log spans midnight (end ≤ start)
- **THEN** `buildDayCells` splits it via the existing overnight-aware expansion so each portion lands
  on its correct day

#### Scenario: Gaps, peak, and totals are computed per day

- **WHEN** cells are built for a date range
- **THEN** each cell exposes free-time gaps, a peak-hour free flag, and total free minutes consistent
  with the current free-window engine

#### Scenario: AI plan slots pass through unchanged

- **WHEN** an `aiPlan` is provided
- **THEN** its slots appear as the cell's AI slot segments without altering block/log assembly

### Requirement: A hook provides cells from the data layer

The system SHALL provide `useCalendarDays(startISO, endISO)` that reads blocks, logs, visible
categories, and profile via existing dataStore hooks and returns `DayCellData[]` from `buildDayCells`.

#### Scenario: Hook returns cells for a range

- **WHEN** a view calls `useCalendarDays(start, end)`
- **THEN** it receives `DayCellData[]` derived from the same data the views currently fetch

### Requirement: Week rendering is unchanged after adoption

The Week view SHALL render identically before and after consuming the shared builder; this is an
internal extraction with no visual change.

#### Scenario: Week output matches the prior implementation

- **WHEN** the Week view renders a week of blocks and logs
- **THEN** the displayed blocks, logs, gaps, and stat cards match the pre-refactor output
- **AND** the existing WeekGrid/WeekPage tests pass without behavioral edits
