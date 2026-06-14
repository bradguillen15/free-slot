## ADDED Requirements

### Requirement: Component-specific hook logic is co-located in a component folder

When a component owns substantial component-specific effect or derivation logic, that logic SHALL be
extracted into one or more `useX.ts` hook files placed in a folder named after the component, beside
an `index.tsx` that holds the component. Each co-located hook SHALL be imported only by that
component. Extraction SHALL preserve the component's existing behavior and public import path.

#### Scenario: DashboardPage logic is extracted and behavior preserved

- **WHEN** `DashboardPage` is converted to `src/pages/DashboardPage/index.tsx` with
  `useDashboardStats` and `useWeeklyReviewPrompt` co-located beside it
- **THEN** `import DashboardPage from "./pages/DashboardPage"` still resolves
- **AND** the dashboard renders the same KPIs, charts, and prompts as before
- **AND** the existing `DashboardPage.test.tsx` passes unchanged

#### Scenario: WeeklyReviewModal and PriorityRanker data effects are extracted

- **WHEN** `WeeklyReviewModal` and `PriorityRanker` move to component folders with
  `useWeeklyReviewData` and `usePriorityData` respectively
- **THEN** each hook performs the same async fetch and aggregation, returning the same shape the
  component already consumes
- **AND** the guest and cloud data paths behave exactly as before
- **AND** existing tests for these components pass unchanged

#### Scenario: CalendarPage effects are split into named hooks

- **WHEN** `CalendarPage` moves to a component folder with `useAutoScrollToHour` and
  `useAddBlockHereListener` co-located
- **THEN** auto-scroll on day change and the `add-block-here` event handling behave identically
- **AND** `import CalendarPage from "./pages/CalendarPage"` still resolves

### Requirement: Reusable hook logic lives in shared hooks, not co-located

Effect logic that is reusable across components SHALL be placed in `src/hooks/` rather than inside a
single component's folder, because a co-located hook is by definition used by exactly one component.

#### Scenario: The per-minute "now" tick becomes a shared hook

- **WHEN** the inline per-minute `setInterval` "now" tick in `CalendarPage` is extracted
- **THEN** it is placed in `src/hooks/useNowMinute.ts` as a reusable hook returning the current
  minute-of-day
- **AND** `CalendarPage` consumes it with no change to the now-indicator behavior

### Requirement: The refactor changes structure only

The extraction SHALL NOT change runtime behavior, data flow, backend calls, schema, or consumer
import paths. The existing automated test suite SHALL remain green (excluding the known pre-existing
`CalendarPage.test.tsx` "No QueryClient" failure, which is unrelated).

#### Scenario: Test suite stays green after extraction

- **WHEN** all targeted components have been refactored
- **THEN** `npm run test` shows the same pass/fail set as before the change, except for any newly
  added hook tests which also pass
- **AND** `npm run lint` reports no new errors
