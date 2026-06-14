## Context

The day timeline (`src/components/day/DayTimeline.tsx`) renders two layers over a 24-hour grid:
planned schedule blocks (translucent, `z-10`) and logged time entries (solid, `z-20`). Both are
expanded into same-day segments via `segmentsForDay` → `expandRange` (`src/lib/time.ts`), which is
already overnight-aware. Today the planned block always renders its full span; logs merely paint on
top, so the plan still "sticks out" beyond what the user actually did and keeps nagging about time
already accounted for.

Two existing defects make the marquee case — sleep — unusable:
- `QuickLogDialog` rejects any entry where `toMin(end) <= toMin(start)`, so an overnight sleep
  (e.g. 23:00→06:00) cannot be saved; its live duration readout also computes `Math.max(0, end-start)`,
  showing `0m`.
- `CalendarPage.logFromBlock` prefills an overnight block as `start` → `min(start+60, 23:59)`, i.e. a
  bogus 59-minute window, instead of the block's real end.

`src/lib/time.ts` already provides `expandRange` (overnight-aware same-day segments) and
`durationMinutes` (wrapped duration, `end <= start` crosses midnight). The dialog simply does not use
the latter.

## Goals / Non-Goals

**Goals:**
- In the day view, render each planned block only where it is NOT covered by a logged entry, so the
  schedule reads as a shrinking guide ("actual takes precedence over plan").
- Allow logging and editing entries that cross midnight, with a correct wrapped duration readout.
- Prefill the real span when logging from an overnight block.
- Keep all logic pure and unit-tested; presentation-layer only.

**Non-Goals:**
- Clipping in Week/Month views (explicit follow-up).
- Any per-day "skip / didn't happen / exception" mechanism — logging the replacement activity IS the
  override; nothing to skip.
- Schema, API, or data-migration changes.
- Any change to the free-window / gaps engine (`src/lib/gaps.ts`), which already counts planned and
  logged time as busy.

## Decisions

### 1. Clip via a pure minute-space interval-subtraction helper in `time.ts`
Add `subtractIntervals(base: Array<[number, number]>, cuts: Array<[number, number]>): Array<[number, number]>`
operating on half-open same-day intervals within `[0, MIN_PER_DAY)`. In `DayTimeline`, compute the
union of all log segments for the day (each log expanded via `expandRange`), then for each block render
`subtractIntervals(segmentsForDay(block), logSegments)` instead of the raw block segments.
- **Why here:** `DayTimeline` already owns segment expansion and rendering; clipping at the render
  boundary keeps `CalendarPage` thin and the helper trivially testable.
- **Alternative considered:** pre-clip in `CalendarPage` and pass visible segments down — rejected; it
  leaks rendering concerns upward and complicates the props contract.

### 2. Any logged time clips the guide, regardless of category
A log of "Work" clips a planned "Sleep" block just as a "Sleep" log would — any accounted-for time
hides the guide beneath it. This matches the product intent (the schedule is a guide, the log is the
truth) and keeps the rule a single, category-agnostic interval subtraction.

### 3. Reuse `durationMinutes` for the dialog readout (no new helper)
Replace `QuickLogDialog`'s `Math.max(0, toMin(end) - toMin(start))` with the existing
`durationMinutes(start, end)`, which already wraps past midnight. Avoids duplicating overnight math.

### 4. Relax validation to reject only zero-length entries
Change the guard from `toMin(end) <= toMin(start)` to `toMin(end) === toMin(start)`. `end < start` is a
valid overnight entry (consistent with `expandRange`/`durationMinutes`); only `end === start` (zero
duration) is rejected. Applies to both create and edit paths.

### 5. Drop the overnight truncation in `logFromBlock`
Prefill `end` with `block.end_time.slice(0, 5)` unconditionally; remove the `overnight ? …` branch.
With overnight logging now allowed, no truncation is needed.

## Risks / Trade-offs

- **A large log can hide a planned block entirely** → Intended: the slot is accounted for. The log
  still renders with its own color/label, so the timeline remains legible. Acceptable per product
  intent (guide, not ledger).
- **Many small logs could fragment a block into noisy slivers** → Existing `Math.max(height, 14)`
  min-height already keeps segments visible; fragmentation mirrors reality and is acceptable.
- **Edit path parity** → The relaxed validation and `durationMinutes` reuse must cover both the create
  and the edit branch in `QuickLogDialog`; a single shared validation/duration path prevents drift.
- **Clipping cost is O(blocks × logs) per render** → Both are small (handful of items/day); memoize the
  union of log segments. Negligible.

## Migration Plan

Pure frontend, presentation-only change; no deploy steps, no data migration, no flags. Rollback is a
straight revert of the touched files (`time.ts`, `DayTimeline.tsx`, `QuickLogDialog.tsx`,
`CalendarPage.tsx`).

## Open Questions

None. Week/Month clipping is deliberately deferred to a follow-up change.
