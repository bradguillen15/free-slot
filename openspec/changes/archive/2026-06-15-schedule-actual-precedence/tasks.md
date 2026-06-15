## 1. Pure helpers in `src/lib/time.ts` (TDD)

- [x] 1.1 Write failing unit tests in `src/lib/time.test.ts` for a new `subtractIntervals(base, cuts)` helper (half-open same-day intervals): cut overlapping the start, cut overlapping the end, cut in the middle (splits into two), cut fully covering base (empty result), no cuts (base unchanged), multiple overlapping cuts merged, and pre-expanded overnight segments
- [x] 1.2 Implement `subtractIntervals(base: Array<[number, number]>, cuts: Array<[number, number]>): Array<[number, number]>` in `src/lib/time.ts` until the new tests pass
- [x] 1.3 Confirm/extend tests for the existing `durationMinutes` (overnight wrap: 23:00→06:00 = 420) and `expandRange` (overnight split, zero-length returns `[]`) so the helpers relied on by later tasks are pinned

## 2. Overnight logging in `QuickLogDialog` (TDD)

- [x] 2.1 Write/adjust failing tests for `src/components/day/QuickLogDialog.tsx`: an entry with end ≤ start (e.g. 23:00→06:00) saves successfully on both create and edit; a zero-length entry (start === end) is rejected; the duration readout shows the wrapped value
- [x] 2.2 Relax the validation guard from `toMin(end) <= toMin(start)` to `toMin(end) === toMin(start)`, and replace the inline `Math.max(0, toMin(end) - toMin(start))` duration with `durationMinutes(start, end)` (covers the readout and the success-toast duration) — apply to both the create and edit paths
- [x] 2.3 Manual verification (guest mode + signed-in): log 23:00→06:00 → saved, duration reads 7h 0m; edit an existing entry into an overnight span → saved; start === end → rejected with a message — deferred to task 5 batch (browser preview)

## 3. Log-from-block prefill in `CalendarPage`

- [x] 3.1 Write/adjust a test for `logFromBlock` behavior: clicking an overnight block (23:00→08:00) and choosing "log here" prefills start 23:00 / end 08:00; a same-day block (09:00→17:00) prefills 09:00 / 17:00 — extracted to a pure `logDefaultsFromBlock` helper in `src/lib/schedule.ts` with `src/lib/schedule.test.ts`
- [x] 3.2 In `src/pages/CalendarPage.tsx`, remove the overnight truncation branch in `logFromBlock` so `end` is always `block.end_time.slice(0, 5)` (via `logDefaultsFromBlock`)
- [x] 3.3 Manual verification: click an overnight Sleep block → "log here" → dialog prefilled with the real span, saves without error — deferred to task 5 batch (browser preview)

## 4. Guide clipping in `DayTimeline` (TDD)

- [x] 4.1 Write failing tests covering the `schedule-guide-precedence` spec scenarios at the unit level (clip a block's segments against the day's log segments): partial cover trims, full cover removes, middle cover splits into two, overnight log clips an overnight block, no logs leave the block intact
- [x] 4.2 In `src/components/day/DayTimeline.tsx`, render each planned block via the exported pure `visibleBlockSegments(block, logs)` helper (`subtractIntervals(segmentsForDay(block), logSegments)`) instead of its raw segments; keep the existing z-order and `BlockBar` rendering
- [x] 4.3 Manual verification in the day view: add a planned block, log a partial overlap → guide recedes to the remainder; log a full overlap → guide disappears; log a middle overlap → guide splits; remove the log → guide returns intact — task 5 batch (browser preview)

## 5. Verification, parity, and docs

- [x] 5.1 Run the test suite and lint; all green except the known pre-existing `CalendarPage.test.tsx` "No QueryClient" failure (confirmed unrelated). Changed files are lint-clean (0 errors); a separate pre-existing lint error in `Auth.test.tsx` from the onboarding change is flagged for separate cleanup
- [x] 5.2 Confirm guest-mode parity end-to-end via the browser preview (all data flows through `dataStore`/`localStore`; no direct `supabase.from()` added to guest-capable views) and confirm `src/lib/gaps.ts` is untouched (free-window results unchanged)
- [x] 5.3 Update `docs/ARCHITECTURE.md` (day-view section) to note that planned blocks clip against logged time as a presentation rule, and that Week/Month are not yet clipped; verify no `docs/DESIGN.md` token changes are needed (none needed — no new tokens)
