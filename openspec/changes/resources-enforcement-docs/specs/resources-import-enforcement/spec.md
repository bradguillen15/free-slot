## ADDED Requirements

### Requirement: ESLint enforces the data-access import matrix

The build SHALL fail if the supabase client is imported outside `src/resources/_providers/supabase/**`
and `src/integrations/**` (with the auth seam excepted), with no per-file override list.

#### Scenario: A stray supabase import fails lint

- **WHEN** a page, component, or feature hook imports `@/integrations/supabase/client`
- **THEN** `bun run lint` reports a `no-restricted-imports` error

#### Scenario: Allowed importers pass

- **WHEN** `src/resources/_providers/supabase/**` imports the client, or `dataStore`/`migrateGuest`
  import `@/resources`
- **THEN** lint passes
- **AND** the temporary override block (WeeklyReviewModal/AIPlanPanel/PriorityRanker/onboarding/settings)
  no longer exists in `eslint.config.js`

### Requirement: Standards docs describe the resources layer as canonical

The documentation SHALL describe the resources layer as the canonical data-access pattern and SHALL NOT
present the retired guidance (`dataFetchers.ts`, "`src/lib/**` may import supabase", "direct supabase in
components", "feature hooks may fetch with `useEffect`", "`dataStore` talks to Supabase").

#### Scenario: Docs reference resources, not dataFetchers

- **WHEN** the standards docs (`ARCHITECTURE`, `frontend-standards`, `backend-standards`, `conventions`,
  `development_guide`, `CLOUD`, `README`) are reviewed for data access
- **THEN** they direct contributors to `src/resources/` + `dataStore`
- **AND** `rg "dataFetchers" docs/` returns only historical references in migration plans

#### Scenario: react-query plan is marked superseded

- **WHEN** a contributor opens `docs/react-query-migration-plan.md`
- **THEN** it carries a banner noting Phase 3 is superseded by the resources-layer plan
