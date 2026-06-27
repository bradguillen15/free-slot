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
- Trigger: Button styled like `Input`, shows formatted time via `fmtDisplayTime`
- Popover: two scrollable columns (hours, minutes) using existing `ScrollArea` + `Button` variants; 5-minute steps for minutes (matches slot snapping granularity)
- 12h mode: hour column 1–12 + AM/PM toggle inside popover; still emits `HH:MM`
- `data-testid` prop forwarded to trigger for E2E compatibility

**Alternative considered:** dual `<Select>` dropdowns — acceptable fallback but less polished; scroll columns feel more picker-like.

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
