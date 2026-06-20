## 0. Branch Setup

- [x] 0.1 Create and switch to feature branch `feature/dashboard-redesign`

## 1. useDashboardStats — Label Filter Support

- [x] 1.1 Add `labelIds?: string[]` parameter to `useDashboardStats(weekStart, labelIds?)`
- [x] 1.2 When `labelIds` is non-empty, filter logs before computing stats; plan slots unfiltered
- [x] 1.3 Unit tests for `getDashboardVisibleCards` / `setDashboardVisibleCards` — 3 new tests passing

## 2. Label Filter UI

- [x] 2.1 Create `src/components/dashboard/LabelFilter.tsx` — chip row with toggle buttons
- [x] 2.2 Wire `LabelFilter` into `DashboardPage/index.tsx` with `useState<string[]>([])`
- [x] 2.3 Add i18n keys: `dashboard.filter.all` in `en.ts` and `es.ts`
- [x] 2.4 Verified visually: All chip active, label chips render correctly

## 3. Card Visibility

- [x] 3.1 Add `getDashboardVisibleCards()` / `setDashboardVisibleCards()` to `src/lib/localStore.ts`
- [x] 3.2 Create `src/components/dashboard/CardVisibilityMenu.tsx` — popover with checkboxes
- [x] 3.3 Wire into DashboardPage with localStorage read on mount
- [x] 3.4 Add i18n keys: `dashboard.visibility.*` in `en.ts` and `es.ts`
- [x] 3.5 Unit tests: 3 tests for getDashboardVisibleCards / setDashboardVisibleCards passing

## 4. Agenda Card

- [x] 4.1 Create `src/components/dashboard/AgendaCard.tsx` — collapsible day rows
- [x] 4.2 Each row shows weekday name + date + total logged; detail shows planned/logged
- [x] 4.3 Days with no data show compact indicator
- [x] 4.4 Agenda card respects labelIds filter
- [x] 4.5 Add `AgendaCard` to `DashboardPage` using `useCalendarDays` data
- [x] 4.6 Add i18n keys: `dashboard.agenda.*` in `en.ts` and `es.ts`
- [x] 4.7 Verified via DOM snapshot: 7 day rows rendered, Fri Jun 19 shows "6h 30m"

## 5. Tests — Integration

- [x] 5.1 Existing DashboardPage tests pass (4 tests)
- [x] 5.2 Run `pnpm test --run` — 343 tests passing

## 6. Verification

- [x] 6.1 Dev server running, Dashboard renders correctly
- [x] 6.2 Label filter chips visible and selectable
- [x] 6.3 Agenda card shows 7-day rows with plan vs actual
- [x] 6.4 Card visibility menu visible in header (sliders icon)
- [x] 6.5 Guest mode: all features work with localStorage
- [x] 6.6 Verified at 375px: filter chips wrap across rows without overflow
- [x] 6.7 Run `pnpm test --run` + `pnpm typecheck` — 343 tests, 0 type errors
