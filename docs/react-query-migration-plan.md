# Tech Plan — Adopt React Query for All Data Fetching

**Status:** implemented (2026-06-13) — dataStore reads/mutations migrated to React Query and enforcement documented (`a34da5b`); `useWeeklyPlan` added. Remaining direct-`supabase` callers are the documented exceptions (auth handlers, edge-function invokes). Kept as the design record.
**Date:** 2026-06-12
**Origin:** user request — "Check if we're correctly using React Query. We should enforce it in pretty much all scenarios; it's barely more than a package.json entry and requests are using useEffect."
**Related:** [guest-dashboard-plan.md](./guest-dashboard-plan.md) (DashboardPage refactor should ride on the migrated hooks — see Sequencing)

---

## 1. Audit findings (2026-06-12, verified against the code)

The suspicion is confirmed: `@tanstack/react-query` v5 is installed and `QueryClientProvider` is mounted in `App.tsx` (with a default `new QueryClient()`), but there are **zero `useQuery`/`useMutation` calls in the codebase**. All data access is hand-rolled:

| # | Location | What it does today |
|---|---|---|
| F1 | `src/lib/dataStore.ts` — `useCategories`, `useActivities`, `useScheduleBlocks`, `useTimeLogsInRange`, `useProfile` | Five nearly identical `useState` + `useEffect` + `refresh()` hooks. They re-implement, by hand, what React Query provides: error state, manual refetch, cross-tab reactivity (`useGuestRefresh` tick), and even race protection (`reqSeq` monotonic guard in `useTimeLogsInRange`). No caching — every mount refetches; every consumer of the same data fetches independently. |
| F2 | Mutation flow | `dataStore` mutations are plain async functions; every caller must remember to call `refresh()` afterwards. `refresh`/`onSaved`/`onCategoriesRefresh` callbacks are threaded through props (SchedulePage → ScheduleBlockDialog, LabelsPage, etc.) — this is `invalidateQueries` re-implemented as prop drilling. |
| F3 | `src/pages/DashboardPage.tsx` | Fetches 4 tables via raw `supabase` calls inside `useEffect` with a hand-rolled `cancelled` flag; bypasses `dataStore` entirely. |
| F4 | `src/components/dashboard/WeeklyReviewModal.tsx` (5 calls), `src/components/week/AIPlanPanel.tsx` (6 calls incl. edge-function invoke), `src/pages/Onboarding.tsx` (3 calls) | Direct `supabase` queries/mutations in components, fetch-in-`useEffect` pattern. |
| F5 | No enforcement | Nothing stops the next feature from importing `supabase` in a component and adding another `useEffect` fetch. |

**Not offenders** (stay as they are): `AuthContext` (auth subscription, correct as an effect), `Auth.tsx` (sign-in/up event handlers, not cacheable data), form-sync effects in dialogs (`QuickLogDialog`, `ScheduleBlockDialog`), UI effects (`CategoryPicker`, vendored `sidebar`/`carousel`).

## 2. Target architecture

Keep `dataStore` as the single mode-aware adapter (guest/localStorage vs cloud/Supabase) — that abstraction is good and stays. Swap its internals onto React Query:

1. **Query functions extracted** from the current hooks: `fetchCategories(mode, userId)`, `fetchActivities(...)`, `fetchScheduleBlocks(...)`, `fetchLogsInRange(mode, userId, startISO, endISO)`, `fetchProfile(...)` — pure async, no React.
2. **Query keys** encode identity: `["categories", mode, userId]`, `["timeLogs", mode, userId, startISO, endISO]`, etc. Centralize them in a `queryKeys` factory in `dataStore` so invalidation can't typo a key. The `reqSeq` race guard dies — keyed queries make stale-response overwrites impossible.
3. **Hooks keep their public shape** during migration: `useCategories()` still returns `{ data, error, refresh, mode }` (backed by `useQuery` + `queryClient.invalidateQueries`), so Phase 1 is a drop-in with no consumer changes. Richer states (`isLoading`, `isFetching`) get exposed and adopted incrementally afterwards.
4. **Guest reactivity bridge:** replace the per-hook `useGuestRefresh` tick with ONE global listener (set up next to the `QueryClient`) that maps `freeslot:guest-change` / `storage` events to `queryClient.invalidateQueries({ queryKey: [..., "guest", ...] })`-style invalidation of guest-mode keys.
5. **Mutations become `useMutation`** wrappers around the existing async functions, with `onSuccess: invalidate(relevant keys)`. The `refresh`/`onSaved`/`onCategoriesRefresh` prop threading is then deleted — dialogs invalidate, consumers just re-render.
6. **QueryClient defaults** tuned conservatively to preserve current behavior: `staleTime: 30_000` (avoid refetch storms from multiple consumers), `retry: 1`, `refetchOnWindowFocus: false` initially (current code never did this; enabling it later is a deliberate UX decision, not a side effect).
7. **Cloud-only data** (weekly plans, weekly reviews, AI panel) uses `enabled: !!user` — the idiomatic replacement for `if (!user) return` effects.

