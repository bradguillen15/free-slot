## Context

`dataStore.ts` exports ~11 mutation functions that still call `supabase.from(...)` inline:
`insertTimeLog`, `updateTimeLog`, `deleteTimeLog`, `upsertActivity`, `deleteActivity`,
`upsertScheduleBlock`, `deleteScheduleBlock`, `reorderScheduleBlocks`, `upsertCategory`,
`deleteCategory`, `updateProfile`. Each already branches `if (mode === "guest") localStore… else
supabase…` and calls an `invalidate*` helper afterward. The `resources` scaffold (Phase 0) added the
provider, modules, and read operations; this change adds the write operations and removes the last
supabase dependency from `dataStore`.

## Goals / Non-Goals

**Goals:**
- All cloud mutations live in `resources`; `dataStore.ts` imports no supabase client.
- `dataStore` mutations keep their signatures, guest branch, and cache invalidation.
- Provider write-mapping is unit-tested with a mock supabase client.

**Non-Goals:**
- The cross-day `date` extension to `updateTimeLog` (Phase 4 / calendar logs change).
- Feature-hook stragglers, edge functions, onboarding/settings/migrateGuest (Phases 2–4).
- ESLint enforcement (Phase 5).

## Decisions

- **Keep `dataStore` mutation signatures stable.** Only the cloud body changes (inline supabase →
  `resources.*`). Callers (pages/components) are untouched. Minimizes blast radius.
- **Resources writes are cloud-only.** Same as reads: the guest branch stays in `dataStore`; resources
  take `{ userId, ... }` and never see `mode`.
- **Preserve invalidation at the `dataStore` boundary**, not in resources. Cache is a React Query
  concern; resources stay framework-free (plan layer rules).
- **DTO mappers symmetrical with reads.** Reuse `_providers/supabase/mappers.ts`; add input mappers
  (DTO/patch → row) mirroring the existing read row→DTO maps.
- **Upsert/reorder stay single operations** on the resource (`activities.upsert`, `scheduleBlocks.reorder`)
  so the insert-vs-update and bulk-order logic lives in one place, matching current behavior.

## Risks / Trade-offs

- [Subtle drift in update payloads] → Provider write-mapping tests assert exact columns (e.g.
  `updateTimeLog` only sends `title` when defined, `notes ?? null`), pinning current behavior.
- [Invalidation accidentally dropped during move] → `dataStore` mutation tests assert the
  `invalidate*` call still fires after the resource call.

## Migration Plan

Pure refactor; ships with code. Rollback = revert. No DB/API change. Verify with full Vitest suite +
both e2e lanes (mutation flows unchanged).

## Open Questions

None.
