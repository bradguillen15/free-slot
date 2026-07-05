## ADDED Requirements

### Requirement: Multi-line activity trend chart
The dashboard SHALL display a single full-width line chart with one line per activity/label, plotting minutes logged per day across the selected period on the x-axis.

#### Scenario: Multiple activities logged across the period
- **WHEN** the user has logged time under two or more labels within the selected period
- **THEN** the chart renders one distinct line per label, each showing that label's minutes per day

#### Scenario: No data in the selected period
- **WHEN** there are no time logs for any label within the selected period (but schedule blocks exist, so the page is not in the empty state)
- **THEN** the chart renders with an empty/flat series rather than erroring

### Requirement: Isolated single-occurrence data point marker
A label's line SHALL render a small dot marker at any data point that has no adjacent day with data for that label (i.e. a single-occurrence activity within the period), since Recharts draws no visible line segment for an isolated point.

#### Scenario: A label has exactly one day of data in the period
- **WHEN** a label has minutes logged on only one day within the selected period, with no data on the immediately preceding or following day
- **THEN** the chart renders a small dot at that point in the label's color, instead of showing nothing

#### Scenario: A label has continuous data across multiple days
- **WHEN** a label has minutes logged on consecutive days
- **THEN** no per-point dots are rendered for those days; only the connecting line is shown, per the existing `dot={false}` default

### Requirement: Interactive legend filters lines
The chart's legend SHALL list every activity/label with a logged or scheduled minute in the period. Clicking a legend entry SHALL toggle that label's line(s) between visible and hidden. This toggle state SHALL be session-only and SHALL NOT be persisted.

#### Scenario: Hiding a line via the legend
- **WHEN** the user clicks the "Exercise" legend entry while its line is visible
- **THEN** the "Exercise" line (and its planned overlay, if shown) is hidden from the chart, and the legend entry indicates it is hidden

#### Scenario: Re-showing a hidden line
- **WHEN** the user clicks a legend entry for a currently hidden label
- **THEN** that label's line reappears on the chart

#### Scenario: Filter state does not persist across visits
- **WHEN** the user hides a label's line, then navigates away and returns to the dashboard
- **THEN** all labels are shown by default again, regardless of the prior visit's hidden state

### Requirement: Default line visibility cap
When the number of activities/labels with data in the period exceeds 6, the chart SHALL show only the top 6 by total minutes in the period by default, with the remaining labels available to add via the legend.

#### Scenario: More than six active labels in the period
- **WHEN** eight labels have logged time in the selected period
- **THEN** the six labels with the most total minutes are shown as lines by default, and the other two are listed in the legend as available-but-hidden

### Requirement: Planned-time overlay toggle
The dashboard SHALL provide a "show planned" toggle. When enabled, each visible label's line SHALL be accompanied by a second, visually distinct (dashed) line showing that label's scheduled minutes per day for the same period, sourced from the user's recurring schedule blocks.

#### Scenario: Enabling the planned overlay
- **WHEN** the user enables "show planned" while viewing labels with recurring schedule blocks
- **THEN** each visible label gains a dashed planned-minutes line alongside its solid actual-minutes line

#### Scenario: Disabling the planned overlay
- **WHEN** the user disables "show planned"
- **THEN** all dashed planned lines are removed and only actual-minutes lines remain

#### Scenario: Label has no schedule blocks
- **WHEN** "show planned" is enabled and a visible label has no recurring schedule blocks
- **THEN** that label's planned line is flat at zero rather than omitted, so its absence of scheduling is visible
