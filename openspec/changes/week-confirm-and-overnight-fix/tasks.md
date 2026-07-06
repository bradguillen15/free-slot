## 0. Setup: Create Feature Branch (MANDATORY - FIRST STEP)

- [x] 0.1 Create feature branch `feature/week-confirm-and-overnight-fix` — deviation: per explicit user choice, stayed on `feature/dashboard-activity-trends` instead. The prior dashboard change was committed separately first (commit `f1bdaf7`); this change's work will be committed as its own commit on the same branch rather than a new branch.
- [x] 0.2 Verify branch creation and current branch status — confirmed on `feature/dashboard-activity-trends`, working tree clean after the prior commit

## 1. Overnight tail matching in `confirmDay.ts` — TDD

- [x] 1.1 Write failing tests in `src/lib/confirmDay.test.ts` for a new exported `blockInstancesForDate(blocks, date)`: same-day instance for a normal block; same-day instance for an overnight block scheduled to start that day; an additional tail instance (dated `D-1`) for an overnight block scheduled to start the previous weekday; no tail instance for a non-overnight block regardless of previous-day scheduling; a block active every day produces both a same-day and a tail instance
- [x] 1.2 Implement `blockInstancesForDate` in `src/lib/confirmDay.ts`, exported alongside the existing types
- [x] 1.3 Update existing `confirmDay.test.ts` fixtures that use `days_of_week: [0,1,2,3,4,5,6]` for overnight blocks but only intended to exercise the same-day-start path — scope them to the specific weekday(s) needed (e.g. `[1]` for a Monday-only test) so the new tail-matching doesn't add unexpected rows to those assertions
- [x] 1.4 Run `pnpm test src/lib/confirmDay.test.ts` and confirm green (both new and adjusted tests)

## 2. Elapsed + overlap logic for tail instances — TDD

- [x] 2.1 Write failing tests for `buildConfirmDayRows`: an overnight block's tail instance (previous weekday scheduled) is confirmed and dated `D-1` once `now` is past its `end_time`; the tail instance is skipped as not-elapsed when `now` is before its `end_time`; when `now` is omitted (past-date confirm), the tail instance is elapsed immediately, matching the existing past-date convention; a tail instance already covered by an existing log dated `D-1` is skipped as `overlaps-existing` (not duplicated)
- [x] 2.2 Rework `buildConfirmDayRows` to iterate `blockInstancesForDate` output instead of the old single-weekday `active` filter; same-day instances keep the existing `hasBlockElapsed` behavior unchanged; tail instances use a plain `end_time <= now` comparison (or immediate elapse when `now` is omitted); overlap/category checks use each instance's own `date` (already supported by `visibleBlockSegments`'s `dayISO` param) and rows are pushed with that instance's `date`, not the outer confirmed date
- [x] 2.3 Run `pnpm test src/lib/confirmDay.test.ts` and confirm green — 23/23 passing

## 3. `ConfirmDayButton` uses the same instance logic

- [x] 3.1 Update `src/components/day/ConfirmDayButton.tsx`'s `activeBlockCount` calculation to use `blockInstancesForDate(blocks, date).length` instead of its own ad-hoc same-weekday-only filter, so the "nothing scheduled" vs "not elapsed yet" empty states stay consistent with what `buildConfirmDayRows` actually evaluates
- [x] 3.2 Add/update `src/components/day/ConfirmDayButton.test.tsx` (if present) covering: button reflects a confirmable tail instance from yesterday even when today's own schedule has nothing elapsed yet
- [x] 3.3 Run `pnpm test src/components/day/ConfirmDayButton.test.tsx` and confirm green — 8/8 passing

## 4. Pass unfiltered blocks to `ConfirmDayButton` on Day view

- [x] 4.1 In `src/pages/CalendarPage/index.tsx`, change the `blocks` prop passed to `ConfirmDayButton` (currently the weekday-pre-filtered `blocks` also used by `DayTimeline`) to the unfiltered `allBlocks` list — leave `DayTimeline`'s `blocks` prop untouched (it should still show only today's blocks)
- [x] 4.2 Confirm `logs` passed to `ConfirmDayButton` already spans `[date-1, date]` (it does, via existing `useTimeLogsInRange(logsStart, date)` at line 75) — no change needed there
- [x] 4.3 Run `pnpm test src/pages/CalendarPage` and confirm green — 5/5 passing

## 5. Remove Inbox from Week view

- [x] 5.1 Update `src/pages/WeekPage.tsx` tests (if present) to drop any assertions about the Inbox toggle/panel — no test file existed yet; coverage added in group 6's new `WeekPage.test.tsx`
- [x] 5.2 Remove from `src/pages/WeekPage.tsx`: the `Inbox` icon import, `useInboxItems` import/usage, `inboxOpen` state, the toggle `<button>` in the legend row, and the `AnimatePresence`/`InboxPanel` block; remove the now-unused `InboxPanel` import — also removed now-unused `motion`/`AnimatePresence` framer-motion imports (only used by the removed block)
- [x] 5.3 Remove now-unused `week.toggleInbox` / `week.inbox` keys from `src/i18n/locales/en.ts` and `es.ts` (verified via grep: only `WeekPage.tsx` referenced them; a separate unrelated `inbox` key elsewhere was left untouched)
- [x] 5.4 Run `pnpm test src/pages/WeekPage` and confirm green — deferred to group 6 (new test file); typecheck confirmed clean with zero dangling references

