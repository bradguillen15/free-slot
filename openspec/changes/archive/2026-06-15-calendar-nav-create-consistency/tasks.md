# Tasks — calendar-nav-create-consistency

> Frontend-only, presentation/structure change. Backend/curl/RLS mandatory steps are **N/A**.
> The calendar views are not account-gated; guest-mode parity MUST be verified (Week create menu
> and nav work in guest mode).

## 0. Setup: Create Feature Branch (MANDATORY - FIRST STEP)

- [x] 0.1 Create feature branch `feature/calendar-nav-create-consistency` from `main`
- [x] 0.2 Verify branch creation and current branch status

## 1. Tests First (TDD) — components

- [x] 1.1 `src/components/calendar/CalendarNav.test.tsx`: renders Today, prev, next **in that order**;
      fires `onToday`/`onPrev`/`onNext`; asserts `aria-label`s and test-ids
      (`calendar-today`, `calendar-prev`, `calendar-next`). (red)
- [x] 1.2 `src/components/calendar/CalendarCreateMenu.test.tsx`: "Log time" and "Add block" fire
      `onLogTime`/`onAddBlock`; per-view test-id from `viewId` (`day-fab`, `week-fab`); item test-ids
      preserved (`day-log-time`). (red)

## 2. Implementation — shared components

- [x] 2.1 Create `src/components/calendar/CalendarNav.tsx` (controlled, props: `onToday`, `onPrev`,
      `onNext`, `todayLabel="Today"`, `prevLabel`/`nextLabel` aria). Order: Today, ‹, ›.
- [x] 2.2 Create `src/components/calendar/CalendarCreateMenu.tsx` by extracting Day's split FAB from
      `src/pages/CalendarPage/index.tsx` (DropdownMenu; props `onLogTime`, `onAddBlock`, `viewId`).
- [x] 2.3 Make the new tests pass (green).

## 3. Implementation — wire views

- [x] 3.1 `src/pages/CalendarPage/index.tsx`: render `CalendarNav` in the header `actions`; replace the
      inline split FAB with `CalendarCreateMenu viewId="day"`. Keep handlers (`openQuickLog`, add-block).
- [x] 3.2 `src/pages/WeekPage.tsx`: replace the `‹`/"This week"/`›` + "Add block" cluster with
      `CalendarNav` + `CalendarCreateMenu viewId="week"` (wire Log time → quick-log; Add block →
      existing `setBlockDialogOpen`).
- [x] 3.3 `src/pages/MonthPage.tsx`: replace the `‹`/"This month"/`›` cluster with `CalendarNav`
      (no create menu here — deferred to Phase 5). Keep `shift(±1)` and today handlers.

## 4. Review and Update Existing Unit Tests (MANDATORY)

- [x] 4.1 Update any `WeekPage`/`CalendarPage`/`MonthPage` tests referencing old nav labels/clusters
- [x] 4.2 Update guest e2e selectors: Week now exposes `week-fab`; nav uses `calendar-today/prev/next`

## 5. Run Unit Tests and Verify State (MANDATORY)

- [x] 5.1 Targeted: `bun run test src/components/calendar src/pages/WeekPage src/pages/MonthPage`
- [x] 5.2 Full suite: `bun run test`
- [x] 5.3 No DB state involved (UI-only); state so in the report
- [x] 5.4 Create report `specs/calendar-nav-create-consistency/reports/YYYY-MM-DD-step-unit-test-verification.md`
- [x] 5.5 Mark complete only after tests pass and report exists

## 6. Manual Endpoint Testing with curl (MANDATORY for backend) — N/A

- [x] 6.1 N/A — no backend endpoints.

## 7. E2E / Manual Verification (MANDATORY if applicable - AGENT MUST EXECUTE)

- [x] 7.1 Guest e2e (`e2e/week.e2e.ts` and Day spec): nav buttons present in order Today/‹/›; Week
      create menu exposes Log time + Add block and both work; verify in **guest mode**
- [x] 7.2 Run preview and visually confirm all three views share nav order/labels (desktop + ~390px)
- [x] 7.3 Document scenarios + outcomes in the change's `reports/` folder

## 8. Update Technical Documentation (MANDATORY)

- [x] 8.1 Note the shared `CalendarNav` / `CalendarCreateMenu` in `docs/frontend-standards.md`
      (calendar components) if patterns are catalogued there
- [x] 8.2 Update `docs/calendar-ux-improvements-plan.md` Phase 2 status

## 9. Quality Gates

- [x] 9.1 `bun run lint` clean (semantic tokens, named imports)
- [x] 9.2 `bun run typecheck` clean
- [x] 9.3 Self-review diff; confirm no behavior change beyond nav order/labels + Week create menu
