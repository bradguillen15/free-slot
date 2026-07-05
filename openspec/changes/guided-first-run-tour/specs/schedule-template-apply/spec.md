# schedule-template-apply Delta Specification

## ADDED Requirements

### Requirement: Suggested schedule template is non-overlapping
The app SHALL define a single suggested-schedule template: Sleep 23:00–07:00 every day; Work 09:00–12:00, Lunch 12:00–13:00, and Work 13:00–17:00 on weekdays. Blocks in the template SHALL NOT overlap each other (lunch splits the work span).

#### Scenario: Template shape
- **WHEN** the suggested template is inspected
- **THEN** it contains the four blocks above (Sleep daily; Work, Lunch, Work on weekdays) and no two blocks on the same day overlap

### Requirement: Applying the template requires explicit consent
The schedule editor SHALL offer an "Apply suggested schedule" action — prominent when the schedule is empty and still reachable when blocks exist. Activating it SHALL show a confirmation dialog before inserting; confirming inserts the template blocks as ordinary schedule blocks (no example marker), and cancelling inserts nothing.

#### Scenario: Apply from empty schedule
- **WHEN** a user with no schedule blocks clicks "Apply suggested schedule" and confirms
- **THEN** the four template blocks are created as regular blocks owned by the user

#### Scenario: Template blocks carry matching default labels
- **WHEN** the template is applied and the seeded default labels exist
- **THEN** each block is assigned its matching label by name (Sleep → Sleep, Work → Deep work, Lunch → Meals) so Confirm Day can materialize them without a "no category" skip
- **THEN** a block whose matching label is missing is still created, just without a label

#### Scenario: Cancel inserts nothing
- **WHEN** the user opens the confirmation dialog and cancels
- **THEN** no schedule blocks are created

### Requirement: Apply works identically for guest and cloud
The apply action SHALL behave identically for guests (localStorage) and signed-in users (Supabase resources), and its strings SHALL be localized in English and Spanish.

#### Scenario: Guest applies the template
- **WHEN** a guest applies the suggested schedule
- **THEN** the blocks are written to localStorage and appear in the schedule editor and Day view
