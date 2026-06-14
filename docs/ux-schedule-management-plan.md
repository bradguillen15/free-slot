# UX Plan — Schedule Management, Labels & Calendar Polish

**Status:** implemented (2026-06-12) — kept as the design record for these decisions
**Follow-up round:** [ux-schedule-editing-and-labels-plan.md](./ux-schedule-editing-and-labels-plan.md) (2026-06-12)
**Date:** 2026-06-10 (updated same day with user decisions + new feedback)
**Origin:** user feedback — "I already set the initial schedule; if I want to change something I have to do it one by one. I can only add single blocks. Events have no name, just labels — labels should be customizable (breakfast, snacks…). Short blocks render their text wrong."

---

## 1. Problem statement (verified against the code)

| # | Pain | Root cause in code |
|---|---|---|
| P1 | No place to see or edit the whole schedule; every change is one block at a time | The only full-schedule editor is Onboarding step 1 — and `OnboardingGate` redirects completed users away from `/onboarding` permanently. Settings has planner prefs + categories, but no schedule section. |
| P2 | "I can only add single blocks / can't add another recurring time frame" | Creating a block is only reachable via **right-click (desktop) or 500 ms long-press (mobile) on the Day timeline** — an invisible affordance. The prominent + FAB creates one-off *logs*, not blocks. The Week view has **no create path at all** (`ScheduleBlockDialog` there opens only from clicking an existing block). When the hidden path is found, the dialog pre-selects only that single weekday, reinforcing "single time frame". |
| P3 | Mobile navigation is a fixed 4-slot bottom bar with no room to grow | `AppLayout` hardcodes `mobileNavItems` (4 entries, `grid-cols-4`); adding the Schedule page would not fit. |
| P4 | Logged events "have no name", only a label — and labels aren't customizable enough | `time_logs` has no title field; Day/Week views display the **category name** as the event label (`cat?.name ?? l.type`). The notes a user types in QuickLog are stored but **never displayed** on the calendar. Category management is **cloud-only and buried in Settings** (`{user && <Card>…}`) — guests cannot create labels at all, and signed-in users can't create one mid-logging (the QuickLog dialog offers only existing chips). |
| P5 | Short blocks (≤ ~30 min) render two rows of text that overflow | `DayTimeline` `BlockBar`/`LogBar` always render name + a second line ("Planned" / duration). At 30 min a bar is ~28 px tall (56 px/hour) — two 11px+9px text rows don't fit; `overflow-hidden` clips them mid-letter. |
| P6 | Presets exist but are locked inside onboarding | `BLOCK_PRESETS` (Sleep/Work/Gym/…) in `src/lib/schedule.ts` are only offered during onboarding. |

Good news: **no schema change is needed for the core fixes.** `schedule_blocks.days_of_week` already supports arbitrary recurrence, and labels are the existing `categories` table — these are surfacing/IA problems, not data-model problems.

## 2. Decisions (2026-06-10, user-confirmed)

1. **Dedicated `/app/schedule` page** — not a Settings section. (Settings keeps a link card.)
2. **Mobile gets a hamburger menu replacing the bottom bar** — solves nav capacity for Schedule and anything after it.
3. **Recurrence semantics = Google Calendar style:** a recurring block exists until deleted; if you stop it, you recreate it when you need it again. **No pause/resume, no `is_active` migration.** "Duplicate" stays (it makes recreation one click).
4. **Labels = categories, made first-class:** users add their own (breakfast, snacks, …) from wherever they're labeling, including as guests.
5. **Every logged event gets a required `title`.** Category stays as the classification, but the activity itself is named — and recurring blocks keep their (already required) names. Titles are the unit the dashboard will report on.
6. **Label picker becomes a searchable select (combobox)** — with more labels, chips don't scale; users search and can **create a label on the fly** from the same control. Default set stays basic; personal labels carry the rest.
7. **Hamburger menu sits top-RIGHT** in the slim mobile header.

