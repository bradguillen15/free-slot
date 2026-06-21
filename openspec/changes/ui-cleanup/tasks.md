# Tasks — ui-cleanup

## Step 0: Create Feature Branch

- [x] 0.1 Create and switch to branch `feature/ui-cleanup`
- [x] 0.2 Confirm clean working tree before proceeding

---

## Step 1: Remove timeline legend row (CalendarPage)

- [x] 1.1 In `src/pages/CalendarPage/index.tsx`, deleted the `<div>` containing the "Planned · Logged · right-click to add" chip row

---

## Step 2: Simplify DaySummary panel

- [x] 2.1 In `src/components/day/DaySummary.tsx`:
  - Removed `productive` and `unproductive` counters from the `useMemo` stats calculation
  - Removed `ratio` computation
  - Removed the three `<Stat>` cards (Productive / Unproductive / Logged) and replaced with a single "Logged" stat showing `stats.total`
  - Removed the "Productive ratio" section (label, percentage, animated progress bar)
  - Removed unused `motion` import
  - Kept the category breakdown list unchanged
- [x] 2.2 Updated `src/components/day/DaySummary.test.tsx` to remove assertions on Productive/Unproductive/ratio and verify the "Logged" stat and category list still render

---

## Step 3: Remove peak-hour stat and legend from WeekPage

- [x] 3.1 In `src/pages/WeekPage.tsx`:
  - Removed `peakFree` useMemo
  - Removed the "Peak-hour free" `<StatCard>` (with `Zap` icon)
  - Removed the "Free / peak" `<span>` legend chip from the bottom legend row
  - Removed unused `Zap` import

---

## Step 4: Remove productive/unproductive KPIs from Dashboard

- [x] 4.1 In `src/pages/DashboardPage/index.tsx`:
  - Removed the "Productive" duration `<StatCard>`
  - Removed the "Productive ratio %" `<StatCard>`
  - Removed the "Productive ratio" card (the one with the Progress bar)
  - In the bar chart, replaced the two stacked bars (`productive` + `unproductive`) with a single bar keyed to `total`, coloured `hsl(var(--primary))`
  - Changed plan vs actual "actual" bar color from `hsl(var(--productive))` to `hsl(var(--primary) / 0.6)`
  - Removed unused imports: TrendingUp, Target, Progress
  - Added `total` to perDay entries in `useDashboardStats.ts`
- [x] 4.2 No DashboardPage test assertions were affected (tests were checking for data-testid="page-dashboard" only)

---

## Step 5: Remove peak hours from Settings

- [x] 5.1 In `src/lib/formSchemas.ts`, removed `peakStart` and `peakEnd` fields from `plannerPrefsSchema`
- [x] 5.2 In `src/pages/SettingsPage.tsx`:
  - Removed `peakStart`/`peakEnd` from form `defaultValues`
  - Removed the code that reads `profile.peak_hours` to populate the form
  - Removed the peak hours field group from the JSX (the two time inputs with their label)
  - Removed `peak_hours` write from the save handler
- [x] 5.3 Updated `src/pages/SettingsPage.test.tsx` to remove assertion on `peak_hours` in the saved payload

---

## Step 6: Remove peak hours from Onboarding

- [x] 6.1 In `src/pages/Onboarding.tsx`:
  - Removed `peakStart`/`peakEnd` from form `defaultValues`
  - Removed the code that reads `profile.peak_hours` to populate
  - Removed the peak hours row from the preferences JSX
  - Removed `peak_hours` from the save payload
- [x] 6.2 Updated `src/pages/Onboarding.test.tsx` to remove assertions on peak hours time inputs

---

## Step 7: Remove i18n keys for peak hours

- [x] 7.1 In `src/i18n/locales/en.ts`:
  - Removed `kpi.productive` and `kpi.productiveRatio` keys
  - Removed `cards.productiveRatio` key
  - Updated `cards.perDay` value from "Productive vs unproductive per day" to "Logged time per day"
  - Removed `onboarding.preferences.peak` and `onboarding.preferences.peakHint` keys
- [x] 7.2 In `src/i18n/locales/es.ts`, removed the same keys

---

## Step 8: Review and update all affected tests

- [x] 8.1 `pnpm test` — 339/339 tests passing
- [x] 8.2 `pnpm typecheck` — 0 errors
- [x] 8.3 `pnpm lint` — 0 errors (3 warnings in coverage files only)

---

## Step 9: Manual verification (agent must execute)

- [x] 9.1 Start dev server (`pnpm dev`)
- [x] 9.2 Day view: no legend row above the timeline; DaySummary shows only "LOGGED" + Top Categories, no Productive/Unproductive/ratio
- [x] 9.3 Week view: no "Peak-hour free" stat card; legend shows Planned/Logged/AI Suggestion only (no "Free / peak" chip)
- [x] 9.4 Dashboard: no "Productive" or "Productive ratio" cards; bar chart shows single "Logged Time Per Day" bars in primary colour
- [x] 9.5 Settings: no Peak focus hours fields (verified via unit test — Settings requires auth in guest mode)
- [x] 9.6 Onboarding: peak hours row removed from preferences step (verified via unit test — onboarding redirects bootstrapped guests)
