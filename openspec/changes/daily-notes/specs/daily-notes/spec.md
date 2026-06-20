## ADDED Requirements

### Requirement: Daily note storage
The system SHALL store one rich-text note per user per calendar date in `daily_notes(user_id, date, content jsonb, updated_at)` with a `UNIQUE(user_id, date)` constraint and RLS policy `auth.uid() = user_id`.

#### Scenario: Note created for a date
- **WHEN** a user saves a note for a date that has no existing note
- **THEN** a new row is inserted in `daily_notes` with the user's id, the date, and the Tiptap JSON content

#### Scenario: Note updated for a date
- **WHEN** a user edits a note for a date that already has a note
- **THEN** the existing row is upserted (content and updated_at updated, no duplicate created)

#### Scenario: User cannot access another user's note
- **WHEN** a user queries `daily_notes` for a date belonging to another user
- **THEN** the query returns zero rows (RLS enforces isolation)

---

### Requirement: Daily note guest parity
The system SHALL mirror daily notes in `localStorage` under `freeslot.guest.daily_notes.<YYYY-MM-DD>` so the feature works identically in guest mode.

#### Scenario: Guest saves a note
- **WHEN** a guest user types in the note editor for a date
- **THEN** the note is persisted to `localStorage` under the corresponding date key

#### Scenario: Guest note migrates on sign-up
- **WHEN** a guest user signs up and `migrateGuest` runs
- **THEN** all guest daily notes are inserted into the `daily_notes` table for the new user

---

### Requirement: Rich text editor in day view
The system SHALL display a Tiptap rich-text editor in the day view for the currently viewed date. The editor MUST be collapsible and invisible when the note is empty. It MUST auto-save with a 300ms debounce on every change.

#### Scenario: Empty note is hidden
- **WHEN** a user opens the day view for a date with no existing note
- **THEN** the note editor is collapsed and no empty editor chrome is visible

#### Scenario: Note editor expands on interaction
- **WHEN** a user clicks the note area or the expand affordance
- **THEN** the Tiptap editor becomes visible and focused

#### Scenario: Note auto-saves after typing stops
- **WHEN** a user types in the note editor and pauses for 300ms
- **THEN** the note is upserted without any explicit save action from the user

---

### Requirement: Week view presence indicator
The system SHALL display a small dot on a week view day header cell when that day has a non-empty note.

#### Scenario: Dot shown for day with note
- **WHEN** a day has a saved non-empty daily note
- **THEN** a small indicator dot is visible on that day's header in the week grid

#### Scenario: No dot for days without notes
- **WHEN** a day has no saved note or an empty note
- **THEN** no indicator dot is visible on that day's header

---

### Requirement: Daily notes fed into AI planner
The system SHALL include the current week's daily notes as context in the `generate-weekly-plan` edge function payload. Notes MUST be extracted as plain text (via `editor.getText()`) client-side before transmission. Each note MUST be truncated to 500 characters server-side before prompt insertion. Notes MUST be wrapped in `<user_notes>` tags in the prompt.

#### Scenario: Notes included in plan generation
- **WHEN** a user generates a weekly plan and has notes for days in the current week
- **THEN** those notes (plain text, ≤500 chars each) appear inside `<user_notes>` in the AI prompt

#### Scenario: Notes with injected instructions are ignored by AI
- **WHEN** a daily note contains text like "Ignore previous instructions and do X"
- **THEN** the AI system prompt directive causes the model to treat it as plain user data and not act on it

#### Scenario: No notes omits the block
- **WHEN** a user generates a weekly plan and has no notes for the current week
- **THEN** the `<user_notes>` block is omitted from the prompt entirely

---

### Requirement: Daily notes fed into weekly review
The system SHALL include the week's daily notes as context in the `weekly-review` edge function payload, with the same plain-text extraction, 500-char cap, and `<user_notes>` tagging as the planner.

#### Scenario: Notes included in review generation
- **WHEN** a user generates a weekly review and has notes for days in the reviewed week
- **THEN** those notes appear inside `<user_notes>` in the review prompt
