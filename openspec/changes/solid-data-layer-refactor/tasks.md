# Tasks: solid-data-layer-refactor

## 0. Setup: Working Branch (MANDATORY - FIRST STEP)

- [x] 0.1 Confirm working branch. User explicitly directed implementing on the current branch `feature/dashboard-activity-trends` (on top of its uncommitted work) — do NOT create a new branch. Record `git status` baseline so refactor edits can be distinguished from pre-existing dashboard edits.
- [x] 0.2 Record grep tripwire baselines (as-unknown-as: 33, mode-derivation: 12, toast-catch: 24; suite baseline 74 files / 596 tests green) (non-test source): `as unknown as` count, `user ? "cloud" : "guest"` count, `err instanceof Error ? err.message` count.

## 1. Phase 1 — Unified domain types (spec: unified-domain-types)

- [x] 1.1 Re-point `PickerCategory` in `src/components/CategoryPicker.tsx` to `Pick<Category, "id" | "name" | "color" | "type">` using the `@/resources` `Category`.
- [x] 1.2 Delete the local `ScheduleBlock`/`TimeLog` declarations in `src/components/day/DayTimeline.tsx` and `Category` in `src/components/day/QuickLogDialog.tsx`; import from `@/resources` (narrow props with `Pick<>` only where the component genuinely uses fewer fields). Update all importers (`ScheduleEditor.tsx`, `WeekPage.tsx`, `CalendarPage/index.tsx`, `ScheduleBlockDialog.tsx`, and any others found by grep) to import types from `@/resources`.
- [x] 1.3 Remove the now-unneeded `as unknown as` casts: `WeekPage.tsx:83-115`, `ScheduleEditor.tsx:240`, `CalendarPage/index.tsx`, and the no-op casts at `calendarDays.ts:71-73`.
- [x] 1.4 Replace hardcoded query-key literals at `dataStore.ts:709-710` with `queryKeys.dailyNote(...)` and a new `queryKeys.dailyNotesForWeekPrefix(mode, userId)` helper (add helper + unit test in `queryKeys`/dataStore tests only if a new helper is created; existing tests unmodified).
- [x] 1.5 Gate: `npx tsc --noEmit`, `npm run lint`, `pnpm test` all green; grep confirms `as unknown as` remains only in `_providers/supabase/mappers.ts` and `AIPlanPanel.tsx`, and no `export type ScheduleBlock|TimeLog|Category` under `src/components/` or `src/pages/`.

## 2. Phase 2 — Typed mutations, hooks-only components, shared error toast (spec: resources-layer delta)

- [x] 2.1 Remove `let result: unknown` from `insertTimeLog`, `updateTimeLog`, `upsertActivity`, `upsertScheduleBlock`, `upsertCategory` in `dataStore.ts`; return the typed branch values. Delete caller casts (e.g. `(created as { id: string }).id` at `ScheduleEditor.tsx:332`).
- [x] 2.2 TDD: add `src/lib/toastError.test.ts` (Error message shown; non-Error falls back to translated `common.somethingWrong`), then implement `src/lib/toastError.ts` as `toastError(err: unknown, t: TFunction): void`. Replace all 24 duplicated catch blocks.
- [x] 2.3 Add missing dataStore mutation hooks (audit: activities upsert/delete, category delete, category reorder, time-log hooks already exist) and migrate every component off `(mode, userId)` free-function calls onto hooks: `ScheduleEditor.tsx`, `LabelsEditor.tsx`, `ScheduleBlockDialog.tsx`, `QuickLogDialog.tsx`, `SettingsPage.tsx`, `CalendarPage/index.tsx`, `TourProvider.tsx`. Components keep try/catch around `mutateAsync` so toast timing is unchanged; remove `useAuth` imports used only for mode/userId.
- [x] 2.4 Gate: `npx tsc --noEmit`, `npm run lint`, `pnpm test` green; grep confirms `user ? "cloud" : "guest"` exists only in `src/lib/dataStore.ts` (non-test) and `err instanceof Error ? err.message` count is 0 outside `toastError.ts`.

