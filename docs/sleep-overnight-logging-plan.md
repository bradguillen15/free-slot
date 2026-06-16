# Tech Plan — Easy Sleep / Overnight Time Adjustment

**Status:** proposed (needs a data-model decision before implementation)
**Date:** 2026-06-14
**Origin:** user — "I often don't sleep on schedule… I want to adjust sleep easily. Right now I can't remove the scheduled sleep without affecting the recurring template. I want to take the last hour from day 11 and use it the next day in **one action**, instead of editing yesterday and then logging the next day."
**Related:** [calendar-ux-improvements-plan.md](./calendar-ux-improvements-plan.md) (the other 7 issues), [ARCHITECTURE.md](./ARCHITECTURE.md), [backend-standards.md](./backend-standards.md) (RLS + guest parity), [testing-plan.md](./testing-plan.md).

> Split from the main calendar plan because this is the only reported issue that may require a **schema/data-model change** and a product decision. It should be its own OpenSpec change.

---

## 1. Problem

The user's real day rarely matches the recurring **Sleep** schedule block (e.g. template = `23:00 → 07:00`, every day). On a given night they actually sleep, say, `00:30 → 09:00`. Two pain points:

1. **Overnight spans need two actions today.** Logging real sleep that crosses midnight currently means creating one log on day 11's tail and another on day 12's morning — and the scheduled sleep on day 11's tail still shows because the recurring block is untouched.
2. **You can't adjust one night without editing the template.** "Removing" the scheduled sleep from the end of day 11 means editing the recurring `schedule_blocks` row, which changes **every** day.

The user wants: **adjust a single night's sleep (across the midnight boundary) in one action, without mutating the recurring template.**

---

## 2. What already exists (verified)

- `schedule_blocks` is a **recurring template** (`days_of_week INT[]`, `start_time`, `end_time`, `type`). No per-day exceptions.
- `time_logs` is **per-date** (`date`, `start_time`, `end_time`, …). An overnight log is representable as one row where `end_time <= start_time` (wrap), and `expandRange`/`segmentsForDay` already split it across midnight.
- **Logs take precedence over blocks visually:** `visibleBlockSegments(block, logs)` clips the planned block to the minutes **not** covered by logs that day (`src/lib/daySegments.ts`). So *logging* actual sleep already "erases" the planned sleep where they overlap — the design intent is "log what happened; the plan shrinks."

**Implication:** the pain is mostly a **UI/interaction gap**, not a missing concept — *if* we make overnight logging a single action. A schema change is only required if the user also wants to suppress the *planned* block on a specific day **without** logging over it (e.g. "I skipped my workout block today, don't count it as planned").

---

## 3. Two solution tiers (decision required)

### Tier 1 (recommended first) — Single-action overnight logging
No schema change. Make it trivial to record/move sleep across midnight in one gesture.

