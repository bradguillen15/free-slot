# Guided First-Run Tour

## Why

The first-run experience seeds sample schedule blocks and time logs silently, which confuses users ("is this data mine?") and provides no guidance on what to do after login. Two shipped features (Confirm Day, per-block one-click logging) went completely undiscovered in user testing. The model flips from **assert** (pre-populated data claiming to be the user's) to **guide + consent** (a tour that walks the user through creating real data themselves).

## What Changes

- **BREAKING** Remove first-run sample data entirely: no seeding for guests or cloud accounts; drop `is_example` columns on `schedule_blocks`/`time_logs` and `sample_data_seeded` on `profiles` via migration (deleting any remaining example rows); delete `SampleDataBanner` and the clear-example-data mutation.
- **BREAKING** Remove the legacy `/onboarding` wizard page and its route; remove `OnboardingGate` (its redirect logic becomes dead). Keep `onboarding_completed`/`onboarding_skipped` profile columns (historical data).
- Add an **"Apply suggested schedule"** action in the schedule editor (prominent in the empty state) that inserts a fixed template after a confirmation dialog. Template fixes the previous overlap bug: Sleep 23:00–07:00 daily; Work 09:00–12:00, Lunch 12:00–13:00, Work 13:00–17:00 weekdays.
- **Confirm Day becomes elapsed-only for today**: blocks whose end time has not passed yet are skipped (new skip reason); past dates unchanged.
- Add a **custom coach-mark guided tour** (Radix Popover, no new dependency) that navigates routes itself: Day (welcome) → Schedule (apply template) → Schedule (edit hint) → Day (Confirm Day) → Day (closing). Auto-starts once for new users (`tour_completed` profile flag; localStorage for guests), replayable via a `?` button in the app layout (desktop sidebar + mobile sheet).

## Capabilities

### New Capabilities
- `guided-tour`: coach-mark tour lifecycle — auto-start for new users, step script, route-driving navigation, skip/complete persistence, replay trigger.
- `schedule-template-apply`: suggested-schedule template definition and the consent-based apply action in the schedule editor.

### Modified Capabilities
- `first-run-sample-data`: all requirements REMOVED — no seeding, no `is_example` marking, no clear banner; columns dropped.
- `onboarding-flow`: wizard and gate requirements REMOVED; new-user orientation is now the guided tour.
- `confirm-day-logging`: new requirement — when confirming today, only blocks that have fully elapsed are materialized; future blocks are skipped with a distinct reason.

## Impact

- Frontend: `src/lib/{sampleData,dataStore,localStore,migrateGuest,confirmDay,schedule}.ts`, `src/components/day/{SampleDataBanner,ConfirmDayButton}.tsx`, `src/components/schedule/ScheduleEditor.tsx`, new `src/components/tour/*`, `src/components/{AppLayout,OnboardingGate}.tsx`, `src/pages/{Onboarding,CalendarPage,SchedulePage}`, `src/App.tsx`, i18n `en.ts`/`es.ts` (remove `sampleData.*`, add `tour.*`, `scheduleTemplate.*`).
- Database: two migrations — drop sample-data columns (+ delete example rows), add `profiles.tour_completed`; regenerate `src/integrations/supabase/types.ts`; update `src/resources/_providers/supabase/client.ts` profile select/patch.
- Tests: delete `sampleData.test.ts`, `e2e/first-run-sample-data.e2e.ts`, `Onboarding.test.tsx`, `SampleDataBanner.test.tsx`; update `confirmDay`/`ConfirmDayButton` tests, `OnboardingGate` removal fallout, `localStore`/`dataStore`/`migrateGuest`/page tests; new `guided-tour.e2e.ts`.
- No edge-function or API changes.
