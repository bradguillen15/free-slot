## Context

FreeSlot is a Vite + React 18 SPA. The guest experience runs entirely client-side: `AuthContext` swallows session errors and reports `guest`, `dataStore` routes all reads/writes to `localStorage` (`localStore.ts`), and only `/app/settings` is behind `ProtectedRoute`. UI text is i18n-driven (`en`/`es`, detected from `localStorage["freeslot.lang"]` then navigator). Existing automated tests are Vitest + Testing Library under `src/**`, with `vitest.config.ts` including `src/**/*.{test,spec}` and `supabase/functions/_shared/**`.

This design covers adding a Playwright E2E harness and a progressive set of guest-flow suites without disturbing the existing Vitest setup or shipping anything to production.

## Goals / Non-Goals

**Goals:**
- Run real browser E2E against the guest flow with **zero backend dependency** (no Supabase project, no network, deterministic).
- Keep Playwright and Vitest fully isolated (separate directory, no overlapping globs, no shared config collisions).
- Make selectors stable and resilient to copy/styling changes by pinning language and preferring role/accessible-name, adding `data-testid` only where markup is ambiguous.
- Ship coverage in independently mergeable phases so value lands early and CI stays green throughout.
- Integrate into CI headless with artifacts (HTML report + trace) on failure.

**Non-Goals:**
- Authenticated/cloud flows, Settings, edge functions, and guest→cloud migration (deferred — require real Supabase infra).
- Visual regression / screenshot-diff testing.
- Replacing any existing Vitest unit/component tests.

## Decisions

### D1 — Runner: `@playwright/test` (not Cypress, not WebdriverIO)
Playwright is the modern default for Vite/React, has first-class TypeScript, auto-waiting, trace viewer, parallelism, and a built-in `webServer` launcher. Cypson/Cypress would add a second large toolchain and weaker multi-tab/parallel story. **Alternative considered**: extending Vitest browser mode — rejected because it targets component-level browser testing, not full app navigation/routing journeys.

### D2 — Test location: top-level `e2e/`, specs named `*.e2e.ts`
Vitest's include globs are scoped to `src/**` and `supabase/**`, so an `e2e/` directory at repo root cannot be picked up by Vitest. Naming specs `*.e2e.ts` (and Playwright's `testMatch` targeting `e2e/**/*.e2e.ts`) makes intent explicit and double-guards against cross-runner pickup. **Alternative**: `src/e2e/` — rejected because it sits inside Vitest's include.

### D3 — App boot without a real backend via a committed dummy env
The app needs `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` defined to construct the client, but guest mode never makes a successful call. Playwright's `webServer` runs `vite preview` with placeholder env values (e.g. `https://e2e.invalid` and a dummy anon key). `AuthContext.getSession()` rejects on the unreachable host and is caught, leaving the app in guest mode. **Alternative**: mock the Supabase client via Playwright network routing — rejected as unnecessary; the catch path already yields guest mode and avoids coupling tests to client internals. (If `getSession` proves slow to reject, fall back to `page.route` blocking the Supabase host to fail fast — captured as a risk.)

### D4 — Pin language to `en` per test via storage seed
Before each test, seed `localStorage["freeslot.lang"] = "en"` (via a fixture/`addInitScript`) so accessible-name selectors are deterministic regardless of the CI runner's locale. The i18n-switch suite (Phase 7) explicitly overrides this to assert `es`.

### D5 — Guest-state fixture owns `localStorage` lifecycle
A custom Playwright fixture (`e2e/fixtures/guest.ts`) provides a `page` that starts from a clean guest state: it clears app `localStorage` keys and optionally seeds a known profile/blocks/activities so tests that need preconditions don't have to click through onboarding every time. Tests that assert onboarding itself start from the truly-empty state. This keeps each spec independent and parallel-safe.

