## Why

FreeSlot has solid unit/component coverage (Vitest + Testing Library) but **no end-to-end coverage** of the flows a real user clicks through. Regressions in routing, the onboarding gate, dialogs, drag-and-drop reordering, and the guest data layer can only be caught by running the app by hand today. The guest experience is uniquely cheap to cover with E2E because it boots **without any backend** — `AuthContext` falls back to guest on session error and all guest data lives in `localStorage` — so a Playwright suite needs no Supabase project, no network, and no seeded database, while still exercising the same React UI, routing, forms, and dataStore that signed-in users hit.

## What Changes

- Add Playwright (`@playwright/test`) as the project's E2E runner, configured to launch the Vite preview server, pin language to `en`, and run headless in CI.
- Isolate E2E from Vitest: tests live in a top-level `e2e/` directory (outside Vitest's `src/**` + `supabase/**` include globs) so the two runners never collide.
- Introduce a small set of E2E support helpers (a guest-state fixture that clears/seeds `localStorage`, and stable accessible-name/`data-testid` selectors where current markup is ambiguous).
- Deliver guest E2E coverage **progressively, in phases**, each phase a self-contained, independently mergeable suite:
  - **Phase 0 — Tooling**: install Playwright, `playwright.config.ts`, npm scripts, `.gitignore`, dummy `.env` for guest boot.
  - **Phase 1 — Navigation smoke**: Landing → enter app, onboarding skip, then visit every guest view (Day, Week, Month, Schedule, Labels, Dashboard, Activities) asserting each renders and the nav reflects the active route.
  - **Phase 2 — Onboarding flow**: 3-step wizard (schedule → activities → preferences), both the **skip** and **finish** paths, asserting the resulting `localStorage` profile flags and redirect to `/app`.
  - **Phase 3 — Schedule blocks**: create, edit, reorder (drag-and-drop), and delete a recurring block from `/app/schedule`, asserting persistence across reload.
  - **Phase 4 — Activities & labels**: create/edit/deactivate an activity (`/app/activities`) and create/edit/delete a label (`/app/labels`).
  - **Phase 5 — Time logging**: quick-log a time entry and confirm it appears on the Day/Calendar view and survives reload.
  - **Phase 6 — Calendar views & dashboard**: navigate Day/Week/Month (date paging, free-window display) and verify the Dashboard renders aggregates derived from logged data.
  - **Phase 7 — Cross-cutting**: language switch (en/es) and guest-data reset/empty states.
- Run the E2E suite at **deploy time** (a GitHub Actions workflow on merge to `main`) plus a **local pre-push git hook**, rather than on every PR commit (E2E is too expensive to run per push). The PR CI keeps only the cheap checks (lint, typecheck, unit, build). The workflow uploads the HTML report/trace on failure; the pre-push hook is bypassable with `--no-verify`.
- Document how to run and write E2E tests in the development guide.

Non-goals (explicitly out of scope for this change): authenticated/cloud flows, Settings page, edge-function flows (`generate-weekly-plan`, `delete-account`, `weekly-review`), and guest→cloud migration. These need real Supabase infrastructure and are deferred to a future change.

## Capabilities

### New Capabilities
- `guest-e2e-testing`: End-to-end (browser) test coverage of the guest user journey, including the Playwright tooling/configuration, the guest-state fixture, the phased suites (navigation, onboarding, schedule blocks, activities, labels, time logging, calendar views, dashboard, i18n), and CI integration. This capability owns the requirements for *what guest behavior must be verified end to end* and *how the E2E harness must behave* (no backend dependency, deterministic, isolated from Vitest).

### Modified Capabilities
<!-- None. No existing product spec's requirements change; this adds a new testing capability only. -->

## Impact

- **New dev dependency**: `@playwright/test` + downloaded Chromium browser (CI cache recommended).
- **New files**: `playwright.config.ts`, `e2e/` (specs + fixtures/helpers), CI workflow additions in `.github/workflows/`, docs update in `docs/development_guide.md`.
- **Config touchpoints**: `package.json` scripts (`test:e2e`, `test:e2e:ui`), `.gitignore` (`test-results/`, `playwright-report/`, `e2e/.auth`), and a committed dummy `.env`/CI env so the app boots in guest mode without a real Supabase project.
- **Possible minor source touch**: adding `data-testid` or accessible names to a few elements where current markup lacks a stable selector (e.g., schedule block rows, nav active state). These are additive and non-breaking.
- **No production/runtime impact**: nothing ships to users; the app bundle and behavior are unchanged.
