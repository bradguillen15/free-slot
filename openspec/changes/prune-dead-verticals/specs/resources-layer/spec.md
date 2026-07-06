# resources-layer Specification (delta)

## REMOVED Requirements

### Requirement: Weekly-review reads and generation go through the resources layer

**Reason**: The weekly-review feature was removed from the product in the dashboard redesign (PR #20); no UI consumes `useWeeklyReview`/`useGenerateWeeklyReviewMutation`. The entire vertical (hooks, resources methods, edge function) is deleted.
**Migration**: None for users — the feature was already unreachable. The `weekly_reviews` table is retained; drop it in a future migration if the feature is not revived.

### Requirement: Weekly-review aggregation is a pure function

**Reason**: `aggregateWeeklyReview` has no callers after the weekly-review UI removal; `src/lib/weeklyReview.ts` is deleted with the vertical.
**Migration**: Recoverable from git history if the feature returns.

## ADDED Requirements

### Requirement: Migration preserves rich log-note content

The guest→cloud migration SHALL carry `note_json` (rich-text note content) on time logs, alongside the plain `notes` string, so no note content is lost on signup.

#### Scenario: Rich note survives signup

- **WHEN** a guest time log with a non-null `note_json` is migrated
- **THEN** the inserted cloud row contains the same `note_json`
