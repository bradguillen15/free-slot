# Tasks — overlapping-events

## Step 0: Create Feature Branch

- [x] 0.1 Create and switch to branch `feature/overlapping-events`
- [x] 0.2 Confirm clean working tree before proceeding

---

## Step 1: Collision layout algorithm

- [x] 1.1 Add `computeLaneLayout` pure function to `src/lib/daySegments.ts`
- [x] 1.2 Write unit tests in `src/lib/daySegments.test.ts` (9/9 pass)

---

## Step 2: DayTimeline rendering with lane props

- [x] 2.1 Compute `laneMap` via `useMemo` in `DayTimeline`
- [x] 2.2 Pass `lane` and `groupWidth` props to `BlockBar` and `LogBar`
- [x] 2.3 `BlockBar` uses percentage `left`/`width` inline styles
- [x] 2.4 `LogBar` uses percentage `left`/`width` inline styles; drag unchanged

---

## Step 3: Review and update existing tests

- [x] 3.1 `DayTimeline.test.tsx` — 6/6 pass, no regressions
- [x] 3.2 `daySegments.test.ts` — 9/9 pass

---

## Step 4: Run tests and typecheck

- [x] 4.1 `pnpm test` — 339/339 pass
- [x] 4.2 `pnpm typecheck` — 0 errors
- [x] 4.3 `pnpm lint` — 0 errors

---

## Step 5: Manual verification

- [x] 5.1 Dev server running
- [x] 5.2 Three overlapping logs render side by side at ~1/3 width each
- [x] 5.3 Non-overlapping solo log renders full width (no regression)
- [x] 5.4 Zero console errors
- [ ] 5.5 Drag a lane-positioned log bar — verify reschedule fires correctly
- [ ] 5.6 Schedule block + overlapping log — schedule remains full-width background, log renders above it

---

## Step 6: Refine overlap model for Google Calendar-style actual logs

- [x] 6.1 Update day-view tests so only actual logs use lanes; schedule blocks stay full-width background guides
- [x] 6.2 Update `DayTimeline` to compute lane layout from log segments only
- [x] 6.3 Add week-view tests for overlapping actual logs in the same day column
- [x] 6.4 Update `WeekGrid` to apply log lane layout per day column while preserving schedule block underlays
- [x] 6.5 Preserve log title/activity metadata during drag reschedule in day and week views
- [x] 6.6 Run focused tests and lints for changed files
