## Context

This is a pure UI-removal change. No new patterns, no new dependencies, no backend changes. The goal is to surgically remove the productive/unproductive framing and peak-hours concept from all visible surfaces while leaving the underlying data model intact.

## Goals / Non-Goals

**Goals:**
- Remove every visible reference to "productive", "unproductive", "ratio", and "peak hours" from rendered UI
- Keep the data layer intact (`type` column on `time_logs`, `peak_hours` on profile) so no migrations are needed
- Keep category-based colouring — bars still use category colour (or the existing fallback colour if no category)

**Non-Goals:**
- Removing the `type` field from the DB or TypeScript types
- Changing the AI planner prompts (peak hours may still be read from profile in the backend; that's a separate concern)
- Redesigning the dashboard (that's a follow-up `dashboard-redesign` change)

## Decisions

### 1. DaySummary — what to show instead

Replace the three stat cards (Productive / Unproductive / Logged) + ratio bar with:
- A single "Logged" stat showing total duration
- The existing category breakdown list (already present below the stats)

The `DaySummary` component currently computes `productive`, `unproductive`, `total`, and `ratio`. After the change it only needs `total` and the category breakdown. The `productive`/`unproductive` tally is removed from the computation.

### 2. Dashboard bar chart

The current bar chart stacks `productive` and `unproductive` series. Replace with a single `total` bar using the primary accent colour (`hsl(var(--primary))`). The data shape fed to the chart changes from `{ productive, unproductive }` to `{ total }`.

### 3. Week view — peakFree and legend

`WeekPage.tsx` computes `peakFree` from `profile.peak_hours` and renders it as a StatCard. Both the computation and the card are removed. The "Free / peak" chip in the legend row is removed; other chips (if any) remain.

### 4. Settings / Onboarding — form fields

`peakStart` and `peakEnd` are removed from the Zod schema in `formSchemas.ts`, from the Settings form, and from the Onboarding form. The `peak_hours` field is no longer written on save (or can be written as `null`). Existing stored values are ignored.

### 5. i18n keys

The `peak` and `peakHint` translation keys in `en.ts`/`es.ts` are removed. Any other keys referencing "productive ratio" or similar are removed.

## Risks / Trade-offs

- **Test updates required**: `DaySummary.test.tsx`, `SettingsPage.test.tsx`, `Onboarding.test.tsx`, `DashboardPage/index.test.tsx` will need updating to remove assertions on removed UI.
- **Existing stored `type` data**: Users who logged time as "unproductive" retain that data. The UI just stops surfacing it. This is the intended behaviour.
- **AI planner**: The backend may still read `peak_hours` from the profile when building prompts. Since we're only removing UI, not the stored value, this is safe and out of scope for this change.

## Migration Plan

No data migrations. No feature flags. All changes are additive removals — if a test fails, fix the test; if a form field is missing, it's intentional.
