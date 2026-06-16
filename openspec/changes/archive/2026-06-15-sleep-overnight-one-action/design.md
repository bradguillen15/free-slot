## Context

Overnight logging already works: `time.ts` expands and wraps spans where end ≤ start, `QuickLogDialog`
accepts overnight entries, and `visibleBlockSegments` clips planned blocks against logs (all shipped in
the archived `schedule-actual-precedence` change). The default category seed (`localStore.ts`
`DEFAULT_CATEGORY_SEED`) already includes a "Sleep" category (`type: "productive"`,`#6366f1`). The
remaining gap is interaction: there's no one-tap way to record overnight sleep, and cross-midnight
adjustment depends on the `date`-aware `updateTimeLog` + Week drag from the logs-source-of-truth change.

## Goals / Non-Goals

**Goals:**
- One-action overnight sleep capture (preset → prefilled overnight single-row log + Sleep category).
- One-action cross-midnight adjustment (drag/edit the single row, may change `date`).
- Verify clip-on-log still removes the planned-sleep tail.

**Non-Goals:**
- Tier 2 per-instance block exceptions (`schedule_block_exceptions` table) — separate follow-up.
- Redefining Sleep's `type` or counting rules (reuse the existing seed as-is).
- Month drag.

## Decisions

- **Reuse the existing default Sleep category (Q2/Q3 resolved by the seed).** The preset looks up the
  "Sleep" category and creates it from `DEFAULT_CATEGORY_SEED` if missing; it does **not** introduce a
  new category or change the seeded `type`. Avoids a product decision and keeps guest/cloud parity.
- **Preset prefills via existing `QuickLogDialog` props** (`defaultStart`, `defaultEnd`,
  `defaultCategoryId`). No new dialog — just a prefilled open. Default span = a sensible overnight
  window (e.g. 23:00 → 07:00) the user can adjust.
- **One row, not two.** Overnight sleep is a single `time_log` with end ≤ start; the dialog shows a
  "next day" hint. This is what makes adjustment a single action.
- **Cross-midnight move reuses Phase 4.** Editing/dragging routes through the `date`-aware
  `updateTimeLog`; no new persistence path here. Snap = `SNAP_MIN = 15` (Q4).
- **Clip is presentation-level and already implemented.** This change adds regression tests, not new
  clip logic.

## Risks / Trade-offs

- [Default overnight window may not match the user's habit] → It's only a prefill; the user edits before
  saving. Could later derive from the Sleep block's times.
- [Sleep category missing in cloud mode] → Create-on-first-use through the resources/dataStore path,
  same as guest, preserving parity.

## Migration Plan

Tier 1: frontend only, no DB migration. Rollback = revert. Tier 2 (if ever needed) is a separate change
with its own migration. Verify with Vitest + guest `sleep.e2e.ts`.

## Open Questions

- Q1 (is Tier 1 enough, or is a no-log "skip planned block" needed?) — assume **yes, Tier 1 suffices**;
  revisit with a Tier 2 change only if the user still needs to suppress planned blocks without logging.
