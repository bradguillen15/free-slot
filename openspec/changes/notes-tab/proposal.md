## Why

The daily note editor exists only in the Day view panel, buried beneath the timeline. Users who want to jot quick thoughts, capture a recurring intention, or review notes across days have no dedicated place for them — and the rich text capability stops at the daily note level (schedule blocks and activity logs have no note field).

## What Changes

- Add a **Notes tab** to the Day view (alongside or as part of the existing panel structure), giving notes first-class real estate without requiring a separate route.
- Extend the `DailyNoteEditor` component with a collapsible **recurring notes** section per day — pre-populated from the previous day's recurring note — so users don't re-type standing intentions.
- Add a **rich text note field** to the quick-log / time-log dialog so individual logged sessions can carry inline context.
- Persist recurring note state (collapsed/expanded) in `localStorage` so the user's preference is remembered across sessions.

## Capabilities

### New Capabilities

- `notes-tab`: A dedicated Notes tab in the Day view that surfaces the daily Tiptap note prominently, and contains a collapsible recurring-notes block.
- `recurring-notes`: A persistent "standing note" that carries forward each day, collapsible with open/closed state saved in localStorage.
- `log-inline-notes`: A rich text note attached to individual time-log entries, stored as Tiptap JSON alongside the log record.

### Modified Capabilities

- `calendar-day-cells`: The Day view panel layout changes to accommodate the Notes tab (tab bar added or panel section reorganised).

## Impact

- `src/components/notes/DailyNoteEditor.tsx` — extend with recurring note block
- `src/pages/CalendarPage/index.tsx` — add tab navigation for Notes
- `src/components/day/QuickLogDialog.tsx` — add optional note field
- `src/lib/localStore.ts` — add `recurringNote` key + collapsed-state key
- `src/resources/_providers/supabase/client.ts` — add `note_json` column handling for time logs (cloud path)
- `src/resources/types/` — extend `TimeLog` type with optional `note_json`
- i18n: new keys in `en.ts` / `es.ts`
