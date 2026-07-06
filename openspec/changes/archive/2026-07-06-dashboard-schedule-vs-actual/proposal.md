# Dashboard Schedule vs Actual

> **Superseded.** This change's implemented capabilities (`dashboard-schedule-vs-actual`, `dashboard-label-filtering`) were removed by `dashboard-activity-trends`, which replaced the card-grid dashboard with a single period-scoped trend chart (the schedule-vs-actual comparison now lives as a "show planned" dashed-line overlay on that chart instead of a standalone card). Not archived into main specs — do not sync.

## Why

The dashboard is too generic: it charts logged time but never compares it against the recurring schedule the user maintains daily — the only "plan vs logged" card uses AI plan slots, which is empty without an AI plan. Users cannot see where scheduled time actually went, which activities displaced it, or exclude labels that shouldn't count (e.g. Sleep). Schedule blocks now carry `category_id` (since guided-first-run-tour), making a label-level comparison computable.

## What Changes

- Add a **Schedule vs Actual** card as the dashboard's centerpiece: per-label rows comparing scheduled minutes vs logged minutes for the selected week, with delta, computed by **time-overlap interval intersection** (Level B fidelity):
  - **Adherence** per label: minutes where the label was logged *inside its own scheduled windows*.
  - **Displacement** per label (expandable row): which other labels were logged inside that label's scheduled windows, plus the unlogged remainder.
  - Global **adherence % KPI** (same-label overlap / total scheduled, after filters).
  - View toggle: Compare / Actual only / Schedule only.
- Upgrade the dashboard **LabelFilter to three states** (neutral → include → exclude, click cycles). Excluded set is **persisted** in localStorage (same pattern as card visibility). Filters apply to both the scheduled and logged sides and to all dashboard cards **except** the existing "AI plan vs logged" card, which stays completely untouched.
- New pure lib module for the interval math (TDD), reusing `blocksOnDay`, `logsToIntervals`, `durationMinutes`, `weekDays`.

## Capabilities

### New Capabilities
- `dashboard-schedule-vs-actual`: the comparison card — per-label scheduled/logged/delta rows, overlap-based adherence, displacement breakdown, view toggle, adherence KPI.
- `dashboard-label-filtering`: three-state include/exclude label filter with persisted exclusions, applied to scheduled and logged data across dashboard cards (AI plan card exempt).

### Modified Capabilities

(none — no existing spec covers the dashboard; the AI plan card's behavior is intentionally unchanged)

## Impact

- Frontend only: new `src/lib/scheduleVsActual.ts` (+ tests); `src/pages/DashboardPage/{index.tsx,useDashboardStats.ts}`; new `src/components/dashboard/ScheduleVsActualCard.tsx`; `src/components/dashboard/LabelFilter.tsx` (three-state); `src/lib/localStore.ts` (persisted exclusions); `src/components/dashboard/CardVisibilityMenu.tsx` + `DashboardVisibleCards` (new card entry); i18n `en.ts`/`es.ts`.
- Guest + cloud parity: reads go through existing `useScheduleBlocks`/`useTimeLogsInRange`/`useCategories` dataStore hooks; persistence is localStorage-only (matches card visibility).
- No database or edge-function changes.
- Tests: new unit suite for the interval math; DashboardPage tests updated; dashboard-related guest E2E updated if selectors/UX change.
