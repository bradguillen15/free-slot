## ADDED Requirements

### Requirement: Notes page is accessible from the main nav
The system SHALL provide a "Notes" entry in the app sidebar navigation (`AppLayout.tsx` `navItems`) that routes to `/app/notes`.

#### Scenario: User navigates to Notes
- **WHEN** the user clicks "Notes" in the sidebar
- **THEN** the browser navigates to `/app/notes` and the `NotesPage` component renders

#### Scenario: Notes nav item is highlighted when active
- **WHEN** the current route is `/app/notes`
- **THEN** the "Notes" sidebar item has the active visual state

---

### Requirement: Standing note is displayed prominently
The system SHALL render the standing (recurring) note as the primary, always-visible section at the top of the Notes page, using the full-width Tiptap editor with `NoteToolbar`.

#### Scenario: Standing note renders on load
- **WHEN** the user opens the Notes page
- **THEN** the standing note editor is immediately visible with its formatting toolbar (B, I, H1, H2, bullet list, numbered list)

#### Scenario: Standing note persists edits
- **WHEN** the user types in the standing note editor
- **THEN** after a 300 ms debounce the content is saved via `upsertGuestRecurringNote` (guest) or the cloud equivalent

---

### Requirement: Date carousel shows only written daily notes
The system SHALL render a `NotesCarousel` below the standing note that lists only the dates for which the user has created a daily note, sorted newest-first. Empty dates SHALL NOT appear.

#### Scenario: Carousel shows written dates
- **WHEN** the user has daily notes on Jun 18 and Jun 20 but not Jun 19
- **THEN** the carousel shows two entries: Jun 20 and Jun 18, with no Jun 19 entry

#### Scenario: Carousel is empty when no daily notes exist
- **WHEN** the user has never written a daily note
- **THEN** the carousel shows an empty-state message (e.g., "No daily notes yet")

#### Scenario: User navigates between entries
- **WHEN** the user presses the "Next" arrow in the carousel
- **THEN** the displayed card advances to the next older entry

#### Scenario: User navigates back
- **WHEN** the user presses the "Prev" arrow
- **THEN** the displayed card moves to the next newer entry

---

### Requirement: Daily note card shows content and date
The system SHALL display each daily note in a `DailyNoteCard` that shows the date heading, the note content (read-only by default), and an edit toggle.

#### Scenario: Card shows date and content
- **WHEN** a daily note card is displayed
- **THEN** the card header shows the formatted date (e.g., "Thursday, Jun 18") and the note body renders the Tiptap JSON as formatted HTML

#### Scenario: Card enters edit mode
- **WHEN** the user clicks "Edit" on a daily note card
- **THEN** the card switches to an editable Tiptap editor with `NoteToolbar`

---

### Requirement: Bring to Standing action
The system SHALL provide a "Bring to Standing" button on each daily note card that appends the card's content to the standing note.

#### Scenario: Content is appended to standing note
- **WHEN** the user clicks "Bring to Standing" on a daily note card
- **THEN** a horizontal rule followed by the card's Tiptap content nodes are appended to the standing note JSON, and the standing note editor updates to reflect the new content

#### Scenario: Bring to Standing saves immediately
- **WHEN** the append completes
- **THEN** the updated standing note is persisted without waiting for the debounce timer
