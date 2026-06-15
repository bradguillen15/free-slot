## Context

`WeekPage.tsx` builds `dayCells: DayCellData[]` in a `useMemo` (around lines 106–168): for each day it
filters blocks/logs, computes `gaps` via `findFreeWindows`, expands block/log spans with `expandRange`
(overnight-aware), maps category colors via a local `catMap`, flags peak gaps, and sums `totalFree`.
The cell types (`DayCellData`, `DayCellBlock`, `DayCellLog`, `AISlotSeg`) are defined in
`WeekGrid.tsx`. Day (`CalendarPage`) and Month (`MonthPage`) assemble their own variants — Month
ignores blocks and shows only a per-day total + intensity wash. This drift is why a log created in one
view doesn't render consistently in others.

## Goals / Non-Goals

**Goals:**
- One pure, tested builder (`buildDayCells`) that produces `DayCellData[]`.
- A `useCalendarDays(start, end)` hook wrapping existing dataStore hooks + the builder.
- Week consumes it with zero visual change.

**Non-Goals:**
- Day and Month adoption (Phase 4 / Phase 5 changes consume this builder).
- Drag-to-reschedule, the `date` extension, or Month redesign.
- Any change to `findFreeWindows`, `expandRange`, or `segmentsForDay` internals.

## Decisions

- **Lift the WeekPage memo verbatim into `calendarDays.ts`.** Copy the exact logic so behavior is
  provably identical, then have WeekPage call it. Reduces risk versus a reimplementation.
- **Builder is pure; the hook is the only React surface.** `buildDayCells` takes plain inputs (days,
  blocks, logs, categories, profile, aiPlan) and returns data — trivially unit-testable with fixtures.
  `useCalendarDays` composes `useTimeLogsInRange` + `useScheduleBlocks` + `useVisibleCategories` +
  profile and calls the builder in a memo.
- **Types move to `calendarDays.ts`, re-exported from `WeekGrid`.** Keeps existing
  `import { DayCellData } from "@/components/week/WeekGrid"` working while the canonical home becomes
  the lib module. Alternative (leave types in WeekGrid) rejected: the builder shouldn't import a
  component for its return type.
- **`days` is an input, not derived inside the builder.** Callers pass the date list (week = 7 days,
  month = 28–42), so the same builder serves Week and Month.

## Risks / Trade-offs

- [Behavioral drift during extraction] → `calendarDays.test.ts` pins overnight attribution, gaps,
  peak, totals, AI passthrough; existing Week tests guard the integration.
- [Hook fetch shape differs from WeekPage's current fetches] → Use the exact same dataStore hooks
  WeekPage already uses, so React Query keys and caching are unchanged.

## Migration Plan

Pure refactor; ships with code. Rollback = revert. No DB/API change.

## Open Questions

None.
