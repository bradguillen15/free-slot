# Proposal: confirm-your-day-logging

## Why

User testing (2026-07-01) identified manual logging as the adoption killer: "si tengo que estar rellenando todo lo que hago... nadie va a hacer eso — hay que dar por hecho que el usuario es perezoso." The fixed weekly schedule already describes the expected day, yet users must re-enter it hour by hour as logs. Logging should be opt-out (confirm the plan, correct deviations), not opt-in (reconstruct the day from scratch).

## What Changes

- New **"confirm my day"** action in Day view: one interaction that materializes the day's schedule blocks as real time logs — one log per schedule block, carrying the block's label and time range.
- Confirmation only fills **unlogged time**: schedule blocks that already overlap an existing manual log for that day are skipped (manual entries win). Design phase defines exact overlap semantics.
- Created logs are ordinary logs: they appear in Day/Week/Month views and dashboard like manual ones and can be individually edited or deleted afterwards ("adjust" is just the existing edit flow).
- The action is **idempotent**: re-confirming a day does not duplicate logs.
- Available for any day with schedule blocks (today or past days), in both guest and cloud modes with identical behavior.
- Clear affordance state: the action communicates when a day is already fully covered (nothing to confirm) and when the day has no schedule to confirm from.
- All new copy in English and Spanish (TS-enforced parity).

## Capabilities

### New Capabilities
- `confirm-day-logging`: The confirm action — schedule-to-log materialization, overlap/skip rules, idempotency, empty/covered states, guest and cloud parity.

### Modified Capabilities
<!-- none expected — existing logging specs (overnight-time-logging, calendar-log-rescheduling,
     sleep-quick-logging) keep their requirements; design phase must verify confirm-created logs
     satisfy them (e.g. overnight schedule blocks splitting per overnight-time-logging rules) -->

## Impact

- **Frontend**: Day view (`src/pages/CalendarPage`, `src/components/day/*`) gains the confirm affordance; possibly the day summary side panel.
- **Data layer**: a `confirmDay`-style operation in the dataStore abstraction implemented for both guest (`localStore`) and cloud (Supabase) providers; batch log creation path.
- **Domain logic**: pure schedule→log materialization function in `src/lib/` (overlap detection, overnight block handling) — the main TDD surface.
- **Interactions to verify in design**: overnight schedule blocks vs `overnight-time-logging` requirements; behavior when `first-run-sample-data` examples are present; whether dashboard should ever distinguish confirmed vs manual logs (current decision: it does not).
- **Tests**: unit tests for materialization logic and idempotency; E2E for the confirm flow in guest mode.
- **Docs/specs**: `docs/data-model.md` if any marker is added; no API changes (no edge functions involved).
