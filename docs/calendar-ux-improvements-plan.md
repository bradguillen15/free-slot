# Tech Plan — Calendar UX Improvements (Day / Week / Month)

**Status:** proposed
**Date:** 2026-06-14
**Origin:** user-reported issues after using the app — view inconsistencies, crowded month view, migration first-render gap, and a request to treat **time logs as the single source of truth** rendered consistently (and draggable) across Day, Week, and Month.
**Related:** [ARCHITECTURE.md](./ARCHITECTURE.md) (guest/cloud abstraction), [frontend-standards.md](./frontend-standards.md) (Data Access Rules), [testing-plan.md](./testing-plan.md), [resources-layer-plan.md](./resources-layer-plan.md). **Split out:** issue #1 (overnight/sleep adjustment) lives in [sleep-overnight-logging-plan.md](./sleep-overnight-logging-plan.md) — it needs its own data-model decision.

---

## 0. Scope

This plan covers **7 of the 8** reported issues. The remaining one (sleep / overnight adjustment) is heavier (touches the data model) and is planned separately.

| # | Issue (user words) | Interpretation | Group |
|---|---|---|---|
| 2 | "the button for creating an event on weekly should be the same as in the day" | Week view uses an inline header "Add block" button; Day uses a split FAB ("Log time" / "Add block"). Unify the create affordance. | A — Consistency |
| 3 | "buttons for navigation on the week should be 'Today < >' in that order" | Standardize nav across all views: a **Today** button, then **‹** / **›**, in that order, with consistent labels. | A — Consistency |
| 4 | "monthly should show the schedule somehow, seems empty" | Month cells show only a log-intensity wash + 6h quick-log buttons; no schedule blocks or actual logs are visible. | B — Month |
| 5 | "Monthly device view is too crowded" | On mobile the 4 quarter-buttons per cell + labels overflow. | B — Month |
| 6 | "first migration didn't show data on first render, refresh fixed it" | After `migrateGuestToCloud`, React Query cache for the now-cloud user isn't invalidated, so the first render shows stale/empty data. | D — Migration |
| 7 | "drag and drop the activities [logs] on the views to reschedule" | Day timeline already supports log drag-reschedule; Week (and ideally Month) do not. | C — Single source of truth |
| 8 | "activities [logs] added to the week should also appear on month and day — one source of truth, different views" | Logs are the source of truth; render them consistently in all three views (Month currently shows only an aggregate heatmap). | C — Single source of truth |

> **Terminology note (confirmed with user):** "activities" in issues #7/#8 means **time logs** — the things you register that should appear across views — not the Activities-page target entities (`activities` table). This plan uses "log" throughout.

---

## 1. Current state (verified against code)

| Concern | Day (`CalendarPage`) | Week (`WeekPage` + `WeekGrid`) | Month (`MonthPage`) |
|---|---|---|---|
| Create affordance | Split FAB dropdown: **Log time** / **Add block** (`data-testid="day-fab"`) | Inline header button **Add block** only | None (cells open quick-log on click) |
| Nav buttons | `‹` · **Today** · `›` (label "Today") | `‹` · **This week** · `›` | `‹` · **This month** · `›` |
| Shows blocks | ✅ `DayTimeline` | ✅ `WeekGrid` | ❌ |
| Shows logs | ✅ `DayTimeline` | ✅ `WeekGrid` | ❌ (only per-day total + intensity wash) |
| Drag to reschedule | ✅ `onLogReschedule` → `updateTimeLog` | ❌ click-only | ❌ |
| Data source | `useTimeLogsInRange`, `useScheduleBlocks` | same | `useTimeLogsInRange` only |

**Key existing building blocks to reuse (do not reinvent):**

- `useTimeLogsInRange(startISO, endISO)`, `useScheduleBlocks()`, `useVisibleCategories()` — the mode-aware dataStore hooks (`src/lib/dataStore.ts`).
- `updateTimeLog(mode, userId, id, patch)` — the reschedule mutation already used by Day.
- `expandRange` / `toMin` / `fromMin` (`src/lib/time.ts`), `segmentsForDay` / `visibleBlockSegments` (`src/lib/daySegments.ts`) — overnight-aware segment math.
- `findFreeWindows` / `totalFreeMinutes` (`src/lib/gaps.ts`).
- `WeekGrid`'s `DayCellData` shape and the Day↔Week column rendering — the Month "schedule" rendering should mirror this at smaller scale.

