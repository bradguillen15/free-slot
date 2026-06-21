## Why

The dashboard currently shows a fixed weekly summary with no way to filter by activity/label, no agenda view for what was actually scheduled vs logged, and no user control over which cards appear. Power users with many categories can't focus on what matters to them, and the chart layout is one-size-fits-all.

## What Changes

- Add a **category/label filter** on the dashboard so charts and KPIs reflect only the selected labels (multi-select, "All" by default).
- Add a **Schedule + Log agenda view** card: a compact day-by-day list showing planned blocks alongside actual logs for each day of the selected week — similar to a side-by-side diff.
- Add **card visibility toggles**: users can show/hide individual dashboard cards (per-day bar, category breakdown, plan-vs-actual, agenda). Preference persisted in `localStorage`.

## Capabilities

### New Capabilities

- `dashboard-label-filter`: A multi-select filter chip row above the charts that scopes all dashboard stats (KPIs, charts, agenda) to selected label IDs.
- `dashboard-agenda-view`: A new Surface card listing each day of the week with its schedule blocks (planned) and time logs (actual) side by side, collapsible per day.
- `dashboard-card-visibility`: A settings popover/menu that lets the user toggle which dashboard cards are visible; state stored in `localStorage` under a `freeslot.dashboard.visible_cards` key.

### Modified Capabilities

- None — all existing charts remain; the filter is additive scoping.

## Impact

- `src/pages/DashboardPage/index.tsx` — add filter row, agenda card, card visibility menu
- `src/pages/DashboardPage/useDashboardStats.ts` — accept optional `labelIds` filter param; scope `catBreakdown`, `perDay`, `totals`, `planVsActual` to filtered categories
- `src/lib/localStore.ts` — add `dashboard.visible_cards` read/write helpers
- `src/components/dashboard/` — new `AgendaCard.tsx`, `LabelFilter.tsx`, `CardVisibilityMenu.tsx`
- i18n: new keys in `en.ts` / `es.ts`
- No backend / schema changes (all filtering is client-side over existing data)
