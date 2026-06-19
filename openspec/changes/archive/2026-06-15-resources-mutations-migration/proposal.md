## Why

After the resources scaffold (Phase 0) moves cloud **reads** behind `src/resources/`, the cloud
**mutations** still live as ~11 inline `supabase.from(...)` calls inside `dataStore.ts`. Until those
move too, `dataStore.ts` keeps a hard Supabase dependency and the I/O boundary is incomplete. This is
[resources-layer-plan.md](../../../docs/resources-layer-plan.md) Phase 1.

## What Changes

- Move every cloud mutation body out of `dataStore.ts` into the matching `resources` module:
  `insertTimeLog`/`updateTimeLog`/`deleteTimeLog` → `resources.timeLogs.*`;
  `upsertActivity`/`deleteActivity` → `resources.activities.*`;
  `upsertScheduleBlock`/`deleteScheduleBlock`/`reorderScheduleBlocks` → `resources.scheduleBlocks.*`;
  `upsertCategory`/`deleteCategory` → `resources.categories.*`; `updateProfile` → `resources.profiles.update`.
- `dataStore` mutations become a thin branch: `if (guest) localStore… else resources.…`, keeping the
  existing cache-invalidation calls (`invalidateTimeLogs`, etc.).
- Extend the `ResourcesProvider` interface + Supabase provider with the write operations and DTO
  mappers.
- **Exit:** `dataStore.ts` has zero `supabase` imports.

> This change does **not** add the cross-day `date` field to `updateTimeLog` — that is introduced by
> the calendar logs-source-of-truth change (Phase 4), which will add it through `resources` rather
> than inline.

## Capabilities

### Modified Capabilities
- `resources-layer`: Extend the cloud I/O boundary to also own all entity **mutations** (create,
  update, delete, reorder, upsert), so no `supabase.from(...)` remains in `dataStore.ts`.

### New Capabilities
<!-- None — this extends the resources-layer capability introduced in resources-layer-scaffold. -->

## Impact

- `src/resources/{time-logs,activities,schedule-blocks,categories,profiles}.ts` — add write ops.
- `src/resources/_providers/{types.ts,supabase/*}` — add write operations + mappers.
- `src/lib/dataStore.ts` — mutations branch to `localStore` (guest) / `resources` (cloud); remove the
  `@/integrations/supabase/client` import.
- Tests: extend `dataStore.test.ts` to assert `resources` (mock provider) is called in cloud mode and
  `localStore` in guest mode; provider write-mapping tests with mock supabase.
- No DB migration, no API change, no user-visible behavior change.
