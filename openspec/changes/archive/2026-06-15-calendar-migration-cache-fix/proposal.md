## Why

After a guest signs up and imports their data via `migrateGuestToCloud`, the first
`/app` render shows stale/empty data and the user must manually reload for the migrated
schedule and logs to appear. `migrateGuestToCloud` writes directly to Supabase but never
tells React Query that the now-cloud user's cache keys changed, so the cached guest/empty
entries are served on first render. This is issue #6 in
[calendar-ux-improvements-plan.md](../../../docs/calendar-ux-improvements-plan.md).

## What Changes

- After `migrateGuestToCloud` resolves successfully in `Auth.tsx::importNow`, invalidate
  the React Query cache for all FreeSlot keys (`queryKeys.root`) and await the refetch
  **before** `navigate("/app")`, so the first post-migration render serves fresh cloud data.
- Cache invalidation is **not** triggered when migration fails (the existing guest-data
  preservation / error path is unchanged).
- The "Import" action shows its existing migrating/loading state until invalidation +
  refetch settle, then navigates.
- No schema change, no edge-function change, frontend only. Guest/cloud parity preserved.

## Capabilities

### New Capabilities
- `migration-cache-refresh`: After a successful guest→cloud migration, the active user's
  React Query cache is invalidated and refetched before navigation, so the first authenticated
  render shows the migrated data without a manual reload.

### Modified Capabilities
<!-- None — no existing capability spec changes its requirements. -->

## Impact

- `src/pages/Auth.tsx` — `importNow`: invalidate `queryKeys.root` via the shared query client
  and await settle before `navigate("/app")`.
- `src/lib/migrateGuest.ts` — unchanged behavior; covered by extended unit tests.
- Tests: `src/lib/migrateGuest.test.ts` (invalidation on success, not on failure),
  an `Auth` component test (navigation after invalidation + loading state), and a
  cloud-lane e2e (`e2e/cloud/`) asserting migrated data renders with no reload.
- No DB migration, no API change.