## 3. Requirements

### Phase 0 — Infrastructure (S)
- Configure `QueryClient` defaults in `App.tsx` (or `src/lib/queryClient.ts`).
- `queryKeys` factory in `dataStore`.
- Guest-event → invalidation bridge (one listener, replaces `useGuestRefresh`).
- Shared test helper `renderWithProviders` wrapping `QueryClientProvider` (+ a fresh `QueryClient` per test, `retry: false`); adopt in existing component tests that render dataStore consumers (`SchedulePage.test.tsx`, `AppLayout.test.tsx`, `OnboardingGate.test.tsx`, …). **This is the main test-impact item — do it first so later phases don't churn tests twice.**

### Phase 1 — dataStore read hooks → useQuery (M)
- Extract the five fetchers; reimplement `useCategories`, `useActivities`, `useScheduleBlocks`, `useTimeLogsInRange`, `useProfile` on `useQuery`, preserving the `{ data, error, refresh, mode }` contract (`refresh` = invalidate+refetch).
- Delete `useGuestRefresh` and `reqSeq`.
- `useTimeLogsInRange`'s exposed `setData` (used for optimistic log updates) is replaced by `queryClient.setQueryData` on the same key.
- All existing tests green with no behavior change.

### Phase 2 — Mutations → useMutation + invalidation (M)
- Wrap `insertTimeLog`, `updateTimeLog`, `deleteTimeLog`, `upsertActivity`, `deleteActivity`, `upsertScheduleBlock`, `deleteScheduleBlock`, `reorderScheduleBlocks`, `upsertCategory`, `deleteCategory`, `updateProfile` in `useMutation` hooks with `onSuccess` invalidation of their entity keys.
- Remove manual `refresh()` calls and the `onSaved`/`onCategoriesRefresh`/`refresh` prop threading from SchedulePage, LabelsPage, CalendarPage, Week/Month/Day components, dialogs.
- Toasts stay at the call site (mutation `onError`/`onSuccess`).

### Phase 3 — Direct-supabase stragglers (M)
- `DashboardPage`: core data via Phase-1 hooks (this is the same refactor required by [guest-dashboard-plan.md](./guest-dashboard-plan.md) — implement once, together); `weekly_plans` via a new cloud-only `useWeeklyPlan(weekStart)` query hook (`enabled: !!user`).
- `WeeklyReviewModal`: review fetch → `useQuery`; generate/save → `useMutation`.
- `AIPlanPanel`: plan fetch → `useQuery`; generate (edge function) / accept → `useMutation`.
- `Onboarding`: profile/seed writes → mutations (reads already via `useProfile`).

### Phase 4 — Enforcement (S)
- ESLint: restrict importing `@/integrations/supabase/client` to `src/lib/**`, `src/contexts/AuthContext.tsx`, and `src/integrations/**` (`no-restricted-imports` with overrides). New components physically can't hand-roll Supabase fetches.
- `docs/frontend-standards.md`: add the rule — *all server/localStorage reads go through dataStore React Query hooks; no data fetching in `useEffect`; mutations via `useMutation` wrappers with key invalidation* — plus a short queryKey/invalidation cheat sheet.

## 4. Out of scope
- Auth flows (`AuthContext`, `Auth.tsx`) — session management is not cacheable server state.
- Offline persistence / `persistQueryClient`, optimistic-update rollbacks beyond what exists today, `refetchOnWindowFocus` UX changes — possible follow-ups, deliberately excluded to keep behavior identical.
- Edge-function internals (`supabase/functions`) — server side, unaffected.

## 5. Sequencing & sizing

| Phase | Scope | Size | Depends on |
|---|---|---|---|
| 0 | QueryClient config, key factory, guest bridge, test wrapper | S | — |
| 1 | 5 read hooks → useQuery (shape-preserving) | M | 0 |
| 2 | Mutations → useMutation, delete refresh threading | M | 1 |
| 3 | DashboardPage (+ guest-dashboard plan), WeeklyReviewModal, AIPlanPanel, Onboarding | M | 1 (2 helpful) |
| 4 | Lint enforcement + standards docs | S | 3 |

Each phase is one OpenSpec change (`opsx:new` → `opsx:ff` → apply → verify); planning steps require Opus high reasoning (CLAUDE.md §5). **Coordination note:** the guest-dashboard plan's Step 2 ("refactor DashboardPage onto dataStore hooks") and this plan's Phase 3 are the same work — schedule guest-dashboard after Phase 1, or fold it into Phase 3, to avoid refactoring DashboardPage twice.

## 6. Open questions

1. `refetchOnWindowFocus` — keep off (current behavior) or enable once migrated? Recommendation: off during migration, revisit as a follow-up UX decision.
2. Should Phase 2 also introduce optimistic updates (e.g. label hide/show, block reorder) via `onMutate` rollback patterns? Recommendation: no — keep parity first; optimistic UX is a separate, small follow-up where it measurably helps.
