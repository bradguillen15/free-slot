## Context

`AIPlanPanel.tsx` (`src/components/week/`) makes 6+ direct Supabase calls — reads of plan/priorities/
activities, a plan delete, log inserts when accepting slots, and the `generate-weekly-plan`
edge-function invoke. `PriorityRanker` (`src/components/activities/PriorityRanker/`) reads/writes
`weekly_priorities` in its `usePriorityData` hook. Both are on the ESLint override list. The resources
boundary and weekly-review phase are in place; this phase moves the AI/priorities I/O onto it.

## Goals / Non-Goals

**Goals:**
- `resources.weeklyPriorities.*`, `resources.weeklyPlans.delete`, `resources.functions.generateWeeklyPlan`.
- `useWeeklyPriorities`, `useGenerateWeeklyPlanMutation`, `useAcceptPlanSlotsMutation` in `dataStore`.
- `AIPlanPanel` and `PriorityRanker` free of `supabase`.

**Non-Goals:**
- Onboarding/settings/migrate (Phase 4); ESLint enforcement sweep (Phase 5).
- Changing the `generate-weekly-plan` server code or the planning algorithm.

## Decisions

- **Accept-slots reuses `resources.timeLogs.*`.** The "accept plan slots" action creates time logs; it
  composes the existing time-log resource via a dataStore mutation rather than a bespoke insert path.
- **`generateWeeklyPlan` under `resources/functions/`** (plan D4), wrapping `functions.invoke` in
  `_providers/supabase`.
- **`useWeeklyPriorities` mirrors existing read hooks**; the ranker's persistence becomes a mutation
  hook. Guest parity: weekly priorities are account-only per the plan's non-goals (no guest mirror
  required) — gate with `enabled: !!user` and keep the ranker's account-only behavior.
- **AIPlanPanel becomes presentation + composition**: it calls the hooks, renders state, and wires
  user actions to mutations; no `useEffect` fetches.

## Risks / Trade-offs

- [AIPlanPanel has the most call sites] → Migrate read-by-read with hook tests; keep the component's
  existing loading/empty/error states.
- [Accept-slots ordering/invalidation] → The mutation invalidates time-log + plan queries so the panel
  and calendar reflect accepted slots immediately; covered by a hook test.

## Migration Plan

Frontend/data-access refactor; ships with code. No DB/edge change. Verify with Vitest + the AI plan and
priorities cloud flows. Rollback = revert.

## Open Questions

None.
