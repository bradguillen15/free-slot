## 0. Setup: Create Feature Branch (MANDATORY - FIRST STEP)

- [x] 0.1 Create feature branch `feature/dashboard-activity-trends` from `feature/dashboard-schedule-vs-actual` (not `main` — `main` lacks the dashboard code and its prerequisites; see deviation note)
- [x] 0.2 Verify branch creation and current branch status

## 1. Period model (`src/lib/dashboardPeriod.ts`) — TDD

- [x] 1.1 Write failing tests for `resolvePeriod(kind, anchorISO, custom?)`: day/week/month bounds, custom range pass-through, 92-day clamp on custom
- [x] 1.2 Write failing tests for `periodDays(period)`: returns correct ISO date array length/values for each `kind`
- [x] 1.3 Implement `resolvePeriod` and `periodDays` to pass tests
- [x] 1.4 Run `pnpm test src/lib/dashboardPeriod.test.ts` and confirm green

## 2. Planned-minutes helper (`src/lib/plannedMinutes.ts`) — TDD

- [x] 2.1 Write failing tests for `plannedMinutesByDay(blocks, days)`: correct per-day-per-category minutes from `blocksOnDay` + `durationMinutes`, zero for days/categories with no blocks
- [x] 2.2 Implement `plannedMinutesByDay` to pass tests
- [x] 2.3 Delete `src/lib/scheduleVsActual.ts` and `src/lib/scheduleVsActual.test.ts` (superseded per design.md Decision 4)
- [x] 2.4 Run `pnpm test src/lib/plannedMinutes.test.ts` and confirm green

## 3. `localStore` period persistence

- [x] 3.1 Write failing tests for `getDashboardPeriod` / `setDashboardPeriod` in `src/lib/localStore.test.ts` (round-trip, default when unset)
- [x] 3.2 Add `dashboard.period` read/write helpers to `src/lib/localStore.ts`
- [x] 3.3 Remove `getDashboardExcludedLabels` / `setDashboardExcludedLabels` / `getDashboardVisibleCards` / `setDashboardVisibleCards` and the `dashboard.visible_cards` / `dashboard.excluded_labels` keys
- [x] 3.4 Run `pnpm test src/lib/localStore.test.ts` and confirm green

## 4. Rework `useDashboardStats` for period + trend series — TDD

- [x] 4.1 Write failing tests (new `useDashboardStats.test.ts` or update existing) for: wide-format daily series per category for a period, top-6-by-total default selection, empty-period detection (`logs.length === 0 && blocks.length === 0`), planned series merge when requested — note: top-6 selection is implemented in `ActivityTrendChart` (task group 5) per design, not in the data hook, which returns all categories with metadata for the chart to rank
- [x] 4.2 Rework `src/pages/DashboardPage/useDashboardStats.ts` to accept a `Period` instead of `weekStart`, query via `useTimeLogsInRange(period.start, period.end)`, and return `{ trendData, plannedData, isEmpty, totals, daysLogged }`
- [x] 4.3 Remove `scheduleVsActual`/`catBreakdown`/`planVsActual` outputs no longer used by the new page (keep `totals`/`daysLogged` per design)
- [x] 4.4 Run `pnpm test src/pages/DashboardPage/useDashboardStats.test.ts` and confirm green

## 5. `ActivityTrendChart` component — TDD

- [x] 5.1 Write failing tests for `src/components/dashboard/ActivityTrendChart.tsx`: renders one line per category, legend click toggles visibility (session-only), "show planned" toggle adds/removes dashed lines, top-6 default cap with "show all" affordance
- [x] 5.2 Implement `ActivityTrendChart` using Recharts `LineChart`/`Line`/`Legend` with `onClick` handling, dashed `strokeDasharray` for planned lines
- [x] 5.3 Run `pnpm test src/components/dashboard/ActivityTrendChart.test.tsx` and confirm green
- [x] 5.4 Write failing tests for an isolated single-occurrence data point rendering a dot marker (and a continuous multi-day series rendering none)
- [x] 5.5 Implement isolated-point detection and a custom `dot` renderer on each actual-minutes `Line` in `ActivityTrendChart` — also set `isAnimationActive={false}` on these lines, since Recharts gates all dot rendering behind animation-finished state and dots would otherwise never appear on first paint (or in tests without a real animation frame loop)
- [x] 5.6 Run `pnpm test src/components/dashboard/ActivityTrendChart.test.tsx` and confirm green

## 6. Period selector component — TDD

