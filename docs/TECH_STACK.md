# Tech Stack & Conventions

Everything FreeSlot uses, why it's there, and how to use it consistently.

---

## Core

| Tech | Version | Why |
|---|---|---|
| **React** | 18 | UI runtime. We use function components + hooks exclusively. |
| **TypeScript** | 5 | Type safety across the whole codebase. |
| **Vite** | 5 | Dev server + build. Fast HMR, ESM-native. |
| **react-router-dom** | 6 | Client-side routing. Routes declared in `src/App.tsx`. |

---

## Styling & UI

| Tech | Why |
|---|---|
| **Tailwind CSS v3** | Utility-first styling. **Always use semantic tokens** from `src/index.css` (`bg-background`, `text-foreground`, `bg-primary`, `bg-surface`, etc.) — never hardcode `bg-white`/`text-black`. |
| **shadcn/ui** | Accessible primitives copy-pasted into `src/components/ui/`. We own them — extend, don't fight. |
| **Radix UI** | What shadcn wraps. Don't import directly; go through the shadcn wrappers. |
| **lucide-react** | Icon set. Stick to it for consistency. |
| **framer-motion** | All animation. Use `motion.div`, `layoutId` for shared-element transitions (see `ViewSwitcher`, `AppLayout`). |
| **class-variance-authority** + **clsx** + **tailwind-merge** | Component variant system + safe className merging via `cn()` in `src/lib/utils.ts`. |
| **next-themes** | Theme switching infrastructure (we ship dark by default). |
| **canvas-confetti** | Celebration moments (see `src/lib/celebrate.ts`). |

### Design tokens

All colors are HSL CSS variables in `src/index.css`, exposed to Tailwind via `tailwind.config.ts`. Add new colors in **both** files. See [`DESIGN.md`](./DESIGN.md).

---

## Forms & data

| Tech | Why |
|---|---|
| **react-hook-form** | All forms. Performance + minimal re-renders. |
| **zod** + **@hookform/resolvers** | Schema validation tied into RHF. |
| **date-fns** | Date math when we need locale-aware formatting. Most internal math uses our own minute helpers in `src/lib/time.ts`. |
| **@tanstack/react-query** | Wrapped at the root via `QueryClientProvider`. Available if you need cache/retry semantics — most data goes through our `dataStore` hooks instead. |

### Custom data layer

`src/lib/dataStore.ts` exposes hooks that abstract over **cloud (Supabase)** and **guest (localStorage)** modes. Use these in pages instead of calling Supabase directly:

```ts
const { data: logs, refresh } = useTimeLogsInRange(startISO, endISO);
const { data: blocks } = useScheduleBlocks();
```

See [`ARCHITECTURE.md §2`](./ARCHITECTURE.md) for the full pattern.

---

## Drag & drop

| Tech | Why |
|---|---|
| **@dnd-kit/core / sortable / utilities** | Used in the priority ranker (`src/components/activities/PriorityRanker.tsx`). Accessible and touch-friendly. |

---

## Backend (self-managed Supabase)

| Tech | Why |
|---|---|
| **@supabase/supabase-js** | Client at `src/integrations/supabase/client.ts`, configured via `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` env vars. |
| **Postgres + RLS** | Schema defined via SQL migrations under `supabase/migrations/`. Every table has a `user_id`-scoped policy. |
| **Supabase Auth** | Email/password (UI). Auto-confirm enabled so guest→account is instant. Google OAuth can be enabled in the dashboard but is not wired into the UI. |
| **Edge functions (Deno)** | Under `supabase/functions/`. Deployed with the Supabase CLI (`supabase functions deploy`). Used for AI calls, weekly review, account deletion. |
| **Anthropic API** | Edge functions call the Anthropic Messages API directly (Claude) using the `ANTHROPIC_API_KEY` Supabase secret. Server-side only. |

See [`CLOUD.md`](./CLOUD.md) for the schema, RLS policies, edge functions, and secrets.

---

## Testing

| Tech | Why |
|---|---|
| **Vitest** | Unit tests. Setup in `src/test/setup.ts`, config in `vitest.config.ts`. Run with `bun run test`. |

We test pure logic in `src/lib/` (especially `gaps.ts`, `time.ts`, `week.ts`). Components are exercised end-to-end in the browser rather than with heavy unit tests.

---

## Tooling

| Tech | Why |
|---|---|
| **ESLint** | `bun run lint`. Config in `eslint.config.js`. |
| **Bun** | Recommended runtime in dev (faster installs). `npm` / `pnpm` also work. |

---

## Conventions cheat sheet

### File / folder

- Pages → `src/pages/PascalCase.tsx`, one per route.
- Feature components → `src/components/<feature>/PascalCase.tsx`.
- Reusable logic with no React → `src/lib/camelCase.ts`.
- Hooks → `src/hooks/use-kebab.tsx`.

### Imports

Use the `@/` alias for everything in `src/`:

```ts
import { Button } from "@/components/ui/button";
import { useTimeLogsInRange } from "@/lib/dataStore";
import { supabase } from "@/integrations/supabase/client";
```

### Styling

- ✅ `className="bg-surface text-foreground border-border"`
- ❌ `className="bg-white text-black border-gray-200"`
- ✅ Add a CVA variant when a component has multiple looks
- ❌ Inline ad-hoc Tailwind for a "premium" look — make it a token

### Data access

- ✅ `const { data } = useTimeLogsInRange(start, end);`
- ❌ `const { data } = await supabase.from("time_logs").select(...)` inside a page
- (The exception is the AI planner — it's account-only by design.)

### Mutations

Call the named helpers in `dataStore.ts` (`insertTimeLog`, `upsertActivity`, `deleteScheduleBlock`, …) so they route to cloud or guest correctly. Always pass `mode` and `user?.id ?? null`.

### Animations

- Use `framer-motion`'s `motion.*` components.
- Use `layoutId` for shared-element transitions across views.
- Page transitions are handled centrally in `AppLayout`.

### Auth

Read `useAuth()` from `@/contexts/AuthContext`. Don't re-implement session handling.

### Commits / PRs

- Run `bun run test` and `bun run lint` first.
- Don't manually run builds — the harness does it.
- Don't edit `src/integrations/supabase/{client,types}.ts` or `.env`.

---

## What we deliberately don't use

- **Redux / Zustand / Jotai** — local state + URL + `dataStore` hooks have been enough.
- **CSS-in-JS** — Tailwind tokens cover the design system.
- **Server-side rendering** — it's a SPA; SEO needs are minimal.
- **Direct Supabase calls in pages** — use `dataStore` so guest mode keeps working.
