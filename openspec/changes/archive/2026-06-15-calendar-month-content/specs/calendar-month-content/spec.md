## ADDED Requirements

### Requirement: Month cells render real schedule and logs

The Month view SHALL render each day cell with a compact mini day-bar showing that day's schedule
blocks and logs as colored segments derived from the shared cell builder, so the month reflects the
actual schedule and logged time rather than only an intensity wash.

#### Scenario: A day with blocks and logs shows segments

- **WHEN** the Month view renders a day that has schedule blocks and logs
- **THEN** the cell shows block and log segments using their category colors
- **AND** the segments are consistent with what the Day and Week views show for that date

#### Scenario: Today is highlighted and empty days stay clean

- **WHEN** the Month grid renders
- **THEN** the current day cell is highlighted
- **AND** a day with no blocks or logs renders an empty, uncluttered cell

### Requirement: Month is uncluttered and tappable on mobile

The Month view SHALL collapse each cell on small screens to the day number plus a single intensity
bar/dot and total, showing the full mini-bar only from the `sm` breakpoint up, and SHALL replace the
four 6-hour quick-log buttons with a whole-cell tap that opens the Day view for that date.

#### Scenario: Mobile cell is collapsed

- **WHEN** the Month view renders at a small (phone) viewport
- **THEN** cells show day number + intensity + total without the four quarter buttons
- **AND** there is no horizontal overflow

#### Scenario: Tapping a day opens it

- **WHEN** the user taps a month day cell
- **THEN** the Day view opens for that date
