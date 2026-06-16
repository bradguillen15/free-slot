# Unit Test Verification Report

**Change:** resources-onboarding-settings-migrate  
**Date:** 2026-06-15  
**Step:** Unit test verification (post-implementation)

## Quality Gates

| Gate | Result |
|------|--------|
| `bun run test` — full suite | ✅ 303/303 passed (42 test files) |
| `bun run lint` | ✅ 0 errors (3 warnings in coverage/ build artifacts, not source) |
| `bun run typecheck` | ✅ Clean |
| Quality gate: no direct supabase imports in target files | ✅ Empty (no matches) |

## Quality Gate Command

```
rg "@/integrations/supabase/client" src/pages/Onboarding.tsx src/components/OnboardingGate.tsx src/pages/SettingsPage.tsx src/lib/migrateGuest.ts
```
Returns nothing — all 4 target files now route through the resources layer.

## Test Files Modified or Added

| File | Change | Tests |
|------|--------|-------|
| `src/lib/migrateGuest.test.ts` | Full rewrite — mocks `@/resources` via `vi.hoisted()` | 6 tests |
| `src/lib/dataStore.test.ts` | Added `useDeleteAccountMutation` test | 28 tests (+1) |
| `src/resources/_providers/supabase/client.test.ts` | Added `functions.deleteAccount` tests | 20 tests (+2) |
| `src/components/OnboardingGate.test.tsx` | Wrapped `renderAt` with `QueryClientProvider` | 9 tests |
| `src/pages/Onboarding.test.tsx` | Switched `updateProfile` mock to dataStore; removed supabase table mocks | 9 tests |
| `src/pages/SettingsPage.test.tsx` | Added `useDeleteAccountMutation` to dataStore mock | 2 tests |
| `src/components/activities/PriorityRanker/index.test.tsx` | Fixed flaky `waitFor` (wait for correct order, not just presence) | 2 tests |

## Implementation Summary

Four files were migrated from direct `@/integrations/supabase/client` imports to the resources layer:

- **`src/components/OnboardingGate.tsx`**: Replaced ad-hoc `supabase.from('profiles')` call with `useProfile()` from dataStore.
- **`src/pages/Onboarding.tsx`**: Replaced `updateProfile` from localStore with `updateProfile` from dataStore (handles both guest and cloud modes).
- **`src/pages/SettingsPage.tsx`**: Replaced inline `supabase.functions.invoke('delete-account')` with new `useDeleteAccountMutation` hook.
- **`src/lib/migrateGuest.ts`**: Rewrote all 12 direct supabase calls through `resources.*` APIs.

New additions to the resources layer:
- `resources.functions.deleteAccount(userId)` in the supabase provider
- `useDeleteAccountMutation()` hook in dataStore
- `isLoading` exposed in `useProfile()` return value