---

## 3. Proposed UX

### A. New "Schedule" page (fixes P1, P6) — DECIDED

Route `/app/schedule`; available to guests (the data layer already supports it). Reuses the proven Onboarding step-1 editor pattern:

```
My schedule                                    [+ Add block ▾]
                                               (preset chips: Sleep · Work · Gym · Commute · Lunch · Dinner · Custom)

┌──────────────────────────────────────────────────────────────┐
│ ▍Work        09:00 → 17:00   [M][T][W][T][F][ ][ ]  ⧉  🗑    │
│ ▍Sleep       23:00 → 07:00   [M][T][W][T][F][S][S]  ⧉  🗑    │
│ ▍Gym         18:00 → 19:00   [M][ ][W][ ][F][ ][ ]  ⧉  🗑    │
└──────────────────────────────────────────────────────────────┘
  name + times + day chips editable INLINE per row (like onboarding)
  ⧉ = duplicate (pre-filled dialog — also the "recreate a stopped block" path)
  🗑 = delete = stop the recurrence (Google Calendar semantics, confirm dialog)

Mini week strip at the bottom rendering the blocks so the user sees
the effect of edits immediately (reuse the WeekGrid block layer).
```

### B. Make block creation discoverable everywhere (fixes P2)

1. **Split the FAB** on the Day view: + opens a 2-option sheet — "Log time" / "Add schedule block". (Right-click/long-press stays as a power shortcut.)
2. **Week view header** gets "+ Block"; clicking an empty week-grid slot offers "Log time here / Add block here".
3. **New blocks default to Weekdays** preselected, not the single day that was clicked.
4. **Settings** gets a "Manage schedule" link card to `/app/schedule`.

### C. Mobile navigation → hamburger menu (fixes P3) — DECIDED

Replace the fixed bottom bar in `AppLayout` with a slim mobile header: FreeSlot logo left/center, **hamburger button top-right** opening a sheet/drawer (shadcn `Sheet` is already vendored) sliding in from the right: full nav list (Day/Week/Month/Schedule/Activities/Dashboard/Settings), language switcher, sign in/out — i.e., the desktop sidebar content. Lock icons for guest-restricted entries carry over. The Day-view FAB remains the primary quick action so logging stays one tap.

### D. Titles + labels made first-class (fixes P4) — DECIDED

1. **Required `title` on logged events.** Migration: `ALTER TABLE time_logs ADD COLUMN title text;` backfill existing rows from the category name, then enforce required in the UI (QuickLogDialog gets a Title input as the first field). Mirror in `localStore.LocalTimeLog` and map it in `migrateGuest`. Calendar views display the title (category keeps providing color + classification); `notes` stays as optional free text. AI-accepted slots set `title = activity_name`. **Dashboard payoff:** reporting can aggregate by title/activity instead of today's category-name guessing — this also dissolves the open review finding that "AI plan vs logged" matches planned *activity names* against actual *category names*.
2. **Label picker → searchable combobox** in QuickLogDialog and ScheduleBlockDialog (the vendored `cmdk`/`Command` component finally earns its keep): type to filter, `Enter` to pick, and a **"Create '<query>'" row** that creates the label (name, color, productive/unproductive) without leaving the dialog. Replaces the chip rows, which don't scale past ~10 labels.
3. **Guest parity:** add `upsertCategory`/`deleteCategory` to `dataStore` with a localStore branch (also closes the open review finding that SettingsPage does raw cloud-only category CRUD with a hand-rolled optimistic overlay — route it through the new mutations).
4. **Default label set stays basic:** existing 9 + **Meals** + **Chores/Errands** (signup trigger migration + `localStore.DEFAULT_CATEGORIES`, kept in sync by name for `migrateGuest` mapping). Everything beyond basics is personal, created on the fly via the combobox.

