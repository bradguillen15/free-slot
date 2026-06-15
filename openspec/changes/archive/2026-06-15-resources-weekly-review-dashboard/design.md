## Context

`useWeeklyReviewData.ts` (under `src/components/dashboard/WeeklyReviewModal/`) does a 4-table
`Promise.all` read plus a `weekly-review` edge-function invoke and then aggregates planned-vs-actual.
`useWeeklyReviewPrompt.ts` (under `src/pages/DashboardPage/`) reads `profiles.weekly_review_day` and a
`weekly_reviews` existence row in a `useEffect`. Both still import `@/integrations/supabase/client`
(currently allowed via an ESLint override). The resources scaffold/mutations changes established the
boundary; this moves the weekly-review reads + function invoke onto it and reduces the hooks to
aggregation/derivation, per the plan's §5/§13 end-state example.

## Goals / Non-Goals

**Goals:**
- `resources.weeklyReviews.getForWeek` + `resources.functions.weeklyReview.generate`.
- `useWeeklyReview` + `useGenerateWeeklyReviewMutation` in `dataStore`.
- `useWeeklyReviewData` and `useWeeklyReviewPrompt` become I/O-free (no `supabase`, no fetch `useEffect`).
- A pure `aggregateWeeklyReview` with unit tests.

**Non-Goals:**
- AI plan panel / priorities (Phase 3), onboarding/settings/migrate (Phase 4).
- Removing the ESLint override entries (Phase 5 does the global enforcement sweep).
- Changing the edge-function server code.

## Decisions

- **`functions/` for the edge invoke** (plan D4). `resources.functions.weeklyReview.generate` wraps
  `supabase.functions.invoke("weekly-review", …)` inside `_providers/supabase`.
- **`useWeeklyReview` mirrors other read hooks** (`enabled: !!user`, `queryKeys.weeklyReview`). The key
  already exists in `queryKeys`.
- **Aggregation extracted to `src/lib/weeklyReview.ts`** as `aggregateWeeklyReview({ logs, categories,
  plan, saved })`. Pure, fixture-tested; the hook just calls it in a memo.
- **Prompt uses `useProfile` + a lightweight `useWeeklyReviewExists`** (or reuse `useWeeklyReview` and
  check presence) instead of a `useEffect` fetch, removing the `eslint-disable` and the singleton-import
  rationale comment.

## Risks / Trade-offs

- [Behavior drift in planned/actual math] → `aggregateWeeklyReview` unit tests pin current outputs from
  fixtures captured before the refactor.
- [Generate mutation error/loading states] → Mirror existing modal states; assert via hook tests.

## Migration Plan

Frontend/data-access refactor; ships with code. No DB/edge change. Verify with Vitest + the dashboard
guest/cloud flows. Rollback = revert.

## Open Questions

None.
