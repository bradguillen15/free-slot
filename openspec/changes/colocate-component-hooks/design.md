## Context

A survey of `useEffect`/derivation usage (excluding tests and generated UI) shows the heavy logic is
concentrated in four files:

- `DashboardPage` (332 lines): five derivation `useMemo`s (`perDay`, `totals`, `catBreakdown`,
  `planVsActual`, `daysLogged`) plus two effects (personal-best celebration; weekly-review
  auto-prompt that reads `profiles`/`weekly_reviews`).
- `WeeklyReviewModal`: one large async effect that fetches `time_logs`/`categories`/`weekly_plans`/
  `weekly_reviews` in parallel and aggregates planned-vs-actual.
- `PriorityRanker`: one async effect (with a `cancelled` guard) that loads `weekly_priorities` for
  cloud users or local priorities for guests and initialises the ranked list.
- `CalendarPage`: four effects — `?date=` URL sync, per-minute "now" tick, auto-scroll on day
  change, and a `document` `add-block-here` custom-event listener.

Most data already flows through `dataStore` hooks; the remaining direct `supabase` calls live in
account-gated components (`DashboardPage`, `WeeklyReviewModal`, `PriorityRanker`) which the lint
config already exempts. The existing component tests cover render + key behaviors and are the
regression net.

## Goals / Non-Goals

**Goals:**
- Make large component logic explicit and named by extracting it into custom hooks.
- Establish a clear, documented co-location convention (component folder + `index.tsx` + `useX.ts`).
- Preserve behavior, data flow, and import paths exactly; keep the suite green.

**Non-Goals:**
- No behavior, data-flow, backend, schema, or API changes.
- No change to consumer import paths (the App router, etc.).
- Not refactoring small/clear effects (dialog reset-on-open, `CategoryPicker` wheel, `GuestBanner`),
  foundational code (`AuthContext`), or generated UI (`sidebar`, `carousel`).
- Not migrating the remaining direct `supabase` calls to `dataStore` (separate concern).

## Decisions

### 1. Folder-with-`index.tsx` per refactored component
Convert `Foo.tsx` → `Foo/index.tsx` and place its co-located hooks beside it. Vite/TS resolve
`import Foo from ".../Foo"` to `Foo/index.tsx`, so no consumer import changes. Use `git mv` so history
follows the file.
- **Alternative considered:** keep `Foo.tsx` and add `Foo.hooks.ts` siblings. Rejected — the folder
  groups a component with its private hooks and matches the requested convention ("a folder named
  after the component").

### 2. Component-specific vs. shared placement
Hooks used by one component are co-located; reusable hooks go to `src/hooks/`. The per-minute tick
(`useNowMinute`) is reusable (week/day views, indicators) and therefore shared; `useAutoScrollToHour`
and `useAddBlockHereListener` are CalendarPage-specific and co-located.
- **Rationale:** co-location signals single-use; forcing a reusable hook into one folder would invite
  duplication and contradict the convention's intent.

### 3. Extract by lifting, not rewriting
Each hook is produced by moving the existing effect/memo bodies verbatim and exposing the exact
return shape the component already consumes (e.g. `useDashboardStats(weekStart)` returns
`{ perDay, totals, catBreakdown, planVsActual, daysLogged, days }`). No logic is re-derived. This
keeps diffs reviewable and behavior identical.

### 4. The `?date=` URL sync stays in CalendarPage for now
The URL-sync effect is small and tightly coupled to CalendarPage's `searchParams`; it is not
extracted in this pass (keeps the change focused on the genuinely large logic). It may become a
shared `useUrlDateParam` later if Week/Month adopt the same pattern.

### 5. Incremental, one component per task group
Each component is refactored and verified independently (`npm run test` + `npm run lint`) before
moving on, so a regression is isolated to a single, revertible step.

## Risks / Trade-offs

- **Hook extraction subtly changes effect timing/deps** → Move bodies verbatim, keep the same
  dependency arrays, and rely on the existing component tests plus a render smoke-check after each
  extraction. Mitigation: one component at a time.
- **`git mv` to a folder confuses a stale import** → After each move, run `npm run test`/`lint` and
  grep for the old path; consumer imports are path-stable via `index.tsx` so breakage surfaces
  immediately.
- **Over-extraction creating churn for small effects** → Scope explicitly excludes small/clear
  effects; only the four heavy components are touched.
- **Newly shared `useNowMinute` used by one caller today** → Acceptable; it is genuinely reusable and
  documents intent. No behavior cost.

## Migration Plan

Pure structural refactor; no deploy, flags, or data migration. Rollback is `git revert` of the change
(each component is an independent, self-contained step within it).

## Open Questions

None. The `?date=` URL-sync extraction and any broader `dataStore` migration are deliberately left
for follow-ups.
