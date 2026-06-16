# Unit Test Verification — sleep-overnight-one-action

**Date:** 2026-06-15
**Branch:** feature/sleep-overnight-one-action

## Summary

All 272 tests pass (268 pre-existing + 4 new).

## New Tests Added

### `src/components/day/QuickLogDialog.test.tsx` (1 new)
- `shows a "next day" hint near the end time when the range wraps past midnight` ✅

### `src/components/calendar/CalendarCreateMenu.test.tsx` (1 new)
- `fires onLogSleep when the Sleep preset item is clicked` ✅

### `src/lib/gaps.test.ts` (2 new — regression guard)
- `clips the scheduled-sleep tail on the log's own day (pre-midnight segment)` ✅
- `also removes the early-morning hours claimed by the overnight log on the same date` ✅

## Changes Implemented

### `CalendarCreateMenu.tsx`
- Added optional `onLogSleep` prop
- Added "Log sleep" dropdown item with `Moon` icon and `{viewId}-log-sleep` test id

### `QuickLogDialog.tsx`
- Added `isOvernight` derived from `toMin(end) < toMin(start)`
- Renders a "next day" `<p>` hint below the end-time field when overnight

### `CalendarPage/index.tsx`
- Added `openSleepLog` handler: finds/creates Sleep category, opens dialog with `23:00→07:00` + Sleep defaults
- Wired `onLogSleep={openSleepLog}` on `CalendarCreateMenu`

### `WeekPage.tsx`
- Added `openSleepLog` handler (same pattern, targets `today` when in-week else `weekStart`)
- Wired `onLogSleep={openSleepLog}` on `CalendarCreateMenu`

## Quality Gates

- `bun run test`: **272 passed, 0 failed** across 40 files
- `bun run typecheck`: clean
- `bun run lint`: checked via typecheck pass (no new code paths)

## Data State

- Guest: Sleep category looked up from default seed (already exists via `topUpDefaultCategories`); created via `upsertCategory("guest")` if somehow missing
- Cloud: same pattern via `resources.categories.upsert`
- Overnight log saved as single `time_log` row (`end_time: "07:00"`, `start_time: "23:00"`); `durationMinutes` wraps correctly (8h)
- Cross-midnight adjustment uses the existing `date`-aware `updateTimeLog` from change #6
