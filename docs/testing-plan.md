# Testing Plan — FreeSlot (plan-grow)

**Status:** draft — not yet started (except Phase 1 seed, see below)
**Goal:** systematic test coverage, prioritized by where bugs have actually occurred, executable in small per-session increments.
**Companion docs:** [code-review-plan.md](./code-review-plan.md) (the findings that motivate the priorities), CLAUDE.md (TDD is mandatory for new functionality).

---

## Where we are today

- **Tooling already configured:** Vitest 3 + jsdom + `@testing-library/react` v16 + `@testing-library/jest-dom`, globals on, `@` alias resolved, setup file with a `matchMedia` mock ([vitest.config.ts](../vitest.config.ts), [src/test/setup.ts](../src/test/setup.ts)).
- **Existing tests (24 assertions across 4 files):** `src/lib/time.test.ts`, `src/lib/gaps.test.ts`, `src/lib/localStore.test.ts` (written 2026-06-10 alongside the code-review fixes), plus the placeholder `src/test/example.test.ts`.
- **Missing tooling:** `@testing-library/user-event` (component interaction tests), `@vitest/coverage-v8` (coverage reports). No CI runs tests; no coverage thresholds.

The 2026-06-10 code review found that **every Critical/High bug lived in `src/lib`** (date math, gap detection, migration, the dual-store adapter) — exactly the pure-logic code that is cheapest to test. That drives the phase order below: logic first, adapter second, components third, E2E last.

## Conventions (apply to every phase)

- Tests are colocated: `src/lib/foo.ts` → `src/lib/foo.test.ts`; components likewise (`.test.tsx`).
- All test names and descriptions in English (CLAUDE.md §2).
- **Pin the timezone** in any test touching dates: `process.env.TZ = "America/New_York"` at the top of the file, *before* imports that construct Dates. Most of our date bugs only reproduce west of UTC.
- Reset state in `beforeEach` (`localStorage.clear()`, `vi.restoreAllMocks()`).
- Mock at the module boundary, not deeper: `vi.mock("@/integrations/supabase/client")` is the single seam for all cloud code.
- New features keep following TDD (red → green); this plan is about back-filling the existing code.
- One phase per session is the intended pace; update the status table below as you go (same protocol as code-review-plan.md).

## Test pyramid target

| Layer | Tool | Target |
|---|---|---|
| Pure logic (`src/lib`) | Vitest, no mocks | ~90% line coverage — this is where the bugs were |
| Adapter (`dataStore`, `migrateGuest`) | Vitest + mocked supabase client | All error/retry/race paths |
| Components | Testing Library + user-event | Behavior of forms/dialogs/guards, not snapshots |
| Edge functions | Extracted pure helpers tested in Vitest | Prompt building, payload validation |
| E2E | Playwright (optional, last) | 3–4 guest-mode smoke flows |

---

## Phases & status

