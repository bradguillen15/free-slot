# Deep Code Review — FreeSlot

**Date:** 2026-06-21
**Branch:** `feature/ui-cleanup`
**Reviewer:** Claude (code-auditing skill)
**Scope:** `src/`, `supabase/functions/`, `supabase/migrations/`, tests, build/typecheck/lint baseline
**Graded against:** [`docs/review-rubric.md`](./review-rubric.md)

---

## Executive summary

The codebase is in good architectural shape: the guest/cloud `dataStore` abstraction is clean, the
new `resources/` provider layer enforces a clear import boundary, edge functions verify their caller,
and pure logic in `src/lib` is well covered by focused unit tests. The historical issues in
`CODE_AUDIT.md` (C-1/C-2/C-3, H-1, T-1/T-2/T-3) are resolved.

**However, the branch ships a broken baseline:** `pnpm typecheck` fails and 5 unit tests fail. Both
trace to the recent "essential category type" work (`1c7fe48`) and a UI refactor (`179dc9c`) that were
merged without re-running `typecheck`/`test` to green. One of the failures is a **real data-consistency
bug** (new cloud signups get the wrong category types), not just a stale test.

The earlier "exit 0" readings during this review came from running `pnpm typecheck`/`pnpm test`
through `| tail`, where the pipe's exit code masked the real failure — now codified as `R-TYPE-1`.

| Category | Critical | High | Medium | Low |
|---|---|---|---|---|
| Broken baseline | 2 | — | — | — |
| Correctness / data | 1 | 1 | 2 | — |
| Security | — | — | 1 | — |
| Tests | — | 1 | — | 1 |
| Lint / hygiene | — | — | 1 | 1 |

---

## Baseline state (as found)

| Check | Result |
|---|---|
| `pnpm lint` | ✅ 0 errors, 6 warnings (3 in generated `coverage/`, 3 `exhaustive-deps` in `useDashboardStats.ts`) |
| `pnpm typecheck` | ❌ **fails** — `dataStore.ts:386` (TS2345) |
| `pnpm test` | ❌ **5 failed / 367** (`defaultCategorySeed.test.ts` ×1, `MonthPage.test.tsx` ×4) |

---

## Critical

### C-1 — Typecheck fails: `essential` union not threaded into `localStore.insertLog`
**Rule:** R-SYNC-2, R-TYPE-1 · **Location:** `src/lib/localStore.ts:340`, surfaced at `src/lib/dataStore.ts:386`

`LocalTimeLog.type` is `"productive" | "unproductive" | "essential"`, and `dataStore.insertTimeLog`
accepts the same union, but `insertLog`'s inline param type still reads
`type: "productive" | "unproductive"`. Guest-mode insertion of an `essential`-typed log fails to
compile. The `essential` value was added to the schema/types but not threaded through every layer.

**Fix:** add `"essential"` to the `insertLog` param union (update/move already use `Partial<LocalTimeLog>`).

### C-2 — New cloud signups get wrong category types (seed ↔ trigger divergence)
**Rule:** R-SYNC-1 · **Location:** `supabase/migrations/20260620000000_add_essential_category_type.sql`, `handle_new_user()` in `20260612130000_*.sql`

The `essential` migration ran `UPDATE categories SET type='essential' … WHERE is_default AND name IN
('Sleep','Meals','Chores & errands')` — fixing **existing** rows — but never redefined
`handle_new_user()`. That trigger still inserts those three as `'productive'`. Result: every **new**
cloud signup gets Sleep/Meals/Chores as `productive`, diverging from guest mode (`essential`) and from
already-migrated users. `defaultCategorySeed.test.ts` correctly catches this.

**Fix:** new migration that `CREATE OR REPLACE FUNCTION handle_new_user()` with the corrected
`essential` types; then update the sync test to resolve the latest `handle_new_user` migration instead
of a hardcoded filename (R-TEST-4).

---

## High

### H-1 — Stale MonthPage tests assert removed responsive markup
**Rule:** R-TEST-1 · **Location:** `src/pages/MonthPage.test.tsx:66-164`

