## Why

The onboarding flow has diverged from the rest of the app: it duplicates block and activity editors that are already maintained in SchedulePage and ActivitiesPage, causing them to fall out of sync with every UI improvement. It also gives users no escape hatch — the gate hard-redirects every `/app/*` route until `onboarding_completed` is true, so a returning user who just wants to explore cannot proceed. A retry of the final step can silently double-insert data for authenticated users.

## What Changes

- **Add a Skip button** to the onboarding so any user (guest or authenticated) can bypass it and go directly to the app; the gate still shows the prompt on next visit until skipped or completed.
- **Replace the duplicated inline block/activity editors** in the onboarding with navigational shortcut cards — clicking them takes the user to SchedulePage or ActivitiesPage to manage their data, and the onboarding reflects live counts from those pages.
- **Guard the finish() path against double-inserts** for authenticated users by deduplicating on `(name, start_time, end_time)` for blocks and `name` for activities before inserting.
- **Make the preferences step incremental** — pre-populate it with the user's existing profile values so re-running onboarding does not overwrite choices already made.
- **OnboardingGate becomes non-blocking** — it redirects to onboarding only when `onboarding_completed` is false AND the user has not explicitly skipped; a `skipped` flag (localStorage for guests, profile column for cloud) lets the gate pass through.

## Capabilities

### New Capabilities

- `onboarding-flow`: The multi-step onboarding wizard including skip behaviour, step navigation, live data reflection from SchedulePage/ActivitiesPage, idempotent save, and the OnboardingGate routing logic.

### Modified Capabilities

<!-- No existing capability specs exist yet — all behaviour defined here is new. -->

## Impact

- `src/pages/Onboarding.tsx` — significant rework: inline editors removed, replaced with count/shortcut cards; skip added to navigation row; finish() gains dedup guards.
- `src/components/OnboardingGate.tsx` — reads new `onboarding_skipped` flag; allows pass-through when skipped.
- `src/lib/localStore.ts` — `LocalProfile` gains `onboarding_skipped: boolean`; `DEFAULT_PROFILE` updated; `updateProfile` already handles partial patches so no further changes needed.
- `src/lib/migrateGuest.ts` — migrate `onboarding_skipped` flag alongside `onboarding_completed`.
- Supabase `profiles` table — new boolean column `onboarding_skipped DEFAULT false`; migration file required.
- `src/i18n/locales/en.ts` / `es.ts` — new translation keys for skip button and count cards.
- No new routes, no new Supabase tables, no edge functions.