### D6 — Selector strategy: `data-testid`-first (decided with user)
Element identification uses `data-testid` via `page.getByTestId(...)`, configured as Playwright's `testIdAttribute`. This is deliberately chosen over Playwright's role/accessible-name default to make the suite immune to i18n copy changes (all visible text is translated `en`/`es`). Naming convention:
- `page-<view>` — each route's root container (`page-day`, `page-week`, `page-month`, `page-schedule`, `page-labels`, `page-dashboard`, `page-activities`).
- `nav-link-<view>` — sidebar navigation items.
- `<feature>-<element>` — interactive elements driven by tests (e.g. `schedule-add-block`, `label-name-input`, `quicklog-submit`, `onboarding-skip`, `onboarding-continue`, `onboarding-finish`).

**State** (not identity) is still asserted semantically: active route via `aria-current="page"` + URL, not a test-id. All `data-testid` additions are additive/non-breaking; each is introduced in the phase that needs it and existing unit tests are re-run after the source edit. Language remains pinned to `en` (D4) so the few unavoidable text assertions stay deterministic.

### D7 — Drag-and-drop via Playwright's manual mouse steps (not `dragTo`)
`@dnd-kit` uses pointer sensors with activation constraints; the high-level `locator.dragTo()` is often too fast/imprecise for it. Phase 3 reorder tests use explicit `mouse.move`/`down`/`up` with intermediate steps, and assert order persists after reload. Captured as a known-flaky area with a retry budget.

### D8 — Run E2E at deploy time + local pre-push gate (decided with user)
E2E is **not** run on every PR commit (too expensive per push). Instead:
- **CD (GitHub Actions)**: a dedicated workflow (`.github/workflows/e2e.yml`) triggers on `push` to `main` (i.e. merge) and `workflow_dispatch` (manual). It installs only Chromium (cached by Playwright version), runs `pnpm test:e2e`, and uploads `playwright-report/` + traces on failure. The PR `ci.yml` keeps only the cheap checks (lint, typecheck, unit, build).
- **Local pre-push hook**: a dependency-free git hook (committed under `.githooks/`, wired via `git config core.hooksPath .githooks` from a `prepare` script that runs on `pnpm install`) runs `pnpm test:e2e` before a push and blocks on failure. Developers can bypass with `git push --no-verify` for exceptional cases. **Alternative considered**: Husky — rejected to avoid adding a dependency and a heavier toolchain; `core.hooksPath` achieves the same sharing with zero deps. **Pre-commit vs pre-push**: chose pre-push so the suite runs once per push rather than on every commit.
- `test:e2e:ui` (Playwright UI mode) is a manual developer tool only — it cannot run headless in CI/CD and is intentionally excluded from automation.
- Single browser (Chromium) initially to keep cost down; cross-browser is a future toggle.

## Risks / Trade-offs

- **[framer-motion animations cause premature assertions]** → Rely on Playwright auto-waiting for visibility/stability; assert on post-animation state via role queries, not fixed timeouts.
- **[Radix portals (dialogs/dropdowns) render outside the DOM subtree]** → Query globally by role (`getByRole("dialog")`) rather than scoping to a parent container.
- **[`@dnd-kit` reorder flakiness]** → Manual mouse stepping (D7), `localStorage` persistence assertion as ground truth, and a small Playwright retry budget in CI.
- **[`getSession()` slow rejection delays guest boot]** → If observed, block the Supabase host with `page.route(...)` to fail immediately (D3 fallback).
- **[Selector brittleness from i18n copy changes]** → Pin `en` (D4) and prefer roles + targeted `data-testid` (D6) over raw copy where practical.
- **[CI time/cost growth]** → Single browser, sharding only if suite grows; browser binary cached by version (D8).
- **[Scope creep into cloud flows]** → Hard non-goal in proposal/specs; cloud E2E is a separate change.

## Migration Plan

Purely additive; no rollback concerns for production. Rollout = land Phase 0 (tooling + one trivial smoke spec) first to prove the harness and CI wiring, then land Phases 1–7 incrementally. Each phase keeps CI green on its own. To disable temporarily, the CI E2E job can be skipped without affecting the unit job.

## Open Questions

- Should the i18n suite (Phase 7) assert full `es` translation parity, or just that switching works on a representative screen? (Lean: representative screen only.)
- Do we want a shared seeded-guest snapshot (storageState) to speed up later phases, or always build state through the UI for higher fidelity? (Lean: fixture-seeded `localStorage` for preconditions, UI-driven for the behavior under test.)
