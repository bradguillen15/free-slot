## Context

The three calendar pages render their own header action clusters into the shared
`CalendarViewHeader` `actions` slot (`src/components/calendar/CalendarViewHeader.tsx`):

- `CalendarPage/index.tsx`: prev/Today/next nav + a split FAB DropdownMenu (`data-testid="day-fab"`,
  items `day-log-time` and an Add-block item).
- `WeekPage.tsx`: an inline "Add block" outline button, then `‹`, "This week", `›`.
- `MonthPage.tsx`: `‹`, "This month", `›` (no create affordance).

The header wrapper already standardizes layout; only the inner controls drift. This change extracts
two presentational components and feeds them through the existing `actions` slot.

## Goals / Non-Goals

**Goals:**
- One nav component (Today, ‹, ›) used by all three views with consistent labels and test-ids.
- One create component (Log time / Add block) used by Day and Week.
- No behavior change to what the buttons do — only their shape, order, and reuse.

**Non-Goals:**
- Month's create affordance and the Month cell redesign (handled in `calendar-month-content`, Phase 5).
- Drag-to-reschedule, data-layer, or `buildDayCells` work (later phases).
- Changing `CalendarViewHeader` itself.

## Decisions

- **Two small presentational components, not one mega-toolbar.** `CalendarNav` and
  `CalendarCreateMenu` compose independently into `actions`, matching the existing slot pattern.
  Alternative (a single `CalendarToolbar` owning both) rejected: Month wants nav without the Day
  create menu, so independent composition is cleaner.
- **`CalendarNav` is fully controlled (callback props).** Each page keeps owning its date state
  (`weekStart`, `year/month`, day cursor); the component only renders and emits intents. Keeps the
  component pure and trivially testable.
- **Generalize the FAB test-id but preserve Day selectors.** Use a `viewId` prop producing
  `${viewId}-fab` (`day-fab`, `week-fab`) and keep the item test-ids (`*-log-time`, `*-add-block`)
  so existing Day e2e selectors don't break. Alternative (renaming to `calendar-fab` only) rejected
  to avoid breaking the Day suite.
- **"Today" label everywhere.** Drop "This week"/"This month" per the user's request; `todayLabel`
  defaults to "Today" but stays a prop for i18n.
- **i18n:** route visible strings through `react-i18next` (already used in these pages).

## Risks / Trade-offs

- [Existing e2e selectors could break] → Preserve `day-fab` / `day-log-time`; add aliases rather
  than renames; update Week e2e to the new `week-fab`.
- [Nav reorder changes muscle memory] → Intentional per the user's explicit request (issue #3).

## Migration Plan

Frontend-only; ships with the code. Revert is the diff. No data migration.

## Open Questions

None — Month's create affordance is intentionally deferred to the Month change.
