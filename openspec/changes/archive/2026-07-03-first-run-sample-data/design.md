## Context

New users currently land on a blocking `/onboarding` wizard (`OnboardingGate` redirects to it whenever both `onboarding_completed` and `onboarding_skipped` are false) that asks them to build a full weekly schedule and activity list before they've seen any value. User testing showed this reads as "no entendí qué hace el app" — the demo/value moment never happens.

Guest bootstrap already exists (`ensureBootstrap()` in `src/lib/localStore.ts`) and currently seeds only default categories, leaving `schedule_blocks` and `activities` empty. Cloud signups get default categories via the `handle_new_user()` Postgres trigger (`supabase/migrations/20260610121000_add_default_categories.sql`), which has already drifted out of sync with the TS-side `DEFAULT_CATEGORY_SEED` (different category sets/types) — a cautionary precedent for duplicating seed logic across SQL and TypeScript.

## Goals / Non-Goals

**Goals:**
- New users (guest and cloud) see a populated Day view with a template schedule and a couple of sample logs on first load, with free windows visible immediately.
- Sample content is real, editable data — not a decorative overlay — and is clearly marked as an example until edited or cleared.
- `/onboarding` remains reachable but is no longer a mandatory gate.
- Untouched sample data never leaks into a cloud account via guest migration.

**Non-Goals:**
- Redesigning the wizard's internal steps (schedule/activities/preferences) — it still exists, just reachable on-demand.
- Per-item undo/restore of cleared examples (clearing is a simple bulk delete with a confirm step, consistent with existing destructive-action patterns).
- Personalizing sample content (e.g. by locale-specific routines) — a single fixed template is enough to prove the concept.

## Decisions

**1. One shared seed definition, seeded client-side for both guest and cloud — not duplicated in SQL.**
The `handle_new_user()` trigger already drifted from `DEFAULT_CATEGORY_SEED` (different categories/types), showing that mirroring seed data in SQL and TypeScript silently rots. Sample schedule blocks and time logs are defined once, in TypeScript (`src/lib/sampleData.ts`), and applied by both paths:
- Guest: `ensureBootstrap()` writes the seed rows directly (same one-time-bootstrap gate it already uses).
- Cloud: a new `sample_data_seeded` boolean on `profiles` (same pattern as `onboarding_skipped`, migration `ALTER TABLE profiles ADD COLUMN sample_data_seeded BOOLEAN NOT NULL DEFAULT false`) gates a one-time client-side seed call triggered from the first authenticated load (in the existing profile-loading path, alongside where `ensureBootstrap()` is called for guests today).
Alternative considered: seeding cloud accounts inside `handle_new_user()` (SQL). Rejected — would require a second, SQL-only copy of the sample template, doubling the maintenance surface that already caused drift, and INSERT-returning-id chaining inside a trigger for schedule_blocks → time_logs (which needs category ids from the same trigger) adds meaningful SQL complexity for no real benefit over a one-time client call.

**2. Marking: `is_example BOOLEAN NOT NULL DEFAULT false` on `schedule_blocks` and `time_logs`.**
Added to both tables (migration + guest `LocalScheduleBlock`/`LocalTimeLog` types). Any *edit* path for these rows (schedule block dialog save, time log quick-log/edit, drag-reschedule) sets `is_example = false` as part of the same update — centralized in the existing single update functions (`upsertScheduleBlock`, `updateTimeLog`, both guest and cloud) so no individual call site can forget it. Alternative considered: a separate `example_items` tracking table — rejected, adds a join for every read path (Day/Week/Month all query schedule_blocks/time_logs directly) for no benefit over one boolean column.

**3. "Clear examples" is a single bulk action, confirm-gated.**
A dataStore mutation `clearExampleData()` deletes all rows where `is_example = true` for the current user (guest: filter-and-rewrite; cloud: `DELETE ... WHERE user_id = ? AND is_example = true`). Surfaced as a dismissible banner shown only while example rows exist ("This is sample data — [Clear examples]"), following the existing confirm-dialog pattern used for schedule block deletion. Editing even one example row removes it from what the banner would clear (since it's no longer marked), so partial cleanup happens naturally through normal use.

**4. `OnboardingGate` stops forcing `/onboarding`.**
Per the `onboarding-flow` delta spec: the gate no longer redirects when both flags are false. `/onboarding` remains a normal route, linked from empty states (e.g. "Customize your schedule" from the sample banner or from Schedule/Activities pages) and still writes `onboarding_completed`/`onboarding_skipped` when used. New users go straight to `/app` with sample data already in place, satisfying the same "user has something to look at, not a blank state" goal the wizard was gating for.

**5. Migration excludes untouched examples, includes edited ones.**
`migrateGuestToCloud` (`src/lib/migrateGuest.ts`) filters `snap.schedule_blocks`/`snap.time_logs` to `!is_example` before building insert rows (steps 3 and 4 in that file). An edited example has `is_example: false` by decision 2, so it migrates through the existing dedup logic unchanged — no new code path, just an added filter predicate.

## Risks / Trade-offs

- **[Risk]** A cloud user who signs up, gets sample data seeded, then never returns before a later `handle_new_user()` change could see inconsistent behavior across accounts created before/after this change ships. → **Mitigation**: `sample_data_seeded` defaults to `false` for all existing rows via the migration; existing accounts are simply never seeded retroactively (they already have real data or completed onboarding), avoiding any backfill risk.
- **[Risk]** Forgetting to clear `is_example` on some future new edit path would leave a "real" edit still marked as an example (and thus deletable by "Clear examples" or excluded from migration). → **Mitigation**: the flag is cleared inside the shared `upsertScheduleBlock`/`updateTimeLog` functions rather than per-UI-call-site, so any new caller of those functions gets the behavior for free.
- **[Trade-off]** Sample data participates in dashboard aggregates like real data (by design — that's the point, it must look real to demonstrate the feature). Once cleared, dashboard numbers change; this is expected and matches "example data" framing in the banner copy.

## Migration Plan

1. Add `is_example` columns (schedule_blocks, time_logs) and `sample_data_seeded` (profiles) via Supabase migrations — all `NOT NULL DEFAULT false`, so existing rows/accounts are unaffected.
2. Ship `src/lib/sampleData.ts` (shared template) and update `ensureBootstrap()` + the new cloud one-time-seed call together with the schema change (client and DB migrate together; the column must exist before the client writes to it — apply the migration first in deploy order).
3. `OnboardingGate` and `migrateGuest.ts` changes ship in the same change/commit since they depend on the same `is_example` field.
4. No rollback complexity: disabling the feature is reverting the client seeding call; the extra columns are harmless if unused.

## Open Questions

None outstanding — sample-data behavior (real, marked, clearable) was confirmed with the user before drafting.
