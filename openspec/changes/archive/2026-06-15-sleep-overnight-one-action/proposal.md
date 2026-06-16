## Why

The user's real sleep rarely matches the recurring Sleep block, and adjusting one night used to take
two actions (edit yesterday's tail + log this morning) without mutating the recurring template. The
foundations are already shipped — overnight logging (`time_logs` with end ≤ start) and
logs-clip-planned-blocks landed in the archived `schedule-actual-precedence` change. What remains
(Tier 1 of [sleep-overnight-logging-plan.md](../../../docs/sleep-overnight-logging-plan.md)) is making
overnight sleep a **one-action** flow: a Sleep preset and cross-midnight drag.

## What Changes

- Add a **"Sleep" quick preset** to the shared create menu (`CalendarCreateMenu`) that opens
  `QuickLogDialog` pre-filled with an overnight span (last night's bedtime → this morning) and the
  existing default **Sleep** category (reused as seeded; created on first use if absent).
- Ensure a logged overnight sleep is a **single** `time_log` row (end ≤ start), with a visible
  "next day" indicator on the end time in the dialog.
- Make the cross-midnight move one action: dragging/editing an overnight log mutates the single row
  (and may change its `date`), reusing the `date`-aware `updateTimeLog` and Week drag from the
  logs-source-of-truth change (Phase 4).
- Confirm (regression) that logging actual sleep clips the planned Sleep block on the prior day's tail
  without editing the recurring template.

> **Tier 2 (per-instance block exceptions / schema change) is out of scope** and remains a documented
> follow-up. Sleep `type` is **not** redefined: the preset reuses the existing default Sleep category
> exactly as seeded (currently `productive`), resolving plan question Q3 by deferring to the seed.

## Capabilities

### New Capabilities
- `sleep-quick-logging`: A one-action way to record or adjust overnight sleep — a Sleep preset that
  prefills an overnight single-row log with the Sleep category, plus a cross-midnight one-action move —
  without mutating the recurring schedule.

### Modified Capabilities
<!-- None — overnight-time-logging and schedule-guide-precedence already exist; this adds the preset/flow on top. -->

## Impact

- `src/components/calendar/CalendarCreateMenu.tsx` — add a "Sleep" preset item.
- `src/components/day/QuickLogDialog.tsx` — accept the prefilled overnight span; add a "next day"
  end-time indicator (if not already shown).
- Sleep category lookup/creation helper (reuse `DEFAULT_CATEGORY_SEED` "Sleep").
- Reuses `updateTimeLog({ date })` + Week drag from `calendar-logs-source-of-truth-week-dnd`.
- Tests: `QuickLogDialog.test.tsx` (overnight accepted, single row, next-day hint), create-menu test
  (Sleep preset prefills overnight + Sleep category), guest e2e `sleep.e2e.ts` (one-action overnight,
  clip of prior-day tail, morning shows next day, persists on reload).
- No DB migration (Tier 1).
