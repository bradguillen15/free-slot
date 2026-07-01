## Why

Time entry uses the browser-native `<input type="time">`, whose popup is OS-controlled and visually inconsistent with FreeSlot's dark shadcn UI. Display is also inconsistent: timeline hour labels use 12-hour AM/PM while form inputs show 24-hour military time. Users need a themed time picker and a single preference to control how times appear across the app.

## What Changes

- Add a reusable **TimeInput** component (popover hour/minute picker) replacing native `type="time"` inputs
- Add a **time format preference** (`24h` default, optional `12h`) stored on the user profile (guest localStorage + cloud Supabase)
- Add a Settings toggle for time format; changing it updates all time displays app-wide
- Centralize display formatting via `fmtDisplayTime(hhmm, format)` and a `useTimeFormat` hook
- Remove the `::-webkit-calendar-picker-indicator` CSS hack once native inputs are gone
- Migrate `QuickLogDialog`, `ScheduleBlockDialog`, and `ScheduleEditor` to `TimeInput`

## Capabilities

### New Capabilities

- `time-format-preference`: Profile-backed 12h/24h setting with guest/cloud parity and Settings UI
- `time-input`: Custom themed time picker component (`HH:MM` value, react-hook-form compatible)

### Modified Capabilities

- (none — no existing spec governs time display or picker UX)

## Impact

- **Frontend**: `src/lib/time.ts`, new `TimeInput` component, `useTimeFormat` hook, Settings page, DayTimeline, WeekGrid, MonthPage, QuickLogDialog, ScheduleBlockDialog, ScheduleEditor, `index.css`
- **Backend**: Supabase migration adding `time_format` column to `profiles`; update profile read/write in supabase client
- **Data model**: `LocalProfile.time_format`; storage remains `HH:MM` everywhere — format is display-only
- **Tests**: Unit tests for formatting, TimeInput, Settings; update existing dialog/timeline tests; guest E2E if testids change
