# dashboard-label-filtering Delta Specification

## ADDED Requirements

### Requirement: Three-state label filter chips
Each label chip on the dashboard SHALL cycle through three states on click: neutral → included → excluded → neutral. Included and excluded states SHALL be visually distinct (excluded rendered struck-through/dimmed with an exclusion mark). An "All" control SHALL reset every label to neutral.

#### Scenario: Cycling states
- **WHEN** the user clicks a neutral Deep work chip
- **THEN** it becomes included; a second click makes it excluded; a third returns it to neutral

### Requirement: Filter semantics
Effective labels SHALL be: all labels minus excluded ones when no label is included; the included labels minus excluded ones otherwise. Logs and scheduled blocks whose label is not effective SHALL be omitted from dashboard computations. Logs without a label SHALL be treated as effective only when no label is included.

#### Scenario: Exclude Sleep only
- **WHEN** Sleep is excluded and nothing is included
- **THEN** every dashboard card (except AI plan vs logged) computes over all labels except Sleep, on both the scheduled and logged sides

#### Scenario: Include and exclude combined
- **WHEN** Deep work and Reading are included and Reading is later excluded
- **THEN** only Deep work data is shown

### Requirement: Exclusions persist, inclusions do not
The excluded label set SHALL persist across sessions in localStorage (same pattern as dashboard card visibility). Included labels SHALL remain per-visit state and reset on reload.

#### Scenario: Sleep stays hidden
- **WHEN** the user excludes Sleep and reloads the app
- **THEN** Sleep is still excluded on the dashboard

### Requirement: AI plan card is exempt
The "AI plan vs logged" card SHALL keep its existing behavior unchanged (log-side include filtering only, plan slots unfiltered); the three-state filter and persisted exclusions SHALL NOT alter it beyond that existing behavior.

#### Scenario: Excluding a label does not change the AI card
- **WHEN** Sleep is excluded
- **THEN** the AI plan vs logged card renders exactly as before the exclusion
