## Why

The Month view "seems empty" and is "too crowded" on mobile (issues #4 and #5 in
[calendar-ux-improvements-plan.md](../../../docs/calendar-ux-improvements-plan.md), Phase 5): each cell
shows only a log-intensity wash plus four fixed 6-hour quick-log buttons — no actual schedule blocks or
logs, and the four buttons overflow on phones. With `buildDayCells` (Phase 3) now the single source of
day data, Month can render the real schedule/logs like Day and Week, at smaller scale.

## What Changes

- `MonthPage` consumes `useCalendarDays(firstISO, lastISO)`; each cell renders a compact **mini
  day-bar** (24h compressed) showing schedule blocks + logs as colored segments from `DayCellData`,
  reusing category colors — so the month reflects the actual schedule and logs.
- **Responsive declutter:** the full mini-bar shows from `sm:` up; on small screens the cell collapses
  to day number + a single intensity bar/dot + total. Replace the four 6-hour quarter buttons
  (`DAY_QUARTERS`) with a whole-cell tap that opens the Day view for that date.
- Keep the month stat cards and the shared `CalendarNav` (from Phase 2).

## Capabilities

### New Capabilities
- `calendar-month-content`: The Month view renders each day's real schedule blocks and logs as a
  compact mini day-bar (consistent with Day/Week via the shared builder) and is uncluttered on mobile,
  with whole-cell tap to open the day.

### Modified Capabilities
<!-- None — relies on the calendar-day-cells builder; no existing requirement changes. -->

## Impact

- `src/pages/MonthPage.tsx` — consume `useCalendarDays`; render mini day-bar from `DayCellData`;
  remove `DAY_QUARTERS` quarter buttons; whole-cell tap → Day view; responsive collapse.
- Possibly a small `MonthDayBar` presentational component for the mini-bar.
- Tests: `MonthPage.test.tsx` (cells render block/log segments with category colors; today highlighted;
  empty days render uncluttered), responsive assertion (mini-bar hidden at small breakpoint), guest e2e
  `month.e2e.ts` (schedule/logs visible; mobile viewport has no overflow/quarter-button clutter).
- No DB migration, no API change.
