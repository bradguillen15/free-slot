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
```

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
- [ ] `bun run test` passes
- [ ] `bun run lint` passes
- [ ] No hardcoded colors; semantic tokens used
- [ ] Data access via `dataStore` hooks where required

## Harness Initialization

This project was initialized from `harness-lidr-sdd`. See `docs/initialize-project.md` for the full harness setup guide.
