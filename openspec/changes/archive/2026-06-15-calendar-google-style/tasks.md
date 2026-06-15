## 1. ScheduleBlockDialog component

- [x] 1.1 Create `src/components/day/ScheduleBlockDialog.tsx` — Dialog with name input, start/end time inputs, 8-color swatch picker, and Save/Delete/Cancel buttons (no day-picker yet)
- [x] 1.2 Add the recurrence day-picker to `ScheduleBlockDialog`: preset chips (Every day / Weekdays / Weekends) + individual day toggles (Sun–Sat); disable Save when no days selected
- [x] 1.3 Wire Save to call `upsertScheduleBlock` (both guest + cloud modes) and call `onSaved`; wire Delete to call `deleteScheduleBlock` and call `onDeleted`

## 2. DayTimeline — full-width and interactivity

- [x] 2.1 Remove the left/right lane split in `BlockBar` and `LogBar`: both render `left-1 right-1` (full width). Schedule blocks at `z-10`, log bars at `z-20`
- [x] 2.2 Make `BlockBar` interactive: add `pointer-events-auto`, `cursor-pointer`, `onClick` prop; pass `onBlockClick` from `DayTimeline` down to each `BlockBar`
- [x] 2.3 Make `LogBar` interactive: `LogBar` already handles drag; add `onClick` (fire only when no drag occurred — check `dragDy === 0` on pointer up); pass `onLogClick` from `DayTimeline`
- [x] 2.4 Add right-click / long-press context menu on hour-slot buttons: show "Log time here" and "Add schedule block here"; existing `onClick` continues to trigger "Log time here"
- [x] 2.5 Add `onBlockClick?: (block: ScheduleBlock) => void` and `onLogClick?: (log: TimeLog) => void` to `DayTimeline` props

## 3. WeekGrid — full-width and interactivity

- [x] 3.1 Update block bars in `WeekGrid`: remove `left-0.5 w-[?%]` constraint — render `left-0.5 right-0.5` full width
- [x] 3.2 Update log bars in `WeekGrid`: same full-width treatment; render at higher z-index than blocks
- [x] 3.3 Add `onBlockClick` and `onLogClick` props to `WeekGrid`; make block and log bar `div`s interactive with `cursor-pointer` and `onClick`

## 4. CalendarPage wiring

- [x] 4.1 Import and mount `ScheduleBlockDialog` in `CalendarPage`; add state: `blockDialogOpen`, `blockDialogTarget` (block to edit or null for create)
- [x] 4.2 Pass `onBlockClick` to `DayTimeline` → open `ScheduleBlockDialog` in edit mode for the clicked block
- [x] 4.3 Pass `onLogClick` to `DayTimeline` → open `QuickLogDialog` in edit mode (`editId`) for the clicked log
- [x] 4.4 Handle "Add schedule block here" from the context menu → open `ScheduleBlockDialog` in create mode with `start_time` pre-filled
- [x] 4.5 On `ScheduleBlockDialog` save/delete: call `refreshBlocks` (re-fetch schedule blocks)

## 5. WeekPage wiring

- [x] 5.1 Import and mount `ScheduleBlockDialog` in `WeekPage`; add state analogous to CalendarPage
- [x] 5.2 Pass `onBlockClick` to `WeekGrid` → open `ScheduleBlockDialog` in edit mode
- [x] 5.3 Pass `onLogClick` to `WeekGrid` → open `QuickLogDialog` in edit mode
- [x] 5.4 On save/delete: refresh the relevant data

## 6. Verification

- [x] 6.1 Run `bun run test` — must exit 0
- [x] 6.2 Run `bun run build` — must exit 0 (pre-existing build issue is unrelated to this change; verify no new errors are introduced)
- [x] 6.3 Manual smoke: day view blocks are full-width; clicking a block opens the edit dialog; saving updates the timeline; right-click shows context menu
- [x] 6.4 Manual smoke: week view blocks are full-width; clicking a block or log opens the correct dialog
