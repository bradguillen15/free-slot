# Tasks — sleep-overnight-one-action

> Frontend only (Tier 1, no schema). curl/RLS steps **N/A**. Not account-gated → guest-mode parity
> verified. Depends on `calendar-nav-create-consistency` (CalendarCreateMenu) and
> `calendar-logs-source-of-truth-week-dnd` (`date`-aware updateTimeLog + Week drag).

## 0. Setup: Create Feature Branch (MANDATORY - FIRST STEP)

- [ ] 0.1 Create feature branch `feature/sleep-overnight-one-action` from `main`
- [ ] 0.2 Verify branch creation and current branch status

## 1. Tests First (TDD)

- [ ] 1.1 `QuickLogDialog.test.tsx`: an overnight range (end ≤ start) is accepted (no "end before start"
      error), saves a single row, shows the "next day" hint. (red)
- [ ] 1.2 Create-menu test: the "Sleep" preset opens the dialog prefilled overnight with the Sleep
      category (creating it from the seed if missing). (red)
- [ ] 1.3 `daySegments`/`gaps` regression: a logged overnight sleep clips the planned Sleep block across
      midnight on both affected days. (red/guard)

## 2. Implementation

- [ ] 2.1 Add a Sleep-category lookup/create helper (reuse `DEFAULT_CATEGORY_SEED` "Sleep"); guest + cloud
- [ ] 2.2 Add the "Sleep" preset item to `CalendarCreateMenu` that opens `QuickLogDialog` with an overnight
      `defaultStart`/`defaultEnd` + the Sleep `defaultCategoryId`
- [ ] 2.3 Add/confirm the "next day" end-time indicator in `QuickLogDialog` for overnight ranges
- [ ] 2.4 Confirm overnight edit/drag mutates the single row via the `date`-aware `updateTimeLog`
- [ ] 2.5 Make Section 1 tests pass (green)

## 3. Review and Update Existing Unit Tests (MANDATORY)

- [ ] 3.1 Ensure overnight/clip tests from the archived precedence work still pass

## 4. Run Unit Tests and Verify State (MANDATORY)

- [ ] 4.1 Targeted: `bun run test src/components/day/QuickLogDialog src/components/calendar src/lib/daySegments`
- [ ] 4.2 Full suite: `bun run test`
- [ ] 4.3 DB state via mocked provider/localStorage; state so in the report
- [ ] 4.4 Create report `specs/sleep-overnight-one-action/reports/YYYY-MM-DD-step-unit-test-verification.md`
- [ ] 4.5 Mark complete only after tests pass and report exists

## 5. Manual Endpoint Testing with curl (MANDATORY for backend) — N/A

- [ ] 5.1 N/A — no backend endpoints (Tier 1).

## 6. E2E / Manual Verification (MANDATORY if applicable - AGENT MUST EXECUTE)

- [ ] 6.1 Guest e2e `e2e/sleep.e2e.ts`: seed a recurring Sleep block; log an overnight sleep that differs
      from the plan in **one** action; assert (a) one log row spans both days, (b) day N's planned-sleep
      tail is replaced by the log, (c) the morning shows on day N+1; reload → persists
- [ ] 6.2 Document outcomes in the change's `reports/` folder

## 7. Update Technical Documentation (MANDATORY)

- [ ] 7.1 Note the Sleep preset + overnight one-action flow in `docs/frontend-standards.md` or the user-facing flow docs
- [ ] 7.2 Update `docs/sleep-overnight-logging-plan.md` (Tier 1 status; Tier 2 remains a follow-up)

## 8. Quality Gates

- [ ] 8.1 `bun run lint` clean
- [ ] 8.2 `bun run typecheck` clean
- [ ] 8.3 Self-review: no recurring-template mutation for a one-night change; guest/cloud parity preserved
