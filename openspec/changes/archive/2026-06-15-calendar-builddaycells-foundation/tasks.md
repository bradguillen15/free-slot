# Tasks — calendar-builddaycells-foundation

> Frontend pure refactor. No backend endpoints/tables → curl/RLS steps **N/A**. Not account-gated →
> guest-mode parity verified (Week renders identically in guest mode). Foundation for Phases 4 & 5.

## 0. Setup: Create Feature Branch (MANDATORY - FIRST STEP)

- [ ] 0.1 Create feature branch `feature/calendar-builddaycells-foundation` from `main`
- [ ] 0.2 Verify branch creation and current branch status

## 1. Tests First (TDD)

- [ ] 1.1 `src/lib/calendarDays.test.ts`: `buildDayCells` attributes overnight blocks/logs to correct
      days (reuse `expandRange` cases); computes gaps, peak flag, totals; passes AI slots through;
      maps category colors. (red)

## 2. Implementation — builder

- [ ] 2.1 Create `src/lib/calendarDays.ts`; move `DayCellData`/`DayCellBlock`/`DayCellLog`/`AISlotSeg`
      types here; implement `buildDayCells(input)` by lifting the WeekPage `dayCells` memo verbatim
- [ ] 2.2 Re-export the cell types from `src/components/week/WeekGrid.tsx` for compatibility
- [ ] 2.3 Make Section 1 tests pass (green)

## 3. Implementation — hook + Week adoption

- [ ] 3.1 Add `useCalendarDays(startISO, endISO)` (wraps `useTimeLogsInRange`, `useScheduleBlocks`,
      `useVisibleCategories`, profile → `buildDayCells`)
- [ ] 3.2 Refactor `src/pages/WeekPage.tsx` to consume `useCalendarDays`/`buildDayCells`; remove the
      inline `dayCells` memo and local `catMap`
- [ ] 3.3 Confirm no visual change

## 4. Review and Update Existing Unit Tests (MANDATORY)

- [ ] 4.1 Ensure `WeekGrid.test.tsx` and any WeekPage tests stay green without behavioral edits

## 5. Run Unit Tests and Verify State (MANDATORY)

- [ ] 5.1 Targeted: `bun run test src/lib/calendarDays src/components/week src/pages/WeekPage`
- [ ] 5.2 Full suite: `bun run test`
- [ ] 5.3 DB state N/A (pure logic / mocked); state so in the report
- [ ] 5.4 Create report `specs/calendar-builddaycells-foundation/reports/YYYY-MM-DD-step-unit-test-verification.md`
- [ ] 5.5 Mark complete only after tests pass and report exists

## 6. Manual Endpoint Testing with curl (MANDATORY for backend) — N/A

- [ ] 6.1 N/A — no backend endpoints.

## 7. E2E / Manual Verification (MANDATORY if applicable - AGENT MUST EXECUTE)

- [ ] 7.1 Run guest e2e Week flows; confirm Week renders identically (blocks, logs, gaps, stats)
- [ ] 7.2 Preview the Week view (desktop + ~390px) and confirm no visual regression
- [ ] 7.3 Document outcomes in the change's `reports/` folder

## 8. Update Technical Documentation (MANDATORY)

- [ ] 8.1 Note `calendarDays`/`useCalendarDays` in `docs/frontend-standards.md` (calendar data flow)
- [ ] 8.2 Update `docs/calendar-ux-improvements-plan.md` Phase 3 status

## 9. Quality Gates

- [ ] 9.1 `bun run lint` clean
- [ ] 9.2 `bun run typecheck` clean
- [ ] 9.3 Self-review: WeekPage no longer assembles cells inline; types canonical in `calendarDays.ts`
