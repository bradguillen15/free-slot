## Context

Today `src/lib/dataFetchers.ts` holds six **mode-aware** read functions (`fetchCategories`,
`fetchActivities`, `fetchScheduleBlocks`, `fetchTimeLogsInRange`, `fetchProfile`, `fetchWeeklyPlan`),
each branching `if (mode === "guest") localStore… else supabase.from(...)`. `dataStore.ts` read
hooks call these as `queryFn: () => fetchX(mode, userId)`. Mutations still call `supabase.from(...)`
inline (Phase 1). DTOs already align with `localStore` types (`LocalCategory`, etc.). Test seams live
in `src/test/` (`supabaseMock.ts`, `factories.ts`, `renderWithProviders.tsx`). There are currently no
dedicated `dataFetchers` unit tests.

This change implements [resources-layer-plan.md](../../../docs/resources-layer-plan.md) Phase 0 + the
read half of Phase A, resolving its open decisions D1–D4.

## Goals / Non-Goals

**Goals:**
- A cloud-only `src/resources/` boundary with a provider interface + Supabase provider.
- Read path routed through `resources` (cloud) / `localStore` (guest) via `dataStore`.
- `dataFetchers.ts` deleted; supabase client imported only by `_providers/supabase`.
- Mock provider helper; DTOs reuse `localStore` shapes.
- Zero user-visible behavior change.

**Non-Goals:**
- Mutations (Phase 1), feature-hook stragglers (Phases 2–3), onboarding/settings/migrateGuest (Phase 4).
- ESLint `no-restricted-imports` enforcement of the full matrix (Phase 5).
- Edge-function (`functions/`) wiring beyond folder placeholder (first real function in Phase 2).

## Decisions

- **D1 — New folder, delete `dataFetchers.ts`.** Clearer intent than renaming; the cloud bodies move
  into `_providers/supabase/*` + `mappers.ts`. Alternative (shim re-export) rejected: leaves a second
  I/O path the plan wants gone.
- **D2 — Per-module factories composed into one `resources` object.** `createTimeLogResource(provider)`
  etc., assembled in `index.ts`, instead of one 200-line god-interface. The `ResourcesProvider`
  interface in `_providers/types.ts` declares the low-level operations each module needs.
- **D3 — DTOs alias `localStore` shapes.** `export type Category = LocalCategory` (and reverse alias
  where convenient) so guest/cloud share one shape; avoids duplicate mapping in `dataStore`.
- **D4 — Edge functions under `resources/functions/`** (folder created now, populated in later phases).
- **Guest branch moves to `dataStore`.** Because resources are cloud-only, the six read hooks take
  over the `mode` switch they previously delegated to the fetcher. This is the intended end-state
  (plan §3) and keeps resources free of guest concerns. Only 6 call sites change.
- **Provider injection.** `index.ts` exports `resources = createSupabaseProvider()`; tests can build a
  `createMockResourcesProvider()` and inject it where hooks read the provider (module-level singleton
  with a test override, mirroring `getQueryClient`).

## Risks / Trade-offs

- [Moving the guest branch into hooks touches dataStore reads] → Small (6 hooks), covered by updated
  hook tests asserting guest→localStore and cloud→resources; behavior identical.
- [Singleton provider complicates test injection] → Provide an explicit setter/override in tests
  (same pattern already used for the query client) rather than DI through every hook signature.
- [DTO aliasing couples resources to localStore names temporarily] → Acceptable; the plan converges
  naming over time and both already describe the same domain entity.

## Migration Plan

Pure refactor; ships with code. Rollback = revert the diff. No DB or API change. Verify by running the
full Vitest suite + both e2e lanes (read behavior unchanged) before considering it done.

## Open Questions

None — D1–D4 resolved above per the plan's recommendations.
