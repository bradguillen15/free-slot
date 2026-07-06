## Context

Notes are currently only accessible inside the CalendarPage right panel (Notes tab → Daily / Standing sub-tabs). There is no way to review past daily notes across dates, nor a focused environment for the standing note. The new Notes page gives notes a first-class home in the app nav without touching existing data storage.

## Goals / Non-Goals

**Goals:**
- New `/app/notes` route with a dedicated `NotesPage` component
- Standing note at the top: full-width Tiptap editor with `NoteToolbar` (reused from existing component)
- Daily notes date carousel: shows only dates that have an actual note, newest first; prev/next arrow navigation; no empty-date slots
- "Bring to Standing" action on each daily note card: appends the day's content to the standing note
- Entry in `AppLayout.tsx` `navItems` so the page appears in the sidebar like other views

**Non-Goals:**
- No new database columns or migrations (reuses existing `daily_notes` table / guest localStorage)
- No search or tagging of notes
- No deletion of daily notes from this page (done via individual day view)
- No sync between the new page and the CalendarPage side-panel (both write to the same data source, React Query / local state will reflect changes on nav)

## Decisions

**1. Reuse existing data hooks, no new API**
`useDailyNote(date)` loads one day at a time. For the carousel we need all dates that have notes. Guest mode: `Object.keys(localStorage)` filtered for the `freeslot.guest.daily_notes.*` prefix — derive the date list client-side. Cloud mode: query `daily_notes` table once for `user_id` to get all dates. Introduce a new `useAllDailyNoteDates()` hook in `dataStore` that abstracts both modes.

**2. Carousel driven by date list, not infinite scroll**
Build `NotesCarousel` as a simple paginated list of `DailyNoteCard` components sorted by date descending. A single visible "page" shows the card for the currently selected date; prev/next arrows move through the list. No swipe animation needed for v1 — plain React state.

**3. "Bring to Standing" appends content**
Appending (not replacing) is the safest default. Implementation: read the standing note's current Tiptap JSON, concatenate the day note's `content` array after a horizontal rule node, then call `upsertGuestRecurringNote` / `upsertDailyNote`-equivalent for standing.

**4. NoteToolbar reused as-is**
`src/components/notes/NoteToolbar.tsx` accepts any Tiptap `Editor` instance — both the standing note editor and any expanded daily note card can use it directly.

**5. Page layout**
Mobile-first single-column. On ≥ lg: standing note on the left (60%) + date carousel on the right (40%) side by side. On mobile: standing note first, carousel below.

## Risks / Trade-offs

- [Guest date discovery via localStorage key scan] → Simple and correct; key schema is already stable (`freeslot.guest.daily_notes.<date>`).
- [Cloud: N+1 if we load each daily note eagerly] → Load only note metadata (date) up front; fetch full content lazily when the user selects a card.
- [Standing note "bring" appends, may create long documents] → Acceptable for v1; user can edit the result in place.

## Open Questions

- Should the standing note also be navigable by date (i.e., per-day recurring note)? Currently it carries forward from the most recent entry — the page shows a single standing note. Deferring per-day standing note history to a future iteration.
