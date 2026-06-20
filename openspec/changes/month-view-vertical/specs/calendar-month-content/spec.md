## MODIFIED Requirements

### Requirement: Month cells render real schedule and logs

The Month view SHALL render each day cell with a compact vertical time strip showing that day's schedule blocks and logs as vertically-positioned colored segments derived from the shared cell builder. The time axis runs top-to-bottom (00:00 → 23:59), consistent with the Day and Week timeline orientation.

#### Scenario: A day with blocks and logs shows vertically-placed segments

- **WHEN** the Month view renders a day that has schedule blocks and logs
- **THEN** the cell shows block and log segments as vertical slices in the time strip
- **AND** the vertical position of each segment corresponds to its time-of-day
- **AND** segment colors match the category colors used in Day and Week views

#### Scenario: Today is highlighted and empty days stay clean

- **WHEN** the Month grid renders
- **THEN** the current day cell is highlighted
- **AND** a day with no blocks or logs renders an empty, uncluttered cell with an empty strip track

### Requirement: Month is uncluttered and tappable on mobile

The Month view SHALL collapse each cell on small screens to the day number plus a single intensity indicator, hiding the vertical time strip below the `sm` breakpoint, and SHALL use a whole-cell tap to open the Day view for that date.

#### Scenario: Mobile cell is collapsed

- **WHEN** the Month view renders at a small (phone) viewport
- **THEN** cells show day number and intensity indicator only — no vertical strip
- **AND** there is no horizontal overflow

#### Scenario: Tapping a day opens it

- **WHEN** the user taps a month day cell
- **THEN** the Day view opens for that date
