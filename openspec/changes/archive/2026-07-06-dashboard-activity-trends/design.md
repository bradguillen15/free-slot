## Context

The current `DashboardPage` (`src/pages/DashboardPage/index.tsx`) is a fixed-week, card-grid layout: header, card-visibility menu, three-state label filter, Schedule vs Actual card, 3 stat tiles, per-day bar chart, category pie chart, plan-vs-logged bar chart, agenda card, and an auto-prompting Weekly Review modal. `useDashboardStats.ts` computes all of these from `useTimeLogsInRange(weekStart, weekEnd)` (already range-based) and `useScheduleBlocks()` (recurring weekly blocks with `category_id` + `days_of_week`). `src/lib/scheduleVsActual.ts` does per-minute interval-sweep math (adherence, displacement) that this change no longer needs.

This change replaces that layout with a single period-scoped multi-line trend chart, per the approved proposal.

## Goals / Non-Goals

**Goals:**
- One control (period selector: Day / Week / Month / Custom) drives one view (multi-line trend chart) for the whole page.
- Per-activity daily time series, with an interactive legend that filters lines.
- Optional planned-time overlay (dashed lines) on the same chart, no separate card.
- Fix the empty-state bug so it reflects the selected period's actual data.
- Full-bleed layout — the chart is the page, not one card among many.

**Non-Goals:**
- No adherence %, displacement, or "kept vs displaced" analysis — that capability is dropped, not migrated.
- No agenda/schedule list view.
- No card visibility management — nothing left to toggle.
- No changes to the underlying time-log or schedule-block data model.
- No calendar-grid date picker for custom range — a simple two-field date range is sufficient.
- The pre-existing "AI plan vs logged" bar chart, its "AI Slots" KPI, and the guest AI-upsell banner (driven by `useWeeklyPlan`, distinct from recurring schedule blocks) are dropped along with the rest of the card grid — they weren't in the proposal's "Keep" list and don't fit a single trend-chart view. Flagged explicitly here since it's a separate feature from the Schedule vs Actual card; call it out if this should instead be preserved.

## Decisions

**1. Period model (`src/lib/dashboardPeriod.ts`, new)**
`type Period = { kind: "day" | "week" | "month" | "custom"; start: string; end: string }`. A `resolvePeriod(kind, anchorISO, custom?)` function computes `{start, end}` ISO bounds; a `periodDays(period)` function returns the ISO date array for the range.
- *Alternative considered*: reuse `calendarDays.ts`. Rejected — that module builds month-grid *cells* (including padding days from adjacent months) for calendar UI, not a flat list of in-range days for a chart's x-axis.
- Custom range is clamped to a 92-day max to keep the chart legible and the query bounded.

**2. Chart data shape**
`useDashboardStats` (reworked) returns a wide-format array: `[{ date: string, [categoryId: string]: number }]`, one row per day in the period, built by iterating `periodDays(period)` × filtered logs. Recharts consumes this directly with one `<Line dataKey={categoryId}>` per visible category.
- At month/custom scale (~30-92 points) this is cheap; no virtualization needed.

**3. Legend-as-filter, not persisted**
Clicking a legend entry toggles that category's line via local component state (`Set<string>` of hidden category IDs). This state is **not** persisted to `localStorage`.
- *Alternative considered*: persist like the old `excludedLabelIds`. Rejected — the user's core complaint was invisible, sticky filter state making the dashboard confusing ("I don't even know why..."); a plain, resets-on-visit toggle is easier to reason about and matches "just show me the chart."
- Default: all categories visible, capped to the top N by total minutes-in-period (N = 6) to avoid an unreadable rainbow of lines when many categories exist; a "show all" affordance reveals the rest into the legend.

**4. Planned overlay replaces `scheduleVsActual.ts`**
Delete `src/lib/scheduleVsActual.ts` and its test (the interval-sweep/adherence/displacement math is Non-Goal now). Add `src/lib/plannedMinutes.ts`: a small pure function `plannedMinutesByDay(blocks, days)` returning `{ date, [categoryId]: minutes }[]`, computed directly from `blocksOnDay` (existing, from `src/lib/gaps.ts`) + `durationMinutes` — no per-minute sweep required since we only need per-day-per-category totals, not overlap/ownership.
- When "show planned" is on, each visible category gets a second `<Line dataKey={\`${categoryId}_planned\`} strokeDasharray="4 4">` sourced from this series, merged into the same wide-format rows.

**5. Empty-state fix**
Replace the current `totals.total === 0 && planSlotsCount === 0` (signed-in) / `totals.total === 0` (guest) check with: empty state shows only when **both** `logs` and `blocks` returned for the selected period are empty (`logs.length === 0 && blocks.length === 0`), recomputed via `useMemo` keyed on the period and query results. This directly fixes the reported bug (empty state persisting after logging time) and is now period-aware instead of week-locked.

**6. Persistence**
Add `dashboard.period` to `src/lib/localStore.ts` (stores `{ kind, anchorISO, custom? }`) so the last-viewed period survives a reload. Remove `dashboard.visible_cards` and `dashboard.excluded_labels` keys entirely — no migration needed, they're additive UI prefs that simply stop being read.

## Risks / Trade-offs

- **Many categories → noisy chart** → Mitigated by default top-N (6) visible lines + click-to-add-back via legend.
- **Sparse data over Month/Custom ranges** → Expected and acceptable; only a fully-empty period shows the empty state (per Decision 5).
- **Dropping adherence/displacement entirely loses that analysis if ever wanted again** → Accepted per explicit user direction ("I don't see any value on it" was about Weekly Review; adherence/displacement is dropped as a consequence of moving to a line-chart overlay, which the user separately confirmed is what they want for schedule-vs-actual).
- **Custom range with no upper-bound guard could over-fetch** → Mitigated by the 92-day clamp in `resolvePeriod`.

## Migration Plan

Frontend-only, single PR, no backend/schema changes. Guest and cloud paths are unaffected (same `useTimeLogsInRange` / `useScheduleBlocks` / `useCategories` hooks). No feature flag — ship directly since this is pre-launch iteration on an already-shipped-but-unarchived pair of changes (`dashboard-redesign`, `dashboard-schedule-vs-actual`), which should be abandoned once this lands (see proposal.md).

## Open Questions

- Default top-N visible lines is proposed as 6 — confirm during implementation/preview if that reads well with the user's actual category count.
