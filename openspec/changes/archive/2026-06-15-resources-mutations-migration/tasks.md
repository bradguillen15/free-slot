# Tasks — resources-mutations-migration

> Data-access refactor. No backend endpoints/tables added → curl/RLS steps **N/A**. Mutation behavior
> must be identical in **both guest and cloud** modes. Depends on `resources-layer-scaffold`.

## 0. Setup: Create Feature Branch (MANDATORY - FIRST STEP)

- [ ] 0.1 Create feature branch `feature/resources-mutations-migration` from `main`
- [ ] 0.2 Verify branch creation and current branch status

## 1. Tests First (TDD)

- [ ] 1.1 Provider write-mapping tests (mock supabase): insert/update/delete/upsert/reorder for time
      logs, activities, schedule blocks, categories, profile map to correct table/columns. (red)
- [ ] 1.2 `dataStore.test.ts`: each mutation calls `resources.*` (mock provider) in cloud mode and
      `localStore` in guest mode, and fires the matching `invalidate*` afterward. (red)

## 2. Implementation — resources write ops

- [ ] 2.1 Extend `ResourcesProvider` (`_providers/types.ts`) with write operations per entity
- [ ] 2.2 Implement them in `_providers/supabase/*` + input mappers in `mappers.ts`
- [ ] 2.3 Add public methods to `resources/{time-logs,activities,schedule-blocks,categories,profiles}.ts`

## 3. Implementation — dataStore

- [ ] 3.1 Replace inline `supabase.from(...)` in the 11 mutations with `resources.*` (cloud branch),
      keeping guest `localStore` branch and `invalidate*` calls
- [ ] 3.2 Remove the `@/integrations/supabase/client` import from `dataStore.ts`
- [ ] 3.3 Make Section 1 tests pass (green)

## 4. Review and Update Existing Unit Tests (MANDATORY)

- [ ] 4.1 Update mutation-related tests to the mock provider; keep guest/cloud parity matrix green

## 5. Run Unit Tests and Verify State (MANDATORY)

- [ ] 5.1 Targeted: `bun run test src/resources src/lib/dataStore`
- [ ] 5.2 Full suite: `bun run test`
- [ ] 5.3 DB state N/A in unit tests (mocked); state so in the report
- [ ] 5.4 Create report `specs/resources-mutations-migration/reports/YYYY-MM-DD-step-unit-test-verification.md`
- [ ] 5.5 Mark complete only after tests pass and report exists

## 6. Manual Endpoint Testing with curl (MANDATORY for backend) — N/A

- [ ] 6.1 N/A — no backend endpoints.

## 7. E2E / Manual Verification (MANDATORY if applicable - AGENT MUST EXECUTE)

- [ ] 7.1 Guest e2e: create/edit/delete a log, activity, block, category — persists correctly
- [ ] 7.2 Cloud e2e against local Supabase: same mutation flows persist correctly
- [ ] 7.3 Document outcomes in the change's `reports/` folder

## 8. Update Technical Documentation (MANDATORY)

- [ ] 8.1 Update `src/resources/README.md` to list write operations
- [ ] 8.2 Update `docs/resources-layer-plan.md` Phase 1 status

## 9. Quality Gates

- [ ] 9.1 `bun run lint` clean
- [ ] 9.2 `bun run typecheck` clean
- [ ] 9.3 `rg "supabase" src/lib/dataStore.ts` returns nothing
