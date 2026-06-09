---
description: Frontend development standards for FreeSlot (plan-grow) — React, Vite, Tailwind, shadcn/ui, guest/cloud data patterns
globs: ["src/**/*.{ts,tsx}", "tailwind.config.ts", "src/index.css", "vite.config.ts", "package.json"]
alwaysApply: true
---

# Frontend Standards — FreeSlot (plan-grow)

## Overview

FreeSlot is a React SPA built with Vite and TypeScript. The most important architectural rule is the **guest/cloud abstraction**: pages use `dataStore` hooks so features work in guest mode (`localStorage`) and cloud mode (Supabase) with the same API.

**Canonical references:** `docs/ARCHITECTURE.md`, `docs/TECH_STACK.md`, `docs/DESIGN.md`

## Technology Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + Vite 5 + TypeScript 5 |
| Routing | react-router-dom v6 |
| Styling | Tailwind CSS v3, HSL design tokens (`src/index.css`) |
| UI | shadcn/ui on Radix |
| Animation | framer-motion |
| State / data | React Query + `dataStore` hooks |
| Forms | react-hook-form + zod |
| Drag & drop | @dnd-kit |
| Tests | Vitest + Testing Library |

## Project Structure

```
src/
├── components/     # Feature + UI (ui/, day/, week/, activities/, dashboard/)
├── pages/          # Route components
├── lib/            # Pure logic & adapters (dataStore, localStore, gaps, schedule, time)
├── contexts/       # AuthContext
├── integrations/   # Generated Supabase client + types (do not edit)
└── test/           # Vitest setup
```

## Data Access Rules

1. **Pages and feature components** must use `dataStore` hooks (`useCategories`, `useActivities`, `useTimeLogsInRange`, etc.).
2. **Never** call `supabase.from(...)` directly from a page that should work in guest mode.
3. Account-only features (AI planner, dashboard, settings) may call Supabase or edge functions directly.
4. New client-accessible tables need `localStore.ts` parity and a `dataStore` hook.

## UI / UX Standards

- Use **semantic tokens** from `index.css` and `tailwind.config.ts`. Avoid hardcoded colors (`bg-white`, `text-black`).
- Follow motion patterns in `docs/DESIGN.md` (framer-motion for view transitions).
- Use existing shadcn primitives under `src/components/ui/` before adding new dependencies.
- Forms: react-hook-form + zod resolvers; match existing dialog/modal patterns.

## Coding Standards

- Functional components and hooks only.
- Explicit TypeScript types for props and hook return shapes.
- English for all identifiers, comments, and user-facing copy.
- Prefer small, focused components; colocate feature code under `components/<feature>/`.

## Testing

- Vitest for unit and component tests.
- Run `bun run test` before completing a task.
- Test pure logic in `src/lib/` (gaps, schedule, time) with focused unit tests.
- Mock `dataStore` or `localStore` when testing pages — do not hit Supabase in unit tests.

## Scripts

```bash
bun run dev          # Vite dev server (default :8080)
bun run build        # Production build
bun run test         # Vitest one-shot
bun run test:watch   # Vitest watch
bun run lint         # ESLint
```

## Git Workflow

- Branch naming: `feature/<short-description>` or `fix/<short-description>`
- Conventional commits encouraged
- Do not commit `.env` or generated Supabase client files
