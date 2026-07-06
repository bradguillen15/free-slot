## ADDED Requirements

### Requirement: Dashboard agenda card shows plan vs actual per day

The Dashboard SHALL provide an agenda view card that lists each day of the selected week with its planned schedule blocks alongside its actual time logs, allowing users to see at a glance where the week matched or diverged from the plan.

#### Scenario: Agenda card renders a row per day

- **WHEN** the Dashboard renders with logged or planned data for the week
- **THEN** the agenda card shows one collapsible row per day of the week (Mon–Sun or Mon–Fri depending on weekend setting)
- **AND** each row shows the date label plus planned blocks and actual logs for that day

#### Scenario: Days with no data show an empty state

- **WHEN** a day in the week has neither schedule blocks nor time logs
- **THEN** its row shows a compact "no data" indicator rather than being hidden

#### Scenario: Agenda card respects the label filter

- **WHEN** the user has selected specific labels in the dashboard filter
- **THEN** the agenda card shows only blocks and logs whose category matches the selected labels

#### Scenario: Agenda card is collapsible per day row

- **WHEN** the user clicks a day row header in the agenda card
- **THEN** that day's detail (individual blocks and logs) collapses or expands
- **AND** the collapsed state is a UI-only interaction (not persisted)
