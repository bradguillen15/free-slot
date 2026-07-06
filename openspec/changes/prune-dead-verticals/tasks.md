# Tasks: prune-dead-verticals

## 0. Setup (MANDATORY - FIRST STEP)

- [x] 0.1 Create branch `feature/prune-dead-verticals` from up-to-date `main`.
- [x] 0.2 Baseline: full `pnpm test` green count recorded.

## 1. Daily notes → AI plan (TDD)

- [x] 1.1 Add failing cases to `supabase/functions/_shared/planning.test.ts`: notes block appears in the plan prompt; note text truncated at cap; note count capped.
- [x] 1.2 Add cap helpers to `_shared/planning.ts` (or the function) and read `body.daily_notes` in `generate-weekly-plan/index.ts`; add structural sanity caps (gaps/activities lengths) returning 400 when exceeded.
- [x] 1.3 Remove `inbox_items` from `AIPlanPanel` payload, `ResourcesProvider.functions.generateWeeklyPlan` type, and `buildPlanPrompts` (+ its inbox tests).

## 2. Delete the inbox vertical

- [x] 2.1 Remove dataStore inbox hooks + `useOptimisticListMutation`; `queryKeys.inboxItems`; localStore inbox functions/`LocalInboxItem`; migration step 8 (`getGuestInboxItems` import).
- [x] 2.2 Remove `resources.inboxItems` (types.ts interface, supabase client impl, mappers, `types/inboxItem.ts`, index re-export, mockResourcesProvider, `client.writes.test.ts` blocks).
- [x] 2.3 Remove inbox support from `e2e/fixtures/guest.ts` and `AIPlanPanel.test.tsx` mocks.

## 3. Delete the weekly-review vertical

- [x] 3.1 Remove dataStore `useWeeklyReview`/`useGenerateWeeklyReviewMutation`/`invalidateWeeklyReview`; `queryKeys.weeklyReview`; `src/lib/weeklyReview.ts` (+ test).
- [x] 3.2 Remove `resources.weeklyReviews` + `functions.generateWeeklyReview` (interface, impl, mappers, `types/weeklyReview.ts`, index re-export, mock, provider tests).
- [x] 3.3 Delete `supabase/functions/weekly-review/`; remove `buildReviewPrompts`/`buildReviewGeminiBody` (+ their tests) from `_shared`.
- [x] 3.4 SettingsPage: remove the weekly-review-day form field, zod entry, save mapping, and related test assertions; remove `settings.weeklyReviewDay`-family i18n keys from `en.ts`/`es.ts` (keep en/es parity).

## 4. Migration fidelity (TDD)

- [x] 4.1 Failing test in `migrateGuest.test.ts`: migrated log carries `note_json`. Then add the field to the mapping.

## 5. Dead-export sweep

- [x] 5.1 Delete `src/lib/celebrate.ts` + `celebrate.test.ts` (fully orphaned module).
- [x] 5.2 Delete unused exports: `useMode` (dataStore), `getResourcesProvider` (resources/index), `segmentsForDay` (daySegments), `edgeFunctionErrorMessage` (supabase client). Un-export same-file-only symbols (`monthKey`, `listAllLogs`, `listAllPriorities`, `defaultQueryClientOptions`, `timelineBarBaseClassName`, WeekGrid px constants, `EMPTY_TIPTAP_DOC`, `PLANNED_SUFFIX`) — only where no test imports them; verify each with grep before touching.
- [x] 5.3 Check `sonar-project.properties` / `vitest.config.ts` coverage lists for references to deleted files.

## 6. Edge hardening

- [x] 6.1 CORS: `ALLOWED_ORIGIN` env with `*` fallback in `generate-weekly-plan` and `delete-account`; document the secret in `docs/CLOUD.md`.

## 7. Review and Update Existing Unit Tests (MANDATORY)

- [x] 7.1 Only tests exercising deleted code are removed/updated (enumerated in design D5); all others pass unmodified.

## 8. Run Unit Tests and Verify State (MANDATORY - AGENT MUST EXECUTE)

- [x] 8.1 Per-phase gates: `npx tsc --noEmit`, `pnpm lint`, `pnpm test`. Full suite after phase 6.
- [x] 8.2 Report at `openspec/changes/prune-dead-verticals/reports/<date>-step-8-unit-test-and-state-verification.md` (jsdom localStorage only; no external DB state; curl step N/A — record justification: the only endpoint change is covered by planning unit tests, and edge functions need deployed infra which CD exercises).

## 9. Final verification (MANDATORY once - AGENT MUST EXECUTE)

- [x] 9.1 Update `e2e/fixtures/guest.ts` (task 2.3) — no spec flows change otherwise; confirm no deleted testids are referenced in `e2e/*.e2e.ts`.
- [x] 9.2 `pnpm verify` once (lint + typecheck + unit + guest E2E); fix failures before PR.

## 10. Documentation & hygiene (MANDATORY)

- [x] 10.1 Update `docs/ARCHITECTURE.md`, `docs/data-model.md`, `docs/api-spec.yml`, `docs/CLOUD.md`, `src/resources/README.md` — remove weekly-review/inbox references, note retained-but-unused tables, document `ALLOWED_ORIGIN`.
- [x] 10.2 Add the test-time rule to `docs/development_guide.md` (or frontend-standards testing section): subjects branching on `todayISO()`/`new Date()` require faked timers; no literal dates the calendar can reach.
- [x] 10.3 Archive stale/completed OpenSpec changes (archived: dashboard-schedule-vs-actual [--skip-specs, superseded], solid-data-layer-refactor, dashboard-activity-trends, dashboard-redesign, frontend-sentry-observability, notes-page, week-confirm-and-overnight-fix; remaining with open tasks or failing validation: daily-notes, notes-tab, overlapping-events, resources-enforcement-docs, sonarqube-code-quality, custom-time-picker, guided-first-run-tour, migrate-anthropic-to-gemini, month-view-vertical, ui-cleanup): `dashboard-schedule-vs-actual` (superseded, never shipped — archive without spec sync), and completed ones whose code is on main (`solid-data-layer-refactor`, `dashboard-activity-trends`, `week-confirm-and-overnight-fix`, `ui-cleanup`, `sonarqube-code-quality`, `notes-*`, etc. — verify each is actually implemented before archiving; sync delta specs where applicable).
