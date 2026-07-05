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
                    │  - Gemini API (secret key)        │
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

> **Post-migration cache refresh:** after `migrateGuestToCloud` resolves, `Auth.tsx::importNow`
> invalidates the React Query cache (`queryKeys.root`) via `getQueryClient()` and awaits the refetch
> **before** navigating to `/app`. The migrate dialog's redirect effect is also gated on `!migrating`,
> so the app does not navigate while migration is in flight. Together this guarantees the first
> authenticated render shows migrated data with no manual reload.

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

- **`AuthLoadingGate`** — holds `/app/*` rendering behind a spinner until the auth session resolves, so signed-in users never flash guest-mode data. (The old `OnboardingGate` and the `/onboarding` wizard were removed — new-user orientation is now the guided tour.)
- **`ProtectedRoute`** — redirects unauthenticated users to `/auth`. Used only on truly account-only pages.

The mobile hamburger menu (top-right sheet, replaced the old bottom bar) and desktop sidebar show 🔒 next to gated entries for guests, and clicking them routes to `/auth` instead of the locked page.

**Guided first-run tour.** New users land in an empty `/app` and a coach-mark tour auto-starts (gated by `profiles.tour_completed`; guests use the local profile field). The tour drives navigation itself — Day (welcome) → Schedule, where an **Apply suggested schedule** action inserts a non-overlapping starter week (sleep daily; work split by lunch on weekdays, each block mapped to a matching default label) after an explicit confirmation → back to Day, pointing at **Confirm Day**, which materializes only the blocks that have already elapsed today. Skip/Done persist `tour_completed`; a help button in the sidebar/mobile-sheet footer replays it. Implementation lives in `src/components/tour/` (`TourProvider` owns step state, route-driving, and persistence; `TourBubble` renders the anchored coach mark against `[data-tour=...]` anchors). There is no pre-seeded sample data — the tour walks the user into creating real data they own.

**Dashboard Schedule vs Actual.** The dashboard's centerpiece card compares the recurring schedule against logs per label for the selected week. The math lives in the pure module `src/lib/scheduleVsActual.ts` (`buildScheduleVsActual`): schedule blocks are expanded per calendar day (overnight spans attributed like `gaps.blocksOnDay`), and a per-day minute-attribution sweep yields overlap-based **adherence** (same label logged inside its own scheduled window) and a **displacement** breakdown (which other labels were logged inside the window, plus the unlogged remainder; each minute attributed once — own label first, then earliest-starting log). Label filtering is three-state (include/exclude/neutral, cycling chips in `LabelFilter`); the excluded set persists in localStorage (`getDashboardExcludedLabels`) and applies to both the scheduled and logged sides of every dashboard card except "AI plan vs logged", which keeps its original include-only behavior.

---

## 4. Data model

The single source of truth is the Supabase schema (replicated by `localStore.ts`):

| Table | Purpose |
|---|---|
| `profiles` | Per-user prefs: `peak_hours`, `include_weekends`, `weekly_review_day`, `onboarding_completed`, `onboarding_skipped`, plus denormalized `email` for operational lookup. Auto-created by `handle_new_user` trigger on signup. |
| `categories` | Productive / unproductive / essential labels (Deep work, Reading, Gaming…). Defaults are seeded per user. |
| `activities` | What the user wants to spend time on. Has `target_hours_per_week` and links to a category. |
| `schedule_blocks` | Recurring fixed time (work, sleep, commute). Has `days_of_week` (0=Sun..6=Sat), `start_time`/`end_time` (supports overnight), `type: fixed | waste_expected`, and `sort_order` (user-defined order on the Schedule page). |
| `time_logs` | What the user actually did. `title + date + start_time + end_time + category_id`, with optional rich `note_json`. |
| `weekly_priorities` | Per-week ranked list of activity ids — drives AI planning. |
| `weekly_plans` | Cached AI output per `(user_id, week_start)` — uniqueness enforced. `slots: jsonb` is the array of suggested time slots. |
| `weekly_reviews` | One per completed week; stores AI insights. |
| `daily_notes` | Per-day rich notes used by dashboard review and weekly planning context. |
| `inbox_items` | Week-view capture inbox used as optional AI planning context. |

**RLS**: every table has an "own X all" policy of the form `auth.uid() = user_id`. No data is shared between users.

---

## 5. Free-window detection (`src/lib/gaps.ts`)

The core algorithm. Given:
- a day's `schedule_blocks` (recurring),
- the day's `time_logs` (actual),
- a `weekday`,
- a `minWindowMinutes` threshold (default 30),
- optional peak window (`peakStart` / `peakEnd`),
- optional day bounds (`dayStart` / `dayEnd`),

…it returns `GapWindow[]` — contiguous free periods of at least `minWindowMinutes`, marked `isPeak` if they intersect the peak window. Overnight blocks (e.g. sleep 23:00 → 07:00) are split into two ranges via `expandRange()` in `lib/time.ts`.

This is what powers the **"Total free time"** card on the week view, the dashed gap markers in `WeekGrid`, and the candidate slots fed to the AI planner.

### Schedule guide vs. logged time (day view)

The schedule is a **guide**, the log is the truth. In the day timeline (`DayTimeline`), planned
schedule blocks are **clipped against logged time**: a block is rendered only for the minutes not
covered by any `time_log` that day (`visibleBlockSegments` → `subtractIntervals` in `lib/time.ts`,
overnight-aware). Logging a replacement activity is the override — the planned block recedes to the
remaining, unaccounted-for time. This clipping is
**presentation-only** and does not change free-window detection (`gaps.ts` still treats both planned
and logged time as busy). Time entries may also span midnight (`durationMinutes` wraps past
midnight). Week and Month views are **not yet clipped** — a deliberate follow-up.

**Confirm my day** (`src/lib/confirmDay.ts` + `ConfirmDayButton`) is the bulk version of "log a block's real span": for each schedule block active on a day, if it's entirely uncovered by any existing log (the same `visibleBlockSegments` check used for clipping — full coverage, not partial, or the block is skipped), it materializes one ordinary `time_log` matching the block's exact times (overnight blocks become a single row, same as clicking the block manually). Blocks without a `category_id` are skipped (logs require one). There is no "confirmed" marker anywhere — re-running the action is naturally a no-op for blocks it already logged, since the overlap check now finds them covered.

---

## 6. AI planner (`src/components/week/AIPlanPanel.tsx` + `supabase/functions/generate-weekly-plan/`)

Cloud-only. Flow:

1. Component collects this week's `gaps`, the user's `activities` (including each activity's real `target_hours_per_week` and `is_active`), and their `weekly_priorities`. If every active activity has a `target_hours_per_week` of `0`, generation is blocked client-side with a localized message pointing to Activities — no request is sent.
2. Calls the `generate-weekly-plan` edge function with the current UI locale (`en`/`es`) so generated rationale and summary text match it.
3. Edge function calls the **Gemini `generateContent` API** directly (`gemini-2.5-flash`, via the `GEMINI_API_KEY` Supabase secret) with a prompt asking for slot assignments, instructed to respond in the request's locale (defaulting to English).
4. Result is `upsert`ed into `weekly_plans` keyed on `(user_id, week_start)` — the unique constraint prevents race conditions from double-clicks.
5. UI displays slots as dashed primary-colored ribbons over the week grid; clicking "Accept" inserts a corresponding `time_log` (also guarded with `useRef` against double-fires).

The weekly review (`weekly-review` edge function) follows the same locale convention.

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