## 6. Add Confirm Day to Week view

- [x] 6.1 Write failing test(s) for `WeekPage`: a Confirm Day button/action appears in the header when `today` falls within the displayed week, and is absent when browsing a week that doesn't include today — created `src/pages/WeekPage.test.tsx` (no prior file existed), also covering the Inbox removal from group 5
- [x] 6.2 Add `ConfirmDayButton` (imported from `@/components/day/ConfirmDayButton`) to `src/pages/WeekPage.tsx`'s header actions row (next to `CalendarNav`), rendered only when `today >= weekStart && today <= weekEnd`, wired to `date: today`, the already-fetched unfiltered `blocks`, `logs` (already spans `[weekStart-1, weekEnd]`, a superset of `[today-1, today]`), and `allCategories`
- [x] 6.3 Run `pnpm test src/pages/WeekPage` and confirm green — 2/2 passing. **Additional fix found and applied while implementing this**: the real `confirmDay` mutation function (`src/lib/dataStore.ts`) independently re-fetches its own data and was only fetching logs for the single confirmed date (`listLogsInRange(date, date)`), not `[date-1, date]` — this would have broken overlap/idempotency detection for tail instances in actual use (only the preview path passed via props had the correct range). Fixed to fetch `[date-1, date]` in both guest and cloud branches, with a new regression test in `src/lib/dataStore.test.ts` (`confirmDay > guest mode confirms an overnight block's tail instance, dated the previous day`).

## 7. Review and Update Existing Unit Tests (MANDATORY)

- [x] 7.1 Grep for any other consumers of the old single-weekday `active` filtering pattern or direct duplication of `confirmDay`'s matching logic that might need the same instance-based treatment (e.g. any other place computing "which schedule blocks apply to date X") — clean, only `confirmDay.ts` itself matched, now using the new helper
- [x] 7.2 Run `pnpm test` for the full touched area (`src/lib/confirmDay.test.ts`, `src/components/day/`, `src/pages/CalendarPage/`, `src/pages/WeekPage.tsx`) and confirm all green with no skipped/broken suites — 9 files, 103 tests, all passing

## 8. Update E2E for changed flows (MANDATORY — user-visible flows changed)

- [x] 8.1 Update `e2e/confirm-day-logging.e2e.ts`: add a scenario confirming an overnight Sleep block from the day after it starts (simulate elapsed time via `page.clock`), verifying the resulting log is dated the previous day
- [x] 8.2 Add/update a Week view E2E scenario: Inbox toggle is no longer present on Week view; a Confirm Day action is present and functional when viewing the week containing today — created `e2e/week-view.e2e.ts` (no prior week-specific spec existed)
- [x] 8.3 Run `pnpm test` (unit) once more after E2E spec updates to confirm no regressions from selector/testid changes — 75 files, 603 tests, all passing; new e2e specs also run standalone and pass (3/3)

## 9. Final verification (MANDATORY once before archive — AGENT MUST EXECUTE)

- [x] 9.1 Run `pnpm verify` (lint + typecheck + unit tests + guest E2E) once, after all implementation tasks are complete — ran as `pnpm verify:fast` + `pnpm test:e2e` separately
- [x] 9.2 Fix any failures surfaced by `pnpm verify` before proceeding — the full E2E run (unlike scoped per-file runs during implementation) surfaced two real issues, both now fixed:
  1. **Scope correction**: `e2e/daily-notes.e2e.ts` had 3 tests ("guest inbox — week view") exercising the Inbox toggle that no longer exists. Investigation showed Week view was the Inbox feature's *only* UI entry point app-wide — removing it made the feature fully unreachable, not just relocated, contradicting the proposal's original assumption. Paused and asked the user; they chose to delete the feature entirely. Deleted `InboxPanel.tsx` + its test, the 3 e2e specs, and now-unused `notes.inbox*` i18n keys; left the backend/data layer (`useInboxItems` hooks, resource layer, possible DB table) in place and flagged as a separate follow-up task, since dropping a table is a data-safety decision outside this change's scope.
  2. `e2e/guided-tour.e2e.ts` asserted 3 confirmed logs (Work, Work, Lunch) after the tour's Confirm Day step; the overnight fix correctly adds a 4th (Sleep, dated the previous day, previously silently dropped by the bug) — updated the assertion to expect 4 logs.
- [x] 9.3 Manually preview in the browser (dev server): seed a recurring overnight Sleep block, advance the clock past its end time, confirm today, and verify a log dated yesterday appears; verify Week view no longer shows Inbox and does show a working Confirm Day action for the current week

## 10. Update Technical Documentation (MANDATORY)

- [x] 10.1 Update `docs/ARCHITECTURE.md` (or wherever confirm-day is documented) to describe the same-day vs. overnight-tail instance matching — added a dedicated "Confirm Day" paragraph; also updated the `inbox_items` table description there, in `docs/CLOUD.md`, and in `docs/data-model.md` to reflect the UI removal (flagged as pending backend follow-up, not stale/misleading)
- [x] 10.2 Sync `openspec/specs/confirm-day-logging/spec.md` via the change's delta at archive time (handled by `/opsx:archive`, not a manual doc edit now)
