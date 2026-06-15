## Context

`MonthPage.tsx` currently builds month cells from `useTimeLogsInRange` only, rendering a per-day total
with an intensity wash (`opacity` from `total / maxDay`) and four fixed `DAY_QUARTERS` 6-hour quick-log
buttons (`openQuickLogForQuarter`). It ignores schedule blocks. After `calendar-builddaycells-foundation`
provides `useCalendarDays(start, end)` and `DayCellData[]`, Month can render the same block/log data as
Day and Week, scaled down, and shed the crowded quarter buttons.

## Goals / Non-Goals

**Goals:**
- Month reflects real schedule + logs via the shared builder.
- Mobile cells are uncluttered (no quarter-button overflow); whole-cell tap opens the day.
- Visual consistency (category colors) with Day/Week.

**Non-Goals:**
- Month drag-to-reschedule (cells too small — out of scope).
- A Month create menu (tap-to-day replaces the quarter quick-logs; create stays on Day/Week).
- Changing the builder or data layer.

## Decisions

- **Consume `useCalendarDays` for the full month range** (first..last cell, 28–42 days) and render
  from `DayCellData`. Single source of truth with Day/Week. Alternative (keep Month's bespoke
  log-only fetch) rejected — that's the drift this program removes.
- **Compact mini day-bar component.** A small `MonthDayBar` maps each block/log segment to a positioned
  colored tick on a 24h-compressed track, reusing the segment math already in `DayCellData`. Keeps
  `MonthPage` declarative.
- **Responsive via Tailwind breakpoints.** Mini-bar `hidden sm:block`; on mobile show day number +
  one intensity bar + total. Matches the project's ~390px phone target and avoids horizontal overflow.
- **Whole-cell tap → Day view** replaces `DAY_QUARTERS`. Simpler, declutters mobile (#5), and routes
  users to the full Day affordances. Drop `openQuickLogForQuarter` and `DAY_QUARTERS`.
- **Keep month stat cards and shared `CalendarNav`.**

## Risks / Trade-offs

- [Mini-bar legibility at month scale] → Use thin segments + intensity fallback; verify at desktop and
  ~390px in preview.
- [Removing quarter quick-log changes a workflow] → Tap-to-day plus Day/Week create menus cover it; the
  quarter buttons were the crowding source the user complained about.
- [Full-month fetch slightly larger range] → Same hooks/keys as Week; React Query caches per range.

## Migration Plan

Frontend only; ships with code. Rollback = revert. No DB/API change. Verify with Vitest + guest
`month.e2e.ts` + preview at desktop and phone widths.

## Open Questions

None.
