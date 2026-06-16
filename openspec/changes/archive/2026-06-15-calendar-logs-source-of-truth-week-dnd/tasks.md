# Tasks — calendar-logs-source-of-truth-week-dnd

> Frontend + data-access. No new backend endpoints/tables (the `date` column exists) → curl/RLS **N/A**.
> Not account-gated → guest-mode parity verified. Depends on `resources-mutations-migration` (Phase 1)
> and `calendar-builddaycells-foundation` (Phase 3).

## 0. Setup: Create Feature Branch (MANDATORY - FIRST STEP)

- [ ] 0.1 Create feature branch `feature/calendar-logs-source-of-truth-week-dnd` from `main`
- [ ] 0.2 Verify branch creation and current branch status

## 1. Tests First (TDD) — data layer

- [ ] 1.1 `dataStore.test.ts`: `updateTimeLog` with a new `date` updates the row (cloud, mock provider)
      and moves the log across month buckets (guest `localStore`), existing-in-exactly-one-bucket. (red)
- [ ] 1.2 `resources` time-logs update accepts `date` in the patch (provider mapping test). (red)

## 2. Implementation — data layer

- [ ] 2.1 Extend `updateTimeLog` input with optional `date`; cloud → `resources.timeLogs.update`,
      guest → `localStore` cross-bucket move; keep invalidation
- [ ] 2.2 Implement the `localStore` cross-month move; add `date` to the provider update mapper
- [ ] 2.3 Make Section 1 tests pass (green)

## 3. Tests First (TDD) — Week drag

- [ ] 3.1 `WeekGrid.test.tsx`: simulate a drag gesture on a log → `onLogReschedule(logId, newDate,
      newStartMin, newEndMin)` with snapped time **and** new date; category-less log blocked with toast. (red)

## 4. Implementation — Week drag + wiring

- [ ] 4.1 Add pointer drag to `WeekGrid` log bars (mirror DayTimeline: long-press, `DRAG_CANCEL_PX`,
      `SNAP_MIN=15`; vertical=time, horizontal=day)
- [ ] 4.2 Generalize the reschedule callback to `(logId, newDate, newStartMin, newEndMin)`; update
      `DayTimeline` + `CalendarPage` to the new shape (Day passes unchanged date)
- [ ] 4.3 Wire `WeekPage` reschedule handler → `updateTimeLog` + `refreshLogs` with the category guard + toasts
- [ ] 4.4 Make Section 3 tests pass (green)

## 5. Review and Update Existing Unit Tests (MANDATORY)

- [ ] 5.1 Update Day timeline/CalendarPage tests for the new callback signature
- [ ] 5.2 Keep guest/cloud parity matrix green

## 6. Run Unit Tests and Verify State (MANDATORY)

- [ ] 6.1 Targeted: `bun run test src/lib/dataStore src/components/week src/components/day src/resources`
- [ ] 6.2 Full suite: `bun run test`
- [ ] 6.3 DB state via mocked provider/localStorage; state so in the report
- [ ] 6.4 Create report `specs/calendar-logs-source-of-truth-week-dnd/reports/YYYY-MM-DD-step-unit-test-verification.md`
- [ ] 6.5 Mark complete only after tests pass and report exists

## 7. Manual Endpoint Testing with curl (MANDATORY for backend) — N/A

- [ ] 7.1 N/A — no backend endpoints.

## 8. E2E / Manual Verification (MANDATORY if applicable - AGENT MUST EXECUTE)

- [ ] 8.1 Guest e2e (`e2e/week.e2e.ts`): seed a log, drag to another day/time, assert it persists
      (read back via `readGuest*`) and renders in the new cell; reload → still there
- [ ] 8.2 Cross-view guest e2e: create a log in Week; open Day for that date → appears (Month appears
      once Phase 5 ships; assert data presence here)
- [ ] 8.3 Cloud e2e: drag persists against local Supabase
- [ ] 8.4 Document outcomes in the change's `reports/` folder

## 9. Update Technical Documentation (MANDATORY)

- [ ] 9.1 Document the `date` field on `updateTimeLog` in `docs/data-model.md` / `docs/ARCHITECTURE.md`
- [ ] 9.2 Update `docs/calendar-ux-improvements-plan.md` Phase 4 status

## 10. Quality Gates

- [ ] 10.1 `bun run lint` clean
- [ ] 10.2 `bun run typecheck` clean
- [ ] 10.3 Self-review: no `supabase.from` added to pages/components; date path goes through resources
