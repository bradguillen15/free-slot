# Tasks — dashboard-schedule-vs-actual

## Step 0: Create Feature Branch (MANDATORY — FIRST)

- [x] 0.1 Create and switch to `feature/dashboard-schedule-vs-actual` (branched from `feature/guided-first-run-tour`)

## 1. Interval math lib (spec: dashboard-schedule-vs-actual)

- [x] 1.1 TDD: `src/lib/scheduleVsActual.ts` — `buildScheduleVsActual(weekStart, blocks, logs)` per design D1 (per-label scheduled/logged/adherence/displacement via minute-attribution sweep; overnight blocks and logs; overlap not double-counted; parts-sum invariant; totals + adherencePct null when nothing scheduled); `effectiveCategoryIds(all, included, excluded)`; unit tests for every spec scenario; run `pnpm test` for the module

## 2. Three-state label filtering (spec: dashboard-label-filtering)

- [x] 2.1 `localStore.ts`: `getDashboardExcludedLabels`/`setDashboardExcludedLabels` (pattern of dashboard card visibility) + unit tests
- [x] 2.2 `LabelFilter.tsx`: three-state chips (neutral → include → exclude, "All" resets both), excluded visual (dimmed + line-through + ⊘), aria labels, i18n (en + es); component tests for cycling and reset
- [x] 2.3 `useDashboardStats.ts`: apply include+exclude semantics to perDay/totals/daysLogged/catBreakdown on both log and (new) schedule inputs; keep `planVsActual` on the existing include-only log filter (AI card untouched); tests; run `pnpm test`

## 3. Schedule vs Actual card (spec: dashboard-schedule-vs-actual)

- [x] 3.1 `src/components/dashboard/ScheduleVsActualCard.tsx` per design D4 — adherence KPI, Compare/Actual/Schedule toggle, per-label dual-bar rows with delta chip, expandable displacement breakdown, empty state linking to `/app/schedule`; semantic tokens only; i18n (en + es)
- [x] 3.2 Wire into `DashboardPage`: `useScheduleBlocks` + `buildScheduleVsActual` (memoized), card first in the layout, `scheduleVsActual` entry in `DashboardVisibleCards` + `CardVisibilityMenu` (+ localStore default/migration for stored older shapes); component tests for card rendering, filtering, toggle; run `pnpm test`

## 4. Review and Update Existing Unit Tests (MANDATORY)

- [x] 4.1 Update `DashboardPage/index.test.tsx` and any tests touched by LabelFilter/useDashboardStats signature changes; full `pnpm test` green

## 5. Run Unit Tests and Verify Database State (MANDATORY — AGENT EXECUTES)

- [x] 5.1 Run targeted + full unit suites; no DB changes in this change (frontend-only — verify `supabase migration list` unchanged); write report `openspec/changes/dashboard-schedule-vs-actual/reports/YYYY-MM-DD-step-5-unit-test-and-db-verification.md`

## 6. Manual Testing (MANDATORY — AGENT EXECUTES via preview)

- [x] 6.1 Preview walkthrough as guest: seed schedule + logs (apply suggested schedule, confirm day, add a mismatched log), open Dashboard → verify rows/deltas/adherence/displacement numbers by hand for one label; exclude Sleep → persists across reload; include/exclude cycling; view toggle; AI card unchanged; desktop + ~390px; ES locale
- [x] 6.2 Update/extend guest E2E: dashboard scenario covering exclude-Sleep persistence and the schedule-vs-actual row rendering (pin clock for determinism)

## 7. Final Verification (MANDATORY — once before archive)

- [x] 7.1 `pnpm verify` green (exit 0): lint + typecheck + 579 unit tests + 50 guest E2E passed

## 8. Update Technical Documentation (MANDATORY)

- [x] 8.1 Update `docs/ARCHITECTURE.md` (dashboard section) and any dashboard references in docs; note the new lib module and persisted exclusions
