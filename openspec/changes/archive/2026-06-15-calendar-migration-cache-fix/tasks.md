# Tasks — calendar-migration-cache-fix

> Frontend-only change. Backend/curl/RLS mandatory steps are **N/A** (no endpoints or tables).
> This flow is inherently the guest→cloud transition, so guest-mode parity is N/A; the
> account-gated cloud path is the subject under test.

## 0. Setup: Create Feature Branch (MANDATORY - FIRST STEP)

- [x] 0.1 Create feature branch `feature/calendar-migration-cache-fix` from `main`
- [x] 0.2 Verify branch creation and current branch status

## 1. Tests First (TDD) — write failing tests

- [x] 1.1 Extend `src/lib/migrateGuest.test.ts` is **not** the invalidation seam (migrateGuest stays
      pure); instead add a test at the `Auth` boundary. Create/extend `src/pages/Auth.test.tsx`:
      assert that on successful `migrateGuestToCloud`, the query client's `invalidateQueries` is
      called with `{ queryKey: queryKeys.root }` **before** `navigate("/app")`.
- [x] 1.2 Add a test asserting invalidation is **not** called when `migrateGuestToCloud` rejects, and
      that the error toast path is preserved.
- [x] 1.3 Add a test asserting the Import control stays disabled/migrating until invalidation +
      refetch settle, then navigates.
- [x] 1.4 Run the new tests and confirm they fail for the right reason (red).

## 2. Implementation

- [x] 2.1 In `src/pages/Auth.tsx::importNow`, obtain the shared client via `getQueryClient()` (consistent
      with the existing dataStore refresh helpers) and, after a successful `migrateGuestToCloud`,
      `await getQueryClient().invalidateQueries({ queryKey: queryKeys.root })` before
      `navigate("/app", { replace: true })`. Also gate the redirect effect on `!migrating`.
- [x] 2.2 Ensure the `migrating` loading state remains set until invalidation completes (move/keep the
      state reset in `finally`, navigate only after await).
- [x] 2.3 Leave the failure/`catch` path unchanged (no invalidation on error).
- [x] 2.4 Confirm the tests from Section 1 now pass (green).

## 3. Review and Update Existing Unit Tests (MANDATORY)

- [x] 3.1 Review `src/lib/migrateGuest.test.ts` and any `Auth`-related tests for regressions
- [x] 3.2 Update mocks (query client, `useNavigate`) as needed for the new ordering

## 4. Run Unit Tests and Verify State (MANDATORY)

- [x] 4.1 Run targeted tests: `bun run test src/pages/Auth.test.tsx src/lib/migrateGuest.test.ts`
- [x] 4.2 Run the full suite: `bun run test`
- [x] 4.3 No DB mutation occurs in unit tests (mocked); capture pass/fail counts
- [x] 4.4 Create report `specs/calendar-migration-cache-fix/reports/YYYY-MM-DD-step-unit-test-verification.md`
      (commands, results, notes). DB pre/post N/A (mocked) — state so explicitly.
- [x] 4.5 Mark complete only after tests pass and report exists

## 5. Manual Endpoint Testing with curl (MANDATORY for backend) — N/A

- [x] 5.1 N/A — no backend endpoints added or changed in this change.

## 6. E2E Testing (MANDATORY if applicable - AGENT MUST EXECUTE)

- [x] 6.1 Add/extend a cloud-lane e2e (`e2e/cloud/migration.cloud.e2e.ts`): seed guest data, sign up,
      click "Import", assert the Day/Week view shows the migrated logs **without** a manual reload
- [x] 6.2 Run the cloud e2e against local Supabase; verify pass
- [x] 6.3 Restore/clean test data after the run
- [x] 6.4 Document scenario + outcome in the change's `reports/` folder

## 7. Update Technical Documentation (MANDATORY)

- [x] 7.1 Note the post-migration cache-refresh behavior in `docs/ARCHITECTURE.md` (migration/data-flow
      section) if not already covered
- [x] 7.2 Update `docs/calendar-ux-improvements-plan.md` Phase 1 status if tracked there

## 8. Quality Gates

- [x] 8.1 `bun run lint` clean
- [x] 8.2 `bun run typecheck` (or `tsc --noEmit`) clean
- [x] 8.3 Self-review the diff; ensure no `supabase.from` added to `Auth.tsx`
