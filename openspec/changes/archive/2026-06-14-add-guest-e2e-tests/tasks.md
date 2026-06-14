# Tasks — add-guest-e2e-tests

Progressive, phased plan. Each phase (1–8) is a self-contained, independently mergeable E2E suite; CI stays green after every phase. Commands use the repo's package manager (`pnpm`). Reports live in `openspec/changes/add-guest-e2e-tests/reports/`.

> TDD note for E2E: for each suite, write the spec first and run it to confirm it **meaningfully exercises and observes** the flow (fails clearly if the flow is broken, e.g. by temporarily asserting a wrong expectation), then settle to green. E2E here verifies existing app behavior, so "red first" means proving the test actually drives the UI, not introducing new product code.

## 0. Setup: Create Feature Branch (MANDATORY - FIRST STEP)

- [x] 0.1 Create feature branch `feature/add-guest-e2e-tests` from `main`
- [x] 0.2 Verify branch creation and current branch status

## 1. Phase 0 — Playwright tooling & harness (~2h)

- [x] 1.1 Add `@playwright/test` as a dev dependency and install the Chromium browser
- [x] 1.2 Create `playwright.config.ts`: `testDir: "e2e"`, `testMatch: "**/*.e2e.ts"`, `webServer` running `vite --mode e2e` (loads `.env.e2e`) on port 8080, single Chromium project, `trace: "on-first-retry"`, retries in CI only
- [x] 1.3 Add a committed dummy env for E2E (`.env.e2e`, whitelisted in `.gitignore`) so the app boots in guest mode without a real Supabase project
- [x] 1.4 Add npm scripts: `test:e2e` (headless) and `test:e2e:ui` (interactive)
- [x] 1.5 Update `.gitignore` for `test-results/`, `playwright-report/`, `e2e/.cache/`
- [x] 1.6 Create guest-state fixture `e2e/fixtures/guest.ts`: extends `test` with a page that seeds `freeslot.lang = "en"` via `addInitScript`, and exposes `seedGuest`/`readGuestProfile`/`readGuestScheduleBlocks` helpers (fresh context per test already isolates localStorage)
- [x] 1.7 Write trivial smoke spec `e2e/smoke.e2e.ts` (landing page renders) and confirm the harness boots the app and runs headless — passes
- [x] 1.8 Confirm Vitest still ignores `e2e/` (`vitest list` shows 0 e2e specs) and run `pnpm lint` (0 errors)

## 2. Phase 1 — Navigation smoke suite (~2h)
Covers spec: "Guest can navigate all guest-accessible views".

- [x] 2.1 `e2e/navigation.e2e.ts`: Landing → "Try the app" routes into the guest experience without sign-in
- [x] 2.2 Skip onboarding, then visit Day, Week, Month, Schedule, Labels, Dashboard, Activities — assert each route loads, the active nav reflects it, and stable headings render
- [x] 2.3 Assert `/app/settings` redirects to the auth screen for a guest
- [x] 2.4 Selector strategy decided with user: **`data-testid`-first** (design D6 updated). Added `aria-current="page"` + `data-testid="nav-link-<view>"` to nav links and `data-testid="page-<view>"` to all 7 guest page roots (+ `CalendarViewHeader` `testId` prop, Landing test-ids). Configured `testIdAttribute` in Playwright. Retrofitted smoke + navigation specs. Affected unit tests pass; `pnpm lint` clean

## 3. Phase 2 — Onboarding flow suite (~2h)
Covers spec: "Guest can complete and skip onboarding".

- [x] 3.1 `e2e/onboarding.e2e.ts`: from empty guest state, skip onboarding → asserts profile `onboarding_skipped` and redirect to `/app`
- [x] 3.2 Step through schedule → activities → preferences, choose a non-default review day, finish → asserts `onboarding_completed` + `weekly_review_day` and redirect to `/app` (added `onboarding-skip/continue/finish/review-day-<idx>` test-ids)
- [x] 3.3 A completed/skipped guest opening `/onboarding` is redirected to `/app`
- [x] 3.4 Verify guest-mode persistence (reload keeps completed state); Onboarding unit test passes; `pnpm lint` clean

