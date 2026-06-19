## ADDED Requirements

### Requirement: Cache is invalidated and refreshed after a successful migration

The system SHALL invalidate the React Query cache for all FreeSlot query keys
(`queryKeys.root`) and await the resulting refetch after `migrateGuestToCloud` resolves
successfully, before navigating to the authenticated app, so the first post-migration
render serves fresh cloud data.

#### Scenario: First render after import shows migrated data

- **WHEN** a guest with existing data signs up and confirms "Import"
- **THEN** the cache for the now-cloud user is invalidated and refetched
- **AND** navigation to `/app` occurs only after the refetch settles
- **AND** the Day and Week views show the migrated logs without a manual reload

### Requirement: Cache is not invalidated when migration fails

The system SHALL NOT invalidate the cache when `migrateGuestToCloud` rejects, leaving the
existing guest-data preservation and error-handling path unchanged.

#### Scenario: Failed migration preserves prior behavior

- **WHEN** `migrateGuestToCloud` throws during import
- **THEN** no cache invalidation is performed
- **AND** an error toast is shown
- **AND** the existing post-dialog navigation behavior is unchanged (no new redirect is introduced for the failure path)

### Requirement: Import shows a loading state until the cache settles

The system SHALL keep the "Import" action in its migrating/loading state until invalidation
and refetch have settled, then navigate to `/app`.

#### Scenario: Loading state spans migration and refetch

- **WHEN** the user clicks "Import"
- **THEN** the Import control is disabled and shows a migrating state
- **AND** the state clears only after migration and cache refresh complete
