# Step 13 Report - Guest E2E Execution

- Date: 2026-06-13
- Change: add-guest-e2e-tests
- Agent: claude (frontend)

## Commands Executed
- `pnpm exec playwright test` (default/local: parallel workers)
- `CI=true pnpm test:e2e` (CI mode: single worker, 2 retries, HTML reporter)

## Result
- **23 passed**, 0 failed (Chromium).
- Local parallel run: ~14 s. CI-mode single-worker run: ~21 s.

## Suites (e2e/)
| Spec | Tests | Coverage |
|------|-------|----------|
| `smoke.e2e.ts` | 1 | App boots in guest mode (no backend), landing renders |
| `navigation.e2e.ts` | 3 | Enter app from landing; visit all 7 guest views; Settings gated |
| `onboarding.e2e.ts` | 4 | Skip + finish paths, redirect for onboarded guests, persistence |
| `schedule-blocks.e2e.ts` | 4 | Create (dialog), edit (inline), delete (confirm), reorder (DnD) |
| `activities.e2e.ts` | 2 | Create; assign category + deactivate |
| `labels.e2e.ts` | 2 | Create custom label; delete it |
| `time-logging.e2e.ts` | 1 | Quick-log entry from Day FAB, persists |
| `calendar.e2e.ts` | 5 | Day/Week/Month paging; dashboard empty vs. with-data |
| `i18n.e2e.ts` | 1 | Switch to Spanish, persists across reload |

All assertions verify both UI behavior and guest-storage persistence across reload.

## Environment
- App booted via Playwright `webServer` running `vite --mode e2e` (loads committed
  `.env.e2e` placeholders) on a dedicated port **8090** (separate from the dev
  server's 8080, so it never reuses a running dev server). No real Supabase
  project, no network access required.
- Browser: Chromium (installed via `playwright install chromium`).
- Where it runs: CD workflow on merge to `main` (`.github/workflows/e2e.yml`) and
  a local pre-push hook (`.githooks/pre-push`). Not on PR commits.

## Flakes / Mitigations
- Drag-and-drop reorder (`@dnd-kit`): manual pointer stepping past the 4px
  activation distance, dropping over the lower portion of the target row with a
  settle move. Observed one flake under 4-worker parallel load with 0 retries;
  mitigated by (a) hardening the drag motion and (b) a local retry budget of 1
  (CI: 2). Verified stable across 3 consecutive full parallel runs afterwards.
- Fixture hardening: seeding is applied once per context (sentinel guard) so
  reloads no longer clobber app writes; the language pin is a default
  (only-if-absent) so an in-app language switch persists.

## Test Environment Restoration
- Each Playwright test uses a fresh browser context (empty localStorage), so no
  cross-test cleanup is needed. No external/shared state is mutated.

## Outcome
- Step 13 status: **PASS**
- Blocking issues: none
- Out-of-scope finding (flagged separately): inline activity name/target edits in
  `ActivityEditor.tsx` do not persist due to a controlled-input onBlur diff guard.
