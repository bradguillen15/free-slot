## ADDED Requirements

### Requirement: Recurring note block carries forward daily

The Notes section SHALL include a collapsible "Recurring note" block whose content is pre-populated from the most recent previous day that has a recurring note. This allows users to maintain standing intentions (e.g. "focus on deep work", "drink more water") without retyping them each day.

#### Scenario: Recurring note is pre-populated from the previous day

- **WHEN** the user opens the Notes tab for a date that has no recurring note yet
- **AND** a previous date has a saved recurring note
- **THEN** the recurring note block shows the previous day's content as an editable starting point
- **AND** editing it saves a new recurring note entry for the current date only (does not modify the previous day)

#### Scenario: Recurring note starts empty on first use

- **WHEN** the user opens the Notes tab and no previous recurring note exists in storage
- **THEN** the recurring note block is empty and shows placeholder text

#### Scenario: Collapsed state is remembered across sessions

- **WHEN** the user collapses (or expands) the recurring note block
- **THEN** that collapsed/expanded state is saved to localStorage
- **AND** returning to the Day view (even after a page reload) restores the same collapsed state

#### Scenario: Recurring note is editable independently from the daily note

- **WHEN** the user edits the recurring note on a given date
- **THEN** only that date's recurring note is changed
- **AND** the daily free-text note for that date is unaffected
