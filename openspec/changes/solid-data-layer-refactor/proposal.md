# Proposal: solid-data-layer-refactor

## Why

A full-repo SOLID review found the layered architecture healthy but eroded at the edges: domain types are re-declared inside component files (forcing ~15 `as unknown as` double-casts), the guest/cloud `mode` decision leaks into 10+ components even though `dataStore` hooks encapsulate it, mutation functions return `unknown` (callers re-cast), and the same error-toast catch block is copy-pasted 24 times. Fixing these now keeps the "fully typed, mode-agnostic UI" contract enforceable before more features build on the wrong patterns.

## What Changes

- Components and lib modules import domain types (`ScheduleBlock`, `TimeLog`, `Category`) from `@/resources`; duplicate type declarations in `DayTimeline.tsx` and `QuickLogDialog.tsx` are deleted and all resulting `as unknown as` casts of domain data are removed (`PickerCategory` becomes a `Pick<Category, ...>` derivation).
- `dataStore` mutation functions get real return types (no `let result: unknown`), removing caller-side casts.
- Components stop deriving `user ? "cloud" : "guest"` and stop calling dataStore free functions with `(mode, userId)`; they use dataStore mutation hooks instead (new hooks added where missing, e.g. activities). Mode derivation exists only inside `dataStore.ts`.
- Hardcoded React Query keys in `useUpsertDailyNote` are replaced with `queryKeys` helpers.
- A shared `toastError(err, t)` helper replaces the 24 duplicated `err instanceof Error ? err.message : t("common.somethingWrong")` catch blocks.
- `localStore` category/activity/schedule-block CRUD is re-expressed through a generic `collectionStore<T>` helper; inbox optimistic mutations share one helper; `useDataQuery` derives its error from `query.error` instead of mirroring it in `useState` (all behavior-preserving; public APIs unchanged).
- Out of scope (deferred): a `LocalResourcesProvider` implementing `ResourcesProvider` for guest mode; `dataStore`'s guest/cloud branching stays.

## Capabilities

### New Capabilities

- `unified-domain-types`: single canonical source for domain entity types (`@/resources` aliases of the `localStore` shapes); components/pages/lib may not re-declare them or bridge them with `as unknown as` casts.

### Modified Capabilities

- `resources-layer`: mode decision is confined to `dataStore` (components consume hooks only, never `(mode, userId)` free functions); `dataStore` mutations return typed entities instead of `unknown`; all cache keys go through the `queryKeys` module.

## Impact

- **Code**: `src/lib/dataStore.ts`, `src/lib/localStore.ts`, `src/lib/queryKeys.ts`, `src/lib/calendarDays.ts`, `src/components/day/DayTimeline.tsx`, `src/components/day/QuickLogDialog.tsx`, `src/components/day/ScheduleBlockDialog.tsx`, `src/components/schedule/ScheduleEditor.tsx`, `src/components/labels/LabelsEditor.tsx`, `src/components/CategoryPicker.tsx`, `src/pages/WeekPage.tsx`, `src/pages/CalendarPage/index.tsx`, `src/pages/SettingsPage.tsx`, `src/components/tour/TourProvider.tsx`; new `src/lib/toastError.ts`.
- **Behavior**: none — strictly structure/typing refactor; existing unit and E2E suites must pass unmodified.
- **APIs / schema / dependencies**: no changes.
- **Docs**: `src/resources/README.md` import-rules table gains the "components use hooks, not free functions" rule.
