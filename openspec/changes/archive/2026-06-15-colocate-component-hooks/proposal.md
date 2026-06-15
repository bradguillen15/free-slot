## Why

Several components carry large blocks of inline `useEffect` and data-derivation logic — most
notably `DashboardPage`, `WeeklyReviewModal`, `PriorityRanker`, and `CalendarPage`. The effect
bodies (async fetch + aggregation, weekly-review auto-prompt, multi-`useMemo` stat derivation, four
distinct calendar effects) make these files hard to read and the logic hard to test in isolation.
Extracting that logic into named custom hooks makes each concern explicit, testable, and obviously
scoped to its owner.

## What Changes

- Introduce a **co-location convention**: a component with substantial component-specific hook logic
  becomes a folder named after the component, holding `index.tsx` (the component) plus one or more
  `useX.ts` hook files used only by that component.
- Truly **reusable** effect logic goes to shared `src/hooks/` instead of being co-located (a
  co-located hook is, by definition, used by exactly one component).
- Extract, with **no behavior change**:
  - `DashboardPage` → `useDashboardStats` (per-day/totals/category/plan-vs-actual derivations) and
    `useWeeklyReviewPrompt` (personal-best celebration + weekly-review auto-prompt effects).
  - `WeeklyReviewModal` → `useWeeklyReviewData` (async fetch + planned-vs-actual aggregation).
  - `PriorityRanker` → `usePriorityData` (async `weekly_priorities` fetch/init, guest + cloud).
  - `CalendarPage` → co-located `useAutoScrollToHour` and `useAddBlockHereListener`; shared
    `useNowMinute` (per-minute tick) in `src/hooks/`.
- This is a **pure refactor**: behavior is preserved, the existing Vitest suite stays green, and no
  import paths change (a folder with `index.tsx` keeps `import X from ".../X"` resolving).

## Capabilities

### New Capabilities
- `component-hook-colocation`: A documented, enforced structure for extracting component-specific
  effect/derivation logic into co-located custom hooks (folder + `index.tsx` + `useX.ts`), with
  reusable hooks placed in shared `src/hooks/`, while preserving behavior and import paths.

### Modified Capabilities
<!-- None — no existing capability specs in openspec/specs/. -->

## Impact

- **Code (frontend, structure only):**
  - `src/pages/DashboardPage.tsx` → `src/pages/DashboardPage/{index.tsx,useDashboardStats.ts,useWeeklyReviewPrompt.ts}`
  - `src/components/dashboard/WeeklyReviewModal.tsx` → `.../WeeklyReviewModal/{index.tsx,useWeeklyReviewData.ts}`
  - `src/components/activities/PriorityRanker.tsx` → `.../PriorityRanker/{index.tsx,usePriorityData.ts}`
  - `src/pages/CalendarPage.tsx` → `src/pages/CalendarPage/{index.tsx,useAutoScrollToHour.ts,useAddBlockHereListener.ts}`
  - `src/hooks/useNowMinute.ts` (new shared hook)
- **No** backend, schema, API, or data-model changes. **No** import-path changes for consumers.
- **Out of scope:** small dialog reset-on-open effects (`QuickLogDialog`, `ScheduleBlockDialog`,
  `ActivityEditor`), `CategoryPicker` wheel handler, `GuestBanner`, `OnboardingGate`, `Onboarding`
  prefs sync, `AuthContext`, and generated UI (`sidebar.tsx`, `carousel.tsx`).
- **Tests:** existing component tests (`DashboardPage.test.tsx`, `PriorityRanker.test.tsx`, etc.) are
  the regression net; add focused unit tests for newly extracted pure-ish hooks where practical.
  The known pre-existing `CalendarPage.test.tsx` "No QueryClient" failure remains out of scope.
- **Docs:** add the co-location convention to `docs/frontend-standards.md`.
