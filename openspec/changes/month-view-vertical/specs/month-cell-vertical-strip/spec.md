## ADDED Requirements

### Requirement: Month cells render a vertical time strip

Each month day cell SHALL render a narrow vertical bar (the "time strip") where the vertical axis represents the 24-hour day (top = 00:00, bottom = 23:59) and each block or log occupies a proportional slice of the bar's height, colored by its category color.

#### Scenario: A block occupying morning hours appears near the top

- **WHEN** a day has a schedule block from 08:00 to 09:00
- **THEN** the vertical strip shows a colored segment near the top quarter of the bar
- **AND** the segment height is proportional to 60 / 1440 of the total bar height

#### Scenario: Overlapping blocks and logs both appear

- **WHEN** a day has both a schedule block and a logged session in the same time window
- **THEN** both are visible in the strip (e.g. stacked side by side or layered with opacity)

#### Scenario: Empty days show an empty strip

- **WHEN** a day has no blocks or logs
- **THEN** the strip is rendered but contains no colored segments (just the track background)

#### Scenario: The strip is hidden on mobile (small viewport)

- **WHEN** the Month view renders at a narrow (phone-size) viewport
- **THEN** the vertical strip is not visible (hidden below the `sm` breakpoint)
- **AND** the cell still shows the day number and any compact fallback indicator
