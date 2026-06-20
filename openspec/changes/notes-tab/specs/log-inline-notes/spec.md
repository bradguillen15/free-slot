## ADDED Requirements

### Requirement: Time-log entries support an optional inline note

Each time-log record SHALL support an optional rich text note stored as Tiptap JSON. The note can be added or edited from the quick-log / time-log dialog. The field is optional — existing logs without a note are unaffected.

#### Scenario: User adds a note while logging time

- **WHEN** the user opens the quick-log or time-log dialog
- **THEN** an optional "Note" field is visible (collapsed by default or shown as a small textarea/Tiptap editor)
- **AND** the user can type a rich-text note before saving
- **AND** saving persists the note alongside the log entry

#### Scenario: Log note is displayed in the Day timeline

- **WHEN** a logged session has an associated note
- **THEN** a note indicator (e.g. small icon) is visible on the timeline block
- **AND** tapping/hovering shows the note text

#### Scenario: Existing logs without notes are unaffected

- **WHEN** a time-log entry has no `note_json` value
- **THEN** it renders exactly as before with no note indicator

#### Scenario: Log note persists for guest users via localStorage

- **WHEN** a guest user adds a note to a logged session
- **THEN** the note is stored in localStorage alongside the log entry
- **AND** it is retrievable on subsequent page loads
