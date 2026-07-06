## Why

The dashboard has accumulated cards faster than it has delivered clarity: a Schedule vs Actual card, a three-state label filter row, an Agenda card, a card-visibility menu to manage the other cards, and an auto-popping Weekly Review modal — all on top of the original stat tiles and charts. A new user with nothing configured sees a wall of components with no clear starting point. The user's actual need is simple: pick a period (day/week/month/custom) and see a trend of time spent per activity across that period, so patterns ("more exercise this week than last") are visible at a glance. The dashboard should answer that one question well instead of offering many disconnected views.

Note: `dashboard-redesign` and `dashboard-schedule-vs-actual` were implemented and merged (commits `b8ae414`-adjacent and `e6d5842`) but never archived — no `dashboard-*` capability exists yet under `openspec/specs/`. This change supersedes their unarchived capabilities directly rather than modifying them.

## What Changes

- **BREAKING**: Replace the fixed "current week" scope with a **period selector** (Day / Week / Month / Custom range) that drives the entire dashboard.
- **BREAKING**: Replace the per-day bar chart and category pie chart with a **single multi-line trend chart** — one line per activity/label, plotting time spent per day across the selected period.
- **BREAKING**: Replace the three-state label filter chip row with an **interactive chart legend** — clicking a label in the legend isolates/hides its line. No separate filter UI.
- **BREAKING**: Replace the standalone Schedule vs Actual card with an optional **"show planned" toggle** that overlays dashed planned/scheduled lines per activity on the same trend chart.
- Remove the **Agenda card** (day-by-day schedule/log list) entirely.
- Remove the **Card Visibility menu** entirely — with a single chart-based view, there is nothing left to toggle.
- Remove the **Weekly Review modal** and its auto-prompt logic entirely — periodic reflection is replaced by simply viewing the chart for the desired period.
- Keep top-line stats (total time tracked, days logged) for the selected period.
- Layout becomes full-bleed/full-screen for the chart area instead of a fixed-width, card-grid layout.
- **Bug fix**: the empty state currently persists after the user has logged time (`showEmptyState` for signed-in users requires both `totals.total === 0` AND `planSlotsCount === 0` — reported as showing even with logged time present). The rewritten page must derive the empty state solely from "no data exists for the selected period" and re-evaluate correctly whenever the period or underlying logs change.

## Capabilities

### New Capabilities
- `dashboard-period-selector`: Day/Week/Month/Custom range control that scopes all dashboard data; replaces the fixed weekStart-only navigation.
- `dashboard-activity-trend-chart`: Full-width multi-line chart, one line per activity/label, showing time spent per day over the selected period; includes an interactive legend that filters lines and an optional planned-time overlay.

### Modified Capabilities
(none — no `dashboard-*` capability is present under `openspec/specs/` yet; the capabilities below are being superseded, not modified)

### Removed Capabilities
- `dashboard-schedule-vs-actual` (from unarchived `dashboard-schedule-vs-actual` change): superseded by the planned-overlay toggle on the trend chart.
- `dashboard-label-filtering` / `dashboard-label-filter` (from unarchived `dashboard-redesign` / `dashboard-schedule-vs-actual` changes): superseded by the interactive chart legend.
- `dashboard-agenda-view` (from unarchived `dashboard-redesign` change): removed, no replacement.
- `dashboard-card-visibility` (from unarchived `dashboard-redesign` change): removed, no replacement.
- Weekly Review modal + auto-prompt: pre-existing feature (from archived `2026-06-15-resources-weekly-review-dashboard`), removed as part of this simplification.

## Impact

- `src/pages/DashboardPage/index.tsx` — full rewrite: period selector, single chart area, top-line stats; drop card grid layout; fix empty-state condition to accurately reflect the selected period's data.
- `src/pages/DashboardPage/useDashboardStats.ts` — rework to compute per-activity daily series for an arbitrary period (not just a fixed week), plus planned-time series for the overlay.
- `src/pages/DashboardPage/useWeeklyReviewPrompt.ts` — remove.
- `src/components/dashboard/ScheduleVsActualCard.tsx`, `LabelFilter.tsx` (+ test), `CardVisibilityMenu.tsx`, `AgendaCard.tsx`, `WeeklyReviewModal/` — remove.
- `src/lib/scheduleVsActual.ts` — remove or repurpose its interval-math for the planned-overlay series (evaluate during design).
- `src/lib/localStore.ts` — remove `dashboard.visible_cards` / `dashboard.excluded_labels` keys; add a `dashboard.period` (type + custom range) persistence key.
- New chart component, e.g. `src/components/dashboard/ActivityTrendChart.tsx`.
- i18n: remove now-unused keys for the removed cards/filter; add keys for period selector and new chart labels in `en.ts` / `es.ts`.
- Guest + cloud parity: continues to read through existing `useTimeLogsInRange` / `useScheduleBlocks` / `useCategories` dataStore hooks; all new state is client-side (localStorage), no backend changes.
- Superseded changes: `openspec/changes/dashboard-redesign/` and `openspec/changes/dashboard-schedule-vs-actual/` should be abandoned (not archived into main specs) once this change is approved, since their capabilities are being replaced before ever reaching `openspec/specs/`.
