# Unit Test Verification — calendar-logs-source-of-truth-week-dnd

**Date:** 2026-06-15
**Branch:** feature/calendar-logs-source-of-truth-week-dnd

## Summary

All 268 tests pass (262 pre-existing + 6 new).

## New Tests Added

### `src/lib/dataStore.test.ts` (3 new)
- `updateTimeLog — guest same-month: updates the date in-place` ✅
- `updateTimeLog — guest cross-month: log exists in exactly one bucket after move` ✅
- `updateTimeLog — cloud: passes date to resources.timeLogs.update` ✅

### `src/resources/_providers/supabase/client.writes.test.ts` (1 new)
- `includes date in the supabase update payload when provided` ✅

### `src/components/week/WeekGrid.test.tsx` (2 new)
- `fires onLogReschedule with snapped time and detected day after drag` ✅
- `does not fire onLogReschedule when log has no category_id` ✅

## Test Infrastructure Fix

Added `PointerEvent` polyfill to `src/test/setup.ts`. jsdom 20 does not include `PointerEvent`; without the polyfill, `fireEvent.pointerDown` falls back to the base `Event` class which lacks `clientX`/`clientY`. The polyfill extends `MouseEvent` so coordinate properties work correctly.

## Quality Gates

- `bun run test`: **268 passed, 0 failed** across 40 files
- `bun run typecheck`: clean
- `bun run lint`: 0 errors (3 pre-existing unused-disable warnings)

## Data State

- Guest: `localStore.moveLog()` handles same-month and cross-month bucket moves; verified via `listLogsForMonth()`
- Cloud: `resources.timeLogs.update()` receives `date` in patch; verified via supabase mock call inspection
