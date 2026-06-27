## 0. Create feature branch

- [x] 0.1 Create and switch to `feature/custom-time-picker`

## 1. Profile & formatting foundation

- [x] 1.1 Add `time_format` to `LocalProfile`, default profile, Supabase migration, and supabase client select/update
- [x] 1.2 Add `fmtDisplayTime(hhmm, format)` and `TimeFormat` type in `time.ts`; extend `plannerPrefsSchema` with `timeFormat`
- [x] 1.3 Add `useTimeFormat` hook; add Settings toggle + save wiring; unit tests for formatting and Settings

## 2. TimeInput component (TDD)

- [x] 2.1 Write failing tests for `TimeInput` (value/onChange, 24h/12h display, popover interaction)
- [x] 2.2 Implement `src/components/ui/time-input.tsx` using Popover + scroll columns; tests pass

## 3. Integrate TimeInput in forms

- [x] 3.1 Replace native time inputs in `QuickLogDialog`; update `QuickLogDialog.test.tsx`
- [x] 3.2 Replace native time inputs in `ScheduleBlockDialog` and `ScheduleEditor`; update related tests

## 4. App-wide display formatting

- [x] 4.1 Update `DayTimeline`, `WeekGrid`, `MonthPage`, and other user-visible `fromMin`/`fmtTimeLabel` usages to use `useTimeFormat` + `fmtDisplayTime`
- [x] 4.2 Remove `::-webkit-calendar-picker-indicator` hack from `index.css`

## 5. i18n & E2E

- [x] 5.1 Add en/es strings for Settings time format labels
- [x] 5.2 Update `e2e/time-logging.e2e.ts` if selectors or interaction changed

## 6. Verification

- [x] 6.1 Run targeted unit tests (`pnpm test` for touched files)
- [x] 6.2 Run `pnpm verify` once before archive
