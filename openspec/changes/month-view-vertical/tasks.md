## 0. Branch Setup

- [x] 0.1 Create and switch to feature branch `feature/month-view-vertical`

## 1. Replace Horizontal Bar with Vertical Strip

- [x] 1.1 In `src/pages/MonthPage.tsx`, locate the horizontal mini-bar JSX (`hidden sm:block` container with absolutely-positioned `span` elements using `left` / `width` styles)
- [x] 1.2 Replace it with a vertical strip: a `relative` container of fixed narrow width (e.g. `w-1.5`) and full cell height, with segments positioned via `top` / `height` computed as `(startMin / 1440) * 100%` and `((endMin - startMin) / 1440) * 100%`
- [x] 1.3 Clamp each segment's minimum height to `2px` so sub-15-min entries remain visible
- [x] 1.4 Render block segments first, then log segments on top with slight opacity (`opacity-80`) to distinguish logs from blocks when they overlap
- [x] 1.5 Keep the `hidden sm:block` wrapper so the strip is hidden on mobile viewports

## 2. Tests

- [x] 2.1 Update `src/pages/MonthPage.test.tsx` — updated test descriptions and selectors
- [x] 2.2 Add a test: "vertical strip segment top position reflects time of day" — mock a log from 12:00–13:00 and assert the segment has `top` near `50%`
- [x] 2.3 Run `pnpm test --run` — all 340 tests pass

## 3. Verification

- [x] 3.1 Start dev server and navigate to `/app/month`
- [x] 3.2 Confirmed: June 19 shows two small colored segments stacked vertically on the right edge
- [x] 3.3 Confirmed: empty days render clean with no segments
- [x] 3.4 Resize to ~390px viewport — confirmed strip is hidden, cell shows day number + total text only
- [x] 3.5 Run `pnpm test --run` + `pnpm typecheck` — green (340 tests, 0 type errors)
