# resources-layer Specification (delta)

## ADDED Requirements

### Requirement: Mode derivation is confined to dataStore

The guest/cloud mode decision SHALL exist only inside `src/lib/dataStore.ts`. Pages and components SHALL consume `dataStore` hooks (read hooks and mutation hooks) and SHALL NOT derive `user ? "cloud" : "guest"` or pass `(mode, userId)` into `dataStore` free functions.

#### Scenario: Components mutate through hooks

- **WHEN** a component inserts/updates/deletes a time log, category, activity, or schedule block
- **THEN** it calls the corresponding `use*Mutation()` hook from `dataStore`
- **AND** it does not import `useAuth` solely to compute a mode or user id for data access
- **EXCEPT** `AIPlanPanel`, an account-only feature whose batch accept flow has no hook equivalent yet (`resources.timeLogs.insertMany`); it stays cloud-hardcoded and is a recorded follow-up

#### Scenario: No mode expressions outside dataStore

- **WHEN** the repo is searched for `user ? "cloud" : "guest"` in non-test source
- **THEN** matches exist only in `src/lib/dataStore.ts`

#### Scenario: Free functions remain for non-component callers

- **WHEN** non-hook callers (`migrateGuest`, `confirmDay`, tests) need data operations
- **THEN** the typed free functions remain available and unchanged in behavior

### Requirement: dataStore mutations return typed entities

`dataStore` mutation functions and hooks SHALL declare and return the concrete entity types produced by the underlying store/provider (e.g. `Promise<LocalScheduleBlock>`), not `unknown`.

#### Scenario: Callers use results without casting

- **WHEN** `ScheduleEditor` duplicates a block and needs the created block's id
- **THEN** it reads `created.id` directly from the typed mutation result with no type assertion

#### Scenario: Guest and cloud results share one declared type

- **WHEN** a mutation runs in guest mode and in cloud mode
- **THEN** both branches return the same declared entity type

### Requirement: Cache keys go through the queryKeys module

Every React Query key used by `dataStore` (queries, invalidations, optimistic updates) SHALL be produced by `src/lib/queryKeys.ts`; inline key literals SHALL NOT appear.

#### Scenario: Daily-note invalidation uses queryKeys helpers

- **WHEN** `useUpsertDailyNote` invalidates the daily-note and notes-for-week caches on success
- **THEN** the keys come from `queryKeys` helpers (adding a prefix helper if needed)
- **AND** no `["freeslot", ...]` array literal exists in `dataStore.ts`