- **Quick "Sleep" preset:** a one-tap log that pre-fills an overnight span (e.g. last night's bedtime → this morning), category = Sleep, as a **single** overnight `time_log` row (`end_time <= start_time`). Verify `QuickLogDialog` accepts and validates overnight ranges (`end <= start` ⇒ overnight, not an error).
- **One-action cross-midnight edit/drag:** dragging or editing the boundary of an overnight log adjusts both "halves" because it's one row. Extend the Week drag work in the main plan (Phase 4) so dragging the morning segment of an overnight log moves the single underlying row (and can shift its `date`).
- **Because logs clip the planned block** (`visibleBlockSegments`), logging actual sleep automatically removes the scheduled-sleep tail on day 11 — satisfying "remove the sleep from day 11 and use it next day" in one logging action.

### Tier 2 (only if Tier 1 is insufficient) — Per-instance block overrides (exceptions)
Schema change: introduce **schedule block exceptions** so a single day can skip/modify a recurring block without touching the template.

- New table `schedule_block_exceptions` (`user_id`, `block_id` FK, `date`, `action` enum `skip|modify`, optional `start_time`/`end_time` override), RLS `auth.uid() = user_id`, guest mirror in `localStore`, migration entry in `migrateGuest`.
- `buildDayCells`/`segmentsForDay` consult exceptions when expanding a block for a given date.
- Heavier: new table, RLS, types regen, guest parity, migration path, and UI to create/clear an exception ("skip just today").

**Recommendation:** Ship **Tier 1** first (no migration, solves the stated workflow via the existing logs-clip-plan behavior). Only pursue **Tier 2** if the user needs to suppress planned blocks *without* logging over them. This doc keeps both so the decision is explicit.

---

## 4. Open decisions (resolve before coding)

| # | Question | Default |
|---|---|---|
| Q1 | Is logging actual sleep (which clips the planned block) enough, or do you need to "skip" a planned block **without** logging? | Assume **Tier 1** is enough; revisit if not. |
| Q2 | Should the "Sleep" preset default to a fixed category named "Sleep", and create it if missing? | Yes — reuse default categories; create on first use if absent. |
| Q3 | Sleep counts as which `type` (`productive`/`unproductive`)? Does it count against tracked time? | Treat as neutral/unproductive by default; confirm with product intent. |
| Q4 | Cross-day drag granularity (15-min snap, same as Day timeline)? | Yes — reuse `SNAP_MIN = 15`. |

---

## 5. Implementation outline (Tier 1)

1. **Verify/strengthen overnight support in `QuickLogDialog`** — overnight (`end <= start`) is valid and saved as one row; add a visible "next day" indicator on the end time.
2. **Add a "Sleep" quick preset** — entry in the Day/Week create menu (`CalendarCreateMenu` from the main plan) that opens the log dialog pre-filled with an overnight span + Sleep category.
3. **Cross-midnight one-action move** — ensure editing/dragging an overnight log mutates the single row (and may change `date`), reusing the extended `updateTimeLog(..., { date? })` from the main plan's Phase 4.
4. **Confirm clip-on-log** — add/verify tests that a logged overnight sleep removes the planned sleep tail from the prior day's free-time math.

---

## 6. Test strategy

> TDD; Vitest for logic/components, Playwright guest lane for the flow (works offline). Cloud lane only if Tier 2's RLS table is built.

### Tier 1

- *Unit (Vitest):*
  - `daySegments.test.ts` / `gaps` — an overnight `time_log` (`end <= start`) clips the planned Sleep block across the midnight boundary; free-window math reflects it on **both** day 11 and day 12.
  - `time.ts` `expandRange` — overnight span attributed to the correct two days (regression guard).
  - `dataStore.test.ts` — `updateTimeLog` moving an overnight log's `date`/times updates one row (cloud) and the right month bucket (guest).
- *Component (Vitest):*
  - `QuickLogDialog.test.tsx` — overnight range is accepted (no "end before start" error), saves a single row, shows the "next day" hint.
  - Create-menu test — "Sleep" preset opens the dialog pre-filled overnight with the Sleep category.
- *E2E (guest):*
  - `sleep.e2e.ts` — seed a recurring Sleep block; log an overnight sleep that differs from the plan in **one** action; assert: (a) one log row spans both days, (b) day 11's planned-sleep tail is replaced by the log, (c) the morning shows on day 12. Reload → persists.

### Tier 2 (only if chosen)

- *Unit:* exception application in `buildDayCells`/`segmentsForDay` (skip + modify); guest `localStore` parity; `migrateGuest` carries exceptions.
- *E2E (cloud):* RLS — a user cannot read/write another user's exceptions; "skip today" hides the planned block for that date only.

---

## 7. Definition of done (Tier 1)

1. A user can record or adjust an overnight sleep that crosses midnight in **one action** (preset + single overnight row).
2. Logging actual sleep removes the planned-sleep tail for that night **without editing the recurring block**.
3. The overnight log appears correctly on Day, Week, and Month (consistent with the main plan's single-source-of-truth work).
4. Vitest + guest e2e cover overnight clipping, single-row persistence, and the one-action flow.
5. No recurring-template mutation is required for a one-night change; guest/cloud parity preserved.

> If, after Tier 1, the user still needs to suppress planned blocks without logging, open a follow-up OpenSpec change for **Tier 2 (block exceptions)** using §3/§6 above.
