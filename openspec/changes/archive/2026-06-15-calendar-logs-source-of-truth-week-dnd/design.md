## Context

`DayTimeline.tsx` already implements pointer drag for logs: `SNAP_MIN = 15`, `DRAG_CANCEL_PX = 4`,
long-press via `setTimeout`, and a callback `onLogReschedule(logId, newStartMin, newEndMin)`.
`CalendarPage::handleLogReschedule` calls `updateTimeLog(mode, userId, logId, {...})`, guards with
"Assign a category before dragging this block.", toasts, and `await refreshLogs()`. `WeekGrid.tsx`
renders log bars (`DayCellLog`) but has no drag. `updateTimeLog` currently accepts
`{ start_time, end_time, category_id, type, title?, notes? }` — no `date`. The `time_logs` table
already has a `date` column. This change adds cross-day rescheduling and brings the Day drag pattern to
Week, after `buildDayCells` (Phase 3) unified rendering and the resources layer (Phases 0–1) owns I/O.

## Goals / Non-Goals

**Goals:**
- Week log drag across time (vertical) and day (horizontal), 15-min snap, parity with Day's gesture.
- `updateTimeLog` optional `date`; guest + cloud parity (guest moves across month buckets).
- Shared reschedule callback shape `(logId, newDate, newStartMin, newEndMin)`.
- Cross-view single-source-of-truth assertion.

**Non-Goals:**
- Month drag (cells too small — revisit later).
- Dragging schedule blocks (logs only).
- Touch-gesture polish beyond Day parity.

## Decisions

- **Reuse DayTimeline's pointer logic, not `@dnd-kit`.** dnd-kit is used for ranking lists, not time
  grids; the existing long-press + snap + cancel-threshold approach already works on Day. Extract or
  mirror it for the 2D (time × day) Week grid.
- **Add a `date` axis to the callback.** Generalize Day's callback to
  `(logId, newDate, newStartMin, newEndMin)`; Day passes its current date unchanged, Week computes the
  target day from the column under the pointer. One contract for both.
- **`date` is optional on `updateTimeLog`.** Back-compatible: existing callers omit it and behavior is
  unchanged; only a changed date triggers the move logic.
- **Guest cross-bucket move in `localStore`.** Because guest logs are stored per month bucket, a date
  change that crosses months must delete-from-old + insert-into-new atomically; same-month date change
  just rewrites the field.
- **Cloud move through resources.** The `date` flows into `resources.timeLogs.update`'s patch and the
  provider maps it to the `date` column.
- **Reuse the category guard + toasts** from `CalendarPage` in a shared handler so Week behaves identically.

## Risks / Trade-offs

- [Horizontal day-detection imprecise on narrow screens] → Snap to the nearest day column center;
  require the long-press threshold before activating drag to avoid accidental day jumps on scroll.
- [Guest bucket move could drop a log on error] → Cover with a `dataStore`/`localStore` test asserting
  the log exists in exactly one bucket after a cross-month move.
- [Callback signature change touches Day] → Day is updated in the same change; tests guard it.

## Migration Plan

Frontend + localStore + resources patch; no DB migration (`date` column exists). Rollback = revert.
Verify with Vitest + guest e2e (Week drag persistence, cross-view) before done.

## Open Questions

None. (Sleep-specific overnight one-action flow is the separate `sleep-overnight-one-action` change.)
