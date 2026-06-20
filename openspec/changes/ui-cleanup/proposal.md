## Why

FreeSlot currently frames all time as either "productive" or "unproductive" and surfaces that judgement constantly — in day-view stat cards, a ratio progress bar, week-view legend chips, dashboard KPI cards, and peak-hours configuration. This framing conflicts with the app's goal of being a neutral personal organiser. A meeting, a walk, and a nap are all valid uses of time. The scoring should come out.

Additionally, the timeline legend row (Planned / Logged / Free / peak / AI suggestion) duplicates information already visible in the blocks themselves and adds noise without value.

## What Changes

- **Remove timeline legend row** — the chip row above the day-timeline showing "Planned · Logged · right-click to add" is deleted.
- **Remove week-view "Free / peak" legend chip** and the "Peak-hour free" StatCard.
- **Remove Productive / Unproductive distinction in DaySummary** — replace the three-stat row (Productive / Unproductive / Logged) and ratio bar with a single "Logged" total and the existing category breakdown.
- **Remove productive/unproductive KPIs from Dashboard** — drop the "Productive" duration card and "Productive ratio" card; change the stacked bar chart (productive + unproductive layers) to a single-colour bar.
- **Remove peak-hours UI from Settings** — remove the Peak focus hours form fields (peakStart / peakEnd).
- **Remove peak-hours step from Onboarding** — remove the peak hours question from the onboarding preferences step.

No database schema changes. The `type: "productive" | "unproductive"` column on `time_logs` and `peak_hours` on the profile are retained in the data layer for now; only UI surfaces are removed.

## Capabilities

### New Capabilities

*(none — this is a removal-only change)*

### Modified Capabilities

- `calendar-day-cells`: DaySummary panel no longer shows productive/unproductive split or ratio bar.
- `calendar-google-style`: Week view no longer shows peak-hour free stat or Free/peak legend chip.

## Impact

- `src/pages/CalendarPage/index.tsx` — remove legend row
- `src/components/day/DaySummary.tsx` + `.test.tsx` — remove productive/unproductive stats and ratio
- `src/pages/WeekPage.tsx` — remove peakFree calc and Peak-hour free StatCard, Free/peak chip
- `src/pages/DashboardPage/index.tsx` + `.test.tsx` — remove productive KPI cards and ratio card; simplify bar chart
- `src/pages/SettingsPage.tsx` + `.test.tsx` — remove peak hours fields
- `src/pages/Onboarding.tsx` + `.test.tsx` — remove peak hours step
- `src/lib/formSchemas.ts` — remove peakStart/peakEnd from preferences schema
- `src/i18n/locales/en.ts` + `es.ts` — remove peak translation keys
