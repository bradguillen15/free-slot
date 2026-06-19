## Why

The three calendar views are inconsistent in two ways users noticed (issues #2 and #3 in
[calendar-ux-improvements-plan.md](../../../docs/calendar-ux-improvements-plan.md)):

- **Navigation order/labels differ.** Day shows `‹ · Today · ›`; Week shows `‹ · "This week" · ›`;
  Month shows `‹ · "This month" · ›`. The user wants a single, consistent **`Today ‹ ›`** order
  with the word "Today" everywhere.
- **Create affordance differs.** Day has a split FAB (**Log time** / **Add block**); Week only has
  an inline "Add block" button; Month has none. The user wants Week's create UX to match Day's.

Today these are three bespoke button clusters in `CalendarPage`, `WeekPage`, and `MonthPage`,
which drift over time.

## What Changes

- Add `src/components/calendar/CalendarNav.tsx` — a presentational nav rendering **Today, ‹, ›**
  in that order, with `onToday` / `onPrev` / `onNext` props, `todayLabel` (default "Today"),
  `aria-label`s, and stable test-ids `calendar-today` / `calendar-prev` / `calendar-next`.
- Add `src/components/calendar/CalendarCreateMenu.tsx` — extract Day's split FAB (Log time /
  Add block) into a reusable component with `onLogTime` / `onAddBlock` props and a per-view
  test-id (generalized `calendar-fab`, with id prop yielding `day-fab` / `week-fab` / `month-fab`;
  existing `data-testid="day-fab"`, `day-log-time` selectors keep working).
- Wire `CalendarNav` into all three views (replacing the bespoke clusters), rendered inside the
  existing `CalendarViewHeader` `actions` slot.
- Mount `CalendarCreateMenu` on Week (Log time + Add block) and keep Day working via the same
  component. Month create affordance is handled in the separate Month change (Phase 5); not added here.
- Presentation/structure only — no data, schema, or API change. Guest/cloud parity unaffected.

## Capabilities

### New Capabilities
- `calendar-view-consistency`: All calendar views share one navigation control (Today, prev, next)
  and one create affordance (Log time / Add block), with consistent order, labels, and test-ids.

### Modified Capabilities
<!-- None — calendar-google-style requirements are unchanged; this adds consistency wrappers. -->

## Impact

- New: `src/components/calendar/CalendarNav.tsx`, `src/components/calendar/CalendarCreateMenu.tsx`.
- `src/pages/CalendarPage/index.tsx` — use `CalendarNav`; route the split FAB through `CalendarCreateMenu`.
- `src/pages/WeekPage.tsx` — replace nav cluster with `CalendarNav`; add `CalendarCreateMenu`.
- `src/pages/MonthPage.tsx` — replace nav cluster with `CalendarNav` (create menu deferred to Phase 5).
- Tests: `CalendarNav.test.tsx`, `CalendarCreateMenu.test.tsx`; updated Week/Day guest e2e selectors.
- No DB migration, no API change.
