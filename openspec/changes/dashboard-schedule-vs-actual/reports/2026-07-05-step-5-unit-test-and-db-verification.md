# Step 5 Report — Unit Tests and Database Verification

- Date: 2026-07-05
- Change: dashboard-schedule-vs-actual
- Agent: Claude Code (Fable 5)

## Commands Executed

- TDD: `pnpm vitest run src/lib/scheduleVsActual.test.ts` — 16 tests written first, implementation passed all on first run (per-label totals, overnight attribution, overlap adherence, displacement invariants, earliest-start tie-breaking, same-label priority, filter semantics)
- `pnpm vitest run src/lib/localStore.test.ts` — 33 passed (persisted exclusions + visible-cards migration for older stored shapes)
- `pnpm vitest run src/pages/DashboardPage src/components/dashboard/LabelFilter.test.tsx` — 13 passed (three-state cycling, card rows/adherence/displacement, exclusion persistence)
- Full suite: `pnpm vitest run` — **579 tests passed**
- E2E (targeted): `pnpm playwright test e2e/dashboard-schedule-vs-actual.e2e.ts` — 2 passed (pinned clock; UI-built data; Sleep exclusion persists across reload)
- Final gate: `pnpm verify` — result recorded under Step 7 in tasks.md

## Database Verification

This change is frontend-only: no migrations, no schema changes, no edge functions. `supabase migration list` unchanged (local and remote in sync through `20260704120001`). Unit tests run against localStorage and a mocked Supabase client — no remote mutations; no cleanup required.

## Manual Verification (Step 6.1)

Preview walkthrough as guest with the suggested schedule applied: card math verified by hand — Sleep 56h (8h × 7), Deep work 35h (7h × 5 weekdays), Meals 5h, adherence 0% with nothing logged, deltas −56h/−35h/−5h. Displacement expand shows kept/unlogged breakdown. Sleep exclusion cycles neutral→included→excluded, removes the row, persists across reload (`freeslot.guest.dashboard.excluded_labels`). Verified at 1280px and 390px, English and Spanish.
