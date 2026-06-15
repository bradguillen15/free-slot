## Context

`migrateGuestToCloud(userId)` (`src/lib/migrateGuest.ts`) writes the guest's categories,
activities, schedule blocks, time logs, and priorities directly to Supabase. `Auth.tsx::importNow`
awaits it, shows a success toast, then `navigate("/app")`. React Query is never told the
now-cloud user's keys changed, so the cached guest/empty entries are served on the first `/app`
render and only a manual reload (which recreates the client) shows the migrated data.

**Mechanism discovered during implementation:** the premature navigation is not driven by
`importNow`'s own `navigate` — it is driven by the migrate `AlertDialog`. The dialog is
`<AlertDialog open={migrateOpen} onOpenChange={setMigrateOpen}>` and the "Import" button is a Radix
`AlertDialogAction`, which auto-closes the dialog on click. That fires `onOpenChange(false)` →
`setMigrateOpen(false)`, and the redirect effect `if (!migrateOpen) navigate("/app")` then runs
**immediately, before `migrateGuestToCloud` resolves**. So the user lands on `/app` while migration
(and any cache refresh) is still in flight — which is exactly why the first render is stale. The fix
must therefore both (a) refresh the cache and (b) prevent that effect from navigating until the
migration settles.

The app already exposes the shared client via `getQueryClient()` (`src/lib/queryClient.ts`) and a
centralized key tree via `queryKeys` (`src/lib/queryKeys.ts`), where `queryKeys.root === ["freeslot"]`
covers every entity key. Existing `refresh*` helpers in `dataStore.ts` already invalidate by key.

## Goals / Non-Goals

**Goals:**
- First post-migration render shows migrated data with no manual reload.
- Invalidation happens only on migration success; failure path is untouched.
- Loading state spans migration + refetch so navigation lands on fresh data.

**Non-Goals:**
- No change to `migrateGuestToCloud`'s write logic or return shape.
- No change to the guest mode runtime or `localStore`.
- No broader cache-architecture refactor.

## Decisions

- **Invalidate `queryKeys.root`, not per-entity keys.** Migration touches five entity types; a
  single root invalidation is simpler and correct, versus enumerating each `queryKeys.*(mode, userId)`.
  Alternative (per-key invalidation) considered but rejected as more code with no benefit here.
- **Invalidate at the call site (`Auth.tsx::importNow`), not inside `migrateGuest.ts`.** Keeps
  `migrateGuest` a pure data operation with no React Query dependency; the UI boundary owns cache and
  navigation. Aligns with the resources-layer direction (lib stays I/O; UI owns cache).
- **`await getQueryClient().invalidateQueries({ queryKey: queryKeys.root })` before `navigate`.** Awaiting
  the invalidation (which triggers active refetches) ensures the `/app` render reads settled data.
- **Gate the redirect effect on `!migrating`.** Because the Radix dialog auto-closes on Import (setting
  `migrateOpen=false`), the redirect effect would navigate before migration completes. Adding `&& !migrating`
  to the guard (`if (!migrateOpen && !migrating) navigate("/app")`) keeps the redirect from firing while a
  migration is in flight; `importNow` performs the authoritative navigation after invalidation. After
  `migrating` clears, the effect may re-confirm `/app` (idempotent `replace`), which is harmless.
- **Use the shared client via `getQueryClient()`.** Although `Auth.tsx` is inside the
  `QueryClientProvider` at runtime, the existing cache-refresh helpers in `dataStore.ts`
  (`refreshCategories`, etc.) already invalidate through the `getQueryClient()` singleton, and the
  `Auth` test renders outside provider scope. Using `getQueryClient()` keeps Auth consistent with that
  established pattern and avoids coupling the test to a `QueryClientProvider`. (The `useQueryClient()`
  hook was considered but rejected for those two reasons.)

## Risks / Trade-offs

- [Awaiting refetch slightly delays navigation] → The migrating loading state already covers it; the
  delay is the network round-trip the reload would have cost anyway.
- [Root invalidation refetches more than strictly necessary] → Acceptable one-time cost at signup;
  staleTime/refetch settings limit churn.

## Migration Plan

Frontend-only; ships with the code. No DB migration, no rollback steps beyond reverting the diff.

## Open Questions

None.
