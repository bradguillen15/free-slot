# Design — Dashboard Schedule vs Actual

## Overview

A pure interval-math module computes the week's per-label comparison; the dashboard renders it as a new centerpiece card. Filtering becomes three-state with persisted exclusions. Everything is frontend-only and guest/cloud-symmetric because all reads already flow through dataStore hooks.

## Key Decisions

### D1. Pure lib module `src/lib/scheduleVsActual.ts` (TDD)
All Level B math lives in pure functions over plain inputs so it is unit-testable without React:

```ts
type ScheduleVsActualRow = {
  categoryId: string;
  scheduledMin: number;   // sum of expanded block windows for the week
  loggedMin: number;      // sum of the label's logs for the week
  adherenceMin: number;   // same-label overlap inside scheduled windows
  displacement: {
    keptMin: number;                       // == adherenceMin
    byCategory: { categoryId: string; min: number }[]; // other labels inside the windows
    unloggedMin: number;                   // window minutes with nothing logged
  };
};

buildScheduleVsActual(weekStart, blocks, logs, opts): {
  rows: ScheduleVsActualRow[];
  totals: { scheduledMin, loggedMin, adherenceMin, adherencePct | null };
}
```

Per day (7 iterations via `weekDays`): expand blocks with `blocksOnDay(blocks, weekday)` grouped by `category_id` (skip null-category blocks — they cannot be compared by label); expand that date's logs to minute intervals with `logsToIntervals` (handles overnight logs). Overlap = standard interval-intersection length. Displacement per scheduled window: intersect the window set with each label's log intervals as a **union per label first** (merge intervals before measuring) so overlapping logs never double-count; `unlogged = scheduled − union(all logs ∩ windows)`. `byCategory` may sum to more than `scheduled − kept − unlogged` only if different-label logs overlap each other inside the window; to keep the "parts sum to scheduled" invariant, attribute each minute once with priority: same label first, then other labels by earliest log start (document in code; assert invariant in tests).

Simplification for attribution: build a minute-attribution sweep per window (arrays of minutes are fine at day scale, 1440 entries) rather than clever interval algebra — clarity over micro-performance; a week is ≤ 7 × 1440 steps per label.

### D2. Three-state LabelFilter
`LabelFilter` gains `excludedIds: string[]` + `onExcludedChange`. Click cycles neutral → included → excluded → neutral. Excluded chips render dimmed with a line-through and a small ⊘. "All" clears both sets. Effective-label helper `effectiveCategoryIds(all, included, excluded)` lives in the new lib module and is shared by `useDashboardStats` and the card.

Persistence: `getDashboardExcludedLabels()` / `setDashboardExcludedLabels()` in `localStore.ts` (same shape as `getDashboardVisibleCards`). Included IDs stay in component state (per-visit), matching current behavior.

### D3. Filtering scope
`useDashboardStats` computes two log sets: `filteredLogs` (new include+exclude semantics — feeds perDay, totals, daysLogged, catBreakdown) and `aiFilteredLogs` (existing include-only semantics — feeds planVsActual, unchanged). Schedule blocks pass through the same effective-label filter before `buildScheduleVsActual`.

### D4. Card UI (`ScheduleVsActualCard.tsx`)
- Header: adherence KPI (`— %` hidden when no scheduled minutes) + view toggle (existing `Tabs` primitive: Compare / Actual / Schedule).
- Rows: label dot + name (via `useCategoryName`), horizontal dual bars (scheduled = solid label color at 40%, logged = solid) scaled to the max row, `fmtDuration` values, delta chip (green ≥ 0 handled via semantic tokens `text-success`/`text-warning` equivalents already used in the app — reuse `toneClasses` if applicable).
- Expand chevron per row with scheduled time → displacement list: kept / per-label displaced / unlogged, each with minutes and share of the scheduled total.
- Empty state when no schedule blocks: localized message + link to `/app/schedule`.
- New entry in `DashboardVisibleCards` (`scheduleVsActual: true` default) + `CardVisibilityMenu`; place the card first in the grid (centerpiece).
- Responsive: single-column rows; verify at ~390px (bars stack above numbers if needed).

### D5. Out of scope
- Block-name-level rows (label-only per user decision).
- Any change to the AI plan vs logged card.
- Cloud-synced filter persistence (localStorage only, like card visibility).

## Risks

- **Minute-sweep correctness at day boundaries** (overnight blocks/logs) — covered by dedicated unit cases reusing the `blocksOnDay`/`logsToIntervals` conventions.
- **Perf**: worst case ~14 labels × 7 days × 1440 minutes ≈ 141k array ops per recompute — negligible; memoized on inputs.
