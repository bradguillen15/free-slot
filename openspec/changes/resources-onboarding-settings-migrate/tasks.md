# Tasks — resources-onboarding-settings-migrate

> Mixed account-gated (settings/onboarding) + migration utility. curl/RLS **N/A** (no new tables; edge
> function unchanged). Depends on `resources-mutations-migration`. ESLint enforcement is Phase 5.

## 0. Setup: Create Feature Branch (MANDATORY - FIRST STEP)

- [ ] 0.1 Create feature branch `feature/resources-onboarding-settings-migrate` from `main`
- [ ] 0.2 Verify branch creation and current branch status

## 1. Tests First (TDD)

- [ ] 1.1 Provider batch-insert tests (`insertMany` per entity) + `delete-account` invoke test (mock supabase). (red)
- [ ] 1.2 `migrateGuest.test.ts`: migration calls `resources.<entity>.insertMany` with mapped rows and
      returns the same counts; no supabase client import. (red)
- [ ] 1.3 `dataStore`/hook tests: `useDeleteAccountMutation`; onboarding profile read/write via hooks. (red)

## 2. Implementation — resources

- [ ] 2.1 Add `insertMany` helpers to entity resources + provider impls
- [ ] 2.2 Add `resources/functions/delete-account.ts` + provider impl; `useDeleteAccountMutation` in dataStore

## 3. Implementation — app code

- [ ] 3.1 `migrateGuest.ts` → `resources` batch APIs (keep `{ migrated, counts }`); remove client import
- [ ] 3.2 `Onboarding.tsx` / `OnboardingGate.tsx` → `useProfile` / `updateProfile`
- [ ] 3.3 `SettingsPage.tsx` → delete-account via the mutation hook
- [ ] 3.4 Make Section 1 tests pass (green)

## 4. Review and Update Existing Unit Tests (MANDATORY)

- [ ] 4.1 Update onboarding/settings/migrate tests to the mock provider; keep counts/parity green

## 5. Run Unit Tests and Verify State (MANDATORY)

- [ ] 5.1 Targeted: `bun run test src/lib/migrateGuest src/resources src/pages/Onboarding src/components/OnboardingGate src/pages/SettingsPage`
- [ ] 5.2 Full suite: `bun run test`
- [ ] 5.3 DB state N/A (mocked); state so in the report
- [ ] 5.4 Create report `specs/resources-onboarding-settings-migrate/reports/YYYY-MM-DD-step-unit-test-verification.md`
- [ ] 5.5 Mark complete only after tests pass and report exists

## 6. Manual Endpoint Testing with curl (MANDATORY for backend) — N/A

- [ ] 6.1 N/A — edge function unchanged; no new endpoints.

## 7. E2E / Manual Verification (MANDATORY if applicable - AGENT MUST EXECUTE)

- [ ] 7.1 Cloud e2e: signup migration writes data (counts correct, renders fresh); onboarding flow works
- [ ] 7.2 Cloud e2e: account deletion on a disposable test account succeeds
- [ ] 7.3 Document outcomes in the change's `reports/` folder

## 8. Update Technical Documentation (MANDATORY)

- [ ] 8.1 Update `src/resources/README.md` (batch inserts, delete-account)
- [ ] 8.2 Update `docs/resources-layer-plan.md` Phase 4 status

## 9. Quality Gates

- [ ] 9.1 `bun run lint` clean
- [ ] 9.2 `bun run typecheck` clean
- [ ] 9.3 `rg "@/integrations/supabase/client" src/pages/Onboarding.tsx src/components/OnboardingGate.tsx src/pages/SettingsPage.tsx src/lib/migrateGuest.ts` returns nothing
