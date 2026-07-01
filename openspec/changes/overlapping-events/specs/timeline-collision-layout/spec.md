## ADDED Requirements

### Requirement: Actual log overlap detection
The system SHALL detect all pairs of rendered actual log segments that share at least one minute of overlap.

#### Scenario: Two logs overlap
- **WHEN** two time logs both include minute 120 (e.g. 1:00–3:00 and 2:00–4:00)
- **THEN** both are identified as belonging to the same collision group

#### Scenario: Non-overlapping logs
- **WHEN** two logs do not share any minute (e.g. 9:00–10:00 and 11:00–12:00)
- **THEN** they are assigned to separate collision groups and each renders full width

#### Scenario: Three-way overlap
- **WHEN** three logs mutually overlap
- **THEN** all three belong to one group and each receives 1/3 of the available column width

---

### Requirement: Actual log lane assignment
The system SHALL assign each actual log segment within a collision group to the leftmost available lane such that no two actual log segments in the same lane overlap in time.

#### Scenario: Lane 0 assigned first
- **WHEN** a segment is the first in its collision group
- **THEN** it is assigned to lane 0

#### Scenario: Lane increments on conflict
- **WHEN** a segment overlaps with all currently occupied lanes
- **THEN** a new lane is opened and the segment is placed there

---

### Requirement: Proportional width rendering for actual logs
The system SHALL render each actual log segment at a width equal to `totalColumnWidth / groupLaneCount` and at a left offset equal to `lane * (totalColumnWidth / groupLaneCount)`.

#### Scenario: Single item — full width
- **WHEN** a segment has no overlapping neighbours
- **THEN** it renders at 100% of the column width (existing behaviour preserved)

#### Scenario: Two overlapping items — half width each
- **WHEN** two segments overlap and are assigned to lanes 0 and 1 of a 2-lane group
- **THEN** each renders at 50% width, positioned at 0% and 50% respectively

#### Scenario: Three overlapping items — one third each
- **WHEN** three segments overlap in a 3-lane group
- **THEN** each renders at 33.3% width at 0%, 33.3%, and 66.6% left offsets

---

### Requirement: Drag-to-reschedule in lane layout
The system SHALL allow drag-to-reschedule for log bars regardless of their assigned lane.

#### Scenario: Dragging a lane-positioned bar
- **WHEN** the user drags a log bar that is rendered in a non-zero lane
- **THEN** the drag interaction computes the new time position from the vertical delta only (independent of horizontal lane position) and calls `onReschedule` with the correct new times

---

### Requirement: Schedule blocks remain full-width background guides
The system SHALL render schedule-block segments full-width as planned background guides and SHALL NOT shrink schedule blocks into collision lanes because an actual log overlaps them.

#### Scenario: Block and log at the same time
- **WHEN** a schedule block segment and an actual log segment overlap in time
- **THEN** the schedule block remains full-width in the background
- **AND** the actual log renders above it

#### Scenario: Two schedule blocks overlap
- **WHEN** two schedule block segments overlap in time
- **THEN** both schedule blocks remain full-width background guides rather than being split into columns

---

### Requirement: Week view handles actual log collisions
The system SHALL render overlapping actual logs in the week view with the same lane assignment model used by the day view, while preserving full-width schedule blocks underneath them.

#### Scenario: Two week-view logs overlap
- **WHEN** two actual logs overlap in the same week-day column
- **THEN** each log renders in a separate lane at half width
- **AND** the day cell remains clickable outside the log bars

#### Scenario: Week-view log overlaps a schedule block
- **WHEN** an actual log overlaps a schedule block in the week view
- **THEN** the schedule block remains full-width in the background
- **AND** the actual log renders above it

---

### Requirement: Month view remains compact
The system SHALL keep month cells compact by stacking schedule and logged segments in the existing vertical strip, with hover/touch descriptions identifying whether a segment is planned or logged.
