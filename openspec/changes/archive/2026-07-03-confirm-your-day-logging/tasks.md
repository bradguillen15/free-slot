## 0. Setup

- [x] 0.1 Confirm work happens on the shared feature branch `feature/user-feedback-fixes` (created once for all three feedback changes per user instruction)

## 1. Pure confirm-day logic (TDD)

- [x] 1.1 Add failing unit tests in `src/lib/confirmDay.test.ts`
- [x] 1.2 Cover: full-block materialization; overnight one-row; full-overlap skip; partial-overlap skip (no partial fill); no-category skip; weekday filtering; idempotent re-run; category-type propagation
- [x] 1.3 Implement `src/lib/confirmDay.ts` using `visibleBlockSegments`/`durationMinutes`
- [x] 1.4 Run the tests and confirm green (8/8)

## 2. dataStore wiring (TDD)

- [x] 2.1 Add failing tests for `confirmDay(mode, userId, date)` in `dataStore.test.ts`
- [x] 2.2 Guest via `localInsertLog` loop; cloud via `resources.timeLogs.insertMany`
- [x] 2.3 Invalidate time-logs query key after confirming
- [x] 2.4 Add `useConfirmDayMutation`
- [x] 2.5 Run the tests and confirm green

## 3. Day view UI: confirm action

- [x] 3.1 `ConfirmDayButton` component, wired into `CalendarPage/index.tsx` header row next to `CalendarNav`
- [x] 3.2 Three distinct states: nothing-to-confirm, already-logged, actionable
- [x] 3.3 Success toast with confirmed count and a no-category skip hint
- [x] 3.4 Added `day.confirmDay`, `day.confirmedCount`, `day.nothingToConfirm`, `day.alreadyLogged`, `day.confirmSkippedNoCategory` to `en.ts`/`es.ts`
- [x] 3.5 `ConfirmDayButton.test.tsx` covering all three states + mutation call (4/4)

## 4. Review and update existing unit tests (MANDATORY)

- [x] 4.1 Reviewed `dataStore.test.ts` and `CalendarPage/index.test.tsx` — no breakage; `ConfirmDayButton` addition is additive and doesn't affect existing assertions
- [x] 4.2 Run `pnpm test` for the full suite and confirm all green (563/563)

## 5. Manual verification

- [x] 5.1 Exercised `buildConfirmDayRows` directly across all six scenarios; documented in `openspec/changes/confirm-your-day-logging/reports/2026-07-03-manual-verification.md`

## 6. Documentation

- [x] 6.1 Updated `docs/ARCHITECTURE.md` §5 (schedule guide vs. logged time) with a "Confirm my day" paragraph
- [x] 6.2 No new data-model fields — `docs/data-model.md` unaffected, per design.md's migration plan

## 7. Final verification

- [x] 7.1 Added `e2e/confirm-day-logging.e2e.ts`: creates a block via the dialog, confirms the day, verifies the log and idempotent re-run via reload
- [x] 7.2 Ran `pnpm verify` once — lint ✓ (1 pre-existing unrelated warning), typecheck ✓, unit tests 563/563 ✓, guest E2E 52/52 ✓
- [x] 7.3 No failures encountered
