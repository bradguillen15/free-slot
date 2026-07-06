## Context

`src/lib/confirmDay.ts` (`buildConfirmDayRows`) currently matches a schedule block to a confirm-date `D` solely via `block.days_of_week.includes(weekday(D))` — i.e. it only ever considers the day a block is configured to **start**. For an overnight block (`end_time < start_time`, e.g. Sleep 23:00–07:00), `hasBlockElapsed` unconditionally returns `false` whenever `now` is provided, so that block can never be confirmed via its start-day match while "now" is meaningful (i.e. while confirming today). The only way an overnight block currently gets logged is by confirming a **past** date directly (`now` omitted), which materializes it immediately, dated as that start day — this existing past-date path is correct and stays untouched.

The caller-side infrastructure already has what's needed for a fix: `CalendarPage` (`src/pages/CalendarPage/index.tsx:74`) already fetches logs for `[date-1, date]` via `useTimeLogsInRange(addDaysISO(date, -1), date)` (needed today for rendering an overnight block's tail correctly in the Day timeline), and `WeekPage` already fetches `[weekStart-1, weekEnd]`. Both already have the previous day's logs in hand — they just aren't given the previous day's *blocks*, and `buildConfirmDayRows` doesn't know to look for them.

`docs/data-model` convention (confirmed via `e2e/time-logging.e2e.ts`) is that an overnight log is always dated by its **start** day (e.g. a manually-logged 23:00–07:00 entry made while viewing "today" is stored dated *yesterday*). This change must produce logs consistent with that convention — it does not change how overnight logs are dated, only which day's Confirm action can surface and materialize them.

## Goals / Non-Goals

**Goals:**
- Confirming date `D` recognizes an overnight block whose scheduled start day is `D-1` as a distinct, separately-confirmable instance — "last night's sleep, now that it's over" — evaluated for elapsed-ness against `end_time` on `D`'s timeline, and logged dated `D-1` (start day), consistent with existing overnight date convention.
- Confirming date `D`'s own start-day instance of an overnight block keeps its exact current behavior (never elapsed while `now` is provided; immediately elapsed when `now` is omitted for a past-date confirm).
- Add a Confirm Day action to Week view, scoped to "today" only, reusing this fixed logic.
- Remove the Inbox toggle/panel from Week view.

**Non-Goals:**
- No change to how manually-created (non-schedule-derived) logs are dated — that convention is already correct and used as the target to match.
- No change to `src/lib/gaps.ts` (`blocksOnDay`) or `src/lib/plannedMinutes.ts` — both already split an overnight block's minutes across the two calendar days it spans for rendering/charting purposes, which is a different (and already correct) per-day attribution model from confirm-day's single-row-per-instance model.
- No confirm-from-Week-view for days other than "today" — that's a larger UI question (per-day confirm affordances in a grid) deferred to a future change if wanted.
- No change to the Inbox feature itself — only its placement on Week view.

## Decisions

**1. Instance-based matching, not single weekday matching.** Replace the single `active = blocks.filter(...)` step with a `blockInstancesForDate(blocks, date)` helper (exported from `confirmDay.ts`, reused by `ConfirmDayButton`'s "how many blocks are relevant" count) that returns a list of `{ block, date: instanceDate }` pairs:
   - Every block matching `days_of_week.includes(weekday(D))` → one instance dated `D` (the existing same-day-start case; unchanged handling downstream).
   - Additionally, every **overnight** block matching `days_of_week.includes(weekday(D-1))` → one instance dated `D-1` (the new "tail" case).
   - A block active every day produces *two* distinct instances when confirming any given date (its own start-day instance, dated `D`, and the previous night's tail instance, dated `D-1`) — these are two genuinely different real-world sleep sessions, not a duplicate.
   - *Alternative considered*: shift the overnight block's canonical date to always be the end day. Rejected — it would contradict the existing manual-quick-log convention (logs dated by start day) and require a data-model-wide change instead of a confirm-day-scoped one.

**2. Elapsed check depends on which instance.** For a `D`-dated (same-day-start) instance, keep `hasBlockElapsed` exactly as-is (overnight ⇒ always not-elapsed while `now` given; non-overnight ⇒ `end <= now`). For a `D-1`-dated (tail) instance, elapsed is a plain comparison of the block's `end_time` against `now` (no overnight special-case needed — by construction, the tail instance's end always falls within `D`'s daytime): `now === undefined || block.end_time.slice(0,5) <= now.slice(0,5)`.

**3. Overlap/idempotency checks use the instance's own date.** `visibleBlockSegments(block, existingLogs, instanceDate)` already filters `existingLogs` by the `dayISO` parameter internally — passing the tail instance's `instanceDate` (`D-1`) instead of the outer confirm date makes the existing overlap-detection machinery "just work" for idempotency, **provided** the caller supplies logs spanning `[D-1, D]`. Both `CalendarPage` and `WeekPage` already fetch that range for other reasons, so no new data fetching is needed — only widening the `blocks` prop passed to `ConfirmDayButton` from "blocks active on `D`'s weekday" to the full block list (letting `blockInstancesForDate` do the weekday/prevWeekday filtering itself).

**4. `ConfirmDayButton` gets the unfiltered block list.** `CalendarPage` currently pre-filters `blocks` to `D`'s weekday before passing to both `DayTimeline` (correct — the timeline should only show what's scheduled *that* day) and `ConfirmDayButton` (incorrect after this change — it now needs the full list to find `D-1` tail candidates). Pass `allBlocks` (already fetched, unfiltered) to `ConfirmDayButton` instead of the day-filtered `blocks`; leave `DayTimeline`'s prop unchanged.

**5. Week view Confirm Day is scoped to "today" only.** `WeekPage` already fetches `blocks` (full, unfiltered) and `logs` spanning `[weekStart-1, weekEnd]` — a superset of what `ConfirmDayButton` needs for today (`[today-1, today]`), so it can be dropped in directly, shown only when `today` falls within the displayed week (`weekStart <= today <= weekEnd`), positioned in the header actions row next to `CalendarNav`.

**6. Inbox removal is a pure deletion.** Remove the `Inbox` import, `inboxOpen` state, the toggle `<button>`, the `AnimatePresence`/`InboxPanel` block, and the now-unused `useInboxItems` query from `WeekPage.tsx`. No replacement UI.

## Risks / Trade-offs

- **A block active every day now produces two rows per confirm instead of one** → Intentional and correct (two distinct nights), but changes existing test expectations in `confirmDay.test.ts` for cases that used a `days_of_week: [0,1,2,3,4,5,6]` fixture without meaning to exercise the tail path. Existing tests are updated to scope their fixtures to the specific weekday(s) they intend to test, plus new tests cover the tail path explicitly.
- **`ConfirmDayButton`'s "nothing scheduled" vs "not elapsed yet" empty states must stay accurate** with the new instance-counting rule → mitigated by having both the row-building and the count-of-relevant-blocks use the same `blockInstancesForDate` helper, so they can't drift apart.
- **Removing the day-filter on `ConfirmDayButton`'s `blocks` prop could regress if some other logic implicitly relied on it being pre-filtered** → checked: `ConfirmDayButton` and `confirmDay.ts` do their own weekday filtering already (that's the bug being fixed), so passing the unfiltered list is exactly what's needed, not a behavior change for non-overnight blocks (they still only match `D`'s own weekday).

## Migration Plan

Frontend-only, single PR, no backend/schema changes. No feature flag — this is a straightforward logic correction plus two small UI changes, verified by unit tests (updated + new) and guest E2E before merge.
