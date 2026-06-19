## Why

Once all I/O lives behind `src/resources/`, the pattern must be **enforced and documented**, or the
next feature (or AI agent) reverts to inline `supabase`/`dataFetchers` guidance from stale docs. This is
[resources-layer-plan.md](../../../docs/resources-layer-plan.md) Phase 5 — the completion gate: lock the
import matrix in ESLint and sweep the standards docs to make the resources layer the canonical pattern.

## What Changes

- **ESLint:** restrict `@/integrations/supabase/client` to `src/resources/_providers/supabase/**` and
  `src/integrations/**` (auth seam excepted); remove the temporary override block listing
  WeeklyReviewModal/AIPlanPanel/PriorityRanker/etc.; update the rule comment to cite this plan.
- **Documentation sweep** (per plan §7 Phase 5 table): update `ARCHITECTURE.md`, `frontend-standards.md`,
  `backend-standards.md`, `conventions.md`, `development_guide.md`, `CLOUD.md`,
  `react-query-migration-plan.md` (Phase 3 superseded banner), root `README.md`, and finalize
  `src/resources/README.md`.
- **Retire outdated patterns** (search-and-replace audit): "add a fetcher in `dataFetchers.ts`",
  "`src/lib/**` may import supabase", "direct supabase in components (temporary)", "feature hooks may
  fetch with `useEffect`", "`dataStore` talks to Supabase" → replace with the resources-layer guidance.

## Capabilities

### New Capabilities
- `resources-import-enforcement`: ESLint enforces the data-access import matrix (only
  `_providers/supabase` imports the supabase client; pages/components use `dataStore`; `dataStore`/
  `migrateGuest` may import `@/resources`), with no override list, and the standards docs describe the
  resources layer as the canonical pattern.

### Modified Capabilities
<!-- None — this is enforcement + docs over the existing resources-layer capability. -->

## Impact

- `eslint.config.js` — tighten `no-restricted-imports`; delete the override block; update comment.
- Docs: `docs/ARCHITECTURE.md`, `docs/frontend-standards.md`, `docs/backend-standards.md`,
  `docs/conventions.md`, `docs/development_guide.md`, `docs/CLOUD.md`,
  `docs/react-query-migration-plan.md`, `README.md`, `src/resources/README.md`.
- No code behavior change; the prior phases already moved the I/O. This change only fails the build if a
  stray supabase import remains and aligns the docs.
- No DB migration.
