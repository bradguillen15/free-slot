# Development Guide — FreeSlot (plan-grow)

## Prerequisites

- Node.js 18+ or [Bun](https://bun.sh)
- OpenSpec CLI: `npm install -g @fission-ai/openspec`

## Setup

```bash
cd free-slot
bun install    # or: npm install / pnpm install
```

Copy `.env.example` to `.env` and fill in your Supabase project values (`VITE_SUPABASE_*`). See `docs/MIGRATION_RUNBOOK.md` for the full backend setup.

## Run Locally

```bash
bun run dev      # http://localhost:8080 (default)
```

The app boots in **guest mode** — no account required. Sign in to test cloud features (AI planner, dashboard, sync).

## Build & Quality

```bash
bun run build        # Production build
bun run lint         # ESLint
bun run test         # Vitest (one-shot)
bun run test:watch   # Vitest watch mode
pnpm test:e2e        # Playwright guest E2E (headless)
pnpm test:e2e:ui     # Playwright in interactive UI mode
```

## End-to-end tests (Playwright)

Browser E2E lives in `e2e/` (specs named `*.e2e.ts`) and covers the **guest user
flow** end to end. Key facts:

- **No backend required.** Playwright's `webServer` runs the app with `vite
  --mode e2e`, which loads the committed placeholder `.env.e2e`. The app boots
  into guest mode (localStorage-backed) and never contacts a real Supabase
  project — runs are deterministic and offline.
- **Isolation from Vitest.** Vitest only includes `src/**` and `supabase/**`, so
  `e2e/` is never picked up by `pnpm test` (and vice versa).
- **Selectors are `data-testid`-first** via `page.getByTestId(...)` so tests are
  immune to i18n copy changes. Convention: `page-<view>` for route roots,
  `nav-link-<view>` for sidebar items, `<feature>-<element>` for controls
  (e.g. `schedule-add-block`, `quicklog-submit`). Active route is asserted via
  `aria-current="page"`, not a test-id. Language is pinned to English by default.
- **Fixtures/helpers** live in `e2e/fixtures/guest.ts`: `seedGuest(page, …)`
  seeds guest preconditions (profile, schedule blocks, activities, time logs)
  into localStorage before navigation (once per context), plus `readGuest*`
  helpers to assert persisted state.
- **Scope:** guest flows only. Authenticated/cloud flows, Settings, and edge
  functions are intentionally out of scope (they need real Supabase infra).

### When E2E runs

- **While implementing:** use `pnpm test` (and `pnpm lint` / `pnpm typecheck` as needed). Do **not** run the full E2E suite after every small change — it is slow.
- **Final verification (once):** `pnpm verify` runs lint, typecheck, unit tests, **and** guest E2E. Run this when you believe the change is done, before archive or PR.
- **PR CI:** `.github/workflows/ci.yml` runs `pnpm verify:ci` on every pull request (same gate, plus build and coverage).
- **CD:** merge to `main` reuses `ci.yml` before deploy.
- **Optional local pre-push:** `.githooks/pre-push` runs `pnpm test:e2e` before push if you want an extra guard; bypass with `git push --no-verify`. Agents should rely on one `pnpm verify` at completion instead of re-running E2E repeatedly.
- **One-time setup:** `pnpm install` and `pnpm exec playwright install chromium`.
- `pnpm test:e2e:ui` is for interactive debugging only.

When guest-visible flows change, update matching `e2e/*.e2e.ts` specs in the same change. Use `pickDefaultLabel()` from `e2e/fixtures/guest.ts` when create dialogs require a label.

## OpenSpec / Harness Workflow

| Step | Command | Purpose |
|---|---|---|
| Onboard | `/opsx:onboard` | Guided first change cycle |
| New change | `/opsx:new <name>` | Start `openspec/changes/<name>/` |
| Fast-forward | `/opsx:ff` | Generate proposal, specs, design, tasks |
| Implement | `/opsx:apply` | Work through tasks.md |
| Verify | `/opsx:verify` | Check implementation vs specs |
| Archive | `/opsx:archive` | Sync specs and archive change |

Verify OpenSpec:

```bash
openspec --version
openspec schemas
```

## Key Docs Before Coding

1. `docs/ARCHITECTURE.md` — guest/cloud abstraction
2. `docs/frontend-standards.md` / `docs/backend-standards.md`
3. `docs/DESIGN.md` — tokens and motion
4. `docs/CLOUD.md` — schema, RLS, edge functions

## Manual Verification Checklist

- [ ] Feature works in **guest mode** (if not account-gated)
- [ ] Feature works when **signed in** (cloud mode)
- [ ] `pnpm verify` passes once at the end (lint, typecheck, unit tests, guest E2E)
- [ ] No hardcoded colors; semantic tokens used
- [ ] Data access via `dataStore` hooks where required

## Harness Initialization

This project was initialized from `harness-lidr-sdd`. See `docs/initialize-project.md` for the full harness setup guide.
