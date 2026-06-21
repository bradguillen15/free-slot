## Why

The current month-view mini-bar shows horizontal colored segments mapped to time-of-day (0–1440 min). On small cells this is nearly unreadable — segments are 1–2 px wide and the time axis is invisible. Rendering time vertically (top = morning, bottom = night) inside each cell matches the mental model users already have from the Day and Week views, makes blocks easier to see at a glance, and naturally scales with cell height rather than width.

## What Changes

- Replace the horizontal mini-bar in each month cell with a **vertical time strip**: a narrow column where `top` = midnight, `bottom` = midnight, and each block/log occupies a proportional slice of the column height.
- The strip shows the same data already computed by `useCalendarDays` (blocks + logs with color), so no data-layer changes are needed.
- The existing `hidden sm:block` responsive rule is kept — mobile still shows the minimal intensity indicator.

## Capabilities

### New Capabilities

- `month-cell-vertical-strip`: Each month cell renders a fixed-width vertical bar (e.g. 6–8 px wide) positioned on the right or left edge of the cell, with segments scaled to the 24-hour range, colored by category.

### Modified Capabilities

- `calendar-month-content`: The mini-bar rendering changes from horizontal (width-based) to vertical (height-based) segments. Existing requirement that "segments are consistent with Day and Week views" stays; only the orientation changes.

## Impact

- `src/pages/MonthPage.tsx` — replace horizontal bar JSX with vertical strip
- `src/pages/MonthPage.test.tsx` — update segment orientation assertions if any
- No data model or backend changes required
