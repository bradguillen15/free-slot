# Architecture

This document explains how FreeSlot is put together: the layers, the data flow, and the key design decisions.

---

## 1. High-level picture

```
┌────────────────────────────────────────────────────────────────┐
│                        React SPA (Vite)                        │
│                                                                │
│  Pages / feature components                                    │
│      │   (never import the Supabase client — lint-enforced)    │
│      ▼                                                         │
│  dataStore hooks ── mode branch ──┐                            │
│      │                            │                            │
│      ▼                            ▼                            │
│  resources provider         localStore                         │
│  (cloud reads + writes)     (guest reads + writes)             │
│      │                            │                            │
│      ▼                            ▼                            │
│  _providers/supabase        localStorage                       │
│  (Supabase JS SDK)                                             │
└──────┼─────────────────────────────────────────────────────────┘
       ▼
┌───────────────────────────────────┐
│     Supabase (self-managed)       │
│  - Postgres (with RLS)            │
│  - Auth (email + password)        │
│  - Edge functions (Deno)          │
│  - Gemini API (secret key)        │
└───────────────────────────────────┘
```

> **Rendered diagrams:** see [`docs/DIAGRAMS.md`](./DIAGRAMS.md) for the data-flow diagram
> and the full database ER schema (Mermaid, renders on GitHub).