### E. Short-block rendering fix (fixes P5) — quick win, can ship immediately

In `DayTimeline` (`BlockBar`/`LogBar`) and the Week grid: below a height threshold (~36 px ≈ 40 min), collapse to a **single line** — `"{name} · {duration}"` truncated, sublabel hidden, reduced padding (`py-0`), smaller font. The full info stays available via the existing click-to-edit and `title` tooltip. This is a bug-class fix and may ship outside the phases below.

### F. Per-day exceptions — PROMOTED to a designed phase (2026-06-10 user signal)

User hit both motivating cases: "gym at a different schedule on one specific day" and "one day I worked a couple hours more — how do I reflect that without changing the recurring event everywhere?".

**F1. Clarify plan vs actual at the click point (cheap, ships with Phase 2).**
The second case is already solved by the data model — blocks are the *plan*, `time_logs` are the *actual*, and the dashboard counts only logs — but the UI hides this: clicking a block occurrence opens the TEMPLATE editor (changing all days), with no path to "log what actually happened here". Fix: clicking a block occurrence on Day/Week opens a small chooser — **"Log time here" (pre-filled with the block's times and label, editable — the worked-2h-more case) / "Edit schedule block…"**. This both teaches the model and removes the all-days editing trap as the default action.

**F2. Occurrence overrides, Google Calendar style (the real exceptions feature).**

- Schema: new table + localStore mirror
  ```sql
  CREATE TABLE public.block_exceptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    block_id uuid NOT NULL REFERENCES public.schedule_blocks ON DELETE CASCADE,
    date date NOT NULL,
    skipped boolean NOT NULL DEFAULT false,   -- true → occurrence removed that day
    start_time time,                          -- non-null → retimed occurrence
    end_time time,
    UNIQUE (block_id, date)
  );
  -- RLS: owner policy like every other table
  ```
- Editing: when saving/deleting from a specific day, the dialog asks **"Only this day" / "All days"** (skip Google's "this and following" — that's effective-dating, not needed yet). "Only this day" writes a `block_exceptions` row; "All days" edits the template as today.
- Merge logic: occurrence resolution becomes **date-aware, not just weekday-aware** — `blocksOnDate(blocks, exceptions, dateISO)` in `src/lib/gaps.ts` (wrapping the existing `blocksOnDay`, applying skip/retime, preserving the overnight next-morning attribution). Day/Week views and `findFreeWindows` consume occurrences by date. This is the bulk of the work — TDD it next to the existing gaps tests.
- Surfacing: overridden occurrences render with a subtle marker (e.g. dashed left border); the Schedule page lists a block's exceptions with a "reset to recurring" action; the AI planner sees exception-adjusted free windows automatically because it consumes `findFreeWindows`.

---

### G. Export to Google Calendar (2026-06-10 user question) — backlog, ICS first

Three escalation levels; start at the bottom and only climb on demand:

1. **ICS file export (recommended first):** client-side generated `.ics` download ("Export to calendar" in Settings/Dashboard). `time_logs` → plain `VEVENT`s (title from Phase 4, category in description); `schedule_blocks` → recurring `VEVENT`s with `RRULE:FREQ=WEEKLY;BYDAY=…` mapped from `days_of_week` (overnight = DTEND next day). No OAuth, no server, guest-compatible. Snapshot semantics (re-export to refresh). Size: S.
2. **ICS subscription feed:** edge function serving per-user ICS at a secret-token URL; user subscribes in Google Calendar ("From URL") → stays current via Google's polling (hours of lag, read-only). Size: M.
3. **Google Calendar API sync:** OAuth app with the sensitive `calendar.events` scope → Google verification process, token storage/refresh in Supabase, ongoing maintenance. **Deferred unless users ask for live sync after having 1–2.**

## 4. Phasing & execution status

| Phase | Scope | Status |
|---|---|---|
| 0 | **Quick win:** short-block one-line rendering (E) | ✅ done 2026-06-10 — DayTimeline bars, WeekGrid gap markers, and AI chips collapse to one line below ~36px/30px; full info stays in the tooltip |
| 1 | `/app/schedule` page (A): inline-edit list, add-with-presets, duplicate, delete-with-confirm; desktop nav entry; Settings link card; guest + cloud | ✅ done 2026-06-10 — incl. mini week preview with overnight attribution and 4 component tests |
| 2 | Discoverability (B) + plan-vs-actual chooser (F1) | ✅ done 2026-06-10 — split FAB (Log time / Add block), Week "+ Block" header button, new blocks default to Weekdays, BlockActionChooser on block click in Day + Week. *Consciously trimmed:* empty-slot click still quick-logs directly (most common action); block creation has dedicated buttons instead |
| 3 | Mobile hamburger menu (C) | ✅ done 2026-06-10 — bottom bar removed; slim mobile header (logo left, hamburger top-RIGHT) with right-side Sheet: full nav incl. Schedule, language switcher, sign in/out |
| 4 | Titles + labels first-class (D) | ✅ done 2026-06-10 — `time_logs.title` migration + backfill (20260610120000), required Title in QuickLog, title displayed in Day/Week, AI slots titled by activity, CategoryPicker combobox (cmdk) with on-the-fly creation in BOTH dialogs, `upsertCategory`/`deleteCategory` in dataStore with guest parity, SettingsPage routed through them, Meals + Chores & errands added to defaults (trigger migration 20260610121000) |
| 5 | Per-day exceptions (F2): `block_exceptions` migration + localStore mirror, "Only this day / All days" scope chooser, date-aware occurrence resolution in gaps.ts + views, exception markers + reset on Schedule page | ⏳ NEXT SESSION — L-sized, deserves a fresh start. Entry points (BlockActionChooser, Schedule page) are now in place |
| 6 | ICS export (G1) | 💤 backlog by user decision — idea, not required for MVP |

**Verification 2026-06-10:** 104/104 tests (5 new), tsc clean, lint 0 errors, build passes.

**Deployment checklist (cloud only — guest mode works immediately):**
1. Apply migrations `20260610120000_add_time_log_title.sql` and `20260610121000_add_default_categories.sql` (`supabase db push`). The title column MUST exist before deploying the frontend, or cloud log saves will fail.
2. Edge functions changed earlier (`generate-weekly-plan`, `weekly-review`) still need `supabase functions deploy`.
3. Commit `pnpm-lock.yaml` so CI's `--frozen-lockfile` install works.

Implementation notes:
- Follow the OpenSpec flow (`opsx:new` → `opsx:ff` → apply → verify) per CLAUDE.md; planning steps require Opus high reasoning (CLAUDE.md §5).
- TDD per CLAUDE.md: Phase 1 page gets component tests (inline-save, guest persistence — follow the existing `PriorityRanker.test.tsx` pattern); Phase 4's dataStore category mutations get adapter tests next to `dataStore.test.ts`; Phase 0's height-threshold logic is a pure function — test it.
- Reuse, don't fork: `BLOCK_PRESETS`/`DAYS` from `src/lib/schedule.ts`, `ScheduleBlockDialog`, `dataStore` mutations, vendored `Sheet`. No new day-name constants (open review finding).
- All new strings through i18n (en + es) — don't grow the hardcoded-English debt (open High finding). The hamburger menu (Phase 3) is a good moment to also fix the hardcoded `ViewSwitcher` labels.
- Phase 4's default-category addition touches the signup trigger → needs a new SQL migration; keep `localStore.DEFAULT_CATEGORIES` in sync (they must match by name for `migrateGuest` mapping).

## 5. Open questions

None — all decisions resolved 2026-06-10 (see section 2). Ready to start with Phase 0 (rendering quick win) or Phase 1 (`/app/schedule`) via `opsx:new`.
