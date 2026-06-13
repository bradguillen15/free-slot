# Architecture

This document explains how FreeSlot is put together: the layers, the data flow, and the key design decisions.

---

## 1. High-level picture

```
┌──────────────────────────────────────────────────────────────────┐
│                          React SPA (Vite)                        │
│                                                                  │
│   Pages ──► dataStore hooks ──► [ Cloud adapter | Guest adapter ]│
│     │                                  │              │          │
│     │                                  ▼              ▼          │
│     │                        Supabase JS SDK     localStorage    │
│     │                                  │                         │
│     ▼                                  ▼                         │
│  Components (shadcn / Radix / framer-motion)                     │
└──────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
                    ┌───────────────────────────────────┐
                    │     Supabase (self-managed)       │
                    │  - Postgres (with RLS)            │
                    │  - Auth (email + password)        │
                    │  - Edge functions (Deno)          │
                    │  - Anthropic API (secret key)     │
                    └───────────────────────────────────┘
```

Single-page React app. **Guest mode** uses `localStorage`; **cloud mode** uses Supabase. A unified adapter layer (`src/lib/dataStore.ts`) lets the rest of the codebase ignore the difference.

---

## 2. The guest/cloud abstraction (the most important pattern)

This is the architectural decision that shapes everything else.

### Goal
Let users try the full app — log days, build a schedule, see free time, switch views — **without signing up**. Then migrate everything into their account when they convert.

### Implementation

Three files cooperate:

| File | Role |
|---|---|
| `src/lib/localStore.ts` | A `localStorage`-backed mirror of the Supabase schema. Same shapes (Category, Activity, ScheduleBlock, TimeLog, Profile). Time logs are bucketed by month (`freeslot.guest.time_logs.YYYY-MM`) so quotas and lookups stay cheap. |
| `src/lib/dataStore.ts` | Hooks like `useCategories()`, `useActivities()`, `useTimeLogsInRange()`, `useProfile()`. They look at `useAuth()` and dispatch to either the Supabase client or `localStore`. Same return shape either way. |
| `src/lib/migrateGuest.ts` | On signup, snapshots all guest data and inserts it into the new user's tables. |

### Rule for contributors

> **Pages and feature components must use `dataStore` hooks.** Never call `supabase.from(...)` directly from a page that should also work in guest mode.

The Day/Week/Month views all follow this. The AI planner intentionally does not — it's the gated feature that incentivises signup.

### Reactivity

`localStorage` writes dispatch a `freeslot:guest-change` `CustomEvent` (and the native `storage` event for cross-tab). `dataStore` hooks listen and re-fetch, giving the same reactive feel as a server-backed query.

---

## 3. Routing & gating

Defined in `src/App.tsx`.

```
/                       → Landing
/auth                   → Auth (sign in / sign up)
/onboarding             → Onboarding (works for guests AND signed-in users)
/app                    → Day view              (guest OK)
/app/week               → Week view             (guest OK)
/app/month              → Month view            (guest OK)
/app/schedule           → Schedule management   (guest OK)
/app/activities         → Activities            (guest OK)
/app/dashboard          → Dashboard             (account required)
/app/settings           → Settings              (account required)
```

Two wrapper components:

- **`OnboardingGate`** — redirects to `/onboarding` only when both `onboarding_completed` and `onboarding_skipped` are `false`. Either flag being `true` passes through. The gate also allows `/app/schedule` and `/app/activities` through regardless of flag state so the onboarding count-card links work. Two separate `key` props (`key="onboarding"` / `key="app"`) prevent React from reusing the same instance across the two route positions.
- **`ProtectedRoute`** — redirects unauthenticated users to `/auth`. Used only on truly account-only pages.

The mobile hamburger menu (top-right sheet, replaced the old bottom bar) and desktop sidebar show 🔒 next to gated entries for guests, and clicking them routes to `/auth` instead of the locked page.

---

## 4. Data model

The single source of truth is the Supabase schema (replicated by `localStore.ts`):

| Table | Purpose |
|---|---|
| `profiles` | Per-user prefs: `buffer_minutes`, `peak_hours`, `include_weekends`, `weekly_review_day`, `onboarding_completed`, `onboarding_skipped`. Auto-created by `handle_new_user` trigger on signup. |
| `categories` | Productive / unproductive labels (Deep work, Reading, Gaming…). 9 defaults seeded per user. |
| `activities` | What the user wants to spend time on. Has `target_hours_per_week` and links to a category. |
| `schedule_blocks` | Recurring fixed time (work, sleep, commute). Has `days_of_week` (0=Sun..6=Sat), `start_time`/`end_time` (supports overnight), `type: fixed | waste_expected`, and `sort_order` (user-defined order on the Schedule page). |
| `time_logs` | What the user actually did. `title + date + start_time + end_time + category_id`. |
| `weekly_priorities` | Per-week ranked list of activity ids — drives AI planning. |
| `weekly_plans` | Cached AI output per `(user_id, week_start)` — uniqueness enforced. `slots: jsonb` is the array of suggested time slots. |
| `weekly_reviews` | One per completed week; stores planned-vs-actual + AI insights. |
| `daily_nudges` | One AI-generated nudge per `(user_id, date)`. |

