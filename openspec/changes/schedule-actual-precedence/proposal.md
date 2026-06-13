## Why

The schedule (recurring blocks) is meant to be a *guide*, not a record — yet today a planned
block keeps showing its full span even after the user logs what they actually did over part of
it, so the guide nags about time that's already accounted for. Worse, the marquee guide case —
sleep — cannot even be logged: the log dialog rejects any entry that crosses midnight. Users who
deviate from their planned sleep (a very common case) have no easy way to record reality, and the
schedule never recedes to reflect it.

## What Changes

- **Actual logs take precedence over the schedule guide.** In the day timeline, each planned
  schedule block is clipped to only the portion **not** covered by any logged time on that day.
  Logging a replacement activity is the override — the planned block automatically recedes to the
  remaining, unaccounted-for time. No per-day "skip/exception" mechanism is introduced.
- **Overnight time logging is supported.** `QuickLogDialog` accepts entries where the end time is
  at or before the start time (crossing midnight), computes the wrapped duration correctly, and
  the live duration readout reflects it. This applies to both creating and editing a log.
- **"Log actual" from a block prefills the real span.** Choosing "log here" on an overnight
  schedule block (e.g. Sleep 23:00→08:00) prefills the block's actual start and end, instead of
  the current broken 59-minute window.
- Scope is the **Day view** (`DayTimeline` + `CalendarPage`). Week and Month views are explicit
  follow-ups and are out of scope for this change.
- Presentation-level only: the free-window / gaps engine is unchanged.

## Capabilities

### New Capabilities
- `schedule-guide-precedence`: In the day timeline, planned schedule blocks are clipped to only
  the time not covered by logged entries, so the schedule reads as a shrinking guide of what is
  still unaccounted for.
- `overnight-time-logging`: Time entries may span midnight (end ≤ start); duration is computed by
  wrapping past midnight, and "log from block" prefills an overnight block's true span.

### Modified Capabilities
<!-- None — no existing capability specs in openspec/specs/. -->

## Impact

- **Code (frontend, presentation only):**
  - `src/components/day/DayTimeline.tsx` — clip planned block segments against logged segments
    before rendering.
  - `src/components/day/QuickLogDialog.tsx` — remove the `end <= start` rejection; compute wrapped
    duration for create and edit.
  - `src/pages/CalendarPage.tsx` — fix `logFromBlock` to prefill the block's real overnight span.
  - `src/lib/time.ts` — small pure helpers for minute-space interval subtraction and wrapped
    duration (overnight-aware, alongside existing `expandRange`).
- **No schema change**, no API change, no data migration.
- **Unchanged:** `src/lib/gaps.ts` (free-window detection already treats planned and logged time
  as busy). Week/Month views retain current behavior.
- **Tests:** new unit tests for the interval-subtraction and wrapped-duration helpers; updated
  component tests for overnight logging and block clipping.
