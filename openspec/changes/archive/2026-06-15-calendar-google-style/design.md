## Context

The current `DayTimeline` divides the column into two fixed horizontal lanes: schedule blocks on the left 46% and time logs on the right 46%. This was a simple collision-avoidance strategy, but it makes blocks look narrow and disconnected from the rest of the UI. Google Calendar solves overlap with a columnar subdivision algorithm; for FreeSlot's simpler use-case (no all-day events, one user's blocks) a lighter approach works.

`WeekGrid` has the same hard-coded partial-width values for both block and log bars.

Neither component registers click handlers — both sets of bars are `pointer-events-none` inside a container that only handles hour-slot clicks.

## Goals / Non-Goals

**Goals**
- Full-width blocks in both day and week views
- Click-to-edit for schedule blocks (new `ScheduleBlockDialog`) and time logs (existing `QuickLogDialog`)
- Recurrence day-picker surfaced directly in the block dialog
- "Add block here" from right-click context menu on the timeline
- Guest + cloud parity (use `dataStore` functions throughout)

**Non-Goals**
- Multi-day events or all-day banner row
- Complex overlap sub-column algorithm (Google Calendar style with arbitrary simultaneous events)
- Drag-to-create new blocks (drag-to-reschedule existing logs already works)
- Push notifications or reminders for recurring blocks

## Decisions

### Full-width with z-index layering instead of lanes

**Decision**: Remove the left/right lane split. Both `BlockBar` and `LogBar` render `left-1 right-1` (full width). Schedule blocks render at `z-10`; log bars render at `z-20` so they sit on top. The schedule block is given `opacity: 0.35` when a log overlaps it (handled by a simple time-overlap check in the parent).

**Rationale**: The lane split was a workaround — logs and blocks rarely cover exactly the same time range. Full-width with layering is how every real calendar app works. A full overlap-detection algorithm (splitting columns per simultaneous event count) is over-engineered for a personal app where the number of simultaneous blocks at any hour is almost always ≤ 2.

**Alternative considered**: Keep lanes but make them wider (60/40 split). Rejected — still feels narrow and still doesn't solve clickability.

### New `ScheduleBlockDialog` component

**Decision**: Create `src/components/day/ScheduleBlockDialog.tsx`. It is a `Dialog` (shadcn) with:
- Name `Input`
- Start / end time `Input` (type="time")
- Color swatch picker (8 preset colors matching the existing palette)
- Day recurrence picker (preset chips + individual day toggles)
- Save / Delete / Cancel buttons

It receives `block?: ScheduleBlock` (undefined = create mode) and callbacks `onSaved` / `onDeleted` / `onClose`.

**Rationale**: The existing `QuickLogDialog` pattern is proven — replicate it for blocks rather than bolt recurrence onto a generic form.

### Right-click context menu for "Add block here"

**Decision**: Replace the current `<button onClick={...}>` per-hour click zones in `DayTimeline` with elements that handle both `onClick` (existing log behaviour) and `onContextMenu` (new context menu). The context menu is a small absolutely-positioned `div` with two items rendered at the cursor position, dismissed on outside click or Escape.

**Alternative considered**: Long-press on mobile. Added as a `onPointerDown` timer fallback (500 ms hold triggers context menu) since mobile users can't right-click.

### Prop additions — minimal surface area

`DayTimeline` gains two new optional callbacks:
```ts
onBlockClick?: (block: ScheduleBlock) => void;
onLogClick?: (log: TimeLog) => void;
```
Both default to `undefined`; when absent the bars remain non-interactive (no behaviour regression on screens that embed the timeline without wiring these).

`WeekGrid` gains:
```ts
onBlockClick?: (block: { id: string; name: string; color: string; /* ... */ }) => void;
onLogClick?: (iso: string, log: { id: string; /* ... */ }) => void;
```

### dataStore — no new functions needed

`upsertScheduleBlock`, `deleteScheduleBlock`, `updateTimeLog`, `insertTimeLog` already exist and support both modes. `ScheduleBlockDialog` will call these directly.

## Risks / Trade-offs

- **Touch devices**: right-click context menu requires a long-press fallback. A 500 ms `pointerdown` timer is standard but slightly tricky to cancel on scroll — mitigated by clearing the timer on `pointermove` beyond a 4 px threshold.
- **Overlap opacity**: reducing a block's opacity when a log overlaps is a visual heuristic, not an exact pixel match. Accepted — it's a readable approximation.

## Migration Plan

1. Build `ScheduleBlockDialog` (standalone, no calendar changes yet).
2. Update `DayTimeline`: full-width bars, pointer-events, `onBlockClick`/`onLogClick`, context menu.
3. Update `WeekGrid`: same.
4. Wire `CalendarPage` — open correct dialog on each callback.
5. Wire `WeekPage` — same.
6. Run `bun run test`, verify no regressions.

## Open Questions

- *(none)*