- [x] 6.1 Write failing tests for a `PeriodSelector` component: Day/Week/Month/Custom switch, prev/next navigation, jump-to-current, custom date range inputs with clamp feedback
- [x] 6.2 Implement `src/components/dashboard/PeriodSelector.tsx`
- [x] 6.3 Run `pnpm test src/components/dashboard/PeriodSelector.test.tsx` and confirm green
- [x] 6.4 Remove the "Custom" period type: `resolvePeriod("custom", ...)` throws when `custom` is undefined, and `DashboardPage` calls it synchronously on render right after the "Custom" toggle is clicked (before any date range is picked) — crashing the page. Not fixing the picker flow since Custom isn't needed right now; remove it outright: drop `"custom"` from `PeriodKind`, drop `CustomRange`/`MAX_CUSTOM_RANGE_DAYS` and the custom branch from `resolvePeriod` (`src/lib/dashboardPeriod.ts`); remove the Custom toggle item and date-range inputs from `PeriodSelector` (`src/components/dashboard/PeriodSelector.tsx`); remove `custom` state/handler and prop from `DashboardPage` (`src/pages/DashboardPage/index.tsx`) — kept `DashboardPeriodPref.kind` accepting a legacy `"custom"` value for reading old persisted data, with `DashboardPage` mapping it to `"week"` via `resolveStoredKind`
- [x] 6.5 Update failing/obsolete tests: remove custom-range cases from `dashboardPeriod.test.ts`, `PeriodSelector.test.tsx`, `localStore.test.ts`; add a test that a persisted `kind: "custom"` preference (from a prior app version) falls back to the default "Week" period instead of crashing
- [x] 6.6 Remove now-unused `dashboard.period.custom`/`rangeStart`/`rangeEnd`/`rangeAdjusted` i18n keys from `en.ts`/`es.ts`
- [x] 6.7 Run `pnpm test src/lib/dashboardPeriod.test.ts src/components/dashboard/PeriodSelector.test.tsx src/lib/localStore.test.ts src/pages/DashboardPage/index.test.tsx` and confirm green — 47 tests passing; also ran full suite (596 tests, 74 files) and `pnpm lint` (0 errors, 3 pre-existing unrelated warnings) clean; manually verified in browser preview that the Custom option no longer renders and the dashboard loads without crashing or console errors

## 7. Rewrite `DashboardPage`

- [x] 7.1 Update `src/pages/DashboardPage/index.test.tsx`: remove assertions for removed cards/menu/filter/agenda/weekly-review-prompt; add assertions for period selector + trend chart + fixed empty-state bug
- [x] 7.2 Rewrite `src/pages/DashboardPage/index.tsx`: full-bleed layout, `PeriodSelector` + `ActivityTrendChart` + top-line stats (total tracked, days logged), corrected empty-state condition
- [x] 7.3 Remove `src/pages/DashboardPage/useWeeklyReviewPrompt.ts` and its usage
- [x] 7.4 Remove `src/components/dashboard/ScheduleVsActualCard.tsx`, `LabelFilter.tsx` (+ `LabelFilter.test.tsx`), `CardVisibilityMenu.tsx`, `AgendaCard.tsx`, `WeeklyReviewModal/` (and any now-dangling imports/usages)
- [x] 7.5 Verify guest mode: dashboard renders period selector + trend chart without an account, using existing guest dataStore hooks (no new account-gating introduced)
- [x] 7.6 Run `pnpm test src/pages/DashboardPage/index.test.tsx` and confirm green — deviation: `ActivityTrendChart`'s interactive legend was moved from a Recharts `<Legend content={...}>` (nested, only mounts with real container dimensions) to a plain sibling `<ul>` below the chart, since it was invisible in jsdom without a full ResponsiveContainer mock and this is also more robust in production against any container-measurement timing

## 8. i18n cleanup

- [x] 8.1 Remove unused keys for Schedule vs Actual, three-state filter, Agenda card, Card Visibility menu, Weekly Review prompt/modal from `en.ts` / `es.ts` (keep Weekly Review keys only if any other surface still references them — verify via grep before deleting) — verified via grep: no remaining consumers of `dashboard.reviewWeek/prevWeek/nextWeek/thisWeek/kpi.aiSlots/empty.descriptionSignedIn/cards/aiUpsell/personalBest/reviewPrompt/filter/visibility/agenda` or the top-level `scheduleVsActual` namespace; removed from both locale files
- [x] 8.2 Add new keys for period selector labels and trend chart labels/empty states to `en.ts` / `es.ts`, keeping parity (done earlier, alongside groups 6-7, so `PeriodSelector`/`ActivityTrendChart` had real strings while under test)
- [x] 8.3 Run `pnpm test` for i18n parity check (if one exists) and confirm green — no dedicated parity test exists; `es.ts` is typed as `Translations` (the `en.ts` shape) so `tsc --noEmit` enforces structural parity — ran clean with zero errors, including zero locale-related errors

