# first-run-sample-data Delta Specification

## REMOVED Requirements

### Requirement: New users are seeded with sample schedule and logs
**Reason**: Sample data confused users ("is this data mine?"); replaced by the guided tour plus the consent-based suggested-schedule template (see `guided-tour` and `schedule-template-apply`).
**Migration**: A database migration deletes all rows with `is_example = true` and drops `schedule_blocks.is_example`, `time_logs.is_example`, and `profiles.sample_data_seeded`.

### Requirement: Editing sample data marks it as real
**Reason**: No sample data exists anymore; the marker columns are dropped.
**Migration**: `is_example`-clearing logic is removed from all edit paths.

### Requirement: Sample data can be cleared in one action
**Reason**: Nothing to clear; the banner and clear mutation are removed.
**Migration**: `SampleDataBanner` component, `clearExampleData`, and `sampleData.*` i18n keys are deleted.

### Requirement: Guest-to-cloud migration excludes untouched sample data
**Reason**: Guests are no longer seeded, so migration has no example rows to exclude.
**Migration**: The `is_example` filters in `migrateGuest` are removed.
