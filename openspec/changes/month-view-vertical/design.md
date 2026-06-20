## Context

`MonthPage.tsx` currently renders each cell with a horizontal mini-bar: a `div` of fixed height where each segment is an absolutely-positioned `span` with `left` and `width` computed from `(startMin / 1440) * 100%`. The data (`blocks` and `logs` arrays on `DayCellData`) already contains everything needed; only the rendering direction changes.

## Goals / Non-Goals

**Goals:**
- Replace horizontal bar with vertical strip (top = 00:00, bottom = 23:59)
- Keep the same data source (`DayCellData.blocks` and `.logs`)
- Preserve responsive hiding below `sm` breakpoint

**Non-Goals:**
- Changing the data model or `useCalendarDays` hook
- Adding interactivity to the strip (click-to-zoom, tooltips) — kept for a future change
- Changing the Day or Week timeline orientation

## Decisions

**Strip dimensions**: The strip will be `6px` wide (narrow enough not to crowd the day number) and full cell height. Position: right edge of the cell, absolutely positioned inside the cell container. This keeps the day number and total-time text readable on the left.

**Segment calculation**: `top = (startMin / 1440) * 100%`, `height = ((endMin - startMin) / 1440) * 100%` — mirror of the current horizontal calculation but on the vertical axis.

**Overlapping segments**: Both blocks and logs render as separate elements in the same strip column. Logs render on top of blocks with slight opacity to distinguish them. This avoids collision-detection complexity (kept for a future change).

**No z-index changes needed**: The strip lives inside the existing cell `<a>` wrapper, so link click-through is preserved.

## Risks / Trade-offs

- [Risk] Very short segments (< 15 min) may be < 1px tall and invisible → Mitigation: clamp segment height to a minimum of 2px.
- [Risk] Test assertions currently check for `span[style]` inside a `hidden sm:block` container; the selector remains valid but the style attributes change (`left`/`width` → `top`/`height`) → update tests accordingly.

## Migration Plan

Pure UI change — no data model or backend migration needed. Ship as a single PR updating `MonthPage.tsx` and its tests.
