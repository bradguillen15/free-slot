## Why

Two more feature areas still talk to Supabase directly: `AIPlanPanel.tsx` (plan/priorities/activities
reads, plan delete, log inserts, and the `generate-weekly-plan` invoke) and `PriorityRanker`
(`weekly_priorities` read/write in its hook). This is
[resources-layer-plan.md](../../../docs/resources-layer-plan.md) Phase 3 — move that I/O behind
`resources`/`dataStore` and leave the components as presentation + composition.

## What Changes

- Add `resources.weeklyPriorities.*`, `resources.weeklyPlans.delete`, and
  `resources.functions.generateWeeklyPlan(...)`.
- Add `useWeeklyPriorities(weekStart)`, `useGenerateWeeklyPlanMutation()`, and a plan-slot accept/log
  mutation hook (e.g. `useAcceptPlanSlotsMutation()`) to `dataStore`.
- Refactor `AIPlanPanel.tsx` to hooks + presentation (no direct `supabase`).
- Refactor `PriorityRanker` to `useWeeklyPriorities` + mutation (no direct `supabase`).
- **Exit:** `AIPlanPanel` and `PriorityRanker/**` have no `supabase` import (override removal is Phase 5).

## Capabilities

### Modified Capabilities
- `resources-layer`: Extend the boundary to own weekly-priorities CRUD, weekly-plan delete, and the
  `generate-weekly-plan` edge-function invoke, with `dataStore` hooks, so the AI plan panel and
  priority ranker contain presentation and composition only.

### New Capabilities
<!-- None — extends resources-layer. -->

## Impact

- New: `src/resources/weekly-priorities.ts`, `resources/functions/generate-weekly-plan.ts`,
  `resources.weeklyPlans.delete` + provider impls.
- `src/lib/dataStore.ts` — `useWeeklyPriorities`, `useGenerateWeeklyPlanMutation`,
  `useAcceptPlanSlotsMutation` (log inserts via existing `resources.timeLogs.*`).
- `src/components/week/AIPlanPanel.tsx` — hooks + presentation.
- `src/components/activities/PriorityRanker/usePriorityData.ts` + `index.tsx` — `useWeeklyPriorities` + mutation.
- Tests: resource/provider tests, `dataStore` hook tests, component tests assert presentation/composition.
- No DB migration; edge-function server code unchanged.
