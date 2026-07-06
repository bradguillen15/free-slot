## 1. Data layer — daily note date list

- [x] 1.1 Add `useAllDailyNoteDates(): string[]` hook in `src/lib/dataStore.ts` that returns all dates (ISO strings) with a saved daily note, sorted newest-first — guest: scan localStorage keys matching `freeslot.guest.daily_notes.*`; cloud: query `daily_notes` table for `user_id`
- [x] 1.2 Write unit tests for the guest path of `useAllDailyNoteDates` in `src/lib/localStore.test.ts`

## 2. Routing and nav

- [x] 2.1 Add `notes` route in `src/App.tsx`: `<Route path="notes" element={<NotesPage />} />`
- [x] 2.2 Add Notes nav entry to `navItems` in `src/components/AppLayout.tsx`: `{ to: "/app/notes", labelKey: "nav.notes", icon: StickyNote, requiresAuth: false }`
- [x] 2.3 Add `nav.notes` translation key to `src/i18n/locales/en.ts` and `es.ts`

## 3. NotesPage skeleton

- [x] 3.1 Create `src/pages/NotesPage/index.tsx` with page heading "Notes", two-column layout on lg+ (60/40 split), single-column on mobile
- [x] 3.2 Add a unit test in `src/pages/NotesPage/index.test.tsx` that renders the page and asserts the "Notes" heading is present

## 4. Standing note section

- [x] 4.1 Render the standing note editor in the left column using `RecurringNoteEditor` (or inline `useEditor` + `NoteToolbar`) — load initial content via `getGuestRecurringNote(todayISO())` and carry-forward via `findMostRecentRecurringNote`
- [x] 4.2 Save changes via `upsertGuestRecurringNote` on editor `onUpdate` with 300 ms debounce (same pattern as CalendarPage)

## 5. NotesCarousel component

- [x] 5.1 Create `src/components/notes/NotesCarousel.tsx` that accepts `dates: string[]` and renders a single `DailyNoteCard` for the currently selected index with prev/next arrow buttons; show empty-state when `dates` is empty
- [x] 5.2 Wire `NotesCarousel` into `NotesPage` using the date list from `useAllDailyNoteDates()`
- [x] 5.3 Write unit tests for `NotesCarousel`: renders card for first date, prev/next arrows change the displayed date, empty-state shows when dates is empty

## 6. DailyNoteCard component

- [x] 6.1 Create `src/components/notes/DailyNoteCard.tsx` that shows the formatted date heading and the Tiptap JSON content rendered read-only by default
- [x] 6.2 Add an "Edit" toggle that switches the card to an editable Tiptap editor with `NoteToolbar`; save changes via `useUpsertDailyNote` on debounced `onUpdate`
- [x] 6.3 Write unit tests for `DailyNoteCard`: renders date heading, shows read-only content, edit toggle shows toolbar

## 7. Bring to Standing action

- [x] 7.1 Add a "Bring to Standing" button to `DailyNoteCard` that appends a `{ type: "horizontalRule" }` node followed by the card's content nodes to the current standing note JSON, then immediately calls `upsertGuestRecurringNote`
- [x] 7.2 Write a unit test: clicking "Bring to Standing" calls `upsertGuestRecurringNote` with the concatenated JSON

## 8. Verification

- [x] 8.1 Run `pnpm test --run` — all tests pass
- [x] 8.2 Run `pnpm typecheck` — zero errors
- [x] 8.3 Manual smoke test: navigate to Notes page, write in standing note, create a daily note on Day view, return to Notes page, verify carousel shows the entry and "Bring to Standing" appends it