## 3. Phase 3 — Dedupe storage/query boilerplate (behavior-preserving)

- [x] 3.1 Extract internal `collectionStore<T>(storageKey, buildDefaults)` factory in `localStore.ts` producing `list/upsert/remove/reorder`; re-express categories, activities, schedule_blocks through it, preserving exact current semantics (per-entity default fills, `deleteCategory` default-guard wrapper). Public function names/signatures unchanged; `localStore.test.ts` passes unmodified.
- [x] 3.2 Extract private `useOptimisticListMutation` helper in `dataStore.ts`; re-express `useAddInboxItem`/`useArchiveInboxItem` with it. Existing dataStore tests pass unmodified.
- [x] 3.3 Derive `fetchError` in `useDataQuery` from `query.error` via `toErrorMessage`; drop the `useState` mirror.
- [x] 3.4 Gate: `npx tsc --noEmit`, `npm run lint`, `pnpm test` green with existing tests unmodified.

## 4. Review and Update Existing Unit Tests (MANDATORY)

- [x] 4.1 Audit test files touching refactored modules (`dataStore*.test.ts`, `localStore.test.ts`, component tests for ScheduleEditor/QuickLogDialog/WeekGrid/pages): they MUST pass unmodified, with one scoped exception — tests that `vi.mock("@/lib/dataStore")` pinning the free-function `(mode, userId, input)` signature (ActivityEditor, QuickLogDialog, ScheduleBlockDialog, SettingsPage, TourProvider tests) are updated mechanically to mock the corresponding `use*Mutation` hooks, preserving the asserted payloads and behavior semantics. Any other test edit means behavior changed and must be fixed in source instead.
- [x] 4.2 Confirm new tests exist only for new helpers (`toastError`, and `queryKeys` helper if added).

## 5. Run Unit Tests and Verify State (MANDATORY - AGENT MUST EXECUTE)

- [x] 5.1 Capture baseline: full `pnpm test` result set before Phase 1 (pass/fail counts) — the refactor must reproduce the same set. (No backend DB is touched; the persisted state here is guest `localStorage`, exercised by the unit suite in jsdom — no external state to restore.)
- [x] 5.2 Run targeted tests per phase (already in gates 1.5/2.4/3.4), then the full suite after Phase 3.
- [x] 5.3 Create report `openspec/changes/solid-data-layer-refactor/reports/<date>-step-5-unit-test-and-state-verification.md` with commands, pass/fail counts, and confirmation that no test file was modified.

## 6. Manual Endpoint Testing with curl (MANDATORY — N/A JUSTIFICATION)

- [x] 6.1 Not applicable: this change creates/modifies no HTTP endpoints, edge functions, database schema, or Supabase queries — it is a client-side structural refactor. Record this justification in the step-5 report. Cloud call sites are unchanged (`resources` provider untouched).

## 7. Final verification: `pnpm verify` (MANDATORY once before archive - AGENT MUST EXECUTE)

- [x] 7.1 No `e2e/*.e2e.ts` updates expected (no user-visible flow, testid, or dialog changes); confirm by reviewing diffs for touched components' testids.
- [x] 7.2 Run `pnpm verify` once after all phases complete (lint + typecheck + unit + guest E2E). Cloud E2E lane not required (no auth/DB/migration changes).
- [x] 7.3 Fix any failures before archive.

## 8. Update Technical Documentation (MANDATORY)

- [x] 8.1 `src/resources/README.md`: add the "components consume dataStore hooks, never `(mode, userId)` free functions" rule to the import-rules table; note typed mutation returns.
- [x] 8.2 Check `docs/ARCHITECTURE.md` and `docs/frontend-standards.md` for statements invalidated by the refactor (duplicate type locations, error-toast pattern) and update if referenced.
