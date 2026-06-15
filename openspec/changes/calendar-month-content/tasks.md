# Tasks — calendar-month-content

> Frontend only. curl/RLS steps **N/A**. Not account-gated → guest-mode parity verified. Responsive
> target ~390px. Depends on `calendar-builddaycells-foundation` (`useCalendarDays`).

## 0. Setup: Create Feature Branch (MANDATORY - FIRST STEP)

- [ ] 0.1 Create feature branch `feature/calendar-month-content` from `main`
- [ ] 0.2 Verify branch creation and current branch status

## 1. Tests First (TDD)

- [ ] 1.1 `MonthPage.test.tsx`: given seeded blocks + logs, a day cell renders block/log segments with
      category colors; today cell highlighted; empty day renders an uncluttered cell. (red)
- [ ] 1.2 Responsive assertion: the mini-bar is hidden at the small breakpoint (class-based) and the
      mobile-collapsed layout (day number + intensity + total) is shown. (red)

## 2. Implementation

- [ ] 2.1 Refactor `MonthPage` to consume `useCalendarDays(firstISO, lastISO)`
- [ ] 2.2 Add a `MonthDayBar` mini-bar component rendering block/log segments from `DayCellData`
- [ ] 2.3 Responsive: full mini-bar `sm:`+, mobile collapse to day number + intensity + total
- [ ] 2.4 Remove `DAY_QUARTERS` + `openQuickLogForQuarter`; whole-cell tap → Day view
- [ ] 2.5 Keep stat cards + shared `CalendarNav`; make Section 1 tests pass (green)

## 3. Review and Update Existing Unit Tests (MANDATORY)

- [ ] 3.1 Update/replace existing MonthPage tests referencing the quarter buttons / intensity-only cells

## 4. Run Unit Tests and Verify State (MANDATORY)

- [ ] 4.1 Targeted: `bun run test src/pages/MonthPage`
- [ ] 4.2 Full suite: `bun run test`
- [ ] 4.3 DB state N/A (mocked); state so in the report
- [ ] 4.4 Create report `specs/calendar-month-content/reports/YYYY-MM-DD-step-unit-test-verification.md`
- [ ] 4.5 Mark complete only after tests pass and report exists

## 5. Manual Endpoint Testing with curl (MANDATORY for backend) — N/A

- [ ] 5.1 N/A — no backend endpoints.

## 6. E2E / Manual Verification (MANDATORY if applicable - AGENT MUST EXECUTE)

- [ ] 6.1 Guest e2e `e2e/month.e2e.ts`: seed schedule + logs, open Month, assert schedule/logs visible;
      set mobile viewport, assert no horizontal scroll / quarter-button clutter; tap a cell → Day opens
- [ ] 6.2 Preview Month at desktop and ~390px; screenshot for proof
- [ ] 6.3 Document outcomes in the change's `reports/` folder

## 7. Update Technical Documentation (MANDATORY)

- [ ] 7.1 Note the Month mini day-bar + tap-to-day in `docs/frontend-standards.md` / DESIGN if catalogued
- [ ] 7.2 Update `docs/calendar-ux-improvements-plan.md` Phase 5 status (and overall plan DoD)

## 8. Quality Gates

- [ ] 8.1 `bun run lint` clean (semantic tokens, no hardcoded colors)
- [ ] 8.2 `bun run typecheck` clean
- [ ] 8.3 Self-review: Month derives from `useCalendarDays`; no bespoke log-only assembly remains
