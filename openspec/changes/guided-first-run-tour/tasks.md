# Tasks — guided-first-run-tour

## Step 0: Create Feature Branch (MANDATORY — FIRST)

- [x] 0.1 Create and switch to `feature/guided-first-run-tour` (branched from `feature/user-feedback-fixes`)

## 1. Remove sample-data machinery (spec: first-run-sample-data REMOVED)

- [x] 1.1 Delete `src/lib/sampleData.ts` + `src/lib/sampleData.test.ts`; remove imports/usages in `src/lib/dataStore.ts` (`seedCloudSampleData`, seeding branch in `useProfile`, `clearExampleData`, `useClearExampleDataMutation`) and `src/lib/localStore.ts` (`ensureBootstrap` seeding, `is_example` in local types)
- [x] 1.2 Delete `src/components/day/SampleDataBanner.tsx` + test; remove usage from `src/pages/CalendarPage/index.tsx` (`hasExampleData`); remove `is_example` filters from `src/lib/migrateGuest.ts`; remove `sampleData.*` keys from `src/i18n/locales/en.ts` and `es.ts`
- [x] 1.3 Migration `remove_sample_data_machinery` created (`20260704120000`); provider selects/patches updated. Pushed to remote in Step 9 with user approval (main never referenced the dropped columns, so the deployed app is unaffected); types regenerated.
- [x] 1.4 Update/delete affected tests (`OnboardingGate.test.tsx`, `dataStore.test.ts`, `calendarDays.test.ts`, `localStore.test.ts`, `migrateGuest.test.ts`, `SchedulePage.test.tsx`, page tests); delete `e2e/first-run-sample-data.e2e.ts`; update `e2e/confirm-day-logging.e2e.ts` to create its own blocks; run `pnpm test`

## 2. Remove legacy onboarding wizard (spec: onboarding-flow REMOVED)

- [x] 2.1 Delete `src/pages/Onboarding.tsx` + `Onboarding.test.tsx`; remove `/onboarding` route and `OnboardingGate` wrappers from `src/App.tsx`; delete `src/components/OnboardingGate.tsx` + test (preserve any needed loading-spinner behavior in existing wrappers); remove wizard-only `onboarding.*` i18n keys (en + es); run `pnpm test`

## 3. Suggested schedule template + apply action (spec: schedule-template-apply)

- [x] 3.1 TDD: add `SUGGESTED_SCHEDULE_TEMPLATE` to `src/lib/schedule.ts` (Sleep 23–07 daily; Work 9–12, Lunch 12–13, Work 13–17 weekdays) with unit tests asserting shape and no same-day overlaps
- [x] 3.2 Add "Apply suggested schedule" action to `src/components/schedule/ScheduleEditor.tsx` — prominent empty-state CTA + reachable with existing blocks; AlertDialog confirmation; inserts via existing block mutations (guest + cloud); `data-tour="apply-suggested"` anchor; i18n `scheduleTemplate.*` (en + es); component tests; run `pnpm test`

## 4. Confirm Day elapsed-only (spec: confirm-day-logging ADDED)

- [x] 4.1 TDD: extend `buildConfirmDayRows` in `src/lib/confirmDay.ts` with `now` applied only for today — skip blocks with `end_time > now` (overnight blocks not elapsed until next-day end), skip reason `"not-elapsed"`, boundary `end_time == now` counts as elapsed; unit tests for today/past/boundary/overnight
- [x] 4.2 Thread `now` through `confirmDay` in `src/lib/dataStore.ts` and `ConfirmDayButton.tsx`; add "nothing elapsed yet" disabled state + i18n (en + es); update `ConfirmDayButton.test.tsx`; run `pnpm test`

## 5. Guided tour (spec: guided-tour)

- [x] 5.1 Migration `add_profile_tour_completed` created (`20260704120001`); threaded through `LocalProfile`, provider get/update, `useProfile`. Pushed to remote in Step 9; types regenerated.
- [x] 5.2 TDD: `src/components/tour/TourProvider.tsx` — step data model (`id`, `route`, `anchorId`, `titleKey`, `bodyKey`, `advanceOn`), `start/next/skip/notifyAction`, route navigation on step change, wait-for-anchor with centered-bubble fallback; unit tests for transitions and action-gated advancement
- [x] 5.3 `src/components/tour/TourBubble.tsx` — Radix Popover bubble with step counter, Next/Skip/Done, dimmed backdrop + anchor highlight ring; semantic tokens only
- [x] 5.4 Wire 5-step script with `tour.*` i18n keys (en + es); add `data-tour` anchors (Day shell, apply-suggested, schedule block list, ConfirmDayButton); `notifyAction` on template apply; auto-start on `/app` when `!tour_completed`; Skip/Done persist flag (guest + cloud)
- [x] 5.5 Replay `?` (HelpCircle) button in `src/components/AppLayout.tsx` sidebar footer + mobile sheet footer with i18n label; run `pnpm test`

## 6. Review and Update Existing Unit Tests (MANDATORY)

- [x] 6.1 Sweep remaining references to sample data / onboarding wizard across `src/` and tests; fix or delete; full `pnpm test` green

## 7. Run Unit Tests and Verify Database State (MANDATORY — AGENT EXECUTES)

- [x] 7.1 Capture pre/post local DB state (blocks/logs/profiles counts), run targeted + full unit suites, verify both migrations applied cleanly; write report `openspec/changes/guided-first-run-tour/reports/YYYY-MM-DD-step-7-unit-test-and-db-verification.md`

## 8. Manual Testing (MANDATORY — AGENT EXECUTES via preview)

- [x] 8.1 Fresh guest walkthrough in preview: tour auto-starts → Start navigates to Schedule → Apply suggested schedule (confirm dialog) → 5 blocks created, no overlaps → back to Day → Confirm Day logs only elapsed blocks → Done persists; replay via `?` button; verify at desktop and ~390px mobile; verify ES locale strings
- [x] 8.2 New E2E `e2e/guided-tour.e2e.ts` covering the flow above (inject `now` for elapsed determinism)

## 9. Final Verification (MANDATORY — once before archive)

- [x] 9.1 `pnpm verify` green (exit 0): lint + typecheck + 551 unit tests + 47 guest E2E passed. First run caught 2 typecheck errors (stale generated types, fixture) — fixed via migration push + types regen. One pre-existing flaky E2E (schedule-blocks drag reorder) passed on retry.

## 10. Update Technical Documentation (MANDATORY)

- [x] 10.1 Update `docs/data-model.md` + `docs/CLOUD.md` (dropped columns, `tour_completed`); update `docs/ARCHITECTURE.md`/`docs/frontend-standards.md` if tour module warrants a mention; remove sample-data/onboarding-wizard references
