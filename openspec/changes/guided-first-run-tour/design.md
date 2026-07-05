# Design — Guided First-Run Tour

## Overview

Replace the assert-style first run (silently seeded sample data) with a consent-style one: a coach-mark tour drives the user to apply a suggested schedule and discover Confirm Day, producing only data the user created. Full removal of the sample-data machinery is safe because the feature shipped one day ago and only reached dev accounts.

## Key Decisions

### D1. Custom coach marks over a tour library
Requirements — cross-route steps, action-gated advancement (advance when the template is applied), mobile-safe anchoring, i18n — all need manual wiring even with driver.js/react-joyride. A small `TourProvider` + `TourBubble` on the existing Radix Popover gives full control with zero new dependencies and matches the shadcn component style.

- `TourProvider` (React context): holds `{ activeStep: number | null }`, exposes `start()`, `next()`, `skip()`, `notifyAction(id)`. Steps are data:
  `{ id, route, anchorId, titleKey, bodyKey, advanceOn: "next" | "action" }`.
  When the next step's `route` differs from the current location, the provider calls `useNavigate()` and waits for the anchor element to mount before showing the bubble (poll/`MutationObserver` on `[data-tour="<anchorId>"]`).
- `TourBubble`: Radix Popover anchored to the `data-tour` element, with step counter, Next/Skip/Done, dimmed fixed backdrop and a highlight ring around the anchor (simple `box-shadow` cutout — no third-party spotlight).
- Never anchor to nav links: mobile nav lives in a closed Sheet. The tour navigates routes itself.

### D2. Tour persistence via `tour_completed` profile flag
Follows the `time_format` column pattern end-to-end: migration → generated types → `LocalProfile` (guest) → `profiles.get/update` in the supabase provider → `useProfile`. Auto-start effect on `/app` when `!tour_completed`; both Skip and Done write `true`. Replay (`?` HelpCircle button in sidebar footer + mobile sheet footer) calls `start()` unconditionally.

### D3. Full removal of sample data, including columns
Two ways considered: stop seeding but keep the clear mechanism, or full removal. Full removal chosen (user decision): migration deletes `is_example` rows then drops `schedule_blocks.is_example`, `time_logs.is_example`, `profiles.sample_data_seeded`. This also deletes `SampleDataBanner`, `clearExampleData`, `sampleData.ts`, the `is_example` filters in `migrateGuest`, and the `sampleData.*` i18n keys.

### D4. Confirm Day: elapsed-only for today via a `now` parameter
`buildConfirmDayRows(date, blocks, existingLogs, categories, now?)` stays pure: callers pass the current `HH:mm` and an `isToday` signal (or pass `now` only when the date is today). A block is elapsed when `end_time <= now`, treating overnight blocks by their same-day end (an overnight 23:00–07:00 block viewed today ends tomorrow, so it is not elapsed until then). New skip reason `"not-elapsed"` keeps the existing whole-block-skip philosophy; idempotency still falls out of the overlap check. Button copy gains a "nothing elapsed yet" disabled state.

### D5. Template lives in schedule domain, not a "sample data" module
`SUGGESTED_SCHEDULE_TEMPLATE` is defined next to `logDefaultsFromBlock` in `src/lib/schedule.ts` — it is a schedule feature (a starting template the user consents to), not seed data. Fixed shape: Sleep 23:00–07:00 daily; Work 09:00–12:00, Lunch 12:00–13:00, Work 13:00–17:00 weekdays. Apply inserts through the existing block-creation mutation paths (guest + cloud), after an AlertDialog confirmation.

### D6. Remove `/onboarding` wizard and `OnboardingGate`
The wizard was URL-only reachable; its preference fields already live in Settings. With the route gone, the gate's only remaining job (redirect away from `/onboarding` when done) is dead; its loading-spinner role moves to the existing route wrappers if needed. `onboarding_completed`/`onboarding_skipped` columns stay (historical data, no migration).

## Data Flow (tour happy path)

```
/app (Day)  ──Start──▶ navigate /app/schedule ──▶ bubble on [data-tour=apply-suggested]
   ▲                                            user clicks Apply → AlertDialog → insert 5 blocks
   │                                            notifyAction("apply-suggested") → step 3 (edit hint)
   └── navigate /app ◀──Next── bubble on [data-tour=confirm-day]
       user clicks Confirm Day → elapsed blocks become logs → step 5 closing → Done
       tour_completed = true
```

## Risks / Mitigations

- **Anchor not yet mounted after navigation** → provider waits for the element before rendering the bubble; timeout falls back to a centered bubble.
- **E2E flakiness on elapsed-only logic** → tests inject `now` explicitly rather than relying on wall clock.
- **Dropping columns while old clients run** → same-deploy risk window is tiny (single-dev project); migration ordered delete-then-drop.
