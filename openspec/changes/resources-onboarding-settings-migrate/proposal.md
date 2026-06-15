## Why

The remaining Supabase stragglers are onboarding/settings residual calls and the migration utility:
`Onboarding.tsx` and `OnboardingGate.tsx` (profile reads/writes), `SettingsPage.tsx` (`delete-account`
invoke), and `migrateGuest.ts` (direct inserts/updates during signup migration). This is
[resources-layer-plan.md](../../../docs/resources-layer-plan.md) Phase 4 — route these through
`dataStore`/`resources` so only `_providers/supabase` imports the client (auth excepted).

## What Changes

- `Onboarding.tsx` / `OnboardingGate.tsx`: profile reads/writes → `useProfile` / `updateProfile`
  (no direct `supabase`).
- `SettingsPage.tsx`: `delete-account` invoke → `resources.functions.deleteAccount()` via a mutation hook.
- `migrateGuest.ts`: cloud inserts/updates → `resources.*` batch helpers (e.g.
  `activities.insertMany`, `categories.insertMany`, `scheduleBlocks.insertMany`, `timeLogs.insertMany`,
  `weeklyPriorities.insertMany`). `migrateGuest` may import `@/resources` (allowed) but not the client.
- **Exit:** `Onboarding`, `OnboardingGate`, `SettingsPage` have no `supabase` import; `migrateGuest`
  imports `@/resources`, not the supabase client.

## Capabilities

### Modified Capabilities
- `resources-layer`: Extend the boundary to own onboarding/settings profile + account operations and the
  guest→cloud migration writes (batch inserts), so the last app-code Supabase imports are removed
  (auth excepted).

### New Capabilities
<!-- None — extends resources-layer. -->

## Impact

- New: `resources/functions/delete-account.ts`; batch insert helpers on the entity resources + provider impls.
- `src/lib/dataStore.ts` — `useDeleteAccountMutation()` (or equivalent).
- `src/pages/Onboarding.tsx`, `src/components/OnboardingGate.tsx` — `useProfile`/`updateProfile`.
- `src/pages/SettingsPage.tsx` — delete-account via the resources function/mutation.
- `src/lib/migrateGuest.ts` — uses `resources` batch APIs (keeps its return/counts shape).
- Tests: update `migrateGuest.test.ts` against the mock provider (batch inserts called; counts correct);
  provider tests for batch inserts + delete-account invoke; onboarding/settings hook tests.
- No DB migration; edge-function server code unchanged.
