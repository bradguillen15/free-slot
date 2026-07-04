## ADDED Requirements

### Requirement: New users are seeded with sample schedule and logs
On first bootstrap, a new user (guest or newly signed-up cloud account) SHALL be seeded with a fixed template weekly schedule (e.g. sleep, work, meals) and 2–3 sample time logs on the current day. Seeded rows SHALL be marked `is_example = true`. Seeding SHALL happen at most once per user (guest: gated by the existing `bootstrapped` flag; cloud: gated by a new `sample_data_seeded` profile flag).

#### Scenario: Guest gets sample data on first load
- **WHEN** a brand-new guest opens the app for the first time
- **THEN** `schedule_blocks` contains the template blocks, each with `is_example: true`
- **THEN** the current day has 2–3 sample time logs, each with `is_example: true`

#### Scenario: Cloud account gets sample data once
- **WHEN** a user signs up for a new cloud account and loads the app for the first time
- **THEN** the same template schedule and sample logs are inserted for that user with `is_example = true`
- **THEN** `profiles.sample_data_seeded` is set to `true`
- **THEN** reloading the app does not insert the sample data again

#### Scenario: Existing users are not retroactively seeded
- **WHEN** an existing cloud account (created before this change) loads the app
- **THEN** no sample data is inserted for them

### Requirement: Editing sample data marks it as real
Any edit to a schedule block or time log that has `is_example = true` (via the schedule editor, quick-log, drag-reschedule, or any other existing edit path) SHALL clear its `is_example` flag to `false` as part of that same update.

#### Scenario: Editing a sample schedule block clears the marker
- **WHEN** a user edits the name, time, or category of a sample schedule block
- **THEN** the updated row has `is_example: false`

#### Scenario: Editing a sample time log clears the marker
- **WHEN** a user edits a sample time log's time, category, or notes
- **THEN** the updated row has `is_example: false`

### Requirement: Sample data can be cleared in one action
The user SHALL be able to remove all remaining `is_example = true` rows (schedule blocks and time logs) in a single confirmed action, without affecting any edited (non-example) data.

#### Scenario: Clear examples removes only untouched samples
- **WHEN** a user has both untouched sample rows and at least one edited (real) row
- **WHEN** the user confirms "Clear examples"
- **THEN** all rows with `is_example: true` are deleted
- **THEN** the edited row (now `is_example: false`) remains

#### Scenario: Clear affordance hides itself once nothing remains
- **WHEN** no rows with `is_example: true` remain for the user
- **THEN** the "Clear examples" affordance is not shown

### Requirement: Guest-to-cloud migration excludes untouched sample data
When a guest signs up and their local data is migrated to the cloud, schedule blocks and time logs still marked `is_example = true` SHALL NOT be migrated. Rows whose `is_example` flag was already cleared by editing SHALL migrate normally.

#### Scenario: Untouched examples are not migrated
- **WHEN** a guest has unedited sample schedule blocks and logs
- **WHEN** they sign up and guest migration runs
- **THEN** none of the `is_example: true` rows are inserted into the cloud account

#### Scenario: Edited examples migrate normally
- **WHEN** a guest edited one of the sample time logs (clearing its `is_example` flag)
- **WHEN** they sign up and guest migration runs
- **THEN** that log is migrated like any other guest-created log
