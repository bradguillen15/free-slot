## Context

The onboarding wizard (`src/pages/Onboarding.tsx`) was written before the schedule and activities pages existed as polished standalone editors. It contains its own private block/activity editors that have never been kept in sync — today they lack the `sort_order` field, the hidden-category flag, the `w-32` input fix, and overlap warnings that live on the dedicated pages.

`OnboardingGate` makes `onboarding_completed` the only key. There is no skip path, so:
- A new guest who wants to browse before committing is stuck in the wizard.
- A returning user who never finished onboarding is blocked from re-accessing their data.

`finish()` calls `supabase.from("schedule_blocks").insert(blocks)` without checking whether those blocks already exist, so a network retry or double-tap creates duplicates.

The preferences step hard-codes `peakStart = "09:00"` and `peakEnd = "12:00"` regardless of what is already in the user's profile, so re-running onboarding silently overwrites user settings.

---

## Goals / Non-Goals

**Goals:**
- Users can skip onboarding at any step and access the app immediately.
- Onboarding reflects live data (block/activity counts) pulled via `dataStore` hooks rather than maintaining its own in-memory editors.
- Step 1 (Schedule) and Step 2 (Activities) embed the same reusable editor components used by SchedulePage/ActivitiesPage, so users set up their data in-flow without leaving the wizard, replacing duplicated bespoke editors.
- `finish()` is idempotent: safe to call multiple times without creating duplicates (for both guest and cloud).
- Preferences step pre-populates from the user's current profile.
- `OnboardingGate` lets users through when either `onboarding_completed` OR `onboarding_skipped` is true.

**Non-Goals:**
- Redesigning the visual look of the wizard (step indicator, animation stays the same).
- Adding onboarding analytics or a progress-resume feature that persists partial wizard state.
- Changing the *behaviour* of the Activities or Schedule editors (they remain the source of truth). Extracting `SchedulePage`'s body into a reusable `ScheduleEditor` is a pure refactor — the page renders identically afterward.
- Adding a Supabase edge function (all changes are client-side + one migration).

---

## Decisions

### Decision 1 — `onboarding_skipped` flag rather than removing the gate entirely

**Options considered:**
- A) Remove `OnboardingGate` — simplest, but then new users land in an empty app with no guidance.
- B) Make the wizard optional at the routing level (e.g. a `/onboarding?optional=1` query param) — leaks routing logic into the gate.
- C) Add `onboarding_skipped: boolean` to `LocalProfile` / `profiles` — gate passes through when `completed || skipped`; flag is set when the user clicks Skip.

**Chosen:** C. It keeps the gate logic minimal and symmetrical: one boolean for "done properly", one for "intentionally skipped". The wizard still appears on the next visit until one of those flags is true (same as current `completed` behaviour). Both flags are migrated to the cloud via `migrateGuest.ts`.

**Supabase migration required:** Add `onboarding_skipped BOOLEAN NOT NULL DEFAULT false` to `profiles`. `handle_new_user` trigger does not need to change (it defaults to false).

---

### Decision 2 — Embed the shared page editors instead of bespoke inline editors

**Options considered:**
- A) Make onboarding Step 1 / Step 2 card-only: show a live count ("3 blocks added") and a CTA that links to `/app/schedule`. The wizard never edits data itself.
- B) Keep bespoke inline editors private to the wizard — the original problem, rejected because they drift out of sync with the real pages.
- C) Extract the editor body of each page into a reusable component and render the *same* component in both the page and the wizard. The schedule editor becomes `ScheduleEditor` (extracted from `SchedulePage`); the activities editor already exists as `ActivityEditor` (the page is a thin wrapper around it).

**Chosen:** C. Option A was implemented first but produced poor UX: the user is bounced to a separate page with no context, sees no list of what they have already created, and must use the browser back button to return — exactly the friction onboarding is supposed to remove. C keeps the single-implementation benefit of A (there is still only one editor per concept, owned by the page) while letting the user set everything up in-flow. Data ownership stays in `dataStore`; the wizard renders the component but adds no editing logic of its own.

**Extraction note:** `SchedulePage` currently inlines the block list, preset chips, `SortableScheduleRow`, overlap warnings, `ScheduleBlockDialog` wiring, and the mini week preview. These move verbatim into `src/components/schedule/ScheduleEditor.tsx`. `SchedulePage` keeps only its `<header>` (title + description) and renders `<ScheduleEditor />`. `ActivitiesPage` already delegates to `<ActivityEditor>` + `<PriorityRanker>`, so Step 2 reuses `<ActivityEditor>` directly with no extraction. Because both editors already read/write through `dataStore` with the guest/cloud `mode` derived from `useAuth`, they work unchanged inside the wizard for both user types.

Trade-off: the wizard steps are taller/heavier than count cards. Acceptable — the step still scrolls within the existing wizard layout, and the Skip/Continue buttons remain always-enabled so the editors stay optional.

---

### Decision 3 — Idempotent `finish()` via pre-check dedup

For **cloud** users, before inserting blocks, fetch existing `(name, start_time, end_time)` and filter out duplicates — same strategy used in `migrateGuest.ts`. For activities, dedupe on `name`.

For **guests**, `upsertLocalBlock` and `upsertLocalActivity` already dedupe by `id` (they check existence). The wizard no longer stores local block/activity state — it just writes `onboarding_completed = true` (or `onboarding_skipped = true`) to the profile.

Since Steps 1/2 no longer collect blocks/activities inside the wizard, `finish()` simplifies to: write profile preferences + `onboarding_completed = true`. No block/activity inserts at all. This is the cleanest fix — the duplication problem is solved by design, not by a runtime guard.

---

### Decision 4 — Pre-populate preferences from existing profile

On mount, read `useProfile()` (the `dataStore` hook). If `peak_hours`, `include_weekends`, or `weekly_review_day` are already set, use those as initial state for the preferences step instead of the hard-coded defaults. This means re-running onboarding after skipping does not reset values.

---

## Risks / Trade-offs

- **Users skip without adding data** → App opens on an empty schedule. Acceptable — the Schedule page has preset chips (Work, Gym, etc.) so onboarding is helpful but not required.
- **Navigation away from wizard loses step state** → Since Steps 1/2 no longer collect data locally, there is no state to lose. Step selection resets to 0 on re-entry, which is intentional (quick re-orientation).
- **Cloud profile migration** → `onboarding_skipped` defaults to `false` for all existing users, which is correct. Users who already have `onboarding_completed = true` are unaffected by the gate change.

---

## Migration Plan

1. Add Supabase migration: `ALTER TABLE profiles ADD COLUMN onboarding_skipped BOOLEAN NOT NULL DEFAULT false;`
2. Update `LocalProfile` type and `DEFAULT_PROFILE` in `localStore.ts`.
3. Update `OnboardingGate` to pass through when `skipped || completed`.
4. Rework `Onboarding.tsx`: Steps 1/2 become count cards; Step 3 pre-populates from profile; Skip button added to nav row.
5. Update `migrateGuest.ts` to carry the `onboarding_skipped` flag to cloud.
6. Update i18n keys.
7. Update `OnboardingGate.test.tsx` and add `Onboarding.test.tsx` scenarios.

No rollback needed — the new column defaults to `false`, so deploying the migration without the frontend code leaves existing behaviour unchanged.

---

## Open Questions

- None blocking implementation.
