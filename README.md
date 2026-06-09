# FreeSlot

> Find the free time you didn't know you had — and spend it on what actually matters.

FreeSlot is a personal time-awareness app. You sketch your fixed weekly schedule (work, sleep, commute, gym), log what you actually do during the day, and FreeSlot automatically surfaces the empty windows in your week. An AI planner can then propose how to fill those windows with activities you care about (Reading, Deep work, Workout, side projects…).

It works **without an account** — guests get the full local experience backed by `localStorage`. Creating an account unlocks AI planning, cross-device sync, and long-term stats.

---

## Quick start

```bash
# install
bun install            # or: npm install / pnpm install

# dev server (Vite, http://localhost:8080 by default)
bun run dev

# typecheck + production build
bun run build

# tests
bun run test           # one-shot
bun run test:watch     # watch mode

# lint
bun run lint
```

The app boots straight into guest mode — no setup needed to play with it. Lovable Cloud (Supabase) is wired up automatically when you sign in.

---

## What's in the box

- **Day view** (`/app`) — hour-by-hour timeline, click any hour to log what you did, optimistic UI, "now" line.
- **Week view** (`/app/week`) — 7-day grid showing fixed blocks, logged time, and free windows (peak vs off-peak). AI planner overlays suggested slots for signed-in users.
- **Month view** (`/app/month`) — heatmap-style grid summarising productive vs unproductive minutes per day.
- **Activities** (`/app/activities`) — what you want to spend more time on, with weekly hour targets and drag-to-rank priorities.
- **Dashboard** (`/app/dashboard`, account only) — weekly review, planned-vs-actual, AI-generated insights.
- **Settings** (`/app/settings`, account only) — peak hours, buffer minutes, weekend handling, account deletion.

### Mode switching

| Mode | Storage | AI features | Sync | Trigger |
|---|---|---|---|---|
| **Guest** | `localStorage` (monthly buckets for logs) | ❌ | ❌ | Default — no signup |
| **Cloud** | Lovable Cloud / Supabase with RLS | ✅ | ✅ | Sign in or create account |

When a guest signs up, `src/lib/migrateGuest.ts` snapshots their localStorage data and migrates it into the new account.

---

## Tech stack at a glance

| Layer | Choice |
|---|---|
| Framework | **React 18** + **Vite 5** + **TypeScript 5** |
| Routing | `react-router-dom` v6 |
| Styling | **Tailwind CSS v3** with HSL design tokens (see `src/index.css`) |
| UI primitives | **shadcn/ui** on top of Radix |
| Animation | **framer-motion** |
| State / data | React Query, custom `dataStore` hooks (cloud + guest unified) |
| Forms | `react-hook-form` + `zod` |
| Drag & drop | `@dnd-kit` |
| Backend | **Lovable Cloud** (Supabase) — Postgres, Auth, Edge Functions |
| AI | **Lovable AI Gateway** (no API key needed) — Gemini & GPT models |
| Tests | Vitest |

See [`docs/TECH_STACK.md`](./docs/TECH_STACK.md) for the full breakdown and [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for how it all fits together.

---

## Documentation

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — high-level architecture, data flow, the guest/cloud abstraction.
- [`docs/TECH_STACK.md`](./docs/TECH_STACK.md) — every dependency and why it's there, conventions for contributors.
- [`docs/CLOUD.md`](./docs/CLOUD.md) — backend (Lovable Cloud / Supabase) — schema, RLS, edge functions, secrets.
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
└── migrations/        # SQL migrations (managed by Lovable Cloud)
```

---

## Contributing

1. Read [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) and [`docs/DESIGN.md`](./docs/DESIGN.md) before adding features.
2. Use the **`dataStore` hooks** for any data access in pages — never hit Supabase directly from a page if a Day/Week/Month-equivalent guest view should also work.
3. Use **semantic design tokens** from `index.css` and `tailwind.config.ts`. Never hardcode colors like `bg-white` or `text-black`.
4. Database changes go through Supabase migrations. Never edit `src/integrations/supabase/{client,types}.ts` — both are generated.
5. Run `bun run test` before opening a PR.

---

## License

Private project. All rights reserved.
