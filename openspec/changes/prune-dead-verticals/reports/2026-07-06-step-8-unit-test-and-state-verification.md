# Step 8 Report - Unit Tests and State Verification

- Date: 2026-07-06
- Change: prune-dead-verticals
- Agent: Claude (Fable 5)

## Commands Executed

- Baseline `pnpm test` on branch creation: **5 failed / 606 passed** — the failures were pre-existing on `main` (`dataStore.test.ts` confirmDay suite hardcoded `2026-07-06`, which became "today"; same class as the earlier `ConfirmDayButton` fix `b925b32`). Fixed first as its own commit (past Monday `2025-07-07`) and cherry-picked to `feature/ci-cd-hardening` to unblock PR #21.
- TDD red→green: `pnpm vitest run supabase/functions/_shared/planning.test.ts` (capDailyNotes + note-count cap: 3 failing → 32 passing) and `pnpm vitest run src/lib/migrateGuest.test.ts` (note_json carry: 1 failing → 9 passing).
- Per-phase gates: `pnpm typecheck` (tsc -p tsconfig.app.json), `pnpm lint`, targeted vitest runs.
- Full suite after all phases: `pnpm test` → **580 passed / 0 failed** (74 files). Count delta vs baseline reflects deleted dead-vertical tests (weekly-review, inbox, celebrate) and added TDD tests.
- Lint: 0 errors (2 pre-existing react-refresh warnings in untouched files).
- Final gate: `pnpm verify` — recorded under Step 9.

## State Verification

Unit tests run against jsdom localStorage with per-test isolation; no external database or deployed infrastructure is touched. No cleanup required.

## Step "curl" N/A Justification

The only endpoint change (`generate-weekly-plan` reading capped `daily_notes`, structural 400 caps, CORS env) is covered by the pure-helper unit tests (`capDailyNotes`, prompt-builder tests); exercising the deployed function requires Supabase infra, which the CD pipeline covers on merge. The `weekly-review` function was deleted, not modified (remote instance to be removed manually: `supabase functions delete weekly-review`).

## Test File Modifications (design D5 scope)

Deleted with their subjects: `weeklyReview.test.ts`, `celebrate.test.ts`. Trimmed of deleted-code blocks only: `planning.test.ts`, `gemini.test.ts`, `client.test.ts`, `client.writes.test.ts`, `dataStore.test.ts` (review hooks describe blocks + date fix), `SettingsPage.test.tsx` (weekly_review_day fixture fields), `AIPlanPanel.test.tsx` (inbox mock line), `e2e/fixtures/guest.ts` (inbox seed/read helpers). New tests: planning caps (3), migrateGuest note_json (1). All other tests pass unmodified.

## Outcome

- Step 8 status: PASS
- Blocking issues: none
