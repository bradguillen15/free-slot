# FreeSlot

**A personal time-awareness app that finds the empty windows in your week — and helps you fill them with what matters.**

> Find the free time you didn't know you had — and spend it on what actually matters.

## Description

FreeSlot lets you sketch your fixed weekly schedule (work, sleep, commute, gym), log what you actually do during the day, and automatically surfaces the empty windows in your week. An AI planner can then propose how to fill those windows with activities you care about — reading, deep work, workouts, side projects, and more.

It works **without an account** — guests get the full local experience backed by `localStorage`. Creating an account unlocks AI planning, cross-device sync, and long-term stats.

## Motivation

I kept catching myself wasting time — or, worse, *thinking* I was busy when I wasn't actually spending my hours on things that mattered to me. There was plenty of noise and not much signal: I couldn't tell what I was really doing most days, let alone whether it aligned with what I wanted. Calendars show meetings; they don't show life. So I built FreeSlot — a way to log what I actually do day by day, see which activities dominate my week on a dashboard, and finally answer the honest question: **am I spending my time wisely?**

---

## Quick Start

No account or backend setup — guest mode runs entirely in your browser.

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Start the dev server**

   ```bash
   pnpm dev
   ```

3. **Open the app**

   Navigate to [http://localhost:8080](http://localhost:8080). Log your day, explore the week view, and see your free windows. Data stays in your browser via `localStorage`.

Want to develop cloud features (sign-in, sync, AI planner)? See [Contributing](#contributing).

---

## Usage

FreeSlot is organized around a simple loop: **define your week → log what you actually do → see where your time goes → adjust**. Everything below is available in guest mode unless noted.

### Calendar views

Three lenses on the same data — switch from the sidebar or the view header.

| View | Route | What you do there |
|---|---|---|
| **Day** | `/app` | Hour-by-hour timeline with a live "now" line. Click any hour to **quick-log** what you did; right-click to add a one-off or recurring block. Side panel shows a daily summary and inline **daily / standing notes**. |
| **Week** | `/app/week` | Seven-day grid with fixed schedule blocks, logged time, and **free windows** (peak vs off-peak). Click cells to log or edit. Signed-in users get an **AI planner** that suggests how to fill gaps. |
| **Month** | `/app/month` | Heatmap-style month grid — each day shows schedule blocks and logged minutes at a glance. Tap a day to jump into Day view. |

### Schedule (`/app/schedule`)

Map your **recurring week** — work, sleep, commute, gym, meals. Add blocks from presets or build custom ones, drag to reorder, and preview the full week. Edits apply everywhere that block repeats (like a recurring calendar event). Schedule blocks are separate from logs: the plan stays intact while you record what actually happened.

### Activities (`/app/activities`)

Choose **what you want more time for** — reading, deep work, workouts, side projects, etc. Set a weekly hour target per activity, toggle active/inactive, and **drag to rank priorities**. The AI planner (cloud) uses this list to fit activities into your free windows.

### Labels (`/app/labels`)

**Color-coded categories** for every log and activity — grouped into *productive*, *essential*, and *unproductive* buckets. Create custom labels, drag between columns to change type, hide defaults you don't use (history stays intact), and reorder for your dashboard breakdowns.

### Time logging

Log from **Day view** (click an hour) or **Week view** (click a cell). Each entry gets a **label**, start/end time, and optional note. Logs are optimistic — the UI updates instantly while data persists to `localStorage` (guest) or Supabase (cloud).

### Notes (`/app/notes`)

Two kinds of notes, also accessible from the Day view side panel:

- **Daily notes** — one rich-text note per day. Browse past days in a carousel or jump to today.
- **Standing notes** — a recurring intention or reminder that carries forward until you change it (e.g. "No phone before 9am").

### Dashboard (`/app/dashboard`)

Your weekly command center — available to **guests and signed-in users**:

- **KPIs** — total tracked time, days logged, and (cloud) AI plan slots.
- **Charts** — logged time per day, time-by-label pie chart, plan-vs-actual comparison.
- **Label filter** — drill into specific categories.
- **Customizable cards** — show/hide chart sections to match what you care about.
- **Weekly review** (cloud) — AI-generated reflection on how the week went.

### Settings (`/app/settings`, account only)

Tune planner preferences (weekend scheduling, weekly review day), change your password, and delete your account. Links to Schedule and Labels management cards for quick access.

### Language

Switch between **English** and **Spanish** from the language picker in the sidebar footer — the whole UI, default label names, and date formatting follow your choice.

### Guest vs cloud

| Mode | Storage | AI planner & review | Sync | How to start |
|---|---|---|---|---|
| **Guest** | `localStorage` | ❌ | ❌ | `pnpm dev` — no signup |
| **Cloud** | Supabase with RLS | ✅ | ✅ | Sign in or create an account |

When a guest signs up, `src/lib/migrateGuest.ts` snapshots their local data and migrates it into the new account.

---

## Tech stack at a glance

| Layer | Choice |
|---|---|
| Framework | **React 18** + **Vite 5** + **TypeScript 5** |
| Routing | `react-router-dom` v6 |
| Styling | **Tailwind CSS v3** with HSL design tokens (see `src/index.css`) |
| UI primitives | **shadcn/ui** on top of Radix |
| Animation | **framer-motion** |
| State / data | Custom `dataStore` hooks (cloud + guest unified); React Query is wired up but not yet adopted |
| Drag & drop | `@dnd-kit` |
| Backend | **Supabase** (self-managed) — Postgres, Auth, Edge Functions |
| AI | **Anthropic API** (Claude) — called from edge functions with `ANTHROPIC_API_KEY` |
| Tests | Vitest |

See [`docs/TECH_STACK.md`](./docs/TECH_STACK.md) for the full breakdown and [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for how it all fits together.

---

## Documentation

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — high-level architecture, data flow, the guest/cloud abstraction.
- [`docs/TECH_STACK.md`](./docs/TECH_STACK.md) — every dependency and why it's there, conventions for contributors.
- [`docs/CLOUD.md`](./docs/CLOUD.md) — backend (self-managed Supabase) — schema, RLS, edge functions, secrets.
- [`docs/DESIGN.md`](./docs/DESIGN.md) — design system, tokens, motion principles, responsive rules.
- [`docs/development_guide.md`](./docs/development_guide.md) — local setup, tests, OpenSpec harness workflow.
- [`docs/initialize-project.md`](./docs/initialize-project.md) — harness setup reference (from `harness-lidr-sdd`).

### AI development harness

This project uses the [LIDR SDD harness](https://github.com/LIDR-academy/AI4Devs-LTI-extended) for spec-driven development with Cursor and Claude Code:

```
enrich-us → /opsx:new → /opsx:ff → /opsx:apply → /opsx:verify → /opsx:archive
```

Run `/opsx:onboard` in Cursor for a guided first cycle. Requires [OpenSpec CLI](https://github.com/Fission-AI/OpenSpec): `npm install -g @fission-ai/openspec`.

---

## Project layout

```
src/
├── components/        # Feature + UI components
│   ├── ui/            # shadcn primitives
│   ├── day/           # Day-view widgets (timeline, summary, quick-log)
│   ├── week/          # Week grid + AI planner panel
│   ├── activities/    # Activity editor, priority ranker
│   └── dashboard/     # Weekly review modal
├── pages/             # Route components
├── lib/               # Pure logic & adapters
│   ├── dataStore.ts   # Unified hooks: cloud or guest, same shape
│   ├── localStore.ts  # localStorage schema mirror (guest mode)
│   ├── migrateGuest.ts# Snapshot → account on signup
│   ├── gaps.ts        # Free-window detection
│   ├── schedule.ts    # Block / log helpers
│   ├── time.ts        # Minute math
│   └── week.ts        # ISO week helpers
├── contexts/          # AuthContext (Supabase session)
├── integrations/      # Auto-generated Supabase client + types
└── test/              # Vitest setup

supabase/
├── functions/         # Edge functions (AI plan, weekly review, account delete)
└── migrations/        # SQL migrations (applied via Supabase CLI)
```

---

## Contributing

Want to pull the project down and explore the code? Here's the full local development path.

### Prerequisites

- **Node.js 18+**
- **pnpm** (`npm install -g pnpm`)
- Optional for cloud features: [Docker](https://docs.docker.com/get-docker/) + [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started)

### Clone the repo

```bash
git clone https://github.com/bradguillen15/free-slot.git
cd free-slot
```

### Install dependencies

```bash
pnpm install
```

### Run locally

Pick the mode that matches what you're working on:

#### Guest mode (default)

No Supabase needed — same as [Quick Start](#quick-start). Use this for UI work, guest flows, and most unit/E2E tests.

```bash
pnpm dev
```

#### Local Supabase

Develop or test **sign-in, sync, AI planner, and dashboard** against a backend on your machine. Requires [Docker](https://docs.docker.com/get-docker/) and the [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) (`brew install supabase/tap/supabase`).

```bash
pnpm dev:local
```

Starts a local Supabase stack, resets the schema, and runs Vite with the committed `.env.dev-local` config — no manual env setup.

#### Hosted Supabase

Connect to your **real cloud project** (staging or production):

1. Follow [`docs/MIGRATION_RUNBOOK.md`](./docs/MIGRATION_RUNBOOK.md) to create and configure a Supabase project.
2. Copy [`.env.example`](./.env.example) to `.env` and fill in your project values from the Supabase dashboard (Settings → API).
3. Run `pnpm dev` and sign in at [http://localhost:8080](http://localhost:8080).

### Build for production

```bash
pnpm build
```

### Run the test suite

```bash
# Fast gate: lint + typecheck + unit tests
pnpm verify:fast

# Full gate (adds guest E2E) — run before opening a PR
pnpm verify
```

Individual commands if you need them:

```bash
pnpm lint          # ESLint
pnpm typecheck     # TypeScript
pnpm test          # Vitest (unit)
pnpm test:e2e      # Playwright (guest flows; first run: pnpm exec playwright install chromium)
```

### Code conventions

Before adding features, skim [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) and [`docs/DESIGN.md`](./docs/DESIGN.md):

- Use **`dataStore` hooks** for data access in pages — guest and cloud share the same shape.
- Use **semantic design tokens** from `index.css` / `tailwind.config.ts` — no hardcoded colors.
- Database changes go through **Supabase migrations** — never hand-edit generated files under `src/integrations/supabase/`.

More detail: [`docs/development_guide.md`](./docs/development_guide.md).

### Submit a pull request

This is a private portfolio project, but if you have access and would like to contribute, fork the repository, create a feature branch, and open a pull request against `main`. Run `pnpm verify` before requesting review.

---

## License

Private project. All rights reserved.
