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
├── hooks/          # Reusable hooks shared across components (e.g. useNowMinute, useIsMobile)
├── lib/            # Pure logic & adapters (dataStore, localStore, gaps, schedule, time)
├── contexts/       # AuthContext
├── integrations/   # Generated Supabase client + types (do not edit)
└── test/           # Vitest setup
```

### Component hook co-location

When a component accumulates substantial **component-specific** effect or derivation logic
(large `useEffect`s, multi-`useMemo` stat derivations, async fetch/aggregate effects), extract it
into named custom hooks instead of inlining:

- Convert the component to a folder named after it: `Foo/index.tsx` (the component) plus one or
  more `Foo/useX.ts` hook files **used only by that component**. The folder + `index.tsx` keeps
  `import Foo from ".../Foo"` resolving, so consumer imports do not change.
- A hook that is **reusable** across components goes in `src/hooks/` instead — a co-located hook is,
  by definition, used by exactly one component.
- Extract by lifting the existing logic verbatim and returning the exact shape the component already
  consumes; keep behavior identical.

Examples: `pages/DashboardPage/` (`useDashboardStats`, `useWeeklyReviewPrompt`),
`components/dashboard/WeeklyReviewModal/` (`useWeeklyReviewData`),
`components/activities/PriorityRanker/` (`usePriorityData`),
`pages/CalendarPage/` (`useAutoScrollToHour`, `useAddBlockHereListener`); the reusable
`useNowMinute` lives in `src/hooks/`.

## Data Access Rules

1. **Pages and feature components** must use `dataStore` React Query hooks for reads (`useCategories`, `useActivities`, `useTimeLogsInRange`, `useProfile`, `useWeeklyPlan`, etc.).
2. **Never** fetch data in `useEffect` — no hand-rolled `useState` + Supabase/localStorage reads in components.
3. **Writes** go through `dataStore` async mutation functions or `use*Mutation` hooks; they invalidate query keys automatically — do not thread manual `refresh()` / `onSaved` callbacks.
4. **Never** call `supabase.from(...)` from pages or components (ESLint enforced). Allowed locations: `src/lib/**`, `src/contexts/AuthContext.tsx`, `src/integrations/**`, and temporary overrides listed in `eslint.config.js` until Phase 3 stragglers migrate.
5. Account-only features (AI planner, weekly reviews, settings) may use cloud-only hooks or edge functions via `dataStore` — not raw component fetches.
6. New client-accessible tables need `localStore.ts` parity, a fetcher in `dataFetchers.ts`, query keys in `queryKeys.ts`, and a hook in `dataStore.ts`.

### React Query cheat sheet

| Task | Pattern |
|---|---|
| Read guest/cloud data | `useCategories()`, `useTimeLogsInRange(start, end)`, … |
| Cloud-only read | `useWeeklyPlan(weekStart)` with `enabled: !!user` inside the hook |
| Write + cache update | `await upsertCategory(mode, userId, input)` or `useUpsertCategoryMutation()` |
| Manual refetch | `const { refresh } = useCategories(); await refresh()` (prefer mutation invalidation) |
| Optimistic log insert | `setData` from `useTimeLogsInRange` → backed by `queryClient.setQueryData` |
| Query keys | Always use `queryKeys.*` from `@/lib/queryKeys` — never string literals |
| Tests | Wrap with `renderWithProviders()` or `createHookWrapper()` from `src/test/renderWithProviders.tsx` |

Query client defaults live in `src/lib/queryClient.ts` (`staleTime: 30s`, `retry: 1`, `refetchOnWindowFocus: false`). Guest localStorage writes invalidate guest query keys via a global bridge — do not add per-hook storage listeners.

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
- **Named imports only** — do not use `import * as`. Import the specific symbols you need:
  - React: `import { forwardRef } from "react"` and `import type { HTMLAttributes } from "react"`.
  - Radix / libraries: `import { Root, Trigger } from "@radix-ui/react-dialog"`.
  - Internal modules: import functions and types by name; alias on conflict (e.g. `upsertCategory as localUpsertCategory` when a wrapper shares the same name).
  - Enforced by ESLint (`no-restricted-syntax` on `ImportNamespaceSpecifier` in `eslint.config.js`).

## Testing

- Vitest for unit and component tests.
- Run `bun run test` before completing a task.
- Test pure logic in `src/lib/` (gaps, schedule, time) with focused unit tests.
- Mock `dataStore` or `localStore` when testing pages — do not hit Supabase in unit tests.
- Component tests that render `dataStore` consumers must wrap with `QueryClientProvider` via `renderWithProviders()` (`src/test/renderWithProviders.tsx`).

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
