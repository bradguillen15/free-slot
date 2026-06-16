# Spec: Resources Layer

## Purpose

The resources layer isolates all cloud I/O behind a single `src/resources/` boundary. It exposes domain-shaped read operations consumed by `dataStore` hooks, keeps the Supabase client import contained to one provider module, and ships a mock provider so tests can exercise the cloud path without a real Supabase connection.

---

## Requirements

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

---

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

---

### Requirement: A mock provider supports testing without Supabase

The system SHALL provide a `createMockResourcesProvider()` test helper so `dataStore` and feature
tests can exercise the cloud path without a real Supabase client.

#### Scenario: dataStore test uses the mock provider

- **WHEN** a `dataStore` read-hook test runs in cloud mode against the mock provider
- **THEN** it asserts the resource operation was called and returns the seeded DTOs
- **AND** the test imports no real supabase client

---

### Requirement: Resource DTOs reuse the shared domain shapes

Resource DTO types SHALL reuse the existing `localStore` domain shapes (e.g. `Category` aliased to
`LocalCategory`) so guest and cloud share one shape and no extra mapping is needed in `dataStore`.

#### Scenario: One shape across modes

- **WHEN** a category is read in guest mode and in cloud mode
- **THEN** both return the same domain shape with no `dataStore`-level remapping

---

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

---

### Requirement: Mutation behavior is unchanged for users

The system SHALL preserve the existing mutation results, error handling, and cache invalidation; this
change relocates I/O only.

#### Scenario: Reorder preserves ordering semantics

- **WHEN** schedule blocks are reordered
- **THEN** `resources.scheduleBlocks.reorder` persists the new order identically to the prior inline path

#### Scenario: Upsert chooses insert vs update as before

- **WHEN** an activity/category/block upsert runs with or without an existing id
- **THEN** the resource performs insert or update matching the prior `dataStore` behavior

---

### Requirement: Weekly-review reads and generation go through the resources layer

The system SHALL expose weekly-review reads and the `weekly-review` edge-function invoke through
`resources` (with `dataStore` hooks), so no `supabase` import remains in the dashboard weekly-review
feature hooks.

#### Scenario: Weekly review is read via a dataStore hook

- **WHEN** the weekly-review modal needs the saved review for a week
- **THEN** it uses `useWeeklyReview(weekStart)` backed by `resources.weeklyReviews.getForWeek`
- **AND** no `supabase` import exists in `WeeklyReviewModal/**`

#### Scenario: Review generation is a dataStore mutation

- **WHEN** the user triggers "generate" for a weekly review
- **THEN** `useGenerateWeeklyReviewMutation()` invokes `resources.functions.generateWeeklyReview`
- **AND** the feature hook does not call `supabase.functions.invoke` directly

#### Scenario: Dashboard prompt reads via hooks

- **WHEN** the dashboard decides whether to prompt for a weekly review
- **THEN** it uses `useProfile` and `useWeeklyReview` (no `useEffect` Supabase fetch)
- **AND** no `supabase` import exists in `DashboardPage/useWeeklyReviewPrompt.ts`

---

### Requirement: Weekly-review aggregation is a pure function

The system SHALL compute planned-vs-actual weekly-review data in a pure function
(`aggregateWeeklyReview`) that takes logs, categories, plan, and saved review and returns the derived
arrays/ratios, so the feature hook holds derivation and UI state only.

#### Scenario: Aggregation is unit-testable without a DB

- **WHEN** `aggregateWeeklyReview` runs on fixture logs/categories/plan
- **THEN** it returns the planned/actual/ratio/total/merged values deterministically with no I/O

---

### Requirement: Weekly priorities are owned by the resources layer

The system SHALL expose weekly-priorities reads and writes through `resources.weeklyPriorities.*` with
a `useWeeklyPriorities(weekStart)` dataStore hook, so no `supabase` import remains in `PriorityRanker`.

#### Scenario: Priority ranker reads and writes via hooks

- **WHEN** the priority ranker lists or persists ranked priorities for a week
- **THEN** it uses `useWeeklyPriorities` and its mutation backed by `resources.weeklyPriorities.*`
- **AND** no `supabase` import exists in `src/components/activities/PriorityRanker/**`

---

### Requirement: AI plan generation and plan delete go through the resources layer

The system SHALL expose the `generate-weekly-plan` invoke, weekly-plan delete, and accept/log-slot
writes through `resources`/`dataStore`, so `AIPlanPanel` contains presentation and composition only.

#### Scenario: Generate plan is a dataStore mutation

- **WHEN** the user generates an AI weekly plan
- **THEN** `useGenerateWeeklyPlanMutation()` invokes `resources.functions.generateWeeklyPlan`
- **AND** `AIPlanPanel` does not call `supabase.functions.invoke` directly

#### Scenario: Accepting plan slots logs time via resources

- **WHEN** the user accepts AI plan slots
- **THEN** the resulting time-log inserts go through `resources.timeLogs.*` via a dataStore mutation
- **AND** no `supabase` import exists in `src/components/week/AIPlanPanel.tsx`

#### Scenario: Deleting a plan goes through resources

- **WHEN** a weekly plan is deleted
- **THEN** `resources.weeklyPlans.delete` performs it and weekly-plan queries are invalidated

---

### Requirement: Onboarding and settings use the resources layer

The system SHALL route onboarding/onboarding-gate profile reads/writes through `dataStore`
(`useProfile`/`updateProfile`) and the settings account deletion through
`resources.functions.deleteAccount`, so no `supabase` import remains in those files.

#### Scenario: Onboarding reads/writes profile via hooks

- **WHEN** onboarding or the onboarding gate reads or updates the profile (e.g. onboarding flag)
- **THEN** it uses `useProfile` / `updateProfile`
- **AND** no `supabase` import exists in `Onboarding.tsx` or `OnboardingGate.tsx`

#### Scenario: Account deletion goes through resources

- **WHEN** the user deletes their account from settings
- **THEN** a mutation invokes `resources.functions.deleteAccount`
- **AND** no `supabase` import exists in `SettingsPage.tsx`

---

### Requirement: Guest migration writes through the resources layer

The system SHALL perform the guest→cloud migration inserts/updates through `resources` batch helpers,
so `migrateGuest.ts` imports `@/resources` (allowed) and not the supabase client.

#### Scenario: Migration uses batch inserts

- **WHEN** a guest's data is migrated to cloud
- **THEN** activities, categories, schedule blocks, time logs, and priorities are written via
  `resources.<entity>.insertMany` (or equivalent)
- **AND** `migrateGuest.ts` does not import `@/integrations/supabase/client`
- **AND** the returned migration counts match the prior behavior
