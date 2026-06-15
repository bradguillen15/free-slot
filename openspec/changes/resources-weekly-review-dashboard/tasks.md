# Tasks — resources-weekly-review-dashboard

> Account-gated feature (weekly review / dashboard). curl/RLS steps **N/A** (no new tables; edge
> function unchanged). Depends on `resources-mutations-migration`. ESLint override removal is deferred
> to the Phase 5 enforcement change.

## 0. Setup: Create Feature Branch (MANDATORY - FIRST STEP)

- [ ] 0.1 Create feature branch `feature/resources-weekly-review-dashboard` from `main`
- [ ] 0.2 Verify branch creation and current branch status

## 1. Tests First (TDD)

- [ ] 1.1 `resources.weeklyReviews.getForWeek` + provider mapping test (mock supabase). (red)
- [ ] 1.2 `resources.functions.weeklyReview.generate` test (mock `functions.invoke`). (red)
- [ ] 1.3 `dataStore` tests: `useWeeklyReview` reads via resources; `useGenerateWeeklyReviewMutation`
      invokes the function resource. (red)
- [ ] 1.4 `aggregateWeeklyReview` unit tests (planned vs actual, ratio, totals, merged) from fixtures. (red)

## 2. Implementation — resources + dataStore

- [ ] 2.1 Add `src/resources/weekly-reviews.ts` + `src/resources/functions/weekly-review.ts` + provider impls
- [ ] 2.2 Add `useWeeklyReview(weekStart)` and `useGenerateWeeklyReviewMutation()` to `dataStore`

## 3. Implementation — feature hooks

- [ ] 3.1 Extract `aggregateWeeklyReview` to `src/lib/weeklyReview.ts`
- [ ] 3.2 Refactor `useWeeklyReviewData` to compose dataStore hooks + `aggregateWeeklyReview` (no I/O)
- [ ] 3.3 Refactor `useWeeklyReviewPrompt` onto `useProfile` + review-existence hook (no `useEffect` fetch,
      remove the `eslint-disable` + supabase import)
- [ ] 3.4 Make Section 1 tests pass (green)

## 4. Review and Update Existing Unit Tests (MANDATORY)

- [ ] 4.1 Update WeeklyReviewModal / DashboardPage tests to the new hooks/mock provider

## 5. Run Unit Tests and Verify State (MANDATORY)

- [ ] 5.1 Targeted: `bun run test src/resources src/lib/dataStore src/lib/weeklyReview src/components/dashboard src/pages/DashboardPage`
- [ ] 5.2 Full suite: `bun run test`
- [ ] 5.3 DB state N/A (mocked); state so in the report
- [ ] 5.4 Create report `specs/resources-weekly-review-dashboard/reports/YYYY-MM-DD-step-unit-test-verification.md`
- [ ] 5.5 Mark complete only after tests pass and report exists

## 6. Manual Endpoint Testing with curl (MANDATORY for backend) — N/A

- [ ] 6.1 N/A — edge function unchanged; no new endpoints.

## 7. E2E / Manual Verification (MANDATORY if applicable - AGENT MUST EXECUTE)

- [ ] 7.1 Cloud e2e: open the weekly review, generate, and verify the dashboard prompt behavior unchanged
- [ ] 7.2 Document outcomes in the change's `reports/` folder

## 8. Update Technical Documentation (MANDATORY)

- [ ] 8.1 Update `src/resources/README.md` (weekly reviews + functions)
- [ ] 8.2 Update `docs/resources-layer-plan.md` Phase 2 status

## 9. Quality Gates

- [ ] 9.1 `bun run lint` clean
- [ ] 9.2 `bun run typecheck` clean
- [ ] 9.3 `rg "supabase" src/components/dashboard/WeeklyReviewModal src/pages/DashboardPage/useWeeklyReviewPrompt.ts` returns nothing
