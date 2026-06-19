# Tasks — resources-enforcement-docs

> Config + documentation only; no runtime behavior change. curl/RLS/E2E **N/A** (no feature change).
> Completion gate for the resources-layer plan. Depends on Phases 1–4 (scaffold, mutations, weekly
> review, AI/priorities, onboarding/settings/migrate).

## 0. Setup: Create Feature Branch (MANDATORY - FIRST STEP)

- [ ] 0.1 Create feature branch `feature/resources-enforcement-docs` from `main`
- [ ] 0.2 Verify branch creation and current branch status

## 1. ESLint enforcement

- [ ] 1.1 Tighten `no-restricted-imports` to allow `@/integrations/supabase/client` only in
      `src/resources/_providers/supabase/**`, `src/integrations/**`, auth files, and tests
- [ ] 1.2 Delete the temporary override block (DashboardPage/SettingsPage/Onboarding/OnboardingGate/
      WeeklyReviewModal/AIPlanPanel/PriorityRanker)
- [ ] 1.3 Update the rule comment to cite `docs/resources-layer-plan.md` as the authority
- [ ] 1.4 `bun run lint` clean (fix any newly surfaced stray imports)

## 2. Documentation sweep (per resources-layer-plan §7 table)

- [ ] 2.1 `docs/ARCHITECTURE.md` — add `resources` layer to the diagram/table; update data-flow + "add a
      field" checklist
- [ ] 2.2 `docs/frontend-standards.md` — Data Access Rules → `_providers/supabase` only; replace
      `dataFetchers.ts` guidance with `resources/<entity>.ts` + `dataStore` hook; add `resources/` to structure
- [ ] 2.3 `docs/backend-standards.md` — guest/cloud parity step → resources module + dataStore hook;
      edge invoke via `resources/functions/*`; add `src/resources/**` to globs
- [ ] 2.4 `docs/conventions.md` — "remote I/O → resources; hooks aggregate only"; link the plan
- [ ] 2.5 `docs/development_guide.md` — Key Docs + verification checklist updates
- [ ] 2.6 `docs/CLOUD.md` — note app code uses `resources`, not the generated client directly
- [ ] 2.7 `docs/react-query-migration-plan.md` — add "Phase 3 superseded" banner; update target diagram
- [ ] 2.8 `README.md` — add `src/resources/` to the layout tree; pointer to architecture doc
- [ ] 2.9 `src/resources/README.md` — finalize import rules, layer diagram, "adding an entity" checklist

## 3. Retire outdated patterns (audit)

- [ ] 3.1 Replace the retired guidance phrases (dataFetchers, `src/lib/**` supabase, direct supabase in
      components, `useEffect` fetch, "dataStore talks to Supabase") across docs
- [ ] 3.2 `rg "dataFetchers" docs/` returns only historical migration-plan references
- [ ] 3.3 `rg "src/lib/\*\*" docs/` no longer appears as an allowed supabase import path

## 4. Verify State (MANDATORY)

- [ ] 4.1 `bun run lint` and `bun run typecheck` clean
- [ ] 4.2 `bun run test` full suite green (no behavior change expected)
- [ ] 4.3 `rg "from \"@/integrations/supabase/client\"" src` shows only `_providers/supabase` + integrations + auth + tests
- [ ] 4.4 Create report `specs/resources-enforcement-docs/reports/YYYY-MM-DD-step-verification.md`

## 5. Manual Endpoint Testing with curl (MANDATORY for backend) — N/A

- [ ] 5.1 N/A — config/docs only.

## 6. E2E / Manual Verification — N/A

- [ ] 6.1 N/A — no runtime behavior change; covered by prior phases' e2e.

## 7. Update Technical Documentation (MANDATORY)

- [ ] 7.1 Mark `docs/resources-layer-plan.md` implementation complete (Phase 5 / DoD)

## 8. Quality Gates

- [ ] 8.1 ESLint import matrix enforced with no override list
- [ ] 8.2 Doc audit (Section 3) passes
