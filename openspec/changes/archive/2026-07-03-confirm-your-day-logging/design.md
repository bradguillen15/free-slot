## Context

Manual time logging is the adoption killer identified in user feedback: "hay que dar por hecho que el usuario es perezoso." The fixed weekly schedule (`schedule_blocks`) already describes the expected day; time logs (`time_logs`) are a separate table the user must fill in by hand, entry by entry.

Two existing primitives make this feasible without new infrastructure:
- `src/lib/daySegments.ts` already computes, for a given day, which portions of a planned block are **not** covered by an existing log (`visibleBlockSegments`), used today to clip the schedule guide visually against logged time (`schedule-guide-precedence` spec).
- "Click a schedule block → Quick Log prefilled with its real span" (including full overnight spans, e.g. Sleep 23:00–07:00 as a single log row) is already the established one-block-to-one-log convention (`overnight-time-logging` spec, requirement "Logging from a schedule block prefills its real span").

Confirm-day is the bulk version of that same one-block-to-one-log conversion, run automatically for every block active on a day.

## Goals / Non-Goals

**Goals:**
- One tap materializes every relevant schedule block for a day into ordinary `time_logs` rows.
- Materialized logs are indistinguishable from manual ones everywhere they're read (Day/Week/Month, dashboard, migration) — no new "confirmed" flag anywhere.
- The action is safely re-runnable (idempotent) without a dedicated marker.

**Non-Goals:**
- Partial-segment fill: if a block is only partially covered by an existing log, this change does **not** attempt to log just the uncovered remainder as a separate entry. See Decision 2.
- Auto-selecting a category for schedule blocks that don't have one assigned. See Decision 3.
- A per-slot review/edit step before confirming — the action is bulk, edits happen afterward through existing edit flows (this is also why no new UI state is needed to distinguish confirmed vs manual logs).

## Decisions

**1. Idempotency is a byproduct of the overlap check, not a separate marker.**
`confirmDay(date)` iterates the schedule blocks active on `date` (`days_of_week` includes that weekday) and, for each, checks whether it already fully overlaps an existing log for that day using the same `visibleBlockSegments` primitive the timeline already uses for clipping. If a block's confirmed log already exists (created by a previous confirm-day run, or entered manually with the same span), the overlap check reports full coverage and the block is skipped. No `confirmed` column, no "confirmed at" timestamp — re-running the action naturally does nothing for blocks already covered. Alternative considered: a `source: "confirm" | "manual"` marker on `time_logs` — rejected, it's unnecessary bookkeeping given the overlap check alone gives idempotency, and it would obligate every future log-reading code path to decide whether to treat confirm-created logs differently (they explicitly should not, per the proposal).

**2. Any overlap skips the whole block — no partial-segment fill.**
If a block has *any* overlapping log on that day (full or partial), the entire block is skipped, not just the covered portion. Alternative considered: log only the uncovered remainder (using `visibleBlockSegments`'s returned sub-ranges) as separate `time_logs` rows — rejected for v1: a block is one semantic unit (one category, one title); splitting it into arbitrary uncovered sub-ranges produces fragments that don't obviously correspond to anything the user did, and reintroduces exactly the "confirmed vs manual" distinction the design otherwise avoids (a partial-fill log looks nothing like what the user would have entered by hand). Whole-block skip means: log something you did differently at any point during a planned block, and confirm-day leaves that whole slot to you.

**3. Blocks without a `category_id` are skipped, not defaulted.**
`time_logs.category_id` is non-nullable; a schedule block's `category_id` is optional and often absent (e.g. blocks created from `BLOCK_PRESETS` or `SAMPLE_SCHEDULE_BLOCKS` have none by default). Confirm-day skips any block with `category_id: null` rather than guessing a category. Alternative considered: fall back to a generic "Uncategorized" or first-available category — rejected, a wrong auto-assigned category is worse than not logging it, and the natural fix (assign a category to the block once, via the existing Schedule editor) benefits every future day, not just this one.

**4. One log per block, using the block's full stored span — including overnight.**
Confirming a Sleep block (23:00–07:00) active on day D creates exactly one `time_logs` row: `date: D, start_time: "23:00", end_time: "07:00"`. This matches the existing single-row overnight convention exactly (no splitting into two logs for the visual midnight boundary — that split is a rendering-only concern in `daySegments.ts`).

**5. `confirmDay` is a pure domain function plus one dataStore-level batch write, mirroring the guest/cloud split everywhere else.**
New pure logic (which blocks qualify, what rows to build) lives in `src/lib/confirmDay.ts`, unit-tested directly with no localStorage/network dependency — the main TDD surface per the proposal. `dataStore.ts` gets a `confirmDay(mode, userId, date, blocks, logs, categories)` function that calls the pure builder then performs a single batch insert: guest via a loop of `localInsertLog` calls (or a new `insertManyLogs` guest primitive if one doesn't already exist), cloud via `resources.timeLogs.insertMany`. Alternative considered: one Supabase RPC doing the whole thing server-side — rejected, this project has no server-side procedures pattern (no REST/Express layer per `docs/backend-standards.md`), and the client already holds all the data (blocks, logs, categories) needed to compute this without a round trip.

## Risks / Trade-offs

- **[Risk]** A user might expect confirm-day to intelligently split around a manual log (decision 2 says it won't). → **Mitigation**: this is a scope choice for v1, not silent data loss — the block is simply left unconfirmed, same as if the user hadn't clicked "Confirm my day" at all. Copy on the action should say "fills in what you haven't logged yet" to set expectations.
- **[Risk]** Blocks without categories silently produce nothing (decision 3), which could look like the button "did nothing" for a user whose schedule blocks are all uncategorized (e.g. right after first-run sample data, before assigning categories). → **Mitigation**: the confirm action reports how many blocks were logged vs skipped-for-no-category, so the feedback is explicit rather than silent.
- **[Trade-off]** No `confirmed`/`source` marker means the dashboard, week view, and everywhere else genuinely cannot distinguish confirm-day logs from manual ones — this is intentional (decision 1) but means, e.g., a "how many days did I actually confirm" stat is not a feature this data model can support later without adding exactly the marker decision 1 rejected. Acceptable given no such stat currently exists or was requested.

## Migration Plan

No data migration required — `confirmDay` only ever writes ordinary `time_logs` rows through the existing insert paths (guest localStorage, cloud `resources.timeLogs.insertMany`), which already handle both guest and cloud schema shapes. No new columns, no new tables. Fully reversible by deleting or editing the created logs like any other log.

## Open Questions

None outstanding for v1 — the partial-fill and category-fallback questions were resolved above by scoping them out; both are natural follow-ups if user feedback asks for them specifically.