---

## 2. Design decisions

### D1 — Extract a shared `useCalendarData(rangeStart, rangeEnd)` hook
Day, Week, and Month each independently fetch + assemble blocks/logs/categories into render segments, with subtle drift (e.g. Month ignores blocks; Week recomputes catMap). To make logs a **single source of truth**, extract the assembly that turns `{blocks, logs, categories, profile}` into per-day `DayCellData` (already defined in `WeekGrid`) into one reusable place: `src/lib/calendarDays.ts` (pure) + a thin `useCalendarDays(startISO, endISO)` hook over the existing dataStore hooks.

- Pure builder `buildDayCells({ days, blocks, logs, categories, profile, aiPlan? })` → `DayCellData[]`. (Lift the existing `WeekPage` `dayCells` memo verbatim, then have WeekPage consume it.)
- Month and Day consume the same builder, choosing how much of each cell to render.
- **Benefit:** one code path → logs/blocks render identically everywhere; fixes #8 structurally and de-risks #4 and #7.

### D2 — Shared `CalendarNav` component (fixes #3, partially #2)
A single presentational component:

```
[ Today ] [ ‹ ] [ › ]
```

Props: `onToday`, `onPrev`, `onNext`, `todayLabel` (default "Today"), plus `aria-label`s. Replaces the three bespoke button clusters. Order is **Today, prev, next** per the user's request. Keep the word **Today** in all three views (drop "This week"/"This month") for consistency.

### D3 — Shared create affordance (fixes #2)
Promote the Day view's split FAB into a reusable `CalendarCreateMenu` (Log time / Add block) and mount it on Week (and optionally Month). Keep `data-testid="day-fab"` semantics generalized to `calendar-fab` with per-view ids (`week-fab`, `day-fab`, `month-fab`) so existing Day e2e selectors get an alias, not a break.

