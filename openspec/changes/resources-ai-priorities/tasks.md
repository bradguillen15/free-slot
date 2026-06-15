# Tasks — resources-ai-priorities

> Account-gated features (AI planner, priorities). curl/RLS **N/A** (no new tables; edge function
> unchanged). Depends on `resources-mutations-migration`. ESLint override removal deferred to Phase 5.

## 0. Setup: Create Feature Branch (MANDATORY - FIRST STEP)

- [ ] 0.1 Create feature branch `feature/resources-ai-priorities` from `main`
- [ ] 0.2 Verify branch creation and current branch status

## 1. Tests First (TDD)

- [ ] 1.1 `resources.weeklyPriorities.*` + provider mapping tests (mock supabase). (red)
- [ ] 1.2 `resources.weeklyPlans.delete` + `resources.functions.generateWeeklyPlan` tests. (red)
- [ ] 1.3 `dataStore` tests: `useWeeklyPriorities`, `useGenerateWeeklyPlanMutation`,
      `useAcceptPlanSlotsMutation` (log inserts via resources). (red)

## 2. Implementation — resources + dataStore

- [ ] 2.1 Add `src/resources/weekly-priorities.ts`, `resources/functions/generate-weekly-plan.ts`,
      `resources.weeklyPlans.delete` + provider impls
- [ ] 2.2 Add the three dataStore hooks (priorities query + generate/accept mutations)

## 3. Implementation — components

- [ ] 3.1 Refactor `AIPlanPanel.tsx` to hooks + presentation (remove all `supabase` usage)
- [ ] 3.2 Refactor `PriorityRanker/usePriorityData.ts` + `index.tsx` to `useWeeklyPriorities` + mutation
- [ ] 3.3 Make Section 1 tests pass (green)

## 4. Review and Update Existing Unit Tests (MANDATORY)

- [ ] 4.1 Update AIPlanPanel / PriorityRanker tests to the new hooks/mock provider

## 5. Run Unit Tests and Verify State (MANDATORY)

- [ ] 5.1 Targeted: `bun run test src/resources src/lib/dataStore src/components/week/AIPlanPanel src/components/activities/PriorityRanker`
- [ ] 5.2 Full suite: `bun run test`
- [ ] 5.3 DB state N/A (mocked); state so in the report
- [ ] 5.4 Create report `specs/resources-ai-priorities/reports/YYYY-MM-DD-step-unit-test-verification.md`
- [ ] 5.5 Mark complete only after tests pass and report exists

## 6. Manual Endpoint Testing with curl (MANDATORY for backend) — N/A

- [ ] 6.1 N/A — edge function unchanged; no new endpoints.

## 7. E2E / Manual Verification (MANDATORY if applicable - AGENT MUST EXECUTE)

- [ ] 7.1 Cloud e2e: generate a weekly plan, accept slots (logs created), rank priorities — behavior unchanged
- [ ] 7.2 Document outcomes in the change's `reports/` folder

## 8. Update Technical Documentation (MANDATORY)

- [ ] 8.1 Update `src/resources/README.md` (priorities, plan delete, generate-weekly-plan)
- [ ] 8.2 Update `docs/resources-layer-plan.md` Phase 3 status

## 9. Quality Gates

- [ ] 9.1 `bun run lint` clean
- [ ] 9.2 `bun run typecheck` clean
- [ ] 9.3 `rg "supabase" src/components/week/AIPlanPanel.tsx src/components/activities/PriorityRanker` returns nothing
