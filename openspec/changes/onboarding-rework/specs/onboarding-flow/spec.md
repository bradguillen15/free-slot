## ADDED Requirements

### Requirement: Skip onboarding
The system SHALL allow any user (guest or authenticated) to skip the onboarding wizard at any step. Skipping SHALL set `onboarding_skipped = true` in the user's profile (localStorage for guests, Supabase `profiles` for cloud users) and immediately navigate to `/app`.

#### Scenario: Guest skips onboarding
- **WHEN** a guest user clicks the "Skip" button on any step of the onboarding wizard
- **THEN** `onboarding_skipped` is set to `true` in the guest's local profile
- **THEN** the user is navigated to `/app`
- **THEN** subsequent visits to `/app/*` routes are not redirected back to `/onboarding`

#### Scenario: Authenticated user skips onboarding
- **WHEN** an authenticated user clicks "Skip" on any step
- **THEN** `onboarding_skipped = true` is written to `profiles` via Supabase update
- **THEN** the user is navigated to `/app`
- **THEN** `OnboardingGate` does not redirect them to `/onboarding` again

#### Scenario: Skip button is always visible
- **WHEN** the onboarding wizard is displayed on any step (0, 1, or 2)
- **THEN** a "Skip" button is visible in the navigation row alongside the Back/Continue/Finish buttons

---

### Requirement: Non-blocking OnboardingGate
`OnboardingGate` SHALL allow users to access `/app/*` routes when either `onboarding_completed` OR `onboarding_skipped` is `true` in their profile. It SHALL only redirect to `/onboarding` when both flags are `false`.

#### Scenario: Gate passes through on completed
- **WHEN** `onboarding_completed = true` and `onboarding_skipped = false`
- **THEN** `OnboardingGate` renders its children and does not redirect

#### Scenario: Gate passes through on skipped
- **WHEN** `onboarding_completed = false` and `onboarding_skipped = true`
- **THEN** `OnboardingGate` renders its children and does not redirect

#### Scenario: Gate redirects when neither flag is set
- **WHEN** `onboarding_completed = false` and `onboarding_skipped = false`
- **THEN** `OnboardingGate` redirects to `/onboarding`

#### Scenario: Gate redirects away from onboarding when already done
- **WHEN** either `onboarding_completed = true` or `onboarding_skipped = true`
- **WHEN** the user navigates to `/onboarding`
- **THEN** `OnboardingGate` redirects to `/app`

---

### Requirement: Live-count schedule step
Step 1 of the onboarding wizard SHALL display the current count of schedule blocks (sourced from the `useScheduleBlocks` dataStore hook) and a CTA link that navigates to `/app/schedule`. It SHALL NOT contain an inline block editor.

#### Scenario: Shows zero count on first visit
- **WHEN** a new user is on step 1 of the onboarding wizard
- **WHEN** no schedule blocks exist
- **THEN** the UI shows "0 blocks added" (or equivalent empty-state text)
- **THEN** a CTA link to `/app/schedule` is visible

#### Scenario: Reflects live block count
- **WHEN** the user has added schedule blocks via `/app/schedule`
- **WHEN** they return to the onboarding wizard step 1
- **THEN** the count reflects the current number of blocks in the dataStore

#### Scenario: Continue is always available
- **WHEN** a user is on step 1 with zero blocks
- **THEN** the "Continue" button is still enabled (blocks are optional)

---

### Requirement: Live-count activities step
Step 2 of the onboarding wizard SHALL display the current count of active activities (sourced from the `useActivities` dataStore hook) and a CTA link that navigates to `/app/activities`. It SHALL NOT contain an inline activity editor.

#### Scenario: Shows zero count on first visit
- **WHEN** a new user is on step 2 of the onboarding wizard
- **WHEN** no activities exist
- **THEN** the UI shows "0 activities added" (or equivalent empty-state text)
- **THEN** a CTA link to `/app/activities` is visible

#### Scenario: Reflects live activity count
- **WHEN** the user has added activities via `/app/activities`
- **WHEN** they return to the onboarding wizard step 2
- **THEN** the count reflects the current number of active activities in the dataStore

#### Scenario: Continue is always available
- **WHEN** a user is on step 2 with zero activities
- **THEN** the "Continue" button is still enabled (activities are optional)

---

### Requirement: Preferences step pre-populated from profile
Step 3 of the onboarding wizard SHALL pre-populate its form fields (peak start, peak end, include weekends, weekly review day) from the user's existing profile values via the `useProfile` dataStore hook. When no prior values exist, it SHALL fall back to the same defaults as before (`09:00`–`12:00`, weekends included, Monday review day).

#### Scenario: Pre-populates existing peak hours
- **WHEN** the user's profile already has `peak_hours.start = "08:00"` and `peak_hours.end = "11:00"`
- **WHEN** the user reaches step 3
- **THEN** the peak-hours inputs are initialised to `08:00` and `11:00` respectively

#### Scenario: Uses defaults when no prior profile
- **WHEN** the user is new and has no saved profile values
- **WHEN** the user reaches step 3
- **THEN** the peak-hours inputs default to `09:00` and `12:00`

---

### Requirement: Idempotent finish for authenticated users
For authenticated users, calling `finish()` on the preferences step SHALL only write profile preferences and set `onboarding_completed = true`. It SHALL NOT insert any schedule blocks or activities (those are managed on their dedicated pages).

#### Scenario: Finish does not duplicate data
- **WHEN** an authenticated user completes the wizard
- **THEN** no `INSERT` is sent to `schedule_blocks` or `activities`
- **THEN** `profiles.onboarding_completed` is set to `true`
- **THEN** `profiles.peak_hours`, `include_weekends`, and `weekly_review_day` are updated

#### Scenario: Finish for guest writes profile only
- **WHEN** a guest user completes the wizard
- **THEN** `updateLocalProfile` is called with `onboarding_completed: true` and the preferences
- **THEN** no `upsertLocalBlock` or `upsertLocalActivity` calls are made

---

### Requirement: Guest-to-cloud migration carries skip flag
When a guest user signs up and the guest data is migrated to cloud, the `onboarding_skipped` flag SHALL be included in the profile update.

#### Scenario: Skipped flag migrated on signup
- **WHEN** a guest has `onboarding_skipped = true` in their local profile
- **WHEN** they sign up and the guest migration runs
- **THEN** `profiles.onboarding_skipped = true` is written to the cloud profile
- **THEN** the user is not redirected to `/onboarding` after migration

---

### Requirement: i18n coverage for new UI elements
All new visible text (skip button label, count card text, CTA link labels) SHALL have translation keys in both `en.ts` and `es.ts`.

#### Scenario: Skip button uses i18n key
- **WHEN** the onboarding skip button is rendered
- **THEN** its label is sourced from `t("onboarding.skip")` (or equivalent key)
- **THEN** the key exists in both `en.ts` and `es.ts`