**RLS**: every table has an "own X all" policy of the form `auth.uid() = user_id`. No data is shared between users.

---

## 5. Free-window detection (`src/lib/gaps.ts`)

The core algorithm. Given:
- a day's `schedule_blocks` (recurring),
- the day's `time_logs` (actual),
- a `weekday`,
- a `bufferMinutes` setting,
- optional peak window (`peakStart` / `peakEnd`),

…it returns `GapWindow[]` — contiguous free periods of at least `minWindowMinutes`, marked `isPeak` if they intersect the peak window. Overnight blocks (e.g. sleep 23:00 → 07:00) are split into two ranges via `expandRange()` in `lib/time.ts`.

This is what powers the **"Total free time"** card on the week view, the dashed gap markers in `WeekGrid`, and the candidate slots fed to the AI planner.

### Schedule guide vs. logged time (day view)

The schedule is a **guide**, the log is the truth. In the day timeline (`DayTimeline`), planned
schedule blocks are **clipped against logged time**: a block is rendered only for the minutes not
covered by any `time_log` that day (`visibleBlockSegments` → `subtractIntervals` in `lib/time.ts`,
overnight-aware). Logging a replacement activity is the override — the planned block recedes to the
remaining, unaccounted-for time; there is no per-day "skip" mechanism. This clipping is
**presentation-only** and does not change free-window detection (`gaps.ts` still treats both planned
and logged time as busy). Time entries may also span midnight (`durationMinutes` wraps past
midnight). Week and Month views are **not yet clipped** — a deliberate follow-up.

---

## 6. AI planner (`src/components/week/AIPlanPanel.tsx` + `supabase/functions/generate-weekly-plan/`)

Cloud-only. Flow:

1. Component collects this week's `gaps`, the user's `activities`, and their `weekly_priorities`.
2. Calls the `generate-weekly-plan` edge function.
3. Edge function calls the **Anthropic Messages API** directly (Claude, via the `ANTHROPIC_API_KEY` Supabase secret) with a prompt asking for slot assignments.
4. Result is `upsert`ed into `weekly_plans` keyed on `(user_id, week_start)` — the unique constraint prevents race conditions from double-clicks.
5. UI displays slots as dashed primary-colored ribbons over the week grid; clicking "Accept" inserts a corresponding `time_log` (also guarded with `useRef` against double-fires).

**Why edge function and not client-side?** AI keys are server-only, and we want a single canonical prompt format that we can iterate on without shipping client builds.

---

## 7. Authentication (`src/contexts/AuthContext.tsx`)

Standard Supabase auth. Email + password and **Continue with Google** on the auth page (`src/pages/Auth.tsx`). Google OAuth uses identity scopes only (`openid`, `email`, `profile`) — no Calendar access. Email confirmation is **auto-confirmed** — users are signed in immediately on signup so the guest→account transition feels instant.

The `AuthProvider` exposes `{ user, loading, signOut }`. **Crucial:** the provider sets up an `onAuthStateChange` listener *before* calling `getSession()` so it doesn't miss the initial event.

---

## 8. Component conventions

- **Pages** under `src/pages/` — one per route. Compose feature components, fetch via `dataStore`, own URL state.
- **Feature components** under `src/components/{day,week,activities,dashboard}/` — view-specific, accept data as props or call hooks for their own slice.
- **UI primitives** under `src/components/ui/` — generated by shadcn/ui. Don't restyle ad-hoc; extend variants via `class-variance-authority`.
- **Pure logic** under `src/lib/` — no React, easily testable, single-purpose files (`time.ts`, `week.ts`, `gaps.ts`, `schedule.ts`).

---

## 9. State management

We deliberately avoid global stores (Redux, Zustand). State lives where it's used:

- **Server / persisted data** → `dataStore` hooks (cloud or guest).
- **URL state** (selected date, week, month) → `useSearchParams` so views are shareable.
- **Ephemeral UI state** → local `useState`.
- **Async cloud calls** that aren't covered by `dataStore` → `@tanstack/react-query` is wired up via `QueryClientProvider`, available if needed.

---

## 10. Deployment

The app builds to a static SPA (`pnpm build` → `dist/`) and can be served from any static host. The Supabase project is self-managed; edge functions are deployed with the Supabase CLI (`supabase functions deploy <name>`). See `docs/MIGRATION_RUNBOOK.md` for the full setup.

---

## 11. Where to extend

| You want to… | Edit |
|---|---|
| Add a calendar view (e.g. Year) | New page in `src/pages/`, register in `App.tsx`, add to `ViewSwitcher` |
| Add a new field to an entity | Supabase migration → mirror it in `localStore.ts` types → bump `migrateGuest.ts` if needed |
| Tweak free-time detection | `src/lib/gaps.ts` (covered by tests in `src/test/`) |
| Change the AI prompt or model | `supabase/functions/generate-weekly-plan/index.ts` |
| Add a new gated feature | Wrap route in `ProtectedRoute`; add `requiresAuth: true` to `nav` in `AppLayout.tsx` |
