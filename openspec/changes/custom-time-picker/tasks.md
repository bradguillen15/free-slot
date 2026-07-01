## 0. Create feature branch

- [x] 0.1 Create and switch to `feature/custom-time-picker`

## 1. Profile & formatting foundation

- [x] 1.1 Add `time_format` to `LocalProfile`, default profile, Supabase migration, and supabase client select/update
- [x] 1.2 Add `fmtDisplayTime(hhmm, format)` and `TimeFormat` type in `time.ts`; extend `plannerPrefsSchema` with `timeFormat`
- [x] 1.3 Add `useTimeFormat` hook; add Settings toggle + save wiring; unit tests for formatting and Settings

## 2. TimeInput component (TDD)

- [x] 2.1 Write failing tests for `TimeInput` (value/onChange, 24h/12h display, popover interaction)
- [x] 2.2 Implement `src/components/ui/time-input.tsx` using Popover + scroll columns; tests pass
- [x] 2.3 Extend tests for the wheel UX: scroll-snap wheel selection, editable field typing (`HH:MM` and `h:mm AM/PM`) committing on blur/Enter, invalid input revert, and AM/PM segmented toggle below the wheels
- [x] 2.4 Reimplement `time-input.tsx` as scroll-snap wheels + editable field + bottom AM/PM segmented toggle, primary (blue) selected state, 5-minute snap with off-step injection; tests pass
- [x] 2.5 Simplify `TimeInput` while preserving scroll-snap wheels: keep editable input, 12h/24h conversion, AM/PM toggle, off-step current minute display, dialog-safe in-flow positioning, wheel scrolling, and row clicks; remove native scroll listeners, programmatic-scroll guards, timestamp guards, and partial typed saves; update focused tests
- [x] 2.6 Ensure the editable field always displays minutes in both 24h and 12h mode, including zero-minute values such as `9:00 AM`

## 3. Integrate TimeInput in forms

- [x] 3.1 Replace native time inputs in `QuickLogDialog`; update `QuickLogDialog.test.tsx`
- [x] 3.2 Replace native time inputs in `ScheduleBlockDialog` and `ScheduleEditor`; update related tests
- [x] 3.3 Re-verify dialog/editor tests still pass against the wheel-based `TimeInput` (trigger is now an editable field, not a plain button); adjust selectors if needed

## 4. App-wide display formatting

- [x] 4.1 Update `DayTimeline`, `WeekGrid`, `MonthPage`, and other user-visible `fromMin`/`fmtTimeLabel` usages to use `useTimeFormat` + `fmtDisplayTime`
- [x] 4.2 Remove `::-webkit-calendar-picker-indicator` hack from `index.css`

## 5. i18n & E2E

- [x] 5.1 Add en/es strings for Settings time format labels
- [x] 5.2 Update `e2e/time-logging.e2e.ts` if selectors or interaction changed
- [x] 5.3 Add E2E coverage that drives the wheel picker UI: open the panel and click hour/minute rows (24h), and select 12h with the AM/PM segmented toggle; assert stored `HH:MM` (extend `GuestProfile` fixture with `time_format`)
- [x] 5.4 Keep E2E picker coverage aligned with the wheel picker terminology and preserved user flow

## 6. Verification

- [x] 6.1 Run targeted unit tests (`pnpm test` for touched files)
- [x] 6.2 Re-run targeted unit tests after the wheel redesign (time-input + dialogs)
- [x] 6.3 Run `pnpm verify` once before archive (lint + typecheck + 446 unit + 41 e2e all green)
- [x] 6.4 Run targeted tests for the simplified picker changes
- [x] 6.5 Run targeted tests for always-visible field minutes