| # | Phase | Scope | Status | Date | Notes |
|---|---|---|---|---|---|
| 0 | Infra | Add `@vitest/coverage-v8` + `@testing-library/user-event`; add `test:coverage` script; delete `src/test/example.test.ts`; decide CI (GitHub Actions running `lint`, `tsc --noEmit`, `test`, `build`) | done | 2026-06-10 | `.github/workflows/ci.yml` created (lint+typecheck+test+build). NOTE: commit `pnpm-lock.yaml` — CI uses `--frozen-lockfile` |
| 1 | Pure lib completion | `week.ts`, `celebrate.ts`, remaining `time.ts`/`gaps.ts`/`localStore.ts` surface | done | 2026-06-10 | week/time/celebrate at 100% lines; gaps 96%, localStore 97.5%. schedule.ts excluded from coverage (data-only constants) |
| 2 | dataStore adapter | All 5 read hooks + 7 mutations with mocked supabase | done | 2026-06-10 | Shared mock in `src/test/supabaseMock.ts` (queueable per-table results, call recording, delayed responses for race tests). All 6 must-cover behaviors landed |
| 3 | migrateGuest | Full migration matrix with mocked supabase | done | 2026-06-10 | All 7 matrix rows incl. failure-preserves-guest-data and retry-dedupe; `src/test/factories.ts` (seedGuestData) created |
| 4 | Component behavior | Dialogs, Settings categories, PriorityRanker, gates | done | 2026-06-10 | QuickLogDialog, ScheduleBlockDialog, DaySummary, PriorityRanker (guest persistence), OnboardingGate. Skipped: SettingsPage rename (covered manually by the fix; Radix-heavy render), dnd drag simulation (jsdom can't), OnboardingGate error-path (write TDD with that fix) |
| 5 | Edge functions | Extract + test pure helpers; payload validation | done | 2026-06-10 | `supabase/functions/_shared/planning.ts` extracted + tested; BOTH open backend findings fixed in the wiring: generate-weekly-plan now validates AI slots before persisting, weekly-review now upserts instead of delete+insert |
| 6 | E2E smoke (optional) | Playwright, guest mode only (no backend needed) | pending | | Decide whether the maintenance cost is worth it now that lib+adapter coverage exists |

**Execution result (2026-06-10):** 99 tests across 13 files, all passing. Coverage on `src/lib`: **95.4% lines** (threshold 85% enforced in vitest.config — regressions fail the run). tsc clean, lint 0 errors, build passes. Definition of done met except the optional E2E phase. Remember to verify the GitHub Actions run on first push.

---

## Phase 1 — Pure lib completion (~1 session)

Already covered: `expandRange` (normal/overnight/zero-length), `durationMinutes`, `blocksOnDay` overnight attribution, `findFreeWindows` zero-length block, `listLogsInRange` month/year boundaries, corrupt-shape fallbacks, `updateLog` throw/update.

To add:

- **week.ts** — `weekStartISO` (Monday convention: a Sunday date → previous Monday; a Monday → itself; year boundary), `weekDays` (7 consecutive days), `fmtWeekRange` (same-month vs cross-month rendering).
- **time.ts** — `addDaysISO` across month/year/DST boundaries (TZ-pinned); `toMin`/`fromMin` round-trip incl. `"24:00"`-adjacent values; `fmtDuration` (59m / 60m / 90m / rounding); `isoToWeekday`.
- **gaps.ts** — buffer clamping (the old C-3 bug: late-evening window + buffer must not produce start > end); `minWindowMinutes` filtering boundary (exactly 30 = kept); peak overlap edges (window touching peak start/end); merged overlapping blocks+logs; `dayStart`/`dayEnd` clipping.
- **localStore.ts** — `upsertActivity`/`upsertScheduleBlock` insert-vs-update branches; `deleteLog` across buckets; `insertLog` bucketing by month; `snapshot`/`hasGuestData` (each trigger: activities, blocks, logs, priorities, onboarding flag); `clearGuestData` removes only `freeslot.guest.*` keys and fires the change event; `setPriorities`/`listPriorities` round-trip; `ensureBootstrap` idempotence (run twice → 9 categories, not 18).
- **celebrate.ts** — threshold behavior at the integer boundary (ratio = best+1 no, best+2 yes with default minDelta), minimum-total gate, best-ratio persistence. (The review refuted an off-by-one only because callers pass integers — the test should pin that contract.)

## Phase 2 — dataStore adapter (~1 session)

Mock seam: `vi.mock("@/integrations/supabase/client", ...)` returning a chainable query stub whose terminal value is configurable per test (`{ data, error }`). Render hooks with `renderHook` from Testing Library; wrap in a stubbed `AuthContext` provider (or mock `useAuth`) to switch guest/cloud.

Must-cover behaviors (each was a real finding):

1. **Error keeps data:** hook has data → next refresh returns `{ error }` → `data` unchanged, `error` set, no clobber to `[]`.
2. **Error clears on recovery:** failing refresh then succeeding refresh → `error` back to null, new data applied.
3. **Stale-response guard** (`useTimeLogsInRange`): two in-flight refreshes, the older resolves last → its result is discarded.
4. **Guest tick:** dispatching `freeslot:guest-change` re-reads localStorage; `storage` event ditto.
5. **Guest/cloud parity of mutations:** `updateTimeLog` rejects on missing id in BOTH modes; `insertTimeLog` returns the created row in both modes.
6. **Mutations propagate errors:** every mutation throws on `{ error }` (no silent success).

## Phase 3 — migrateGuest (~1 session)

Same supabase mock seam, plus seeded localStorage fixtures (a `seedGuestData()` factory helper in `src/test/factories.ts` — build it here, reuse everywhere).

Matrix (each row one test):

- Happy path: all inserts succeed → counts correct, `clearGuestData` called, localStorage empty.
- Category SELECT fails → throws, **localStorage untouched** (the original Critical bug).
- Category INSERT fails → throws, localStorage untouched.
- time_logs chunk 2 of 3 fails → throws, localStorage untouched.
- Retry after partial: cloud already has 2 of 5 activities / some blocks / some logs → only missing rows inserted (dedupe by name / name+times / date+times), priorities upserted without constraint error.
- Custom categories map to new cloud ids; default categories map to trigger-created ids; logs referencing them carry the right `category_id`.
- `hasGuestData() === false` → returns `{ migrated: false }`, zero supabase calls.

## Phase 4 — Component behavior (~1–2 sessions)

Use `user-event`; assert behavior, not markup. Priority order:

1. **QuickLogDialog** — rejects end ≤ start with a toast; Save disabled without category; optimistic row passed to `onOptimisticInsert`; success toast only after insert resolves (mock dataStore).
2. **ScheduleBlockDialog** — rejects empty name, zero days, equal start/end; accepts overnight (22:00→06:00); preset chips set the right day arrays.
3. **SettingsPage categories** — rename commits on blur with trimmed value, skips no-op; delete asks for confirmation; failed update reverts the optimistic overlay. (Regression suite for the broken-rename bug.)
4. **PriorityRanker** — guest mode persists to localStore and survives remount (regression for the display-only bug); cloud mode issues one upsert (assert no `.delete()` call).
5. **OnboardingGate / ProtectedRoute** — needs-onboarding redirects to /onboarding; completed redirects away from /onboarding; profile query error does NOT bounce an onboarded user (currently an open finding — write this test when fixing it, TDD).
6. **DaySummary** — aggregates by category, overnight log contributes wrapped duration (pins the shared-durationMinutes convention end to end).

## Phase 5 — Edge functions (~1 session, includes refactor)

The Deno functions are currently monolithic request handlers — extract their pure parts into testable modules (e.g. `supabase/functions/_shared/prompts.ts`): prompt construction from gaps/activities/priorities, slot-payload validation (day format, start < end or explicit overnight, slot inside a submitted window), review-payload formatting (`fmt` minutes). Test those in Vitest (they're plain TS). The thin Deno handler keeps auth + I/O only.

This pairs with the open review findings: server-side slot validation and the weekly-review upsert — write the validators test-first, then wire them in.

## Phase 6 — E2E smoke (optional)

Playwright against `vite dev`, guest mode only (no backend or secrets needed): complete onboarding → land on /app; quick-log via hour click → block renders + DaySummary updates; create overnight schedule block → week view shows the following-morning occupancy; reload → data persists. Decide whether the maintenance cost is worth it after Phases 0–4; the guest mode makes this unusually cheap since there are no external dependencies.

---

## Definition of done (whole plan)

- `pnpm test:coverage` reports ≥85% lines on `src/lib`, with thresholds enforced in vitest.config so regressions fail the run.
- CI green-gates lint + typecheck + tests + build on every push.
- Every Critical/High bug from code-review-plan.md has a named regression test.
- `src/test/factories.ts` exists and new tests use it instead of ad-hoc fixtures.
