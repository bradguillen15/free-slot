## Why

After the resources scaffold and mutations migration, two dashboard-area files still call Supabase
directly: `WeeklyReviewModal/useWeeklyReviewData.ts` (4-table read + `weekly-review` edge-function
invoke) and `DashboardPage/useWeeklyReviewPrompt.ts` (profile `weekly_review_day` + review-existence
check in a `useEffect`). This is [resources-layer-plan.md](../../../docs/resources-layer-plan.md)
Phase 2 — move that I/O behind `resources`/`dataStore` so the feature hooks become aggregation-only.

## What Changes

- Add `resources.weeklyReviews.getForWeek({ userId, weekStart })` and
  `resources.functions.weeklyReview.generate(...)` (the edge-function invoke).
- Add `useWeeklyReview(weekStart)` and `useGenerateWeeklyReviewMutation()` to `dataStore`.
- Refactor `useWeeklyReviewData` to compose `useTimeLogsInRange` + `useCategories` + `useWeeklyPlan` +
  `useWeeklyReview` and aggregate (planned/actual via a pure `aggregateWeeklyReview`) — **no I/O**.
- Refactor `useWeeklyReviewPrompt` onto `useProfile` + a `useWeeklyReviewExists`/`useWeeklyReview`
  hook — no `useEffect` fetch, no `supabase`.
- **Exit:** `WeeklyReviewModal/**` and `DashboardPage/useWeeklyReviewPrompt.ts` have no `supabase`
  import; their ESLint override entries can be removed (removal itself is the Phase 5 change).

## Capabilities

### Modified Capabilities
- `resources-layer`: Extend the boundary to own weekly-review reads and the `weekly-review`
  edge-function invoke, with `dataStore` hooks exposing them, so the dashboard feature hooks contain
  derivation and UI state only.

### New Capabilities
<!-- None — extends resources-layer; the I/O-free-hook structure already exists via component-hook-colocation. -->

## Impact

- New: `src/resources/weekly-reviews.ts`, `src/resources/functions/weekly-review.ts` + provider impls.
- `src/lib/dataStore.ts` — `useWeeklyReview`, `useGenerateWeeklyReviewMutation`.
- `src/components/dashboard/WeeklyReviewModal/useWeeklyReviewData.ts` — aggregation only; new pure
  `aggregateWeeklyReview` (e.g. `src/lib/weeklyReview.ts`).
- `src/pages/DashboardPage/useWeeklyReviewPrompt.ts` — `useProfile` + review-existence hook.
- Tests: resource/provider tests (mock supabase + edge invoke), `dataStore` hook tests,
  `aggregateWeeklyReview` unit tests (planned vs actual), feature-hook tests assert aggregation only.
- No DB migration; edge-function server code unchanged.
