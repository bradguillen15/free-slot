## Why

Day, Week, and Month each independently assemble blocks/logs/categories/gaps into render data, with
drift (Month ignores blocks entirely; Week recomputes its own `catMap`). To make logs a **single
source of truth** rendered identically everywhere, the assembly must live in one tested place. This is
the foundation refactor (Phase 3) in
[calendar-ux-improvements-plan.md](../../../docs/calendar-ux-improvements-plan.md) that unblocks
issues #4, #7, #8.

## What Changes

- Add a pure builder `src/lib/calendarDays.ts`: `buildDayCells({ days, blocks, logs, categories,
  profile, aiPlan? }) → DayCellData[]`, lifting the existing `WeekPage` `dayCells` memo verbatim
  (gaps via `findFreeWindows`, overnight-aware segments via `expandRange`, peak flag, AI slots
  passthrough, per-day free totals).
- Move the `DayCellData` / `DayCellBlock` / `DayCellLog` / `AISlotSeg` types to `calendarDays.ts`
  (re-export from `WeekGrid` for compatibility).
- Add a thin hook `useCalendarDays(startISO, endISO)` over the existing dataStore hooks
  (`useTimeLogsInRange`, `useScheduleBlocks`, `useVisibleCategories`, profile) that returns
  `DayCellData[]` via `buildDayCells`.
- Refactor `WeekPage` to consume `useCalendarDays` / `buildDayCells` — **no visual change** (pure
  refactor guarded by existing tests).
- Day and Month adoption happens in their own later changes (Phase 4 / Phase 5); this change only
  extracts the builder and migrates Week.

## Capabilities

### New Capabilities
- `calendar-day-cells`: A single, tested pure builder (and hook) that turns blocks + logs + categories
  + profile into per-day render cells (`DayCellData[]`), used by all calendar views so logs/blocks
  render identically everywhere.

### Modified Capabilities
<!-- None — Week's rendered output is unchanged; this is an internal extraction. -->

## Impact

- New: `src/lib/calendarDays.ts` (builder + types), `useCalendarDays` hook (in `dataStore.ts` or
  `src/hooks/useCalendarDays.ts`).
- `src/components/week/WeekGrid.tsx` — types re-exported from `calendarDays.ts`.
- `src/pages/WeekPage.tsx` — consume the builder/hook; drop the inline `dayCells` memo and local `catMap`.
- Tests: `calendarDays.test.ts` (overnight attribution, gaps, peak, AI passthrough); existing
  `WeekGrid`/WeekPage tests stay green.
- No DB migration, no API change.
