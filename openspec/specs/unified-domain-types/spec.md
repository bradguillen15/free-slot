# unified-domain-types Specification

## Purpose
TBD - created by archiving change solid-data-layer-refactor. Update Purpose after archive.
## Requirements
### Requirement: Domain entity types have a single canonical source

Domain entity types (`ScheduleBlock`, `TimeLog`, `Category`, and future entities) SHALL be defined once — as the `@/resources` type aliases of the `localStore` shapes — and consumed from `@/resources` by pages, components, and lib modules. Component files SHALL NOT re-declare structural copies of these types.

#### Scenario: Components import domain types from resources

- **WHEN** `DayTimeline`, `QuickLogDialog`, `ScheduleEditor`, `WeekPage`, or `CalendarPage` reference a schedule block, time log, or category type
- **THEN** the type resolves to the `@/resources` export, either directly or through a `Pick<>`/`Partial<>` derivation of it
- **AND** no independent object-literal re-declaration of `ScheduleBlock`, `TimeLog`, or `Category` exists under `src/components/` or `src/pages/`

#### Scenario: Narrower views derive from the canonical type

- **WHEN** a component needs only a subset of an entity's fields (e.g. the category picker)
- **THEN** it derives the subset with `Pick<>`/`Omit<>` from the canonical type (e.g. `PickerCategory = Pick<Category, ...>`) rather than declaring an independent structural copy

### Requirement: Domain data flows without unsafe casts

Values produced by `dataStore` hooks SHALL be consumed at their declared types; `as unknown as` double-casts bridging duplicate domain shapes SHALL NOT exist outside the Supabase mapper boundary and edge-function payload parsing.

#### Scenario: Cast-free hook consumption

- **WHEN** `WeekPage`, `ScheduleEditor`, `CalendarPage`, or `calendarDays` consume `useScheduleBlocks`, `useTimeLogsInRange`, `useVisibleCategories`, or `useProfile`
- **THEN** no `as unknown as` cast is applied to the hook results

#### Scenario: Repository-wide cast audit

- **WHEN** the repo is searched for `as unknown as` in non-test source
- **THEN** matches exist only in `src/resources/_providers/supabase/mappers.ts` and edge-function response parsing (`AIPlanPanel`)

