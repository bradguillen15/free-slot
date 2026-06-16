## Context

`migrateGuest.ts` performs the guest→cloud copy with direct Supabase inserts/updates and returns
`{ migrated, counts }`. `Onboarding.tsx`, `OnboardingGate.tsx` read/write the profile directly, and
`SettingsPage.tsx` invokes the `delete-account` edge function. These are the last app-code Supabase
importers besides auth. With reads, mutations, weekly-review, and AI/priorities already on the resources
layer, this phase finishes the migration so only `_providers/supabase` (and `AuthContext`/`Auth.tsx`
for auth) import the client.

## Goals / Non-Goals

**Goals:**
- Onboarding/settings use `dataStore`/`resources` only.
- `migrateGuest` writes through `resources` batch helpers, preserving its counts contract.
- After this change, app code outside `_providers/supabase` + auth has no supabase client import.

**Non-Goals:**
- ESLint enforcement of the matrix (Phase 5 does that + the doc sweep).
- Moving auth session management (stays in `AuthContext`/`Auth.tsx`).

## Decisions

- **Batch insert helpers on the entity resources** (`insertMany`) keep `migrateGuest` readable and put
  the PostgREST batching inside the provider. Alternative (loop single inserts) rejected for perf and
  for keeping table knowledge out of `migrateGuest`.
- **`migrateGuest` may import `@/resources`** per the plan's import matrix (it's one of the two allowed
  non-dataStore importers); it must not import the client. The migration cache-refresh behavior from the
  `calendar-migration-cache-fix` change stays at the `Auth.tsx` call site.
- **`deleteAccount` under `resources/functions/`**, exposed via a `useDeleteAccountMutation`.
- **Profile via existing `useProfile`/`updateProfile`** — no new resource needed (already present from
  the scaffold/mutations phases).

## Risks / Trade-offs

- [Migration counts drift] → `migrateGuest.test.ts` asserts the same counts shape and that each
  `insertMany` is called with the mapped guest rows.
- [delete-account is destructive] → Behavior unchanged (same edge function); only the invoke path moves.
  Cloud e2e covers it cautiously (test account).

## Migration Plan

Frontend/data-access refactor; ships with code. No DB/edge change. Verify with Vitest (migrate + hooks)
and cloud e2e (signup migration, account deletion on a disposable test account). Rollback = revert.

## Open Questions

None.
