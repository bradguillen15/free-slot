## ADDED Requirements

### Requirement: Cloud I/O is isolated behind a resources provider

The system SHALL expose all cloud reads in this change through a single `src/resources/` boundary
whose Supabase provider (`_providers/supabase`) is the only module that imports the supabase client,
with resource functions shaped as domain operations (verbs on nouns), not PostgREST queries.

#### Scenario: Resource modules expose domain operations

- **WHEN** a consumer needs cloud categories, activities, schedule blocks, time logs, profile, or weekly plan
- **THEN** it calls a domain operation such as `resources.timeLogs.listInRange({ userId, startISO, endISO })`
- **AND** no table name, column list, or PostgREST filter appears outside `_providers/supabase`

#### Scenario: Supabase client has a single importer

- **WHEN** the codebase is searched for imports of `@/integrations/supabase/client`
- **THEN** only `src/resources/_providers/supabase/**` (and existing auth/test seams) import it
- **AND** `src/lib/dataFetchers.ts` no longer exists

### Requirement: Resources are cloud-only and the guest branch lives in dataStore

Resource functions SHALL be cloud-only (no `mode` parameter); the guest/cloud decision SHALL be made
in the `dataStore` read hooks, calling `localStore` for guest and `resources` for cloud.

#### Scenario: Read hook routes by mode

- **WHEN** a `dataStore` read hook runs in guest mode
- **THEN** it reads from `localStore` and does not call `resources`
- **AND** when it runs in cloud mode it calls the corresponding `resources` operation with the user id

#### Scenario: Read behavior is unchanged for users

- **WHEN** the app loads categories, activities, blocks, logs, profile, or the weekly plan
- **THEN** the same data is returned as before the scaffold, in both guest and cloud modes

### Requirement: A mock provider supports testing without Supabase

The system SHALL provide a `createMockResourcesProvider()` test helper so `dataStore` and feature
tests can exercise the cloud path without a real Supabase client.

#### Scenario: dataStore test uses the mock provider

- **WHEN** a `dataStore` read-hook test runs in cloud mode against the mock provider
- **THEN** it asserts the resource operation was called and returns the seeded DTOs
- **AND** the test imports no real supabase client

### Requirement: Resource DTOs reuse the shared domain shapes

Resource DTO types SHALL reuse the existing `localStore` domain shapes (e.g. `Category` aliased to
`LocalCategory`) so guest and cloud share one shape and no extra mapping is needed in `dataStore`.

#### Scenario: One shape across modes

- **WHEN** a category is read in guest mode and in cloud mode
- **THEN** both return the same domain shape with no `dataStore`-level remapping
