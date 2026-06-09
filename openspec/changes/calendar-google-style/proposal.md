## Why

The day and week views behave like a read-only log viewer, not an interactive calendar. Schedule blocks are rendered at half-width in a fixed left lane (and time-log bars in a fixed right lane), so neither takes full visual space. Nothing on the timeline is clickable for editing. Creating a repeating block (e.g. "Work Mon–Fri") requires navigating away to a separate Boards & Keywords screen. These three gaps make the calendar feel passive compared to tools like Google Calendar.

## What Changes

- **Full-width blocks (day view)**: Remove the split-lane layout in `DayTimeline`. Schedule blocks and time-log bars both span the full column width. When they overlap, logs render on top of schedule blocks with a slight opacity so both are still readable.
- **Click to edit/view (day view)**: Schedule blocks and logged time bars become interactive. Clicking a schedule block opens an inline edit dialog (name, time, days, color). Clicking a logged bar opens the existing `QuickLogDialog` in edit mode.
- **Click to edit/view (week view)**: Same interaction — clicking a block or log bar in `WeekGrid` opens the appropriate edit dialog.
- **Recurrence UI (block creation/edit)**: A clear day-picker is surfaced whenever a schedule block is created or edited from the calendar timeline. Presets: Every day, Weekdays (Mon–Fri), Weekends (Sat–Sun), and a custom individual-day toggle. This uses the existing `days_of_week` field on `schedule_blocks` — no schema change needed.
- **Create block from timeline**: Right-clicking (or long-pressing) an empty hour slot opens a menu: "Log time here" (existing) vs "Add schedule block here" (new) so users can place repeating blocks without leaving the calendar.

## Capabilities

### New Capabilities
- `calendar-google-style`: Full-width blocks, click-to-edit for both block types, and recurrence day-picker in block dialogs

### Modified Capabilities
- *(none — no existing OpenSpec specs are in scope)*

## Impact

- `src/components/day/DayTimeline.tsx` — layout, pointer-events, `onBlockClick` / `onLogClick` props
- `src/components/week/WeekGrid.tsx` — same pointer-event and layout changes for block/log bars
- `src/components/day/ScheduleBlockDialog.tsx` — **new** dialog for creating/editing a schedule block (name, time, color, day recurrence picker)
- `src/components/day/QuickLogDialog.tsx` — already supports `editId`; minor prop threading
- `src/pages/CalendarPage.tsx` — wire up new callbacks and open the correct dialog
- `src/pages/WeekPage.tsx` — same wiring for week view
- No DB schema changes; no new migrations; no edge function changes
- `bun run test` must still pass
