## Context

`DashboardPage/index.tsx` and `useDashboardStats.ts` compute weekly KPIs and chart data from the full set of time logs for the selected week. There is no filtering today. The component renders four Surface cards (per-day bar, category pie, plan-vs-actual, AI upsell) in a fixed layout. Card presence is always controlled by data availability, not user preference.

## Goals / Non-Goals

**Goals:**
- Multi-select label filter that scopes all dashboard data
- Agenda card showing plan vs actual per day
- User-controlled card visibility with localStorage persistence

**Non-Goals:**
- Date range beyond a single week
- Drag-to-reorder cards
- Server-side filtering (all client-side over already-fetched data)

## Decisions

**Filter state**: `useState<string[]>([])` in `DashboardPage` — empty array = "All". Passed down to `useDashboardStats` as optional `labelIds?: string[]`. When non-empty, filter `logs` by `l.category_id !== null && labelIds.includes(l.category_id)` before computing totals.

**Filter UI**: Horizontal chip row above the KPI cards using shadcn/ui `Badge` components as toggle buttons. Labels come from `useVisibleCategories()` (already available in the page). Fits in one line on desktop; wraps on mobile.

**Agenda card**: New `AgendaCard` component taking `weekDays: DayCellData[]` prop. Uses `DayCellData.blocks` and `.logs` (already on cells from `useCalendarDays`). Each day row is a `<details>` or controlled `useState` accordion. Respects the label filter by receiving the filtered logs list or filtering client-side.

**Card visibility**: `freeslot.dashboard.visible_cards` in localStorage stores an object `{ perDay: boolean, byCategory: boolean, planVsLogged: boolean, agenda: boolean }`. Default (no key): all `true`. A `<VisibilityMenu>` (popover with checkboxes) writes the key on toggle. Reads happen once on mount via a `useState` initialiser.

**`useDashboardStats` signature change**: Add `labelIds?: string[]` parameter. When provided, filter the `logs` array before all computation. This is a pure client-side slice — no new data fetching.

## Risks / Trade-offs

- [Risk] Label filter + plan-vs-actual is tricky: AI plan slots don't have a `category_id` → Mitigation: when filtering is active, the plan-vs-actual bar shows only the logged side filtered; planned bars remain unfiltered (or show a note). Add a caveat tooltip.
- [Risk] `AgendaCard` duplicates some data processing already in `useDashboardStats` → Mitigation: pass `weekDays` (from `useCalendarDays`) directly to `AgendaCard` so it reads `DayCellData` rather than re-computing.
- [Risk] `visible_cards` localStorage key could conflict if another project uses the same prefix → already using `freeslot.*` namespace, no conflict.

## Migration Plan

All changes are additive to existing UI; no data model changes. Ship as a single PR. No rollback complexity — disabling card visibility just means cards are always shown (the default).
