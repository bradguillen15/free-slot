## MODIFIED Requirements

### Requirement: Day view panel accommodates a Notes section

The Day view panel layout SHALL be reorganised to include a Notes section (tab or collapsible block) that contains the daily note editor and the recurring note block, without removing the existing timeline or summary sections.

#### Scenario: Notes section does not displace timeline content

- **WHEN** the user is on the Day view
- **THEN** both the timeline (blocks/logs) and the Notes section are accessible
- **AND** switching between them does not cause layout shift on the rest of the page

#### Scenario: Notes section is the default open tab when navigating via the Notes link

- **WHEN** the user arrives on the Day view via an explicit "Notes" entry point
- **THEN** the Notes section is active/visible immediately without extra taps