## 4. Phase 3 — Schedule blocks suite (~2h)
Covers spec: "Guest can manage schedule blocks".

- [x] 4.1 `e2e/schedule-blocks.e2e.ts`: create a block via the Add-block dialog → appears in list and persists after reload
- [x] 4.2 Edit a block's name inline (onBlur) → updated value persists after reload
- [x] 4.3 Delete a block via the confirm dialog → removed and absent after reload
- [x] 4.4 Reorder via drag-and-drop using manual mouse stepping (`@dnd-kit` PointerSensor) → new order persists after reload
- [x] 4.5 Added `data-testid` to schedule rows, drag handles, name inputs, edit/duplicate/delete actions, add-block button, confirm-delete, and dialog name/submit; hardened the fixture so seeding only runs once per context (reloads no longer clobber app writes); schedule unit tests pass; `pnpm lint` clean

## 5. Phase 4 — Activities & labels suite (~2h)
Covers specs: "Guest can manage activities" and "Guest can manage labels".

- [x] 5.1 `e2e/activities.e2e.ts`: create an activity via the editor form → appears, persists after reload
- [x] 5.2 Assign a category (edit) then deactivate an activity → both persist after reload. NOTE: inline name/target edits use a controlled-input + onBlur-diff guard that drops the change (likely latent product bug) — flagged as a separate task; the edit assertion uses the category Select which persists reliably
- [x] 5.3 `e2e/labels.e2e.ts`: create a custom label via the Add dialog → appears in list, persists after reload
- [x] 5.4 Delete a custom label via the confirm dialog → removed, absent after reload (defaults are non-deletable by design)
- [x] 5.5 Added test-ids to ActivityEditor (rows, name/category/active/delete, add form) + AddLabelDialog + LabelRow; affected unit tests pass; `pnpm lint` clean

## 6. Phase 5 — Time logging suite (~2h)
Covers spec: "Guest can log time and see it reflected".

- [x] 6.1 `e2e/time-logging.e2e.ts`: quick-log a time entry (title + explicit 09:00–09:30 range) via the Day FAB → stored against the day (added `day-fab`, `day-log-time`, `quicklog-title/start/end/submit` test-ids)
- [x] 6.2 Verify the entry persists after reload (title + time range asserted from guest storage)
- [x] 6.3 QuickLogDialog unit test passes; `pnpm lint` clean

## 7. Phase 6 — Calendar views & dashboard suite (~2h)
Covers spec: "Guest can navigate calendar views and see the dashboard".

- [x] 7.1 `e2e/calendar.e2e.ts`: page next/previous on Day (round-trip) and forward on Week and Month → each view's heading updates to the corresponding range
- [x] 7.2 Dashboard (in `calendar.e2e.ts`): with no logs the empty state shows; with a seeded log it renders and the empty state is gone (reflects aggregates). Added `dashboard-empty` test-id
- [x] 7.3 Calendar paging uses existing hardcoded aria-labels (Next/Previous day|week|month) for the state action and `page-*` test-ids for the heading; Dashboard unit test passes; `pnpm lint` clean

## 8. Phase 7 — i18n / cross-cutting suite (~1h)
Covers spec: "Guest can switch language".

- [x] 8.1 `e2e/i18n.e2e.ts`: switch to Spanish via the sidebar switcher → "My schedule" becomes "Mi horario" and persists across reload. Added `lang-switcher`/`lang-option-<code>` test-ids; made the fixture lang-pin a default (only-if-absent) so a user switch persists
- [x] 8.2 Full e2e suite (23 tests) green; `pnpm lint` clean

## 9. CD integration + local pre-push gate (~1.5h)
Covers spec: "E2E runs at deploy time with a local pre-push gate".