Four tests look for a `.hidden.sm:block` vertical strip. The `179dc9c` refactor replaced it with an
always-visible `MonthDayStrip` (`absolute inset-0`), so the selector now matches the small
day-duration `span` (`hidden sm:block`) or nothing. The colored-segment behavior still works — the
tests are coupled to private CSS classes, the R-TEST-1 anti-pattern. **Fix:** assert that segments
render in the strip by behavior (positioned `span[style]` with the log/block color), drop the
responsive-class assertions.

### H-2 — Time-log `note_json` is guest-only: silently dropped in cloud mode and on migration ⚠️ flagged
**Rule:** R-ARCH-1 (guest/cloud parity) · **Location:** `src/components/day/QuickLogDialog.tsx:153,178`, `src/resources/_providers/supabase/client.ts:291`, no `note_json` column in any `time_logs` migration

`QuickLogDialog` writes `note_json` (rich Tiptap content) onto a time log and `DayTimeline` shows a
sticky-note icon when present — but this works **only in guest mode**. The cloud `time_logs` table has
no `note_json` column, the single-insert and `insertMany` mappers explicitly strip it
(`{ note_json: _n, ...l }`), so for signed-in users the sticky-note content is silently discarded on
every insert, and guest content is lost on account migration.

This is a **pre-existing parity gap**, not a regression from this branch, and the correct fix needs a
schema decision: either (a) add `note_json jsonb` to `time_logs` + thread it through the mappers and
`TimeLogInput`/`migrateGuest`, or (b) remove `note_json` from time logs if rich notes belong only on
daily notes. **Flagged for a dedicated change (schema + product decision), not fixed in this pass.**

---

## Medium

### M-1 — `migrateGuest` notes/inbox steps are not retry-safe
**Rule:** R-SYNC-3 · **Location:** `src/lib/migrateGuest.ts:178-196`

The file header promises "Each step also dedupes against rows already in the cloud", but steps 7
(daily notes) and 8 (inbox) `insertMany` unconditionally. A partial-failure retry after these inserts
duplicates notes/inbox items. **Fix:** dedupe daily notes by `date` and inbox by `(content, created_at)`
against existing cloud rows, matching the pattern used for categories/activities/blocks/logs.

### M-2 — Edge functions leak internal error messages to clients
**Rule:** R-SEC-2 · **Location:** `generate-weekly-plan/index.ts:128,134`, `weekly-review/index.ts:86,92`

Both return raw `insErr.message` / `e.message` in the HTTP body. `delete-account` already does this
correctly (logs internally, returns a generic message). **Fix:** log server-side, return a generic
`"Could not save plan"` / `"Unexpected error"`.

### M-3 — Dashboard label filter silently broken (was logged only as exhaustive-deps warnings)
**Rule:** R-DATA-1 · **Location:** `src/pages/DashboardPage/useDashboardStats.ts:44,69,88`

`perDay`, `catBreakdown`, and `planVsActual` all read `filteredLogs` in their bodies but listed `logs`
in their dependency arrays. When a user applies a label filter (`labelIds`), `filteredLogs` recomputes
but those three memos do **not** — while `daysLogged` (correctly keyed on `filteredLogs`) does. Result:
applying a label updates the days-logged count but leaves the day chart, category breakdown, and
plan-vs-actual showing unfiltered data. The lint warnings were the visible symptom of a real
correctness bug. **Fixed:** dependency arrays now use `filteredLogs`.

---

## Low / hygiene

### L-1 — Unused `eslint-disable` directives in generated coverage output
**Location:** `coverage/block-navigation.js`, `prettify.js`, `sorter.js`

`coverage/` is build output and should not be linted. **Fix:** add `coverage` to the `ignores` array
in `eslint.config.js` (alongside `dist`).

### L-2 — Doc drift: `gaps.ts` no longer takes `bufferMinutes`
**Location:** `docs/ARCHITECTURE.md:117-126` vs `src/lib/gaps.ts:84`

`ARCHITECTURE.md` documented a `bufferMinutes` parameter that the current `findFreeWindows` signature
no longer has. **Fixed:** doc now lists the real params (`minWindowMinutes`, peak window, day bounds).

### L-3 — Inbox cloud provider bypasses generated Supabase types
**Rule:** R-TYPE-2 · **Location:** `src/resources/_providers/supabase/client.ts:458-468` (and other `inbox_items` methods)

