## Context

`DayTimeline` currently renders schedule blocks (`BlockBar`) and time logs (`LogBar`) each absolutely positioned at `left: 0, right: 0` (full column width). When two items share the same time range they visually stack, with the higher `z-index` element hiding the lower one. There is no collision detection.

The goal is to reproduce the standard calendar collision layout (Google Calendar, Fantastical) where overlapping segments are rendered side by side at fractional widths.

## Goals / Non-Goals

**Goals:**
- Detect time-segment overlaps among all rendered bars (blocks + logs) in the day view
- Assign lanes (columns) so no two bars in the same lane overlap
- Render each bar at `width = 100% / groupWidth` and `left = lane * (100% / groupWidth)`
- Keep drag-to-reschedule working for any lane position
- Keep the existing `visibleBlockSegments` clipping behaviour (blocks clip against logs)

**Non-Goals:**
- Week view (each day cell is a mini-timeline; out of scope for this change)
- Smart "expand to fill empty space" (e.g. Fantastical's adaptive layout) — all lanes in a group share equal width
- Overlapping schedule blocks with each other (blocks are guides, only block-vs-log and log-vs-log matter in practice)

## Decisions

### 1. Where to compute collision layout

**Decision:** Compute inside `DayTimeline` via a `useMemo`, producing a flat array of `{ item, lane, groupWidth }` tuples. Pass `lane` and `groupWidth` as props to `BlockBar` / `LogBar`.

**Alternatives considered:**
- Extract to `src/lib/daySegments.ts`: keeps the component thin but `daySegments` already has a clear responsibility (segment slicing). Collision layout is a rendering concern.
- Compute inside each bar: would require each bar to know about all other bars — a prop-drilling anti-pattern.

### 2. Collision grouping algorithm

**Decision:** Sweep-line approach over sorted segment start times:

```
1. Collect all segments (block segs + log segs) into a single list with a `kind` tag.
2. Sort by startMin ascending.
3. Walk the list; maintain a set of "active" segments (those whose endMin > current startMin).
4. Group members that any-pair-overlap into a connected collision group.
5. Within each group, assign lanes greedily: for each segment, pick the lowest lane
   not occupied by any already-placed segment that overlaps it.
6. groupWidth = max lane index + 1.
```

Greedy lane assignment is O(n²) per group which is fine given typical day-view item counts (< 50).

**Why not interval tree?** Overkill; day-view item counts never justify the complexity.

### 3. Rendering — how to express fractional width / offset

**Decision:** Inline styles `{ left: \`${lane / groupWidth * 100}%\`, width: \`${100 / groupWidth}%\` }` replace the current Tailwind `left-1 right-1` classes. A small 1px gap between lanes is added via `paddingRight: 2` on all but the last lane for visual separation.

**Why not CSS grid?** Grid would require the parent container to know the lane count up front; it changes per collision group, so absolute positioning is simpler.

### 4. Drag interaction with lane positioning

The drag handler computes `deltaMin` from the **vertical** pointer delta only (`e.clientY - startY`). The horizontal lane offset has no effect on the drag computation — this is unchanged. The only concern is that `onPointerDown` must `stopPropagation` to avoid the hour-slot handler, which it already does.

## Risks / Trade-offs

- **Very tall collision groups** (4+ items in 1 hour): bars become too narrow to read. Mitigation: at groupWidth ≥ 4 show only a colour stripe and title on hover tooltip (compact mode already exists via `COMPACT_BAR_PX`).
- **Block clipping + collision**: `visibleBlockSegments` clips block segments against logged time. A clipped segment's effective time range may differ from the underlying block's `start_time/end_time`. The collision algorithm must use the *segment's* `startMin/endMin` (post-clip), not the block's raw times. This is already what the render loop receives.
- **Regression risk for drag**: lane positioning changes `left` from a fixed offset to a percentage. The drag handler uses `e.clientY` only, so the horizontal change is safe.

## Migration Plan

Pure frontend change — no migrations needed. Feature is additive (existing single-item layout is preserved as the `groupWidth = 1` case).