- [x] 9.1 Removed the E2E job from the PR `ci.yml`; created `.github/workflows/e2e.yml` triggered on `push` to `main` + `workflow_dispatch`: pnpm + Node 22, `playwright install --with-deps chromium` cached via `actions/cache` keyed on `pnpm-lock.yaml`, runs `pnpm test:e2e`
- [x] 9.2 PR CI (`ci.yml`) now runs only lint, typecheck, unit (coverage), and build — no E2E on PR commits
- [x] 9.3 The CD workflow fails on any E2E failure and uploads `playwright-report/` + `test-results/` on failure
- [x] 9.4 Added a dependency-free pre-push hook: `.githooks/pre-push` runs `pnpm test:e2e`; `prepare` script wires `git config core.hooksPath .githooks` on install; bypassable via `git push --no-verify`
- [x] 9.5 `test:e2e:ui` kept as a manual dev-only command (documented; excluded from automation)
- [~] 9.6 Validated locally in CI mode (`CI=true pnpm test:e2e` → 23 passed). Live GitHub Actions run on `main` pending a merge (deferred until commit/push is requested)

## 10. Review and Update Existing Unit Tests (MANDATORY)

- [x] 10.1 All source edits are additive `data-testid`/`aria-current`/one optional prop; located impacted Vitest tests (AppLayout, Onboarding, Schedule*, Activity*, AddLabelDialog, QuickLogDialog, Dashboard, Surface)
- [x] 10.2 No test changes were required — markup additions are non-breaking; full suite (195 tests) passes unchanged

## 11. Run Unit Tests and Verify Guest State (MANDATORY - AGENT MUST EXECUTE)
> Adaptation: this is a client-only change with no database. "State verification" targets the app's guest store (`localStorage`) and lint/typecheck integrity instead of a DB.

- [x] 11.1 Baseline captured: parent branch (work stashed) has 195 passing unit tests and 17 pre-existing typecheck errors
- [x] 11.2 Targeted unit tests re-run after each selector edit — all pass
- [x] 11.3 Full suite: `pnpm test` (195 passed), `pnpm lint` (clean), `pnpm typecheck` (17 errors, all pre-existing — 0 introduced; verified by stash/compare)
- [x] 11.4 Confirmed guest store/localStorage behavior unchanged (edits are additive attributes/props only)
- [x] 11.5 Report created: `reports/2026-06-13-step-11-unit-test-and-state-verification.md`
- [x] 11.6 Complete — tests pass and report exists

## 12. Manual Endpoint Testing with curl (MANDATORY — N/A)

- [x] 12.1 N/A: this change adds no backend endpoints, edge functions, or API routes. Justification documented in the Step 11 report; curl testing skipped.

## 13. E2E Testing with Playwright (MANDATORY - AGENT MUST EXECUTE)
> This change's deliverable is the E2E suite itself; verification = the agent runs the full suite and confirms green.

- [x] 13.1 App boots via Playwright `webServer` (`vite --mode e2e`) — confirmed
- [x] 13.2 Ran the complete guest E2E suite headless: `pnpm test:e2e` and `CI=true pnpm test:e2e`
- [x] 13.3 All suites pass — **23 tests** (navigation, onboarding, schedule blocks, activities, labels, time logging, calendar, dashboard, i18n)
- [x] 13.4 Applied DnD manual-stepping + fixture seeding/lang-pin hardening; suite stable across local + CI-mode runs
- [x] 13.5 Report created: `reports/2026-06-13-step-13-e2e-execution.md`

## 14. Update Technical Documentation (MANDATORY)

- [x] 14.1 Updated `docs/development_guide.md`: E2E commands + a new "End-to-end tests (Playwright)" section (fixture, selector convention, no-backend boot, scope)
- [x] 14.2 Updated `docs/TECH_STACK.md`: added Playwright to the Testing table
- [x] 14.3 All artifacts/docs are in English; consistent with documentation standards