Single-page React app. **Guest mode** uses `localStorage`; **cloud mode** uses Supabase.
A unified adapter layer (`src/lib/dataStore.ts`) lets the rest of the codebase ignore the
difference: pages call `dataStore` hooks, which branch on auth mode to either the
**resources provider** (`src/resources/`, the cloud data-access boundary — see
[`src/resources/README.md`](../src/resources/README.md)) or `localStore` (guest). Only
`_providers/supabase/` ever imports the Supabase JS SDK.

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
| `src/lib/dataStore.ts` | Hooks like `useCategories()`, `useActivities()`, `useTimeLogsInRange()`, `useProfile()`. They look at `useAuth()` and dispatch to either the **resources provider** (`src/resources/`, cloud) or `localStore` (guest). Same return shape either way. |
| `src/lib/migrateGuest.ts` | On signup, snapshots all guest data and inserts it into the new user's tables (batched via `resources.*.insertMany`). |
| `src/resources/` | The **cloud data-access boundary**. `dataStore`'s cloud branch calls `resources.<entity>.<method>()` against the `ResourcesProvider` interface (`_providers/types.ts`); the only implementation is `_providers/supabase/`, the single place that imports the Supabase JS SDK. Guest mode does **not** pass through this layer. See [`src/resources/README.md`](../src/resources/README.md). |

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
/reset-password         → Password reset
/app                    → Day view              (guest OK)
/app/week               → Week view             (guest OK)
/app/month              → Month view            (guest OK)
/app/schedule           → Schedule management   (guest OK)
/app/notes              → Daily notes           (guest OK)
/app/labels             → Labels (categories)   (guest OK)
/app/dashboard          → Dashboard             (guest OK)
/app/activities         → Activities            (guest OK)
/app/settings           → Settings              (account required)
```

Two wrapper components:

- **`AuthLoadingGate`** — holds `/app/*` rendering behind a spinner until the auth session resolves, so signed-in users never flash guest-mode data. (The old `OnboardingGate` and the `/onboarding` wizard were removed — new-user orientation is now the guided tour.)
- **`ProtectedRoute`** — redirects unauthenticated users to `/auth`. Currently **Settings is the only truly account-only page** wrapped in it (`App.tsx`). The Dashboard is guest-accessible: it renders from guest data like every other `/app/*` view, so it is intentionally **not** wrapped.

The mobile hamburger menu (top-right sheet, replaced the old bottom bar) and desktop sidebar show 🔒 next to gated entries for guests (driven by `requiresAuth` in `AppLayout.tsx`'s `navItems` — today only Settings), and clicking them routes to `/auth` instead of the locked page.

**Guided first-run tour.** New users land in an empty `/app` and a coach-mark tour auto-starts (gated by `profiles.tour_completed`; guests use the local profile field). The tour drives navigation itself — Day (welcome) → Schedule, where an **Apply suggested schedule** action inserts a non-overlapping starter week (sleep daily; work split by lunch on weekdays, each block mapped to a matching default label) after an explicit confirmation → back to Day, pointing at **Confirm Day**, which materializes only the block instances that have already elapsed (see "Confirm Day" below for same-day vs. overnight-tail matching). Skip/Done persist `tour_completed`; a help button in the sidebar/mobile-sheet footer replays it. Implementation lives in `src/components/tour/` (`TourProvider` owns step state, route-driving, and persistence; `TourBubble` renders the anchored coach mark against `[data-tour=...]` anchors). There is no pre-seeded sample data — the tour walks the user into creating real data they own.

**Confirm Day.** `src/lib/confirmDay.ts` materializes a date's active schedule blocks into `time_logs` rows with one tap, available on both Day view and (for today only) Week view. `blockInstancesForDate(blocks, date)` computes which block occurrences are relevant to a confirmed date `D`: a **same-day** instance for any block whose `days_of_week` includes `D`'s weekday (dated `D`), plus, for **overnight** blocks only (end time earlier than start time, e.g. a nightly Sleep block), a **tail** instance for blocks whose `days_of_week` includes `D - 1`'s weekday — representing the occurrence that started the night before and ends during `D`'s daytime, dated `D - 1` to match the existing overnight-log convention (an overnight entry is always dated by its start day, same as manual quick-logging). A same-day overnight instance is never elapsed while its confirm date is "today" (it hasn't ended yet); its tail instance is elapsed once `now` passes the block's `end_time`, or immediately when confirming a fully past date. A block active every day of the week produces both instances when confirming any date — two distinct real nights, not a duplicate. The mutation (`confirmDay` in `src/lib/dataStore.ts`) fetches `[date-1, date]` logs (not just `date`) so tail-instance overlap/idempotency checks work correctly.

**Dashboard Activity Trends.** The dashboard is a single period-scoped view: a `PeriodSelector` (Day/Week/Month, persisted in localStorage under `dashboard.period`; a legacy stored `"custom"` kind is coerced to `"week"` on read) drives one full-width `ActivityTrendChart` — a multi-line chart with one line per label showing minutes logged per day across the selected period. The interactive legend below the chart (not Recharts' built-in `Legend`, which only mounts once the container has real measured dimensions) toggles a label's line on/off; this visibility state is session-only and resets on next visit. An optional "show planned" switch overlays a second, dashed line per visible label sourced from `src/lib/plannedMinutes.ts` (`plannedMinutesByDay`), a pure per-day-per-category sum over recurring schedule blocks (via `gaps.blocksOnDay`). `useDashboardStats` (in `src/pages/DashboardPage/`) computes the actual/planned wide-format series and category metadata for an arbitrary `Period` from `src/lib/dashboardPeriod.ts`. The empty state is derived solely from "zero time logs and zero schedule blocks exist at all" — independent of period and AI plan data. This design replaced an earlier card-grid layout (Schedule vs Actual card, three-state label filter, Agenda card, card-visibility menu, AI plan-vs-logged chart, and an auto-prompting Weekly Review modal) that had accumulated into more surface area than the product needed.

---

## 4. Data model

The single source of truth is the Supabase schema (replicated by `localStore.ts`). See
[`docs/DIAGRAMS.md`](./DIAGRAMS.md) for the full ER diagram (tables, columns, and relationships).

| Table | Purpose |
|---|---|
| `profiles` | Per-user prefs: `peak_hours`, `include_weekends`, `weekly_review_day`, `time_format` (`12h`/`24h`), `onboarding_completed`, `onboarding_skipped`, `tour_completed`, plus denormalized `email` for operational lookup. Auto-created by `handle_new_user` trigger on signup. |
| `categories` | Productive / unproductive / essential labels (Deep work, Reading, Gaming…). Defaults are seeded per user. |
| `activities` | What the user wants to spend time on. Has `target_hours_per_week` and links to a category. |
| `schedule_blocks` | Recurring fixed time (work, sleep, commute). Has `days_of_week` (0=Sun..6=Sat), `start_time`/`end_time` (supports overnight), `type: fixed | waste_expected`, and `sort_order` (user-defined order on the Schedule page). |
| `time_logs` | What the user actually did. `title + date + start_time + end_time + category_id`, with optional rich `note_json`. |
| `weekly_priorities` | Per-week ranked list of activity ids — drives AI planning. |
| `weekly_plans` | Cached AI output per `(user_id, week_start)` — uniqueness enforced. `slots: jsonb` is the array of suggested time slots. |
| `weekly_reviews` | **Feature removed** (weekly-review UI, hooks, and edge function deleted); table retained pending a drop migration. |
| `daily_notes` | Per-day rich notes used by dashboard review and weekly planning context. |
| `inbox_items` | **Feature removed** (inbox UI, data layer, and AI-payload path deleted in `prune-dead-verticals`); table retained pending a drop migration. |

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
3. Edge function calls the **Gemini `generateContent` API** directly (`gemini-3.5-flash`, via the `GEMINI_API_KEY` Supabase secret) with a prompt asking for slot assignments, instructed to respond in the request's locale (defaulting to English).
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

## 11. Code quality (SonarQube Cloud)

Every PR runs a SonarQube Cloud scan as a step in the CI `checks` job (`.github/workflows/ci.yml`), configured by `sonar-project.properties`. It reuses the `coverage/lcov.info` that `pnpm test:coverage` already emits (the `lcov` Vitest reporter), so no extra test run is added. `main` gets the same scan on every merge: `cd.yml` invokes the reusable CI workflow with `secrets: inherit`, so `SONAR_TOKEN` is available there too — this keeps the new-code baseline fresh.

- **Setup**: import the repo at [sonarcloud.io](https://sonarcloud.io), disable *Automatic Analysis* (it conflicts with this CI-based scan), and add a `SONAR_TOKEN` repo secret. The scan step self-skips when the secret is absent (forks/Dependabot).
- **Scope**: analysis covers `src/`; generated types, `src/components/ui/**` (shadcn), and `*.d.ts` are excluded. Coverage is still scoped to `src/lib/**` (see `vitest.config.ts`), so the dashboard's coverage figure reflects library logic, not the whole tree.
- **Gate**: prefer the *Clean as You Code* quality gate (gate on new code only) so the existing baseline doesn't block unrelated PRs.

---

## 12. Where to extend

| You want to… | Edit |
|---|---|
| Add a calendar view (e.g. Year) | New page in `src/pages/`, register in `App.tsx`, add to `ViewSwitcher` |
| Add a new field to an entity | Supabase migration → mirror it in `localStore.ts` types → bump `migrateGuest.ts` if needed |
| Tweak free-time detection | `src/lib/gaps.ts` (covered by tests in `src/test/`) |
| Change the AI prompt or model | `supabase/functions/generate-weekly-plan/index.ts` |
| Add a new gated feature | Wrap route in `ProtectedRoute`; add `requiresAuth: true` to `nav` in `AppLayout.tsx` |
