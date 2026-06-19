## ADDED Requirements

### Requirement: Weekly-review reads and generation go through the resources layer

The system SHALL expose weekly-review reads and the `weekly-review` edge-function invoke through
`resources` (with `dataStore` hooks), so no `supabase` import remains in the dashboard weekly-review
feature hooks.

#### Scenario: Weekly review is read via a dataStore hook

- **WHEN** the weekly-review modal needs the saved review for a week
- **THEN** it uses `useWeeklyReview(weekStart)` backed by `resources.weeklyReviews.getForWeek`
- **AND** no `supabase` import exists in `WeeklyReviewModal/**`

#### Scenario: Review generation is a dataStore mutation

- **WHEN** the user triggers "generate" for a weekly review
- **THEN** `useGenerateWeeklyReviewMutation()` invokes `resources.functions.weeklyReview.generate`
- **AND** the feature hook does not call `supabase.functions.invoke` directly

#### Scenario: Dashboard prompt reads via hooks

- **WHEN** the dashboard decides whether to prompt for a weekly review
- **THEN** it uses `useProfile` and a review-existence hook (no `useEffect` Supabase fetch)
- **AND** no `supabase` import exists in `DashboardPage/useWeeklyReviewPrompt.ts`

### Requirement: Weekly-review aggregation is a pure function

The system SHALL compute planned-vs-actual weekly-review data in a pure function
(`aggregateWeeklyReview`) that takes logs, categories, plan, and saved review and returns the derived
arrays/ratios, so the feature hook holds derivation and UI state only.

#### Scenario: Aggregation is unit-testable without a DB

- **WHEN** `aggregateWeeklyReview` runs on fixture logs/categories/plan
- **THEN** it returns the planned/actual/ratio/total/merged values deterministically with no I/O
