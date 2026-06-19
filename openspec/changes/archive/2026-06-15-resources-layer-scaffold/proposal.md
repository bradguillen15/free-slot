## Why

Remote I/O is split across four places (`dataFetchers.ts`, inline `supabase.from(...)` in
`dataStore.ts` mutations, `migrateGuest.ts`, and several feature hooks/components), so a future
backend swap means hunting every straggler with no compile-time guarantee that Supabase is
isolated. The [resources-layer-plan.md](../../../docs/resources-layer-plan.md) (Phase 0) introduces a
single, cloud-only `src/resources/` boundary. This change lays the scaffold and migrates the
**read** path (Phase A) onto it, leaving mutations (Phase 1) and stragglers (Phases 2–4) for later.

## What Changes

- Create the `src/resources/` tree: a public barrel (`index.ts`), domain DTO types (`types/`),
  per-entity modules (`categories.ts`, `activities.ts`, `schedule-blocks.ts`, `time-logs.ts`,
  `profiles.ts`, `weekly-plans.ts`), and `_providers/` (the `ResourcesProvider` interface +
  `createSupabaseProvider()`, the only place that imports the supabase client).
- Resources are **cloud-only** (no `mode` param). The guest/cloud branch moves up into the
  `dataStore` read hooks: `queryFn: () => mode === "guest" ? <localStore read> : resources.<entity>.<op>({ userId })`.
- Move the cloud halves of `dataFetchers.ts` into the supabase provider/mappers; **delete**
  `dataFetchers.ts` (per plan decision D1) once `dataStore` reads route through `resources` + `localStore`.
- Add `src/resources/README.md` documenting the import rule: *only `dataStore` and `migrateGuest`
  may import from `@/resources`; only `_providers/supabase` may import the supabase client.*
- Add a `createMockResourcesProvider()` test helper for `dataStore`/feature tests.
- Reuse `localStore` domain shapes for DTOs (decision D3): `export type LocalCategory = Category`
  aliasing, so guest/cloud share one shape and `dataStore` needs no extra mapping.

> ESLint enforcement of the import matrix is **out of scope here** (Resources Phase 5). This change
> establishes the structure and migrates reads only.

## Capabilities

### New Capabilities
- `resources-layer`: A cloud-only data-access boundary (`src/resources/`) with a provider interface,
  a Supabase provider as the sole importer of the supabase client, domain DTO types, and the read
  path routed through it — replacing `dataFetchers.ts`.

### Modified Capabilities
<!-- None — no existing capability spec changes its requirements (guest/cloud parity behavior is unchanged). -->

## Impact

- New: `src/resources/{index.ts,types/*,categories.ts,activities.ts,schedule-blocks.ts,time-logs.ts,
  profiles.ts,weekly-plans.ts,_providers/{types.ts,supabase/*}}`, `src/resources/README.md`.
- `src/lib/dataStore.ts` — read hooks call `resources.*` (cloud) or `localStore` (guest) directly.
- `src/lib/dataFetchers.ts` — **deleted** (cloud reads moved into the provider).
- `src/test/` — add `createMockResourcesProvider()` helper (alongside `supabaseMock.ts`).
- Tests: provider mapping tests (mock supabase), resource contract tests (mock provider), updated
  `dataStore` read-hook tests asserting `resources` is called in cloud mode and `localStore` in guest.
- No DB migration, no API change, no behavior change for users.
