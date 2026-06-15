# Tasks — resources-layer-scaffold

> Frontend/data-access refactor. No backend endpoints or tables added → curl/RLS mandatory steps are
> **N/A**. Read behavior must be identical in **both guest and cloud** modes (parity verified).

## 0. Setup: Create Feature Branch (MANDATORY - FIRST STEP)

- [ ] 0.1 Create feature branch `feature/resources-layer-scaffold` from `main`
- [ ] 0.2 Verify branch creation and current branch status

## 1. Scaffold structure

- [ ] 1.1 Create `src/resources/` tree: `index.ts`, `types/` (category, activity, schedule-block,
      time-log, profile, weekly-plan), per-entity modules, `functions/` (empty placeholder),
      `_providers/{types.ts,supabase/{client.ts,mappers.ts,index.ts}}`.
- [ ] 1.2 Define `ResourcesProvider` interface in `_providers/types.ts` covering the six reads
      (categories.list, activities.list, scheduleBlocks.list, timeLogs.listInRange, profiles.get,
      weeklyPlans.getForWeek).
- [ ] 1.3 `types/*`: alias DTOs to `localStore` shapes (D3), e.g. `export type Category = LocalCategory`.
- [ ] 1.4 Add `src/resources/README.md` with the import rules and layer diagram.

## 2. Tests First (TDD)

- [ ] 2.1 `_providers/supabase` mapping tests (mock supabase via `src/test/supabaseMock.ts`): each read
      maps rows → DTO with correct table/columns/filter. (red)
- [ ] 2.2 Resource contract tests via `createMockResourcesProvider()`: each module delegates to the
      provider and returns DTOs. (red)
- [ ] 2.3 Update `dataStore` read-hook tests: cloud mode calls `resources.*`; guest mode calls
      `localStore`; same data returned. (red)

## 3. Implementation

- [ ] 3.1 Implement `createSupabaseProvider()` and per-module factories; move the cloud bodies from
      `dataFetchers.ts` into the provider/mappers (cloud-only, no `mode`).
- [ ] 3.2 Add `createMockResourcesProvider()` in `src/test/`.
- [ ] 3.3 Update the six `dataStore` read hooks to branch `mode === "guest" ? localStore : resources.*`.
- [ ] 3.4 **Delete** `src/lib/dataFetchers.ts`; fix all imports.
- [ ] 3.5 Make Section 2 tests pass (green).

## 4. Review and Update Existing Unit Tests (MANDATORY)

- [ ] 4.1 Update any tests importing `dataFetchers` to use `resources` / mock provider
- [ ] 4.2 Ensure guest/cloud parity matrix in `dataStore.test.ts` still holds

## 5. Run Unit Tests and Verify State (MANDATORY)

- [ ] 5.1 Targeted: `bun run test src/resources src/lib/dataStore`
- [ ] 5.2 Full suite: `bun run test`
- [ ] 5.3 DB state N/A in unit tests (mocked); state so in the report
- [ ] 5.4 Create report `specs/resources-layer-scaffold/reports/YYYY-MM-DD-step-unit-test-verification.md`
- [ ] 5.5 Mark complete only after tests pass and report exists

## 6. Manual Endpoint Testing with curl (MANDATORY for backend) — N/A

- [ ] 6.1 N/A — no backend endpoints.

## 7. E2E / Manual Verification (MANDATORY if applicable - AGENT MUST EXECUTE)

- [ ] 7.1 Run the guest e2e lane — read flows (categories/activities/blocks/logs) unchanged
- [ ] 7.2 Run the cloud e2e lane against local Supabase — read flows unchanged
- [ ] 7.3 Document outcomes in the change's `reports/` folder

## 8. Update Technical Documentation (MANDATORY)

- [ ] 8.1 `src/resources/README.md` complete (import rules, "adding a new entity" checklist)
- [ ] 8.2 Note in `docs/frontend-standards.md` (Data Access) that cloud reads now live in `resources`
      (full doc sweep is the later Resources Phase 5 change — add a forward pointer only)
- [ ] 8.3 Update `docs/resources-layer-plan.md` Phase 0 status

## 9. Quality Gates

- [ ] 9.1 `bun run lint` clean
- [ ] 9.2 `bun run typecheck` clean
- [ ] 9.3 `rg "from \"@/integrations/supabase/client\"" src` shows only `_providers/supabase` (+ auth/test)
- [ ] 9.4 `rg "dataFetchers" src` returns nothing
