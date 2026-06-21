## ADDED Requirements

### Requirement: Dashboard has a label filter that scopes all charts

The Dashboard SHALL provide a multi-select label filter that restricts all KPIs and charts to only the selected label IDs. When "All" is selected (the default), no filtering is applied and existing behavior is preserved.

#### Scenario: Default state shows all data

- **WHEN** the user opens the Dashboard for the first time
- **THEN** the label filter shows "All" as selected
- **AND** all KPIs and charts reflect the full unfiltered dataset

#### Scenario: Selecting a label filters charts and KPIs

- **WHEN** the user selects one or more labels in the filter
- **THEN** the per-day bar chart, category breakdown pie, plan-vs-actual bar, and KPI totals all update to include only time logs whose `category_id` matches a selected label
- **AND** the filter selection is visible (e.g. chip row with the selected label names)

#### Scenario: Deselecting all labels resets to "All"

- **WHEN** the user removes all selected labels from the filter
- **THEN** the filter reverts to "All" and shows unfiltered data

#### Scenario: Filter state is not persisted across page navigations

- **WHEN** the user navigates away from the Dashboard and returns
- **THEN** the filter resets to "All" (session-only state, no localStorage persistence needed)
