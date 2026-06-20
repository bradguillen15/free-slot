## 0. Branch Setup

- [x] 0.1 Create and switch to feature branch `feature/notes-tab`

## 1. Data Layer — Recurring Notes

- [x] 1.1 Add `getGuestRecurringNote(date)` and `upsertGuestRecurringNote(date, content)` helpers to `src/lib/localStore.ts` using key `freeslot.guest.recurring_notes.<date>`
- [x] 1.2 Add `getRecurringNoteCollapseState()` and `setRecurringNoteCollapseState(collapsed: boolean)` to `src/lib/localStore.ts` using key `freeslot.ui.recurring_note_collapsed`
- [x] 1.3 Add `findMostRecentRecurringNote(beforeDate)` helper that walks backwards up to 30 days to find the latest recurring note entry

## 2. Data Layer — Log Inline Notes

- [x] 2.1 Add `note_json?: object` field to `LocalTimeLog` type in `src/lib/localStore.ts`
- [x] 2.2 Update `upsertGuestTimeLog` to persist `note_json` when provided
- [ ] 2.3 Add `note_json jsonb` nullable column to `time_logs` table via Supabase migration (SQL: `ALTER TABLE time_logs ADD COLUMN note_json jsonb;`)
- [x] 2.4 Update Supabase cloud mapper in `src/resources/_providers/supabase/client.ts` to read/write `note_json` for time log entries

## 3. Tests — Data Layer

- [x] 3.1 Write unit tests for `getGuestRecurringNote` / `upsertGuestRecurringNote` / `findMostRecentRecurringNote` covering: no previous note, note on prior day, note on same day
- [x] 3.2 Write unit test for `getRecurringNoteCollapseState` / `setRecurringNoteCollapseState`
- [x] 3.3 Run `pnpm test --run` — all tests must pass before continuing

## 4. RecurringNoteEditor Component

- [x] 4.1 Create `src/components/notes/RecurringNoteEditor.tsx` — collapsible block with a Tiptap editor; accepts `date`, `initialContent`, `collapsed`, `onCollapseChange`, `onChange` props
- [x] 4.2 Add "Carried from <date>" label when content was pre-populated from a prior day (pass `carriedFrom?: string` prop)
- [x] 4.3 Lazy-load Tiptap inside the component to avoid bundling cost when collapsed

## 5. Notes Tab in Day View

- [x] 5.1 Wrap the existing Day view right panel content in a `Tabs` (shadcn/ui) with two tabs: "Summary" and "Notes"
- [x] 5.2 Move the existing `DailyNoteEditor` into the Notes tab
- [x] 5.3 Add `RecurringNoteEditor` below `DailyNoteEditor` in the Notes tab, pre-populated via `findMostRecentRecurringNote`
- [x] 5.4 Persist recurring note on change via `upsertGuestRecurringNote`
- [x] 5.5 Read/write collapse state from localStorage on mount/toggle
- [x] 5.6 Ensure the Notes tab is accessible on mobile (no horizontal overflow, keyboard usable)

## 6. Log Inline Note in Quick-Log Dialog

- [x] 6.1 Add a collapsible "Add note" toggle inside `QuickLogDialog` (collapsed by default)
- [x] 6.2 Render a minimal Tiptap editor inside the note section (same `StarterKit` extension)
- [x] 6.3 Include `note_json` in the log payload when saving
- [x] 6.4 Show a small note icon on timeline blocks that have a `note_json` (in `DayTimeline`)

## 7. i18n

- [x] 7.1 Add new keys to `src/i18n/locales/en.ts`: `notes.tab`, `notes.dailyNote`, `notes.recurringNote`, `notes.carriedFrom`, `notes.addNote`, `notes.placeholder`
- [x] 7.2 Add matching Spanish translations to `src/i18n/locales/es.ts`

## 8. Tests — UI Components

- [x] 8.1 Write unit tests for `RecurringNoteEditor`: renders collapsed, expands on click, shows carried-from label when prop is set
- [x] 8.2 Update `CalendarPage` tests to account for the new Tabs structure (Summary tab is default active)
- [x] 8.3 Run `pnpm test --run` and `pnpm typecheck` — all must pass

## 9. Verification

- [x] 9.1 Start dev server and open Day view — confirm Notes tab renders and Tiptap editor is functional
- [ ] 9.2 Write a recurring note, reload page — confirm it persists and is pre-populated on the next day
- [x] 9.3 Log a session with a note in QuickLogDialog — confirm note icon appears on the timeline block
- [x] 9.4 Verify guest mode: all features work with localStorage only (no auth)
- [x] 9.5 Verify at ~390px viewport: Notes tab and editors are usable, no overflow
- [x] 9.6 Run full test suite: `pnpm test --run` + `pnpm typecheck` — must be green