The `inbox_items` methods use `(supabase as any)` with `eslint-disable no-explicit-any` because the
table is missing from `src/integrations/supabase/types.ts`. Regenerate the Supabase types so the inbox
resource is fully typed and the casts/disables can be removed. **Flagged** (requires `supabase gen types`).

---

## Test & coverage assessment ("are we testing correctly?")

**Strengths.** ~367 tests across 49 files. Pure logic (`gaps`, `time`, `schedule`,
`scheduleCollisions`, `weeklyReview`, `calendarDays`, `daySegments`) has focused unit tests with good
edge-case intent (overnight wrap, collisions). The data layer has the right testing seams:
`createMockResourcesProvider`, `renderWithProviders`, provider-contract + mapper + hook-routing tests.
The seed↔trigger **sync guard** (`defaultCategorySeed.test.ts`) is exactly the kind of cross-source
invariant test that catches real divergence — and it did (C-2).

**Gaps.**
1. **Brittle UI tests (H-1).** MonthPage couples to CSS utility classes; refactors break tests without
   behavior changing. Prefer role/label/output assertions (R-TEST-1).
2. **Stale-by-filename sync test.** `defaultCategorySeed.test.ts` hardcodes a migration filename, so it
   silently tests old SQL once a newer migration redefines the trigger. It should resolve the latest
   `handle_new_user` migration (R-TEST-4).
3. **Migration coverage holes.** `migrateGuest.test.ts` did not catch the notes/inbox retry
   duplication (M-1) — add an idempotent-retry assertion (run the migration twice, expect no dupes).
   It also wouldn't surface the time-log `note_json` parity gap (H-2) — add a field-completeness check.
4. **Edge functions are largely untested for the error/leak paths** (M-2). `_shared/planning.ts` is
   tested; the handlers' auth + error-shaping are not.

**Discipline note.** The branch was committed with `typecheck` + `test` red. Per `R-TEST-5` and the
test-harness memory, green `pnpm typecheck && pnpm test && pnpm lint` is the merge gate — wire it into
the pre-commit hook / CI so a red baseline can't land again.

---

## Prioritized action plan

| # | Issue | Rule | Effort | Status |
|---|---|---|---|---|
| C-1 | Thread `essential` into `insertLog` | R-SYNC-2 | S | ✅ fixed |
| C-2 | New migration for `handle_new_user()` essential types + de-stale sync test | R-SYNC-1 | M | ✅ fixed |
| H-1 | Rewrite MonthPage strip tests to behavior | R-TEST-1 | M | ✅ fixed |
| H-2 | Time-log `note_json` cloud parity (schema) | R-ARCH-1 | M | ⚠️ flagged (needs schema change) |
| M-1 | Dedupe notes/inbox migration steps | R-SYNC-3 | M | ✅ fixed |
| M-2 | Stop leaking edge-fn error messages | R-SEC-2 | S | ✅ fixed |
| M-3 | Fix dashboard label filter (deps bug) | R-DATA-1 | S | ✅ fixed |
| L-1 | Ignore `coverage/` in ESLint | R-DEP | S | ✅ fixed |
| L-2 | Reconcile `gaps.ts` buffer doc | — | S | ✅ fixed |
| L-3 | Regenerate Supabase types for `inbox_items` | R-TYPE-2 | S | ⚠️ flagged (needs `supabase gen types`) |

### Follow-ups requiring their own change (not fixed here)

- **H-2** — Time-log `note_json` cloud schema + mapper (or remove the field). Schema + product decision.
- **L-3** — Regenerate `src/integrations/supabase/types.ts` to type `inbox_items`; drop the `as any` casts.
- **CI gate** — Wire `pnpm typecheck && pnpm test && pnpm lint` into the pre-commit hook / CI so a red
  baseline can't merge again (R-TEST-5). The `.githooks` dir exists; add the gate there.

---

## Post-fix baseline (verified)

| Check | Result |
|---|---|
| `pnpm typecheck` | ✅ pass |
| `pnpm lint` | ✅ 0 errors, 0 warnings |
| `pnpm test` | ✅ 367 / 367 pass (49 files) |
