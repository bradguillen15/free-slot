## ADDED Requirements

### Requirement: Day view exposes a Notes tab

The Day view panel SHALL include a Notes tab that surfaces the daily Tiptap note as a first-class section — not buried beneath the timeline — allowing users to focus on writing without scrolling past log entries.

#### Scenario: Notes tab is visible in the Day view

- **WHEN** the user opens the Day view for any date
- **THEN** a Notes tab (or section) is visible alongside the timeline and summary areas
- **AND** clicking it brings the Tiptap daily note editor into focus

#### Scenario: Notes tab preserves content when switching dates

- **WHEN** the user writes a note on one date then navigates to another date
- **THEN** the note for the previous date is saved
- **AND** the Notes tab for the new date shows that day's note (or an empty editor if none exists)

#### Scenario: Notes tab is accessible on mobile

- **WHEN** the user views the Day view on a narrow (phone-size) viewport
- **THEN** the Notes tab is reachable without horizontal scrolling
- **AND** the Tiptap editor is usable with a mobile keyboard