### D4 — Month shows real content (fixes #4, #5)
Replace the 4 fixed "6-hour" quick-log buttons with a compact, **data-driven** cell:
- A thin stacked **mini day-bar** (24h compressed) showing schedule blocks + logs as colored ticks (reuse colors from `buildDayCells`), so the month reflects the actual schedule/logs — not an abstract wash.
- Responsive: on small screens collapse to **day number + a single intensity dot/bar + total**; the full mini-bar shows from `sm:` up. Quick-log moves to: tap the cell → opens day view (or a quick-log sheet) instead of four tiny buttons. This declutters mobile (#5) while making the month informative (#4).

### D5 — Week (and Month) drag-to-reschedule (fixes #7)
Add log drag-reschedule to `WeekGrid`, mirroring `DayTimeline`'s pointer-based approach (long-press/drag, 15-min snap, `onLogReschedule(logId, newStartMin, newEndMin)`), but **also support changing the day** (horizontal axis): `onLogReschedule(logId, newDate, newStartMin, newEndMin)`. Wire to the existing `updateTimeLog` mutation (extended to accept a new `date`). Month drag is **out of scope for v1** (cells too small); revisit after Week ships. Reuse the existing pointer/snipping logic from `DayTimeline` rather than introducing `@dnd-kit` here (dnd-kit is used for ranking lists, not time grids).

### D6 — Invalidate cache after migration (fixes #6)
`migrateGuestToCloud` writes directly to Supabase but never tells React Query that the active (now-cloud) user's keys changed, so the first post-migration render serves empty/guest cache. Fix at the call site (`Auth.tsx` `importNow`) and/or in dataStore: after a successful migrate, `queryClient.invalidateQueries({ queryKey: queryKeys.root })` (or the specific cloud keys for the new `userId`). Also gate navigation on completion so the first `/app` render has fresh data. This aligns with the React Query architecture already adopted.

---

## 3. Work breakdown & sequencing

Each group is independently shippable. Recommended order maximizes reuse (D1 first unlocks C and B).

| Phase | Group | Issues | Depends on | Size |
|---|---|---|---|---|
| 1 | D — Migration cache fix | 6 | — | S |
| 2 | A — Nav + create consistency | 2, 3 | — | S |
| 3 | (foundation) `buildDayCells` + `useCalendarDays` extraction | (7,8 enabler) | — | M |
| 4 | C — Logs as single source of truth + Week DnD | 7, 8 | Phase 3 | M |
| 5 | B — Month shows schedule + responsive declutter | 4, 5 | Phase 3 | M |

Phases 1 and 2 can land immediately (no dependency). Phase 3 is the foundation refactor; 4 and 5 build on it.

---

## 4. Per-issue detail + test strategy

> Testing follows [testing-plan.md](./testing-plan.md): **Vitest** for pure logic + component behavior (mock dataStore/`supabase`), **Playwright guest lane** (`e2e/*.e2e.ts`) for UI flows that work offline, **cloud lane** (`e2e/cloud/*.cloud.e2e.ts`) only where real auth/DB is required (e.g. migration). TDD: write the failing test first.

### Phase 1 — Migration cache fix (#6) — ✅ implemented (OpenSpec change `calendar-migration-cache-fix`)

**Change:** After `migrateGuestToCloud` resolves in `Auth.tsx::importNow`, invalidate React Query and await a refetch before `navigate("/app")`. Prefer invalidating `queryKeys.root` for the new cloud `userId`.

**Tests:**
- *Unit (Vitest):* extend `migrateGuest.test.ts` — assert (with a spy/mock `queryClient`) that invalidation is invoked after a successful migrate and **not** on failure (guest data preserved path).
- *Component (Vitest):* `Auth` test — mock `migrateGuestToCloud` to resolve; assert navigation happens after invalidation, and a loading state is shown while migrating.
- *E2E (cloud lane):* new `migration.cloud.e2e.ts` case — seed guest data, sign up, click "Import", assert the Day/Week view shows the migrated logs **without a manual reload**. (Extends the existing migration cloud spec.)

**Acceptance:** first post-migration render shows migrated data; no reload needed.

### Phase 2 — Nav + create consistency (#2, #3) — ✅ implemented (OpenSpec change `calendar-nav-create-consistency`)

**Changes:**
- Add `src/components/calendar/CalendarNav.tsx` (`Today`, `‹`, `›` order) and replace the clusters in `CalendarPage`, `WeekPage`, `MonthPage`.
- Add `src/components/calendar/CalendarCreateMenu.tsx` (extract Day's split FAB) and mount on Week; keep Day working.

**Tests:**
- *Component (Vitest):* `CalendarNav.test.tsx` — renders buttons in order Today, prev, next; fires the right callbacks; `aria-label`s present. `CalendarCreateMenu.test.tsx` — "Log time" and "Add block" items fire their handlers.
- *E2E (guest):* update `WeekPage`/`CalendarPage` specs — Week now exposes a create menu with the same items as Day; nav buttons present with stable test-ids (`calendar-today`, `calendar-prev`, `calendar-next`).

**Acceptance:** all three views share identical nav order/labels; Week create UX matches Day.

### Phase 3 — `buildDayCells` extraction (foundation for #7, #8, #4)

**Changes:**
- New pure module `src/lib/calendarDays.ts`: `buildDayCells(input): DayCellData[]` (move `DayCellData`/`DayCellBlock`/`DayCellLog` types here or re-export from `WeekGrid`).
- New hook `src/lib/dataStore.ts` (or `src/hooks/useCalendarDays.ts`): `useCalendarDays(startISO, endISO)` wrapping the existing dataStore hooks + `buildDayCells`.
- Refactor `WeekPage` to consume it (no visual change — pure refactor, guarded by existing tests).

**Tests:**
- *Unit (Vitest):* `calendarDays.test.ts` — overnight logs/blocks attributed to correct day (reuse `expandRange` cases), gaps computed, peak flag, AI slots passthrough. This is the highest-value test (pure, deterministic).
- *Regression:* existing `WeekGrid.test.tsx` and WeekPage behavior stay green.

**Acceptance:** Week renders identically; one tested builder now feeds all views.

### Phase 4 — Logs single source of truth + Week DnD (#7, #8)

**Changes:**
- Extend `updateTimeLog` to accept an optional new `date` (cross-day reschedule); guest + cloud parity in `dataStore`/`localStore`.
- Add pointer drag to `WeekGrid` logs → `onLogReschedule(logId, newDate, newStartMin, newEndMin)` (15-min snap; horizontal = day, vertical = time). Mirror `DayTimeline`'s long-press + cancel-threshold logic.
- Wire `WeekPage` handler to `updateTimeLog` + `refreshLogs` (same pattern as `CalendarPage::handleLogReschedule`), including the "assign a category before dragging" guard.

**Tests:**
- *Unit (Vitest):* `dataStore.test.ts` — `updateTimeLog` with a new `date` updates the row (cloud) and moves the log across month buckets (guest `localStore`).
- *Component (Vitest):* `WeekGrid.test.tsx` — simulate a drag gesture on a log; assert `onLogReschedule` called with snapped time **and** new date; assert category-less log is blocked with a toast.
- *E2E (guest):* `week.e2e.ts` — seed a guest log, drag it to another day/time, assert it persists (read back via `readGuest*`) and renders in the new cell; reload page → still there (source-of-truth check).
- *Cross-view (guest e2e):* create a log in Week, navigate to Day and Month for that date, assert it appears in all three (issue #8 acceptance).

**Acceptance:** a log created/edited in any view appears in all views; logs are draggable in Week with persistence.

### Phase 5 — Month shows schedule + responsive declutter (#4, #5)

**Changes:**
- `MonthPage` consumes `useCalendarDays(firstISO, lastISO)`; each cell renders a compact mini day-bar (blocks + logs as colored segments) from `DayCellData`.
- Responsive: full mini-bar `sm:`+; on mobile show day number + intensity bar + total only. Replace the 4 quarter-buttons with whole-cell tap → day view (or a quick-log sheet).
- Keep the month stat cards.

**Tests:**
- *Component (Vitest):* `MonthPage.test.tsx` (new) — given seeded blocks+logs, a day cell renders block/log segments with category colors; today cell highlighted; empty days render an empty (not crowded) cell.
- *Responsive (component):* assert the mobile-collapsed layout hides the mini-bar at the small breakpoint (class-based assertion) — or a Playwright viewport check.
- *E2E (guest):* `month.e2e.ts` (new) — seed schedule + logs, open Month, assert schedule/logs visible; set mobile viewport, assert cells aren't overflowing (no horizontal scroll / quarter-button clutter).

**Acceptance:** Month visibly reflects schedule + logs; mobile month view is uncluttered.

---

## 5. Data / API impact

| Change | Surface | Notes |
|---|---|---|
| `updateTimeLog` gains optional `date` | `dataStore.ts` (cloud), `localStore.ts` (guest move across month buckets) | Backwards compatible; no migration needed (column exists). |
| Cache invalidation after migrate | `Auth.tsx` / `dataStore.ts` | No schema change. |
| Everything else | Frontend only | No DB migration. |

**Guest/cloud parity:** every behavior added (cross-day reschedule especially) must work in both modes per [ARCHITECTURE.md](./ARCHITECTURE.md) and be covered by the mocked-supabase + localStorage test seams.

> If the [resources-layer-plan.md](./resources-layer-plan.md) refactor lands first, new I/O (e.g. `updateTimeLog` date support) should go through `resources` rather than inline `supabase`. These plans are compatible; sequence resources Phase 1 before this plan's Phase 4 if both are active.

---

## 6. Out of scope / follow-ups

- Issue #1 (overnight/sleep adjustment) — see [sleep-overnight-logging-plan.md](./sleep-overnight-logging-plan.md).
- Month drag-to-reschedule (revisit after Week DnD).
- Reschedule of **schedule blocks** by drag (this plan only drags **logs**; blocks remain edited via the dialog).
- Touch-gesture polish beyond parity with the current Day timeline.

---

## 7. Definition of done

1. All three views share `CalendarNav` (Today, ‹, ›) and a consistent create menu.
2. A log created/edited/dragged in any view is reflected in the other two (one builder, one source of truth).
3. Month visibly shows schedule + logs and is uncluttered on mobile.
4. Post-migration first render shows migrated data with no reload.
5. New + existing Vitest suites green; guest e2e covers Week DnD + cross-view visibility + month; cloud e2e covers migration refresh.
6. No direct `supabase.from(...)` added to pages/components (ESLint clean); guest/cloud parity preserved.
