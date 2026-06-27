## Context

Times are stored as 24-hour `HH:MM` strings (`TimeLog`, `ScheduleBlock`, profile `peak_hours`). The app currently mixes native time inputs (browser popup) with `fmtTimeLabel` (always 12h) on timeline axes. Profile preferences (`include_weekends`, `weekly_review_day`) already follow guest/cloud parity via `LocalProfile` + Supabase `profiles` table.

## Goals / Non-Goals

**Goals:**
- Themed time picker matching shadcn dark UI
- Single Settings preference toggling display format app-wide
- Internal storage unchanged (`HH:MM` only)
- Guest and cloud users both persist the preference

**Non-Goals:**
- Changing date pickers or timezone handling
- Per-field format overrides (global preference only)
- New npm dependencies

## Decisions

### 1. Profile field for format preference

Add `time_format: "12h" | "24h"` to `LocalProfile`, default `"24h"`. Supabase migration: `ALTER TABLE profiles ADD COLUMN time_format text NOT NULL DEFAULT '24h' CHECK (time_format IN ('12h', '24h'))`.

**Alternative considered:** localStorage-only — rejected because cloud users expect Settings to sync.

### 2. `useTimeFormat` hook

Thin wrapper over `useProfile()` returning `{ format, setFormat }`. Components call `fmtDisplayTime(hhmm, format)` for labels/tooltips. Avoid React Context unless prop-drilling becomes painful (timeline + grid + month + dialogs — hook is sufficient).

### 3. TimeInput component

Location: `src/components/ui/time-input.tsx`.

- Controlled: `value: string` (`HH:MM`), `onChange: (hhmm: string) => void`
- Trigger: an editable text field (styled like `Input`) with a clock icon. The user can type directly (`HH:MM` in 24h mode; `h:mm AM/PM` in 12h mode) and commit on blur/Enter; invalid input reverts to the last valid value. Clicking the field opens the panel. The field follows the selected time format and always includes minutes (`9:00 AM`, not `9 AM`). Typing is parsed by `parseTimeInput` in `time.ts` and does not emit partial changes before commit.
- Panel: an **in-flow, absolutely-positioned panel** anchored under the field (NOT a portaled Radix `Popover`). A portaled popover renders outside the dialog, where the dialog's `react-remove-scroll` lock can block wheel/touch scrolling and its focus-trap can block typing; and the dialog's `transform` can mis-position a `position: fixed` popper. The component therefore renders the panel within its own DOM subtree and handles outside-click + `Escape` (with `stopPropagation` so `Escape` doesn't also close the dialog).
- The panel uses two scroll-snap **wheels** for hours and minutes. The implementation stays small: React `onScroll` handlers debounce the centered row commit, selected rows are centered on open with `scrollIntoView`, and there are no native document scroll listeners, programmatic-scroll flags, or timestamp guards. Clicking a row also selects it. Minutes use 5-minute steps (matches slot snapping granularity); an off-step current minute is included so existing values remain selectable and visibly selected.
- 12h mode: hour wheel shows 1–12 and a full-width **AM/PM segmented toggle sits below the wheels**. The active segment uses the primary (blue) fill. Still emits `HH:MM`.
- `data-testid` prop forwarded to the editable field for E2E compatibility (`page.fill()` types straight into it).

**Alternative considered (and rejected):** a portaled Radix `Popover` — breaks inside the log dialog (scroll-lock, focus-trap, transformed containing block), so an in-flow anchored panel is used instead. **Alternative considered (and rejected):** button grids — simpler, but they remove the wheel interaction the feature is meant to provide. **Alternative considered:** dual `<Select>` dropdowns — acceptable fallback but less polished.

### 4. Display migration

Replace direct `fmtTimeLabel` and raw `fromMin` in user-visible strings with `fmtDisplayTime(fromMin(min), format)` via `useTimeFormat`. Keep `fromMin`/`toMin` for internal math.

Refactor `fmtTimeLabel` → implement `fmtDisplayTime(hhmm, format)` where `"12h"` uses existing logic and `"24h"` returns zero-padded `HH:MM`. Deprecate standalone `fmtTimeLabel` exports (alias to 12h path for tests).

### 5. Settings UX

Add toggle row in Planner preferences card: "Use 24-hour time" (Switch on = 24h, off = 12h). Saves with existing Save preferences flow via extended `plannerPrefsSchema`.

## Risks / Trade-offs

- **Supabase migration** — existing profiles get default `24h`; users previously seeing 12h timeline labels will see 24h until they toggle → mitigated by making default match military preference stated by user
- **Popover on mobile** — Radix popover works on touch; verify in manual QA
- **Minute step 5** — user can still pick any 5-min increment; odd values from drag-reschedule remain displayable

## Migration Plan

1. Ship migration + profile type updates
2. Add formatting hook + Settings toggle
3. Add TimeInput + swap dialogs
4. Update timeline/grid/month display
5. Remove native time CSS

Rollback: revert to native inputs (no data migration needed).

## Open Questions

- None blocking implementation
