## Why

When two time logs (or a schedule block and a log) overlap in time, they currently stack on top of each other — one is hidden behind the other. This makes it impossible to see simultaneous activities, which is a core use-case (e.g. a recurring meeting block while a logged activity runs at the same time).

## What Changes

- The day-view timeline detects overlapping segments among logs (and between logs and blocks) and renders them side by side in column lanes — identical to Google Calendar's behaviour.
- Each item in an overlap group receives a proportional fraction of the column width and an `x` offset.
- Non-overlapping items continue to render full-width as before.
- Drag-to-reschedule continues to work for items in any lane.
- Schedule blocks that are fully clipped by logged time remain hidden as before; only the visible portion participates in collision layout.

## Capabilities

### New Capabilities

- `timeline-collision-layout`: Detect overlapping time segments in the day view and assign lane positions so overlapping items render side by side at fractional widths.

### Modified Capabilities

*(none — no spec-level requirement changes to existing capabilities)*

## Impact

- `src/components/day/DayTimeline.tsx` — new collision-layout utility + updated `BlockBar` / `LogBar` positioning props
- `src/lib/daySegments.ts` — may add a helper for computing collision groups
- `src/components/day/DayTimeline.test.tsx` — new unit tests for collision grouping logic
- No backend changes, no API changes, no new dependencies
