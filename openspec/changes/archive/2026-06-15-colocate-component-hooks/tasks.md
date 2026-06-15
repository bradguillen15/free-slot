## 1. Shared hook: useNowMinute

- [x] 1.1 Create `src/hooks/useNowMinute.ts` — a reusable hook that returns the current minute-of-day for "today" (and `null`/static for non-today if a flag is passed), wrapping the per-minute `setInterval` tick currently inline in `CalendarPage`
- [x] 1.2 Add a small unit test for `useNowMinute` (initial value + interval cleanup) where practical with the existing test setup

## 2. CalendarPage → folder + co-located hooks

- [x] 2.1 `git mv src/pages/CalendarPage.tsx src/pages/CalendarPage/index.tsx`; verify `import CalendarPage from "./pages/CalendarPage"` in `App.tsx` still resolves
- [x] 2.2 Extract the auto-scroll-on-day-change effect into `src/pages/CalendarPage/useAutoScrollToHour.ts` (takes the scroll ref + date/isToday; same scroll math)
- [x] 2.3 Extract the `add-block-here` `document` custom-event listener into `src/pages/CalendarPage/useAddBlockHereListener.ts` (calls back into the block-dialog opener)
- [x] 2.4 Replace the inline per-minute tick with the shared `useNowMinute`; keep the now-indicator behavior identical
- [x] 2.5 Run `npm run test` and `npm run lint`; confirm no new failures (the pre-existing `CalendarPage.test.tsx` "No QueryClient" failure is unchanged and out of scope)

## 3. DashboardPage → folder + co-located hooks

- [x] 3.1 `git mv src/pages/DashboardPage.tsx src/pages/DashboardPage/index.tsx`; verify the App import still resolves
- [x] 3.2 Extract `perDay`, `totals`, `catBreakdown`, `planVsActual`, `daysLogged` (and the `days`/`weekEnd`/`catMap` they depend on) into `src/pages/DashboardPage/useDashboardStats.ts`, returning the exact shapes the component consumes
- [x] 3.3 Extract the personal-best celebration effect and the weekly-review auto-prompt effect into `src/pages/DashboardPage/useWeeklyReviewPrompt.ts`, preserving the same triggers and toasts
- [x] 3.4 Run `npm run test` (incl. `DashboardPage.test.tsx`) and `npm run lint`; confirm green

## 4. WeeklyReviewModal → folder + useWeeklyReviewData

- [x] 4.1 `git mv src/components/dashboard/WeeklyReviewModal.tsx src/components/dashboard/WeeklyReviewModal/index.tsx`; verify the `DashboardPage` import still resolves
- [x] 4.2 Extract the async parallel fetch (`time_logs`/`categories`/`weekly_plans`/`weekly_reviews`) + planned-vs-actual aggregation effect into `src/components/dashboard/WeeklyReviewModal/useWeeklyReviewData.ts`, keyed on `{ weekStart, open, user }`, returning the same `{ loading, insights, existing, ... }` shape
- [x] 4.3 Run `npm run test` and `npm run lint`; confirm green

## 5. PriorityRanker → folder + usePriorityData

- [x] 5.1 `git mv src/components/activities/PriorityRanker.tsx src/components/activities/PriorityRanker/index.tsx`; verify consumer imports still resolve
- [x] 5.2 Extract the async `weekly_priorities` fetch/init effect (cloud path + guest local path, with the `cancelled` guard) into `src/components/activities/PriorityRanker/usePriorityData.ts`, returning the same initialised ranked list + `loading`
- [x] 5.3 Run `npm run test` (incl. `PriorityRanker.test.tsx`) and `npm run lint`; confirm green

## 6. Optional shared useEventListener

- [x] 6.1 Evaluate whether a tiny `src/hooks/useEventListener.ts` cleanly de-duplicates the DOM-listener wiring (`add-block-here`, `CategoryPicker` wheel, `GuestBanner` guest-change); adopt only where it genuinely simplifies — SKIPPED: the three sites use different targets/options and two are out of scope; the named useAddBlockHereListener already reads clearly

## 7. Verification and docs

- [x] 7.1 Full `npm run test` + `npm run lint`: same pass/fail set as before plus any new hook tests passing; 0 new lint errors
- [x] 7.2 Smoke-check the refactored screens in the browser preview (guest mode): Dashboard renders KPIs/charts; Calendar now-line + auto-scroll + right-click add-block; verify no console errors
- [x] 7.3 Document the co-location convention (component folder + `index.tsx` + co-located `useX.ts`; reusable hooks in `src/hooks/`) in `docs/frontend-standards.md`