## 9. Review and Update Existing Unit Tests (MANDATORY)

- [x] 9.1 Grep for any remaining references to removed modules/components (`ScheduleVsActualCard`, `LabelFilter`, `CardVisibilityMenu`, `AgendaCard`, `WeeklyReviewModal`, `useWeeklyReviewPrompt`, `scheduleVsActual`, `dashboard.visible_cards`, `dashboard.excluded_labels`) across `src/` and tests; fix or remove — clean, zero hits
- [x] 9.2 Run `pnpm test` for the full touched area (`src/lib`, `src/pages/DashboardPage`, `src/components/dashboard`) and confirm all green with no skipped/broken suites — 28 files, 257 tests, all passing

## 10. Update E2E for changed dashboard flows (MANDATORY — user-visible flow changed)

- [x] 10.1 Update `e2e/dashboard-schedule-vs-actual.e2e.ts`: remove/replace assertions tied to the removed Schedule vs Actual card and three-state filter with assertions for the period selector + trend chart + planned overlay toggle (rename file to `e2e/dashboard-activity-trends.e2e.ts` if fully superseded) — fully superseded, renamed; added `data-testid`s (`period-selector`, `activity-trend-chart`, `trend-show-planned`) to support stable selectors
- [x] 10.2 Check `e2e/navigation.e2e.ts` for any dashboard-card selectors that need updating — only references the generic `page-dashboard` testid, unaffected
- [x] 10.3 Run `pnpm test` (unit) once more after E2E spec updates to confirm no regressions from selector/testid changes — 28 files, 257 tests, all green

## 11. Final verification (MANDATORY once before archive — AGENT MUST EXECUTE)

- [x] 11.1 Run `pnpm verify` (lint + typecheck + unit tests + guest E2E) once, after all implementation tasks are complete — ran as `pnpm verify:fast` (lint/typecheck/unit) + `pnpm test:e2e` (guest E2E) separately; lint 0 errors/3 pre-existing warnings, typecheck clean, 74 unit files / 589 tests passing, 50/50 e2e passing (1 pre-existing flaky drag-and-drop test passed on its automatic retry, unrelated to this change)
- [x] 11.2 Fix any failures surfaced by `pnpm verify` before proceeding — fixed a real typecheck bug: `TrendRow`/`PlannedDayRow` were typed as `{ date: string } & Record<string, number>`, which is unsound (the `date: string` property conflicts with a `number` index signature); retyped both as `{ date: string; [categoryId: string]: number | string }` with casts at numeric read sites
- [x] 11.3 Manually preview the dashboard in the browser (dev server): verify Day/Week/Month/Custom switching, trend chart rendering, legend toggle, planned overlay toggle, and that the empty-state bug is fixed (log time, confirm empty state clears)

## 12. Update Technical Documentation (MANDATORY)

- [x] 12.1 Update any docs referencing the old dashboard layout (search `docs/` for "Schedule vs Actual", "Agenda card", "Weekly Review", "card visibility") — rewrote the dashboard section in `docs/ARCHITECTURE.md`; `docs/MIGRATION_RUNBOOK.md`'s stale "Dashboard → Weekly Review" manual-check step is handled by the spawned Weekly Review cleanup follow-up (out of scope here since the whole Weekly Review feature, not just the dashboard entry point, needs a decision)
- [x] 12.2 Note the abandonment of `openspec/changes/dashboard-redesign/` and `openspec/changes/dashboard-schedule-vs-actual/` (do not archive them into main specs; they are superseded by this change per proposal.md) — added a "Superseded" note to the top of each change's `proposal.md`

## Follow-ups flagged (out of scope for this change)

- Orphaned `src/lib/celebrate.ts` (+ test) — no remaining consumers after the old dashboard's "personal best" ratio UI was removed. Spawned as a separate background task.
- Orphaned Weekly Review remnants (`src/lib/weeklyReview.ts`, the `weekly-review` edge function, the `weeklyReviewDay` Settings field, and `docs/MIGRATION_RUNBOOK.md`'s manual-check step) — the modal's only UI entry point is gone, but removing the rest is a distinct decision from this dashboard change. Spawned as a separate background task.
