# Design: solid-data-layer-refactor

## Context

Full-repo SOLID review (approved plan: `~/.claude/plans/i-want-you-to-modular-pearl.md`). The layered architecture (pages → dataStore hooks → resources → supabase provider) is sound; the erosion is at the seams:

- `ScheduleBlock`/`TimeLog` re-declared in `src/components/day/DayTimeline.tsx:28-49`, `Category` in `QuickLogDialog.tsx:39` — near-but-not-identical copies of the `localStore` shapes, so consumers bridge with `as unknown as` (~15 sites; the three in `calendarDays.ts:71-73` are no-ops). Canonical aliases already exist in `src/resources/types/*` but are barely used.
- `user ? "cloud" : "guest"` re-derived in 10+ components; components call dataStore free functions with `(mode, userId)` although mutation hooks exist.
- dataStore mutation functions declare `let result: unknown` and return it; callers re-cast.
- 24 copies of `toast.error(err instanceof Error ? err.message : t("common.somethingWrong"))`.
- `useUpsertDailyNote` hardcodes query-key literals; localStore CRUD triplets and inbox optimistic mutations are structural clones; `useDataQuery` mirrors `query.error` into `useState`.

Constraint: this change layers on top of the in-flight `feature/dashboard-activity-trends` working tree (user decision); it is strictly behavior-preserving, so existing tests must pass unmodified.

## Goals / Non-Goals

**Goals:**
- One canonical source for domain types; zero domain-shape double-casts outside the mapper boundary.
- Components mode-blind: hooks only; mode derivation exists solely in `dataStore.ts`.
- Fully typed mutation results; shared error-toast helper; all query keys via `queryKeys`.
- Dedupe localStore CRUD and optimistic-mutation boilerplate without changing public APIs.

**Non-Goals:**
- No `LocalResourcesProvider` / removal of dataStore's guest branches (deferred Phase 4 of the review plan).
- No behavior, schema, API, or dependency changes; no test rewrites.
- No restructuring of `ScheduleEditor` beyond what the hook/toast migration yields naturally.

## Decisions

1. **Re-point, don't re-shape**: components import `ScheduleBlock`/`TimeLog`/`Category` from `@/resources` (aliases of `Local*`). Where a component used optional fields the canonical type marks required (e.g. `TimeLog.date`), the component keeps working because the canonical type is *wider at the value level* — hook data already satisfies it. `PickerCategory` becomes `Pick<Category, "id" | "name" | "color" | "type">`. Alternative (keep component types, add mappers) rejected: mappers add runtime cost for identical data.
2. **Typed mutations by inference**: delete `let result: unknown`; return each branch's value directly (`localUpsertScheduleBlock(...)` and `resources.scheduleBlocks.upsert(...)` already share return types). No new types needed.
3. **`toastError` as a plain function** `toastError(err: unknown, t: TFunction): void` in `src/lib/toastError.ts` (not a hook) so it works in async callbacks without hook rules; call sites already have `t`.
4. **Hooks-only rule enforced socially + by grep gate**, not ESLint, in this change: the free functions must stay exported for `migrateGuest`/`confirmDay`/tests, so an import ban would be noisy. A follow-up may add `no-restricted-imports` patterns (mirrors the existing supabase-client ban precedent in `eslint.config.js`).
5. **`collectionStore<T>(storageKey, buildDefaults)`** internal factory in `localStore.ts` producing `list/upsert/remove/reorder`; existing exported function names re-export the generated ones so the public API and tests stay untouched. `deleteCategory`'s default-guard stays as a wrapper around the generic remove.
6. **`useOptimisticListMutation`** private helper in `dataStore.ts` (not a new module) parameterized by key, mutationFn, and optimistic list updater — used by inbox add/archive only; wider adoption deferred.
7. **Query keys**: add `queryKeys.dailyNote(...)` reuse + `queryKeys.dailyNotesForWeekPrefix(mode, userId)` for the prefix invalidation at `dataStore.ts:709-710`.

## Risks / Trade-offs

- [Widening component prop types to canonical shapes ripples into test fixtures missing `created_at`/`notes`] → canonical fields stay optional where the component genuinely doesn't need them by using `Pick<>` narrowing at the prop boundary instead of the full type; run `tsc` after each file.
- [Refactor sits on top of uncommitted dashboard work; mixed diff] → user-accepted; keep edits surgical and never touch dashboard-trend logic; user separates commits.
- [Hook migration changes error-surfacing timing (mutation hooks vs try/catch)] → components keep try/catch around `mutateAsync` so toast behavior is identical.
- [Five component tests mock `@/lib/dataStore` free functions, pinning the internal `(mode, userId, input)` API that Phase 2 removes from components] → those mocks are migrated mechanically to hook mocks (`use*Mutation` returning `{ mutateAsync }`), keeping the asserted payloads unchanged; this is wiring, not behavior, so the regression guarantee holds. All other tests stay untouched. `AIPlanPanel` is account-only, hardcodes `"cloud"`, and needs a batch-insert hook that does not exist — it stays on `insertTimeLog`/`resources.insertMany` and is recorded as a follow-up.
- [collectionStore generalization silently changes edge behavior (e.g. upsert-on-missing-id)] → existing `localStore.test.ts` must pass unmodified; write the factory to reproduce current semantics exactly, including "Untitled"/default fills per entity.

## Migration Plan

Three sequential, independently-green phases (unify types → typed mutations/hooks/toast → dedupe), each gated by `npx tsc --noEmit`, `npm run lint`, full vitest, and the grep tripwires (`as unknown as`, `user ? "cloud" : "guest"`, `err instanceof Error ? err.message` counts). Rollback = revert the phase's edits; no data or schema migration involved.

## Open Questions

None blocking. ESLint enforcement of the hooks-only rule is explicitly deferred to a follow-up change.
