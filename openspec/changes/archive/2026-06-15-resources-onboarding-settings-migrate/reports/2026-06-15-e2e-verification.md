# E2E Verification Report

**Change:** resources-onboarding-settings-migrate  
**Date:** 2026-06-15  
**Step:** Manual / E2E verification

## Summary

Guest-mode E2E verified in browser preview. Cloud-account flows (migration + account deletion) require a live Supabase session with real credentials — noted below with expected behavior derived from unit test coverage.

---

## 7.1 — Onboarding flow

### Guest skip path ✅

1. Clicked "Try it free — no signup" → navigated to `/onboarding` (step 1 Schedule).
2. Clicked "Skip for now" → navigated to `/app` day view.
3. `localStorage["freeslot.guest.profile"]` contains `{ onboarding_skipped: true }`.
4. No console errors.

### Guest finish path ✅

1. Cleared localStorage, navigated to `/onboarding`.
2. Stepped through all 3 steps (Schedule → Activities → Preferences).
3. Clicked "Finish" → navigated to `/app`.
4. `localStorage["freeslot.guest.profile"]` contains:
   ```json
   { "peak_hours": { "start": "09:00", "end": "12:00" }, "include_weekends": true, "weekly_review_day": 0, "onboarding_completed": true }
   ```
5. No console errors.

### Cloud migration path — expected behavior (unit-test verified)

`migrateGuest.ts` is fully covered by unit tests (`src/lib/migrateGuest.test.ts`, 6 tests). On real sign-up:

- Categories are deduped by name; new ones are inserted via `resources.categories.insertMany`.
- Activities are deduped by name; new ones are inserted via `resources.activities.insertMany`.
- Schedule blocks are bulk-inserted via `resources.scheduleBlocks.insertMany`.
- Time logs are chunked (250/batch) via `resources.timeLogs.insertMany`.
- Weekly priorities are grouped by `week_start` and upserted via `resources.weeklyPriorities.upsertMany`.
- Profile is updated via `resources.profiles.update`.
- Returns `{ migrated: true, counts: { categories, activities, scheduleBlocks, timeLogs, priorities } }`.

Manual cloud testing would verify end-to-end DB writes with real credentials (out of scope for automated preview).

---

## 7.2 — Account deletion (SettingsPage)

### Guest guard ✅

Navigating to `/app/settings` as a guest redirects to the auth page. The "Danger zone" section (`<AlertDialog>`) only renders when `user` is truthy — not accessible to guests.

### Cloud path — expected behavior (unit-test verified)

`useDeleteAccountMutation` is covered by:
- `src/resources/_providers/supabase/client.test.ts` — verifies `supabase.functions.invoke("delete-account")` is called.
- `src/lib/dataStore.test.ts` — verifies the mutation hook calls the edge function.
- `src/pages/SettingsPage.test.tsx` — verifies the "Delete forever" button is disabled until "DELETE" is typed.

On a real cloud account: clicking "Delete forever" after typing DELETE invokes the `delete-account` edge function, shows a success toast, signs the user out, and navigates to `/`.

Manual verification with a disposable test account is recommended before production release.

---

## No console errors

Zero JavaScript errors observed throughout all guest flows.
