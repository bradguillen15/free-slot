## Why

The app has no dedicated place to manage notes holistically. Daily notes live only inside the day view's side panel, making it impossible to browse past entries or see the standing note prominently without opening a specific day. Users need a hub where the standing note is the anchor and past daily notes are easy to navigate.

## What Changes

- Add a new **Notes** route (`/notes`) with its own top-level nav tab (alongside Day / Week / Month).
- The page shows the **Standing note** as the primary, always-visible section at the top with full Tiptap rich-text editing.
- Below the standing note: a **date carousel** that shows only days on which the user wrote a daily note (no empty dates), navigable with prev/next arrows and date chips.
- Each carousel entry opens the daily note for that date in read/edit mode.
- A **"Bring to Standing"** action on any daily note entry lets the user append (or copy) that day's content into the standing note with one click.
- The existing CalendarPage side-panel Notes tab (Daily / Standing sub-tabs) remains unchanged as the quick in-context editor.

## Capabilities

### New Capabilities
- `notes-hub`: Dedicated full-page notes hub with standing note editor, date carousel of written daily notes, and bring-to-standing action.

### Modified Capabilities
<!-- None — existing daily note and standing note data storage is unchanged. -->

## Impact

- New page component: `src/pages/NotesPage/index.tsx`
- New sub-components: `NotesCarousel`, `DailyNoteCard`
- Nav update: add Notes entry to `src/components/layout/AppNav` (or equivalent router config)
- Data: reuses existing `useDailyNote`, `useUpsertDailyNote`, `getGuestRecurringNote`, `upsertGuestRecurringNote`, and `findMostRecentRecurringNote` from `localStore` / `dataStore`
- No new DB columns or API changes needed
