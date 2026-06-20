## ADDED Requirements

### Requirement: Overlap detection
The system SHALL detect all pairs of rendered segments (log bars and visible block bars) in the day-view timeline that share at least one minute of overlap.

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

### Requirement: Lane assignment
The system SHALL assign each segment within a collision group to the leftmost available lane such that no two segments in the same lane overlap in time.

#### Scenario: Lane 0 assigned first
- **WHEN** a segment is the first in its collision group
- **THEN** it is assigned to lane 0

#### Scenario: Lane increments on conflict
- **WHEN** a segment overlaps with all currently occupied lanes
- **THEN** a new lane is opened and the segment is placed there

---

### Requirement: Proportional width rendering
The system SHALL render each segment at a width equal to `totalColumnWidth / groupLaneCount` and at a left offset equal to `lane * (totalColumnWidth / groupLaneCount)`.

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

### Requirement: Block bars participate in collision layout
The system SHALL include visible schedule-block segments in the collision calculation alongside log segments.

#### Scenario: Block and log at the same time
- **WHEN** a schedule block segment and a log segment overlap in time
- **THEN** they are placed in separate lanes and each renders at half width
