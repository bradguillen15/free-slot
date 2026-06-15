## ADDED Requirements

### Requirement: Weekly priorities are owned by the resources layer

The system SHALL expose weekly-priorities reads and writes through `resources.weeklyPriorities.*` with
a `useWeeklyPriorities(weekStart)` dataStore hook, so no `supabase` import remains in `PriorityRanker`.

#### Scenario: Priority ranker reads and writes via hooks

- **WHEN** the priority ranker lists or persists ranked priorities for a week
- **THEN** it uses `useWeeklyPriorities` and its mutation backed by `resources.weeklyPriorities.*`
- **AND** no `supabase` import exists in `src/components/activities/PriorityRanker/**`

### Requirement: AI plan generation and plan delete go through the resources layer

The system SHALL expose the `generate-weekly-plan` invoke, weekly-plan delete, and accept/log-slot
writes through `resources`/`dataStore`, so `AIPlanPanel` contains presentation and composition only.

#### Scenario: Generate plan is a dataStore mutation

- **WHEN** the user generates an AI weekly plan
- **THEN** `useGenerateWeeklyPlanMutation()` invokes `resources.functions.generateWeeklyPlan`
- **AND** `AIPlanPanel` does not call `supabase.functions.invoke` directly

#### Scenario: Accepting plan slots logs time via resources

- **WHEN** the user accepts AI plan slots
- **THEN** the resulting time-log inserts go through `resources.timeLogs.*` via a dataStore mutation
- **AND** no `supabase` import exists in `src/components/week/AIPlanPanel.tsx`

#### Scenario: Deleting a plan goes through resources

- **WHEN** a weekly plan is deleted
- **THEN** `resources.weeklyPlans.delete` performs it and weekly-plan queries are invalidated
