## ADDED Requirements

### Requirement: Entity mutations are owned by the resources layer

The system SHALL route every cloud create, update, delete, reorder, and upsert through a `resources`
module operation, so that no `supabase.from(...)` call and no import of the supabase client remains in
`dataStore.ts`.

#### Scenario: dataStore has no supabase dependency

- **WHEN** the codebase is searched for supabase usage in `src/lib/dataStore.ts`
- **THEN** there is no `supabase.from(...)` call and no `@/integrations/supabase/client` import

#### Scenario: Cloud mutation goes through resources

- **WHEN** a time log, activity, schedule block, category, or profile is created/updated/deleted in cloud mode
- **THEN** the matching `resources.<entity>.<op>(...)` is invoked with the user id and input
- **AND** the existing cache invalidation for that entity still runs after the mutation

#### Scenario: Guest mutation goes through localStore

- **WHEN** the same mutation runs in guest mode
- **THEN** `localStore` performs the change and `resources` is not called
- **AND** the resulting data matches the cloud-mode result shape

### Requirement: Mutation behavior is unchanged for users

The system SHALL preserve the existing mutation results, error handling, and cache invalidation; this
change relocates I/O only.

#### Scenario: Reorder preserves ordering semantics

- **WHEN** schedule blocks are reordered
- **THEN** `resources.scheduleBlocks.reorder` persists the new order identically to the prior inline path

#### Scenario: Upsert chooses insert vs update as before

- **WHEN** an activity/category/block upsert runs with or without an existing id
- **THEN** the resource performs insert or update matching the prior `dataStore` behavior
