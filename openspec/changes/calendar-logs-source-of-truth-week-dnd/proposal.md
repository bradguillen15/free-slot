## Why

Logs are meant to be the single source of truth rendered across views, but today the Day timeline
supports drag-to-reschedule while Week is click-only, and a log can't be moved to a different day by
gesture. This is issues #7 and #8 in
[calendar-ux-improvements-plan.md](../../../docs/calendar-ux-improvements-plan.md) (Phase 4), built on
the `buildDayCells` foundation (Phase 3) and the resources layer (Phases 0–1).

## What Changes

- Extend `updateTimeLog` with an optional new `date` so a log can move across days; guest
  (`localStore`, moving it across month buckets) and cloud (via `resources.timeLogs.update`) parity.
- Add pointer drag to `WeekGrid` log bars mirroring `DayTimeline` (long-press + `DRAG_CANCEL_PX`
  threshold, 15-min `SNAP_MIN`): **vertical = time**, **horizontal = day**. Emit
  `onLogReschedule(logId, newDate, newStartMin, newEndMin)`.
- Generalize the Day reschedule callback shape to include the (possibly unchanged) date so Day and
  Week share the contract.
- Wire `WeekPage` to `updateTimeLog` + `refreshLogs`, reusing `CalendarPage::handleLogReschedule`'s
  "assign a category before dragging" guard and toasts.
- Confirm cross-view single source of truth: a log created/edited/dragged in any view appears in Day,
  Week, and Month (Month rendering lands in the separate Phase 5 change; the data path is shared here).

> Month drag is out of scope (cells too small). Schedule-block drag is out of scope (logs only).

## Capabilities

### New Capabilities
- `calendar-log-rescheduling`: Logs can be dragged to reschedule in the Week view across both time and
  day, persisting through `updateTimeLog` (with optional `date`) in guest and cloud, and a log edited
  in any view is reflected consistently in the others.

### Modified Capabilities
<!-- None — extends behavior via a new capability; updateTimeLog's date field is additive/back-compatible. -->

## Impact

- `src/lib/dataStore.ts` — `updateTimeLog` input gains optional `date`; cloud path via
  `resources.timeLogs.update`, guest via `localStore` (cross-bucket move).
- `src/lib/localStore.ts` — move a log across month buckets when `date` changes.
- `src/resources/time-logs.ts` + provider — accept `date` in the update patch.
- `src/components/week/WeekGrid.tsx` — pointer drag on log bars (time + day), `onLogReschedule`.
- `src/components/day/DayTimeline.tsx` + `src/pages/CalendarPage/index.tsx` — callback shape includes date.
- `src/pages/WeekPage.tsx` — reschedule handler with category guard.
- Tests: `dataStore.test.ts` (date move, guest bucket move), `WeekGrid.test.tsx` (drag → snapped
  time + new date, category-less log blocked), guest e2e (Week drag persistence + cross-view).
- No DB migration (the `date` column already exists).
